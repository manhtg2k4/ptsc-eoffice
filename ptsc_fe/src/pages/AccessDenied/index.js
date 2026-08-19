import React from "react";
import { Box, Paper, Typography, styled } from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";

const PageContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  backgroundColor: theme.palette.background.default,
}));

const MessagePaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: "center",
  maxWidth: 500,
  width: "90%",
}));

const StyledBlockIcon = styled(BlockIcon)(({ theme }) => ({
  fontSize: 60,
  color: theme.palette.error.main,
}));

const TitleTypography = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(2),
  color: theme.palette.error.main,
}));

const AccessDenied = () => {
  return (
    <PageContainer>
      <MessagePaper elevation={3}>
        <StyledBlockIcon />
        <TitleTypography variant="h5" component="h1" gutterBottom>
          Truy cập bị từ chối
        </TitleTypography>
        <Typography variant="body1">
          Địa chỉ IP của bạn đã bị chặn hoặc không được phép truy cập vào hệ thống.
        </Typography>
      </MessagePaper>
    </PageContainer>
  );
};

export default AccessDenied;
