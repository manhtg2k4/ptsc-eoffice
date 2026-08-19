import { styled } from "@mui/material/styles";
import { Box, Typography, Grid, IconButton } from "@mui/material";
import { Download } from "@mui/icons-material";

// Typography cho tiêu đề/nhãn của khu vực download
export const DownloadLabelTypography = styled(Typography)({
  fontSize: "12px",
  fontWeight: "bold",
});

// Box bao bọc khu vực download
export const DownloadBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

// Grid chứa nội dung download (icon và text)
export const DownloadContentGrid = styled(Grid)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));

// IconButton được tùy chỉnh cho nút download
export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  border: `1px solid ${theme.palette.primary.main}`, // Sử dụng màu chủ đạo từ theme
  borderRadius: "8px",
  padding: "10px",
}));

// Icon Download được tùy chỉnh
export const StyledDownloadIcon = styled(Download)(({ theme }) => ({
  color: theme.palette.primary.main, // Sử dụng màu chủ đạo từ theme
}));

// Typography cho tên file mẫu
export const FileNameTypography = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  marginLeft: theme.spacing(1),
}));