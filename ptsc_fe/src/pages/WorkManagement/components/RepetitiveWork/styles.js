import { Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';
import { SkyBox, SkyFormControlLabel, SkyRadioGroup, SkyTypography } from '@styles/SkyStyles';


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

export const StyledRadioGroup = styled(SkyRadioGroup)({
    display: 'grid',
    gridTemplateColumns: 'repeat(4, max-content)',
    gap: '12px 65px',
});

export const StyledFormControlLabel = styled(SkyFormControlLabel)({
    margin: 0,
    '& .MuiFormControlLabel-label': {
        fontSize: '0.875rem',
    },
});

export const DateGridContainer = styled(SkyBox)(({ theme }) => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
    padding: '16px',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '4px',
}));

export const DateCell = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== 'isSelected'
})(({ isSelected, theme }) => ({
    padding: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    border: isSelected ? `1px solid ${theme.palette.divider}` : `1px solid ${theme.palette.divider}`,
    borderRadius: '4px',
    backgroundColor: isSelected ? '#e3f2fd' : 'transparent',

}));

export const RadioContainer = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '8px',
    width: '100%',
});

export const InlineGroup = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
});

export const NarrowInputWrapper = styled('div')({
    width: '80px',
    display: 'inline-block',
    margin: '0 8px',
});

export const StatusBadge = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '142px',
    height: '24px',
    backgroundColor: '#D0FFDE',
    border: '1px solid #ADECC0',
    borderRadius: '22px',
    color: '#007D3E',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'none',
    boxSizing: 'border-box',
});

export const StyleSkyBoxStatus = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: '15px',

});

export const StyleSkyAvatar = styled(Avatar)(() => ({

}));

export const MonthOptionCard = styled(SkyBox)(() => ({
    backgroundColor: '#F4F6F8',
    borderRadius: '8px',
    padding: '12px',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
}));

export const MonthOptionLabel = styled(SkyTypography)({
    fontSize: '0.75rem',
    color: '#8A94A6',
    fontWeight: 600,
    textTransform: 'uppercase',
});

export const MonthlyRadioContainer = styled(RadioContainer)({
    alignItems: 'center',
    flexWrap: 'nowrap',
});

export const LastDayRadioContainer = styled(RadioContainer)({
    height: '100%',
    alignItems: 'center',
});

export const MonthlySkyBoxContainer = styled(StyleSkyBoxContainer)({
    flex: 1,
    width: '100%',
});

export const MonthlyInlineGroup = styled(InlineGroup)({
    width: '100%',
});

export const MonthlyInputWrapper = styled(NarrowInputWrapper)({
    margin: 0,
});
