import { styled } from "@mui/material/styles";
import {
  SkyBox,
  SkyPaper,
  SkyButton,
  SkyTypography,
  SkyTableContainer,
  SkyTable,
  SkyTableHead,
  SkyTableBody,
  SkyTableCell,
  SkyTableRow,
  SkyHiddenInput,
} from "@styles/SkyStyles";

// ==========================================
// Layout & Wrappers
// ==========================================

export const ImportPageWrapper = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  width: "100%",
}));

export const ImportStepCard = styled(SkyPaper)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  boxShadow: "none",
  width: "100%",
}));

export const ImportStepWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0),
  width: "100%",
}));

export const ImportStepRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));

export const ImportStepHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(1.5),
}));

export const ImportStepContent = styled(SkyBox)(({ theme }) => ({
  paddingLeft: theme.spacing(5),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
}));

export const StepConnectorLine = styled(SkyBox)(({ theme }) => ({
  width: "1px",
  height: "20px",
  backgroundColor: theme.palette.divider,
  marginLeft: "15px",
}));

// ==========================================
// Step Number Badge
// ==========================================

export const StepBadge = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "isActive",
})(({ theme, isActive }) => ({
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontWeight: 700,
  fontSize: "14px",
  backgroundColor: isActive
    ? theme.palette.primary.main
    : theme.palette.grey[400],
  color: "#ffffff",
}));

// ==========================================
// Step Title & Description
// ==========================================

export const StepTitle = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "isActive",
})(({ theme, isActive }) => ({
  fontWeight: isActive ? 700 : 500,
  fontSize: "14px",
  color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
  lineHeight: 1.5,
}));

export const StepDescription = styled(SkyTypography)(({ theme }) => ({
  fontSize: "12px",
  color: theme.palette.text.secondary,
}));

// ==========================================
// Buttons
// ==========================================

export const DownloadTemplateButton = styled(SkyButton)(({ theme }) => ({
  borderRadius: "6px",
  fontWeight: 600,
  fontSize: "13px",
  width:'210px',
  backgroundColor: theme.palette.primary.main,
  color: "#ffffff",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.75),
}));

export const BackButton = styled(SkyButton)(({ theme }) => ({
  borderRadius: "6px",
  fontWeight: 500,
  fontSize: "13px",
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
  backgroundColor: "transparent",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const NextButton = styled(SkyButton)(({ theme }) => ({
  borderRadius: "6px",
  fontWeight: 500,
  fontSize: "13px",
  border: `1px solid ${theme.palette.primary.main}`,
  color: theme.palette.primary.main,
  backgroundColor: "transparent",

  "&.Mui-disabled": {
    border: `1px solid ${theme.palette.action.disabledBackground}`,
    color: theme.palette.action.disabled,
    backgroundColor: "transparent",
  },
}));

export const ImportButton = styled(SkyButton)(({ theme }) => ({
  borderRadius: "6px",
  fontWeight: 500,
  fontSize: "13px",
  border: `1px solid ${theme.palette.primary.main}`,
  backgroundColor: "transparent",
  color: theme.palette.primary.main,
 
  "&.Mui-disabled": {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
  },
}));

export const ViewErrorButton = styled(SkyButton)(({ theme }) => ({
  borderRadius: "6px",
  fontWeight: 600,
  fontSize: "13px",
   
  border: `1px solid ${theme.palette.error.main}`,
  backgroundColor: "transparent",
   color: theme.palette.error.main,

}));

export const ButtonRowWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginTop: theme.spacing(0.5),
}));

// ==========================================
// File Input Area (Step 2)
// ==========================================

export const FileInputWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "6px",
  overflow: "hidden",
  width: "576px",
}));

export const FileNameDisplay = styled(SkyBox)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(0.75, 1.5),
  fontSize: "13px",
  color: theme.palette.text.secondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
}));

export const ChooseFileButton = styled("label")(({ theme }) => ({
  padding: theme.spacing(0.75, 1.5),
  backgroundColor: theme.palette.background.paper,
  borderLeft: `1px solid ${theme.palette.divider}`,
  fontSize: "13px",
  color: theme.palette.text.secondary,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const HiddenFileInput = styled(SkyHiddenInput)({});

// ==========================================
// Table (Step 3)
// ==========================================

export const ImportTableContainer = styled(SkyTableContainer)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  maxHeight: "420px",
  overflowY: "auto",
  overflowX: "auto",
}));

export const ImportTable = styled(SkyTable)(() => ({
  minWidth: 900,
  tableLayout: "fixed",
}));

export const ImportTableHead = styled(SkyTableHead)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  position: "sticky",
  top: 0,
  zIndex: 2,
}));

export const ImportTableBody = styled(SkyTableBody)(() => ({}));

export const ImportTableHeaderCell = styled(SkyTableCell, {
  shouldForwardProp: (prop) => prop !== "isStt",
})(({ theme, isStt }) => ({
  padding: theme.spacing(1, 1.5),
  fontSize: "13px",
  fontWeight: 600,
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.divider}`,
  whiteSpace: "nowrap",
  backgroundColor: theme.palette.background.paper,
  width: isStt ? 100 : 250,
  minWidth: isStt ? 100 : 250,
  maxWidth: isStt ? 100 : 250,
  "& .required-star": {
    color: theme.palette.error.main,
    marginLeft: "2px",
    fontWeight: 700,
  },
}));

export const ImportTableRow = styled(SkyTableRow)(({ theme }) => ({
  "&:nth-of-type(even)": {
    backgroundColor: theme.palette.action.hover,
  },
  "&:hover": {
    backgroundColor: theme.palette.action.selected,
  },
  backgroundColor: theme.palette.background.paper,
}));

export const ImportTableBodyCell = styled(SkyTableCell, {
  shouldForwardProp: (prop) => prop !== "isStt",
})(({ theme, isStt }) => ({
  padding: theme.spacing(1.5, 0.75),
  fontSize: "13px",
  verticalAlign: "middle",
  backgroundColor: theme.palette.background.paper,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  width: isStt ? 100 : 250,
  minWidth: isStt ? 100 : 250,
  maxWidth: isStt ? 100 : 250,
}));

export const CheckboxCell = styled(SkyTableCell)(({ theme }) => ({
  padding: theme.spacing(1.5, 0.5), // ← tăng padding dọc
  width: "40px",
   verticalAlign: "middle",
  textAlign: "center",
  backgroundColor: "#ffffff !important", // ← thêm dòng này
}));
// ==========================================
// Error Dialog Table
// ==========================================

export const ErrorTableContainer = styled(SkyTableContainer)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  maxHeight: "350px",
  overflowY: "auto",
}));

export const ErrorTable = styled(SkyTable)(() => ({
  minWidth: 400,
}));

export const ErrorTableHead = styled(SkyTableHead)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
}));

export const ErrorTableRow = styled(SkyTableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.table?.rowOdd || theme.palette.action.hover,
  },
  "&:nth-of-type(even)": {
    backgroundColor: theme.palette.table?.rowEven || theme.palette.background.paper,
  },
}));

export const ErrorTableCell = styled(SkyTableCell)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  fontSize: "13px",
  // ← xóa backgroundColor: theme.palette.background.paper
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const ErrorHeaderCell = styled(ErrorTableCell)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.background.paper
}));