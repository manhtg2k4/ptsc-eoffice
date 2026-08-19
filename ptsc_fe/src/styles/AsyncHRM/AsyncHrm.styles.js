import { styled } from "@mui/material/styles";
import { SkyBox, SkyTypography, SkyPaper, SkyButton } from "@styles/SkyStyles";

export const AsyncHRMContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  width: '100%',
  // padding: theme.spacing(2),
}));

export const AsyncHRMHeader = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
}));

 

export const AsyncHRMHeaderRight = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

export const AsyncHRMStatusBox = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#868E96',
  color: '#fff',
  borderRadius: '20px',
  padding: '6px 16px',
  fontSize: '13px',
  fontWeight: 500,
  gap: '8px',
}));

export const AsyncHRMStatusDot = styled(SkyBox)(() => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#4CAF50',
}));

export const AsyncHRMSyncButton = styled(SkyButton)(() => ({
  backgroundColor: '#005B9F',
  color: '#fff',
  borderRadius: '8px',
  padding: '8px 20px',
  fontSize: '14px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  '&:hover': {
    backgroundColor: '#00427A',
  },
}));

export const AsyncHRMStatsContainer = styled(SkyBox)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(1, 1fr)',
  gap: theme.spacing(2),
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'repeat(4, 1fr)',
  },
}));

export const AsyncHRMStatCard = styled(SkyPaper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  gap: theme.spacing(2),
  backgroundColor: '#F3F4F6',
  borderRadius: '8px',
  boxShadow: 'none',
}));

export const AsyncHRMIconBox = styled(SkyBox)(({ bg, col }) => ({
  backgroundColor: bg,
  color: col,
  width: '48px',
  height: '48px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& svg': {
    fontSize: '24px',
  }
}));

export const AsyncHRMStatContent = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
}));

export const AsyncHRMStatValue = styled(SkyTypography)(() => ({
  fontSize: '22px',
  fontWeight: 700,
  color: '#333',
  lineHeight: 1.2,
}));

export const AsyncHRMStatLabel = styled(SkyTypography)(() => ({
  fontSize: '12px',
  color: '#666',
  marginTop: '4px',
}));

// Popup Styles
export const SyncPopupContent = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(4, 2),
  textAlign: 'center',
}));

export const SyncIconWrapper = styled(SkyBox)(({ theme, success }) => ({
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: success ? '#D1E7DD' : '#E2E6EA',
  marginBottom: theme.spacing(3),
  '& svg': {
    fontSize: '40px',
    color: success ? '#0F5132' : '#005B9F',
  }
}));

export const SyncStatusTitle = styled(SkyTypography)(() => ({
  fontSize: '20px',
  fontWeight: 700,
  marginBottom: '8px',
  color: '#212529',
}));

export const SyncStatusSub = styled(SkyTypography)(() => ({
  fontSize: '14px',
  color: '#6C757D',
  marginBottom: '24px',
}));

export const SyncProgressBarContainer = styled(SkyBox)(() => ({
  width: '100%',
  height: '6px',
  backgroundColor: '#E9ECEF',
  borderRadius: '3px',
  overflow: 'hidden',
  marginBottom: '24px',
}));

export const SyncProgressBarFill = styled(SkyBox)(({ progress }) => ({
  width: `${progress}%`,
  height: '100%',
  backgroundColor: '#005B9F',
  transition: 'width 0.3s ease',
}));

export const SyncResultStats = styled(SkyBox)(() => ({
  display: 'flex',
  justifyContent: 'space-around',
  width: '100%',
  marginTop: '16px',
}));

export const SyncResultItem = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

export const SyncResultValue = styled(SkyTypography)(() => ({
  fontSize: '18px',
  fontWeight: 700,
  color: '#212529',
}));

export const SyncResultLabel = styled(SkyTypography)(() => ({
  fontSize: '13px',
  color: '#6C757D',
}));
