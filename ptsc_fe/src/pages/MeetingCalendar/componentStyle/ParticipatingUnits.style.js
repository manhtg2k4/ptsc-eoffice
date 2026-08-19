import { styled } from "@mui/material/styles";
import { SvgIcon, InputAdornment } from "@mui/material";
import { Warning as WarningIcon, Info as InfoIcon } from "@mui/icons-material";
import { 
  SkyBox, 
  SkyTypography, 
  SkyCheckbox, 
  SkyIconButton, 
  SkyDialog, 
  SkyDialogTitle, 
  SkyDialogContent, 
  SkyGrid 
} from "@styles/SkyStyles";

export const DialogContainer = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  height: "80vh",
});

export const LeftPanel = styled(SkyBox)(({ theme }) => ({
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: "16px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.paper,
}));

export const RightPanel = styled(SkyBox)(({ theme }) => ({
  padding: "16px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.paper,
}));

export const TreeItemContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'level',
})(({ theme, level }) => ({
  display: "flex",
  alignItems: "center",
  paddingTop: theme.spacing(0.5),
  paddingBottom: theme.spacing(0.5),
  paddingRight: theme.spacing(1),
  paddingLeft: theme.spacing(level * 3 + 1),
  transition: 'all 0.3s ease',
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:hover": {
    backgroundColor: theme.palette.action.hover
  }
}));

export const TreeItemLabel = styled(SkyTypography, {
  shouldForwardProp: (prop) => !['isRightPanel', 'isSelected', 'isUser'].includes(prop),
})(({ isRightPanel, isSelected, theme, isUser }) => ({
  flexGrow: 1,
  cursor: isRightPanel && !isSelected ? 'default' : 'pointer',
  userSelect: 'none',
  fontSize: '14px',
  color: isUser ? theme.palette.primary.main : (isRightPanel && !isSelected ? theme.palette.text.secondary  : "inherit"),
  fontWeight: isRightPanel && !isSelected ? 600 : 400,
  display: 'flex',
  alignItems: 'center',
  '& > .MuiIconButton-root': {
    marginRight: theme.spacing(0.5),
  }
}));

export const ParticipantName = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})(({ theme, isUser }) => ({
  fontSize: "14px",
  color: isUser ? theme.palette.primary.main : "inherit",
  fontWeight: isUser ? 500 : 400,
}));

export const StyledCheckbox = styled(SkyCheckbox)(({ theme }) => ({
  color: theme.palette.primary.main,
  "&.Mui-checked": {
    color: theme.palette.primary.main,
  },
  "&.Mui-disabled": {
    color: theme.palette.action.disabled,
  },
  padding: '4px'
}));

export const ExpandIconButton = styled(SkyIconButton, {
  shouldForwardProp: (prop) => prop !== 'hasChildren',
})(({ theme, hasChildren }) => ({
  visibility: hasChildren ? 'visible' : 'hidden',
  width: 28,
  height: 28,
  padding: '4px',
  marginLeft: '8px',
  color: theme.palette.text.primary,
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: '20px',
  }
}));

export const PanelHeaderTitle = styled(SkyTypography)({
  flexGrow: 1,
  fontWeight: 'bold',
});

export const PanelHeaderTitleRight = styled(SkyTypography)(() => ({
  flexGrow: 1,
  fontWeight: 'bold',
}));

export const PanelHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.action.hover,
}));

export const PanelHeaderActions = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const PanelHeaderActionText = styled(SkyTypography)(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  fontWeight: 'bold',
}));

export const PanelHeaderSecondaryTitle = styled(SkyTypography)({
  width: 100,
  textAlign: 'center',
  fontWeight: 'bold',
});

export const PanelContent = styled(SkyBox)({
  flexGrow: 1,
  overflowY: "auto",
  maxHeight: '450px'
});

export const RightPanelContent = styled(SkyBox)({
  flexGrow: 1,
  overflowY: "auto",
  maxHeight: '380px'
});

export const CenteredBox = styled(SkyBox)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '200px'
});

export const EmptyStateText = styled(SkyTypography)({
  color: 'text.secondary',
  fontStyle: 'italic'
});

export const StatusText = styled(SkyTypography)({
  color: 'text.secondary',
});

export const SearchBarContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  gap: '8px',
  marginBottom: theme.spacing(2),
  '& .MuiInputBase-root': {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    '& fieldset': {
      borderColor: theme.palette.divider,
    },
  },
}));

const baseButtonStyles = {
  border: 'none',
  padding: '10px 16px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: '500',
  color: 'white',
};

export const SaveButton = styled('button')(({ theme }) => ({
  ...baseButtonStyles,
  backgroundColor: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const CloseButton = styled('button')(({ theme }) => ({
  ...baseButtonStyles,
  backgroundColor: theme.palette.error.main,
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
  },
}));

export const StyledDialogReceivingUnit = styled(SkyDialog)(({ theme }) => ({
    "& .MuiDialog-paper": {
        maxWidth: theme.breakpoints.values.xl,
        width: "100%",
    },
}));

export const PanelHeaderLeft = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.action.hover,
}));

export const PanelHeaderRight = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== "dialogKey",
})(({ theme, dialogKey }) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding:
        dialogKey === "externalDepartment"
            ? theme.spacing(1, 1)
            : theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: '#0566AF',
    color: theme.palette.common.white
}));

export const StyledBoxQuickSelectUser = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const LeftPanelHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1, 0),
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(1),
}));

export const HeaderCol = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  fontSize: "13px",
  color: theme.palette.text.primary,
  flexGrow: 1,
}));

export const RoleHeaderCol = styled(HeaderCol)(() => ({
  width: 100,
  textAlign: "center",
  flexGrow: 0,
  whiteSpace: "nowrap",
}));

export const StyledDialogTitle = styled(SkyDialogTitle)(({ theme }) => ({
  fontWeight: 'bold',
  color: theme.palette.text.primary,
}));

export const StyledDialogContent = styled(SkyDialogContent)(() => ({
  padding: '0 !important',
}));

export const StyledMainGridContainer = styled(SkyGrid)(() => ({
  height: "100%",
}));

export const RoleColumn = styled(SkyBox)(() => ({
  width: 100,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexShrink: 0,
}));

export const RoleCheckBox = styled(SkyCheckbox)(({ theme }) => ({
  padding: theme.spacing(0.5),
  '&.Mui-checked': {
    color: theme.palette.primary.main,
  },
  '&.Mui-disabled': {
    color: 'rgba(0, 0, 0, 0.26) !important',
    '&.Mui-checked': {
      color: 'rgba(0, 0, 0, 0.26) !important',
    }
  }
}));

export const SelectedTableContainer = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "4px",
  overflowY: "auto",
  maxHeight: "450px",
}));

export const SelectedTable = styled('table')(({ theme }) => ({
  width: "100%",
  borderCollapse: "collapse",
  backgroundColor: theme.palette.background.paper,
}));

export const SelectedTh = styled('th')(({ theme }) => ({
  backgroundColor: "#0062ac",
  color: "white",
  padding: theme.spacing(1.5, 1),
  fontSize: "13px",
  border: `1px solid #005a9e`,
  textAlign: "center",
  position: "sticky",
  top: 0,
  zIndex: 1,
}));

export const SelectedThSTT = styled(SelectedTh)({
  width: 50,
});

export const SelectedThRole = styled(SelectedTh)({
  width: 120,
});

export const SelectedThAction = styled(SelectedTh)({
  width: 80,
});

export const SelectedTd = styled('td')(({ theme }) => ({
  padding: theme.spacing(1.5, 1),
  fontSize: "14px",
  border: `1px solid ${theme.palette.divider}`,
  textAlign: "left",
  color: theme.palette.text.primary,
}));

export const SelectedTdCenter = styled(SelectedTd)({
  textAlign: "center",
});

export const SelectedTdSTT = styled(SelectedTdCenter)({
  width: 50,
});

export const RoleLabelBadge = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== 'roleType',
})(({ roleType }) => ({
  fontWeight: "bold",
  fontSize: "13px",
  textAlign: "center",
  color: roleType === 'chair' ? '#d32f2f' : roleType === 'secretary' ? '#ed6c02' : '#1976d2',
}));

export const ActionIconButton = styled(SkyIconButton)(({ theme }) => ({
  padding: 4,
  '&:hover': {
    color: theme.palette.error.main,
  },
  '& .MuiSvgIcon-root': {
    fontSize: '20px',
  },
}));

export const PanelTitleHeader = styled(SkyTypography)(({ theme }) => ({
  fontSize: "1.25rem",
  fontWeight: "bold",
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
}));

export const SearchField = styled(SkyBox)(({ theme }) => ({
  position: 'relative',
  marginBottom: theme.spacing(3),
  maxWidth: 400,
  '& .MuiInputBase-root': {
    borderRadius: 8,
    backgroundColor: '#fff',
    '& fieldset': {
      borderColor: '#e0e0e0',
    },
  },
}));

export const FooterActions = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
}));

export const PrimaryButton = styled('button')(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: 'white',
  padding: '8px 24px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const DangerButton = styled('button')(() => ({
  backgroundColor: '#d32f2f',
  color: 'white',
  padding: '8px 24px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px',
  '&:hover': {
    backgroundColor: '#b71c1c',
  },
}));

export const SearchBoxWrapper = styled(SkyBox)({
  width: '100%',
});

export const StyledSearchIcon = styled(SvgIcon, {
  shouldForwardProp: (prop) => prop !== 'hasError',
})(({ theme, hasError }) => ({
  color: hasError ? theme.palette.error.main : theme.palette.action.active,
  fontSize: '20px !important',
}));

export const SearchErrorText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.error.main,
  display: 'block',
  marginTop: theme.spacing(0.5),
  marginLeft: theme.spacing(0.5),
  fontSize: '12px',
}));

export const SearchStartAdornment = styled(InputAdornment)({});
SearchStartAdornment.defaultProps = { position: 'start' };

export const DuplicateWarningDialog = styled(SkyDialog)(() => ({
  '& .MuiDialog-paper': {
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    overflow: 'hidden', // to match the colored header with rounded corners
  }
}));

export const DuplicateWarningHeader = styled(SkyBox)(() => ({
  backgroundColor: '#FFF4E5',
  padding: '16px 24px',
  display: 'flex',
  flexDirection: 'column',
}));

export const DuplicateWarningTitleBox = styled(SkyBox)({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '8px',
  justifyContent: 'space-between',
});

export const DuplicateWarningTitleInnerBox = styled(SkyBox)({
  display: 'flex',
  alignItems: 'center',
  color: '#B25E00',
  gap: '8px',
});

export const DuplicateWarningTitleText = styled(SkyTypography)({
  fontWeight: 'bold',
  fontSize: '1.25rem',
});

export const DuplicateWarningDescription = styled(SkyTypography)({
  color: '#B25E00',
  fontSize: '0.875rem',
});

export const DuplicateWarningContent = styled(SkyDialogContent)(() => ({
  padding: '24px !important', // override !important from base if any
}));

export const DuplicateWarningListTitle = styled(SkyTypography)(({ theme }) => ({
  marginBottom: '16px',
  fontWeight: 'bold',
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
  textTransform: 'uppercase',
}));

export const DuplicateParticipantList = styled(SkyBox)({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
});

export const DuplicateParticipantItem = styled(SkyBox)({
  display: 'flex',
  alignItems: 'center',
  padding: '12px',
  backgroundColor: '#F8FAFC',
  borderRadius: '8px',
});

export const DuplicateParticipantAvatarBox = styled(SkyBox)({
  position: 'relative',
  marginRight: '16px',
});

export const DefaultAvatarCircle = styled(SkyBox)({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  backgroundColor: '#E2E8F0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#64748B',
  fontWeight: 'bold',
  fontSize: '1.2rem',
});

export const WarningBadge = styled(SkyBox)({
  position: 'absolute',
  bottom: '-4px',
  right: '-4px',
  backgroundColor: '#FFF',
  borderRadius: '50%',
  width: '18px',
  height: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const DuplicateParticipantInfo = styled(SkyBox)({
  flex: 1,
});

export const DuplicateParticipantName = styled(SkyTypography)({
  fontWeight: 'bold',
  fontSize: '1rem',
});

export const DuplicateParticipantMeetingInfo = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}));

export const DuplicateTag = styled(SkyBox)({
  backgroundColor: '#FEF3C7',
  color: '#B45309',
  padding: '4px 12px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 'bold',
});

export const DuplicateWarningInfoBox = styled(SkyBox)({
  marginTop: '24px',
  padding: '16px',
  backgroundColor: '#EFF6FF',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'flex-start',
});

export const DuplicateWarningInfoText = styled(SkyTypography)({
  color: '#1E3A8A',
  fontSize: '0.875rem',
  lineHeight: 1.5,
});

export const DuplicateWarningActions = styled(SkyBox)({
  padding: '0 24px 24px 24px',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '16px',
});

export const DuplicateWarningCancelBtn = styled('button')({
  borderRadius: '8px',
  padding: '8px 24px',
  border: '1px solid #CBD5E1',
  backgroundColor: '#FFF',
  color: '#334155',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '0.875rem',
  '&:hover': {
    borderColor: '#94A3B8',
    backgroundColor: '#F8FAFC',
  },
});

export const DuplicateWarningContinueBtn = styled('button')({
  borderRadius: '8px',
  padding: '8px 24px',
  border: 'none',
  backgroundColor: '#0066CC',
  color: '#FFF',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '0.875rem',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  '&:hover': {
    backgroundColor: '#0052A3',
  },
});

export const DuplicateParticipantAvatar = styled('img')({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
});

export const DuplicateWarningIcon = styled(WarningIcon)({
  marginRight: '8px',
});

export const DuplicateWarningIconSmall = styled(WarningIcon)({
  fontSize: '14px',
  color: '#F59E0B',
});

export const DuplicateInfoIcon = styled(InfoIcon)({
  color: '#3B82F6',
  marginRight: '8px',
  marginTop: '4px',
  fontSize: '20px',
});
