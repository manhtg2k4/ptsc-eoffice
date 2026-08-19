import Navbar from "@components/Sidebar/Navbar";
import Sidebar from "@components/Sidebar/Sidebar";
import { Toolbar, useMediaQuery } from "@mui/material";
import {
  ContentContainer,  LayoutContainer,  PageContainer} from "@styles/MainLayout.styles";
// import { StyleBoxTittle, StyleTittleBox, StyleBreadcrumb, StyleBreadcrumbItem, BreadcrumbSeparator } from "@builder-table/components/SearchSection.styles";
import {
  SkyErrorOverlay,
  SkyErrorCard,
  SkyErrorTitle,
  SkyErrorDescription,
  SkyFlexRowCenter,
  SkySubmitButton,
  SkyCancelButton,
} from "@styles/SkyStyles";
import React, { useCallback, useEffect, useContext } from "react";
import { AuthContext } from "@AuthContext/AuthProvider";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
// import { Menu as MenuIcon } from "@mui/icons-material";
import ThemeToggleButton from "@components/common/ThemeToggleButton";
// import Footer from "./Footer";
// import { fetchDhvbConfig } from "@redux/slices/configSlice";
import {
  toggleSidebar as toggleSidebarAction,
  setSidebarOpen,
} from "@redux/slices/layoutSlice";

const MainLayout = () => {
  const isOpen = useSelector((state) => state.layout.isSidebarOpen);
  // const currentPageBreadcrumb = useSelector((state) => state.layout.currentPageBreadcrumb);
  // const showGlobalBreadcrumb = useSelector((state) => state.layout.showGlobalBreadcrumb);
  const location = useLocation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { logout } = useContext(AuthContext);
  const isMobile = useMediaQuery(theme.breakpoints.down(426));
  const isSmallScreen = useMediaQuery('(max-width:768px)'); // Cập nhật breakpoint theo yêu cầu
  const { userPermissions, isSuperAdmin } = useSelector((state) => state.users);

  const handleWindowReload = useCallback(() => {
    window.location.reload();
  }, []);

  // Kiểm tra xem người dùng có bất kỳ quyền nào không
  const hasNoPermissions = React.useMemo(() => {
    // Super Admin bypass mọi role check
    if (isSuperAdmin) return false;
    if (!userPermissions) return false;
    const hasStaticPermissions = (userPermissions.staticPermissions || []).length > 0;
    const hasRoles = (userPermissions.roles || []).length > 0;
    const hasReportPermission = (userPermissions.reportPermission || []).length > 0;
    return !hasStaticPermissions && !hasRoles && !hasReportPermission;
  }, [userPermissions, isSuperAdmin]);

  const toggleSidebar = useCallback(() => {
    dispatch(toggleSidebarAction());
  }, [dispatch]);

  // Lấy style tùy chỉnh cho trang hiện tại từ theme
  const pageStyle = theme.palette.pageOverrides?.[location.pathname] || {};

  // useEffect(() => {
  //   dispatch(fetchDhvbConfig());
  // }, [dispatch]);

  useEffect(() => {
    // Khi ở mobile và sidebar đang mở thì tự động đóng
    if (isSmallScreen) {
      dispatch(setSidebarOpen(false));
    } else {
      dispatch(setSidebarOpen(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, dispatch, isSmallScreen]);

  if (hasNoPermissions) {
    return (
      <SkyErrorOverlay>
        <SkyErrorCard>
          <SkyErrorTitle>Thông báo quyền truy cập</SkyErrorTitle>
          <SkyErrorDescription>
            Hệ thống nhận diện bạn chưa được phân quyền truy cập vào các chức năng. <br />
            Vui lòng liên hệ Quản trị viên để được cấp quyền.
          </SkyErrorDescription>
          <SkyFlexRowCenter>
            <SkySubmitButton onClick={handleWindowReload}>
              Tải lại trang
            </SkySubmitButton>
            <SkyCancelButton onClick={logout}>
              Đăng xuất
            </SkyCancelButton>
          </SkyFlexRowCenter>
        </SkyErrorCard>
      </SkyErrorOverlay>
    );
  }

  return (
    <>
        <Navbar
            isOpen={isOpen}
            toggleSidebar={toggleSidebar}
            actions={<ThemeToggleButton />}
        />
        <LayoutContainer > 
         {isOpen && <Toolbar />}
          <div style={{ display: "flex", flexGrow: 1, overflow: "hidden"}}>
            <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />
            <ContentContainer isOpen={isOpen} customStyle={pageStyle}>
              {/* {showGlobalBreadcrumb && currentPageBreadcrumb?.length > 0 && (
                <StyleBoxTittle>
                  <StyleTittleBox>
                    <StyleBreadcrumb>
                      {currentPageBreadcrumb.map((crumb, idx) => (
                        <React.Fragment key={idx}>
                          <StyleBreadcrumbItem 
                            isActive={idx === currentPageBreadcrumb.length - 1}
                          >
                            {crumb.title}
                          </StyleBreadcrumbItem>
                          {idx < currentPageBreadcrumb.length - 1 && (
                            <BreadcrumbSeparator>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.5 5.5C9.77615 5.5 10 5.72385 10 6C10 6.27615 9.77615 6.5 9.5 6.5L2.5 6.5C2.22386 6.5 2 6.27615 2 6C2 5.72385 2.22386 5.5 2.5 5.5L9.5 5.5Z" fill="currentColor"/>
                                <path d="M5.64644 2.14637C5.82949 1.96331 6.11899 1.95201 6.31539 2.11219L6.35349 2.14637L9.85349 5.64638C10.0487 5.84163 10.0487 6.15813 9.85349 6.35338L6.35349 9.85338C6.15824 10.0487 5.84169 10.0487 5.64644 9.85338C5.45119 9.65813 5.45119 9.34163 5.64644 9.14638L8.79294 5.99988L5.64644 2.8534L5.61229 2.81531C5.45209 2.61893 5.46339 2.32943 5.64644 2.14637Z" fill="currentColor"/>
                              </svg>
                            </BreadcrumbSeparator>
                          )}
                        </React.Fragment>
                      ))}
                    </StyleBreadcrumb>
                  </StyleTittleBox>
                </StyleBoxTittle>
              )} */}
              <PageContainer
                // $overflow={
                //   location.pathname === "/admin/theme-config"
                //     ? "auto"
                //     : location.pathname === "/incoming-text" ||
                //       location.pathname === "/text-management-way"
                //     ? "hidden"
                //     : "auto"
                // }
              >
                <Outlet />
              </PageContainer>
              {/* Chỉ hiển thị Footer trên màn hình lớn hơn 768px */}
            </ContentContainer>
          </div>
        </LayoutContainer>
    </>
  );
};

export default MainLayout;
