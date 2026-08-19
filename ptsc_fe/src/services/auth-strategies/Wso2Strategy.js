// src/services/auth-strategies/Wso2Strategy.js
import { callApi } from "@services/api";
import { API_ME, API_WSO2_CALLBACK } from "@EnvironmentFile/constants/urlConfig";

class Wso2Strategy {
  async login(config) {
    if (config && config.authUrl && config.clientId) {
      const { authUrl, clientId, scope } = config;
      const redirectUri = `${window.location.origin}/auth/callback`;
      
      const wso2LoginUrl = `${authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
      
      localStorage.setItem("wso2_config", JSON.stringify({ ...config, redirectUri }));
      window.location.href = wso2LoginUrl;
      return { success: true, redirected: true };
    }
    throw new Error("Invalid WSO2 configuration");
  }

  async logout(authConfig) {
    const idToken = localStorage.getItem("id_token");
    const config = authConfig?.config;

    this.clearLocalData();

    if (config?.logoutUrl && idToken) {
      const postLogoutRedirect = `${window.location.origin}/`;
      // Redirect to WSO2 logout
      window.location.href = `${config.authUrl}?&prompt=login&response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(postLogoutRedirect)}`;
    } else {
      window.location.href = "/login";
    }
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
        if (res.tokenUser) {
          localStorage.setItem("token", res.tokenUser);
        }
        return normalizedUser;
      }
      this.clearLocalData();
      return null;
    } catch (error) {
      this.clearLocalData();
      throw error;
    }
  }

  async handleCallback(code) {
    const wso2ConfigStr = localStorage.getItem("wso2_config");
    if (!wso2ConfigStr) {
      throw new Error("Không tìm thấy cấu hình lifeSSO.");
    }
    const wso2Config = JSON.parse(wso2ConfigStr);

    const formData = new URLSearchParams();
    formData.append("grant_type", "authorization_code");
    formData.append("redirect_uri", wso2Config.redirectUri);
    formData.append("client_id", wso2Config.clientId);
    formData.append("code", code);
    formData.append("client_secret", wso2Config.clientSecret);

    const response = await fetch(wso2Config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });
    localStorage.removeItem("wso2_config");

    if (!response.ok) {
      throw new Error(`Token request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Lưu các giá trị từ WSO2
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (key === "access_token") {
          localStorage.setItem("wso2_access_token", data[key]);
        } else {
          localStorage.setItem(key, data[key]);
        }
      }
    }

    const wso2AccessToken = data.access_token;
    if (!wso2AccessToken) {
      throw new Error("Phản hồi từ WSO2 không chứa access_token.");
    }

    // Gọi API backend để đổi WSO2 token lấy token của hệ thống
    /* eslint-disable camelcase */
    const backendResponse = await callApi("post", API_WSO2_CALLBACK, {
      access_token: wso2AccessToken,
    });
    /* eslint-enable camelcase */

    const finalToken = backendResponse?.token;
    if (!finalToken) {
      throw new Error("Không nhận được token từ hệ thống sau khi xác thực.");
    }

    localStorage.setItem("token", finalToken);
    return true;
  }

  getToken() {
    return localStorage.getItem("token") || localStorage.getItem("wso2_access_token");
  }

  clearLocalData() {
    const keys = [
      "token",
      "access_token",
      "wso2_access_token",
      "id_token",
      "refresh_token",
      "scope",
      "token_type",
      "expires_in",
      "wso2_config",
      "userData",
      "wso2_auth_data"
    ];
    keys.forEach(key => localStorage.removeItem(key));
  }
}

export default Wso2Strategy;
