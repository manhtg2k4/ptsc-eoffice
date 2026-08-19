import { CloudUpload } from "@mui/icons-material";
import {
  Grid,
  Box,
  Card,
  IconButton,
  Divider,
  Avatar,
  styled,
  Radio,
  Typography,
  Button,
} from "@mui/material";
import { SkyBox } from "@styles/SkyStyles";

// Card
export const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: 16, // tương đương mb:2
  // Ensure internal grid items stack on small screens
  [theme.breakpoints.down("sm")]: {
    "& .MuiGrid-root.MuiGrid-item, & .MuiGrid-grid-xs-6, & .MuiGrid-grid-sm-6, & .MuiGrid-grid-md-6, & .MuiGrid-grid-lg-6":
      {
        flexBasis: "100% !important",
        maxWidth: "100% !important",
      },
    "& .MuiFormControl-root, & .MuiTextField-root, & .MuiOutlinedInput-root": {
      width: "100% !important",
    },
  },
  "@media (max-width:650px)": {
    "& .MuiGrid-root.MuiGrid-item, & .MuiGrid-grid-xs-6, & .MuiGrid-grid-sm-6, & .MuiGrid-grid-md-6, & .MuiGrid-grid-lg-6":
      {
        flexBasis: "100% !important",
        maxWidth: "100% !important",
      },
    "& .MuiFormControl-root, & .MuiTextField-root, & .MuiOutlinedInput-root": {
      width: "100% !important",
    },
  },
}));

// Grid header toggle
export const StyledHeaderGrid = styled(Grid)({
  cursor: "pointer",
  paddingBottom: 8, // tương đương pb:1
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const StyledGrid = styled(Grid)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  // Make grid items stack on small screens and force inputs to full width
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "stretch",
    "& .MuiFormControl-root, & .MuiInputBase-root, & .MuiTextField-root, & .MuiOutlinedInput-root, & .MuiInput-root":
      {
        width: "100%",
      },
    "& .MuiGrid-item": {
      width: "100%",
    },
  },
  // Extend slightly above the default MUI breakpoint to cover up to 650px
  "@media (max-width:650px)": {
    flexDirection: "column",
    alignItems: "stretch",
    "& .MuiFormControl-root, & .MuiInputBase-root, & .MuiTextField-root, & .MuiOutlinedInput-root, & .MuiInput-root":
      {
        width: "100%",
      },
  },
}));

export const HeaderTypography = styled(Typography)(({ styleMarginBottom }) => ({
	fontWeight: "bold",
	marginBottom: styleMarginBottom || null,
}));

export const HeaderColorTypography = styled(Typography)({
  color: "gray",
});

export const StyledTypography = styled(Typography)({
  color: "error",
  fontWeight: "bold",
  fontSize: 14,
});

export const StyledErrorTypography = styled(Typography)({
  color: "error",
});

export const StyledRuleTypography = styled(Typography)({
  fontSize: 14,
});

export const StyledCloudUploadIcon = styled(CloudUpload)(({ theme }) => ({
  fontSize: theme.typography.pxToRem(18), // tương đương fontSize="small"
}));

export const StyledRadio = styled(Radio)({
  color: "primary",
});

export const StyledRadioColor = styled(Radio)({
  color: "default",
});

// IconButton với rotate
export const RotatableIconButton = styled(IconButton)(({ open }) => ({
  transition: "transform 0.3s",
  transform: open ? "rotate(180deg)" : "rotate(0deg)",
}));

// Divider
export const StyledDivider = styled(Divider)({
  marginBottom: 32, // mb:4
});

// Collapse Grid container
export const StyledGridContainer = styled(Grid)(({ theme }) => ({
  // Use gap instead of spacing so children collapse naturally on small screens
  display: "flex",
  flexDirection: "row",
  gap: theme.spacing(2),
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    gap: theme.spacing(1),
  },
  "@media (max-width:650px)": {
    flexDirection: "column",
    gap: theme.spacing(1),
  },
}));

// Avatar container
export const AvatarWrapper = styled(Box)(({ theme }) => ({
  width: 150,
  height: 150,
  borderRadius: "50%",
  backgroundColor: "#f0f0f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  [theme.breakpoints.down("sm")]: {
    width: 110,
    height: 110,
  },
  "@media (max-width:650px)": {
    width: 110,
    height: 110,
  },
}));

// Avatar

export const AvatarContainer = styled(Box)(({ theme }) => ({
  width: 150,
  height: 150,
  borderRadius: "50%",
  backgroundColor: "#f0f0f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  [theme.breakpoints.down("sm")]: {
    width: 110,
    height: 110,
  },
  "@media (max-width:650px)": {
    width: 110,
    height: 110,
  },
}));

// Avatar ảnh
export const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 120,
  height: 120,
  backgroundColor: "#ddd",
  [theme.breakpoints.down("sm")]: {
    width: 90,
    height: 90,
  },
  "@media (max-width:650px)": {
    width: 90,
    height: 90,
  },
}));

// Nút Upload
export const UploadButton = styled(IconButton)({
  position: "absolute",
  bottom: 8,
  left: 8,
  backgroundColor: "#fff",
  borderRadius: "50%",
  boxShadow: 2,
});

export const BoxContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

export const SignatureWrapperBox = styled(SkyBox)(({ theme }) => ({
  position: "relative",
  display: "inline-block",
  padding: theme.spacing(1),
}));

export const SignatureImageBox = styled(SkyBox)({
  width: 120,
  height: 120,
  border: "1px dashed #ccc",
  backgroundColor: "#f9f9f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const BoxViewContainer = styled(Box)({
  position: "fixed",
  bottom: 0,
  left: 0,
  width: "100%",
  backgroundColor: "background.paper", // Sửa lỗi màu nền ở chế độ tối
  boxShadow: "0 -2px 5px rgba(0,0,0,0.1)",
  padding: "10px 20px",
  display: "flex",
  justifyContent: "center",
  gap: 2,
  zIndex: 1111, // Tăng zIndex để đảm bảo nó hiển thị trên footer
});

export const ActionContainer = styled(Box)(({ theme }) => ({
  position: "center",
  marginTop: "20px",
  display: "flex",
  justifyContent: "center",
  gap: theme.spacing(2),
}));

export const ButtonClick = styled(Button)({
  color: "primary",
});

export const ButtonClickColor = styled(Button)({
  color: "primary",
});

export const ContentUserContainer = styled("div")(({ theme, isStandalonePage }) => ({
  margin: isStandalonePage ? theme.spacing(0) : theme.spacing(2.5),
  paddingRight: theme.spacing(1.25),
	maxHeight: isStandalonePage ? "calc(100vh - 100px)" : "calc(100vh - 150px)",
	overflowY: "auto",
}));