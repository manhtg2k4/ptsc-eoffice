import React from "react";
import CustomInput from "@components/CustomInput/CustomInput";

const AuthTypeSelector = ({ value, onChange, disabled }) => {
  const options = [
    { label: "Local Login", value: "local", name: "Local Login" },
    { label: "Keycloak", value: "keycloak", name: "Keycloak" },
    { label: "Lifesso", value: "wso2", name: "Lifesso" },
    // { label: "Google", value: "google" },
  ];

  const handleChange = (e) => {
    const value = e?.target?.value ?? e?.value ?? e;
    onChange(value);
  };
  return (
    <div className="auth-type-selector">
      <CustomInput
        label="Chọn loại xác thực"
        select
        value={value}
        onChange={handleChange}
        // onChange={(newValue) => onChange(newValue)}
        options={options}
        disabled={disabled}
      />
    </div>
  );
};

export default AuthTypeSelector;
