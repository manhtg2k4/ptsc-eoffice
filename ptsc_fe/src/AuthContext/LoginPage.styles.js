import { Box, Grid, Paper, Typography, keyframes } from "@mui/material";
import { styled } from "@mui/material/styles";
import backgroundTcLogin from "@assets/imgBackground/backgroundTCLogin.png";
import { SkyBox, SkyButton, SkyTypography } from "@styles/SkyStyles";

const bit = keyframes`
  from {
    opacity: 0.3;
  }
  to {
    opacity: 1;
  }
`;

const loadingAnimation = keyframes`
  0% {
    left: 0%;
  }
  100% {
    left: 50%;
  }
`;

export const LoadingContainer = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "center", // ngang
  alignItems: "center", // dọc
  height: "100vh", // full màn hình
}));

export const LoaderWrapper = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "fullWidth",
})(({ theme, fullWidth }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(1),
  width: fullWidth ? "100%" : "300px",
}));

export const LoadingLabel = styled(SkyTypography)(() => ({
  color: "#002",
  fontSize: "18px",
  animation: `${bit} 0.6s alternate infinite`,
}));

export const LoadingBar = styled(SkyBox)(() => ({
  width: "100%",
  height: "10px",
  background: "lightgrey",
  borderRadius: "10px",
  position: "relative",
  overflow: "hidden",
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    width: "50%",
    height: "10px",
    background: "#002",
    borderRadius: "10px",
    zIndex: 1,
    animation: `${loadingAnimation} 0.6s alternate infinite`,
  },
}));

export const ErrorContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  gap: theme.spacing(2),
  textAlign: "center",
  padding: theme.spacing(3),
}));

export const ErrorText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.error.main,
  fontWeight: 600,
  fontSize: "1.1rem",
}));

export const ReloadButton = styled(SkyButton)(({ theme }) => ({
  marginTop: theme.spacing(2),
  backgroundColor: "#00529D",
  color: "#fff",
  padding: "8px 24px",
  fontWeight: 600,
  textTransform: "none",
  borderRadius: "8px",
  "&:hover": {
    backgroundColor: "#003d75",
  },
}));

export const LoginPageContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  backgroundColor: theme.palette.background.default,
}));

export const LoginFormPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  textAlign: "center",
  width: "90%", // Chiếm 90% chiều rộng trên màn hình nhỏ
  maxWidth: "400px", // Giới hạn chiều rộng tối đa trên màn hình lớn
  [theme.breakpoints.up("sm")]: {
    width: "100%", // Chiếm 100% của container cha trên màn hình lớn hơn
  },
}));

export const LoginTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  // fontSize: "clamp(1.25rem, 5vw, 2.125rem)",
  //  fontSize: "clamp(1.125rem, 3vw, 1.8125rem)",
  // [theme.breakpoints.down("md")]: {
  // 	textAlign: "center"
  // },
  // 📱 Mobile nhỏ
  fontSize: "1rem", // 16px

  // 📱 Mobile lớn / Tablet nhỏ
  [theme.breakpoints.up("sm")]: {
    fontSize: "1.125rem", // 18px
  },

  // 💻 Tablet / Laptop nhỏ
  [theme.breakpoints.up("md")]: {
    fontSize: "1.375rem", // 22px
  },

  // 💻 Laptop 1024+
  [theme.breakpoints.up("lg")]: {
    fontSize: "1.5rem", // 24px
  },

  // 🖥 Desktop lớn
  [theme.breakpoints.up("xl")]: {
    fontSize: "1.8125rem", // 29px
  },

  [theme.breakpoints.down("md")]: {
    textAlign: "center",
  },
}));

export const LoginPageContainerGrid = styled(Grid)(({ theme }) => ({
  height: "100vh",
  [theme.breakpoints.down("md")]: {
    backgroundImage: `url(${backgroundTcLogin})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
}));

export const LoginPageLeftContainer = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
    display: "none",
  },
}));

export const LoginPageRightContainer = styled(Grid)(({ theme }) => ({
  display: "flex",
  backgroundColor: theme.palette.background.paper,
  // justifyContent: "center",
  // alignItems: "center",
  padding: 100,
  paddingTop: 70,
  // padding: 70,
  [theme.breakpoints.down("lg")]: {
    padding: 50,
  },
  [theme.breakpoints.down("md")]: {
    backgroundColor: "transparent", // Làm trong suốt container để hiện ảnh nền từ cha
    padding: theme.spacing(4),
    justifyContent: "center",
    alignItems: "center",
    height: "auto", // Cho phép co lại theo nội dung trên màn hình nhỏ
    width: "100%", // Đảm bảo chiếm toàn bộ chiều rộng trên màn hình nhỏ
  },
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

export const BoxImgLogoForm = styled(Box)(() => ({
  width: "100%",
}));

export const BoxLoginForm = styled(Box)(({ theme }) => ({
  width: "100%",
  [theme.breakpoints.down("md")]: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(4),
    borderRadius: theme.shape.borderRadius,
    maxWidth: "500px",
    boxShadow: theme.shadows[10],
    margin: theme.spacing(2),
  },
}));

export const SubTitleLogin = styled(Typography)(({ theme }) => ({
  // color: theme.palette.text.secondary,
  color: "#919191",
  marginBottom: theme.spacing(5),
  fontSize: "clamp(0.75rem, 2.5vw, 0.875rem)",
  [theme.breakpoints.down("md")]: {
    textAlign: "center",
    marginBottom: theme.spacing(3),
  },
}));

export const StyledContainerLogoLogin = styled(Grid)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "nowrap", // Ngăn các logo xuống dòng
  gap: theme.spacing(2), // Tạo khoảng cách giữa 2 logo
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
    textAlign: "center",
  },
}));

export const GridContainerLogoLeft = styled(Grid)({
  maxWidth: "fit-content !important",
}); // Để Grid tự quản lý kích thước

export const GridContainerLogoRight = styled(Grid)({
  minWidth: "fit-content",
});

// export const StyleLogoTCLogin = styled(Box)(() => ({
//   width: "100%",
//   height: "auto", // Giữ đúng tỷ lệ ảnh
//   objectFit: "contain",
//   display: "block",
//   maxHeight: "6rem", // Giới hạn chiều cao tối đa
// }));
export const StyleLogoTCLogin = styled(Box)(() => ({
  width: "auto",
  height: "clamp(2.5rem, 6vw, 4.5rem)",
  objectFit: "contain",
  display: "block",
}));

export const StyleNameLogoTCLogin = styled(Box)(() => ({
  width: "100%", // Luôn lấp đầy container
  height: "auto", // Giữ đúng tỷ lệ ảnh
  objectFit: "contain",
  display: "block",
  maxHeight: "3.25rem", // Giới hạn chiều cao tối đa
}));

// export const LogoTextContainer = styled(Box)(() => ({
//   display: "flex",
//   flexDirection: "column",
//   justifyContent: "center",
// }));

// // export const LogoTextPrimary = styled(Typography)(({ theme }) => ({
// //   fontWeight: 700,
// //   fontSize: "1rem",
// //   lineHeight: 1.3,
// //   textTransform: "uppercase",
// //   color: theme.palette.text.primary,
// // }));

// export const LogoTextPrimary = styled(Typography)(({ theme }) => ({
//   fontWeight: 700,
//   textTransform: "uppercase",
//   lineHeight: 1.25,
//   fontSize: "clamp(0.85rem, 1.2vw, 1rem)",
//   color: theme.palette.text.primary,
//   whiteSpace: "nowrap",
// }));

// // export const LogoTextSecondary = styled(Typography)(({ theme }) => ({
// //   fontWeight: 500,
// //   fontSize: "0.85rem",
// //   lineHeight: 1.2,
// //   textTransform: "uppercase",
// //   color: theme.palette.text.secondary,
// // }));

// 	export const LogoTextSecondary = styled(Typography)(({ theme }) => ({
// 		fontWeight: 500,
// 		textTransform: "uppercase",
// 		lineHeight: 1.2,
// 		fontSize: "clamp(0.7rem, 1vw, 0.85rem)",
// 		letterSpacing: "0.05em",
// 		color: theme.palette.text.secondary,
// 		whiteSpace: "nowrap",
// 	}));

export const LogoTextContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexDirection: "column",
  justifyContent: "center",
  [theme.breakpoints.up("md")]: {
    width: "fit-content",
  },
}));

// Dòng text trên
export const LogoTextPrimary = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  textTransform: "uppercase",
  lineHeight: 1.2,
  // fontSize: "clamp(0.8rem, 2.8vw, 1.1rem)",  // Giảm từ 0.9rem → 0.8rem, max 1.3rem
  color: "#00529D",
  whiteSpace: "normal",
  wordBreak: "break-word",
  // 📱 Mobile
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.55rem",
    // fontSize: "0.75rem",
  },

  // 💻 Tablet + laptop nhỏ (≤1024)
  [theme.breakpoints.between("sm", "lg")]: {
    fontSize: "0.9rem",
  },

  // 🖥 Desktop lớn
  [theme.breakpoints.up("lg")]: {
    fontSize: "clamp(0.8rem, 2.8vw, 0.95rem)",
    // fontSize: "clamp(0.8rem, 2.8vw, 1.1rem)",
  },
}));

// Dòng dưới: SAIGON NEWPORT CORPORATION
export const LogoTextSecondary = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  textTransform: "uppercase",
  lineHeight: 1.2,
  // fontSize: "clamp(0.65rem, 2.2vw, 0.8rem)",   // Giảm từ 0.75rem → 0.65rem, max 1rem
  letterSpacing: "0.1em",
  color: "#0066aa",
  whiteSpace: "normal",
  wordBreak: "break-word",
  // 📱 Mobile
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.45rem",
    letterSpacing: "0.08em",
    textAlign: "center",
  },

  // 💻 Tablet + laptop nhỏ (≤1024)
  [theme.breakpoints.between("sm", "lg")]: {
    // fontSize: "0.65rem",
    fontSize: "0.75rem",
  },

  // 🖥 Desktop lớn
  [theme.breakpoints.up("lg")]: {
    fontSize: "clamp(0.65rem, 2.2vw, 0.75rem)",
  },
}));
