import { styled } from "@mui/system";
import { Box, MenuItem, TextField } from "@mui/material";

export const TreeToggleButton = styled(Box)(({ theme }) => ({
  height: "20px",
  width: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "4px",
  marginRight: "8px",
  "& svg": {
    fontSize: "16px", // Giữ nguyên hoặc dùng theme.typography
    color: theme.palette.text.secondary,
  },
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const TreeMenuItem = styled(MenuItem)(({ level, theme }) => ({
  position: "relative",
  paddingLeft: `${20 + level * 20}px`,
  minHeight: "36px",
  display: "flex",
  alignItems: "center",
  "&.Mui-selected": {
    backgroundColor: theme.palette.action.selected,
  },
  "&.Mui-selected:hover": {
    backgroundColor: theme.palette.action.selected,
  },
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const TreeVerticalLine = styled(Box)(({ theme, level }) => ({
  position: "absolute",
  left: `${10 + level * 20}px`,
  top: 0,
  bottom: 0,
  width: "1px",
  backgroundColor: theme.palette.divider,
  opacity: 0.7,
  transition: "opacity 0.2s ease-in-out",
  "&:hover": {
    opacity: 0.9,
  },
}));

export const RequiredLabel = styled("span")(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const DropdownContainer = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "100%",
  left: 0,
  width: "100%",
  backgroundColor: theme.palette.background.paper,
  zIndex: 1300,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  marginTop: theme.spacing(1),
  boxShadow: theme.shadows[2],
  maxHeight: 236,
  overflowY: "auto",
  overflowX: "hidden",
}));

export const SearchContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  position: "sticky",
  top: 0,
  zIndex: 1,
}));

export const SearchInput = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: theme.palette.divider },
    "&:hover fieldset": { borderColor: theme.palette.grey[400] },
    "&.Mui-focused fieldset": { borderColor: theme.palette.primary.main },
  },
}));

export const OptionsContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
}));

export const NodeLabel = styled(Box, {
  shouldForwardProp: (prop) => prop !== "hasChildren",
})(({ hasChildren }) => ({
  marginLeft: hasChildren ? 0 : "28px",
  // allow truncation when text is long to avoid horizontal scrolling
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

export const ValueContainer = styled(Box)({
  display: "flex",
  gap: "4px", // 0.5 * 8px
  flexWrap: "wrap",
});

export const SelectTreeWrapper = styled(Box)({
  position: "relative",
});

export const TreeHorizontalLine = styled(Box)(
  ({ theme, level, noHasChildren }) => ({
    position: "absolute",
    left: `${10 + level * 20}px`,
    top: "50%",
    width: noHasChildren ? "30px" : "10px",
    height: "1px",
    backgroundColor: theme.palette.divider,
    opacity: 0.7,
    borderRadius: "1px",
    padding: "0 !important",
    margin: "0 !important",
    transition: "opacity 0.2s ease-in-out",
    "&:hover": {
      opacity: 0.9,
    },
  })
);

// Ensure menu items don't force horizontal scroll
export const TreeMenuItemLabelWrapper = styled("div")({
  display: "flex",
  alignItems: "center",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
});
