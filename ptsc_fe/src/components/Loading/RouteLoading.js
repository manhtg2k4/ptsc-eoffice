import { CircularProgress, keyframes } from "@mui/material";
import { styled } from "@mui/material/styles";
import { SkyBox } from "@styles/SkyStyles";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleIn = keyframes`
  from { transform: scale(0.95); }
  to { transform: scale(1); }
`;

export const RouteOverlay = styled(SkyBox)(({ theme, isFixed }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
  backgroundColor: theme.palette.mode === 'light' 
    ? (isFixed ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.95)")
    : (isFixed ? "rgba(18, 18, 18, 0.7)" : "rgba(30, 30, 30, 0.9)"),
  backdropFilter: isFixed ? "blur(8px)" : "blur(2px)",
  animation: `${fadeIn} 0.3s ease-out, ${scaleIn} 0.3s ease-out`,
}));

export const RouteLoading = (props) => (
  <RouteOverlay {...props}>
    <CircularProgress size={40} />
  </RouteOverlay>
);

export default RouteLoading;
