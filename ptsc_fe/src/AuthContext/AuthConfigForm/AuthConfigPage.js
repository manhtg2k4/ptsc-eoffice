
import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
import AuthTypeSelector from "./AuthTypeSelector";
import LocalConfigForm from "./LocalConfigForm";
import KeycloakConfigForm from "./KeycloakConfigForm";
import WSO2ConfigForm from "./WSO2ConfigForm";
import {
  keycloakIssuer,
  keycloakClientId,
  keycloakRedirectUri,
  keycloakScope,
  keycloakBaseUrl,
} from "@variable";

import {
  saveAuthConfig,
  testAuthConfig,
  updateAuthConfig,
} from "./authConfigApi";
import { useToast } from "@components/common/ToastProvider";
import { Box, CircularProgress } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import {
  ActionButtonBox,
  ConfigFormBox,
  EditConfigButton,
  LoadingBox,
  MainContainerBox,
  MainContentPaper,
  TitleTypography,
} from "./AuthConfigPage.styles";

const defaultConfigs = {
  local: { systemName: "Lifetex Internal Auth" },
	// wso2: {
	// 	authUrl: REACT_APP_WSO2_AUTH_URL,
	// 	tokenUrl: REACT_APP_WSO2_TOKEN_URL,
	// 	userInfoUrl: REACT_APP_WSO2_USERINFO_URL,
	// 	logoutUrl: REACT_APP_WSO2_LOGOUT_URL,
	// 	clientId: REACT_APP_WSO2_CLIENT_ID,
	// 	clientSecret: REACT_APP_WSO2_CLIENT_SECRET,
	// 	redirectUri: REACT_APP_WSO2_REDIRECT_URI,
	// 	scope: REACT_APP_WSO2_SCOPE,
	// },
	// keycloak: {
	// 	issuer: REACT_APP_KEYCLOAK_ISSUER,
	// 	clientId: REACT_APP_KEYCLOAK_CLIENT_ID,
	// 	clientSecret: REACT_APP_KEYCLOAK_CLIENT_SECRET,
	// 	redirectUri: REACT_APP_KEYCLOAK_REDIRECT_URI,
	// 	scope: REACT_APP_KEYCLOAK_SCOPE,
	// },
	// local: { systemName: "Lifetex Internal Auth" },
	wso2: {
		authUrl: "",
		tokenUrl: "",
		userInfoUrl: "",
		logoutUrl: "",
		clientId: "",
		clientSecret: "",
		redirectUri: "",
		scope: "",
		domainFe: "",
	},
	keycloak: {
		issuer: "",
    baseUrl: "",
		clientId: "",
		clientSecret: "",
		redirectUri: "",
		scope: "",
		domainFe: "",
	},
};

const AuthConfigPage = () => {
  const [authType, setAuthType] = useState("local");
  const [config, setConfig] = useState({});
  const [activeConfigId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [openConfigDialog, setOpenConfigDialog] = useState(false);
  const [errors, setErrors] = useState({});

  const toast = useToast();
  // const navigate = useNavigate();

  useEffect(() => {
    // Luôn dùng keycloak config từ env
    setAuthType("keycloak");
    setConfig({
      issuer: keycloakIssuer,
      baseUrl: keycloakBaseUrl,
      clientId: keycloakClientId,
      redirectUri: keycloakRedirectUri,
      scope: keycloakScope,
    });
    setIsLoading(false);
    setIsEditing(false);
  }, []);

  const validateConfig = () => {
    if (authType === "local") {
      setErrors({});
      return true; // Bỏ qua kiểm tra cho local
    }

    const requiredFields = Object.keys(defaultConfigs[authType]);
    const newErrors = {};
    let isValid = true;

    for (const field of requiredFields) {
      if (!config[field] || String(config[field]).trim() === "") {
        newErrors[field] = "Trường này là bắt buộc";
        isValid = false;
      }
    }
    setErrors(newErrors);
    return isValid;
  };
  const handleAuthenticate = async () => {
    if (!validateConfig()) {
      toast("Vui lòng nhập đầy đủ các trường bắt buộc!", "error");
      return;
    }
    try {
      const saveOrUpdatePromise = activeConfigId
        ? updateAuthConfig(activeConfigId, { authType, config, isActive: true })
        : saveAuthConfig({ authType, config, isActive: true });

      await saveOrUpdatePromise;
      toast("Lưu cấu hình thành công!", "success");
      // logger.log("🔥 authType khi bấm Lưu:", authType);

      localStorage.clear();

      if (authType === "wso2") {
        const { authUrl, clientId, scope } = config;
        const redirectUri = `${window.location.origin}/auth/callback`;

        localStorage.setItem(
          "wso2_config",
          JSON.stringify({ ...config, redirectUri })
        );

        const wso2LoginUrl = `${authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&scope=${encodeURIComponent(scope)}`;

        window.location.href = wso2LoginUrl;
      } else if (authType === "local") {
        window.location.href = "/login";
      } else if (authType === "keycloak") {
        // Đối với Keycloak, cần xây dựng URL đăng nhập tương tự WSO2
        const { issuer, clientId, scope = "openid", redirectUri } = config; // Lấy redirectUri từ config do người dùng nhập

        const keycloakLoginUrl = `${issuer}/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=code&scope=${encodeURIComponent(scope)}`;

        // Lưu cấu hình Keycloak vào localStorage để trang callback sử dụng
        localStorage.setItem(
          "keycloak_config",
          JSON.stringify({ ...config, redirectUri })
        );

        window.location.href = keycloakLoginUrl;
      }
    } catch (error) {
      toast("Thao tác thất bại!", "error");
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setOpenConfigDialog(true);
    toast("Chế độ chỉnh sửa đã được bật.", "info");
  };

  // const handleSaveConfig = async () => {
  //   // Chỉ thực hiện lưu, không đóng dialog
  //   const isValid = validateConfig();
  //   if (isValid) {
  //     await handleAuthenticate(false); // Gọi handleAuthenticate mà không redirect
  //   }
  // };
  const handleSaveConfig = async () => {
  if (!validateConfig()) {
    toast("Vui lòng nhập đầy đủ các trường bắt buộc!", "error");
    return;
  }

  try {

  // Nếu vào đây, tức là success = true
  // console.log(">>> test config response:", response);
     if (authType !== "local") {
      const response = await testAuthConfig({ authType, config });

      // Nếu kết quả test không thành công, hiển thị lỗi và dừng lại
      if (response.success !== true) {
        toast(response.message || "Cấu hình không hợp lệ!", "error");
        return;
      }

      toast("Cấu hình hợp lệ!", "success");
    }




    // // LƯU CẤU HÌNH
    // const saveOrUpdatePromise = activeConfigId
    //   ? updateAuthConfig(activeConfigId, { authType, config, isActive: true })
    //   : saveAuthConfig({ authType, config, isActive: true });

    // await saveOrUpdatePromise;

    // toast("Lưu cấu hình thành công!", "success");

    await handleAuthenticate();

  } catch (error) {
  const backendMsg =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Có lỗi xảy ra. Vui lòng thử lại!";

  toast(backendMsg, "error");
}
};


  const renderConfigForm = () => {
    switch (authType) {
      case "keycloak":
        return (
          <KeycloakConfigForm
            value={config}
            onChange={setConfig}
            disabled={!isEditing}
            errors={errors}
            setErrors={setErrors}
          />
        );
      case "wso2":
        return (
          <WSO2ConfigForm
            value={config}
            onChange={setConfig}
            disabled={!isEditing}
            errors={errors}
            setErrors={setErrors}
          />
        );
      default:
        return (
          <LocalConfigForm
            value={config}
            onChange={setConfig}
            disabled={!isEditing}
            errors={errors}
            setErrors={setErrors}
          />
        );
    }
  };

  const handleAuthTypeChange = (newType) => {
    setErrors({}); // Xóa lỗi khi thay đổi loại xác thực
    setAuthType(newType);
    setConfig(defaultConfigs[newType] || {});
  };

  const handleCloseDialog = () => {
    setOpenConfigDialog(false);
    setIsEditing(false);
    setErrors({}); // Xóa lỗi khi đóng dialog
  };

  return (
    <>
      <MainContainerBox
      // sx={{
      //   display: "flex",
      //   justifyContent: "center",
      //   alignItems: "flex-start",
      //   minHeight: "calc(100vh - 64px)",
      //   backgroundColor: "background.default",
      //   p: 3,
      // }}
      >
        <MainContentPaper
        // sx={{
        //   p: { xs: 2, sm: 3, md: 4 },
        //   width: "100%",
        //   maxWidth: "800px",
        //   display: "flex",
        //   flexDirection: "column",
        //   gap: 3,
        // }}
        >
          <TitleTypography variant="h5">
            Thiết lập loại xác thực
          </TitleTypography>

          {isLoading ? (
            <LoadingBox
            //  sx={{ display: "flex", justifyContent: "center", my: 4 }}
            >
              <CircularProgress />
            </LoadingBox>
          ) : (
            <>
              <AuthTypeSelector
                disabled={!isEditing}
                value={authType}
                // onChange={(newType) => {
                //   setAuthType(newType);
                //   setConfig(defaultConfigs[newType] || {});
                // }}
                onChange={handleAuthTypeChange}
              />
              <Box>{renderConfigForm()}</Box>

              <ActionButtonBox>
                <EditConfigButton variant="contained" onClick={handleEditClick}>
                  Chỉnh sửa cấu hình
                </EditConfigButton>
              </ActionButtonBox>
            </>
          )}
        </MainContentPaper>
      </MainContainerBox>

      {/* ✅ CUSTOM DIALOG */}
      <CustomDialog
        open={openConfigDialog}
        // onClose={() => {
        //   setOpenConfigDialog(false);
        //   setIsEditing(false);
        // }}
        onClose={handleCloseDialog}
        title="Cấu hình xác thực"
        onSave={handleSaveConfig}
        type="edit"
        disableSave={!isEditing}
        isLoading={isLoading}
        size="md"
        isheight="650px"
      >
        <AuthTypeSelector
          disabled={!isEditing}
          value={authType}
          // onChange={(newType) => {
          //   setAuthType(newType);
          //   setErrors({});
          //   setConfig(defaultConfigs[newType] || {});
          // }}
          onChange={handleAuthTypeChange}
        />

        <ConfigFormBox>{renderConfigForm()}</ConfigFormBox>
      </CustomDialog>
    </>
  );
};

export default AuthConfigPage;
