import { styled } from "@mui/material/styles";
import { 
  SkyBox, 
  SkyTypography, 
  SkyGrid, 
  SkyDivider, 
  SkyButton 
} from "@styles/SkyStyles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import FilterListIcon from "@mui/icons-material/FilterList";
import AddIcon from "@mui/icons-material/Add";
import { Visibility, DeleteOutline } from "@mui/icons-material";
import GroupIcon from '@mui/icons-material/Group';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { SectionHeaderContainer, StyledBoxContainerContent } from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import IconButton from "@mui/material/IconButton";
import EventIcon from '@mui/icons-material/Event';
import { 

  Button as MuiButton,
 
} from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

export const StyledFilterIcon = styled(FilterAltIcon)(({ theme }) => ({
  color: theme.palette.text.secondary,
  cursor: "pointer",
  "&:hover": {
    color: theme.palette.primary.main,
  },
}));
export const BlueFilterIcon = styled(FilterAltIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontSize: '18px',
}));
export const StyledFilterListIcon = styled(FilterAltIcon)(() => ({
  fontSize: 20
}));

export const SmallVisibilityIcon = styled(Visibility)(() => ({
    fontSize: '20px'
}));

export const SmallDeleteIcon = styled(DeleteOutline)(() => ({
    fontSize: '20px',
    color: '#ef4444'
}));

export const FilterPopoverContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2.5),
  width: 340,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));

export const PopoverTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "16px",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  color: theme.palette.mode === 'dark' ? theme.palette.primary.main : "#334155",
}));

export const FilterActions = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  gap: theme.spacing(1.5),
  marginTop: theme.spacing(1),
}));

export const FilterLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 600,
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
}));

// Common Title for Sections with Blue Theme
export const VehicleSectionTitle = styled(SkyTypography)(({ theme, mb }) => ({
  fontSize: "16px",
  fontWeight: "bold",
  color: theme.palette.mode === 'dark' ? theme.palette.primary.main : "#1976d2",
  marginTop: 0,
  marginBottom: mb !== undefined ? theme.spacing(mb) : theme.spacing(2),
}));

// Status Tag Component
export const StatusTag = styled(SkyBox)(() => ({
  backgroundColor: '#fff9c4',
  color: '#fbc02d',
  padding: '4px 16px',
  borderRadius: '16px',
  fontWeight: 'bold',
  fontSize: '12px',
  border: '1px solid #fbc02d',
  display: 'inline-flex',
  alignItems: 'center',
}));

export const StatusLabel = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontStyle: 'italic',
  fontSize: '14px',
}));

export const StatusContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "direction" && prop !== "align",
})(({  align = 'center', direction = 'row' }) => ({
  display: 'flex',
  flexDirection: direction,
  alignItems: align,
  gap: '4px',
}));

// Status Tag Variants
export const SuccessStatusTag = styled(StatusTag)(() => ({
  backgroundColor: '#e8f5e9',
  color: '#2e7d32',
  borderColor: '#2e7d32',
}));

// Header Action Buttons
export const SaveButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: '#1976d2',
  color: '#fff',
  textTransform: 'none',
  paddingLeft: theme.spacing(3),
  paddingRight: theme.spacing(3),
  '&:hover': {
    backgroundColor: '#1565c0',
  },
  '&.Mui-disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
  }
}));

export const TabCancelButton = styled(SkyButton)(() => ({
  backgroundColor: '#d32f2f',
  color: '#fff',
  textTransform: 'none',
  '&:hover': {
    backgroundColor: '#c62828',
  },
}));

export const BlueActionButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  textTransform: 'none',
  marginBottom: theme.spacing(2),
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

// Container spacing
export const HeaderGridContainer = styled(SkyGrid)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

HeaderGridContainer.defaultProps = {
  container: true,
  alignItems: "center",
  justifyContent: "space-between",
};

// Styling for typography inside labels
export const ImportantGuestLabel = styled(SkyTypography)(() => ({
  fontWeight: "bold",
  fontSize: "14px",
}));

ImportantGuestLabel.defaultProps = {
  variant: "body2",
};

// Timeline Components (History)
export const TimelineContainer = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1),
}));

export const TimelineItem = styled(SkyBox)(({ theme, onClick }) => ({
  display: "flex",
  position: "relative",
  paddingBottom: theme.spacing(3),
  cursor: onClick ? 'pointer' : 'default',
}));

export const TimelineLine = styled(SkyBox)(({ theme }) => ({
  position: "absolute",
  left: 10,
  top: 24,
  bottom: -16, // Extend further down
  width: 3, // Slightly thicker
  backgroundColor: theme.palette.primary.main,
  borderRadius: 2,
}));

export const TimelineDotBox = styled(SkyBox)(({ theme }) => ({
  marginRight: theme.spacing(2),
  marginTop: theme.spacing(0.5),
  zIndex: 1,
}));

export const HistoryDot = styled(CheckCircleIcon)(() => ({
  color: "#1976d2",
  fontSize: 22,
  backgroundColor: "#fff",
  borderRadius: "50%",
}));

export const TimelineContent = styled(SkyBox)(() => ({
  flex: 1,
}));

export const TimelineAction = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: "bold",
  fontSize: "14px",
}));

export const TimelineTime = styled(SkyTypography)(({ theme }) => ({
  display: "block",
  marginBottom: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  fontSize: "12px",
}));

export const TimelineProfile = styled(SkyTypography)(() => ({
	fontSize: "14px",
}));

export const TimelineCreatorText = styled(TimelineTime)(({ theme }) => ({
  fontStyle: 'italic',
  color: theme.palette.text.secondary,
  marginBottom: 0
}));

export const TimelineDivider = styled(SkyDivider)(({ theme }) => ({
  marginTop: "16px",
  width: '100%',
  borderColor: theme.palette.divider,
}));

// Car Image Gallery Styling
export const ImageGalleryContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

export const GalleryImageItem = styled(SkyBox)(({ theme }) => ({
  width: '180px',
  height: '150px',
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#E0E0E0',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  border: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  '&:hover': {
    opacity: 0.9,
  },
}));

export const ImageCloseButton = styled(SkyBox)(() => ({
  position: 'absolute',
  top: -8,
  right: -8,
  backgroundColor: '#9E9E9E',
  color: '#FFF',
  borderRadius: '50%',
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: 2,
  '&:hover': {
    backgroundColor: '#757575',
  },
  '& svg': {
    fontSize: '14px',
  }
}));

export const ImagePlaceholderText = styled(SkyTypography)(() => ({
  color: '#757575',
  fontSize: '14px',
}));

export const HiddenInput = styled('input')({
  display: 'none',
});

export const StyledGalleryImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: '4px',
});


// Re-export common layout elements from other styles to maintain consistency but wrap them if needed
export {
  JobMainContent,
  JobSectionTitle, // Standard title if needed
  StyledBoxContainerContent,
  SectionHeaderContainer,
} from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";

export {
  JobButtonContainer,
  JobUploadPlaceholderBox,
  JobPlaceholderText,
  StyledListItemIcon,
  StyledMenuIcon,
} from "@pages/WorkManagement/components/Job.styles";

// Sidebar Tab Styling
export const SidebarTabContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
}));

export const SidebarTabItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ active, theme }) => ({
  width: 40,
  height: 40,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  position: 'relative',
  backgroundColor: active ? (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.2)' : '#e3f2fd') : 'transparent',
  color: active ? '#1976d2' : theme.palette.text.secondary,
  border: active ? '1px solid #1976d2' : '1px solid transparent',
  '&:hover': {
    backgroundColor: active ? (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.3)' : '#e3f2fd') : theme.palette.action.hover,
  },
  '& svg': {
    fontSize: 24,
  }
}));

export const HistorySummaryBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
}));

export const HistorySummaryItem = styled(SkyBox)(({ theme }) => ({
  flex: 1,
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0', // Slightly darker grey for contrast
  borderRadius: 8,
  padding: theme.spacing(1.5),
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  height: 80,
  // border: `1px solid ${theme.palette.divider}`,
}));

export const SummaryLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  marginBottom: '4px',
}));

export const SummaryValue = styled(SkyTypography)(({ theme }) => ({
  fontSize: '18px',
  fontWeight: 'bold',
  color: theme.palette.text.primary,
}));

export const TripListContainer = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
}));

export const TripItemBox = styled(SkyBox)(({ theme, onClick }) => ({
  display: "flex",
  position: "relative",
  paddingBottom: theme.spacing(3),
  cursor: onClick ? 'pointer' : 'default',
}));

export const TripTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: '14px',
  fontWeight: 600,
  color: theme.palette.primary.main,
  marginBottom: '4px',
}));

export const TripDetail = styled(SkyTypography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
}));

export const TripStatus = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "status",
})(({ status }) => {
  let color = '#3b82f6'; // Default blue
  if (status) {
    const s = status.toString().toUpperCase();
    if (s.includes('HOÀN THÀNH') || s.includes('COMPLETED') || s.includes('SUCCESS')) {
      color = '#10b981'; // Green
    } else if (s.includes('HỦY') || s.includes('CANCEL') || s.includes('REJECT')) {
      color = '#ef4444'; // Red
    } else if (s.includes('CHỜ') || s.includes('WAITING') || s.includes('PENDING')) {
      color = '#f59e0b'; // Amber
    }
  }
  return {
    fontSize: '12px',
    marginTop: '4px',
    color: color,
    fontWeight: 500,
  };
});

export const ViewAllLink = styled(SkyTypography)(({ theme }) => ({
  fontSize: '13px',
  color: '#1976d2',
  textAlign: 'center',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: theme.spacing(2),
  '&:hover': {
    textDecoration: 'underline',
  }
}));

// Driver Experience Styling
export const ExperienceContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
}));

export const ExperienceContentBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : '#e5e5e5',
  borderRadius: 8,
  padding: theme.spacing(1.5),
  // border: `1px solid ${theme.palette.divider}`,
}));

export const ExperienceCarTitle = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "mt",
})(({ theme, mt }) => ({
  fontSize: '14px',
  fontWeight: 'bold',
  color: theme.palette.text.primary,
  marginBottom: '4px',
  marginTop: mt ? theme.spacing(mt) : 0,
}));

export const ExperienceDetailText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
}));

export const CenteredJobPlaceholderText = styled(SkyTypography)(({ theme }) => ({
  marginTop: theme.spacing(2),
  textAlign: 'center',
  fontSize: '14px',
  color: '#64748b',
}));

// Health Check Styling
export const StyledAddIcon = styled(AddIcon)(() => ({
  color: '#1976d2',
}));
export const HealthRecordBox = styled(SkyBox)(({ theme }) => ({
   backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : '#e5e5e5',
  borderRadius: 8,
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
  // border: `1px solid ${theme.palette.divider}`,
}));

export const HealthHeaderRow = styled(SkyBox)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '4px',
}));

export const HealthDateText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '14px',
  fontWeight: 'bold',
  color: theme.palette.text.primary,
}));

export const HealthStatusBadge = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "isExpired",
})(({ isExpired }) => ({
  fontSize: '12px',
  color: isExpired ? '#ef4444' : '#10b981',
  fontWeight: 500,
}));

export const HealthDetailRow = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
}));

export const HealthFileLink = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  fontSize: '12px',
  color: '#1976d2',
  cursor: 'pointer',
  '&:hover': {
    textDecoration: 'underline',
  },
  '& svg': {
    fontSize: '16px',
  }
}));

export const HealthDialogContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

export const HealthAttachmentSection = styled(SkyBox)(({ theme }) => ({
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: theme.spacing(2),
  marginTop: theme.spacing(1),
}));

export const HealthAttachmentTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: '15px',
  fontWeight: 'bold',
  color: '#1976d2',
  marginBottom: theme.spacing(1.5),
  textTransform: 'uppercase',
}));

// Coordination Results Styling
export const CoordinationContainer = styled(StyledBoxContainerContent)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const CreatorInfoContainer = styled(StyledBoxContainerContent)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const CoordinationHeader = styled(SectionHeaderContainer)(() => ({
  marginBottom: '12px',
}));

export const CoordinationStatusBadge = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.2)' : '#e8f5e9',
  color: theme.palette.mode === 'dark' ? '#81c784' : '#2e7d32',
  padding: '4px 12px',
  borderRadius: '16px',
  fontWeight: 'bold',
  fontSize: '12px',
  display: 'inline-flex',
  alignItems: 'center',
  border: theme.palette.mode === 'dark' ? '1px solid rgba(46, 125, 50, 0.5)' : 'none',
}));

export const CoordinationSummaryRow = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  padding: theme.spacing(0, 1),
}));

export const SummaryDemand = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: theme.palette.mode === 'dark' ? theme.palette.primary.main : '#1976d2',
  fontWeight: 600,
  fontSize: '14px',
}));

export const SummaryVehicleStats = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  color: theme.palette.text.primary,
  fontSize: '14px',
}));

export const StatItem = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

export const CoordinatedItemBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f8fafc',
  borderRadius: '8px',
  padding: theme.spacing(1.5, 3),
  marginBottom: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.05)',
    borderColor: theme.palette.primary.main,
  }
}));

export const InfoLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: '13px',
  color: theme.palette.text.secondary,
  minWidth: '85px',
  marginRight: '12px',
}));

export const InfoValue = styled(SkyTypography)(({ theme }) => ({
  fontSize: '13px',
  color: theme.palette.text.primary,
}));

export const DriverBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  color: theme.palette.text.primary,
}));

export const ReCoordinateButton = styled(SkyButton)(({ theme }) => ({
  textTransform: 'none',
  padding: '4px 12px',
  fontSize: '13px',
  borderRadius: '6px',
  fontWeight: 500,
  '&:hover': {
     backgroundColor: theme.palette.action.hover,
  }
}));

ReCoordinateButton.defaultProps = {
  variant: "outlined",
  color: "primary",
};

// Styled Icons
export const StyledGroupIcon = styled(GroupIcon)(() => ({
  fontSize: 20,
  color: 'inherit'
}));

export const StyledDirectionsCarIcon = styled(DirectionsCarIcon)(() => ({
  fontSize: 20,
  color: 'inherit'
}));

export const StyledEventSeatIcon = styled(EventSeatIcon)(() => ({
  fontSize: 20,
  color: 'inherit'
}));

export const StyledPersonOutlineIcon = styled(PersonOutlineIcon)(({ theme }) => ({
  fontSize: 22,
  color: theme.palette.text.primary,
}));

// Coordinated Item Sub-components
export const CoordinatedInfoGroup = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}));

export const CapacityBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: theme.palette.text.primary,
}));

export const CoordinatedInfoRow = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
}));

export const CoordinatedValue = styled(InfoValue)(() => ({
  fontWeight: 600,
}));

export const CoordinationItemStatus = styled(SkyTypography)(() => ({
  fontSize: '11px',
  color: '#1976d2',
  fontStyle: 'italic',
  textAlign: 'right',
  marginRight: '12px',
}));

export const ActionGridItem = styled(SkyGrid)(() => ({
  display: 'flex',
  justifyContent: 'flex-end',
}));

ActionGridItem.defaultProps = {
  item: true,
};

export const CoordinatedItemGridContainer = styled(SkyGrid)(() => ({
  alignItems: 'center',
  width: '100%',
  '& .MuiGrid-item': {
    display: 'flex',
    alignItems: 'center',
  }
}));

CoordinatedItemGridContainer.defaultProps = {
  container: true,
};

export const ReCoordinationBox = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '8px',
  padding: theme.spacing(2),
  flex: 1,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : 'transparent',
}));

export const ReCoordinationTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: '14px',
  fontWeight: 'bold',
  color: theme.palette.mode === 'dark' ? theme.palette.primary.main : "#334155",
  marginBottom: theme.spacing(1.5),
  textTransform: 'uppercase',
}));

export const ReCoordinationRow = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(1),
  '&:last-child': {
    marginBottom: 0,
  },
}));

export const ReCoordinationLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: '13px',
  color: theme.palette.text.secondary,
}));

export const ReCoordinationValue = styled(SkyTypography)(({ theme }) => ({
  fontSize: '13px',
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

export const TabButton = styled(SkyButton, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ active, theme }) => ({
  flex: 1,
  textTransform: 'none',
  borderRadius: '4px',
  padding: '8px',
  fontSize: '14px',
  fontWeight: 600,
  backgroundColor: active ? theme.palette.primary.main : (theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff'),
  color: active ? '#fff' : theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  '&:hover': {
    backgroundColor: active ? theme.palette.primary.dark : theme.palette.action.hover,
  },
  '& svg': {
    fontSize: '20px',
  }
}));

export const SelectionTable = styled('table')(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '16px',
  tableLayout: 'auto',
  '& thead': {
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  '& th': {
    textAlign: 'left',
    padding: '10px 12px',
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.action.selected : '#f1f5f9',
    color: theme.palette.text.primary,
    fontSize: '13px',
    fontWeight: 600,
    borderBottom: `1px solid ${theme.palette.divider}`,
    whiteSpace: 'nowrap',
  },
  '& td': {
    padding: '10px 12px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    fontSize: '13px',
    color: theme.palette.text.primary,
    wordBreak: 'break-word',
  },
  '& tr:hover': {
    backgroundColor: theme.palette.action.hover,
  }
}));

export const TableWrapper = styled('div')(() => ({
  width: '100%',
  overflowX: 'auto',
  overflowY: 'auto',
  maxHeight: '520px',
}));

export const SelectButton = styled(SkyButton)(({ theme }) => ({
  textTransform: 'none',
  padding: '4px 12px',
  fontSize: '12px',
  borderRadius: '4px',
  border: `1px solid ${theme.palette.primary.main}`,
  color: theme.palette.primary.main,
  '&:hover': {
     backgroundColor: theme.palette.action.hover,
  }
}));

export const ConfirmButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  textTransform: 'none',
  padding: '6px 24px',
  fontWeight: 'bold',
  borderRadius: '4px',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const ReasonInputArea = styled('textarea')(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(1.5),
  borderRadius: '8px',
  border: `1px solid ${theme.palette.divider}`,
  fontSize: '14px',
  fontFamily: 'inherit',
  resize: 'vertical',
  minHeight: '100px',
  outline: 'none',
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  '&:focus': {
    borderColor: theme.palette.primary.main,
  },
  '&::placeholder': {
    color: theme.palette.text.disabled,
  }
}));

export const ConfirmDialogContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1),
}));

export const ConfirmInfoRow = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  marginBottom: theme.spacing(1.5),
  fontSize: '14px',
  alignItems: 'flex-start'
}));

export const ConfirmInfoLabel = styled(SkyTypography)(({ theme }) => ({
  minWidth: '220px',
  color: theme.palette.text.primary,
  fontWeight: 500,
  fontSize: '14px',
}));

export const ConfirmInfoValue = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 600,
  flex: 1,
  fontSize: '14px',
}));

export const CoordinatedSummaryMini = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: theme.spacing(2.5),
  paddingTop: theme.spacing(1),
  marginBottom: theme.spacing(1.5),
}));

export const CoordinatedCardMini = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.action.hover : '#f8fafc',
  borderRadius: '8px',
  padding: theme.spacing(1.5, 2),
  marginBottom: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
}));

export const CoordinatedCardInfo = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  width: '180px',
}));

export const CoordinatedCardCapacity = styled(SkyTypography)(({ theme }) => ({
  width: '80px',
  color: theme.palette.text.primary,
  fontSize: '13px',
  textAlign: 'left'
}));

export const CoordinatedCardDetail = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flex: 1,
  color: theme.palette.text.primary,
  fontSize: '13px',
}));

export const RedCancelButton = styled(SkyButton)(() => ({
  backgroundColor: '#ff0000',
  color: '#fff',
  textTransform: 'none',
  padding: '6px 24px',
  fontWeight: 'bold',
  borderRadius: '4px',
  '&:hover': {
    backgroundColor: '#cc0000',
  },
}));
export const SummaryBoxFlex = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

export const ActionButtonsContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
}));

export const PlateValue = styled('strong')(() => ({
  textDecoration: 'underline',
}));

export const SmallConfirmButton = styled(ConfirmButton)(() => ({
  padding: '6px 12px',
  fontSize: '12px',
  minWidth: 'auto',
}));

export const CardInfoTitle = styled(ConfirmInfoValue)(() => ({
  marginBottom: 0,
}));

export const CardInfoLabel = styled(ConfirmInfoLabel)(() => ({
  fontWeight: 400,
  color: '#64748b',
}));

export const StyledPhoneIcon = styled(LocalPhoneIcon)(() => ({
  fontSize: '18px',
  color: '#1976d2',
}));

// Driver popover item
export const DriverPopoverItem = styled(SkyBox)(({ theme }) => ({
  padding: '10px 16px',
  cursor: 'pointer',
  borderBottom: `1px solid ${theme.palette.divider}`,
  fontSize: 14,
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const DriverPopoverName = styled('span')(() => ({
  fontWeight: 500,
}));

export const DriverPopoverSub = styled('span')(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.secondary,
}));

// Empty coordination row placeholder
export const EmptyTableCell = styled('td')(({ theme }) => ({
  textAlign: 'center',
  color: theme.palette.text.disabled,
  padding: '16px',
}));

// Placeholder text for driver replacement column (not yet chosen)
export const UnselectedText = styled('span')(({ theme }) => ({
  color: theme.palette.text.disabled,
  fontSize: 13,
}));

// Red delete icon button for coordination result table
export const DeleteIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const BlueHeaderPopoverContainer = styled(SkyBox)(() => ({
  width: 520,
  display: "flex",
  flexDirection: "column",
}));

export const BlueHeaderPopoverTitle = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper, 
  color: theme.palette.text.primary,
  padding: theme.spacing(1.5, 2.5),
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
  gap: '8px',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const PopoverHeaderText = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '16px',
  color: theme.palette.text.primary,
}));

export const QuickDateRow = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(2.5),
}));

export const QuickDateItem = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  padding: '6px 12px',
  borderRadius: '4px',
  color: theme.palette.text.primary,
  '&:hover': {
     backgroundColor: theme.palette.action.hover,
  }
}));

export const DateInputsRow = styled(SkyBox)(({ theme }) => ({
   display: 'flex',
   alignItems: 'center',
   gap: theme.spacing(1.5),
   marginBottom: theme.spacing(2.5),
}));

export const FilterActionsSpaced = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  marginTop: theme.spacing(3),
}));

// NEW STYLED COMPONENTS TO REMOVE INLINE STYLES
export const WhiteEventIcon = styled(EventIcon)(() => ({
  color: '#fff'
}));

export const DarkEventIcon = styled(EventIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const QuickDateText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '14px',
  color: theme.palette.text.primary,
}));

export const PopoverContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2.5),
  backgroundColor: theme.palette.background.paper,
}));

export const DateRangeLabel = styled(FilterLabel)(() => ({
  width: '110px',
  marginBottom: 0
}));
export const DateRangeInputGroup = styled(SkyBox)(() => ({
  flex: 1,
  display: 'flex',
  gap: '16px'
}));

export const FilterOutlinedButton = styled(MuiButton)(({ theme }) => ({
  textTransform: 'none',
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
  fontWeight: 400,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    // border: `1px solid ${theme.palette.primary.main}`,
    // color: theme.palette.primary.main,
  }
}));
FilterOutlinedButton.defaultProps = {
  variant: "outlined",
};

export const FilterApplyButton = styled(MuiButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  textTransform: 'none',
  padding: '6px 20px',
  fontWeight: 400,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  }
}));
FilterApplyButton.defaultProps = {
  variant: "contained",
};

export const NotificationBadge = styled(SkyBox)(() => ({
  position: 'absolute',
  top: 6,
  right: 6,
  width: 8,
  height: 8,
  backgroundColor: '#ef4444',
  borderRadius: '50%',
  border: '1.5px solid #fff'
}));

export const FlexGapBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5)
}));

