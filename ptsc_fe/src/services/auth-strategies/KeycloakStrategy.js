// src/services/auth-strategies/KeycloakStrategy.js
import { callApi } from "@services/api";
import { API_AUTH_ME, API_LOGOUT_KEYCLOAK } from "@EnvironmentFile/constants/urlConfig";
import { 
  keycloakIssuer, 
  keycloakBaseUrl, 
  keycloakClientId, 
  keycloakRedirectUri, 
  keycloakScope, 
  keycloakLogoutRedirectUri,
  keycloakUseEnvOnly
} from "@variable";

class KeycloakStrategy {
  async login(config) {
    const useEnvOnly = keycloakUseEnvOnly === true || keycloakUseEnvOnly === 'true';

    // Ưu tiên lấy cấu hình từ appConfig.js (thông qua variables)
    // Nếu useEnvOnly = true, KHÔNG fallback về config (từ DB)
    const effectiveConfig = {
      issuer: keycloakIssuer || (!useEnvOnly ? config?.issuer : null),
      baseUrl: keycloakBaseUrl || (!useEnvOnly ? config?.baseUrl : null),
      clientId: keycloakClientId || (!useEnvOnly ? config?.clientId : null),
      redirectUri: keycloakRedirectUri || (!useEnvOnly ? config?.redirectUri : null),
      scope: keycloakScope || (!useEnvOnly ? config?.scope : null) || "openid",
    };

    if (effectiveConfig.issuer && effectiveConfig.clientId) {
      // ✅ Kiểm tra vòng lặp redirect để tránh treo trình duyệt
      const retryCount = parseInt(sessionStorage.getItem("auth_retry_count") || "0", 10);
      if (retryCount >= 3) {
        throw new Error("Phát hiện vòng lặp đăng nhập (đã thử 3 lần). Vui lòng kiểm tra lại cấu hình hoặc liên hệ quản trị viên.");
      }

      // Tăng bộ đếm trước khi chuyển hướng sang Keycloak
      sessionStorage.setItem("auth_retry_count", (retryCount + 1).toString());

      const { issuer, clientId, redirectUri, scope } = effectiveConfig;
      const keycloakLoginUrl = `${issuer}/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
      window.location.href = keycloakLoginUrl;
      return { success: true, redirected: true };
    }
    throw new Error("Invalid Keycloak configuration (No issuer or clientId found in appConfig.js or DB)");
  }

  async logout() {
    const idToken = localStorage.getItem("id_token");
    const logoutRedirectUri = keycloakLogoutRedirectUri || "";

    // Xoá toàn bộ dữ liệu local
    localStorage.removeItem("token");
    localStorage.removeItem("id_token");
    localStorage.removeItem("userData");
    sessionStorage.clear();

    // ✅ Gửi id_token_hint lên BE để BE dùng khi gọi Keycloak logout
    let logoutUrl = idToken
      ? `${API_LOGOUT_KEYCLOAK}?id_token=${encodeURIComponent(idToken)}`
      : API_LOGOUT_KEYCLOAK;
    
    if (logoutRedirectUri) {
      logoutUrl += (logoutUrl.includes('?') ? '&' : '?') + `redirect_uri=${encodeURIComponent(logoutRedirectUri)}`;
    } else {
      logoutUrl += (logoutUrl.includes('?') ? '&' : '?') + `redirect_uri=${encodeURIComponent(window.location.origin)}`;
    }

    window.location.href = logoutUrl;
    return { success: true, redirected: true };
  }

  async revalidate() {
    try {
      const token = localStorage.getItem("token");

      //gọi API /me với withCredentials: true để đọc cookie nếu không có token trong localStorage
      const res = await callApi("get", API_AUTH_ME, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });

      if (res?.loggedIn) {
        // Nếu BE trả về token mới (trong trường hợp cookie session), lưu vào localStorage
        if (res.tokenUser && !token) {
          localStorage.setItem("token", res.tokenUser);
        }

        // Đăng nhập thành công -> Xóa bộ đếm vòng lặp để lần sau logout/login không bị lỗi
        sessionStorage.removeItem("auth_retry_count");

        const normalizedUser = {
          ...res,
          user: { ...res.user, user: res.user?._id || res.user?.id },
        };
        localStorage.setItem("userData", JSON.stringify(normalizedUser));
        return normalizedUser;
      }

      localStorage.removeItem("userData");
      localStorage.removeItem("token");
      localStorage.removeItem("id_token");
      return null;
    } catch (error) {
      localStorage.removeItem("userData");
      localStorage.removeItem("token");
      localStorage.removeItem("id_token");
      throw error;
    }
  }

  getToken() {
    return localStorage.getItem("token");
  }
}

export default KeycloakStrategy;
