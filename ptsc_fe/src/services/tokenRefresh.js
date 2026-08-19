/**
 * Centralized Keycloak refresh handling for all axios instances.
 */
import axios from "axios";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";

let isRefreshing = false;
let isRedirecting = false;
let failedQueue = [];
const REFRESH_LOCK_KEY = "keycloak-refresh-lock";
const REFRESH_LOCK_TTL_MS = 15000;
const REFRESH_LOCK_WAIT_MS = 200;
const TOKEN_REFRESH_DUE_AT_KEY = "keycloak-token-refresh-due-at";
const REFRESH_INSTANCE_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeJWT = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};
const getTokenTimeLeft = (token) => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return null;
  return decoded.exp - Math.floor(Date.now() / 1000);
};

const hasFreshToken = (token, minTimeLeftSeconds = 120) => {
  const timeLeft = getTokenTimeLeft(token);
  return typeof timeLeft === "number" && timeLeft > minTimeLeftSeconds;
};

const getRefreshSafetyWindowSeconds = (lifetimeSeconds) => {
  return Math.min(300, Math.max(5, Math.floor(lifetimeSeconds * 0.2)));
};

const getRefreshDueAtFromLifetime = (lifetimeSeconds) => {
  if (!Number.isFinite(lifetimeSeconds) || lifetimeSeconds <= 0) return null;

  const safetyWindowSeconds = getRefreshSafetyWindowSeconds(lifetimeSeconds);
  return Date.now() + Math.max(lifetimeSeconds - safetyWindowSeconds, 1) * 1000;
};

const getRefreshDueAtFromToken = (token) => {
  const timeLeft = getTokenTimeLeft(token);
  return getRefreshDueAtFromLifetime(timeLeft);
};

const getRefreshDueAtFromTokenResponse = (data) => {
  const candidates = [
    getRefreshDueAtFromLifetime(Number(data?.expires_in)),
    getRefreshDueAtFromLifetime(Number(data?.refresh_expires_in)),
    getRefreshDueAtFromToken(data?.access_token || data?.token || null),
  ].filter((dueAt) => Number.isFinite(dueAt) && dueAt > 0);

  return candidates.length ? Math.min(...candidates) : null;
};

export const persistTokenRefreshMetadata = (data) => {
  const dueAt = getRefreshDueAtFromTokenResponse(data);
  if (dueAt) {
    localStorage.setItem(TOKEN_REFRESH_DUE_AT_KEY, String(dueAt));
    return;
  }

  localStorage.removeItem(TOKEN_REFRESH_DUE_AT_KEY);
};

const getStoredTokenRefreshDueAt = () => {
  const value = Number(localStorage.getItem(TOKEN_REFRESH_DUE_AT_KEY) || 0);
  return Number.isFinite(value) ? value : 0;
};

const shouldRefreshByKeycloakTokenMetadata = () => {
  const dueAt = getStoredTokenRefreshDueAt();
  return Boolean(dueAt) && Date.now() >= dueAt;
};

const readRefreshLock = () => {
  try {
    return JSON.parse(localStorage.getItem(REFRESH_LOCK_KEY) || "null");
  } catch (error) {
    localStorage.removeItem(REFRESH_LOCK_KEY);
    return null;
  }
};

const acquireRefreshLock = async () => {
  const now = Date.now();
  const currentLock = readRefreshLock();

  if (currentLock?.expiresAt && currentLock.expiresAt > now) {
    return null;
  }

  const lock = {
    owner: REFRESH_INSTANCE_ID,
    expiresAt: now + REFRESH_LOCK_TTL_MS,
  };

  localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify(lock));
  await sleep(50);

  const storedLock = readRefreshLock();
  return storedLock?.owner === lock.owner ? lock : null;
};

const releaseRefreshLock = (lock) => {
  const currentLock = readRefreshLock();
  if (currentLock?.owner === lock?.owner) {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  }
};

const waitForSharedRefresh = async (refreshTokenBeforeWait) => {
  const deadline = Date.now() + REFRESH_LOCK_TTL_MS + 5000;

  while (Date.now() < deadline) {
    const currentToken = localStorage.getItem("token");
    if (hasFreshToken(currentToken, 30)) {
      return currentToken;
    }

    const currentRefreshToken = localStorage.getItem("refresh_token");
    if (
      refreshTokenBeforeWait &&
      currentRefreshToken &&
      currentRefreshToken !== refreshTokenBeforeWait &&
      currentToken
    ) {
      return currentToken;
    }

    const lock = readRefreshLock();
    if (!lock?.expiresAt || lock.expiresAt <= Date.now()) {
      return null;
    }

    await sleep(REFRESH_LOCK_WAIT_MS);
  }

  return null;
};

const saveRefreshResponse = (data) => {
  if (!data?.success) {
    throw new Error("Refresh token failed (success=false)");
  }

  const newToken = data.token || data.access_token;
  if (!newToken) {
    throw new Error("Refresh token failed (missing token)");
  }

  localStorage.setItem("token", newToken);
  persistTokenRefreshMetadata(data);
  if (data.id_token) {
    localStorage.setItem("id_token", data.id_token);
  }
  if (data.refresh_token) {
    localStorage.setItem("refresh_token", data.refresh_token);
  } else {
    logger.warn("Refresh response does not include a new refresh_token.");
  }

  return newToken;
};

const requestRefreshToken = async ({ withCredentials = false } = {}) => {
  let refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  let lock = await acquireRefreshLock();
  if (!lock) {
    const sharedToken = await waitForSharedRefresh(refreshToken);
    if (sharedToken) {
      return sharedToken;
    }

    lock = await acquireRefreshLock();
  }

  if (!lock) {
    throw new Error("Could not acquire refresh lock");
  }

  try {
    refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token");
    }

    const refreshUrl = `${APP_BASE}/api/auth-keycloak/refresh`;
    const axiosConfig = withCredentials ? { withCredentials: true } : undefined;
    const res = await axios.post(refreshUrl, { "refresh_token": refreshToken }, axiosConfig);
    return saveRefreshResponse(res.data);
  } catch (error) {
    const currentToken = localStorage.getItem("token");
    const currentRefreshToken = localStorage.getItem("refresh_token");
    if (currentToken && currentRefreshToken && currentRefreshToken !== refreshToken) {
      return currentToken;
    }
    throw error;
  } finally {
    releaseRefreshLock(lock);
  }
};

/**
 * Checks and refreshes the token before it expires.
 */
export const checkAndRefreshToken = async () => {
  if (isRedirecting) return; // Đang chuyển hướng thì không làm gì thêm

  const token = localStorage.getItem("token");
  if (!token) return;

  const timeLeft = getTokenTimeLeft(token);
  if (typeof timeLeft !== "number") return;

  // 🕒 Chủ động refresh khi còn dưới 2 phút (120s) thay vì 60s để an toàn hơn
  const shouldRefreshByExpiry = timeLeft < 120;
  const shouldRefreshByTokenMetadata = shouldRefreshByKeycloakTokenMetadata();

  // Prefer Keycloak token endpoint metadata over hard-coded SSO/client idle values.
  if (shouldRefreshByExpiry || shouldRefreshByTokenMetadata) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      });
    }

    // 💡 Double Check: Kiểm tra xem tab khác đã refresh xong chưa
    const currentStoredToken = localStorage.getItem("token");
    if (!shouldRefreshByTokenMetadata && hasFreshToken(currentStoredToken)) {
      // Đã có tab khác refresh thành công
      return currentStoredToken;
    }

    isRefreshing = true;
    try {
      const reason = shouldRefreshByTokenMetadata ? "Keycloak token metadata" : `token sap het han (con ${timeLeft}s)`;
      logger.log(`Dang refresh token chu dong: ${reason}`);
      const newToken = await requestRefreshToken();
      logger.log("✅ Chủ động refresh thành công.");
      processQueue(null, newToken);
      isRefreshing = false;
      return newToken;
    } catch (err) {
      logger.error("❌ Chủ động refresh thất bại:", err.message);
      isRefreshing = false;
      processQueue(err, null);
      
      // Nếu lỗi 401 hoặc lỗi nghiêm trọng từ Keycloak, yêu cầu login lại
      if (err.response?.status === 401 || err.response?.status === 400) {
        redirectToLogin();
      }
    }
  }
};

/**
 * Xử lý lỗi 401 cho bất kỳ axios instance nào.
 * Gọi hàm này trong response error interceptor.
 */
export const handle401Error = async (error, axiosInst) => {
  const originalRequest = error.config;

  if (!originalRequest) {
    return Promise.reject(error);
  }

  // Nếu đang redirect thì reject tất cả các request mới
  if (isRedirecting) {
    return Promise.reject(error);
  }

  if (error.response && error.response.status === 401 && !originalRequest._retry) {
    
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosInst(originalRequest);
      }).catch((err) => {
        return Promise.reject(err);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
        logger.log("🔄 Token hết hạn (401), đang thử làm mới (refresh token)...");

      const newToken = await requestRefreshToken({ withCredentials: true });
      logger.log("✅ Làm mới token thành công.");
        
      if (axiosInst.defaults.headers.common) {
        axiosInst.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      }
        
      processQueue(null, newToken);
      isRefreshing = false;
        
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return axiosInst(originalRequest);
    } catch (refreshError) {
      logger.error("❌ Làm mới token thất bại nghiêm trọng:", refreshError.message);
      processQueue(refreshError, null);
      // KHÔNG set isRefreshing = false ở đây nếu ta định redirect, 
      // để các request khác tiếp tục rơi vào failedQueue thay vì tạo vòng lặp refresh mới.
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  }

  return Promise.reject(error);
};

function redirectToLogin() {
  if (isRedirecting) return;
  isRedirecting = true;

  logger.warn("🚪 Không thể tự động làm mới phiên làm việc, chuyển hướng sang login...");
  
  localStorage.removeItem("token");
  localStorage.removeItem("id_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem(TOKEN_REFRESH_DUE_AT_KEY);
  
  // Xóa sạch queue
  failedQueue = [];
  
  window.location.href = "/login";
}

/**
 * Background Job: Tự động chạy ngầm mỗi 1 phút để kiểm tra và refresh token.
 */
setInterval(() => {
  const token = localStorage.getItem("token");
  if (token) {
    checkAndRefreshToken().catch((err) => {
      // Ignored background errors
      logger.log(err)
    });
  }
}, 60000);
