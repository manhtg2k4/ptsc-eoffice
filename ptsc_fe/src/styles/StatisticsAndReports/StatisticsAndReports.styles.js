import { styled } from "@mui/material/styles"
import { RadioGroup } from '@mui/material'

import { SkyBox, SkyButton, SkyTypography, SkyPaper, SkySectionTitle } from "@styles/SkyStyles"
import { StyleBoxInput } from '@styles/CustomTable.styles'
 
export const PageContainer = styled(SkyBox)(() => ({
    display: 'flex',
    flexDirection: 'column',
    padding: '0 1px',
    
}))

export const TabContainer = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1, 0),
    overflowX: 'auto',
    '&::-webkit-scrollbar': {
        display: 'none',
    },
    scrollbarWidth: 'none',
}))

export const TabButton = styled(SkyButton, {
    shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
    borderRadius: '10px',
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    border: active ? 'none' : `1px solid ${theme.palette.divider}`,
    backgroundColor: active ? theme.palette.primary.main : theme.palette.background.paper,
    color: active ? theme.palette.primary.contrastText : theme.palette.text.primary,
    boxShadow: active ? '0 4px 12px rgba(25, 118, 210, 0.2)' : 'none',

    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    whiteSpace: 'nowrap',
    minWidth: 'fit-content',
}))
 

export const  StyleTitle = styled(SkyTypography)(({ theme }) => ({
    fontSize: '20px',
    fontWeight: 600,
    textTransform: 'uppercase',
    lineHeight: '30px',
    color: theme.palette.text.primary,
    marginBottom:'15px',
}))

export const SectionPaper = styled(SkyPaper)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    borderRadius: theme.spacing(1),
    padding: 0,
    boxShadow: 'none',
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: 'transparent',
}))

export const ResultPaper = styled(SkyPaper)(({ theme }) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: theme.spacing(1),
    minHeight: 480,
    boxShadow: 'none',
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: 'transparent',
}))

export const SectionTitle = styled(SkyTypography)(({ theme }) => ({
    padding: theme.spacing(2, 2, 0, 2),
    marginBottom: theme.spacing(2),
    fontWeight: 600,
    textTransform: 'uppercase',
    color: theme.palette.text.primary,
}))

export const ResultTitle = styled(SkyTypography)(({ theme }) => ({
    fontWeight: 600,
    textTransform: 'uppercase',
    color: theme.palette.primary.main,
}))

export const ResultHeaderBox = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
}))

export const ExportButton = styled(SkyButton)(({ theme }) => ({
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
    '&:hover': {
        backgroundColor: theme.palette.success.dark,
    },
}))

export const StatisticBoxInput = styled(StyleBoxInput)(({ theme }) => ({
    maxWidth: 500,
    padding: theme.spacing(0, 2, 2, 2),
    '& .MuiInputBase-root': {
        height: '41px',
    }
}))

export const FilterHeaderBox = styled(SkyBox)(({ theme }) => ({
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    cursor: 'pointer', 
    padding: theme.spacing(1, 2)
}))

export const FilterCollapseBox = styled(SkyBox)(({ theme }) => ({
    marginTop: theme.spacing(1)
}))

export const FilterSectionTitle = styled(SkySectionTitle)(({ theme }) => ({
    marginTop: 0,
    marginBottom: 0,
    fontWeight: 600,
    textTransform: 'uppercase',
    color: theme.palette.text.primary,
}))



export const RadioFilterContainer = styled(RadioGroup)(({ theme }) => ({
    display: 'inline-flex',
    flexDirection: 'row',
    backgroundColor: theme.palette.background.paper,
    borderRadius: '25px',
    padding: '2px 16px',
    gap: '10px',
    border: `1px solid ${theme.palette.divider}`,
    alignItems: 'center',
    marginLeft: '20px',
    '& .MuiFormControlLabel-root': {
        margin: 0,
        gap: '8px',
    },
    '& .MuiTypography-root': {
        fontSize: '14px',
        fontWeight: 600,
        color: theme.palette.text.secondary,
        textTransform: 'none',
    },
    '& .Mui-checked + .MuiTypography-root': {
        color: theme.palette.text.primary,
    },
    '& .MuiRadio-root': {
        padding: '4px',
    }
}))

export const StyledFilterTitleBox = styled(SkyBox)(() => ({
    display: 'flex', 
    alignItems: 'center',
}))
