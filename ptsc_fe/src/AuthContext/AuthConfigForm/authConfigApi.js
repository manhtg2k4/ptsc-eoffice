import { callApi } from "@services/api";

const API_AUTH_CONFIG = "/api/auth-config";
const API_TEST_AUTH_CONFIG = "/api/auth/test-connection-sso";
export const getAuthConfigByType = (authType) => {
  return callApi("get", `${API_AUTH_CONFIG}/type/${authType}`);
};

export const saveAuthConfig = (config) => {
  return callApi("post", API_AUTH_CONFIG, config);
};

export const updateAuthConfig = (id, config) => {
  return callApi("put", `${API_AUTH_CONFIG}/${id}`, config);
};
export const testAuthConfig = async (data) => {
  return callApi("post", `${API_TEST_AUTH_CONFIG}`, data);
};
