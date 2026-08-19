import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";

const API_AUTH_CONFIG = "/api/auth-config";
// const API_AUTH_CONFIGS = "/api/auth-config/get-list-config";
const API_TEST_AUTH_CONFIG = "/api/auth/test-connection-sso";

export const getAuthConfig = () => {
  // return axiosClient.get(API_AUTH_CONFIGS);
};

export const saveAuthConfig = (config) => {
  return axiosClient.post(API_AUTH_CONFIG, config);
};

export const updateAuthConfig = (id, config) => {
  return axiosClient.put(`${API_AUTH_CONFIG}/${id}`, config);
};
export const testAuthConfig = async (data) => {
  return axiosClient.post(`${API_TEST_AUTH_CONFIG}`, data);
};
