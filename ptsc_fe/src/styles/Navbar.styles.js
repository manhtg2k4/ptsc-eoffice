import { styled } from "@mui/material/styles";
import {
  AppBar,
  Box,
  Button,
  // ClickAwayListener,
  Drawer,
  IconButton,
  Typography,
  Dialog,
  TextField,
  InputAdornment,
  Popper,
  Paper,
  Toolbar,
  ListItemButton,
  List,
  ListItemIcon,
  DialogActions,
  DialogTitle,
} from "@mui/material";
import ChatIcon from '@mui/icons-material/Chat';
import HelpIcon from '@mui/icons-material/Help';
import AddIcon from '@mui/icons-material/Add';
import { ExpandLess, ExpandMore, 	Apps as AppsIcon, 	Search as SearchIcon, Close as CloseIcon} from "@mui/icons-material";
import { Link } from "react-router-dom";
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';


import MoreVertIcon from '@mui/icons-material/MoreVert';
export const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== "isOpen",
})(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#333c4d' : "#ffffff",
  transition: "margin 0.3s ease, width 0.3s ease",
  width: "100%",
  zIndex: 1300,
  boxShadow: theme.palette.mode === 'dark' ? "0px 1px 4px rgba(0, 0, 0, 0.3)" : "0px 1px 4px rgba(0, 0, 0, 0.05)",
  borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'}`,
  position: "fixed",
  height: "64px",
  color: theme.palette.mode === 'dark' ? '#ffffff' : "#1e293b",
}));

export const StyledToolbar = styled(Toolbar)(() => ({
  display: "flex",
  justifyContent: "space-between",
  paddingLeft: "14px !important",
  paddingRight: "14px !important",
}));
export const SearchIconST = styled(SearchIcon)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fff' : '#64748b', 
  fontSize: 20,
}));

export const StyledTypography = styled(Typography)(() => ({
  fontWeight: 700,
  fontSize: '18px',
  color: '#2069b8',
  whiteSpace: "nowrap",
  marginLeft: '8px',
}));

export const BrandName = styled(Typography)(({ theme }) => ({
  fontWeight: 800,
  fontSize: '23px !important',
  color: theme.palette.mode === 'dark' ? '#fff' : '#2069b8',
  whiteSpace: "nowrap",
  marginLeft: '12px',
  fontFamily: "'Outfit', sans-serif",
}));

export const LogoImage = styled("img")({
  width: 47,
  height: 55,
  display: 'block',
  objectFit: 'contain',
});

export const UserButton = styled(Button)(({ theme }) => ({
  color: theme.palette.text.primary,
  display: "flex",
  alignItems: "center",
}));

export const LinkST = styled(Link)(() => ({
 display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none'
}));
export const ExpandLessStyled = styled(ExpandLess)(({ theme }) => ({
  color: theme.palette.common.white,
}));

export const ExpandMoreStyled = styled(ExpandMore)(({ theme }) => ({
  color: theme.palette.common.white,
}));

export const ChatIconButton = styled(ChatIcon)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fff' : '#64748b',
}));

export const HelpIconButton = styled(HelpIcon)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fff' : '#64748b',
}));

export const AddIconButton = styled(AddIcon)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fff' : '#64748b',
}));

export const AppsIconButton = styled(AppsIcon)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fff' : '#64748b',
}));

export const IconButtonST = styled(IconButton)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fff' : '#64748b',
  "&:hover": { backgroundColor: theme.palette.mode === 'dark' ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }
}));

export const IconButtonTB = styled(IconButton)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fff' : '#64748b'
}));
export const IconButtonTI = styled(IconButton)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fff' : '#64748b'
}));

export const TextFieldStyled = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'isExpanded' && prop !== 'isSmallScreen',
})(({ theme, isExpanded, isSmallScreen }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "#f8fafc",
    color: theme.palette.mode === 'dark' ? "#ffffff" : "#1e293b",
    height: 40,
    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#f1f5f9'}`,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "transparent",
    },
    "&:hover": {
        backgroundColor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.12)" : "#f1f5f9",
    },
    "&.Mui-focused": {
      backgroundColor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.15)" : "#fff",
      boxShadow: theme.palette.mode === 'dark' ? "0 0 0 2px rgba(255, 255, 255, 0.1)" : "0 0 0 2px rgba(32, 105, 184, 0.1)",
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "#2069b8",
        borderWidth: "1px",
      },
    },
  },
  "& .MuiInputBase-input": {
    fontSize: "14px",
    padding: "8px 12px",
    "&::placeholder": {
      color: "#94a3b8",
      opacity: 1,
    },
  },
  width: isSmallScreen ? (isExpanded ? '100%' : 'auto') : "32rem",
  maxWidth: "100%",
  transition: "all 0.2s ease",
}));

export const InputAdornmentStyled = styled(InputAdornment)(({ theme }) => ({
  height: 40,
  cursor: "pointer",
  "& img": {
    filter: theme.palette.mode === 'dark' ? "brightness(0) invert(1)" : "brightness(0) saturate(100%)",
    opacity: theme.palette.mode === 'dark' ? 0.9 : 0.6,
  },
}));

export const SearchResultsBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isSmallScreen',
})(function({ isSmallScreen }) {
  return {
    width: isSmallScreen ? '90vw' : 400,
    maxHeight: 400,
    overflow: 'auto',
  };
});

export const SearchResults = styled(Box)(function() {
  return {
    padding: '8px',
    textAlign: 'center',
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: '0.875rem',
  };
});

export const BoxContainer = styled(Box)(function() {
  return {
    width: 300,
    marginTop: 60,
  };
});

export const BoxChild = styled(Box)(function({ theme }) {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : theme.palette.divider}`,
  };
});
export const PopperStyled = styled(Popper)(({theme}) => ({
 zIndex: theme.zIndex.drawer + 2,
}));
export const BoxFooter = styled(Box)(({theme}) => ({
   p: 12,
   borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : theme.palette.divider}`,
   textAlign: 'center',
}));

export const PaperStyled = styled(Paper)(({theme}) => ({
		backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
		color: theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary,
		border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : theme.palette.divider}`,
		borderRadius: 14,
		minWidth: 220,
		mt: 0.5,
		boxShadow: theme.shadows[8],
}));

export const TypographyFT = styled(Typography)(() => ({
 color: 'text.secondary',
 padding: 10 ,
}));

export const IconButtonPH = styled(IconButton)(() => ({
  padding: 4, color: 'inherit'
}));
export const BoxImg = styled(Box)(() => ({
  width: 20, height: 20
}));

export const ListItemButtonStyled = styled(ListItemButton)(({ theme }) => ({
	padding: "9.6px 0",
	'&:hover': {
	backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
	},
}));

export const ListItemIconStyled = styled(ListItemIcon)(() => ({
 color: 'inherit', minWidth: 40, display: 'flex', justifyContent: 'center' 
}));

export const ListItemIconStyledMenu = styled(ListItemIcon)(() => ({
 color: 'inherit',
}));

export const BoxMD = styled(Box)(() => ({
 display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 
}));


export const AppsSidebarDrawer = styled(Drawer)(({ theme }) => ({
	'& .MuiDrawer-paper': {
		backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
		color: theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary,
	}
}));


export const PopperMenuHeader = styled(Box)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	padding: theme.spacing(1.5),
	borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : theme.palette.divider}`,
}));

export const PopperMenuIconContainer = styled(Box)(({ theme }) => ({
	width: 32,
	height: 32,
	marginRight: theme.spacing(1.5),
	backgroundColor: "#0062AD",
	borderRadius: "10px",
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center'
}));

export const PopperMenuTitle = styled(Typography)({
	fontWeight: 600,
	textTransform: 'none'
});

export const PopperSubmenuList = styled(List)({
	paddingTop: 0,
	paddingBottom: 0,
	maxHeight: 240,
	overflowY: 'auto',
	overflowX: 'hidden',
});

export const PopperSubmenuItemIcon = styled(Box)({
	width: 8,
	height: 8,
	borderRadius: '50%',
	backgroundColor: '#0062AD',
});

export const UserDetails = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 1,
  minWidth: 0,
  [theme.breakpoints.down(426)]: {
    // Ẩn trên màn hình <= 425px
    gap: 0,
  },
}));

export const NotificationBox = styled(Box)(() => ({
  borderRight: "1px solid #AEB5BE",
  paddingRight: 8,
}));

// const MENU_COLORS = ["#F44336", "#FF9800", "#4CAF50", "#0062AD"];

export const UserInitialAvatar = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'username' && prop !== 'imageUrl' && prop !== 'size',
})(({ theme, username, imageUrl, size }) => {
  const colorIndex = username ? username.length % MENU_COLORS.length : 0;
  const bgColor = MENU_COLORS[colorIndex];
  const finalSize = size || 40;
  return {
    width: finalSize,
    height: finalSize,
    borderRadius: '50%',
    backgroundColor: imageUrl ? '#f0f0f0' : bgColor, // Use a neutral light gray if imageUrl is present but loading
    backgroundImage: imageUrl ? `url("${imageUrl}")` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    color: theme.palette.mode === 'dark' ? theme.palette.common.black : theme.palette.common.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.25rem',
    border: imageUrl ? `1px solid ${theme.palette.divider}` : 'none',
  }
});

export const UserContentWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
}));

export const UserInfoWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  [theme.breakpoints.down(400)]: {
    display: 'none',
  },
}));

export const UserNameText = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '180px',
  color: theme.palette.mode === 'dark' ? '#fff' : '#1e293b',
  lineHeight: 1.2,
  [theme.breakpoints.between(768, 1200)]: {
    maxWidth: '90px',
  },
}));

export const UserDeptText = styled(Typography)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#64748b',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '180px',
  [theme.breakpoints.between(768, 1200)]: {
    maxWidth: '90px',
  },
}));

export const NavDivider = styled('div')(({ theme }) => ({
  width: '1px',
  height: '36px',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#DDE0E4',
  margin: theme.spacing(0, 1),
}));

export const MobileMenuButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(2),
  color: theme.palette.common.white,
}));

export const ThemeConfigDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    // ✅ Đặt maxWidth trực tiếp cho paper của Dialog
    // Điều này tương đương với việc truyền prop maxWidth="xl"
    maxWidth: theme.breakpoints.values.lg,
    width: "100%",
  },
  // ✅ Xóa padding ngang của DialogContent để nội dung full width
  "& .MuiDialogContent-root": {
    padding: theme.spacing(0), // Chỉ padding dọc, bỏ padding ngang
  },
}));

export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  padding: theme.spacing(2),
}));

export const ButtonCloseST = styled(Button)(({ theme }) => ({
        backgroundColor: theme.palette.error.main,
        color: theme.palette.error.contrastText,
        '&:hover': {
          backgroundColor: theme.palette.error.dark,
        },
}));


export const DialogActionsST = styled(DialogActions)(() => ({
	justifyContent: 'center', p: 2, flexShrink: 0
}));

export const ButtonChangePass = styled(Button)(() => ({
    textTransform: 'none', 
    height: '30px',
    marginLeft: "16px",
    marginBottom: "16px",
    borderRadius: "8px",
    padding: "18px",
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  right: theme.spacing(1),
  top: theme.spacing(1),
  color: theme.palette.grey[500],
}));

// Cập nhật trong file Navbar.styles.js

export const ParentMenuListItemButton = styled(ListItemButton)(({ theme }) => ({
	position: 'relative',
	pr: 4,
	pl: 3,
	mb: 1,
	borderRadius: "14px",
	transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
	'& [data-status="active"]': {
		opacity: 0,
		visibility: 'hidden',
		maxHeight: 0,
		marginTop: 0,
		overflow: 'hidden',
		transform: 'translateY(-4px)',
		transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
	},
	
	// Ẩn dấu chấm xanh mặc định
	'& [data-status="dot"]': {
		opacity: 0,
		visibility: 'hidden',
		transform: 'scale(0)',
		transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
	},
	
	// Hiệu ứng khi hover
	'&:hover': {
		backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#ddedfd',
		transform: 'translateY(-2px)', // Giữ nguyên hiệu ứng nâng lên khi hover
		boxShadow: theme.shadows[4],
	},

	// Hiệu ứng khi được chọn
	'&.Mui-selected': {
		// Hiển thị text "Đang hoạt động" và lấy lại không gian
		'& [data-status="active"]': {
			opacity: 1,
			visibility: 'visible',
			maxHeight: '20px', // Chiều cao ước tính của text caption
			marginTop: '4px',
			transform: 'translateY(0)',
		},

		// Hiển thị dấu chấm xanh
		'& [data-status="dot"]': {
			opacity: 1,
			visibility: 'visible',
			transform: 'scale(1)',
		},
	},
}));

const MENU_COLORS = ["#F44336", "#FF9800", "#4CAF50", "#1976d2"];

export const ParentMenuIconContainer = styled(Box)(({  index = 0 }) => ({
	width: 48,
	height: 48,
	backgroundColor: MENU_COLORS[index % MENU_COLORS.length], // ← Random theo thứ tự đẹp
	borderRadius: "14px",
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	color: 'white',
	flexShrink: 0,
}));

export const ParentMenuTextWrapper = styled(Box)({
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'center', // Căn giữa nội dung khi text hoạt động ẩn đi
	flexGrow: 1,
	ml: 2,
	minWidth: 0,
});

export const ParentMenuStatusText = styled(Typography)({
	color: '#1960ff',
	fontSize: '0.75rem',
	fontWeight: 500,
	lineHeight: 1,
	marginTop: 4,
	// Không cần display: 'none' ở đây nữa
	// Logic ẩn/hiện được xử lý bằng data-status trong ParentMenuListItemButton
});

export const ParentMenuStatusDot = styled(Box)({
	position: 'absolute',
	top: 16,
	right: 10,
	width: 10,
	height: 10,
	borderRadius: '50%',
	backgroundColor: '#0062AD',
	boxShadow: '0 0 0 2px rgba(7, 130, 224, 0.2)',
	// Không cần opacity: 0 ở đây nữa
	// Logic ẩn/hiện được xử lý bằng data-status trong ParentMenuListItemButton
});

export const ListSt = styled(List)({
	paddingLeft:12,
	paddingRight:12
});

export const MoreVertIconStyled = styled(MoreVertIcon)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fff' : '#64748b',
}));

export const WhiteIconButton = styled(IconButton)({
  color: 'white',
});

export const StyledOpenInNewRoundedIcon = styled(OpenInNewRoundedIcon)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fff' : '#64748b',
}));

export const CropContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  overflow: 'hidden',
  minHeight: '300px',
  padding: theme.spacing(2),
  '& img': {
    maxWidth: '100%',
    maxHeight: '70vh',
  },
}));

export const CropCaptionText = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(2),
  fontSize: '14px',
  color: theme.palette.text.secondary,
  textAlign: 'center',
  fontStyle: 'italic',
}));

export const IconSpan = styled('span', {
  shouldForwardProp: (prop) => prop !== 'hasMargin',
})(({ hasMargin }) => ({
  color: "white",
  display: "flex",
  alignItems: "center",
  marginRight: hasMargin ? "8px" : 0,
}));

export const IconWrapperBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isMobile',
})(({ isMobile }) => ({
  marginRight: isMobile ? 5 : 10,
  alignItems: "center",
  display: "flex",
}));

export const PlaceholderBox = styled('div')({
  width: 24,
});

export const Spacer = styled(Box)({
  flexGrow: 1,
});

export const CloseIconST = styled(CloseIcon)({
  fontSize: 20,
  color: '#333',
  cursor: 'pointer',
});

export const HiddenInput = styled('input')({
  display: 'none',
});

export const ModuleIconWrapper = styled('span')({
  color: "white",
  display: "flex",
  alignItems: "center",
  marginRight: "8px",
  "& svg": {
    color: "white",
  },
});

export const LogoContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$hasLink',
})(({ $hasLink }) => ({
  display: 'flex',
  alignItems: 'center',
  cursor: $hasLink ? 'pointer' : 'default',
}));

export const SearchContainer = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(12),
  display: 'flex',
  alignItems: 'center',
  [theme.breakpoints.down('sm')]: {
    marginLeft: theme.spacing(2),
  },
}));
