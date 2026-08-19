import { SkyBox, SkyTypography, SkyIconButton } from "@styles/SkyStyles";
import { styled } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";

const InfoItemContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(1.5),
}));

const IconWrapper = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(0.3),
}));

const ContentWrapper = styled(SkyBox)(() => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "6px",
}));

const LabelTypography = styled(SkyTypography)(() => ({
  color: '#94A3B8',
  fontSize: '0.8125rem',
  fontWeight: '600',
}));

const ValueContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

const ValueTypography = styled(SkyTypography)(() => ({
  fontWeight: '600',
  fontSize: '1rem',
  color: '#31383F'
}));
const ClickableValueTypography = styled(ValueTypography)(({ theme }) => ({
  color: theme.palette.primary.main,
  cursor: "pointer",
  "&:hover": {
    textDecoration: "underline",
  },
}));

const StyledVisibilityIcon = styled(VisibilityIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const InfoItem = ({ icon, label, value, showView = false, onValueClick }) => {
  return (
    <InfoItemContainer>
      <IconWrapper>{icon}</IconWrapper>
      <ContentWrapper>
        <LabelTypography variant="body1">{label}</LabelTypography>
        <ValueContainer>
          {onValueClick ? (
            <ClickableValueTypography variant="body1" component="div" onClick={onValueClick}>
              {value || "--"}
            </ClickableValueTypography>
          ) : (
            <ValueTypography variant="body1" component="div">{value || "--"}</ValueTypography>
          )}
          {showView && value && (
            <SkyIconButton size="small" onClick={onValueClick}>
              <StyledVisibilityIcon />
            </SkyIconButton>
          )}
        </ValueContainer>
      </ContentWrapper>
    </InfoItemContainer>
  );
};

export default InfoItem;
