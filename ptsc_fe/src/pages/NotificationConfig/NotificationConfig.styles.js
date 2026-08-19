import {
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Select,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Search,
  Clear,
  Check,
  DescriptionOutlined,
} from "@mui/icons-material";
// Styled Components for Premium Aesthetics & Strict Linter Rules
export const PageContainer = styled(Box)(({ theme }) => ({
  padding: "11px",
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : "#F3F7FA",
  height: "calc(100vh - 64px)",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
}));

// export const PageContainer = styled(Box)(({ theme }) => ({
//   padding: "11px",
//   backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : "#F3F7FA",
//   minHeight: "calc(100vh - 64px)",
//   flex: 1,
//   display: "flex",
//   flexDirection: "column",
//   boxSizing: "border-box",
//   overflowY: "auto",
// }));

export const HeaderSection = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
});

export const Breadcrumb = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "13px",
  fontWeight: 700,
  color: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)",
  textTransform: "uppercase",
  marginBottom: theme.spacing(1),
  "& > span:first-of-type": {
    cursor: "pointer",
    transition: "color 0.2s ease-in-out",
    "&:hover": {
      color: theme.palette.primary.main,
    },
  },
}));

export const BreadcrumbCurrent = styled("span")(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? "#38bdf8" : "#1F63A8",
  fontWeight: 700,
}));

export const Title = styled(Typography)(({ theme }) => ({
  fontSize: "32px",
  fontWeight: 700,
  color: theme.palette.primary.main,
}));

export const Subtitle = styled(Typography)(({ theme }) => ({
  fontSize: "0.875rem",
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
}));


export const FlexRowGap = styled(Box)(({ theme }) => ({
  display: "flex !important",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const ActionGroup = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  gap: theme.spacing(2),
}));

export const LoadingWrapper = styled(Box)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "300px",
});


export const FilterToolbar = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  alignItems: "center",
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(2),
  flexWrap: "wrap",
}));

export const SearchField = styled(TextField)(({ theme }) => ({
  flexGrow: 1,
  maxWidth: "400px",
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    backgroundColor: theme.palette.background.paper,
  },
}));

export const InputWrapper = styled(Box)({
  minWidth: "200px",
});



export const ToggleButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "$active" && prop !== "$themeBg" && prop !== "$themeFg",
})(({ theme, $active, $themeBg, $themeFg }) => ({
  borderRadius: "8px",
  textTransform: "none",
  fontSize: "0.8125rem",
  padding: "4px 16px",
  fontWeight: 600,
  minWidth: "120px",
  transition: "all 0.2s ease-in-out",
  border: $active ? "1px solid transparent" : `1px solid ${theme.palette.divider}`,
  backgroundColor: $active ? $themeBg : "transparent",
  color: $active ? $themeFg : theme.palette.text.secondary,
  "&:hover": {
    backgroundColor: $active ? $themeBg : theme.palette.action.hover,
    borderColor: $active ? "transparent" : theme.palette.text.primary,
  },
}));

export const ModuleBadge = styled(Chip, {
  shouldForwardProp: (prop) => prop !== "$fill" && prop !== "$fg",
})(({ $fill, $fg }) => ({
  backgroundColor: $fill,
  color: $fg,
  fontWeight: 600,
  fontSize: "0.75rem",
  borderRadius: "6px",
}));


export const SaveButton = styled(Button)(({ theme }) => ({
  borderRadius: "10px",
  padding: "5px 12px",
  fontWeight: 700,
  textTransform: "none",
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: "0 6px 20px rgba(59, 130, 246, 0.6)",
  },
  "&.Mui-disabled": {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
  },
}));





export const TypeNameText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "$pointer",
})(({ theme, $pointer }) => ({
  fontSize: "0.875rem",
  fontWeight: 600,
  color: theme.palette.text.primary,
  ...($pointer && { cursor: 'pointer' }),
  whiteSpace: "normal",
  wordBreak: "break-word",
}));

// Styled Adornments to avoid Component forbidden props like 'position'
export const StartAdornment = styled(InputAdornment)({});
StartAdornment.defaultProps = {
  position: "start",
};

export const EndAdornment = styled(InputAdornment)({});
EndAdornment.defaultProps = {
  position: "end",
};

// Styled Icons to avoid Component forbidden props like 'color' and 'fontSize'

export const SearchIconStyled = styled(Search)(({ theme }) => ({
  fontSize: "1.25rem",
  color: theme.palette.action.active,
}));

export const CheckIconStyled = styled(Check)({
  fontSize: "1rem",
});

export const TableIconWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$fill" && prop !== "$fg",
})(({ $fill, $fg }) => ({
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: $fill,
  color: $fg,
}));

export const DocIconStyled = styled(DescriptionOutlined)({
  fontSize: "16px",
  color: "inherit",
});

export const ClearIconStyled = styled(Clear)({
  fontSize: "1.25rem",
});


export const TableWrapper = styled(Box)({
  flex: 1,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  "& .MuiToolbar-root": {
    display: "none",
  },
  "& > div:last-child": {
    height: "0 !important",
    flex: "1 !important",
    minHeight: "0 !important",
  }
});

// export const TableWrapper = styled(Box)({
//   flex: 1,
//   display: "flex",
//   flexDirection: "column",
// });

export const PaginationBar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: theme.spacing(2),
  marginTop: theme.spacing(1),
  padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  borderRadius: "0 0 8px 8px",
  flexShrink: 0,
}));

export const PaginationInfo = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  fontSize: "0.875rem",
  color: theme.palette.text.secondary,
}));

export const StyledRowsSelect = styled(Select)({
  fontSize: "0.875rem",
  minWidth: 70,
});