import styled from 'styled-components';

export const MainWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 90px);
  overflow: hidden;
`;

export const CanvasWrapper = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
`;

export const CanvasArea = styled.div`
  flex: 1;
  background: #eef0f2;
  background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
  background-size: 24px 24px;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 40px 20px;
`;

export const PageSheet = styled.div`
  width: 100%;
  max-width: 1024px;
  min-height: 100%;
  background: #fff;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  position: relative;
`;

export const LayoutBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: ${props => (props.$isSidebar ? 'row' : 'column')};
  width: 100%;
  min-height: 0;
`;

export const HeaderArea = styled.div`
  display: flex;
  flex-direction: ${props => (props.$isSidebar ? 'column' : 'row')};
  justify-content: space-between;
  align-items: center;
  padding: ${props => (props.$isSidebar ? '30px 10px' : '15px 30px')};
  border-bottom: ${props => (!props.$isSidebar ? '1px solid #eee' : 'none')};
  border-right: ${props => (props.$headerPos === 'left' && props.$isSidebar ? '1px solid #eee' : 'none')};
  border-left: ${props => (props.$headerPos === 'right' && props.$isSidebar ? '1px solid #eee' : 'none')};
  position: relative;
  width: ${props => (props.$isSidebar ? `${props.$sidebarWidth}px` : '100%')};
  min-width: ${props => (props.$isSidebar ? `${props.$sidebarWidth}px` : 'auto')};
  max-width: ${props => (props.$isSidebar ? `${props.$sidebarWidth}px` : '100%')};
  flex-shrink: 0;
  min-height: ${props => (props.$isSidebar ? '0' : 'auto')};
  z-index: 10;
  background-color: ${props => props.$headerBgColor || '#fff'};
  background-image: ${props => (props.$headerBgImage ? `url(${props.$headerBgImage})` : 'none')};
  background-size: cover;
  background-position: center;
  cursor: pointer;
  outline: ${props => (props.$isSelected ? '2px solid #0B5FFF' : '1px dashed transparent')};
  outline-offset: -2px;
  transition: all 0.2s;
  opacity: ${props => (props.$isHidden ? 0.5 : 1)};
  order: ${props => (props.$headerPos === 'right' ? 2 : 0)};
`;

export const AreaLabel = styled.div`
  position: absolute;
  top: ${props => (props.$isBot ? 'auto' : 0)};
  bottom: ${props => (props.$isBot ? 0 : 'auto')};
  right: 0;
  background: #f1f5f9;
  color: #64748b;
  font-size: 10px;
  padding: 2px 6px;
  font-weight: 600;
  z-index: 11;
  pointer-events: none;
`;

export const HeaderInner = styled.div`
  display: flex;
  flex-direction: ${props => (props.$isSidebar ? 'column' : 'row')};
  align-items: center;
  gap: ${props => (props.$isSidebar ? `${props.$menuSpacing * 1.5}px` : 'clamp(10px, 2vw, 30px)')};
  width: 100%;
`;

export const LogoBox = styled.div`
  display: flex;
  flex-direction: ${props => (props.$isSidebar ? 'column' : 'row')};
  align-items: center;
  gap: 10px;
`;

export const LogoImage = styled.img`
  width: ${props => `${props.$logoWidth}px`};
  height: ${props => (props.$logoHeight === 'auto' ? 'auto' : `${props.$logoHeight}px`)};
  object-fit: contain;
`;

export const LogoText = styled.h3`
  margin: 0;
  color: #1e293b;
  font-size: 18px;
`;

export const NavItemsWrapper = styled.div`
  display: flex;
  flex-direction: ${props => (props.$isSidebar ? 'column' : 'row')};
  gap: ${props => `${props.$menuSpacing}px`};
  align-items: center;
  width: ${props => (props.$isSidebar ? '100%' : 'auto')};
  margin-left: ${props => (props.$isSidebar ? 0 : '20px')};

  /* Unified mobile/desktop logic from .edit-desktop-nav */
  overflow-x: auto;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  padding-bottom: 4px;

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #999;
  }

  @media (max-width: 1024px) {
    display: none !important;
  }
`;

export const MenuItemBox = styled.div`
  font-size: ${props => props.$fSize}px;
  text-decoration: none;
  color: ${props => (props.$isActive ? '#0062AD' : props.$tabTextColor)};
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${props => (props.$isSidebar ? '10px 4px' : '0 0 4px 0')};
  border-radius: ${props => (props.$isSidebar ? '6px' : 0)};
  background-color: ${props => (props.$isSidebar && props.$isActive ? 'rgba(0, 98, 173, 0.08)' : 'transparent')};
  border-bottom: ${props => (!props.$isSidebar && props.$isActive ? '2px solid #0062AD' : '2px solid transparent')};
  white-space: nowrap;
  flex-shrink: 0;
  position: relative;
  width: ${props => (props.$isSidebar ? '100%' : 'auto')};
  cursor: pointer;
`;

export const ActiveIndicator = styled.div`
  position: absolute;
  left: ${props => (props.$headerPos === 'left' ? '-10px' : 'auto')};
  right: ${props => (props.$headerPos === 'right' ? '-10px' : 'auto')};
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background-color: #0062AD;
  border-radius: 0 4px 4px 0;
`;

export const SVGIconWrapper = styled.div`
  width: ${props => (props.$isSidebar ? 24 : 20)}px;
  height: ${props => (props.$isSidebar ? 24 : 20)}px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => (props.$isActive ? '#0062AD' : props.$tabIconColor)};
  margin-bottom: 5px;
`;

export const IconImage = styled.img`
  width: ${props => (props.$isSidebar ? 24 : 20)}px;
  height: ${props => (props.$isSidebar ? 24 : 20)}px;
  object-fit: contain;
  margin-bottom: 5px;
`;

export const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  order: ${props => (props.$headerPos === 'right' ? 1 : 1)};
`;

export const SectionArea = styled.div`
  border-bottom: ${props => (props.$bBot ? '1px solid #eee' : 'none')};
  border-top: ${props => (props.$bTop ? '3px solid #FF1E00' : 'none')};
  position: relative;
  cursor: pointer;
  width: 100%;
  outline: ${props => (props.$isSelected ? '2px solid #0B5FFF' : '1px dashed transparent')};
  outline-offset: -2px;
  transition: all 0.2s;
  opacity: ${props => (props.$isHidden ? 0.5 : 1)};
  z-index: ${props => props.$zIdx || 1};
  max-width: ${props => props.$mWid || 'none'};
`;

export const TopicNavBar = styled.div`
  background: ${props => props.$surface || '#ffffff'};
  width: 100%;
`;

export const TopicNavInner = styled.div`
  padding: 0 20px;
`;

export const TopicNavList = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 0;
`;

export const TopicNavButton = styled.button`
  border: 0;
  background: ${props => (props.$isActive ? (props.$activeTone || '#0f62fe') : 'transparent')};
  color: ${props => (props.$isActive ? (props.$activeInk || '#ffffff') : (props.$ink || '#1f2937'))};
  font-size: 14px;
  font-weight: ${props => (props.$isActive ? 700 : 600)};
  line-height: 1.2;
  padding: 10px 14px;
  // border-radius: 8px;
  white-space: nowrap;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => (props.$isActive ? (props.$activeTone || '#0b57df') : (props.$hoverTone || '#eff6ff'))};
    color: ${props => (props.$isActive ? (props.$activeInk || '#ffffff') : (props.$hoverInk || '#0f62fe'))};
  }
`;

export const MobileMenuOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
`;

export const MobileMenuContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  background: #fff;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
  padding: 20px;
  display: flex;
  flex-direction: column;
  animation: slideInLeft 0.3s ease-out;

  @keyframes slideInLeft {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }
`;

export const MobileMenuHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

export const MobileMenuContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
`;

export const MobileMenuItem = styled.a`
  text-decoration: none;
  color: ${props => (props.$isActive ? '#0062AD' : '#333')};
  font-weight: 500;
  padding: 10px;
  border-radius: 6px;
  background: ${props => (props.$isActive ? '#f0f9ff' : 'transparent')};
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
`;

export const BodyArea = styled.div`
  flex: 1;
  padding: 30px;
  position: relative;
  background-color: ${props => props.$bg || '#eff8ff'};
`;

export const BlocksGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
  min-height: 100px;
`;

export const EmptyState = styled.div`
  width: 100%;
  text-align: center;
  color: #94a3b8;
  padding: 40px;
  border: 2px dashed #e2e8f0;
  border-radius: 8px;
`;

export const RightSidebar = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: ${props => (props.$isOpen ? '380px' : 0)};
  background: #fff;
  border-left: ${props => (props.$isOpen ? '1px solid #e2e8f0' : 'none')};
  display: flex;
  flex-direction: column;
  z-index: 1000;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  transform: ${props => (props.$isOpen ? 'translateX(0)' : 'translateX(380px)')};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &.open {
    /* Optional: any specific styles when open */
  }

  @media (max-width: 640px) {
    width: min(300px, 92vw) !important;
    padding: 12px !important;
  }
`;

export const SidebarContent = styled.div`
  width: 380px;
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  box-sizing: border-box;
`;

export const DragOverlayItem = styled.div`
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #0B5FFF;
  border-radius: 8px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
  width: 220px;
`;

export const DragOverlayBlock = styled.div`
  width: 400px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  opacity: 0.9;
`;

export const DragHeader = styled.div`
  display: flex;
  align-items: center;
  background: #30313F;
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px 4px 0 0;
  font-size: 13px;
  font-weight: 600;
`;

export const DragPreviewBody = styled.div`
  border: 2px solid #30313F;
  border-top: none;
  border-radius: 0 0 4px 4px;
  background: #fff;
  overflow: hidden;
  max-height: 200px;
`;

export const DragScaleWrapper = styled.div`
  pointer-events: none;
  transform: scale(0.8);
  transform-origin: top left;
  width: 125%;
`;

export const PlusText = styled.div`
  color: #0B5FFF;
  font-weight: bold;
  font-size: 18px;
`;

export const DragLabel = styled.div`
  font-weight: 600;
  color: #333;
`;

export const DragHandleIcon = styled.span`
  margin-right: 8px;
  opacity: 0.7;
`;
