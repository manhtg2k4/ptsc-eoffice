import React from "react";
import { useForm } from "react-hook-form";
import {
  Container,
  // Box,
  Typography,
  TextField,
  Button,
  Paper,
  styled,
} from "@mui/material";
//
import { API_LOGIN } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(8),
  borderRadius: theme.shape.borderRadius * 2,
}));

const StyledForm = styled("form")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));

const LoginCallback = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const res = await api.post(
        `${API_LOGIN}`, // API login bên NestJS
        data,
        { withCredentials: true } // quan trọng để cookie được set
      );

      if (res.data.success) {
        // Nếu BE trả về thông tin user → lưu vào localStorage hoặc context
        localStorage.setItem("user", JSON.stringify(res.data.user));
        window.location.href = "/"; // redirect về home
      } else {
        alert("Sai email hoặc mật khẩu!");
      }
    } catch (err) {
      logger.error("Login error:", err);
      alert("Đăng nhập thất bại!");
    }
  };

  return (
    // <Container maxWidth="sm">
    <Container>
      <StyledPaper elevation={3}>
        <Typography variant="h5" align="center" gutterBottom>
          Đăng nhập
        </Typography>
        <StyledForm onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="Email"
            fullWidth
            size="small"
            {...register("username", { required: "Email là bắt buộc" })}
            error={!!errors.email}
            helperText={errors.email?.message}
          />

          <TextField
            label="Mật khẩu"
            type="password"
            fullWidth
            size="small"
            {...register("password", { required: "Mật khẩu là bắt buộc" })}
            error={!!errors.password}
            helperText={errors.password?.message}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </StyledForm>
      </StyledPaper>
    </Container>
  );
};

export default LoginCallback;
