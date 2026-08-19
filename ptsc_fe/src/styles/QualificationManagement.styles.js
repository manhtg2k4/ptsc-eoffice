import {
  Box,
  Button,
  TextField,
  IconButton,
  Chip,
  Select,
  FormControl,
  Tabs,
  Avatar,
  Badge,
  Pagination,
  TableRow,
  Menu,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { PageContainer, ScrollTableContainer } from "./Common.styles";
import WarningIcon from '@mui/icons-material/Warning';


export const TopBar = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(1.5, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}));

export const Title = styled("h2")(({ theme }) => ({
  margin: 0,
  fontSize: theme.typography.h6.fontSize,
  fontWeight: theme.typography.h6.fontWeight,
  color: theme.palette.text.primary,
}));

export const UserSection = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

export const HeaderCustomTab = styled(Box)(({ theme, styledPaddingLeft }) => ({
	// paddingTop: theme.spacing(1.25),
	// paddingBottom: theme.spacing(1.5),
	paddingLeft: styledPaddingLeft ? theme.spacing(styledPaddingLeft) : "unset",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
	paddingBottom: theme.spacing(1.5),
}));

export const Header = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  // boxShadow: theme.shadows[1],
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: `1px solid ${theme.palette.divider}`,
  // marginBottom: '25px'
}));

export const StyledTabs = styled(Tabs)(({ theme }) => ({
  minHeight: "50px",
  // backgroundColor: theme.palette.background.paper,
  "& .MuiTabs-flexContainer": {
    gap: "0",
    paddingLeft: 0,
    [theme.breakpoints.down("md")]: {
      paddingLeft: 0, // Giảm padding trên màn hình nhỏ
    },
  },
  "& .MuiTab-root": {
    fontSize: theme.typography.pxToRem(13),
    fontWeight: theme.typography.fontWeightBold,
    color: theme.palette.text.secondary,
    minHeight: "50px",
    textTransform: "uppercase",
    padding: theme.spacing(1.5, 2),
    minWidth: "auto",
    letterSpacing: "0.5px",
    transition: "all 0.2s ease",
    "&:hover": {
      color: theme.palette.primary.dark,
    },
    // Giảm cỡ chữ và padding trên màn hình nhỏ
    [theme.breakpoints.down("md")]: {
      fontSize: theme.typography.pxToRem(11),
      // padding: theme.spacing(1, 1.5),
      padding: theme.spacing(1, 2),
    },
  },
  // màu của tabs active
  "& .Mui-selected": {
    color: `${theme.palette.mode === "dark" ? theme.palette.primary.contrastText : theme.palette.primary.main} !important`,
    fontWeight: theme.typography.fontWeightBold,
    "&:hover": {
      opacity: 0.8, // Đoạn này tăng màu sáng khi hover nhé cu
    },
  },
  "& .MuiTabs-indicator": {
    height: "4px",
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.primary.main
        : theme.palette.primary.main,
  },
}));

export const StyledBadge = styled(Badge)(({ theme }) => ({
  color: "primary",
  "& .MuiBadge-badge": {
    fontSize: theme.typography.pxToRem(10),
    height: "18px",
    minWidth: "18px",
    padding: "0 5px",
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontWeight: theme.typography.fontWeightBold,
    top: "-4px",
    right: "-8px",
  },
}));

// export const TabContent = styled(Box)(({ theme }) => ({
//   flex: 1,
//   display: 'flex',
//   flexDirection: 'column',
//   backgroundColor: theme.palette.background.paper,
//   margin: theme.spacing(2),
//   borderRadius: theme.shape.borderRadius,
//   boxShadow: theme.shadows[1],
//   overflow: 'hidden',
// }));
export const TabContent = styled(Box)(({ theme }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.paper,
  margin: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  overflow: "hidden", // giữ phần này không bị scroll toàn màn
}));

export const ActionBar = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.action.hover,
}));

export const ActionButtons = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1.5),
  alignItems: "center",
}));

export const PrimaryButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: "20px",
  padding: theme.spacing(0.75, 2.5),
  textTransform: "none",
  fontSize: theme.typography.pxToRem(13),
  fontWeight: theme.typography.fontWeightBold,
  boxShadow: theme.shadows[0],
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: theme.shadows[2],
  },
}));

export const SecondaryButton = styled(Button)(({ theme }) => ({
  color: theme.palette.text.secondary,
  textTransform: "none",
  fontSize: theme.typography.pxToRem(13),
  fontWeight: theme.typography.fontWeightMedium,
  padding: theme.spacing(0.75, 2),
  borderRadius: "20px",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const IconButtons = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  width: "36px",
  height: "36px",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
  },
}));

export const FilterBar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(2, 3),
  gap: theme.spacing(1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  flexWrap: "wrap",
}));

export const SearchField = styled(TextField)(({ theme }) => ({
  flex: 1,
  maxWidth: "250px",
  "& .MuiOutlinedInput-root": {
    borderRadius: theme.shape.borderRadius,
    height: "40px",
    fontSize: theme.typography.pxToRem(14),
    backgroundColor: theme.palette.background.paper,
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
  },
}));

export const DateField = styled(TextField)(({ theme }) => ({
  width: "180px",
  "& .MuiOutlinedInput-root": {
    borderRadius: theme.shape.borderRadius,
    height: "40px",
    fontSize: theme.typography.pxToRem(14),
    backgroundColor: theme.palette.background.paper,
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
  },
  "& .MuiInputLabel-root": {
    fontSize: theme.typography.pxToRem(14),
  },
}));

export const StyledFormControl = styled(FormControl)(({ theme }) => ({
  minWidth: "150px",
  "& .MuiOutlinedInput-root": {
    borderRadius: theme.shape.borderRadius,
    height: "40px",
    fontSize: theme.typography.pxToRem(14),
    backgroundColor: theme.palette.background.paper,
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
  },
}));

export const SearchField2 = styled(TextField)(({ theme }) => ({
  flex: 1,
  maxWidth: "200px",
  "& .MuiOutlinedInput-root": {
    borderRadius: theme.shape.borderRadius,
    height: "40px",
    fontSize: theme.typography.pxToRem(14),
    backgroundColor: theme.palette.background.paper,
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
  },
}));

export const FilterIconButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  width: "40px",
  height: "40px",
  borderRadius: theme.shape.borderRadius,
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
  },
}));

export { PageContainer as Container };
export const StyledTableContainer = styled(ScrollTableContainer)({});

export const TableHeaderRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.action.hover,
  "& .MuiTableCell-head": {
    fontSize: theme.typography.pxToRem(13),
    fontWeight: theme.typography.fontWeightBold,
    color: theme.palette.text.secondary,
    borderBottom: `2px solid ${theme.palette.divider}`,
    padding: theme.spacing(1.5, 2),
    whiteSpace: "nowrap",
  },
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  transition: "background-color 0.2s ease",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "& .MuiTableCell-root": {
    fontSize: theme.typography.pxToRem(14),
    color: theme.palette.text.primary,
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  "&:last-child .MuiTableCell-root": {
    borderBottom: "none",
  },
}));

export const LevelAvatar = styled(Avatar)(({ theme, level }) => ({
  width: "32px",
  height: "32px",
  fontSize: theme.typography.pxToRem(14),
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.getContrastText(
    level === "B"
      ? theme.palette.success.main
      : level === "C"
        ? theme.palette.info.main
        : theme.palette.grey[500]
  ),
  backgroundColor:
    level === "B" ? "#4caf50" : level === "C" ? "#2196f3" : "#9e9e9e", // Fallback
  boxShadow: theme.shadows[1],
}));

export const StatusChip = styled(Chip)(({ theme }) => ({
  fontSize: theme.typography.pxToRem(12),
  height: "24px",
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.dark,
  fontWeight: theme.typography.fontWeightMedium,
  borderRadius: "12px",
}));

export const ActionCell = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(0.75),
  alignItems: "center",
  justifyContent: "flex-end",
}));

export const EditButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  width: "32px",
  height: "32px",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    transform: "scale(1.1)",
  },
  "& .MuiSvgIcon-root": {
    fontSize: theme.typography.pxToRem(18),
  },
}));

export const MenuButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  width: "32px",
  height: "32px",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    transform: "scale(1.1)",
  },
  "& .MuiSvgIcon-root": {
    fontSize: theme.typography.pxToRem(18),
  },
}));

export const Footer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(2, 3),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.action.hover,
}));

export const FooterLeft = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  fontSize: theme.typography.pxToRem(14),
  color: theme.palette.text.secondary,
}));

export const FooterCenter = styled(Box)(({ theme }) => ({
  fontSize: theme.typography.pxToRem(14),
  color: theme.palette.text.secondary,
  fontWeight: theme.typography.fontWeightMedium,
}));

export const RowsSelect = styled(Select)(({ theme }) => ({
  height: "32px",
  fontSize: theme.typography.pxToRem(14),
  minWidth: "80px",
  borderRadius: theme.shape.borderRadius,
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.divider,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.primary.main,
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.primary.main,
  },
}));

export const StyledPagination = styled(Pagination)(({ theme }) => ({
  "& .MuiPaginationItem-root": {
    fontSize: theme.typography.pxToRem(14),
    "&.Mui-selected": {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      "&:hover": {
        backgroundColor: theme.palette.primary.dark,
      },
    },
  },
}));

// export const ActionsWrapper = styled(Box)(({ theme }) => ({
//   display: 'flex',
//   gap: theme.spacing(1),
//   alignItems: 'center',
//   // paddingRight: theme.spacing(5), // Chỉ cần padding bên phải
//   backgroundColor: 'transparent',
//   '& .MuiButton-root': {
//     height: '40px',
//     width: '100px',
//     minWidth: '40px !important',
//     padding: 0,
//     display: 'flex',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   // ✅ Thêm đoạn này để tùy chỉnh màu sắc cho các button bên trong
//   '& .MuiButton-contained': {
//     backgroundColor: theme.palette.primary.main,
//     color: theme.palette.primary.contrastText,
//     '&:hover': { backgroundColor: theme.palette.primary.dark },
//   },
// }));

export const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: "4px",
  height: "40px",
  width: "100px",
  minWidth: "40px !important",
  padding: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  textTransform: "none",
  fontSize: theme.typography.pxToRem(13),
  fontWeight: theme.typography.fontWeightBold,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const StyleMenu = styled(Menu)(({ theme }) => ({
  zIndex: 9999,
  "& .MuiPaper-root": {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[4],
    borderRadius: 8,
    padding: theme.spacing(0.5, 0),
  },
}));

export const StyleMenuItem = styled(MenuItem)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

// ✅ RESPONSIVE ACTIONS WRAPPER
export const ActionsWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
  backgroundColor: "transparent",

  // Desktop: Hiển thị tất cả buttons
  [theme.breakpoints.up(750)]: {
    "& .MuiButton-root": {
      height: "40px",
      width: "auto",
      maxWidth: "180px",
      minWidth: "40px !important",
      padding: theme.spacing(0, 1),
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      textAlign: "center",
      lineHeight: 1.2,
    },
    "& .MuiButton-contained": {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      "&:hover": {
        backgroundColor: theme.palette.primary.dark,
      },
    },
  },

  // Mobile/Tablet (350-750px): Chỉ hiển thị menu button
  [theme.breakpoints.between(10, 750)]: {
    justifyContent: "flex-end",
  },
}));

// ✅ RESPONSIVE ACTION BUTTON (cho desktop)
export const ResponsiveActionButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: "4px",
  height: "40px",
  width: "auto",
  maxWidth: "180px",
  minWidth: "40px !important",
  padding: theme.spacing(0.5, 1),
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  textTransform: "none",
  fontSize: theme.typography.pxToRem(13),
  fontWeight: theme.typography.fontWeightBold,
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  textAlign: "center",
  lineHeight: 1.2,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },

  // Ẩn trên mobile/tablet
  [theme.breakpoints.between(350, 750)]: {
    display: "none",
  },
}));

// ✅ RESPONSIVE MENU BUTTON (chỉ hiện trên mobile/tablet)
export const ResponsiveMenuButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: "4px",
  height: "40px",
  width: "40px",
  minWidth: "40px !important",
  padding: 0,
  display: "none", // Ẩn mặc định
  justifyContent: "center",
  alignItems: "center",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },

  // Chỉ hiện trên mobile/tablet
  [theme.breakpoints.between(350, 750)]: {
    display: "flex",
  },
}));

export const WarningIconStyled = styled(WarningIcon)(() => ({
  color: '#FFBD42',
}));

export const StyledContainerTabs = styled(StyledTabs)(() => ({
	minHeight: "40px",
	"& .MuiTabs-indicator": {
		display: "none",
	},
	"& .MuiTabs-flexContainer": {
		gap: "14px",
	},
	"& .MuiTab-root": {
		minHeight: "40px",
		height: "40px",
		padding: "0 20px",
		textTransform: "uppercase",
		letterSpacing: "0.2px",
		fontSize: "13px",
		fontWeight: 700,
		borderRadius: 10,
		color: "#1b5fb4",
		backgroundColor: "#ffffff",
		border: "1px solid #e5ebf3",
		minWidth: "auto",
	},
	"& .MuiTab-root:hover": {
		backgroundColor: "#f7faff",
	},
	"& .MuiTab-root.Mui-selected": {
		backgroundColor: "#1e66bc",
		borderColor: "#1e66bc",
		color: "#ffffff !important",
	},
}));
