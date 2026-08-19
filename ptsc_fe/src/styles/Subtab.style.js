import { Box, Tabs, Tab } from "@mui/material";
import { styled } from "@mui/system"; // Sử dụng styled từ MUI

// Styled Components
export const ContainerBox = styled(Box)({
  width: "100%",
});

export const TabsContainer = styled(Box)(({ theme }) => ({
  borderBottom: 1,
  borderColor: theme.palette.divider,
  backgroundColor: theme.palette.background.default,
  borderRadius: "2px 0 0 2px",
}));

export const StyledTabs = styled(Tabs)({
  "& .MuiTabs-indicator": {
    display: "none", // Ẩn đường kẻ dưới tab mặc định
  },
  height: "42px !important",
});

export const StyledTab = styled(Tab, {
  shouldForwardProp: (prop) => prop !== "isActive" && prop !== "isEven",
})(({ theme, isActive, isEven }) => ({
  minWidth: 140,
  height: "42px !important",
  borderRadius: isEven
    ? "4px 0 0 4px" // Tab chẵn: bo góc trái
    : "0 4px 4px 0", // Tab lẻ: bo góc phải
  border: "1px solid rgba(0, 0, 0, 0.12)",
  padding: "0 24px",
  textTransform: "none",
  fontWeight: "bold",
  color: isActive
    ? theme.palette.primary.contrastText
    : theme.palette.text.secondary,
  backgroundColor: isActive
    ? theme.palette.primary.main
    : theme.palette.background.paper,
  "&:hover": {
    backgroundColor: isActive
      ? theme.palette.primary.main
      : theme.palette.action.hover,
  },
  "&.Mui-selected": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
}));

export const TabLabelBox = styled(Box)({
  display: "flex",
  alignItems: "center",
});

export const FileViewerIframe = styled("iframe")({
  width: "100%",
  height: "750px",
  border: "none",
});

export const FileViewerImg = styled("img")({
  maxWidth: "100%",
  maxHeight: "500px",
});

export const DocxMessageBox = styled(Box)(({ theme }) => ({
  padding: "10px",
  border: `1px solid ${theme.palette.grey[300]}`,
}));
