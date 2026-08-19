import { Box } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

export const Overlay = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  // Ở chế độ tối, sử dụng màu nền giấy (paper) để che phủ hoàn toàn.
  // Ở chế độ sáng, giữ lại màu trắng trong suốt.
  background:
    theme.palette.mode === "dark"
      ? "rgba(0, 0, 0, 0.3)"
      : "rgba(255, 255, 255, 0.5)",
  backdropFilter: "blur(5px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: theme.zIndex.drawer + 100, // Đảm bảo nó hiển thị trên tất cả
}));

export const LoadingText = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2), // 16px
  fontSize: "18px",
  fontWeight: "bold",
  color: theme.palette.text.primary,
}));

export const LoadingContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

// 🚀 Keyframes cho hiệu ứng ba chấm
export const bounce = keyframes`
  0%, 70%, 100% {
    transform: scale(0);
  }
  35% {
    transform: scale(1);
  }
`;

// 🚀 Container cho các dấu chấm
export const DotsContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginTop: theme.spacing(2.5), // Tăng khoảng cách lên một chút
}));

// 🚀 Style cho mỗi dấu chấm
export const Dot = styled(Box)(({ theme, delay }) => ({
  width: "10px",
  height: "10px",
  backgroundColor: theme.palette.primary.main,
  borderRadius: "50%",
  margin: "0 4px",
  animation: `${bounce} 1.4s infinite ease-in-out both`,
  animationDelay: delay,
}));
