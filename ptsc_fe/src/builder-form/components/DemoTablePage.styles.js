import { styled } from "@mui/material/styles";
import { Box } from "@mui/material";
export const FormContainerDemo = styled(Box)(({ effectiveDisplayType }) => ({
  overflow: effectiveDisplayType === 'swiper' ? 'auto' : 'unset',
  height: effectiveDisplayType === 'swiper' ? '90vh' : '100%',
}));