import { styled } from '@mui/material/styles';
import { StyleSkyAvatar } from '@pages/WorkManagement/components/RepetitiveWork/styles';
import { SkyBox, SkyTypography } from '@styles/SkyStyles';

export const StyleSkyBoxContainer = styled(SkyBox)({
    display: 'flex', flex: '1 1 200px', gap: '8px', alignItems: 'center', minWidth: 0
});

export const StyleSkyBox = styled(SkyBox)(({ flx, mWidth }) => ({
    flex: flx,
    minWidth: mWidth,
}));

export const StyleTypography = styled(SkyTypography)({
    whiteSpace: 'nowrap',
});

export const ProfileHeaderContainer = styled(StyleSkyBoxContainer)(({ theme }) => ({
    padding: '24px',
    backgroundColor: theme.palette?.background?.paper || '#fff',
    gap: '24px',
    borderBottom: `1px solid ${theme.palette?.divider || '#e0e0e0'}`,
}));

export const ProfileAvatarBox = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
});

export const ProfileInfoBox = styled(StyleSkyBox)({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
});

export const ProfileName = styled(SkyTypography)({
    fontSize: '1.25rem',
    fontWeight: 700,
    marginBottom: '4px',
});

export const ProfileSubInfo = styled(StyleTypography)(({ theme }) => ({
    fontSize: '0.875rem',
    color: theme.palette?.text?.secondary || '#666',
}));

export const InfoSectionContainer = styled(SkyBox)(({ theme }) => ({
    padding: '24px',
    backgroundColor: theme.palette?.background?.paper || '#fff',
}));

export const InfoGrid = styled(SkyBox)(({ theme }) => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    rowGap: '24px',
    columnGap: '48px',
    [theme.breakpoints?.down?.('md') || '@media (max-width:960px)']: {
        gridTemplateColumns: '1fr',
    },
}));

export const InfoItemContainer = styled(SkyBox)({
    display: 'flex',
    alignItems: 'flex-start',
});

export const InfoLabel = styled(StyleTypography)(({ theme }) => ({
    width: '180px',
    minWidth: '180px',
    color: theme.palette?.text?.secondary || '#666',
    fontSize: '0.875rem',
    fontWeight: 500,
}));

export const InfoValue = styled(SkyTypography)(({ theme }) => ({
    flex: 1,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: theme.palette?.text?.primary || '#333',
    wordBreak: 'break-word',
}));

export const StyleAvatar = styled(StyleSkyAvatar)(() => ({
    width: 100,
    height: 100,
    fontSize: '32px',
    fontWeight: 'bold',
    bgcolor: '#00529C',  
    color: '#fff'
}));

 