import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

export const LayoutContainer = styled(Box)({
  display: "flex",
  height: "100%",
});

export const ContentContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isOpen" && prop !== "customStyle",
})(({ theme, isOpen, customStyle }) => ({
  display: "flex",
  flexDirection: "column",
  marginTop: "60px",
  flexGrow: 1,
  transition: "margin 0.3s ease",
  backgroundColor: theme.palette.mode === "dark" ? "#303940" : "#e8edf1",
  color: customStyle?.color || theme.palette.text.primary,
  minHeight: "calc(100vh - 60px)", 
  overflowX: "hidden",
  width: "100%",
  padding: theme.spacing(2), // ✅ Thêm padding để tạo khoảng cách
  paddingBottom: 0,
  [theme.breakpoints.up("md")]: {
    marginLeft: isOpen ? "0px" : "0", // Khi sidebar đóng, không có margin trái
    width: "100%", // Luôn chiếm 100% chiều rộng còn lại
  },
  [theme.breakpoints.down("md")]: {
    width: "100%",
    padding: theme.spacing(1.5), // Padding nhỏ hơn trên mobile
  },
}));

export const PageContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$overflow",
})(({ theme, $overflow }) => ({
  position: "relative", // ✅ Thêm để loading tuyệt đối có thể đè lên
  flexGrow: 1,
  overflow: $overflow || "hidden",
  // backgroundColor: theme.palette.background.paper, // ✅ Đổi sang background.paper để nổi lên
  backgroundColor: 'transparent !important',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: theme.shape.borderRadius * 0.5, // ✅ Bo tròn góc
  // boxShadow: theme.shadows[3], // ✅ Thêm shadow để tạo hiệu ứng nổi
  paddingBottom: 0,
  // padding: "16px 0", // ✅ Padding bên trong
  [theme.breakpoints.down("md")]: {
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
    padding: theme.spacing(1.5),
  },
}));