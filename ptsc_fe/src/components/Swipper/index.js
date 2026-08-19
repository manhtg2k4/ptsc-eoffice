import React, {useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";
import { IconButton, Typography,  useMediaQuery, Menu, Box } from "@mui/material";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  BoxContained,
  AppBarWrapper,
  Title,
  Body,
  TitleContainer,
  ButtonStack,
  Backdrop,
	BackIcon,
	StyledToolbarSwipper,
	MoreIconButton,
	StyledMobileMenuItem,
} from "@styles/AppBar/Appbar.style";

const Swipper = (props) => {
  const {
    children,
    open,
    onClose,
    title,
    onSave = () => { },
    onDelete,
    disableSave = false,
    isLoading = false,
    onKeyDown,
    appBarColor = "primary",
    sidebarWidth: initialSidebarWidth = 300,
    showCloseIcon = true,
    customActions,
    moreActions,
    canProcess = false,
    canReturn = false,
    onlySave,
    hideBackdrop = false, // Thêm prop hideBackdrop
    forceDesktopActions = false,
    type,
    bodyVariant, // NEW: Prop for Body variant (e.g., 'calendar')
		noneOverflow,
		nonePadding
  } = props;

  const isSidebarOpen = useSelector((state) => state.layout.isSidebarOpen);
  const sidebarWidth = isSidebarOpen ? initialSidebarWidth : 60;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  void onDelete;
  void customActions;
  void canProcess;
  void canReturn;
  void onlySave;
  void type;

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };


  const handleKeyDown = (event) => {
    if (onKeyDown) {
      onKeyDown(event);
      return;
    }

    if (event.key === "Escape") {
      onClose();
    } else if (
      event.key === "Enter" &&
      event.ctrlKey &&
      !disableSave &&
      !isLoading
    ) {
      onSave();
    }
  };

  if (!open) return null;

  const handleStopPropagation = (e) => {
    e.stopPropagation()
  }


  return (
    <Backdrop hideBackdrop={hideBackdrop}>
      <BoxContained
        // ref={swipperRef}
        sidebarWidth={sidebarWidth}
        onKeyDown={handleKeyDown}
        onClick={handleStopPropagation}
      >
        <AppBarWrapper appBarColor={appBarColor}>
          <StyledToolbarSwipper>
            <TitleContainer>
              {showCloseIcon && (
                <IconButton edge="start" onClick={onClose} disabled={isLoading}>
                  <BackIcon />
                  {/* <CloseIcon /> */}
                </IconButton>
              )}
              <Typography
                variant="h6"
                component={Title}
                showCloseIcon={showCloseIcon}
                noWrap
              >
                {title}
              </Typography>
            </TitleContainer>
						<Box>
              {moreActions && (() => {
                const shouldRenderDesktopActions = !isMobile || forceDesktopActions;
                if (shouldRenderDesktopActions) {
                  return <ButtonStack direction="row" spacing={2}>{moreActions}</ButtonStack>;
                }
                // mobile + not forced -> render compact vertical menu
                return (
                  <>
                    <MoreIconButton
                      aria-label="more"
                      aria-controls="more-actions-menu"
                      aria-haspopup="true"
                      onClick={handleMenuClick}
                    >
                      <MoreVertIcon />
                    </MoreIconButton>
                    <Menu
                      id="more-actions-menu"
                      anchorEl={anchorEl}
                      open={menuOpen}
                      onClose={handleMenuClose}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                    >
                      {React.Children.map(moreActions, (child) => (
                        <StyledMobileMenuItem 
                          onClick={handleMenuClose}
                        >
                          {child}
                        </StyledMobileMenuItem>
                      ))}
                    </Menu>
                  </>
                );
              })()}
						</Box>

          </StyledToolbarSwipper>
        </AppBarWrapper>

        <Body variant={bodyVariant} noneOverflow={noneOverflow} nonePadding={nonePadding}>{children}</Body>
      </BoxContained>
    </Backdrop>
  );
};

Swipper.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  onSave: PropTypes.func,
  onDelete: PropTypes.func,
  disableSave: PropTypes.bool,
  isLoading: PropTypes.bool,
  onKeyDown: PropTypes.func,
  appBarColor: PropTypes.string,
  sidebarWidth: PropTypes.number,
  showCloseIcon: PropTypes.bool,
  customActions: PropTypes.node,
  moreActions: PropTypes.node,
  children: PropTypes.node,
  onTrinhKy: PropTypes.func,
  onLuuVaDong: PropTypes.func,
  onLuu: PropTypes.func,
  onDeXuatXuLy: PropTypes.func,
  onChuyenXuLy: PropTypes.func,
  onTraLai: PropTypes.func,
  canProcess: PropTypes.bool,
  canReturn: PropTypes.bool,
	onlySave: PropTypes.bool,
  screenType: PropTypes.oneOf(["incoming", "outgoing"]),
  type: PropTypes.string,
  forceDesktopActions: PropTypes.bool,
  bodyVariant: PropTypes.string, // NEW: Variant for Body component
	noneOverflow: PropTypes.bool,
	nonePadding: PropTypes.bool,
};

export default Swipper;
