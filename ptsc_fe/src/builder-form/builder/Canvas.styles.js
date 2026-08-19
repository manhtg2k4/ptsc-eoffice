import { styled } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';

// Container chính cho Canvas, nơi các phần tử được kéo thả vào
export const CanvasContainer = styled(Box)({
  flex: 1,
  minHeight: 400,
  width: '100%',
  overflow: 'auto',
});

// Box hiển thị khi Canvas rỗng
export const EmptyCanvasPlaceholder = styled(Box)(({ theme }) => ({
  border: `1px dashed ${theme.palette.divider}`,
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: theme.palette.mode === 'light' ? '#f9f9f9' : theme.palette.action.hover,
  color: theme.palette.text.secondary,
  fontStyle: 'italic',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 150,
  height: '100%',
}));

// Icon trong placeholder
export const PlaceholderIcon = styled(AddBoxOutlinedIcon)(({ theme }) => ({
  fontSize: 40,
  marginBottom: theme.spacing(1),
  opacity: 0.6,
}));

// Text trong placeholder
export const PlaceholderText = styled(Typography)({});

export const PlaceholderBox = styled(Box)({
  display: 'flex',
  flexDirection: 'column', 
  justifyItems: 'space-between',
  width:'100%'
});