// AuthProvider.js
import React, { createContext, useEffect, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import Loading from "@components/Loading/Loading";
import axios from "axios";

import {
  SkyErrorOverlay,
  SkyErrorCard,
  SkyErrorTitle,
  SkyErrorDescription,
  SkyFlexRowCenter,
  SkySubmitButton,
  SkyCancelButton,
} from "@styles/SkyStyles";
import { APP_BASE, API_LOGOUT_KEYCLOAK } from "@EnvironmentFile/constants/urlConfig";
import { fetchCurrentUserMe } from "@redux/slices/User/UserSlice";
import { persistTokenRefreshMetadata } from "@services/tokenRefresh";

export const AuthContext = createContext(null);
const POST_LOGIN_REDIRECT_KEY = "postLoginRedirectPath";

const getCurrentRelativePath = () => {
  const { pathname, search, hash } = window.location;
  return `${pathname || "/"}${search || ""}${hash || ""}`;
};

const shouldStoreRedirectPath = (path) => {
  return (
    path &&
    path !== "/" &&
    !path.startsWith("/login") &&
    !path.startsWith("/login/callback") &&
    !path.startsWith("/auth/callback")
  );
};

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Đăng nhập qua SSO Keycloak (khi người dùng chủ động click hoặc cấu hình yêu cầu)
  const login = useCallback(() => {
    const currentPath = getCurrentRelativePath();
    if (shouldStoreRedirectPath(currentPath)) {
      sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, currentPath);
    }

    const redirectUri = window.location.origin;
    window.location.href = `${APP_BASE}/api/auth-keycloak/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
  }, []);

  // Đăng nhập nội bộ (Local) với username & password
  const loginLocal = useCallback(
    async ({ username, password }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.post(`${APP_BASE}/api/auth-basic/login`, {
          username,
          password,
        });

        const token = response.data?.token || response.data?.access_token;
        if (!token) {
          throw new Error(response.data?.message || "Đăng nhập thất bại");
        }

        localStorage.setItem("token", token);
        if (response.data?.refresh_token) {
          localStorage.setItem("refresh_token", response.data.refresh_token);
        }
        persistTokenRefreshMetadata(response.data);

        // Xóa các key cũ
        localStorage.removeItem("keycloak-token");
        localStorage.removeItem("keycloak-id-token");
        localStorage.removeItem("token_app");

        // Xác thực lại session
        const profile = await dispatch(fetchCurrentUserMe()).unwrap();
        if (profile && profile.loggedIn !== false) {
          setAuthenticated(true);
          setUser({
            user: {
              ...profile.user,
              user: profile.user?.user || profile.user?._id || profile.user?.id,
              id: profile.user?._id || profile.user?.id,
              username: profile.user?.username,
              email: profile.user?.email || profile.user?.emailUser,
              name: profile.user?.name || profile.user?.username,
              profileImage: profile.user?.profileImage,
            },
            roles: profile.roles || [],
            isSuperAdmin: profile.isSuperAdmin,
          });

          const savedRedirectPath = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
          if (savedRedirectPath) {
            sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
            window.location.replace(savedRedirectPath);
          }
        }
        return { success: true };
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [dispatch]
  );

  // Đăng xuất
  const logout = useCallback(() => {
    const idToken = localStorage.getItem("id_token");
    localStorage.removeItem("token");
    localStorage.removeItem("id_token");
    localStorage.removeItem("token_app");
    localStorage.removeItem("keycloak-token");
    localStorage.removeItem("keycloak-id-token");
    localStorage.removeItem("tokenUser");
    localStorage.removeItem("userData");
    localStorage.removeItem("refresh_token");

    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("FORM_CONFIG_")) {
        sessionStorage.removeItem(key);
      }
    });

    setAuthenticated(false);
    setUser(null);

    // Nếu có idToken Keycloak thì gọi logout SSO, ngược lại về trang login
    if (idToken) {
      const logoutUrl = new URL(API_LOGOUT_KEYCLOAK);
      logoutUrl.searchParams.append("id_token", idToken);
      logoutUrl.searchParams.append("redirect_uri", window.location.origin);
      window.location.href = logoutUrl.toString();
    } else {
      window.location.href = "/login";
    }
  }, []);

  const verifyAuth = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      // 1. Luồng Exchange Code: Nếu có code trên URL, gọi API để đổi lấy token
      if (code) {
        setLoading(true);
        try {
          const redirectUri = window.location.origin;
          const response = await axios.post(`${APP_BASE}/api/auth-keycloak/exchange-code`, {
            code,
            redirectUri,
          });

          if (response.data?.access_token) {
            const {
              access_token: accessToken,
              id_token: idToken,
              refresh_token: refreshToken,
            } = response.data;
            localStorage.setItem("token", accessToken);
            persistTokenRefreshMetadata(response.data);
            if (idToken) localStorage.setItem("id_token", idToken);
            if (refreshToken) localStorage.setItem("refresh_token", refreshToken);

            localStorage.removeItem("keycloak-token");
            localStorage.removeItem("keycloak-id-token");
            localStorage.removeItem("token_app");
          }
        } catch (exchangeErr) {
          console.error("Exchange code failed", exchangeErr);
        } finally {
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      }

      // 2. Hỗ trợ luồng BE Callback cũ hoặc fallback: Nhận token trực tiếp từ URL
      const tokenFromCallback = params.get("token");
      const idTokenFromCallback = params.get("id_token");
      const refreshTokenFromCallback = params.get("refresh_token");

      if (tokenFromCallback) {
        localStorage.setItem("token", tokenFromCallback);
        if (idTokenFromCallback) localStorage.setItem("id_token", idTokenFromCallback);
        if (refreshTokenFromCallback) localStorage.setItem("refresh_token", refreshTokenFromCallback);

        localStorage.removeItem("keycloak-token");
        localStorage.removeItem("keycloak-id-token");
        localStorage.removeItem("token_app");
        localStorage.removeItem("keycloak_id_token");

        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }

      const token = localStorage.getItem("token");

      if (!token) {
        setAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      // Gọi thunk redux để lấy thông tin user
      const profile = await dispatch(fetchCurrentUserMe()).unwrap();

      if (profile && profile.loggedIn !== false) {
        setAuthenticated(true);
        setUser({
          user: {
            ...profile.user,
            user: profile.user?.user || profile.user?._id || profile.user?.id,
            id: profile.user?._id || profile.user?.id,
            username: profile.user?.username,
            email: profile.user?.email || profile.user?.emailUser,
            name: profile.user?.name || profile.user?.username,
            profileImage: profile.user?.profileImage,
          },
          roles: profile.roles || [],
          isSuperAdmin: profile.isSuperAdmin,
        });

        const savedRedirectPath = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
        const currentPath = getCurrentRelativePath();
        if (savedRedirectPath && savedRedirectPath !== currentPath) {
          sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
          window.location.replace(savedRedirectPath);
          return;
        }

        if (savedRedirectPath && savedRedirectPath === currentPath) {
          sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
        }
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("id_token");
        setAuthenticated(false);
        setUser(null);
      }
    } catch (err) {
      if (err?.response?.status === 401 || err?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("id_token");
        setAuthenticated(false);
        setUser(null);
      } else {
        if (window.location.pathname !== "/login") {
          setError(
            err.response?.data?.message ||
              err.response?.message ||
              err?.message ||
              "Không thể truy cập. Vui lòng thử lại."
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  const handleWindowReload = useCallback(() => {
    window.location.reload();
  }, []);

  if (error) {
    return (
      <SkyErrorOverlay>
        <SkyErrorCard>
          <SkyErrorTitle>Thông báo</SkyErrorTitle>
          <SkyErrorDescription>{error}</SkyErrorDescription>
          <SkyFlexRowCenter>
            <SkySubmitButton onClick={handleWindowReload}>
              Tải lại trang
            </SkySubmitButton>
            <SkyCancelButton onClick={logout}>Đăng xuất</SkyCancelButton>
          </SkyFlexRowCenter>
        </SkyErrorCard>
      </SkyErrorOverlay>
    );
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        authenticated,
        error,
        login,
        loginLocal,
        logout,
        verifyAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
