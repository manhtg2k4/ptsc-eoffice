import { Grid, Box, Paper, Typography, IconButton } from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledGridAlbumType = styled(Grid)(() => ({
  paddingTop: "0px !important",
}));

export const StyledContainerGridTopicAndAlbumType = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(0.75),
}));

export const FeaturedImageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${
    theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0"
  }`,
  borderRadius: theme.spacing(1),
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 2px 4px rgba(0,0,0,0.3)"
      : "0 2px 4px rgba(0,0,0,0.08)",
  height: "100%",
}));

export const FormContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

export const MainCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${
    theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0"
  }`,
  borderRadius: theme.spacing(1),
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 2px 4px rgba(0,0,0,0.3)"
      : "0 2px 4px rgba(0,0,0,0.08)",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

export const FieldLabel = styled(Typography)(({ theme, styledMarginBottom }) => ({
  fontSize: "18px",
  fontWeight: 500,
  color: theme.palette.mode === "dark" ? "#ffffff" :"#2364B0" ,
  marginBottom:
    styledMarginBottom !== undefined ? styledMarginBottom : theme.spacing(1),
  "& .required": {
    color: theme.palette.error.main,
    marginLeft: "4px",
  },
}));

export const UploadArea = styled(Box)(({ theme }) => ({
  border: `2px dashed ${
    theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0"
  }`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(4),
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.3s ease",
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#FAFAFA",
  height: "260px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  "&:hover": {
    borderColor: "#0066CC",
    backgroundColor: theme.palette.mode === "dark" ? "#475569" : "#F5F5F5",
  },
}));

export const UploadIcon = styled(Box)(({ theme }) => ({
  width: "48px",
  height: "48px",
  margin: "0 auto 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  backgroundColor:
    theme.palette.mode === "dark" ? theme.palette.grey[800] : "#E3F2FD",
  "& svg": {
    fontSize: "24px",
    color: "#0066CC",
  },
}));

export const UploadText = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
}));

export const UploadSubText = styled(Typography)(({ theme }) => ({
  fontSize: "12px",
  color: theme.palette.text.disabled,
}));

export const HiddenFileInput = styled("input")({
  display: "none",
});

export const PreviewImageBox = styled(Box)({
  width: "auto",
  maxWidth: "100%",
  height: "100%",
  maxHeight: "260px",
  objectFit: "contain",
  borderRadius: "8px",
  margin: "0 auto",
});

export const AlbumImagesArea = styled(Box)(({ theme, isError }) => ({
  border: `1px dashed ${
    isError ? theme.palette.error.main : (theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0")
  }`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(6),
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.3s ease",
  backgroundColor: isError 
    ? (theme.palette.mode === "dark" ? "rgba(211, 47, 47, 0.1)" : "rgba(211, 47, 47, 0.05)")
    : "transparent",
  minHeight: "370px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  marginTop: theme.spacing(2),
  width: "100%",
  "&:hover": {
    borderColor: isError ? theme.palette.error.dark : "#0066CC",
    backgroundColor: isError 
      ? (theme.palette.mode === "dark" ? "rgba(211, 47, 47, 0.15)" : "rgba(211, 47, 47, 0.08)")
      : (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#F8FBFF"),
  },
}));

export const UploadInstruction = styled(Typography)(({ theme }) => ({
  fontSize: "16px",
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
}));

export const HighlightText = styled("span")(() => ({
  color: "#0066CC",
  textDecoration: "underline",
  cursor: "pointer",
  fontWeight: 600,
}));

export const InstructionSubText = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.secondary,
  opacity: 0.8,
}));

export const InstructionSubTextSmall = styled(InstructionSubText)(({ theme }) => ({
  fontSize: "12px",
  marginTop: theme.spacing(1),
}));

export const LargeUploadIcon = styled(UploadIcon)(({ theme }) => ({
  width: "64px",
  height: "64px",
  marginBottom: theme.spacing(2),
  "& svg": {
    fontSize: "32px",
  },
}));

export const AlbumImagesGrid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
  flex: 1,
  alignContent: 'start'
}));

export const AlbumImagesGridWithMargin = styled(AlbumImagesGrid)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const AlbumImageItem = styled(Box)(({ theme }) => ({
  position: "relative",
  paddingTop: "100%",
  borderRadius: theme.spacing(1),
  overflow: "hidden",
  border: `1px solid ${theme.palette.divider}`,
  "&:hover": {
    "& button": {
      opacity: 1,
    },
  },
  "& img": {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
}));

export const ErrorText = styled(Typography)({
  color: "#d32f2f",
  fontSize: "12px",
  marginTop: "4px",
});

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: "18px",
  fontWeight: 600,
  color: theme.palette.mode === "dark" ? "#ffffff" :"#2364B0" ,
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(2),
}));

export const UploadTextSmall = styled(UploadText)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontSize: "12px",
}));

export const UploadSubTextSpaced = styled(UploadSubText)(({ theme }) => ({
  marginTop: theme.spacing(0.5),
}));

export const AlbumButtonBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(1),
  flexWrap: 'nowrap',
  "& > *": {
    margin: 0,
  },
  "& .MuiTypography-root": {
    margin: 0,
  },
}));

export const LoadingBox = styled(Box)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "40px",
});

export const StyledGridContainer = styled(Grid)({
  height: "100%",
});

export const StyledGridItem = styled(Grid)({
  height: "100%",
});

export const MetricsContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(3),
  marginTop: theme.spacing(2),
}));

export const MetricItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  "& svg": {
    fontSize: "20px",
  },
}));

export const MetricText = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 500,
  color: theme.palette.text.secondary,
}));

export const EmptyImagePlaceholder = styled(Box)(({ theme }) => ({
  height: "200px",
  backgroundColor: theme.palette.action.disabledBackground,
  borderRadius: theme.spacing(1),
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

export const EmptyText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.disabled,
  fontStyle: "italic",
  fontSize: "14px",
}));

export const DeleteButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  top: theme.spacing(0.5),
  right: theme.spacing(0.5),
  backgroundColor: "rgba(255, 255, 255, 0.9)",
  opacity: 0.7,
  transition: "opacity 0.2s, background-color 0.2s",
  color: theme.palette.error.main,
  zIndex: 1,
  padding: theme.spacing(0.5),
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 1)",
    opacity: 1,
  },
}));

export const AddImagePlaceholder = styled(Box)(({ theme, isError }) => ({
  border: `2px dashed ${
    isError ? theme.palette.error.main : "#E0E0E0"
  }`,
  borderRadius: theme.spacing(1),
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  aspectRatio: "1/1",
  cursor: "pointer",
  backgroundColor: isError 
    ? (theme.palette.mode === "dark" ? "rgba(211, 47, 47, 0.1)" : "rgba(211, 47, 47, 0.05)")
    : "transparent",
  "&:hover": {
    borderColor: isError ? theme.palette.error.dark : "#0066CC",
    backgroundColor: isError 
      ? (theme.palette.mode === "dark" ? "rgba(211, 47, 47, 0.15)" : "rgba(211, 47, 47, 0.08)")
      : theme.palette.action.hover,
  },
  "& svg": {
    color: isError ? theme.palette.error.main : "inherit",
  }
}));
