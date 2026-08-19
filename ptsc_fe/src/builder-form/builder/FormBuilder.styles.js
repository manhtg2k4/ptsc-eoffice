import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

// Container chính bao bọc toàn bộ FormBuilder
export const FormBuilderContainer = styled(Box)({
  display: 'flex',
});

// Wrapper cho khu vực Sidebar
export const SidebarWrapper = styled(Box)({
  minWidth: '15%',
});

// Wrapper cho khu vực Canvas
export const CanvasWrapper = styled(Box)(({ theme }) => ({
  width: '85%',
  display: 'flex',
  height: '85vh',
  overflow: 'auto',
  paddingBottom: theme.spacing(2),
}));