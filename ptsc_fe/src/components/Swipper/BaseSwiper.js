import React, { useState, useContext, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { IconButton, useMediaQuery, Menu, Box } from "@mui/material";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  BoxContained,
  AppBarWrapper,
  // Title,
  Body,
  TitleContainer,
  ButtonStack,
  Backdrop,
  StyledToolbarSwipper,
  MoreIconButton,
  StyledMobileMenuItem,
  StyledBreadcrumbs,
  // MainTitle,
  HeaderInnerContainer,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbCurrent,
  FooterWrapper,
	BackIconV2,
	BreadcrumbsFromNotification,
} from "@styles/BaseSwiper/BaseSwiper.style";
import { NotificationContext } from "../NotificationContext";
import { setCurrentSwiperTitle, clearCurrentSwiperTitle } from "@redux/slices/layoutSlice";

const BreadcrumbItem = ({ crumb, onClick }) => {
  const handleClick = (e) => {
    e.preventDefault();
    onClick(crumb.path);
  };

  if (crumb.path) {
    return (
      <BreadcrumbLink onClick={handleClick}>
        {crumb.title}
      </BreadcrumbLink>
    );
  }
  return <span>{crumb.title}</span>;
};

BreadcrumbItem.propTypes = {
  crumb: PropTypes.shape({
    title: PropTypes.string,
    path: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

const BackArrowIconSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);
BackArrowIconSvg.displayName = "BackArrowIconSvg";

const BaseSwiper = (props) => {
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
    hideBackdrop = false,
    forceDesktopActions = false,
    type,
    bodyVariant,
    noneOverflow,
    nonePadding,
    footer,
    footerVariant = "default",
    onBreadcrumbClick,
    setReloadData,
  } = props;

  const dispatch = useDispatch();
  const { isFromNotification } = useContext(NotificationContext) || {};

  // Lấy text tiêu đề để đồng bộ vào Redux
  const textTitle = useMemo(() => {
    if (typeof title === 'string') return title;
    return "";
  }, [title]);

  // Đồng bộ tiêu đề Swiper hiện tại vào Redux
  useEffect(() => {
    if (open && textTitle) {
      dispatch(setCurrentSwiperTitle(textTitle));
    }
    return () => {
      if (open && textTitle) {
        dispatch(clearCurrentSwiperTitle());
      }
    };
  }, [dispatch, open, textTitle]);

  const handleBackClick = useCallback((e) => {
    e.preventDefault();
    onClose();
  }, [onClose]);

  const isSidebarOpen = useSelector((state) => state.layout.isSidebarOpen);
  const currentPageBreadcrumb = useSelector((state) => state.layout.currentPageBreadcrumb || []);
  const sidebarWidth = isSidebarOpen ? initialSidebarWidth : 60;

  const navigate = useNavigate();

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

  const handleBreadcrumbClick = (path) => {
    if (onBreadcrumbClick) {
      onBreadcrumbClick(path);
      return;
    }
    if (setReloadData && typeof setReloadData === 'function') {
      try {
        setReloadData((prev) => {
          if (typeof prev === 'number') {
            return prev + 1;
          }
          return new Date() * 1;
        });
      } catch (e) {
        setReloadData(new Date() * 1);
      }
    }
    if (!path) return;

    if (path === "CLOSE_SWIPER") {
      onClose();
      return;
    }

    onClose();
    navigate(path);
  };

  // Helper function to extract text from title for comparison
  const getTitleText = (titleProp) => {
    if (typeof titleProp === 'string') {
      return titleProp;
    }
    if (React.isValidElement(titleProp)) {
      const child = titleProp.props.children;
      if (Array.isArray(child)) {
        return child
          .filter(c => typeof c === 'string')
          .join(' ');
      }
      if (typeof child === 'string') {
        return child;
      }
      if (child && typeof child === 'object' && child.props && child.props.children) {
        const nestedChild = child.props.children;
        if (typeof nestedChild === 'string') return nestedChild;
        if (Array.isArray(nestedChild)) {
          return nestedChild.filter(c => typeof c === 'string').join(' ');
        }
      }
    }
    return '';
  };

  // Render breadcrumbs: ưu tiên prop string (legacy), fallback về Redux
  const renderBreadcrumbs = () => {
    if (isFromNotification) {
      return (
        <BreadcrumbsFromNotification variant="caption">
          <IconButton edge="start" onClick={handleBackClick} disabled={isLoading}>
						<BackIconV2 />
          </IconButton>
          {title && <BreadcrumbCurrent>{title}</BreadcrumbCurrent>}
        </BreadcrumbsFromNotification>
      );
    }

    // Legacy: prop breadcrumbs là string
    if (props.breadcrumbs && typeof props.breadcrumbs === "string") {
      return (
        <StyledBreadcrumbs variant="caption">
          {props.breadcrumbs}
        </StyledBreadcrumbs>
      );
    }

    const activeBreadcrumb = (props.breadcrumbs && Array.isArray(props.breadcrumbs) && props.breadcrumbs.length > 0)
      ? props.breadcrumbs
      : currentPageBreadcrumb;

    // Dynamic: đọc từ Redux hoặc custom array + append title hiện tại
    if (activeBreadcrumb && activeBreadcrumb.length > 0) {
      const breadcrumbData = activeBreadcrumb.length > 1 ? activeBreadcrumb.slice(1) : activeBreadcrumb;
      const currentTitle = getTitleText(title)?.toLowerCase();
      const filteredBreadcrumb = breadcrumbData.filter((crumb, idx) => {
        if (idx === breadcrumbData.length - 1) {
          return crumb.title?.toLowerCase() !== currentTitle;
        }
        return true;
      });

      return (
        <StyledBreadcrumbs variant="caption">
          {filteredBreadcrumb.map((crumb) => {
            const key = crumb.path || crumb.title;
            return (
              <React.Fragment key={key}>
                <BreadcrumbItem crumb={crumb} onClick={handleBreadcrumbClick} />
                <BreadcrumbSeparator>
                  <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.19526 0.195157C0.43934 -0.0489226 0.82534 -0.0639828 1.08719 0.149584L1.13797 0.195157L5.13796 4.19517C5.39829 4.4555 5.39829 4.8775 5.13796 5.13784L1.13797 9.13784C0.87762 9.39824 0.455613 9.39824 0.19526 9.13784C-0.0650867 8.8775 -0.0650867 8.4555 0.19526 8.19517L3.72389 4.6665L0.19526 1.13786L0.149687 1.08708C-0.0638796 0.825237 -0.0488133 0.439231 0.19526 0.195157Z" fill="#2364B0" fillOpacity="0.7" />
                  </svg>
                </BreadcrumbSeparator>
              </React.Fragment>
            );
          })}
          {title && <BreadcrumbCurrent>{title}</BreadcrumbCurrent>}
        </StyledBreadcrumbs>
      );
    }
    // Fallback: không có breadcrumb → chỉ hiển thị title để header không bị trống
    if (title) {
      return (
        <StyledBreadcrumbs variant="caption">
          <BreadcrumbCurrent>{title}</BreadcrumbCurrent>
        </StyledBreadcrumbs>
      );
    }
    return null;
  };

  if (!open) return null;

  const handleStopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <Backdrop hideBackdrop={hideBackdrop}>
      <BoxContained
        sidebarWidth={sidebarWidth}
        onKeyDown={handleKeyDown}
        onClick={handleStopPropagation}
      >
        <AppBarWrapper appBarColor={appBarColor}>
          <StyledToolbarSwipper>
            <HeaderInnerContainer>
              <TitleContainer>
                {showCloseIcon && !isFromNotification && !props.breadcrumbs && !(currentPageBreadcrumb && currentPageBreadcrumb.length > 0) && (
                  <IconButton edge="start" onClick={onClose} disabled={isLoading}>
                    <BackIconV2 />
                  </IconButton>
                )}
                {renderBreadcrumbs()}
              </TitleContainer>
            </HeaderInnerContainer>
            <Box>
              {moreActions && (() => {
                const shouldRenderDesktopActions = !isMobile || forceDesktopActions;
                if (shouldRenderDesktopActions) {
                  return <ButtonStack direction="row" spacing={2}>{moreActions}</ButtonStack>;
                }
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
        {footer && <FooterWrapper footerVariant={footerVariant}>{footer}</FooterWrapper>}
      </BoxContained>
    </Backdrop>
  );
};

BaseSwiper.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
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
  bodyVariant: PropTypes.string,
  noneOverflow: PropTypes.bool,
  nonePadding: PropTypes.bool,
  footerVariant: PropTypes.oneOf(["default", "templateSample"]),
  onBreadcrumbClick: PropTypes.func,
  setReloadData: PropTypes.func,
};

export default BaseSwiper;
