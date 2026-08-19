import {
  Box,
  Button,
  Grid,
  SvgIcon,
  Typography,
  IconButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Scanner,
  RemoveRedEyeOutlined as ViewIcon,
  // UploadFile as UploadFileIcon,
  GetApp as DownloadIcon,
  WarningAmber,
} from "@mui/icons-material";

// ============================
// Container & Layout
// ============================
export const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

export const FullWidthGridItem = styled(Grid)({
  width: "100%",
});

export const GridItem = styled(Grid)({});

export const FormGridItem = styled(GridItem)({
  flexBasis: "20%",
  maxWidth: "20%",
});

export const UploadSection = styled(Grid)(({ theme, noneMarginTop }) => ({
  marginTop: noneMarginTop ? 0 : theme.spacing(1.5), // Giảm thêm khoảng cách trên
}));

export const SectionTitle = styled(Typography)(({ theme }) => ({
  marginRight: theme.spacing(1.25), // 10px
  fontSize: "14px",
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.text.primary,
}));

export const SectionTitleV2 = styled(Typography)(({ theme }) => ({
  marginRight: theme.spacing(1.25),
  marginBottom: theme.spacing(1.25),
  fontWeight: "bold",
  fontSize: "15px",
  // color: theme.palette.text.primary,
  color: theme.palette.mode === "dark" ? "#fff" : "#000",
}));

export const IconLabel = styled("label")(({ theme }) => ({
  display: "inline-block",
  marginRight: theme.spacing(1.25), // 10px
}));

// ============================
// Icons
// ============================

// Upload icon custom: đám mây xanh, mũi tên trắng
const CloudUploadCustom = (props) => (
  <SvgIcon {...props} viewBox="0 0 32 27">
    {/* Đám mây */}
    <path
      d="M22.35 10.04C21.67 6.59 18.64 4 15 4a8 8 0 0 0-8 8c0 .46.05.91.13 1.34C3.62 14.09 2 16.03 2 18.5 2 21.54 4.46 24 7.5 24h17c3.21 0 5-1.79 5-5 0-2.09-1.62-3.8-3.65-3.96z"
      fill="currentColor"
    />
    {/* Mũi tên upload */}
    <path d="M17 14v4h-4v-4H10l5-5 5 5h-3z" fill="#fff" />
  </SvgIcon>
);

export const UploadIcon = styled(CloudUploadCustom)(({ theme }) => ({
  fontSize: theme.typography.pxToRem(32),
  cursor: "pointer",
  color:
    theme.palette.mode === "dark"
      ? theme.palette.primary.light // màu xanh nhạt khi dark
      : theme.palette.primary.main, // màu xanh khi light
  transition: "color 0.3s ease",
  "&:hover": {
    color:
      theme.palette.mode === "dark"
        ? theme.palette.primary.main
        : theme.palette.primary.dark,
  },
}));

// Scan icon
export const ScanIcon = styled(Scanner)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.primary.main, // #007bff
  fontSize: theme.typography.pxToRem(32),
  cursor: "pointer",
}));

// Warning icon
export const WarningIcon = styled(WarningAmber)(({ theme }) => ({
  color: theme.palette.warning.main,
}));

export const WarningContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const WarningText = styled(Box)(({ theme }) => ({
  color: theme.palette.error.main,
  fontSize: theme.typography.pxToRem(14),
}));

// ============================
// Sections & Actions
// ============================

export const SelectionContainer = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

export const ActionBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(1),
}));

export const SectionHeader = styled(Box)({
  display: "flex",
  alignItems: "center",
});

export const SectionHeaderV2 = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 1,
  justifyContent: "space-between",
});

export const ActionContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  width: "100%",
  minWidth: 0,
  gap: theme.spacing(1),
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  [theme.breakpoints.up("sm")]: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
}));

export const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  height:
    theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || "40px",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const SectionGrid = styled(Grid)(({ theme, noneMarginTop }) => ({
  marginTop: noneMarginTop ? 0 : theme.spacing(1.5), // Giảm thêm khoảng cách trên
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(1),
}));

export const ButtonContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(1),
}));

export const ProcessorGrid = styled(Grid)({
  alignItems: "center",
});

export const JobProfileTableContainer = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const ClearAllButton = styled(IconButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  color: theme.palette.text.secondary,
  "&:hover": {
    color: theme.palette.text.primary,
  },
  "& .MuiSvgIcon-root": {
    // Nhắm vào icon bên trong
    fontSize: theme.typography.pxToRem(20), // Tương đương fontSize="small"
  },
}));

export const StyledViewIcon = styled(ViewIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const StyledActionIconButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const StyledDownloadIcon = styled(DownloadIcon)(({ theme }) => ({
  color: theme.palette.success.main,
}));

export const SignTypeCheckboxGroupContainer = styled(FormContainer)(({ theme }) => ({
	paddingTop: "unset",
	paddingLeft: theme.spacing(0.125), //1px
}));
