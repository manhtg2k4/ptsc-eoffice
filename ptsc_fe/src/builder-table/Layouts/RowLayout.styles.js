import { styled } from '@mui/material/styles';
import { Box, Grid, Stack, Typography } from '@mui/material';

export const ColumnActionsStack = styled(Stack)({
  direction: 'row',
  alignItems: 'start',
  justifyContent: 'space-between',
  mb: 1,
  padding: 0,
});

export const RowActionsTypography = styled(Typography)({
  fontWeight: 'bold',
});

export const RowActionsBox = styled(Box)({
  pb: 2,
  mb: 1,
  display: 'flex',
  gap: 2,
  flexWrap: 'wrap',
  alignItems: 'center',
});

export const RowActionsBoxV2 = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 1,
});

export const RowActionsBoxV3 = styled(Box)({
  display: 'flex',
  alignItems: 'center',
});

export const RowActionsTypographyV2 = styled(Typography)({
  fontWeight: 500,
  minWidth: 110,
});

export const RowActionsTypographyV3 = styled(Typography)({
  color: 'textSecondary',
});

export const RowActionsGrid = styled(Grid)({
  transition: 'background-color 0.2s',
});


export const ColumnGridItem = styled(Grid)(({ dragOverId, chId, mode }) => ({
  minHeight: 50,
  cursor: mode === 'builder' ? 'grab' : 'default',
  transition: 'background-color 0.2s',
  border: dragOverId === chId ? '2px dashed #3f51b5' : 'none',
  pr: 2,
}));

export const EmptyColumnBox = styled(Box)(({ dragOverId, mode }) => ({
  textAlign: 'center',
  color: '#aaa',
  minHeight: 80,
  border: dragOverId === null && mode === 'builder' ? '2px dashed #3f51b5' : 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  pr: 2,
}));