import axios from "axios";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import { handle401Error, checkAndRefreshToken } from "@services/tokenRefresh";
import { escapeCommentRequestData } from "@utils/securityUtils";

const axiosInstance = axios.create({
  baseURL: APP_BASE, // Đảm bảo có baseURL
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  async (config) => {
    // Chủ động kiểm tra & refresh token trước khi gửi request
    await checkAndRefreshToken();

    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Khi gửi FormData (upload file), xóa Content-Type để axios tự set multipart/form-data với boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    // Tự động set timeout 10 phút cho các API upload file
    if (config.url && config.url.includes("/api/files/upload")) {
      config.timeout = 600000; // 10 phút
    }

    config.data = escapeCommentRequestData(config.data, config.url, config.method);

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    let originalData = response.data;
    let unwrappedData = originalData;

    // Skip unwrapping for Blob responses (file downloads)
    if (originalData instanceof Blob) {
      return originalData;
    }

    // Nếu request có chỉ định không unwrap, trả về nguyên bản dữ liệu
    if (response.config?.skipUnwrap) {
      return originalData;
    }

    // Chỉ "mở gói" nếu thuộc tính 'data' tồn tại và không phải là null/undefined
    while (
      unwrappedData &&
      typeof unwrappedData === "object" &&
      !Array.isArray(unwrappedData) &&
      "data" in unwrappedData
    ) {
      unwrappedData = unwrappedData.data;
    }

    return unwrappedData;
  },
  (error) => handle401Error(error, axiosInstance)
);

export default axiosInstance;
