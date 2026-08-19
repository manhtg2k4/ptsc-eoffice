import { styled } from "@mui/material/styles";
import { IconButton } from "@mui/material";
import { SkyBox, SkyTypography, SkyButton, SkyGrid } from "@styles/SkyStyles";
// import { StyledPaper } from "./ThemeConfig.styles";
import { EmptyStateBox, SectionWrapper } from "./LeadershipDutyScheduleCalendar.styles";

export const SectionHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(2),
  paddingBottom: theme.spacing(1),
}));

export const SectionWrapperContainer = styled(SectionWrapper)(({ theme, isBoxShadow }) => ({
	boxShadow: isBoxShadow ? theme.shadows[1] : "unset",
}));

export const EmptyStateContainer = styled(EmptyStateBox)(() => ({
	border: "unset",
}));

export const SectionTitle = styled(SkyTypography)(({ theme, customColor }) => ({
  color: customColor ?  "#4A5565" : theme.palette.primary.main,
  fontWeight: 700,
  fontSize: "16px",
  textTransform: "none",
  margin: 0,
}));

export const ActionButtonGroup = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
}));

export const CustomSkyButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: "white",
}));

export const DeleteButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: "white",
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
  },
}));

export const ScheduleItemBlock = styled(SkyBox)(({ theme }) => ({
  position: "relative",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  paddingTop: theme.spacing(3),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
}));

export const DeleteIconButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  top: 4,
  right: 4,
  color: theme.palette.error.main,
  zIndex: 1,
}));

export const ScheduleTypeGrid = styled(SkyGrid)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));