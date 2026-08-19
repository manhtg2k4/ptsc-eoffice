import { styled } from "@mui/material/styles";
import { Accordion, AccordionDetails, AccordionSummary, Box, Paper, RadioGroup, Typography, Grid } from "@mui/material";
import { StyledButton } from "./CustomTable.styles";

// Định nghĩa styled component cho đường kẻ dọc
export const StyledPaper = styled(Paper)(() => ({
  padding: 8,
  display: "flex",
  flexDirection: "column",
  flex: 1,
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
}));

export const StyledTabContentBox = styled(Box)(() => ({
  padding: 16,
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  backgroundColor: "#f8fafc",
}));

export const StyledBox = styled(Box)(() => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflowY: "auto",
  gap: "16px",
}));

export const StyledFormCard = styled(Box)(({ theme }) => ({
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: theme.spacing(4),
  boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.04)",
  border: "1px solid #e2e8f0",
  marginBottom: theme.spacing(3),
}));

export const StyledCardHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  paddingBottom: theme.spacing(2),
  marginBottom: theme.spacing(3),
  borderBottom: "1px solid #f1f5f9",
  color: "#2364B0",
  "& svg": {
    flexShrink: 0,
  },
}));

export const StyledCardTitle = styled(Typography)(() => ({
  fontWeight: "bold",
  fontSize: "1.1rem",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  color: "#000",
}));

export const StyledGridContainer = styled(Grid)(() => ({
  width: "100%",
  margin: 0,
}));

export const StyledGridItemLeft = styled(Grid)(() => ({
  padding: 0,
}));

export const StyledGridItemRight = styled(Grid)(({ theme }) => ({
  padding: 0,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "flex-start",
  marginTop: theme.spacing(2),
  [theme.breakpoints.up("md")]: {
    justifyContent: "flex-end",
    paddingRight: theme.spacing(4),
    marginTop: theme.spacing(0.5),
  },
}));

export const StyledBoxInfor = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "150px 1fr",
  rowGap: "8px",
  columnGap: "16px",
  alignItems: "center",
  marginBottom: "16px",
  
  // Responsive cho mobile - hiển thị theo chiều dọc
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: "1fr", // Chỉ 1 cột
    rowGap: "4px",
  },
}));

export const StyledTypographyInfor = styled(Typography)(() => ({
  fontWeight: "normal",
  fontSize: 14,
  color: "#7e8b9b",
}));

export const StyledTypographyDetail = styled(Typography)(() => ({
  fontSize: 14,
  fontWeight: 600,
  color: "#000",
}));

export const StyledBoxDetail = styled(Box)(() => ({
  marginTop: 24,
  borderTop: "1px solid #e0e0e0",
  paddingTop: 16,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
}));

export const StyledTypographyDetailInfor = styled(Typography)(() => ({
  fontSize: "1rem",
  marginBottom: 12,
  flexShrink: 0,
}));

export const StyledBoxInforDetail = styled(Box)(() => ({
  color: "red",
}));

export const StyledBoxGroup = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  // overflowY: "auto", // Xóa bỏ overflow ở đây
  // paddingRight: 8,
  display: "flex", // Thêm flex để Box con có thể co giãn
  flexDirection: "column",
  overflow: "hidden",
}));

export const FlexColumnGrow = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
}));

export const StyledBoxSearch = styled(Box)(() => ({
  marginLeft: 24,
  width: "300px",
}));

export const StyledButtonUser = styled(StyledButton)({});

export const StyledRadioGroup = styled(RadioGroup)(({ theme }) => ({
  gap: theme.spacing(2),
  display: 'flex',
  marginLeft: theme.spacing(0.5),
  flexWrap: 'nowrap', // giữ các radio trên cùng 1 hàng
  alignItems: 'flex-start',

  // style cho FormControlLabel để không làm mỗi item chiếm cả hàng
  '& .MuiFormControlLabel-root': {
    marginRight: theme.spacing(2),
    marginBottom: 0,
    flexShrink: 1,
  },

  '& .MuiRadio-root': {
    padding: 6,
  },

  // Responsive cho mobile - hiển thị theo chiều dọc
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column', // Xếp dọc trên mobile
    alignItems: 'flex-start', // Căn trái
    gap: theme.spacing(0.5),
    '& .MuiFormControlLabel-root': {
      marginRight: theme.spacing(2),
    },
    '& .MuiFormControlLabel-label': {
      whiteSpace: 'normal', // Cho phép xuống dòng nếu cần
      maxWidth: 'none',
    },
  },
}));

// Styled Accordion cho mobile collapsible sections
export const StyledAccordion = styled(Accordion)(({ theme }) => ({
  boxShadow: 'none',
  border: '1px solid #e0e0e0',
  borderRadius: '8px !important',
  marginBottom: theme.spacing(2),
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: `0 0 ${theme.spacing(2)} 0`,
  },
}));

export const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  // backgroundColor: theme.palette.grey[50],
  borderRadius: '8px',
  minHeight: '48px !important',
  '&.Mui-expanded': {
    minHeight: '48px !important',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  '& .MuiAccordionSummary-content': {
    margin: '12px 0',
    '&.Mui-expanded': {
      margin: '12px 0',
    },
  },
  '& .MuiAccordionSummary-expandIconWrapper': {
    color: theme.palette.primary.main,
  },
}));

export const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: '1px solid #e0e0e0',
}));

// Styled Accordion với margin top cho section vai trò (mobile)
export const StyledAccordionRoleDetail = styled(Accordion)(({ theme }) => ({
  boxShadow: 'none',
  border: '1px solid #e0e0e0',
  borderRadius: '8px !important',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: `${theme.spacing(2)} 0`,
  },
}));

// Typography không có margin bottom cho accordion summary
export const StyledTypographyAccordionTitle = styled(Typography)(() => ({
  fontSize: '1rem',
  marginBottom: 0,
  flexShrink: 0,
}));

export const StyledCheckboxBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  paddingTop: theme.spacing(3),
  gap: theme.spacing(2),
}));