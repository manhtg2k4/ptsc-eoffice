import React from "react";
import CustomInput from "@components/CustomInput/CustomInput";
// import { Box, Typography } from "@mui/material";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import {
  ConfigHeaderTypography,
  FormColumnBox,
} from "./KeycloakConfigForm.styles";

const KeycloakConfigForm = ({ value, onChange, disabled, errors = {}, setErrors }) => {
    const handleInputChange = (name, inputValue) => {
    onChange({ ...value, [name]: inputValue });
    // Xóa lỗi của trường này khi người dùng bắt đầu nhập
    if (errors[name] && setErrors) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };
  
  const handleIssuerChange = (e) =>
    handleInputChange("issuer", e.target.value);
  const handlebaseUrlChange = (e) =>
    handleInputChange("baseUrl", e.target.value);
  const handleClientIdChange = (e) =>
    handleInputChange("clientId", e.target.value);
  const handleClientSecretChange = (e) =>
    handleInputChange("clientSecret", e.target.value);
  const handleRedirectUriChange = (e) =>
    handleInputChange("redirectUri", e.target.value);
  const handleScopeChange = (e) =>
    handleInputChange("scope", e.target.value);
  const handleDomainFeChange = (e) =>
    handleInputChange("domainFe", e.target.value);

  return (
    <FormColumnBox>
      <ConfigHeaderTypography variant="h6">
        <VpnKeyIcon /> Cấu hình Keycloak Login
      </ConfigHeaderTypography>
      <CustomInput
        label="Realm URL"
        name="issuer"
        value={value.issuer || ""}
        onChange={handleIssuerChange}
        placeholder="https://auth.lifetex.vn/realms/lifetex"
        disabled={disabled}
        error={!!errors.issuer}
        helperText={errors.issuer}
        required
      />
       <CustomInput
        label="Base URL"
        name="baseUrl"
        value={value.baseUrl || ""}
        onChange={handlebaseUrlChange}
        placeholder="https://192.168.0.86:8080"
        disabled={disabled}
        error={!!errors.baseUrl}
        helperText={errors.baseUrl}
        required
      />

      <CustomInput
        label="Client ID"
        name="clientId"
        value={value.clientId || ""}
        onChange={handleClientIdChange}
        placeholder="qlqt"
        disabled={disabled}
        error={!!errors.clientId}
        helperText={errors.clientId}
        required
      />

      <CustomInput
        label="Client Secret"
        name="clientSecret"
        value={value.clientSecret || ""}
        onChange={handleClientSecretChange}
        placeholder="fKuX9p5wsDaekCVigUTF6MQMxpgAHk7r"
        disabled={disabled}
        error={!!errors.clientSecret}
        helperText={errors.clientSecret}
        required
      />

      <CustomInput
        label="Redirect URI"
        name="redirectUri"
        value={value.redirectUri || ""}
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
        onChange={handleScopeChange}
        placeholder="openid"
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

export default KeycloakConfigForm;
