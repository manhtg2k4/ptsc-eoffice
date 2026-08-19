import React from "react";
import CustomInput from "@components/CustomInput/CustomInput";
// import { Box, Typography } from "@mui/material";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import {
  ConfigHeaderTypography,
  FormColumnBox,
} from "./KeycloakConfigForm.styles";

const WSO2ConfigForm = ({ value, onChange, disabled, errors = {}, setErrors }) => {
  // const handleChange = (e) => {
  //   onChange({ ...value, [e.target.name]: e.target.value });
  // };

  const handleInputChange = (name, inputValue) => {
    onChange({ ...value, [name]: inputValue });
    // Xóa lỗi của trường này khi người dùng bắt đầu nhập
    if (errors[name] && setErrors) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  // ✅ TẠO CÁC HÀM HANDLER CHO TỪNG INPUT
  const handleAuthUrlChange = (e) =>
    handleInputChange("authUrl", e.target.value);
  const handleTokenUrlChange = (e) =>
    handleInputChange("tokenUrl", e.target.value);
  const handleUserInfoUrlChange = (e) =>
    handleInputChange("userInfoUrl", e.target.value);
  const handleLogoutUrlChange = (e) =>
    handleInputChange("logoutUrl", e.target.value);
  const handleClientIdChange = (e) =>
    handleInputChange("clientId", e.target.value);
  const handleClientSecretChange = (e) =>
    handleInputChange("clientSecret", e.target.value);
  const handleRedirectUriChange = (e) =>
    handleInputChange("redirectUri", e.target.value);
  const handleScopeChange = (e) => handleInputChange("scope", e.target.value);
  const handleDomainFeChange = (e) =>
    handleInputChange("domainFe", e.target.value);

  return (
    <FormColumnBox>
      <ConfigHeaderTypography variant="h6">
        <TravelExploreIcon /> Cấu hình lifeSSO Login
      </ConfigHeaderTypography>

      <CustomInput
        label="Authorization URL"
        name="authUrl"
        value={value.authUrl || ""}
        // onChange={(e) => handleInputChange("authUrl", e.target.value)}
        onChange={handleAuthUrlChange}
        placeholder="https://lifesso.lifetex.vn:9445/oauth2/authorize"
        disabled={disabled}
        error={!!errors.authUrl}
        helperText={errors.authUrl}
        required
      />

      <CustomInput
        label="Token URL"
        name="tokenUrl"
        value={value.tokenUrl || ""}
        // onChange={(e) => handleInputChange("tokenUrl", e.target.value)}
        onChange={handleTokenUrlChange}
        placeholder="https://lifesso.lifetex.vn:9445/oauth2/token"
        disabled={disabled}
        error={!!errors.tokenUrl}
        helperText={errors.tokenUrl}
        required
      />

      <CustomInput
        label="User Info URL"
        name="userInfoUrl"
        value={value.userInfoUrl || ""}
        // onChange={(e) => handleInputChange("userInfoUrl", e.target.value)}
        onChange={handleUserInfoUrlChange}
        placeholder="https://lifesso.lifetex.vn:9445/oauth2/userinfo"
        disabled={disabled}
        error={!!errors.userInfoUrl}
        helperText={errors.userInfoUrl}
        required
      />

      <CustomInput
        label="Logout URL"
        name="logoutUrl"
        value={value.logoutUrl || ""}
        // onChange={(e) => handleInputChange("logoutUrl", e.target.value)}
        onChange={handleLogoutUrlChange}
        placeholder="https://lifesso.lifetex.vn:9445/oidc/logout"
        disabled={disabled}
        error={!!errors.logoutUrl}
        helperText={errors.logoutUrl}
        required
      />

      <CustomInput
        label="Client ID"
        name="clientId"
        value={value.clientId || ""}
        // onChange={(e) => handleInputChange("clientId", e.target.value)}
        onChange={handleClientIdChange}
        placeholder="fyG0Ofbuekh08hKARMxfkOXd_4Ia"
        disabled={disabled}
        error={!!errors.clientId}
        helperText={errors.clientId}
        required
      />

      <CustomInput
        label="Client Secret"
        name="clientSecret"
        value={value.clientSecret || ""}
        // onChange={(e) => handleInputChange("clientSecret", e.target.value)}
        onChange={handleClientSecretChange}
        placeholder="XbtCAMuADk9FvbIJ5Nf8bhCs2J7wVFVxWfB5hfeDbOUa"
        disabled={disabled}
        error={!!errors.clientSecret}
        helperText={errors.clientSecret}
        required
      />

      <CustomInput
        label="Redirect URI"
        name="redirectUri"
        value={value.redirectUri || ""}
        // onChange={(e) => handleInputChange("redirectUri", e.target.value)}
        onChange={handleRedirectUriChange}
        placeholder="https://dev-vps-tcsg.lifetex.vn/auth/callback"
        disabled={disabled}
        error={!!errors.redirectUri}
        helperText={errors.redirectUri}
        required
      />

      <CustomInput
        label="Scope"
        name="scope"
        value={value.scope || ""}
        // onChange={(e) => handleInputChange("scope", e.target.value)}
        onChange={handleScopeChange}
        placeholder="openid address email groups profile roles"
        disabled={disabled}
        error={!!errors.scope}
        helperText={errors.scope}
        required
      />

      <CustomInput
        label="Domain FE"
        name="domainFe"
        value={value.domainFe || ""}
        onChange={handleDomainFeChange}
        placeholder="https://dev-vps-tcsg.lifetex.vn"
        disabled={disabled}
        error={!!errors.domainFe}
        helperText={errors.domainFe}
        required
      />
    </FormColumnBox>
  );
};

export default WSO2ConfigForm;
