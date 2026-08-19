import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * Container chính cho một trang, chiếm toàn bộ chiều cao viewport.
 * @param {object} { theme }
 */
export const PageContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,

  height: "100%", // Thay đổi thành 100% để co giãn theo cha
  overflow: "hidden", // chặn scroll toàn màn hình
  display: "flex",
  flexDirection: "column",
}));

/**
 * Container có thanh cuộn tùy chỉnh.
 * Thường được sử dụng cho khu vực chứa bảng hoặc nội dung cần cuộn.
 * @param {object} { theme }
 */
export const ScrollTableContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: "auto",
  position: "relative",

  // Custom scrollbar - centralized style
  "&::-webkit-scrollbar": {
    width: "8px",
    height: "8px",
  },
  "&::-webkit-scrollbar-track": {
    background: "transparent", // ẩn nền track
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(100, 100, 100, 0.1)",
    borderRadius: "4px",
    transition: "background-color 0.3s",
  },
  "&:hover::-webkit-scrollbar-thumb": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.3)"
        : "rgba(100, 100, 100, 0.4)",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.5)"
        : "rgba(100, 100, 100, 0.6)",
  },
}));
