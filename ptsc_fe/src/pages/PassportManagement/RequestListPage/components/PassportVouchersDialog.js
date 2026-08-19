import React from "react";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import { CircularProgress, Grid } from "@mui/material";
import { TextOption } from "@styles/PassportManagement.styles";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import { useSelector } from "react-redux";

const PassportVouchersDialog = (props) => {
  const {
    open,
    onClose,
    sharedComponents,
    title,
    titleButton,
    onSave,
    isLoading,
    data,
    size,
    cancelButtonText,
    typeDialog,
  } = props;
  const { Dialog } = sharedComponents;
  const { dataUser } = useSelector((state) => state.auth);
  const timeNow = new Date().toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isCreateMinutes = typeDialog === "createMinutes";
  const isReturnVoucher = typeDialog === "createReturn";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onSave={onSave}
      titleButton={titleButton}
      title={title}
      disableSave={false}
      size={size}
      cancelButtonText={cancelButtonText}
    >
      {isLoading && (
        <StyledLoadingPopupSignDigital>
          <CircularProgress />
        </StyledLoadingPopupSignDigital>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4} md={4}>
          <TextOption>Người ký:</TextOption>
        </Grid>
        <Grid item xs={12} sm={8} md={8}>
          <TextOption>{dataUser?.name}</TextOption>
        </Grid>

        <Grid item xs={12} sm={4} md={4}>
          <TextOption>Vai trò:</TextOption>
        </Grid>
        <Grid item xs={12} sm={8} md={8}>
          <TextOption>
            {isReturnVoucher
              ? "Người bàn giao hộ chiếu"
              : isCreateMinutes
                ? "Người bàn giao hộ chiếu"
                : "Người nhận hộ chiếu"}
          </TextOption>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <TextOption>
            {isReturnVoucher
              ? "Người nhận lại:"
              : isCreateMinutes
                ? "Người nhận:"
                : "Người bàn giao:"}
          </TextOption>
        </Grid>
        <Grid item xs={12} sm={8} md={8}>
          <TextOption>
            {(isCreateMinutes
              ? data?.requesterInfo?.name
              : data?.performerName) || "....."}
          </TextOption>
        </Grid>

        <Grid item xs={12} sm={4} md={4}>
          <TextOption>Thời gian:</TextOption>
        </Grid>
        <Grid item xs={12} sm={8} md={8}>
          <TextOption>{timeNow}</TextOption>
        </Grid>
      </Grid>
    </Dialog>
  );
};

PassportVouchersDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  titleButton: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  dataRequest: PropTypes.object,
  size: PropTypes.string,
};

PassportVouchersDialog.defaultProps = {
  titleButton: "Đồng ý",
};

export default withSharedComponents(PassportVouchersDialog);
