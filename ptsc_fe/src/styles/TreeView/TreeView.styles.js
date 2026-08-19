import { styled } from "@mui/material";
import { SkyBox, SkyGrid, SkyTypography, SkyIconButton } from "@styles/SkyStyles";

export const BoxContainer = styled(SkyBox)(({ theme }) => ({
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "6px",
    padding: theme.spacing(1),
    height: "100%",
}));

export const StyleBox = styled(SkyBox)(({ theme }) => ({
    padding: theme.spacing(1),
}));

export const StyleTypography = styled(SkyTypography)(() => ({
    padding: "10px 0",
}));

export const StyleFormButtonBox = styled(SkyGrid)(() => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
}));

export const StyleSkyGrid = styled(SkyGrid)(({ theme }) => ({
    display: "flex",
    justifyContent: "flex-end",
    gap: theme.spacing(1),
}));

export const TreeContainer = styled(SkyBox)(({ theme }) => ({
    height: 600,
    width: "100%",
    paddingTop: theme.spacing(1),
    boxSizing: "border-box",
    contain: "layout paint",
    [theme.breakpoints.down("md")]: {
        height: "auto",
        minHeight: 420,
    },
}));

export const TreeNodeContentContainer = styled(SkyBox)(({ theme }) => ({
    display: "flex",
    alignItems: "stretch",
    gap: "12px",
    width: "100%",
    flexWrap: "nowrap",
    [theme.breakpoints.down("sm")]: {
        flexWrap: "wrap",
    },
}));

export const TreeNodeWrapper = styled(SkyBox)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#F9FAFB",
    color: "#2F3841",
    border: "1px solid #B9C2CA",
    padding: "8px 16px 8px 38px",
    width: "auto",
    flex: "1 1 auto",
    maxWidth: 533,
    minWidth: 0,
    minHeight: 44,
    boxSizing: "border-box",
    borderRadius: "10px",
    position: "relative",
    "&::before": {
        content: '""',
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "25px",
        background: "rgba(35, 100, 176, 0.2)",
        borderTopLeftRadius: "10px",
        borderBottomLeftRadius: "10px",
    },
    [theme.breakpoints.down("sm")]: {
        maxWidth: "100%",
    },
}));

export const TreeNodeTitleInput = styled("input")(() => ({
    border: "none",
    background: "transparent",
    width: "100%",
    color: "#2F3841",
    fontSize: 14,
    fontWeight: 500,
    outline: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
}));

export const TreeNodeActionsWrapper = styled(SkyBox)(() => ({
    display: "flex",
    gap: 6,
}));

export const TreeNodeIconButton = styled(SkyIconButton)(() => ({
    width: 28,
    height: 28,
    padding: 0,
    borderRadius: 4,
    backgroundColor: "transparent",
    color: "#5A6573",
    "&:hover": {
        backgroundColor: "rgba(0,0,0,0.05)",
    },
    "& svg": {
        fontSize: 18,
    },
}));

export const GlobalTreeStyles = `
  * {
    box-sizing: border-box !important;
  }
  .rst__line {
    border-color: #000 !important;
  }

  .rst__rowContents {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    position: relative !important;
  }

  .rst__rowLabel {
    padding-right: 0 !important;
    padding-left: 0 !important;
    flex: 1 1 auto !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  .rst__moveHandle {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    width: 36px !important;
    height: 100% !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    cursor: grab !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 5 !important;
    padding: 0 !important;
  }

  .rst__moveHandle * {
    display: none !important;
  }

  .rst__moveHandle:active {
    cursor: grabbing !important;
  }

  .rst__lineChildren::after {
    display: none !important;
  }

  .rst__placeholder,
  .rst__rowPlaceholder,
  .rst__landingPad,
  .rst__rowLandingPad,
  .rst__virtualScrollHolder,
  [class*="placeholder"],
  [class*="landingPad"] {
    max-width: 100% !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }

  div[style*="border"][style*="dashed"],
  .rst__tree * {
    outline: none !important;
  }

  .rst__placeholder * {
    display: none !important;
  }
`;

export const StyleBoxNode = styled(SkyBox)(() => ({
    flex: 1,
    marginRight: 8,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
}));

export const TreeNodeDuration = styled(SkyBox)(() => ({
    width: 122,
    minWidth: 122,
    height: 44,
    flexShrink: 0,
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F9FAFB",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#2F3841",
    whiteSpace: "nowrap",
    border: "1px solid #B9C2CA",
}));

export const StyledTreeNodeContentColumn = styled(SkyBox)(() => ({
    display: "flex",
    flexDirection: "column",
    width: "100%",
}));

export const StyledTreeNodeDependencyText = styled(SkyTypography)(() => ({
    color: "#666",
    fontSize: "12px",
    marginTop: "4px",
    fontStyle: "normal",
    display: "block",
    maxWidth: "350px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
}));
