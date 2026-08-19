import MenuIcon from "@mui/icons-material/Menu";
import {
  Avatar,
  Box,
  Checkbox,
  Pagination,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";

export const OrgUserPicker = styled(Box, {
  shouldForwardProp: (prop) => prop !== "scrollSize",
})(({ theme, scrollSize }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  minHeight: scrollSize ? 0 : 420,
  ...(scrollSize
    ? {
        height: scrollSize,
        maxHeight: scrollSize,
      }
    : {}),
}));

export const OrgSearchBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const OrgListHeader = styled(Box)(({ theme }) => ({
  minHeight: 72,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(2),
  padding: theme.spacing(1.5, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.default : "#f8fafd",
  [theme.breakpoints.down("sm")]: {
    alignItems: "flex-start",
    flexDirection: "column",
    padding: theme.spacing(1.5),
  },
}));

export const OrgListTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontSize: 14,
  fontWeight: 800,
  textTransform: "uppercase",
}));

export const SelectAllBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  color: theme.palette.text.primary,
  fontSize: 13,
  whiteSpace: "nowrap",
}));

export const OrgRows = styled(Box)({
  flex: 1,
  minHeight: 0,
  position: "relative",
  overflowY: "auto",
});

export const OrgLoadingOverlay = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: "50%",
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
}));

export const OrgUserRow = styled(Box)(({ theme }) => ({
  minHeight: 40,
  display: "grid",
  gridTemplateColumns: "30px minmax(0, 1fr) 40px",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(0.75, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  [theme.breakpoints.down("sm")]: {
    gridTemplateColumns: "28px minmax(0, 1fr) 36px",
    padding: theme.spacing(0.75, 1.25),
  },
}));

export const OrgDragIcon = styled(MenuIcon)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: 18,
  opacity: 0.75,
}));

export const OrgAvatar = styled(Avatar)(({ theme }) => ({
  width: 24,
  height: 24,
  backgroundColor: theme.palette.mode === "dark" ? theme.palette.action.selected : "#eef4ff",
  color: theme.palette.primary.main,
  fontWeight: 800,
  fontSize: 11,
}));

export const OrgUserName = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  [theme.breakpoints.down("sm")]: {
    fontSize: 12,
  },
}));

export const OrgUserSub = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: 10,
  lineHeight: 1.2,
  marginTop: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  [theme.breakpoints.down("sm")]: {
    fontSize: 10,
  },
}));

export const OrgUserTextBox = styled(Box)({
  minWidth: 0,
});

export const OrgUserCheckbox = styled(Checkbox)(({ theme }) => ({
  padding: 0,
  color: theme.palette.text.primary,
  "&.Mui-checked": {
    color: theme.palette.error.main,
  },
  "& .MuiSvgIcon-root": {
    fontSize: 24,
    borderRadius: 4,
  },
}));

export const OrgPagination = styled(Pagination)(({ theme }) => ({
  "& .MuiPaginationItem-root.Mui-selected": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
  },
}));

export const OrgEmptyBox = styled(Box)(({ theme }) => ({
  minHeight: 180,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.secondary,
  textAlign: "center",
  padding: theme.spacing(3),
}));

export const OrgPaginationBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5, 2),
  borderTop: `1px solid ${theme.palette.divider}`,
  flexWrap: "wrap",
}));
