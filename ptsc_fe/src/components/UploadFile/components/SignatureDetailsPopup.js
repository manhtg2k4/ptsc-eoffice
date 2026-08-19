import React from "react";
import { styled } from "@mui/material/styles";
import dayjs from "dayjs";
import {
  SkyPopover,
  SkyBox,
  SkyTypography,
  SkyDivider,
} from "@styles/SkyStyles";

const StyledPopupBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  width: "350px",
  maxHeight: "500px",
  overflowY: "auto",
}));

const TitleTypography = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 700,
  marginBottom: theme.spacing(1),
}));

const SignatureContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "isnotfirst",
})(({ theme, isnotfirst }) => ({
  marginTop: isnotfirst ? theme.spacing(2) : 0,
}));

const LabelTypography = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
}));

const ValueTypography = styled(SkyTypography)({
  fontSize: "0.875rem",
});

const StatusTypography = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "istrusted",
})(({ theme, istrusted }) => ({
  fontSize: "0.875rem",
  fontWeight: 600,
  color: istrusted ? theme.palette.success.main : theme.palette.warning.main,
}));

const RowBox = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
}));

const CustomDivider = styled(SkyDivider)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

const MultiSigTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 700,
  marginBottom: theme.spacing(0.5),
}));

const ErrorMessageBox = styled(SkyBox)(({ theme }) => ({
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
}));

const SignatureDetailsPopup = ({ anchorEl, open, onClose, result }) => {
  if (!result) return null;

  const { success, hasSignature, signatures = [], message } = result;

  return (
    <SkyPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
    >
      <StyledPopupBox>
        <TitleTypography variant="subtitle1">
          Xác thực chữ ký số
        </TitleTypography>
        <SkyTypography variant="body2" gutterBottom>
          {typeof message === "string" 
            ? message 
            : (message?.message || (typeof message === "object" ? JSON.stringify(message) : "Lỗi xác thực hệ thống"))}
        </SkyTypography>
        
        <CustomDivider />

        {success && hasSignature && signatures.length > 0 ? (
          signatures.map((sig, index) => (
            <SignatureContainer key={index} isnotfirst={index > 0 ? 1 : 0}>
              {signatures.length > 1 && (
                <RowBox>
                  <MultiSigTitle variant="subtitle2">
                    Chữ ký {index + 1}
                  </MultiSigTitle>
                </RowBox>
              )}
              
              <RowBox>
                <LabelTypography variant="caption">Người ký:</LabelTypography>
                <ValueTypography variant="body2">{sig.signerName || "N/A"}</ValueTypography>
              </RowBox>
              
              <RowBox>
                <LabelTypography variant="caption">Tổ chức:</LabelTypography>
                <ValueTypography variant="body2">{sig.organization || "N/A"}</ValueTypography>
              </RowBox>
              
              <RowBox>
                <LabelTypography variant="caption">Mã số thuế:</LabelTypography>
                <ValueTypography variant="body2">{sig.taxCode || "N/A"}</ValueTypography>
              </RowBox>
              
              <RowBox>
                <LabelTypography variant="caption">Nhà cung cấp:</LabelTypography>
                <ValueTypography variant="body2">{sig.provider || "N/A"}</ValueTypography>
              </RowBox>
              
              <RowBox>
                <LabelTypography variant="caption">Thời hạn:</LabelTypography>
                <ValueTypography variant="body2">
                  {sig.validFrom ? dayjs(sig.validFrom).format("DD/MM/YYYY HH:mm") : "N/A"} 
                  {" - "} 
                  {sig.validTo ? dayjs(sig.validTo).format("DD/MM/YYYY HH:mm") : "N/A"}
                </ValueTypography>
              </RowBox>
              
              <RowBox>
                <LabelTypography variant="caption">Trạng thái tin cậy:</LabelTypography>
                <StatusTypography variant="body2" istrusted={sig.isTrusted ? 1 : 0}>
                  {sig.isTrusted ? "✓ Chứng thư số tin cậy" : "⚠ Chứng thư số chưa được tin cậy"}
                </StatusTypography>
              </RowBox>
            </SignatureContainer>
          ))
        ) : (
          <ErrorMessageBox>
            <SkyTypography variant="body2">
              {!success ? "Lỗi xác thực hệ thống" : "Không tìm thấy thông tin chữ ký"}
            </SkyTypography>
          </ErrorMessageBox>
        )}
      </StyledPopupBox>
    </SkyPopover>
  );
};

export default SignatureDetailsPopup;
