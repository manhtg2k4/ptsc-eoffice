import React, { useMemo } from "react";
import { Grid, Typography } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { useSelector } from "react-redux";
import withSharedComponents from "@components/WrapperComponent";

const maskPhone = (phone) => {
  if (!phone) return "";
  const phoneStr = String(phone);
  if (phoneStr.length <= 4) return phoneStr;
  return "*".repeat(phoneStr.length - 3) + phoneStr.slice(-3);
};

const OtpOrPinCodeConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  email,
  phone,
  error,
  title = "Xác nhận ký số",
  onChangeConfirmMethod,
  confirmMethod,
  sharedComponents,
}) => {
  const { InputComponents } = sharedComponents;
  const crmSource = useSelector((state) => state.config.crmSource);
  const optionSigningMethod = useMemo(() => {
    if (!crmSource) return [];
    const listOptionSigningMethod = crmSource.find(
      (item) => item.code === "signingMethod"
    );
    return listOptionSigningMethod?.data || [];
  }, [crmSource]);

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={onConfirm}
      title={title?.toUpperCase()}
      type="edit"
      titleButton="Đồng ý"
      isLoading={isLoading}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <InputComponents
            label="Phương thức ký"
            placeholder="Phương thức ký"
            select
            options={optionSigningMethod}
            onChange={onChangeConfirmMethod}
            value={confirmMethod}
            // error={!!errors.scheduleType}
            // helperText={errors.scheduleType?.message}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <Typography>
            {error ? (
              <span style={{ color: "red" }}>{error}</span>
            ) : confirmMethod === "caSoft" ? (
              <>
                Vui lòng xác nhận ký số, hệ thống sẽ gửi mã OTP về{" "}
                {email && phone ? (
                  <>
                    email <strong>&quot;{email}&quot;</strong> và số điện thoại{" "}
                    <strong>{maskPhone(phone)}</strong>
                  </>
                ) : email ? (
                  <>
                    email <strong>&quot;{email}&quot;</strong>
                  </>
                ) : phone ? (
                  <>
                    số điện thoại <strong>{maskPhone(phone)}</strong>
                  </>
                ) : (
                  "email/số điện thoại"
                )}{" "}
                của bạn!
              </>
            ) : (
              <>Vui lòng xác nhận ký số!</>
            )}
          </Typography>
        </Grid>
      </Grid>
    </CustomDialog>
  );
};

export default withSharedComponents(OtpOrPinCodeConfirmDialog);
