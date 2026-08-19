import React from "react";
import CustomInput from "@components/CustomInput/CustomInput";
// import { Box, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  ConfigHeaderTypography,
  FormColumnBox,
} from "./KeycloakConfigForm.styles";

const LocalConfigForm = ({ value, onChange }) => {
  // const handleChange = (e) => {
  //   const { name, type, value: inputValue, checked } = e.target;
  //   onChange({ ...value, [name]: type === "checkbox" ? checked : inputValue });
  // };

  const handleInputChange = (name, inputValue) => {
    onChange({ ...value, [name]: inputValue });
  };
    const handleSystemChange = (e) =>
    handleInputChange("systemName", e.target.value);

  return (
    <FormColumnBox>
      <ConfigHeaderTypography
        variant="h6"
        //  fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <LockOutlinedIcon /> Cấu hình Local Login
      </ConfigHeaderTypography>

      <CustomInput
        label="Tên hệ thống"
        value={value.systemName || ""}
        onChange={handleSystemChange}
        placeholder="VD: Lifetex Internal Auth"
        name="systemName"
      />
    </FormColumnBox>
  );
};

export default LocalConfigForm;
