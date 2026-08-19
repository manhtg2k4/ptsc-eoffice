import {
  styled,
  // Card,
  CardMedia,
  // CardContent,
  Skeleton
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import MovieIcon from "@mui/icons-material/Movie";
import { SkyBox, SkyButton, SkyIconButton, SkyPaper, SkyTypography } from "./SkyStyles";

export const Container = styled(SkyBox)({
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
});

export const Header = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  position: "sticky",
  top: 0,
  zIndex: 10,
}));

export const SaveButton = styled(SkyButton)(() => ({
  minWidth: "100px",
}));

export const FormContainer = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

export const MainCard = styled(SkyPaper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0"}`,
  borderRadius: theme.spacing(1),
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 2px 4px rgba(0,0,0,0.3)"
      : "0 2px 4px rgba(0,0,0,0.08)",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

export const SectionTitleBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

export const VerticalIndicator = styled(SkyBox)(({ theme }) => ({
  width: "4px",
  height: "24px",
  backgroundColor: theme.palette.primary.main,
  borderRadius: "2px",
}));

export const SectionTitle = styled(SkyTypography)(() => ({
  fontSize: "18px",
  fontWeight: 700,
  color: "#004B8F", // Sẫm màu hơn theo ảnh
  textTransform: "uppercase",
}));


export const UploadArea = styled(SkyBox)(({ theme }) => ({
  position: "relative",
  border: `2px dashed ${theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0"}`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(4),
  textAlign: "center",
  cursor: "pointer",

  transition: "all 0.3s ease",
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#FAFAFA",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "150px",
  "&:hover": {
    borderColor: "#0066CC",
    backgroundColor: theme.palette.mode === "dark" ? "#475569" : "#F5F5F5",
  },
}));

export const UploadIcon = styled(SkyBox)(({ theme }) => ({
  width: "48px",
  height: "48px",
  margin: "0 auto 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#E3F2FD",
  "& svg": {
    fontSize: "24px",
    color: "#0066CC",
  },
}));

export const UploadText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
}));

export const UploadSubText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "12px",
  color: theme.palette.text.disabled,
}));

export const UploadArrowUpwardIcon = styled(ArrowUpwardIcon)(() => ({
  fontSize: "small",
}));

export const UploadArrowDownwardIcon = styled(ArrowDownwardIcon)(() => ({
  fontSize: "small",
}));

export const UploadDeleteIcon = styled(DeleteIcon)(() => ({
  fontSize: "small",
}));

export const UploadKeyboardArrowUpIcon = styled(KeyboardArrowUpIcon)(() => ({
  fontSize: "large",
}));

export const UploadExpandMoreIcon = styled(ExpandMoreIcon)(() => ({
  fontSize: "large",
}));
export const UploadExpandLessIcon = styled(ExpandMoreIcon)(() => ({
  fontSize: "large",
  transform: "rotate(180deg)",
}));

export const HiddenFileInput = styled("input")({
  display: "none",
});

export const NewsCard = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  marginBottom: theme.spacing(1),
  border: "none",
  boxShadow: "none",
}));


export const NewsCardMedia = styled(CardMedia)({
  width: 140,
  minHeight: 100,
});

export const NewsImageWrapper = styled(SkyBox)({
  width: 100,
  height: 100,
  flexShrink: 0,
  overflow: "hidden",
  borderRadius: "4px",
  marginRight: "12px",
});


export const NewsCardContent = styled(SkyBox)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(1),
}));


export const NewsTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "15px",
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(0.5),
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
}));

export const NewsDate = styled(SkyTypography)(({ theme }) => ({
  fontSize: "12px",
  color: theme.palette.text.secondary,
}));

export const NewsTag = styled(SkyBox)(({ theme }) => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "11px",
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#E3F2FD",
  color: theme.palette.primary.main,
  marginRight: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
}));

export const AddNewsButton = styled(SkyButton)(({ theme }) => ({
  color: "#0066CC",
  textTransform: "none",
  fontWeight: 500,
  fontSize: "13px",
  padding: theme.spacing(0.5, 2),
  border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#E3F2FD"}`,
  borderRadius: '4px',
  width: 'auto',
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#E3F2FD",
  },
}));

export const SearchBox = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const BannerLinkInput = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(2),
}));

export const SectionCollapseBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: theme.spacing(2),
}));

export const SectionTitleWithCollapse = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const CollapseIcon = styled(SkyIconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
}));

export const NewsListContainer = styled(SkyBox)(({ theme }) => ({
  maxHeight: "600px",
  overflowY: "auto",
  paddingRight: theme.spacing(1),
  "&::-webkit-scrollbar": {
    width: "6px",
  },
  "&::-webkit-scrollbar-track": {
    background: theme.palette.mode === "dark" ? "#1e293b" : "#f1f1f1",
  },
  "&::-webkit-scrollbar-thumb": {
    background: theme.palette.mode === "dark" ? "#475569" : "#888",
    borderRadius: "3px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    background: theme.palette.mode === "dark" ? "#64748b" : "#555",
  },
}));

export const SectionBox = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const NumberBadge = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.secondary,
  fontSize: "12px",
  fontWeight: 600,
  marginRight: theme.spacing(1),
  flexShrink: 0,
}));


export const NewsItemBox = styled(SkyBox)({
  display: "flex",
  alignItems: "center",
  marginBottom: 16,
});

export const DeleteIconButton = styled(SkyIconButton)(({ theme }) => ({
  color: theme.palette.text.disabled,
  padding: theme.spacing(0.5),
  "&:hover": {
    color: theme.palette.error.main,
    backgroundColor: "transparent",
  },
}));


export const SectionDescription = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  marginBottom: theme.spacing(2),
  fontSize: "13px",
}));

export const BannerImageWrapper = styled(SkyBox)({
  position: "relative",
  width: "100%",
  height: "100%",
});

export const BannerTypography = styled(SkyTypography)(() => ({
  fontWeight: 600,
  fontSize: "16px",
  color: "#5A6573",
}));


export const BannerImage = styled("img")(({ theme }) => ({
  width: "100%",
  height: "100%",
  objectFit: "contain",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f8f9fa",
}));

export const BannerDeleteButton = styled(DeleteIconButton)({
  position: "absolute",
  top: 8,
  right: 8,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
});

export const DeleteIconWhite = styled(DeleteIcon)({
  color: "white",
  fontSize: "small",
});

export const UploadAreaLarge = styled(UploadArea)({
  height: "200px",
  minHeight: "200px",
});

export const UploadAreaMedium = styled(UploadArea)({
  height: "200px",
  minHeight: "200px",
});

export const NewsListContainerMedium = styled(NewsListContainer)({
  maxHeight: "600px",
});


export const LoadingBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  padding: theme.spacing(2),
}));

export const NewsListContainerLarge = styled(NewsListContainer)({
  maxHeight: "800px",
});


export const DraggableNewsCard = styled(SkyPaper)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "8px",
  boxShadow: "none",
  backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.paper : "#fff",
  cursor: "grab",
  "&:active": {
    cursor: "grabbing",
  },
}));


export const NewsActionContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  marginLeft: "auto",
}));


export const EmptySlotBox = styled(SkyBox)(({ theme }) => ({
  flex: 1,
  border: "2px dashed",
  borderColor: theme.palette.divider,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(3),
  textAlign: "center",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "transparent",
  color: theme.palette.text.disabled,
  fontSize: "13px",
}));

export const SectionHeaderBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const SectionHeaderSpaceBetween = styled(SectionHeaderBox)({
  justifyContent: "space-between",
});

export const HeaderTitleColumnBox = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
});


export const CountBadge = styled(SkyBox)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  minWidth: 24,
  height: 24,
  padding: "0 6px",
  borderRadius: "12px",
  backgroundColor: "#0066CC", // Blue from image
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 600,
}));


export const SlotBadge = styled(SkyBox)(({ theme }) => ({
  marginLeft: theme.spacing(2),
  padding: "2px 12px",
  borderRadius: "16px",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f4f5f7",
  color: "#0066CC",
  fontSize: "12px",
  fontWeight: 600,
  // border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#0066CC"}`,
}));


export const HintText = styled(SkyTypography)(() => ({
  marginLeft: "auto",
  fontSize: "10px",
  color: "#94A3B8",
  fontStyle: "italic",
  fontWeight: 600,
  margin: 0
}));

export const DraggableBox = styled(SkyBox)({
  marginBottom: 16,
  cursor: "grab",
  padding: 0,
  "&:active": {
    cursor: "grabbing",
  },
});

export const CenterBox = styled(SkyBox)({
  textAlign: "center",
  marginTop: 8,
});

export const ActionIconButton = styled(SkyIconButton)(({ theme }) => ({
  padding: 4,
  color: theme.palette.text.disabled,
  "&:hover": {
    color: theme.palette.primary.main,
  },
  "&:disabled": {
    color: theme.palette.text.disabled,
    opacity: 0.3,
  },
  "& svg": {
    fontSize: "18px",
  },
}));


export const FlexColumnBox = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  gap: 24,
});

export const BannerContentBox = styled(SkyBox)(({ theme }) => ({
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0"}`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "transparent",
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 2px 8px rgba(0,0,0,0.2)"
      : "0 2px 8px rgba(0,0,0,0.1)",
}));

export const FilterContainer = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const NewsCardContentWithPadding = styled(NewsCardContent)(({ theme }) => ({
  paddingBottom: theme.spacing(1),
}));

export const TagsContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
}));

export const TagsBox = styled(SkyBox)({});
export const NewsMetaBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));
export const AddButtonBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1),
  paddingTop: 0,
}));


export const BannerTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
}));

export const ConfigCaption = styled(SkyTypography)(({ theme }) => ({
  fontSize: "13px",
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(1),
}));


export const BannerSkeleton = styled(Skeleton, {
  shouldForwardProp: (prop) => prop !== "isLarge",
})(({ theme, isLarge }) => ({
  width: "100%",
  height: isLarge ? 250 : 150,
  borderRadius: theme.spacing(1),
  transform: "none",
}));

export const CropContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#f0f0f0',
  padding: theme.spacing(2),
  borderRadius: theme.spacing(1),
}));

export const CropCaptionText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(1),
  display: 'block',
  textAlign: 'center',
}));
export const VideoArea = styled(UploadArea)(() => ({
  marginTop: 8,
  flex: 1,
  minHeight: "332px",
  height: "91%",
  "@media (max-width: 600px)": {
    padding: 16,
    minHeight: "200px",
  },
}));

export const SkyMovieIcon = styled(MovieIcon)(() => ({
  fontSize: "24px",
  color: "#0066CC",
}));

export const StyledVideo = styled("video")({
  width: "100%",
  height: "100%",
  maxHeight: "300px",
  objectFit: "contain",
  backgroundColor: "#000",
  borderRadius: "8px",
});

export const VideoPlayerBox = styled(SkyBox)({
  position: "relative",
  width: "100%",
  height: "auto",
  marginTop: 16,
});

export const DeleteMediaButton = styled(SkyIconButton)(() => ({
  position: "absolute",
  top: 8,
  right: 8,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  color: "white",
  padding: 4,
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
}));

export const MediaFileName = styled(SkyTypography)(({ theme }) => ({
  fontSize: "12px",
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(1),
  wordBreak: "break-all",
}));

export const SkyCloudUploadIcon = styled(CloudUploadIcon)(({ theme }) => ({
  marginTop: theme.spacing(1),
  color: theme.palette.primary.main,
  fontSize: "20px",
}));
export const EmptySlotContainer = styled(SkyBox)({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
});
export const FeaturedNewsContentBox = styled(SkyBox)(({ theme }) => ({
  flex: 1,
  marginLeft: theme.spacing(1),
}));
