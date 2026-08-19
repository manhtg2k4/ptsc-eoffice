import { styled } from "@mui/material/styles";
import { 
  SkyBox, 
  SkyTypography, 
  SkyButton, 
  SkyRadioGroup, 
  SkyFormControlLabel, 
  SkyTextField, 
  SkyGrid, 
  SkyRadio, 
  SkyIconButton, 
  SkyCheckbox 
} from "@styles/SkyStyles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  ActionLink,
  StyledAddIcon,
} from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";

export const RegisterRoomContainer = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  borderRadius: 8,
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#e8eaf1",
  overflow: "hidden",
  marginBottom: theme.spacing(2),
}));

export const RegisterRoomHeader = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2.5),
  borderBottom: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#f1f3f5",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}));

export const RegisterRoomTitle = styled(SkyTypography, {
    shouldForwardProp: (prop) => prop !== "mt" && prop !== "mb",
})(({ theme, mt, mb }) => ({
  marginTop: mt !== undefined ? theme.spacing(mt) : 0,
  marginBottom: mb !== undefined ? theme.spacing(mb) : 0,
  fontSize: "16px",
  fontWeight: 600,
  color: theme.palette.mode === "dark" ? "#FFFFFF" : "#0066CC",
  [theme.breakpoints.down("sm")]: {
    fontSize: "14px",
  },
}));

export const RegisterRoomContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(3),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(3),
}));

export const FormItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "horizontal",
})(({ theme, horizontal }) => ({
  display: "flex",
  flexDirection: horizontal ? "row" : "column",
  alignItems: horizontal ? "center" : "flex-start",
  gap: theme.spacing(horizontal ? 4 : 1),
}));

export const FormLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "1rem",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  color: theme.palette.text.primary,
  paddingBottom: theme.spacing(1),
  "& .required": {
    color: theme.palette.error.main,
    marginLeft: theme.spacing(0.5),
  },
}));

export const StyledRadioGroup = styled(SkyRadioGroup)(({ theme }) => ({
  flexDirection: "row",
  gap: theme.spacing(4),
}));

export const StyledRadio = styled(SkyRadio)(({ theme }) => ({
  color: theme.palette.primary.main,
  "&.Mui-checked": {
    color: theme.palette.primary.main,
  },
  padding: theme.spacing(1),
}));

export const StyledFormControlLabel = styled(SkyFormControlLabel)(({ theme }) => ({
  "& .MuiTypography-root": {
    fontSize: "0.9rem",
    color: theme.palette.text.secondary,
  },
}));

export const StyledTextField = styled(SkyTextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#fff",
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
  },
  "& .MuiOutlinedInput-input": {
    padding: "10px 14px",
    fontSize: "0.9rem",
  },
}));

export const RegisterButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
  textTransform: "none",
  padding: "8px 20px",
  borderRadius: "4px",
  fontWeight: 500,
  alignSelf: "flex-start",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
  "& .MuiButton-startIcon": {
    marginRight: theme.spacing(1),
  },
}));



// NEW STYLES FOR DETAILED VIEW
export const SectionContainer = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  borderRadius: 8,
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#e8eaf1",
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

export const SectionHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const SectionTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "16px",
  fontWeight: 600,
  color: theme.palette.mode === "dark" ? "#FFFFFF" : "#0066CC",
  textTransform: "uppercase",
  [theme.breakpoints.down("sm")]: {
    fontSize: "14px",
  },
}));

export const EditIconButton = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  cursor: "pointer",
  color: "#2563eb",
  fontSize: "0.85rem",
  fontWeight: 500,
  "&:hover": {
    textDecoration: "underline",
  },
  "& svg": {
    fontSize: "1.1rem",
    color: theme.palette.primary.main,
  },
}));

export const RoomCardsRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  overflowX: "auto",
  paddingBottom: theme.spacing(1.5),
  "&::-webkit-scrollbar": {
    height: 6,
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#cbd5e1",
    borderRadius: 3,
  },
}));

export const SelectedRoomCard = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ theme, active }) => ({
  minWidth: 280,
  maxWidth: 350,
  padding: theme.spacing(2),
  borderRadius: 8,
  border: "1px solid",
  borderColor: active ? "#0052cc" : (theme.palette.mode === "dark" ? "#334155" : "#e0e0e0"),
  backgroundColor: "transparent",
  cursor: "pointer",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.5),
}));

export const RoomCardTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  fontSize: "1rem",
  color: theme.palette.text.primary,
  paddingRight: theme.spacing(4),
  wordBreak: "break-word",
}));

export const RoomCardSub = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
  paddingRight: theme.spacing(4),
  wordBreak: "break-word",
}));

export const RoomCardStats = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: theme.spacing(1),
  "& .label": {
    fontSize: "0.7rem",
    color: theme.palette.text.secondary,
  },
  "& .value": {
    fontSize: "0.7rem",
    fontWeight: 500,
    padding: "2px 8px",
    borderRadius: 4,
    backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#f1f3f5",
  },
}));

export const RoomCardCapacity = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.8rem",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
}));

export const RoomCardDivider = styled(SkyBox)(({ theme }) => ({
  height: "1px",
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#f1f3f5",
  width: "100%",
  margin: theme.spacing(1, 0),
}));

export const RoomCardFooter = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "auto",
  gap: theme.spacing(2),
}));

export const StatusBadge = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "status",
})(({ theme, status }) => {
  let colors = {
    bg: "#f1f3f5",
    text: theme.palette.text.secondary,
  };

  if (status === "ASSIGNING") {
    colors = {
      bg: "#2196f3",
      text: "#fff",
    };
  } else if (status === "ASSIGNED") {
    colors = {
      bg: "#e8f5e9",
      text: "#4caf50",
    };
  }

  return {
    fontSize: "0.75rem",
    fontWeight: 500,
    padding: "6px 14px",
    borderRadius: 6,
    backgroundColor: colors.bg,
    color: colors.text,
  };
});

export const AssignmentText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.85rem",
  color: theme.palette.text.secondary,
  marginLeft: theme.spacing(1),
  whiteSpace: "nowrap",
}));

export const MainLayout = styled(SkyGrid)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const LeftPanel = styled(SkyBox)(({ theme }) => ({
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#e8eaf1",
  borderRadius: 8,
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
  height: "100%",
  overflow: "hidden",
}));

export const RightPanel = styled(SkyBox)(({ theme }) => ({
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#e8eaf1",
  borderRadius: 8,
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
  padding: theme.spacing(2),
  height: "100%",
}));

export const AttendanceHeader = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#f1f3f5",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
}));

export const AttendanceHeaderInfo = styled(SkyBox)(() => ({
  flex: 1,
}));

export const AddParticipantLink = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.8rem",
  color: "#2563eb",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  fontWeight: 500,
  "&:hover": {
    textDecoration: "underline",
  },
  "& svg": {
    fontSize: "1rem",
    marginRight: theme.spacing(0.5),
  },
}));

export const EditSeatsLink = styled(AddParticipantLink)(({ theme }) => ({
  marginLeft: theme.spacing(2),
}));

export const AccordionHeaderCaption = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
}));

export const AttendanceTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "16px",
  fontWeight: 600,
  color: theme.palette.mode === "dark" ? "#FFFFFF" : "#0066CC",
  [theme.breakpoints.down("sm")]: {
    fontSize: "14px",
  },
}));

export const AttendanceStats = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
}));

export const SeatingHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(3),
  paddingBottom: theme.spacing(1),
  borderBottom: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#f1f3f5",
}));

export const SeatingTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "16px",
  fontWeight: 600,
  color: theme.palette.mode === "dark" ? "#FFFFFF" : "#0066CC",
  [theme.breakpoints.down("sm")]: {
    fontSize: "14px",
  },
}));

export const SeatingStats = styled(SkyTypography)(() => ({
  fontSize: "0.85rem",
  fontWeight: "bold",
  color: "#0052cc",
}));

export const StageBar = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#FFFFFF",
  padding: theme.spacing(2),
  textAlign: "center",
  borderRadius: 4,
  marginBottom: theme.spacing(6),
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#475569" : "#94a3b8",
  width: "90%",
  margin: "0 auto 40px auto",
}));

export const StageText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.9rem",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "1.5px",
  color: theme.palette.mode === "dark" ? "#cbd5e1" : "#475569",
}));

export const SeatingArea = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#ced4da",
  padding: theme.spacing(2),
  borderRadius: 4,
  position: "relative",
  minHeight: 400,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  [theme.breakpoints.down("lg")]: {
    padding: theme.spacing(2),
  },
}));

export const SeatingGridContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  width: "100%",
}));

export const SeatingRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  width: "100%",
  [theme.breakpoints.down("lg")]: {
    gap: theme.spacing(1),
  },
}));

export const RowLabel = styled(SkyTypography)(({ theme }) => ({
  width: 20,
  fontSize: "0.9rem",
  fontWeight: "bold",
  color: theme.palette.text.primary,
  textAlign: "center",
}));

export const SeatList = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flex: 1,
  justifyContent: "space-between",
  gap: theme.spacing(1),
  width: "100%",
}));

export const SeatItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "assigned" && prop !== "itemType" && prop !== "disabled",
})(({ theme, assigned, itemType, disabled }) => ({
  flex: 1,
  aspectRatio: "1.75",
  width: "100%",
  border: assigned 
    ? (itemType === 'organization_unit' ? "1px solid #2563eb" : (itemType === 'guest' || itemType === 'guest_group' ? "1px solid #059669" : "1px solid #1e40af")) 
    : "2px dashed #0052cc",
  borderRadius: 8,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: assigned 
    ? (itemType === 'organization_unit' ? "#3b82f6" : (itemType === 'guest' || itemType === 'guest_group' ? "#10b981" : "#1d4ed8")) 
    : (theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF"),
  cursor: disabled ? "default" : "pointer",
  transition: "all 0.2s",
  position: "relative",
  gap: theme.spacing(0.5),
  boxShadow: assigned ? "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" : "none",
  ...(!disabled && {
    "&:hover": {
      backgroundColor: assigned 
        ? (itemType === 'organization_unit' ? "#2563eb" : (itemType === 'guest' || itemType === 'guest_group' ? "#059669" : "#1e40af")) 
        : (theme.palette.mode === "dark" ? "#334155" : "#f8fafc"),
      borderColor: assigned 
        ? (itemType === 'organization_unit' ? "#1d4ed8" : (itemType === 'guest' || itemType === 'guest_group' ? "#047857" : "#1e3a8a")) 
        : "#0041a3",
    },
  }),
  "& svg": {
    fontSize: "1.8rem",
    color: theme.palette.text.secondary,
    [theme.breakpoints.down("md")]: {
      fontSize: "1.4rem",
    },
  },
  [theme.breakpoints.down("md")]: {
    borderRadius: 6,
  },
}));

export const StyledPersonAddIcon = styled(PersonAddIcon)(({ theme }) => ({
  fontSize: "1.8rem",
  color: theme.palette.text.secondary,
  [theme.breakpoints.down("md")]: {
    fontSize: "1.4rem",
  },
}));

export const UnassignButton = styled(SkyIconButton)(() => ({
  position: "absolute",
  top: 4,
  right: 4,
  padding: 2,
  color: "#fff",
  backgroundColor: "rgba(255, 255, 255, 0.99)",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  "& svg": {
    fontSize: "1.2rem !important",
    color: "#2538e7ff !important", // Ensure white color on blue background
  },
}));

export const SeatMemberName = styled(SkyTypography)(({ theme }) => ({
  color: "#fff",
  fontSize: "0.85rem",
  fontWeight: "bold",
  textAlign: "center",
  lineHeight: 1.2,
  padding: "0 8px",
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  width: '100%',
  [theme.breakpoints.down("md")]: {
    fontSize: "0.75rem",
  },
}));

export const SeatMemberPosition = styled(SkyTypography)(({ theme }) => ({
  color: "rgba(255, 255, 255, 0.8)",
  fontSize: "0.7rem",
  textAlign: "center",
  lineHeight: 1.2,
  padding: "0 8px",
  [theme.breakpoints.down("md")]: {
    fontSize: "0.6rem",
  },
}));

export const SeatMemberRole = styled(SkyTypography)(({ theme }) => ({
  color: "#fff",
  fontSize: "0.75rem",
  fontWeight: "bold",
  marginTop: theme.spacing(0.5),
  [theme.breakpoints.down("md")]: {
    fontSize: "0.7rem",
    marginTop: theme.spacing(0.25),
  },
}));

export const SeatLabel = styled(SkyTypography)(({ theme, assigned }) => ({
  position: "absolute",
  top: 6,
  left: 8,
  fontSize: "0.7rem",
  fontWeight: 600,
  color: assigned ? "rgba(255, 255, 255, 0.8)" : theme.palette.text.secondary,
  [theme.breakpoints.down("md")]: {
     fontSize: "0.6rem",
     top: 4,
     left: 4,
  }
}));

export const SeatText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.85rem",
  color: theme.palette.text.primary,
  [theme.breakpoints.down("md")]: {
    fontSize: "0.75rem",
  },
}));

export const ColLabelsRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  paddingLeft: 36, 
  marginTop: theme.spacing(4),
  justifyContent: "space-between",
  gap: theme.spacing(1),
  width: "100%",
  "& .col-label": {
    flex: 1,
    textAlign: "center",
    fontSize: "0.9rem",
    fontWeight: "bold",
    color: theme.palette.text.primary,
  },
}));

export const LegendContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: theme.spacing(3),
  padding: theme.spacing(2, 0),
  borderTop: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#f1f3f5",
}));

export const LegendList = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(4),
}));

export const LegendCaption = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  fontWeight: "bold",
  color: theme.palette.text.secondary,
  textTransform: "uppercase",
}));

export const LegendItem = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

export const LegendBox = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "variant",
})(({ variant }) => ({
  width: 28,
  height: 24,
  borderRadius: 2,
  border: "1px solid",
  ...(variant === "empty" && {
    borderStyle: "dashed",
    borderColor: "#94a3b8",
  }),
  ...(variant === "unit" && {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  }),
  ...(variant === "person" && {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  }),
  ...(variant === "success" && {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  }),
}));

export const LegendText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.8rem",
  color: theme.palette.text.secondary,
}));

export const AccordionItem = styled(SkyBox)(({ theme }) => ({
  borderBottom: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#f1f3f5",
}));

export const AccordionHeader = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "expanded",
})(({ theme, expanded }) => ({
  padding: theme.spacing(1.5, 2),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  backgroundColor: expanded ? (theme.palette.mode === "dark" ? "#2d3748" : "#f8f9fa") : "transparent",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "#2d3748" : "#f8f9fa",
  },
}));

export const AccordionHeaderTitle = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "isExpanded",
})(({ isExpanded }) => ({
  fontSize: "0.8rem",
  fontWeight: "bold",
  color: isExpanded ? "#0052cc" : "inherit",
}));

export const ParticipantCard = styled(SkyBox)(({ theme }) => ({
  margin: theme.spacing(1, 2),
  padding: theme.spacing(1.5),
  borderRadius: 8,
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#4a5568" : "#e2e8f0",
}));

export const ParticipantName = styled(SkyTypography)(() => ({
  fontSize: "0.85rem",
  fontWeight: "bold",
  color: "#0052cc",
}));

export const ParticipantRole = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
}));

export const ParticipantSubRole = styled(ParticipantRole)(() => ({
  fontSize: "0.7rem",
  marginTop: "2px",
}));

export const StyledExpandLessIcon = styled(ExpandLessIcon)(() => ({
  fontSize: "1.2rem",
}));

export const StyledExpandMoreIcon = styled(ExpandMoreIcon)(() => ({
  fontSize: "1.2rem",
}));

// BOARD CARDS FOR LEFT PANEL
export const BoardSectionLabel = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "mt",
})(({ theme, mt }) => ({
  fontSize: "0.75rem",
  fontWeight: "bold",
  color: theme.palette.text.secondary,
  padding: theme.spacing(1.5, 2, 0.5, 2),
  textTransform: "uppercase",
  marginTop: mt ? theme.spacing(mt) : 0,
}));

export const BoardCard = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "type",
})(({ theme, type }) => ({
  margin: theme.spacing(0.5, 2),
  padding: theme.spacing(1.5),
  borderRadius: 8,
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" 
    ? (type === "chair" ? "rgba(96, 165, 250, 0.3)" : "rgba(74, 222, 128, 0.3)")
    : (type === "chair" ? "#e0eefe" : "#e3f2e6"),
  backgroundColor: theme.palette.mode === "dark"
    ? (type === "chair" ? "rgba(96, 165, 250, 0.1)" : "rgba(74, 222, 128, 0.05)")
    : (type === "chair" ? "#f0f7ff" : "#f1fbf3"),
  display: "flex",
  flexDirection: "column",
  gap: "2px",
}));

export const BoardLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  fontWeight: 500,
  color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.6)" : theme.palette.text.secondary,
}));

export const BoardName = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.85rem",
  fontWeight: "bold",
  color: theme.palette.mode === "dark" ? "#60a5fa" : "#0052cc",
}));

export const EmptyBoardName = styled(BoardName)(() => ({
  color: "#94a3b8",
}));

export const BoardTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
}));

export const EmptyStateWrapper = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  color: theme.palette.text.secondary,
  fontSize: "0.85rem",
  textAlign: "center",
}));

// ASSIGN SEAT MODAL STYLES
export const ModalSubTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.85rem",
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  textTransform: "uppercase",
}));

export const ModalContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(0),
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#f8fafc",
  maxHeight: "70vh",
  overflowY: "auto",
}));

export const MemberSection = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2, 3),
}));

export const SectionLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.8rem",
  fontWeight: "bold",
  color: theme.palette.text.secondary,
  textTransform: "uppercase",
  marginBottom: theme.spacing(1.5),
}));

export const MemberItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "assigned" && prop !== "selected",
})(({ theme, assigned, selected }) => ({
  padding: theme.spacing(1.5, 2),
  borderRadius: 8,
  border: "1px solid",
  borderColor: selected 
    ? (theme.palette.mode === "dark" ? "#60a5fa" : "#0052cc") 
    : (theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"),
  backgroundColor: selected 
    ? (theme.palette.mode === "dark" ? "rgba(96, 165, 250, 0.15)" : "#f0f7ff") 
    : (theme.palette.mode === "dark" ? "#1e293b" : "#fff"),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(1),
  cursor: assigned ? "default" : "pointer",
  "&:hover": {
    borderColor: assigned 
      ? (theme.palette.mode === "dark" ? "#334155" : "#e2e8f0") 
      : (theme.palette.mode === "dark" ? "#60a5fa" : "#0052cc"),
    backgroundColor: !selected && !assigned && theme.palette.mode === "dark" ? "#2d3748" : undefined,
  },
}));

export const MemberInfo = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
}));

export const MemberName = styled(SkyTypography)(({ theme, assigned }) => ({
  fontSize: "0.9rem",
  fontWeight: "bold",
  color: assigned 
    ? theme.palette.text.secondary 
    : (theme.palette.mode === "dark" ? "#60a5fa" : "#0052cc"),
}));

export const MemberRoleText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.8rem",
  color: theme.palette.text.secondary,
}));

export const AssignedBadge = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(34, 197, 94, 0.2)" : "#f0fdf4",
  color: theme.palette.mode === "dark" ? "#4ade80" : "#22c55e",
  padding: "4px 12px",
  borderRadius: 16,
  fontSize: "0.75rem",
  fontWeight: 600,
  border: theme.palette.mode === "dark" ? "1px solid rgba(74, 222, 128, 0.3)" : "none",
}));

export const GroupContainer = styled(SkyBox)(({ theme }) => ({
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#e2e8f0",
  borderRadius: 8,
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#fff",
  marginBottom: theme.spacing(2),
  overflow: "hidden",
}));

export const GroupHeader = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "#2d3748" : "#f8fafc",
  },
}));

export const GroupTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.9rem",
  fontWeight: "bold",
  color: theme.palette.mode === "dark" ? "#cbd5e1" : "#1e293b",
}));

export const GroupStats = styled(SkyTypography)(() => ({
  fontSize: "0.75rem",
  color: "#22c55e",
  fontWeight: 500,
  marginTop: "2px",
}));

export const StyledCheckbox = styled(SkyCheckbox)(() => ({
  padding: 0,
  '&.Mui-checked': {
    color: '#0052cc',
  }
}));

export const GroupHeaderContent = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
  flex: 1,
}));

export const GroupTitleWrapper = styled(SkyBox)(() => ({
  flex: 1,
}));

export const GroupAssignedBadge = styled(AssignedBadge)(({ theme }) => ({
  marginRight: theme.spacing(2),
}));

export const GroupCheckbox = styled(StyledCheckbox)(({ theme }) => ({
  marginRight: theme.spacing(2),
}));

export const StyledModalSubTitle = styled(ModalSubTitle)(({ theme }) => ({
  paddingLeft: theme.spacing(3),
  paddingRight: theme.spacing(3),
  marginBottom: theme.spacing(2),
}));

export const StyledModalContent = styled(ModalContent)(() => ({
  maxHeight: '60vh',
}));

export const TaskIconsContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  justifyContent: 'flex-end',
}));

export const TooltipContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1),
}));

export const TaskDocName = styled(SkyTypography)(() => ({
  fontWeight: 'bold',
}));

export const TaskRemainingCount = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 'bold',
}));

export const AccordionContentWrapper = styled(SkyBox)(() => ({
  flex: 1,
}));

export const AccordionHeaderInner = styled(SkyBox)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

export const TaskIconsWrapper = styled(SkyBox)(() => ({
  // Used to stop propagation
}));


export const StyledInsertDriveFileIcon = styled(SkyBox)(() => ({
  color: '#FBC02D',
  display: 'flex',
  alignItems: 'center',
  '& svg': {
    fontSize: 18,
  }
}));

export const RegisterFormItemWrapper = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

export const StyledTaskActionLink = styled(ActionLink)(() => ({
  marginTop: 0,
  justifyContent: 'flex-end',
  fontSize: '0.75rem',
  minWidth: 'auto',
  marginRight: 0,
}));

export const StyledSmallAddIcon = styled(StyledAddIcon)(() => ({
  fontSize: '1.1rem',
  marginRight: 0,
}));

export const TaskDivider = styled(SkyBox)(({ theme }) => ({
  width: '1px',
  height: '14px',
  backgroundColor: theme.palette.divider,
  margin: theme.spacing(0, 0.5),
}));

export const StyledTaskRemainingCountLabel = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 'bold',
  fontSize: '0.75rem',
  cursor: 'pointer',
  '&:hover': {
    opacity: 0.8,
  }
}));

export const TaskExpandToggleLabel = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 'bold',
  fontSize: '0.75rem',
  cursor: 'pointer',
  marginLeft: theme.spacing(0.5),
  opacity: 0.7,
  '&:hover': {
    opacity: 1,
  }
}));

export const AssignedCountLabel = styled(SkyTypography)(() => ({
  color: '#22c55e',
  fontWeight: 'bold',
  fontSize: '0.75rem',
}));

export const FlexRowBetween = styled(SkyBox)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

export const GuestSection = styled(SkyBox)(({ theme }) => ({
  margin: theme.spacing(1, 2),
  padding: theme.spacing(1.5),
  borderRadius: 8,
  border: "1px solid",
  borderColor: "#0052cc",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(0, 82, 204, 0.1)" : "#f0f7ff",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
}));

export const GuestHeader = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}));

export const GuestTitle = styled(SkyTypography)(() => ({
  fontSize: "0.85rem",
  fontWeight: "bold",
  color: "#333",
}));

export const GuestCount = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  fontWeight: "bold",
  color: theme.palette.success.main,
  marginTop: "2px",
}));

export const GuestList = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
}));



export const UnassignedText = styled(SkyTypography)(({ theme }) => ({
  color: '#ff4d4f',
  fontWeight: 'bold',
  fontSize: '0.75rem',
  marginTop: theme.spacing(0.5),
}));
export const OnlineMeetingPlaceholder = styled(SkyBox)(({ theme }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#e9ecef",
  borderRadius: 4,
  minHeight: 500,
  padding: theme.spacing(4),
  textAlign: "center",
  width: "100%",
}));

export const OnlineMeetingText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.95rem",
  color: theme.palette.text.secondary,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  "& svg": {
    fontSize: "1.2rem",
  }
}));
