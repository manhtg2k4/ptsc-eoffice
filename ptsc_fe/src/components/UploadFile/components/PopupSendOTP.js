import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { CustomDialog } from "@components/CustomDialog";
import { Grid, FormHelperText, IconButton } from "@mui/material";
import { styled } from "@mui/material/styles";
import { FullWidthGridItem } from "@styles/FormList.styles";
import { Controller, useWatch } from "react-hook-form";
import { SkyBox, SkyTextField } from "@styles/SkyStyles";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const OtpContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1.5),
  justifyContent: "center",
}));

const StyledFormHelperText = styled(FormHelperText)(({ theme }) => ({
  textAlign: "center",
  marginTop: theme.spacing(1),
}));

const PinInputContainer = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "center",
}));

const PinTextField = styled(SkyTextField)(() => ({
  width: "280px",
}));

const EndAdornmentWrapper = styled(SkyBox)(() => ({
  position: "absolute",
  right: "8px",
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  alignItems: "center",
}));

const PinInputWrapper = styled(SkyBox)(() => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
}));

const OtpInput = ({ value, onChange, error, otpLength = 6 }) => {
  const inputRefs = useRef([]);

  const otpArray = (value || "")
    .split("")
    .concat(new Array(otpLength).fill(""))
    .slice(0, otpLength);

  const focusInput = (index) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index].focus();
    }
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = "#1976d2";
    e.target.select();
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = error ? "#d32f2f" : "#ccc";
  };

  const handleChange = (e) => {
    const index = Number(e.target.dataset.index);
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;

    const newOtp = [...otpArray];
    newOtp[index] = val.substring(val.length - 1);
    const newValue = newOtp.join("");
    onChange(newValue);

    if (val && index < otpLength - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (e) => {
    const index = Number(e.target.dataset.index);
    const digit = otpArray[index];

    if (e.key === "Backspace") {
      if (!digit && index > 0) {
        focusInput(index - 1);
        const newOtp = [...otpArray];
        newOtp[index - 1] = "";
        onChange(newOtp.join(""));
      } else if (digit) {
        const newOtp = [...otpArray];
        newOtp[index] = "";
        onChange(newOtp.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < otpLength - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, otpLength);
    if (pasted) {
      onChange(pasted);
      focusInput(Math.min(pasted.length, otpLength - 1));
    }
  };

  return (
    <SkyBox>
      <OtpContainer>
        {otpArray.map((digit, index) => (
          <input
            key={`otp-digit-${index}`} // eslint-disable-line react/no-array-index-key
            data-index={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            maxLength={1}
            value={digit}
            style={{
              width: "48px",
              height: "56px",
              fontSize: "1.5rem",
              fontWeight: "bold",
              textAlign: "center",
              borderRadius: "8px",
              border: error ? "1px solid #d32f2f" : "1px solid #ccc",
              outline: "none",
              transition: "all 0.2s",
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />
        ))}
      </OtpContainer>
      {error && <StyledFormHelperText error>{error.message}</StyledFormHelperText>}
    </SkyBox>
  );
};

const PinInput = ({ value, onChange, error }) => {
  const [showPin, setShowPin] = useState(false);

  const handleChange = (e) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;
    if (val.length > 16) return;
    onChange(val);
  };

  const handleTogglePinVisibility = () => {
    setShowPin((prev) => !prev);
  };

  return (
    <PinInputContainer>
      <PinInputWrapper>
        <PinTextField
          type={showPin ? "text" : "password"}
          value={value || ""}
          onChange={handleChange}
          placeholder="Nhập mã PIN"
          error={!!error}
          helperText={error?.message}
          size="medium"
          inputProps={{
            maxLength: 16,
            style: { textAlign: "center", paddingRight: "40px" },
          }}
        />
        <EndAdornmentWrapper>
          <IconButton onClick={handleTogglePinVisibility} edge="end" size="small">
            {showPin ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </EndAdornmentWrapper>
      </PinInputWrapper>
    </PinInputContainer>
  );
};

const PopupSendOTP = ({
  open,
  onClose,
	onSave,
	title = "Nhập mã OTP",
	type,
  control,
  handleSubmit,
  onSubmit,
  errors,
  isLoading,
}) => {
  // type === "caSoft" thì 6 ô OTP, còn lại (PIN) thì 1 ô nhập PIN
  const isPinCode = type !== "caSoft";
  const otpLength = isPinCode ? 6 : 6; // PIN: 6-16 chars validated in PinInput, OTP: 6 digits
  const otpValue = useWatch({ control, name: "otp" });
  const otpLengthToWatch = isPinCode ? 6 : 6;
  const isComplete = otpValue && otpValue.length >= otpLengthToWatch;

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={onSave}
      title={title}
      isLoading={isLoading}
      titleButton="Xác nhận"
      size="small"
      disableSave={!isComplete}
    >
      <SkyBox component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <FullWidthGridItem item>
            {isPinCode ? (
              <Controller
                name="otp"
                control={control}
                render={({ field }) => (
                  <PinInput
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.otp}
                  />
                )}
              />
            ) : (
              <Controller
                name="otp"
                control={control}
                render={({ field }) => (
                  <OtpInput
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.otp}
                    otpLength={otpLength}
                  />
                )}
              />
            )}
          </FullWidthGridItem>
        </Grid>
      </SkyBox>
    </CustomDialog>
  );
};

OtpInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.object,
  otpLength: PropTypes.number,
};

PopupSendOTP.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSave: PropTypes.func,
  handleSubmit: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  control: PropTypes.object,
  errors: PropTypes.object,
  isLoading: PropTypes.bool,
  type: PropTypes.string,
};

export default PopupSendOTP;
