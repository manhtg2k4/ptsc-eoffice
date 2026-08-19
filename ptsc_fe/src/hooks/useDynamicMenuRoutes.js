import React, { lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
// import Loading from "@components/Loading/Loading";
// import { CircularProgress } from "@mui/material";


import {
  // API_SIDE_BAR_MENU,
} from "@EnvironmentFile/constants/urlConfig";
import { ensureUserPermissions } from "@redux/slices/managementUsersSlice";
import { ensureAuthority } from "@redux/slices/Authority/authoritySlice";
import { useDispatch, useSelector } from "react-redux";
import { AuthContext } from "@AuthContext/AuthProvider";
import { routes } from "@routers/RouterConfig";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";
// import { SkyBox } from "@styles/SkyStyles";

// import { styled } from "@mui/material/styles";
import { RouteLoading } from "@components/Loading/RouteLoading";

const LazyTableView = lazy(() => import("./DynamicRouteWrappers/LazyTableView"));
const LazyFormAdd = lazy(() => import("./DynamicRouteWrappers/LazyFormAdd"));
const LazyPopupView = lazy(() => import("./DynamicRouteWrappers/LazyPopupView"));
const sortByOrder = (a, b, groupCodes = []) => {
  // Ưu tiên "Điều hành văn bản" lên đầu nếu là văn thư TCT
  if (groupCodes.includes("vanthutct")) {
    const isADHV = a.title === "Điều hành văn bản" || a.name === "Điều hành văn bản";
    const isBDHV = b.title === "Điều hành văn bản" || b.name === "Điều hành văn bản";
    if (isADHV && !isBDHV) return -1;
    if (!isADHV && isBDHV) return 1;
  }

  const getPriority = (order) => {
    if (order == null) return 2;   // null hoặc undefined → cuối
    if (order === 0) return 1;      // order = 0 → giữa
    return 0;                       // order > 0 → đầu
  };
  const pa = getPriority(a.order);
  const pb = getPriority(b.order);
  if (pa !== pb) return pa - pb;
  if (pa === 0) return a.order - b.order; // cùng nhóm >0 thì sort tăng dần
  return 0;
};

const applyPermissionRecursive = (items, parentHidden = false) => {
  return items
    .map((item) => {
      if (item.hidden === true || parentHidden === true) {
        return null;
      }

      const subItems = item.subItems
        ? applyPermissionRecursive(item.subItems, false)
        : [];

      if (!item.path && subItems.length === 0) {
        return null;
      }

      return {
        ...item,
        subItems,
      };
    })
    .filter(Boolean);
};

const buildMenuTree = (menuItems = []) => {
  const menuMap = {};

  menuItems.forEach((item) => {
    menuMap[item._id] = { ...item, subItems: [] };
  });

  const roots = [];
  menuItems.forEach((item) => {
    if (item.parent && menuMap[item.parent]) {
      menuMap[item.parent].subItems.push(menuMap[item._id]);
      return;
    }

    roots.push(menuMap[item._id]);
  });

  return roots;
};

const buildStaticRouteMap = (routeItems, map = new Map()) => {
  routeItems.forEach((route) => {
    if (route.codeRouter) {
      map.set(route.codeRouter, route);
    }

    if (route.subItems?.length) {
      buildStaticRouteMap(route.subItems, map);
    }
  });

  return map;
};

// Super Admin: lấy trực tiếp tất cả static routes từ RouterConfig
const convertStaticRoutesToMenuRoutes = (routeItems, isSuperAdmin = false) => {
  return routeItems
    .map((route) => {
      // Ẩn route nếu hidden: true trong config (không phân biệt super admin)
      if (route.hidden === true) {
        return null;
      }

      const subItems = route.subItems
        ? convertStaticRoutesToMenuRoutes(route.subItems, isSuperAdmin).filter(Boolean)
        : [];

      return {
        path: route.path || null,
        element: route.element,
        title: route.title,
        icon: route.icon || null,
        hidden: false, // Super admin thấy hết
        order: route.order || 0,
        subItems,
        codeRouter: route.codeRouter || null,
        settingIcon: null,
        count: null,
        parent: null,
        collapsed: false,
      };
    })
    .filter(Boolean);
};

const mapMenuToRoute = (menu, context) => {
  const mappedSubItems = (menu.subItems || [])
    .map((subMenu) => mapMenuToRoute(subMenu, context))
    .filter(Boolean)
    .sort((a, b) => sortByOrder(a, b, context.groupCodes));

  const hasVisibleSubItems = mappedSubItems.some((subItem) => !subItem.hidden);

  if (menu.dynamicMenu) {
    const fnType = menu.function?.type;
    const fnCode = menu.function?.code;
    const rawPath = menu.function?.path || "";
    const path = rawPath && !rawPath.startsWith("/") ? `/${rawPath}` : rawPath;
    const isGroupOnly = !fnType && !path;

    let element;
    let hidden = isGroupOnly ? mappedSubItems.length === 0 : false;

    switch (fnType) {
      case "list":
      case "fullList":
      case "completeList":
      case "automatic":
      case "custom":
        element = (
          <Suspense key={fnCode} fallback={<RouteLoading />}>
            <LazyTableView fnCode={fnCode} />
          </Suspense>
        );
        if (!isGroupOnly && !context.isSuperAdmin) {
          hidden = !context.permissionSet.has(fnCode);
        }
        break;

      case "popup":
        element = (
          <Suspense key={fnCode} fallback={<RouteLoading />}>
            <LazyPopupView fnCode={fnCode} />
          </Suspense>
        );
        if (!isGroupOnly && !context.isSuperAdmin) {
          hidden = true;
        }
        break;

      case "form":
      default:
        element = (
          <Suspense key={fnCode} fallback={<RouteLoading />}>
            <LazyFormAdd fnCode={fnCode} />
          </Suspense>
        );
        if (!isGroupOnly && !context.isSuperAdmin) {
          hidden = true;
        }
        break;
    }

    if (isGroupOnly && hasVisibleSubItems) {
      hidden = false;
    }

    return {
      title: menu.name,
      icon: null,
      order: menu.order || 0,
      isReport: menu.isReport,
      hidden,
      path,
      element,
      subItems: mappedSubItems,
      settingIcon: menu.settingIcon,
      count: menu.function?.count,
      functionCode: menu.function?.code || null,
      parent: menu.parent || null,
      collapsed: menu.collapsed || false,
    };
  }

  const matchedRoute = context.staticRouteMap.get(menu.codeRouter);

  // Super Admin bypass: nếu là super admin, luôn trả về route
  // không cần matchedRoute
  if (context.isSuperAdmin) {
    // Nếu có matchedRoute thì dùng nó
    // Nếu không có matchedRoute, vẫn trả về menu với hidden=false
    if (!matchedRoute) {
      // Nếu có subItems thì trả về menu cha
      if (menu.subItems?.length) {
        return {
          title: menu.name,
          icon: null,
          order: menu.order || 0,
          hidden: false,
          path: null,
          element: null,
          subItems: mappedSubItems,
          settingIcon: menu.settingIcon,
          count: menu.function?.count,
          functionCode: menu.function?.code || null,
          parent: menu.parent || null,
          collapsed: menu.collapsed || false,
        };
      }
      // Nếu là menu đơn lẻ (không có subItems), tạo route cơ bản từ menu
      return {
        title: menu.name,
        icon: null,
        order: menu.order || 0,
        hidden: false,
        path: menu.path || null,
        element: menu.path ? (
          <Suspense key={menu.path} fallback={<RouteLoading />}>
            <LazyTableView fnCode={menu.function?.code} />
          </Suspense>
        ) : null,
        subItems: [],
        settingIcon: menu.settingIcon,
        count: menu.function?.count,
        functionCode: menu.function?.code || null,
        parent: menu.parent || null,
        collapsed: menu.collapsed || false,
      };
    }
  } else if (!matchedRoute) {
    return null;
  }

  const isStaticGroupOnly = !matchedRoute.path && matchedRoute.subItems;

  const hasPermission = menu.isReport
    ? context.reportPermissionSet.has(menu.codeBC)
    : context.staticPermissionSet.has(menu._id) || context.roleSet.has(menu._id);

  let hidden = context.isSuperAdmin
    ? false
    : (isStaticGroupOnly ? !hasVisibleSubItems : !hasPermission);

  const hasMappedSubItems = mappedSubItems.length > 0;
  const hasRouteSubItems = matchedRoute.subItems?.length > 0;
  const hasRoutePath = !!matchedRoute.path;

  if (!hasMappedSubItems && !hasRouteSubItems && !hasRoutePath) {
    hidden = true;
  }

  return {
    path: matchedRoute.path,
    element: matchedRoute.element,
    title: matchedRoute.title,
    icon: matchedRoute.icon,
    hidden,
    order: menu.order || 0,
    subItems: hasMappedSubItems
      ? mappedSubItems
      : (matchedRoute.subItems || []).map((route) => ({ ...route })),
    settingIcon: menu.settingIcon,
    count: menu.function?.count,
    functionCode: menu.function?.code || null,
    parent: menu.parent || null,
    collapsed: menu.collapsed || false,
  };
};

export function useDynamicMenuRoutes() {
  const { user } = useContext(AuthContext);
  const { sideBarMenu, sideBarMenuFetched } = useSelector((state) => state.menu);
  const userPermissions = useSelector((state) => state.users.userPermissions);
  const isSuperAdminFromState = useSelector((state) => state.users.isSuperAdmin);
  const authorityData = useSelector((state) => state.authority?.data);
  const [dynamicRoutes, setDynamicRoutes] = useState([]);
  const dispatch = useDispatch();

  const staticRouteMap = useMemo(() => buildStaticRouteMap(routes), []);

  useEffect(() => {
    if (!user) {
      setDynamicRoutes([]);
      return;
    }

    if (!sideBarMenuFetched) {
      dispatch(getSideBarMenu());
    }
  }, [dispatch, user, sideBarMenuFetched]);

  const fetchAndBuildRoutes = useCallback(async () => {
    try {
      if (!user) {
        setDynamicRoutes([]);
        return;
      }

      let userData = userPermissions;
      let isSuperAdmin = isSuperAdminFromState === true;

      if (!userData) {
        try {
          const fetchedAction = await dispatch(ensureUserPermissions(user.user.user));
          const fetched = fetchedAction?.payload || fetchedAction;
          userData = fetched || userData;
          if (userData?.isSuperAdmin) {
            isSuperAdmin = true;
          }
        } catch (err) {
          logger.error("Error fetching user permissions:", err);
          userData = null;
        }
      }

      const menuItems = sideBarMenu || [];
      if (!isSuperAdmin && !menuItems.length) {
        setDynamicRoutes([]);
        return;
      }

      const baseRoles = userData?.roles || [];
      const staticPermissions =
        userData?.staticPermissions?.map((item) => item._id) || [];
      const reportPermissions = userData?.reportPermission || [];

      let resolvedAuthorityData = authorityData;
      if (
        (!resolvedAuthorityData ||
          (Array.isArray(resolvedAuthorityData.roles) &&
            resolvedAuthorityData.roles.length === 0)) &&
        user
      ) {
        try {
          const fetchedAuthAction = await dispatch(ensureAuthority());
          const fetchedAuth = fetchedAuthAction?.payload || fetchedAuthAction;
          resolvedAuthorityData = fetchedAuth || resolvedAuthorityData;
        } catch (err) {
          logger.error("Error fetching authority:", err);
          resolvedAuthorityData = null;
        }
      }

      const mergedRoles = Array.isArray(resolvedAuthorityData?.roles)
        ? [...baseRoles, ...resolvedAuthorityData.roles]
        : baseRoles;

      const roleSet = new Set(mergedRoles);
      const staticPermissionSet = new Set(staticPermissions);
      const permissionSet = new Set([...roleSet, ...staticPermissionSet]);
      const reportPermissionSet = new Set(reportPermissions);

      const context = {
        permissionSet,
        roleSet,
        staticPermissionSet,
        reportPermissionSet,
        staticRouteMap,
        groupCodes: user?.user?.groupCodes || [],
        isSuperAdmin,
      };

      const roots = buildMenuTree(menuItems);

      let homeRoute = null;
      const mappedRoutes = [];

      // Super Admin: lấy trực tiếp all static routes thay vì process từ menu
      if (isSuperAdmin) {
        const allStaticRoutes = convertStaticRoutesToMenuRoutes(routes, isSuperAdmin);

        allStaticRoutes.forEach((route) => {
          if (route.title === "DASHBOARD" || route.title === "TRANG CHỦ") {
            homeRoute = route;
            return;
          }
          mappedRoutes.push(route);
        });

        mappedRoutes.sort((a, b) => sortByOrder(a, b, user?.user?.groupCodes || []));
        const orderedRoutes = homeRoute ? [homeRoute, ...mappedRoutes] : mappedRoutes;
        setDynamicRoutes(applyPermissionRecursive(orderedRoutes));
        return;
      }

      // Non-super admin: process từ menu API như bình thường
      roots.forEach((root) => {
        const mapped = mapMenuToRoute(root, context);
        if (!mapped) {
          return;
        }

        if (root.name === "DASHBOARD" || root.name === "TRANG CHỦ") {
          homeRoute = mapped;
          return;
        }

        mappedRoutes.push(mapped);
      });

      mappedRoutes.sort((a, b) => sortByOrder(a, b, user?.user?.groupCodes || []));

      const orderedRoutes = homeRoute ? [homeRoute, ...mappedRoutes] : mappedRoutes;
      setDynamicRoutes(applyPermissionRecursive(orderedRoutes));
    } catch (error) {
      logger.error("Error fetching menu routes:", error);
      setDynamicRoutes([]);
    }
  }, [authorityData, dispatch, sideBarMenu, staticRouteMap, user, userPermissions, isSuperAdminFromState]);

  useEffect(() => {
    fetchAndBuildRoutes();
  }, [fetchAndBuildRoutes]);

  return dynamicRoutes;
}

export default useDynamicMenuRoutes;
