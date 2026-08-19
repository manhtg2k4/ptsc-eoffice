import { styled } from "@mui/material/styles";
import {
  Box,
  Typography,
  TableCell,
  TableContainer,
  TableRow,
  Button,
  IconButton,
  Divider,
  Checkbox,
  SvgIcon,
  TableHead,
  AppBar,
  Button as MuiButton,
  CircularProgress,
  Stack,
  Backdrop,
  Chip,
} from "@mui/material";
import {
  CloudDownload,
  Delete,
  RemoveRedEye,
  Scanner,
  Visibility,
  Close as CloseIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CheckCircle as CheckCircleIcon,
  AttachFile,
  SaveAlt,
} from "@mui/icons-material";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import { SkyBox } from "@styles/SkyStyles";
import DriveFileRenameOutlineOutlinedIcon from "@mui/icons-material/DriveFileRenameOutlineOutlined";
import { StyledActionButton as CustomStyledActionButton } from "@styles/CustomButtonBorder.styles";

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
export const BoxContained = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-start",
  marginBottom: theme.spacing(2),
}));

export const StyledEmptyText = styled(Typography)(({ theme }) => ({
  //   textAlign: "center",
  marginTop: theme.spacing(2),
  color: theme.palette.text.secondary,
}));

export const UploadLabel = styled(Typography)(({ theme, isSecondary }) => ({
  fontWeight: isSecondary ? "700" : "bold",
  fontSize: isSecondary ? "14px" : "15px",
  color: theme.palette.mode === "dark" ? "#fff" : "#000",
  textTransform: isSecondary ? "uppercase" : "none",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

export const StyledCountBadge = styled(Box)(({ theme }) => ({
  backgroundColor: "#ECECEC",
  borderRadius: "4px",
  padding: "2px 10px",
  fontSize: "12px",
  color: "#666",
  fontWeight: "600",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: theme.spacing(1.5),
}));

export const StyledSecondaryLabelBox = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
}));

export const StyledSecondaryHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: theme.spacing(1, 0),
  flexWrap: "wrap",
  gap: theme.spacing(1),
}));

export const UploadHeader = styled(Box)(( ) => ({
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  width: "100%",
 }));

export const IconRequied = styled(Box)(({ theme }) => ({
  // marginLeft: 0.5,
  // color: "error",
  marginLeft: theme.spacing(0.5), // px
  color: theme.palette.error.main,
}));

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

export const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  overflow: "hidden",
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1.5),
  fontSize: "0.875rem",
}));

export const StyledTableHeadCell = styled(StyledTableCell)(({ theme }) => ({
  fontWeight: 600,
  backgroundColor:
    theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
    theme.palette.background.paper,
  color: theme.palette.text.primary,
  textAlign: "center",
}));

export const StyledActionButton = styled(Button)(({ theme }) => ({
  minWidth: 64,
  textTransform: "none",
  borderRadius: theme.shape.borderRadius,
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const StyledIconView = styled(Visibility)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontSize: "1.5rem",
}));
 
export const StyledIconDown = styled(SaveAlt)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontSize: "1.5rem",
}));

export const UploadedFilePreview = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  backgroundColor:'#eeeeee87',
  borderRadius: theme.shape.borderRadius,
  // maxWidth: "calc(100% - 100px)", // Để tránh tràn layout
  width: '100%',
}));

export const StyleAttachFile = styled(AttachFile)(({theme}) => ({
  fontSize: "1.5rem",
  color: theme.palette.primary.main,
}));

export const FileName = styled(Typography)(({ theme }) => ({
  flexGrow: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: "0.875rem",
  color: theme.palette.text.secondary,
}));

export const FileActions = styled(Box)({
  display: "flex",
  alignItems: "center",
});

export const CoordRowContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
});

export const CoordRowLabel = styled(Typography)({
  width: 80,
  fontWeight: 500,
});

export const CoordTypeInputWrapper = styled(Box)({
  width: 230,
});

export const CoordXInputWrapper = styled(Box)({
  width: 90,
});

export const CoordYInputWrapper = styled(Box)({
  width: 90,
});

export const CoordFontInputWrapper = styled(Box)({
  width: 90,
});

export const CoordSelectButton = styled(IconButton)({
  padding: 8,
});

export const CoordSelectIcon = styled(CenterFocusStrongIcon)({
  fontSize: 20,
});

export const StyledTitlePopup = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary || "primary",
  variant: "subtitle1",
  fontWeight: "bold",
}));

export const StyledDivider = styled(Divider)(({ theme }) => ({
  // color: theme.palette.text.secondary,
  margin: theme.spacing(0, 3),
}));
export const StyledCheckbox = styled(Checkbox)(({ styleColor }) => ({
  color: styleColor,
}));
export const StyledBox = styled(Box)(() => ({
  display: "flex",
  flexWrap: "wrap",
  gap: 3,
}));

export const StyledTableContainerGiveNumber = styled(TableContainer)(
  ({ theme }) => ({
    marginTop: theme.spacing(1),
    borderRadius: "8px",
    border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e0e4ef"}`,
    overflow: "auto",
  })
);

export const StyledTableHeadGiveNumber = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "light" ? "#fafafa" : "#424242",
}));

export const StyledColumnSttTableHeaderCellGiveNumber = styled(TableCell)(
  ({ theme, styleAlignItems, styleWidth, styleMinWidth }) => ({
    fontWeight: 600,
    fontSize: "0.875rem",
    padding: theme.spacing(1.25, 2),
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    alignItems: styleAlignItems,
    width: styleWidth,
    minWidth: styleMinWidth,
    backgroundColor: theme.palette.mode === "light" ? "#f8f9fa" : "#334155",
    textAlign: "center",
  })
);
export const StyledTableHeaderCellGiveNumber = styled(TableCell)(
  ({ theme, styleAlignItems, styleWidth }) => ({
    fontWeight: 600,
    fontSize: "0.875rem",
    padding: theme.spacing(1.25, 2),
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    alignItems: styleAlignItems,
    width: styleWidth,
    backgroundColor: theme.palette.mode === "light" ? "#f8f9fa" : "#334155",
  })
);

export const StyledTableHeaderCellAction = styled(TableCell)(
  ({ theme, styleAlignItems, styleWidth }) => ({
    fontWeight: 600,
    fontSize: "0.875rem",
    padding: theme.spacing(1.25, 2),
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    alignItems: styleAlignItems,
    width: styleWidth,
    textAlign: "center",
    backgroundColor: theme.palette.mode === "light" ? "#f8f9fa" : "#334155",
  })
);

export const IconDelete = styled(Delete)(() => ({
  color: "red",
}));

export const StyledTableCellGiveNumber = styled(TableCell)(
  ({ theme, styleWidth, styleMinWidth, styleFontWeight, styleTextAlign }) => ({
    padding: theme.spacing(1, 2),
    fontSize: "0.875rem",
    color: theme.palette.text.primary,
    width: styleWidth,
    minWidth: styleMinWidth,
    fontWeight: styleFontWeight,
    textAlign: styleTextAlign,
  })
);

export const StyledTableCellActionGiveNumber = styled(TableCell)(
  ({ theme, styleWidth, styleMinWidth, styleFontWeight, styleTextAlign }) => ({
    fontSize: "0.875rem",
    color: theme.palette.text.primary,
    width: styleWidth,
    minWidth: styleMinWidth,
    fontWeight: styleFontWeight,
    textAlign: styleTextAlign,
    padding: 0,
  })
);

export const StyledTableRowGiveNumber = styled(TableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor: theme.palette.mode === "light" ? "#fafafa" : "#424242",
  },
  "&:last-child td": {
    borderBottom: 1,
  },
}));

export const StyledTableRowBodyGiveNumber = styled(TableRow)(({ theme }) => ({
  height: "44px",
  minHeight: "44px",
  backgroundColor: theme.palette.background.paper,
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.background.paper,
  },
  "&:hover": {
    backgroundColor: theme.palette.mode === "light" ? "#fafafa" : "#424242",
  },
  "& td, & th": {
    borderBottom: `1px solid ${theme.palette.mode === "light" ? "#e0e0e0" : "#444444"
      }`,
  },
}));

export const ActionCellBoxGiveNumber = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(0.5),
  justifyContent: "center",
  alignItems: "center",
  padding: 0,
}));

export const StyledIconButtonGiveNumber = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main || "inherit",
}));

export const StyledRemoveRedEyeGiveNumber = styled(RemoveRedEye)(() => ({
  // fontSize: "small"
}));
export const StyledCloudDownloadGiveNumber = styled(CloudDownload)(() => ({
  // fontSize: "small"
}));

export const FileNameCellGiveNumber = styled(StyledTableCellGiveNumber)(
  ({ theme }) => ({
    maxWidth: "300px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    cursor: "pointer",
    color: theme.palette.primary.main,
    borderBottom: `1px solid ${theme.palette.divider}`,
    "&:hover": {
      textDecoration: "none",
    },
  })
);

export const StyledButtonGiveNumber = styled(Button)(({ theme }) => ({
  color: theme.palette.primary.contrastText,
  backgroundColor: theme.palette.primary.main,
}));

export const StyledCloseIcon = styled(CloseIcon)(({ theme }) => ({
  color: theme.palette.dialog?.headerColor || "#ffffff",
  fontSize: 26,
}));

// Styled Zoom Icons
export const StyledZoomInIcon = styled(ZoomInIcon)(({ theme }) => ({
  color: theme.palette.dialog?.headerColor || "#ffffff",
}));

export const StyledZoomOutIcon = styled(ZoomOutIcon)(({ theme }) => ({
  color: theme.palette.dialog?.headerColor || "#ffffff",
}));

export const StyledDownloadIcon = styled(DownloadIcon)(({ theme }) => ({
  color: theme.palette.dialog?.headerColor || "#ffffff",
}));

// Styled components
export const StyledDialogContentBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
});

export const StyledContentArea = styled(Box)({
  flex: 1,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "auto",
  backgroundColor: "#f5f5f5", // Thêm màu nền nhẹ để dễ nhìn biên file
});

export const StyledImage = styled("img")(({ zoomlevel }) => ({
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  transform: `scale(${zoomlevel / 100})`,
  transition: "transform 0.2s ease",
  cursor: "zoom-in",
}));

export const StyledIframe = styled("iframe")({
  width: "100%",
  height: "100%",
  border: "none",
  minHeight: "600px",
  backgroundColor: "#ffffff", // Iframe nền trắng cho dễ đọc text/excel
});

// --- THÊM STYLED VIDEO ---
export const StyledVideo = styled("video")({
  maxWidth: "100%",
  maxHeight: "100%",
  outline: "none",
});

export const StyledTitleBox = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

export const StyledTypographyTitle = styled(Typography)(({ theme }) => ({
  flex: 1,
  color: theme.palette.dialog?.headerColor || "#ffffff",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  marginRight: theme.spacing(2),
}));

export const StyledActionIcons = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
}));

export const StyledLoadingBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
});

export const StyledZoomLabel = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  paddingLeft: "8px",
  paddingRight: "8px",
  minWidth: "50px",
  color: theme.palette.dialog?.headerColor || "#ffffff",
}));

export const StyledErrorBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
  textAlign: "center",
});

export const StyledPreviewAppBar = styled(AppBar)({
  position: "relative",
  backgroundColor: "#333",
});

export const StyledDialogTitle = styled(Typography)(({ theme }) => ({
  marginLeft: "16px",
  flex: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "block",
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.95rem",
  },
}));

export const PreviewContainer = styled(Box)({
  flex: 1,
  backgroundColor: "#525659",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  padding: "20px",
  overflow: "hidden",
});

export const PreviewContentBox = styled(Box)({
  width: "100%",
  height: "100%",
  minWidth: "600px",
  backgroundColor: "#fff",
  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
});

export const StyledCancelButton = styled(MuiButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
  color: "inherit",
  borderColor: "currentColor",
}));

export const StyledSaveButton = styled(MuiButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const StyledSaveButtonReLoad = styled(MuiButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
  marginRight: theme.spacing(1),
}));

export const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  color: "#fff",
  zIndex: theme.zIndex.modal + 1,
}));

export const StyledLoadingStack = styled(Stack)(({ theme }) => ({
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(2),
}));

export const StyledCircularProgress = styled(CircularProgress)(() => ({
  color: "inherit",
}));

// Chip hiển thị trạng thái đã ký
export const SignedChip = styled(Chip)(() => ({
  height: 20,
  fontSize: 11,
  backgroundColor: "#4caf50",
  color: "#fff",
  "& .MuiChip-icon": {
    fontSize: 14,
    color: "#fff",
  },
  "& .MuiChip-label": {
    paddingLeft: 4,
    paddingRight: 8,
  },
}));

// Icon cho chip đã ký
export const SignedCheckIcon = styled(CheckCircleIcon)(() => ({
  fontSize: 14,
}));

// Container cho tên file + badge
export const FileNameWrapper = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
}));

export const StyledHeaderTitleStack = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const StyledDownloadAllButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
  color: theme.palette.primary.main,
}));

export const StyledCloudDownloadIcon = styled(CloudDownload)(() => ({
  fontSize: 24,
}));

export const StyledContainerUploadLabel = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 1,
  justifyContent: "space-between",
  flex: 1,
  flexWrap: "wrap",
}));

export const StyledIconKeyboardArrow = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
  color: theme.palette.primary.main,
  flexShrink: 0,
  [theme.breakpoints.down("sm")]: {
    order: 1,
  },
  [theme.breakpoints.up("sm")]: {
    order: 3,
  },
}));

export const StyledSignaturePhoto = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  color: theme.palette.text.secondary,
}));

export const StyledContainerPopupSignDigital = styled(Box)(() => ({
  position: "relative",
}));

export const StyledLoadingPopupSignDigital = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.mode === "light" ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.5)',
  zIndex: theme.zIndex.modal + 1,
  borderRadius: 1,
}));

export const Skyboxv1 = styled(SkyBox)({
  width: "100%",
  height: "100%",
});

export const EditStyled = styled(Skyboxv1)({
  overflow: "hidden",
});

export const BatchSignContainer = styled(SkyBox)(({ theme, showLabel }) => ({
  // marginTop: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  flexWrap: "wrap",
  gap: theme.spacing(1),
  marginLeft: showLabel ? theme.spacing(2) : 0
}));
export const StyledContainerButtons = styled(SkyBox)(({ theme, buttonAlign }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
  display: "flex",
  justifyContent: buttonAlign === "right" ? "flex-end" : "flex-start",
}));

export const StyledButtonText = styled(Box)(({ theme }) => ({
  [theme.breakpoints.down("lg")]: {
    display: "none",
  },
  display: "inline",
}));

export const StyledDocumentIcon = styled(Box)(({ theme }) => ({
  color: theme.palette.primary.main,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

export const StyledStackActions = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: theme.spacing(1),
  flexWrap: "nowrap",
}));

export const SectionHeaderSecondary = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  padding: theme.spacing(1, 0),
}));

export const SectionTitleSecondary = styled(Typography)(({ theme, hasIcon }) => ({
  textTransform: 'uppercase',
  fontSize: '14px',
  fontWeight: 700,
  marginLeft: hasIcon ? theme.spacing(1) : 0,
}));

export const StyleDriveFileRenameOutlineOutlinedIcon = styled(DriveFileRenameOutlineOutlinedIcon)(({ theme }) => ({
  color: theme.palette.primary.main
}));

export const TabsHeaderContainer = styled(Box)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}));

export const TabsWrapper = styled(Box)(() => ({
  flexGrow: 1,
}));

export const BatchSignButtonWrapper = styled(Box)(({ theme }) => ({
  marginRight: theme.spacing(1.25),
  marginBottom: theme.spacing(0.5),
}));

export const StyledSecondaryActionButton = styled(CustomStyledActionButton)(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    flex: "1 1 calc(50% - 4px) !important",
    minWidth: "0px !important",
    fontSize: "12px !important",
    padding: "0 8px !important",
  },
  [theme.breakpoints.up("sm")]: {
    flex: "0 1 auto !important",
    minWidth: "120px !important",
    fontSize: "14px !important",
    padding: "0 16px !important",
  },
}));

export const StyledSecondaryActionStack = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  gap: theme.spacing(1),
  flexWrap: "wrap",
  [theme.breakpoints.down("sm")]: {
    width: "100%",
    order: 2,
    marginTop: theme.spacing(1),
  },
  [theme.breakpoints.up("sm")]: {
    width: "auto",
    order: 2,
    marginTop: 0,
  },
}));

export const StyledBulkDeleteIconButton = styled(IconButton)(() => ({
  padding: '4px 8px', 
  border: '1px solid #d32f2f', 
  color: '#d32f2f', 
  borderRadius: '4px',
  height: '32px'
}));

export const StyledBulkDeleteIcon = styled(Delete)(() => ({
  fontSize: '20px'
}));
