import { styled } from "@mui/material/styles";
import { Box, Typography} from "@mui/material";

export const ColumnActions = styled(Box)({
  display: "flex", 
  gap: 2, 
  alignItems: "center"
});

export const ColumnActionsV2 = styled(Box)({
  display: "flex", 
  alignItems: "center",
  gap: 1, 
});

export const ColumnActionsTypography = styled(Typography)({
  fontWeight: "bold" 
});

export const ColumnActionsV3 = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  transition: 'background-color 0.2s',
  minHeight: 80,
  p: 2,
});

export const ColumnActionsV4 = styled(Box)(({ isminHeight, iscursor, istransition, isborder, iswidth, ismaxWidth }) => ({
  minHeight: isminHeight,
  cursor: iscursor,
  transition: istransition,
  border: isborder,
  width: iswidth,
  maxWidth: ismaxWidth
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
}));
