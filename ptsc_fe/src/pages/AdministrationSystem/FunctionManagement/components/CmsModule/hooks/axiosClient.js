import axios from "axios";
import { APP_BASE } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";
import { handle401Error, checkAndRefreshToken } from "@services/tokenRefresh";
import { escapeCommentRequestData } from "@utils/securityUtils";

const axiosClient = axios.create({
  baseURL: APP_BASE,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🧠 Interceptor request: kiểm tra & gắn token từ localStorage
axiosClient.interceptors.request.use(
  async (config) => {
    // Chủ động kiểm tra & refresh token trước khi gửi request
    await checkAndRefreshToken();

    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.data = escapeCommentRequestData(config.data, config.url, config.method);

    return config;
  },
  (error) => Promise.reject(error)
);

// 🧩 Interceptor response: xử lý lỗi 401 từ BE và tự động refresh token (dùng module chung)
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => handle401Error(error, axiosClient)
);

export const callApi = async (method, url, data = {}, config = {}) => {
  try {
    const isFormData = data instanceof FormData;

    const response = await axiosClient.request({
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

    return response;
  } catch (error) {
    logger.error("❌ callApi error:", error.message);
    throw error;
  }
};

export const callApis = async (method, url, data = {}, config = {}) => {
  try {
    const response = await axiosClient({ method, url, data, ...config });
    return response;
  } catch (error) {
    logger.error("❌ callApis error:", error.message);
    throw error;
  }
};

export default axiosClient;
