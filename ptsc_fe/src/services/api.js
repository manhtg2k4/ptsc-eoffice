// api.js
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import axios from "axios";
import { handle401Error, checkAndRefreshToken } from "@services/tokenRefresh";
import { escapeCommentRequestData } from "@utils/securityUtils";

const api = axios.create({
  baseURL: APP_BASE || "http://192.168.0.65:3156",
  timeout: 200000,
  withCredentials: true,
});

// 🧠 Interceptor request: kiểm tra & gắn token từ localStorage
api.interceptors.request.use(
  async (config) => {
    // Chủ động kiểm tra & refresh token trước khi gửi request
    await checkAndRefreshToken();

    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Tự động set timeout 10 phút cho các API upload file
    if (config.url && config.url.includes("/api/files/upload")) {
      config.timeout = 600000; // 10 phút
    }

    config.data = escapeCommentRequestData(config.data, config.url, config.method);

    return config;
  },
  (error) => Promise.reject(error)
);

// 🧩 Interceptor response: xử lý lỗi 401 từ BE và tự động refresh token (dùng module chung)
api.interceptors.response.use(
  (response) => response,
  (error) => handle401Error(error, api)
);

/**
 * Call API với khả năng tùy chỉnh timeout
 */
export const callApi = async (method, url, data = {}, config = {}) => {
  const isFormData = data instanceof FormData;

  const response = await api.request({
    ...config,
    method,
    url,
    ...(["get", "delete"].includes(method.toLowerCase())
      ? { params: { ...data, ...config.params } }
      : { data }),
    headers: {
      ...(config.headers || {}),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
    timeout: config.timeout || 10000,
  });

  return response.data;
};

export const callApis = async (method, url, data = {}, config = {}) => {
  const response = await api({
    method,
    url,
    data,
    ...config,
    timeout: config.timeout || 10000
  });
  return response.data;
};

export default api;
