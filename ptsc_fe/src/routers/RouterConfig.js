import React, { Suspense, useEffect, lazy } from "react";
import Loading from "@components/Loading/Loading";
import { People, ReceiptLong, Menu as MenuIcon } from "@mui/icons-material";
// import QualificationManagement from "@pages/TextAway";
// import SigningSubmissionDetail from "@pages/TextAway/Tab/SigningSubmissionTab/ViewDialog";
import { Navigate, useRoutes, useLocation, useNavigate } from "react-router-dom";
import useDynamicMenuRoutes from "@hooks/useDynamicMenuRoutes";
import ProtectedRoute from "@AuthContext/ProtectedRoute";
import {
  ManagerUsers,
  AddProcess,
  EditProcess,
  GroupUser,
  // NetworkAdministration,
  SystemLogManagement,
  NotificationsPage,
  RoleManagement,
  NotificationConfig,
  MobileAppVersionConfig,
  ListUsers,
  DesignBPMN,
  ListBPMN,
  MainLayout,
  LoginCallback,
  LoginPage,
  AuthConfigPage,
  AuthCallback,
  ThemeConfigPage,
  AccessDeniedPage,
  // KanbanDemo,
  Dynamic,
  ManagementMenu,
  ManagementUnit,
  ViewUnitDetail,
  ViewOR,
  CategoryManagement,
  RecordCategoryDetail,
  RecordCategory,
  ExampleFiles,
  // DemoDriver,
  // MeetingCalendar,
  // DemoSchedulerPage,
  Dashboard,
  // GanttExample,
  // CustomTableBorderCalendarTree,
  // KanbanPage,
  // StatisticsAndReports
} from "./lazyComponents"; // Keep imports for useRoutes

const CmsModuleLocal = lazy(() => import("@pages/AdministrationSystem/FunctionManagement/components/CmsModule/App"));
const DeepLinkHandler = lazy(() => import("@components/DeepLinkHandler"));

const CmsModuleWrapper = () => {
  const location = useLocation();
  return (
    <Suspense fallback={<Loading />}>
      <CmsModuleLocal initialPagePath={location.pathname} />
    </Suspense>
  );
};

 
 
export const routes = [
  {
    // title: "Quản trị hệ thống",
    title: "Quản lý phân quyền",
    icon: <People />,
    codeRouter: "quan-tri-he-thong",
    subItems: [
      {
        path: "/dashboard",
        element: <Dashboard />, // This is not lazy, so it's fine
        title: "Bảng thông tin",
        // codeRouter: "demo-kanban",
        codeRouter: "bang-thong-tin",
        hidden: true,
      },
      // {
      //   path: "/demo-kanban",  
      //   element: <KanbanPage />,
      //   // element: <KanbanDemo />,
      //   title: "Demo Kanban",
      //   // codeRouter: "demo-kanban",
      //   codeRouter: "thong-tin-cong-dan",
      // },
       {
        path: "/notifications",
        element: <NotificationsPage />, // Lazy component
        title: "Danh sách thông báo",
        // codeRouter: "demo-kanban",
        codeRouter: "danh-sach-thong-bao",
        hidden: true,
      },
      {
        path: "/notification-config",
        element: <NotificationConfig />,
        title: "Cấu hình thông báo",
        codeRouter: "cau-hinh-thong-bao",
        hidden: true,
      },

      {
        path: "/manage-unit",
        element: <ManagementUnit />, // Lazy component
        title: "Quản lý đơn vị",
        codeRouter: "quan-ly-don-vi",
      },

      {
        path: "/manage-list-users",
        element: <ListUsers />, // Lazy component
        title: "Quản lý người dùng",
        codeRouter: "quan-ly-nguoi-dung",
      },
      {
        path: "/list-group-user",
        element: <GroupUser />, // Lazy component
        title: "Quản lý nhóm người dùng",
        codeRouter: "quan-ly-nhom-nguoi-dung",
      },
      // {
      //   path: "/demo-kanban",
      //   element: <KanbanPage />, // Lazy component
      //   // element: <KanbanDemo />, // Lazy component
      //   title: "demo banban",
      //   codeRouter: "demo-kanban",
      // },
      // {
      //   path: "/demo-gant",
      //   element: <GanttExample/>, // Lazy component
      //   title: "demo gant",
      //   codeRouter: "demo-gantt",
      // },
      // {
      //   path: "/demo-calender",
      //   element: <CustomTableBorderCalendarTree />, // Lazy component
      //   title: "demo calender",
      //   codeRouter: "demo-calender",
      // },
      // {
      //   path: "/demo-driver",
      //   element: <DemoDriver />, // Lazy component
      //   title: "demo driver",
      //   codeRouter: "demo-driver",
      // },
      // {
      //   path: "/demo-scheduler",
      //   element: <DemoSchedulerPage />, // Lazy component
      //   title: "Demo Scheduler",
      //   codeRouter: "demo-scheduler",
      // },
      // {
      //   path: "/network-log",
      //   element: <NetworkAdministration />, // Lazy component
      //   title: "Quản trị mạng",
      //   codeRouter: "quan-tri-mang",
      //   // hidden: true,
      // },
      {
        path: "/log-system-parameter",
        element: <SystemLogManagement />, // Lazy component
        // element: <RecordCategory />,
        // element: <MeetingCalendar />,
        title: "Quản lý nhật ký hệ thống",
        codeRouter: "quan-ly-nhat-ky-he-thong",
      },
        {
        path: "/category-management",
        element: <CategoryManagement />, // Lazy component
        title: "Quản lý danh mục",
        codeRouter: "quan-ly-danh-muc",
      },
      {
        path: "/manage-menu",
        element: <ManagementMenu />, // Lazy component
        icon: <MenuIcon />,
        // title: "Quản lý Menu",
        title: "Quản lý menu",
        codeRouter: "quan-ly-menu",
      },
      {
        path: "/example-files",
        element: <ExampleFiles />, // Lazy component
        title: "Quản lý file mẫu",
        codeRouter: "cau-hinh-file-mau",
        // codeRouter: "quan-ly-menu",
      },
      {
        path: "/mobile-app-version-config",
        element: <MobileAppVersionConfig />,
        title: "Quản lý phiên bản app mobile",
        codeRouter: "quan-ly-phien-ban-app-mobile",
      },
      {
        path: "/list-role",
        element: <RoleManagement />, // Lazy component
        title: "Quản lý vai trò",
        codeRouter: "quan-ly-vai-tro",
      },
      {
        path: "/manage-users/add",
        element: <ManagerUsers />, // Lazy component
        title: "Thêm mới người dùng",
        hidden: true,
      },
      {
        path: "/manage-unit_detail/:id",
        element: <ViewUnitDetail />, // Lazy component
        title: "Chi tiết đơn vị",
        hidden: true,
      },
      {
        path: "/View_QR/:id",
        element: <ViewOR />, // Lazy component
        title: "viewQr",
        hidden: true,
      },
      {
        path: "/manage-users/:id",
        element: <ManagerUsers />,
        title: "Cập nhật người dùng",
        hidden: true,
      },
      {
        path: "/manage-users-detail/:id",
        element: <ManagerUsers />, // Lazy component
        title: "Chi tiết người dùng",
        hidden: true,
      },
      {
        path: "/info-personal/:id",
        element: <ManagerUsers />, // Lazy component
        title: "Thông tin cá nhân",
        hidden: true,
      },
      {
        path: "/manage-user/:id",
        element: <ManagerUsers />, // Lazy component
        title: "Chi tiết người dùng",
        hidden: true,
      },
      {
        hidden: true,
        path: "/look-up-records",
        element: <RecordCategory />,
        title: "Tra cứu hồ sơ",
        codeRouter: "tra-cuu-ho-so",
      },
      {
        path: "/look-up-records/:id",
        element: <RecordCategoryDetail />,
        title: "Chi tiết bộ danh mục",
        hidden: true, // Ẩn khỏi menu chính
      },
      //  {
      //   path: "/manage-group-user/:id",
      //   element: <DetailGroupUser />,
      //   title: "Chi tiết nhóm người dùng",
      // },
      // {
      //   path: "/manage-group-user/:id",
      //   element: <DetailGroupUser />,
      //   title: "Chi tiết nhóm người dùng",
      // },
    ],
  },

  // {
  //   path: "/gantt",
  //   element: <StatisticsAndReports/>,
  //   title: "Gantt",
  //   codeRouter: "gantt",
  // },

  {
    // title: "Quản lý quy trình",
    title: "QUẢN LÝ QUY TRÌNH",
    icon: <ReceiptLong />,
    codeRouter: "quan-ly-quy-trinh",
    subItems: [
      // {
      //   path: "/design-bpmn",
      //   element: <DesignBPMN />,
      //   title: "Thêm mới quy trình",
      // },
      {
        path: "/design-bpmn/:id",
        element: <DesignBPMN />, // Lazy component
        title: "Cập nhật quy trình",
        hidden: true,
      },
      {
        path: "/list-bpmn",
        element: <ListBPMN />, // Lazy component
        title: "Danh sách biểu mẫu quy trình",
        codeRouter: "danh-sach-bieu-mau-quy-trinh",
      },
      {
        path: "/list-bpmn/add",
        element: <AddProcess />, // Lazy component
        title: "Thêm mới quy trình",
        hidden: true,
      },
      {
        path: "/list-bpmn/:id",
        element: <EditProcess />, // Lazy component
        title: "Cập nhật quy trình",
        hidden: true,
      },
    ],
  },

  //   {
  //   title: "HỒ SƠ LƯU TRỮ",
  //   icon: <People />,
  //   codeRouter: "ho-so-luu-tru",
  //   subItems: [
  //     {
  //       path: "/look-up-records",
  //       element: <RecordCategory />, 
  //       title: "Tra cứu hồ sơ",
  //       codeRouter: "tra-cuu-ho-so",
  //     },
  //   ]
  // },
  // {
  //   // title: "Quản trị hệ thống",
  //   title: "VĂN BẢN ĐIỀU HÀNH",
  //   icon: <People />,
  //   codeRouter: "van-ban-dieu-hanh",
  // 	subItems: [
  // 		{
  // 			path: "/incoming-text",
  // 			element: <IncomingDocumentManagement />,
  // 			title: "Văn bản đến",
  // 			codeRouter: "van-ban-den",
  // 			subItems: [
  // 				// {
  // 				// 	path: "/incoming-text/requesting-opinion",
  // 				// 	element: <ConsultationDocs />,
  // 				// 	title: "Văn bản xin ý kiến",
  // 				// 	codeRouter: "van-ban-xin-y-kien",
  // 				// 	badge: 144,
  // 				// },
  // 				// {
  // 				// 	path: "/incoming-text/received-to-know",
  // 				// 	element: <IncomingDocumentManagement />,
  // 				// 	title: "Văn bản nhận để biết",
  // 				// 	codeRouter: "van-ban-nhan-de-biet",
  // 				// 	badge: 31,
  // 				// },
  // 				// {
  // 				// 	path: "/incoming-text/unit-documents",
  // 				// 	element: <IncomingDocumentManagement />,
  // 				// 	title: "Văn bản của đơn vị",
  // 				// 	codeRouter: "van-ban-cua-don-vi",
  // 				// 	badge: 43,
  // 				// },
  // 			],
  // 		},

  //     {
  //       path: "/text-management-way",
  //       element: <QualificationManagement />,
  //       title: "Văn bản đi",
  //       codeRouter: "van-ban-di",
  //     },
  //     {
  //       path: "/signing-submission/view/:id",
  //       element: <SigningSubmissionDetail />,
  //       title: "Chi tiết trình ký",
  //       hidden: true,
  //     },
  //   ]},

  // {
  //   path: "/dynamic-form",
  //   title: "Quản lý biểu mẫu",
  //   icon: <InboxIcon />,
  //   element: <DynamicForm />,
  // },
  {
    path: "/dynamic-form/add",
    title: "Thêm mới biểu mẫu", // Lazy component
    element: <Dynamic />, 
    hidden: true,
  },
  {
    path: "/dynamic-form/:id",
    title: "Cập nhật biểu mẫu",
    element: <Dynamic />, // Lazy component
    hidden: true,
  },


  {
    // Đăng ký các route cứng của CmsModule để React Router không chặn
    path: "/libary",
    element: <CmsModuleWrapper />,
    hidden: true
  },
  {
    path: "/album",
    element: <CmsModuleWrapper />,
    hidden: true
  },
  {
    path: "/album/:id",
    element: <CmsModuleWrapper />,
    hidden: true
  },
  {
    path: "/video",
    element: <CmsModuleWrapper />,
    hidden: true
  },
  {
    path: "/video/:id",
    element: <CmsModuleWrapper />,
    hidden: true
  },
  {
    path: "/tin-tuc",
    element: <CmsModuleWrapper />,
    hidden: true
  },
  {
    path: "/news/:id",
    element: <CmsModuleWrapper />,
    hidden: true
  },
  {
    path: "/search",
    element: <CmsModuleWrapper />,
    hidden: true
  },
  {
    path: "/topic/:slug",
    element: <CmsModuleWrapper />,
    hidden: true
  },
  {
    path: "/calendar",
    element: <CmsModuleWrapper />,
    hidden: true
  },
];

// Hàm tìm đường dẫn đầu tiên từ menu
const findFirstRoute = (routesToSearch) => {
  if (!Array.isArray(routesToSearch) || routesToSearch.length === 0)
    return null;

  const isValidPath = (p) =>
    typeof p === "string" &&
    p.startsWith("/") &&
    !p.includes(":") &&
    !p.includes("*");

  for (const route of routesToSearch) {
    // Nếu là route có path, không hidden và path tĩnh thì chọn
    if (route.path && !route.hidden && isValidPath(route.path)) {
      return route.path;
    }

    // Nếu có subItems thì tìm tiếp trong subItems
    if (route.subItems && route.subItems.length > 0) {
      const firstSubPath = findFirstRoute(route.subItems);
      if (firstSubPath) return firstSubPath;
    }
  }

  return null;
};

const CatchAllRedirect = () => {
  const location = useLocation();
  const normalizedPathname = location.pathname.replace(/\/{2,}/g, "/");

  if (normalizedPathname !== location.pathname) {
    return (
      <Navigate
        to={{
          pathname: normalizedPathname,
          search: location.search,
          hash: location.hash,
        }}
        replace
      />
    );
  }

  if (location.pathname !== "/" && location.pathname !== "/login") {
    sessionStorage.setItem(
      "savedRedirectLink",
      location.pathname + location.search + location.hash
    );
  }
  return <Navigate to="/" replace />;
};

let alreadyRestored = false;

const RouterConfig = () => {
  //   useEffect(() => {
  //     const fetchDhvbData = async () => {
  //       const token =
  //         "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiNjIzNDZhYTlkYTRkNTMwZjYxYmJiZWZkIiwiaWF0IjoxNzYyMzExNzc4LCJleHAiOjE3NzQzMTE3Nzh9.uzJKY8kM43qj-yDzrWWiqnKpmdshNFIZBohHMGHEAr4";
  //       const headers = {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //       };

  //       const requests = [
  //         callApi("get", API_VIEWCONFIG_DHVB, { headers }),
  //         callApi("get", API_CRMSTATUS_DHVB, { headers }),
  //         callApi("get", API_CRMSOURCE_DHVB, { headers }),
  //       ];

  //       try {
  //         const [viewConfigRes, crmStatusRes, crmSourceRes] =
  //           await Promise.all(requests);

  //      if (viewConfigRes) {
  //   localStorage.setItem("viewConfig_dhvb", JSON.stringify(viewConfigRes));
  // }

  // if (crmStatusRes) {
  //   localStorage.setItem("crmStatus", JSON.stringify(crmStatusRes));
  // }

  // if (crmSourceRes) {
  //   localStorage.setItem("crmSource", JSON.stringify(crmSourceRes));
  // }

  //       } catch (error) {
  //         logger.error("Error fetching DHVB data:", error);
  //         // Optionally, show a toast message to the user
  //       }
  //     };

  //     // Chỉ gọi API nếu chưa có dữ liệu trong localStorage
  //     if (!localStorage.getItem('viewConfig_dhvb') || !localStorage.getItem('crmStatus') || !localStorage.getItem('crmSource')) {
  //       fetchDhvbData();
  //     }
  //   }, []);

  const dynamicMenuRoutes = useDynamicMenuRoutes();

  const combinedRoutes = [...routes, ...dynamicMenuRoutes];

  // Chỉ lấy route đầu tiên từ menu động để đồng bộ với thanh menu.
  const defaultRedirectPath = findFirstRoute(dynamicMenuRoutes);

  const navigate = useNavigate();

  useEffect(() => {
    const savedLink = sessionStorage.getItem("savedRedirectLink");
    if (savedLink && dynamicMenuRoutes.length > 0 && !alreadyRestored) {
      sessionStorage.removeItem("savedRedirectLink");
      alreadyRestored = true;
      setTimeout(() => {
        navigate(savedLink, { replace: true });
      }, 100);
    }
  }, [dynamicMenuRoutes, navigate]);

  const flattenRoutes = (routesToFlatten) => {
    let flatRoutes = [];
    for (const route of routesToFlatten) {
      if (route.path && route.element) {
        flatRoutes.push({
          path: route.path,
          element: <Suspense fallback={<Loading />}>{route.element}</Suspense>,
        });
      }

      if (route.subItems && route.subItems.length > 0) {
        flatRoutes.push(...flattenRoutes(route.subItems));
      }
    }
    return flatRoutes;
  };

  // const firstPath = findFirstAvailableRoute(combinedRoutes);

  return useRoutes([
    {
      path: "/login",
      element: (
        <Suspense fallback={<Loading />}>
          <LoginPage />
        </Suspense>
      ),
    },
    {
      path: "/login/callback",
      element: (
        <Suspense fallback={<Loading />}>
          <LoginCallback />
        </Suspense>
      ),
    },
    {
      path: "/auth/callback",
      element: (
        <Suspense fallback={<Loading />}>
          <AuthCallback />
        </Suspense>
      ),
    },
    {
      path: "/access-denied",
      element: (
        <Suspense fallback={<Loading />}>
          <AccessDeniedPage />
        </Suspense>
      ),
    },
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <Suspense fallback={<Loading />}>
            <MainLayout menuRoutes={combinedRoutes} />
          </Suspense>
        </ProtectedRoute>
      ),
      children: [
        // Điều hướng từ "/" đến route đầu tiên đang hiển thị trên menu.
        {
          index: true,
          element: defaultRedirectPath ? (
            <Navigate to={defaultRedirectPath} replace />
          ) : (
            <Loading />
          ),
        },
        ...flattenRoutes(combinedRoutes.filter((route) => route.path !== "/" && route.path !== "/user-profile")),
        // Thêm route cho trang cấu hình xác thực
        {
          path: "/admin/auth-config",
          element: (
            <Suspense fallback={<Loading />}>
              <AuthConfigPage />
            </Suspense>
          ),
        },
        // Thêm route cho trang cấu hình giao diện
        {
          path: "/admin/theme-config",
          element: (
            <Suspense fallback={<Loading />}>
              <ThemeConfigPage />
            </Suspense>
          ),
        },
        // Thêm route cho trang Dịch vụ lưu trữ
        // {
        //   path: "/admin/storage-service",
        //   element: (
        //     <Suspense fallback={<Loading />}>
        //       <StorageConfig />
        //     </Suspense>
        //   ),
        // },
        {
          path: "/:deeplinkKey/:deeplinkId",
          element: (
            <Suspense fallback={<Loading />}>
              <DeepLinkHandler />
            </Suspense>
          ),
        },
      ],
    },
    {
      path: "*",
      element: <CatchAllRedirect />,
    },
  ]);
};

export default RouterConfig;
