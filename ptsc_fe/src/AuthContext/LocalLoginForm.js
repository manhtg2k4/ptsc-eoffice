import React, { useState, useContext } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  PersonOutline as PersonIcon,
  LockOutlined as LockIcon,
  Visibility,
  VisibilityOff,
  VpnKeyOutlined as SsoIcon,
} from "@mui/icons-material";
import { AuthContext } from "./AuthProvider";
import { useNavigate } from "react-router-dom";

const LocalLoginForm = () => {
  const { loginLocal, login: loginSso } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage("Vui lòng nhập tên đăng nhập");
      return;
    }
    if (!password) {
      setErrorMessage("Vui lòng nhập mật khẩu");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      if (loginLocal) {
        await loginLocal({ username: username.trim(), password });
      }
      navigate("/");
    } catch (err) {
      setErrorMessage(
        err.message ||
          err.response?.data?.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
      }}
    >
      {errorMessage && (
        <Alert severity="error" sx={{ borderRadius: 2, fontSize: "0.875rem" }}>
          {errorMessage}
        </Alert>
      )}

      <TextField
        id="login-username"
        label="Tên đăng nhập"
        variant="outlined"
        fullWidth
        required
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          if (errorMessage) setErrorMessage("");
        }}
        disabled={loading}
        placeholder="Nhập tên đăng nhập"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PersonIcon sx={{ color: "#00529D" }} />
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            "&:hover fieldset": {
              borderColor: "#00529D",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#00529D",
            },
          },
        }}
      />

      <TextField
        id="login-password"
        label="Mật khẩu"
        type={showPassword ? "text" : "password"}
        variant="outlined"
        fullWidth
        required
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (errorMessage) setErrorMessage("");
        }}
        disabled={loading}
        placeholder="Nhập mật khẩu"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon sx={{ color: "#00529D" }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            "&:hover fieldset": {
              borderColor: "#00529D",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#00529D",
            },
          },
        }}
      />

      <Button
        id="btn-login-submit"
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading}
        sx={{
          py: 1.4,
          borderRadius: "8px",
          backgroundColor: "#00529D",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: "1rem",
          textTransform: "none",
          boxShadow: "0 4px 12px rgba(0, 82, 157, 0.25)",
          "&:hover": {
            backgroundColor: "#003d75",
            boxShadow: "0 6px 16px rgba(0, 82, 157, 0.35)",
          },
        }}
      >
        {loading ? (
          <CircularProgress size={24} sx={{ color: "#ffffff" }} />
        ) : (
          "Đăng nhập"
        )}
      </Button>

      <Box sx={{ my: 1 }}>
        <Divider sx={{ "&::before, &::after": { borderColor: "#e0e0e0" } }}>
          <Typography variant="caption" sx={{ color: "#888", px: 1 }}>
            HOẶC
          </Typography>
        </Divider>
      </Box>

      <Button
        id="btn-login-sso"
        fullWidth
        variant="outlined"
        startIcon={<SsoIcon />}
        onClick={loginSso}
        disabled={loading}
        sx={{
          py: 1.2,
          borderRadius: "8px",
          borderColor: "#00529D",
          color: "#00529D",
          fontWeight: 500,
          fontSize: "0.925rem",
          textTransform: "none",
          "&:hover": {
            borderColor: "#003d75",
            backgroundColor: "rgba(0, 82, 157, 0.04)",
          },
        }}
      >
        Đăng nhập bằng SSO Keycloak
      </Button>
    </Box>
  );
};

export default LocalLoginForm;
