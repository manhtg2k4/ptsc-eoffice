import scStyled from 'styled-components';
import Link from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimLink";
import React from 'react';

export const PreviewContainer = scStyled.div`
  font-family: sans-serif;
  min-height: calc(100vh - 60px);
  background: ${props => props.$bgVal || "#eff8ff"};
  display: flex;
  flex-direction: ${props => (props.$isSidebar ? "row" : "column")};
  width: 100%;
  box-sizing: border-box;

  * { box-sizing: border-box; }
`;

export const Header = scStyled.header`
  display: flex;
  flex-direction: ${props => (props.$isSidebar ? "column" : "row")};
  justify-content: space-between;
  align-items: center;
  padding: ${props => (props.$isSidebar ? "30px 0" : "15px 30px")};
  border-bottom: ${props => (!props.$isSidebar ? "1px solid #eee" : "none")};
  border-right: ${props => (props.$headerPos === "left" && props.$isSidebar ? "1px solid #eee" : "none")};
  border-left: ${props => (props.$headerPos === "right" && props.$isSidebar ? "1px solid #eee" : "none")};
  box-shadow: ${props => (props.$isSidebar ? "2px 0 5px rgba(0,0,0,0.05)" : "0 2px 5px rgba(0,0,0,0.05)")};
  position: ${props => (
    props.$headerPos === "middle"
      ? "relative"
      : props.$isSidebar
        ? "sticky"
        : (props.$isFixed || props.$headerPos === "top" ? "sticky" : "relative")
  )};
  top: 0;
  order: ${props => (props.$headerPos === "right" && props.$isSidebar ? 2 : 0)};
  height: ${props => (props.$isSidebar ? "calc(100vh - 130px)" : "auto")};
  width: ${props => (props.$isSidebar ? `${props.$sidebarWidth}px` : "100%")};
  min-width: ${props => (props.$isSidebar ? `${props.$sidebarWidth}px` : "auto")};
  max-width: ${props => (props.$isSidebar ? `${props.$sidebarWidth}px` : "100%")};
  flex-shrink: 0;
  z-index: 1000;
  background-color: ${props => props.$bgCol || "#fff"};
  background-image: ${props => (props.$bgImg ? `url(${props.$bgImg})` : "none")};
  background-size: 100% 100%;
  background-position: center;
  transition: all 0.3s ease;

  @media (max-width: 1024px) {
    padding: 15px 20px !important;
  }

  @media (max-width: 640px) {
    padding: 12px 16px !important;
  }
`;

export const HeaderInner = scStyled.div`
  display: flex;
  flex-direction: ${props => (props.$isSidebar ? "column" : "row")};
  align-items: center;
  gap: ${props => (props.$isSidebar ? `${props.$menuSpacing}px` : "clamp(6px, 3vw, 30px)")};
  width: 100%;
  max-width: ${props => (props.$isSidebar ? "none" : "1400px")};
  margin: ${props => (props.$isSidebar ? "0" : "0 auto")};
`;

export const LogoGroup = scStyled.div`
  display: flex;
  flex-direction: ${props => (props.$isSidebar ? "column" : "row")};
  align-items: center;
  gap: 15px;
`;

export const MobileMenuBtn = scStyled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: #185b8e;
  display: none;
  align-items: center;
  justify-content: center;
  margin-left: -10px;

  @media (max-width: 1024px) {
    display: flex !important;
  }
`;

export const LogoImage = scStyled.img`
  width: ${props => `${props.$wVal}px`};
  height: ${props => (props.$hVal === "auto" ? "auto" : `${props.$hVal}px`)};
  object-fit: contain;
`;

export const DesktopNav = scStyled.nav`
  display: flex;
  flex-direction: ${props => (props.$isSidebar ? "column" : "row")};
  gap: ${props => `${props.$menuSpacing}px`};
  align-items: center;
  width: ${props => (props.$isSidebar ? "100%" : "auto")};

  /* From original style tag */
  overflow: ${props => (props.$isSidebar ? "visible" : "visible auto")};
  overflow-y: ${props => (props.$isSidebar ? "visible" : "hidden")};
  overflow-x: ${props => (props.$isSidebar ? "visible" : "auto")};
  white-space: nowrap;
  max-width: ${props => (props.$isSidebar ? "100%" : "calc(100vw - 200px)")};
  padding-bottom: 4px;

  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: #999; }

  @media (max-width: 1024px) {
    display: none !important;
  }
`;

export const NavLinkStyled = scStyled.div`
  text-decoration: none;
  color: ${props => (props.$isActive ? "#0062AD" : (props.$tColor || "#707070"))};
  font-weight: 500;
  font-size: ${props => props.$fSize}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${props => (props.$isSidebar ? "20px 0" : "6px 10px")};
  border-radius: ${props => (props.$isSidebar ? "0" : "8px")};
  background: ${props => (
    props.$isSidebar
      ? "transparent"
      : (props.$isActive ? "rgba(0, 98, 173, 0.08)" : "transparent")
  )};
  border-bottom: ${props => (!props.$isSidebar && props.$isActive ? "2.5px solid #0062AD" : "2.5px solid transparent")};
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
  position: relative;
  width: ${props => (props.$isSidebar ? "100%" : "auto")};
  margin: 0;
  cursor: pointer;
  box-shadow: none;

  &:hover {
    color: ${props => (props.$isSidebar ? "#fff" : "#0062AD")} !important;
    background: ${props => (props.$isSidebar
      ? "linear-gradient(90deg, #6aaff5ff 0%, #3065e8 100%)"
      : "rgba(0, 98, 173, 0.1)")};
  }

  /* Ensure icons turn white on hover in sidebar */
  &:hover svg, 
  &:hover svg path,
  &:hover .home-stroke {
    stroke: ${props => (props.$isSidebar ? "#fff" : "#0062AD")} !important;
  }
  
  &:hover .home-fill,
  &:hover .library-fill {
    fill: ${props => (props.$isSidebar ? "#fff" : "#0062AD")} !important;
  }
`;

export const TopicDropdownContainer = scStyled.div`
  position: absolute;
  top: ${props => (props.$isSidebar ? "0" : "100%")};
  left: ${props => (props.$isSidebar ? "100%" : "0")};
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 37px 14px;
  width: 288px;
  max-width: 288px;
  z-index: 2000;
  opacity: 0;
  visibility: hidden;
  transform: ${props => (props.$isSidebar ? "translateX(10px)" : "translateY(10px)")};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.05);

  ${NavLinkStyled}:hover & {
    opacity: 1;
    visibility: visible;
    transform: ${props => (props.$isSidebar ? "translateX(0)" : "translateY(0)")};
  }
`;

export const TopicList = scStyled.div`
  display: flex;
  flex-direction: column;
  gap: 17px;
  max-height: 310px;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }
`;

export const TopicItem = scStyled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px 16px;
  border-radius: 7px;
  color: ${props => props.$isActive ? "#0062AD" : "#475569"};
  background-color: ${props => props.$isActive ? "rgba(0, 98, 173, 0.05)" : "transparent"};
  font-size: 14px;
  font-weight: 400;
  transition: all 0.2s ease;
  cursor: pointer;
  text-decoration: none;
  overflow: hidden;

  span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    background-color: rgba(0, 98, 173, 0.08);
    color: #0062AD;
    transform: translateX(4px);
  }
`;

export const TopicBullet = scStyled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${props => props.$isActive ? "#0062AD" : "#cbd5e1"};
  transition: all 0.2s ease;
  flex-shrink: 0;

  ${TopicItem}:hover & {
    background-color: #0062AD;
    transform: scale(1.2);
  }
`;

export const HomeIconSvg = scStyled.svg`
  margin-bottom: 10px;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
`;

export const LibraryIconSvg = scStyled.svg`
  margin-bottom: 8px;
  width: ${props => props.$size || 22}px;
  height: ${props => props.$size || 22}px;
`;

export const IconBox = scStyled.div`
  margin-bottom: 5px;
`;

export const SvgIconContainer = scStyled.div`
  width: ${props => (props.$isSidebar ? 24 : 20)}px;
  height: ${props => (props.$isSidebar ? 24 : 20)}px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => (props.$isActive ? "#0062AD" : props.$iColor)};
  
  svg {
    stroke: currentColor;
    fill: none;
  }
`;

export const NavIconImg = scStyled.img`
  width: ${props => (props.$isSidebar ? 24 : 20)}px;
  height: ${props => (props.$isSidebar ? 24 : 20)}px;
  object-fit: contain;
`;

export const ActiveIndicator = scStyled.div`
  position: absolute;
  left: ${props => (props.$headerPos === "left" ? "-10px" : "auto")};
  right: ${props => (props.$headerPos === "right" ? "-10px" : "auto")};
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background-color: #0062AD;
  border-radius: 0 4px 4px 0;
`;

export const UserMenuContainer = scStyled.div`
  display: flex;
  flex-direction: ${props => (props.$isSidebar ? "column" : "row")};
  align-items: center;
  gap: ${props => (props.$isSidebar ? "10px" : "15px")};
  margin-top: ${props => (props.$isSidebar ? "auto" : 0)};
  position: relative;
`;

export const ActionButton = scStyled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.$cl || "#666"};
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s ease;
`;

export const ConfigActionButton = scStyled(ActionButton)`
  padding: 8px 10px;
  color: #185b8e;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  white-space: normal;
  max-width: 130px;

  @media (max-width: 640px) {
    svg {
      width: 28px !important;
      height: 28px !important;
    }
  }
`;

export const UnreadBadge = scStyled.div`
  position: absolute;
  top: 5px;
  right: 5px;
  min-width: 14px;
  height: 14px;
  background-color: #ef4444;
  border-radius: 50%;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 8px;
  font-weight: bold;
  pointer-events: none;
`;

export const MainWrapper = scStyled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  padding-top: ${props => (
    props.$isFixed && !props.$isSidebar && !props.$isHidden && props.$headerPos !== "middle"
      ? "70px"
      : 0
  )};
  transition: all 0.3s ease;
`;

export const SubHeaderWrapper = scStyled.div`
  position: sticky;
  top: ${props => (
    props.$headerPos === "middle"
      ? 0
      : (props.$isFixed && !props.$isSidebar && !props.$isHidden ? "70px" : 0)
  )};
  span,
  a,
  p,
  div {
    font-size: 15px;
  }

  z-index: 100;
  width: 100%;
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
`;

export const TopicNavBarWrapper = scStyled.div`
  width: 100%;
  background: ${props => props.$surface || "#fff"};
  border-bottom: 1px solid #e5e7eb;
`;

export const TopicNavBarInner = scStyled.div`
  max-width: 1500px;
  padding: 0 30px;
  margin: 0 auto;

  @media (max-width: 640px) {
    padding: 0 12px;
  }
`;

export const TopicNavList = scStyled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 5px 0;

  @media (max-width: 1024px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 10px 0 14px 0;
    
    /* Always visible & easy to drag custom scrollbar */
    &::-webkit-scrollbar {
      height: 6px;
      display: block !important;
    }
    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05) !important;
      border-radius: 10px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.28) !important;
      border-radius: 10px;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.45) !important;
    }
    
    /* Thin scrollbar for Firefox */
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.28) rgba(0, 0, 0, 0.05);
  }
`;

export const TopicNavButton = scStyled.button`
  border: 0;
  background: ${props => (props.$isActive ? (props.$activeTone || "#0f62fe") : "transparent")};
  color: ${props => (props.$isActive ? (props.$activeInk || "#ffffff") : (props.$ink || "#1f2937"))};
  font-size: 14px;
  font-weight: ${props => (props.$isActive ? 700 : 600)};
  line-height: 1.2;
  padding: 14px 14px;
  // border-radius: 8px;
  white-space: nowrap;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  position: relative; /* Định vị tuyệt đối cho vạch kẻ chân */

  &:hover {
    background: ${props => (props.$isActive ? (props.$activeTone || "#0b57df") : (props.$hoverTone || "#eff6ff"))};
    color: ${props => (props.$isActive ? (props.$activeInk || "#ffffff") : (props.$hoverInk || "#0f62fe"))};
  }

  /* Vạch gạch chân chạy động */
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 3px; /* Độ dày của vạch gạch chân */
    background-color: ${props => props.$underlineColor || "#d92d20"};
    
    /* Trạng thái mặc định (không hover): Thu về 0 */
    transform: ${props => (props.$isActive ? "scaleX(1)" : "scaleX(0)")};
    
    /* Luôn giữ điểm gốc ở bên TRÁI */
    transform-origin: left; 
    transition: transform 0.3s ease-in-out;
  }

  /* Khi hover: Nở rộng ra từ trái sang phải (độ dài đạt 100%) */
  &:hover::after {
    transform: scaleX(1);
  }
`;

export const MainContent = scStyled.main`
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-content: flex-start;
  background-color: ${props => props.$bgVal || "#eff8ff"};
  gap: 0;
`;

export const BlockContainer = scStyled.div`
  flex: 0 0 ${props => props.$wVal || 100}%;
  max-width: ${props => props.$wVal || 100}%;
  ${props => props.$bgCol ? `background-color: ${props.$bgCol};` : ""}
  ${props => props.$mbVal ? `margin-bottom: ${props.$mbVal}px;` : ""}
  transition: all 0.3s ease;
`;

export const ContentWrapper = scStyled.div`
  max-width: ${props => props.$maxW || "1400px"};
  width: ${props => props.$wVal || 100}%;
  margin: 0 auto;
  ${props => props.$hVal ? `min-height: ${props.$hVal}px;` : ""}
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;

  @media (max-width: 1024px) {
    ${props => props.$hTablet ? `min-height: ${props.$hTablet}px;` : ""}
  }
`;

export const Footer = scStyled.footer`
  border-top: 3px solid #FF1E00;
`;

export const ScrollTopButton = scStyled.button`
  position: fixed;
  bottom: 40px;
  right: 30px;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #0062AD 0%, #004a82 100%);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 98, 173, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 999;
  opacity: ${props => (props.$visible ? 1 : 0)};
  transform: ${props => (props.$visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.8)")};
  pointer-events: ${props => (props.$visible ? "all" : "none")};

  &:hover {
    transform: translateY(-5px) scale(1.1);
    box-shadow: 0 8px 25px rgba(0, 98, 173, 0.5);
    background: linear-gradient(135deg, #0073cc 0%, #0062AD 100%);
  }

  &:active {
    transform: translateY(0) scale(0.95);
  }

  @media (max-width: 640px) {
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
  }
`;

export const StyledLink = scStyled(Link)`
  text-decoration: none;
  width: 100%;
  position: relative;
`;

export const NavIcon = scStyled(({ component: Component, ...props }) => <Component {...props} />)`
  /* This is a wrapper for Lucide icons to avoid forbidden props */
`;
