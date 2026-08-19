// logoutWSO2.js
export const logoutFromWSO2 = () => {
  const wso2Config = JSON.parse(localStorage.getItem("wso2_config"));
  const authData = JSON.parse(localStorage.getItem("wso2_auth_data"));

  if (!wso2Config || !authData) {
    logger.error("Không tìm thấy dữ liệu WSO2 để logout");
    return;
  }

  const idToken = authData.id_token;
  const logoutUrl = `${wso2Config.logoutUrl}?id_token_hint=${idToken}&post_logout_redirect_uri=${encodeURIComponent(window.location.origin + "/login")}`;

  // ✅ Dọn localStorage phía frontend
  localStorage.removeItem("access_token");
  localStorage.removeItem("wso2_auth_data");

  // ✅ Chuyển hướng sang trang logout của WSO2
  window.location.href = logoutUrl;
};
