// src/services/auth-strategies/LocalStrategy.js
import { callApi } from "@services/api";
import { API_ME } from "@EnvironmentFile/constants/urlConfig";

class LocalStrategy {
  async login({ accessToken }) {
    if (accessToken) {
      localStorage.setItem("token", accessToken);
    }
    return await this.revalidate();
  }

  async logout() {
    // Xóa toàn bộ dữ liệu local
    localStorage.clear();
    sessionStorage.clear();

    // Xóa httpOnly cookie từ Keycloak (FE không thể xóa trực tiếp)
    try {
      await fetch(`${window.location.origin}/api/auth-keycloak/clear-session`, {
        credentials: 'include',
      });
    } catch (e) {
      // Bỏ qua lỗi nếu endpoint không tồn tại
    }

    window.location.href = "/login";
    return { success: true, redirected: true };
  }

  async revalidate() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await callApi("get", API_ME);
      if (res?.loggedIn) {
        const normalizedUser = {
          ...res,
          user: { ...res.user, user: res.user?._id || res.user?.user },
        };
        localStorage.setItem("userData", JSON.stringify(normalizedUser));
        return normalizedUser;
      }
      this.clearLocalData();
      return null;
    } catch (error) {
      this.clearLocalData();
      throw error;
    }
  }

  getToken() {
    return localStorage.getItem("token");
  }

  clearLocalData() {
    localStorage.clear();
    sessionStorage.clear();
  }
}

export default LocalStrategy;
