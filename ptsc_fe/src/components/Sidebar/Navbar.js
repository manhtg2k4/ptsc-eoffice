import React, {
  useContext,
  useState,
  useEffect,
  Suspense,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import {
  Menu,
  MenuItem,
  IconButton,
  Typography,
  styled,
  useTheme,
  useMediaQuery,
  DialogTitle,
  DialogContent,
  Tooltip,
  ClickAwayListener,
  ListItemText,
  Popover,
  ListItem,
  Box,
  List,
  CircularProgress,
  debounce,
} from "@mui/material";
import {
  ArrowBackIos,
  Home,
  Menu as MenuIcon,
  Palette,
  Close as CloseIcon,
  AccountCircle as AccountCircleIcon,
  // Settings,
} from "@mui/icons-material";
import {
  StyledToolbar,
  UserButton,
  // NotificationBox,
  UserDetails,
  MobileMenuButton,
  ThemeConfigDialog,
  // StyledTypography,
  StyledIconButton,
  StyledAppBar,
  // ExpandLessStyled,
  // ExpandMoreStyled,
  TextFieldStyled,
  InputAdornmentStyled,
  BoxContainer,
  BoxChild,
  PopperStyled,
  IconButtonPH,
  PaperStyled,
  BoxImg,
  ListItemButtonStyled,
  ListItemIconStyled,
  ListItemIconStyledMenu,
  AppsSidebarDrawer,
  ParentMenuListItemButton,
  ParentMenuIconContainer,
  ParentMenuTextWrapper,
  ParentMenuStatusText,
  ParentMenuStatusDot,
  PopperMenuHeader,
  PopperMenuIconContainer,
  PopperMenuTitle,
  PopperSubmenuList,
  PopperSubmenuItemIcon,
  ListSt,
  // BoxMD,
  // LinkST,
  UserInitialAvatar,
  // IconButtonST,
  SearchIconST,
  MoreVertIconStyled,
  IconButtonTB,
  IconButtonTI,
  DialogActionsST,
  ButtonCloseST,
  StyledDialogTitle,
  ButtonChangePass,
  StyledOpenInNewRoundedIcon,
  CropContainer,
  CropCaptionText,
  // IconWrapperBox,
  IconSpan,
  CloseIconST,
  PlaceholderBox,
  HiddenInput,
  ModuleIconWrapper,
  LogoImage,
  BrandName,
  Spacer,
  UserContentWrapper,
  UserInfoWrapper,
  UserNameText,
  UserDeptText,
  LogoContainer,
  SearchContainer,
  NavDivider,
} from "@styles/Navbar.styles";
import PropTypes from "prop-types";
import { API_GET_LIST_USERS, API_SEARCH_HEADER_ALL, 
  // CHECK_ROLE, 
  API_FILES_UPLOAD, APP_BASE, API_VIEW_FILE } from "@EnvironmentFile/constants/urlConfig";
import { ensureUserPermissions , ChangePassUsers } from "@redux/slices/managementUsersSlice";
import { useDynamicMenuRoutes } from "../../hooks/useDynamicMenuRoutes";
import { AuthContext } from "../../AuthContext/AuthProvider";
import ChangePassword from "@pages/ListUsers/components/ChangePassword";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";

import { normalizeApiData } from "@pages/ListUsers/utilsDistrict";
import { useThemeMode } from "@styles/ThemeContext";
import LogoutIcon from "@mui/icons-material/Logout";
import Loading from "@components/Loading/Loading";
// import { c } from "framer-motion/dist/types.d-Cjd591yU";
import { NotificationBadge } from "@components/Notification/Notification.styles";
import Notification from "@components/Notification/Notification"; // Import component Notification
import { linkToItPortal, linkToNews } from "@variable";
import { setSelectedModule, setSidebarOpen } from "@redux/slices/layoutSlice";
import { UserProfile } from "../../routers/lazyComponents";
import api from "@services/api";
import ThemeConfigPage from "@pages/ThemeConfig";
import { getComponentByKey } from "@builder-table/components/componentRegistry";
import axiosInstance from "@utils/axiosInstance";
import { openDetailDialog } from "@components/GlobalDialogPortal";
import Chat from "@components/Chat/Chat";
import { StyledSvgW } from "@styles/Sidebar.styles";
import { useUnreadMessages } from "@components/Chat/hooks/useUnreadMessages";
import AdminChangePassword from "@pages/ListUsers/components/AdminChangePassword";
import { useNavigateTo } from "@pages/DashboardPage/ultilDashboard";
import DOMPurify from "dompurify";
import { ReactCrop, centerCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { encodeHTML } from "@/utils/securityUtils";
// import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';


const BackButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(2),
}));

const StyledMenu = styled(Menu)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const UserInfoMenuItem = styled(MenuItem)(({ theme }) => ({
  fontSize: 14,
  pointerEvents: "none",
  "&:hover": {
    backgroundColor: "transparent",
  },
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(1),
}));

const SvgIconFromApi = ({ rawSvg, size = 24 }) => {
  if (!rawSvg || typeof rawSvg !== "string") return null;

  let svg = decodeHtml(rawSvg);
  svg = svg.replace(/^"|"$/g, "").trim();
  svg = svg
    .replace(/fill="[^"]*"/g, 'fill="currentColor"')
    .replace(/fill:\s*[^;"]+;?/g, "fill: currentColor;")
    .replace(/<svg([^>]*)>/, `<svg$1 fill="currentColor">`)
    .replace(/width="\w*"/g, `width="${size}"`)
    .replace(/height="\w*"/g, `height="${size}"`);

  return (
    <StyledSvgW
      styledWidth={size}
      styledHeight={size}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(encodeHTML(svg)) }}
    />
  );
};

const decodeHtml = (html) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

const StyledMenuItem = styled(MenuItem)({
  fontSize: 14,
  gap: 2,
});

const SearchPopover = styled(Popover)(({ theme }) => ({
  "& .MuiPaper-root": {
    marginTop: theme.spacing(1),
    maxHeight: 400,
    width: 400,
    [theme.breakpoints.down("sm")]: {
      width: "90vw",
    },
  },
}));

const SearchListItem = styled(ListItem)(({ theme }) => ({
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const NoResultsBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: "center",
  color: theme.palette.text.secondary,
}));

const SearchResultsBox = styled(Box)(() => ({
  width: 400, maxHeight: 400, overflow: 'auto'
}));

const SearchResults = styled(Box)(() => ({
  p: 1, textAlign: 'center', color: 'text.secondary', fontSize: '0.875rem'
}));

const SearchTypography = styled(Typography)(() => ({
  color: 'primary'
}));

const SearchBox = styled(Box)(() => ({
  display: 'flex', justifyContent: 'center', py: 3
}));
const VersionMenuItem = styled(MenuItem)(({ theme }) => ({

  justifyContent: "center",
  color: theme.palette.text.secondary,
  opacity: 0.5,
  pointerEvents: "none",
  "&:hover": {
    backgroundColor: "transparent",
  },
}));

const ROLE_TO_COMPONENT_MAP = {
  // Văn bản đến
  tiepNhan: "ADD_INCOMING_DOC",
  tiepnhanVT: "ADD_INCOMING_DOC",
  VanbandenSoVB: "ADD_INCOMING_DOC_BOOK",
  SoVBden: "ADD_INCOMING_DOC_BOOK",

  // Văn bản đi
  trinhkyduthaovbdi: "ADD_OUTCOMING_DOC",
  SoVBDi: "ADD_OUTCOMING_DOC_BOOK",

  // Văn bản ban hành - Văn thư cục
  ChoBanHanhVTC: "ADD_OUTCOMING_PROMULGATE_VTC",
  // DaBanhanhC: "ADD_OUTCOMING_PROMULGATE_VTC",

  // Văn bản ban hành - Văn thư phòng
  ChoBanHanhVTP: "ADD_OUTCOMING_PROMULGATE_PHONG",
  vbdiDabanHanhVTP: "ADD_OUTCOMING_PROMULGATE_PHONG",
};

const formatMenuLabel = (roleCode, originalName) => {
  const labelMap = {
    // Văn bản đến
    'tiepNhan': 'Thêm mới văn bản đến',
    'tiepnhanVT': 'Thêm mới văn bản đến',
    'VanbandenSoVB': 'Thêm mới Sổ văn bản đến',
    'SoVBden': 'Thêm mới Sổ văn bản đến',

    // Văn bản đi
    'trinhkyduthaovbdi': 'Thêm mới văn bản đi',
    'SoVBDi': 'Thêm mới Sổ văn bản đi',

    // Văn bản ban hành - Văn thư cục
    'ChoBanHanhVTC': 'Thêm mới văn bản ban hành',

    // Văn bản ban hành - Văn thư phòng
    'ChoBanHanhVTP': 'Thêm mới văn bản ban hành',
    'vbdiDabanHanhVTP': 'Thêm mới văn bản ban hành',
  };

  const prefix = labelMap[roleCode];

  // Nếu có prefix thì kết hợp: "Thêm mới văn bản đến (Tiếp nhận)"
  if (prefix && originalName) {
    return `${prefix} (${originalName})`;
  }

  // Nếu không có prefix thì giữ nguyên tên gốc
  return originalName;
};


const Navbar = ({ isOpen, actions, toggleSidebar }) => {
  const dynamicMenuRoutes = useDynamicMenuRoutes();
  const toast = useToast();

	const navigateTo = useNavigateTo();
  const { themeOptions } = useThemeMode();
  const { dataUser } = useSelector((state) => state.auth);
  const userData = dataUser
  // console.log(userData);
  const { user, logout, setUser } = useContext(AuthContext); // Lấy thêm logout từ context
  // const combinedRoutes = [...dynamicMenuRoutes];
  const { sideBarMenu } = useSelector((state) => state.menu);
  const userPermissions = useSelector((state) => state.users.userPermissions);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(426));
  const isSmallScreen = useMediaQuery("(max-width: 1131px)");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const [anchorEl, setAnchorEl] = useState(null);
  const [moreAnchorEl, setMoreAnchorEl] = useState(null); // State cho menu tiện ích trên mobile
  const isMenuOpen = Boolean(anchorEl);
  const location = useLocation(); // Lấy route hiện tại
  const navigate = useNavigate(); // Dùng để điều hướng
  const dispatch = useDispatch();
  const selectedModuleCode = useSelector(
    (state) => state.layout.selectedModuleCode
  );
  const [openDialogs, setOpenDialogs] = useState({ changePass: false });
  const [isLoading, setIsLoading] = useState(false);
  const popperTimerRef = React.useRef();
  const [popperAnchorEl, setPopperAnchorEl] = useState(null);
  const [popperSubItems, setPopperSubItems] = useState([]);
  const [popperParentItem, setPopperParentItem] = useState(null); // <-- THÊM STATE MỚI
  const openPopper = Boolean(popperAnchorEl);
  // State để quản lý sidebar ứng dụng
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAppsSidebarOpen, setAppsSidebarOpen] = useState(false);

  const [openThemeConfigDialog, setOpenThemeConfigDialog] = useState(false);
  const [openUserProfileDialog, setOpenUserProfileDialog] = useState(false);
  const [addMenuItems, setAddMenuItems] = useState([]);

  // state search
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const [suggestedResults, setSuggestedResults] = useState([]);
  const searchInputRef = useRef(null);
  // Cờ để tránh gọi API suggested nhiều lần
  const hasFetchedSuggested = useRef(false);
  // Thêm state cho virtual scroll
  const LOAD_MORE_STEP = 10;       // Mỗi lần scroll xuống load thêm 10
  const listRef = useRef(null);
  const DISPLAY_ITEMS = 20; // số item luôn hiển thị trong viewport
  const [startIndex, setStartIndex] = useState(0);
  // const isSuperAdmin = useSelector((state) => state.users.isSuperAdmin);
  // const checkPermissionAdmin = isSuperAdmin || userPermissions?.staticPermissions?.some(
  //   (permission) => permission.code === CHECK_ROLE
  // );
  const [openAdminChangePass, setOpenAdminChangePass] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // States cho cắt ảnh
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [cropTarget, setCropTarget] = useState(null);
  const imgRef = useRef(null);

  // Hàm lấy ảnh avatar qua API view (cần token nên phải gọi qua api instance)
  const fetchAvatar = useCallback(async (profileImage) => {
    if (!profileImage) {
      setAvatarUrl(null);
      return;
    }

    try {
      const fileId = typeof profileImage === 'object' ? profileImage?.id : null;
      const filePath = typeof profileImage === 'object' ? profileImage?.file_path : profileImage;

      // Nếu có ID thì ưu tiên dùng API view theo ID
      let viewUrl = "";
      if (fileId) {
        viewUrl = `${API_VIEW_FILE}/${fileId}`;
      } else if (filePath) {
        // Fallback sang đường dẫn nếu không có ID
        viewUrl = filePath.startsWith('http') ? filePath : `${APP_BASE}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
      }

      if (!viewUrl) {
        setAvatarUrl(null);
        return;
      }

      // Nếu là URL tuyệt đối bên ngoài thì dùng luôn
      if (viewUrl.startsWith('http') && !viewUrl.includes(APP_BASE)) {
        setAvatarUrl(viewUrl);
        return;
      }

      const res = await api.get(viewUrl, {
        responseType: "blob",
        timeout: 0,
      });

      if (res.data) {
        const blob = new Blob([res.data], {
          type: res.headers["content-type"] || "image/jpeg",
        });
        const url = URL.createObjectURL(blob);
        
        // Dọn dẹp URL cũ nếu có
        setAvatarUrl(prev => {
          if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
          return url;
        });
      }
    } catch (error) {
      setAvatarUrl(null);
    }
  }, []);

  useEffect(() => {
    if (user?.user?.profileImage) {
      fetchAvatar(user.user.profileImage);
    } else {
      setAvatarUrl(null);
    }

    return () => {
      setAvatarUrl(prev => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [user?.user?.profileImage, fetchAvatar]);

  const fileInputRef = useRef(null);

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast("Kích thước file không được vượt quá 5MB", "error");
        return;
      }

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCropImageSrc(reader.result);
          setIsCropDialogOpen(true);
          setCropTarget("featured");
          setCrop(undefined); // Reset crop
        };
        reader.readAsDataURL(file);
      } else {
        toast("Vui lòng chọn file hình ảnh", "error");
      }
      event.target.value = "";
    }
  };

  const onImageLoad = useCallback((e) => {
    const width = e.currentTarget.width;
    const height = e.currentTarget.height;
    const crop = centerCrop(
      {
        unit: "%",
        width: 80,
        height: 80,
      },
      width,
      height
    );
    setCrop(crop);
    imgRef.current = e.currentTarget;
  }, []);

  const handleCropChange = useCallback((c) => {
    setCrop(c);
  }, []);

  const handleCropComplete = useCallback((c) => {
    setCompletedCrop(c);
  }, []);

  const handleCropConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;

    setIsLoading(true);
    try {
      const canvas = document.createElement("canvas");
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );

      // const base64Image = canvas.toDataURL("image/jpeg");
      // const res = await fetch(base64Image);
      // const blob = await res.blob();
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
      });
      const fileName = `avatar_${Date.now()}.jpg`;
      const croppedFile = new File([blob], fileName, { type: "image/jpeg" });

      const userId = user?.user?.id || user?.user?._id;
      const formData = new FormData();
      formData.append("file", croppedFile);
      formData.append("object_type", "users");
      formData.append("object_id", userId);

      const uploadRes = await api.post(API_FILES_UPLOAD, formData);
      const resData = uploadRes?.data;
      const fileData = resData?.data || resData;
      const fileInfo = Array.isArray(fileData) ? fileData[0] : fileData;

      if (!fileInfo || !fileInfo.file_path) {
        throw new Error("Không tìm thấy thông tin file sau khi upload");
      }

      const updateRes = await api.patch(`${API_GET_LIST_USERS}/profile`, {
        profileImage: fileInfo,
      });

      if (updateRes.status === 200 || updateRes.data?.success) {
        toast("Cập nhật avatar thành công", "success");
        setUser((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            profileImage: fileInfo,
          },
        }));
      } else {
        toast("Cập nhật avatar thất bại", "error");
      }
    } catch (error) {
      toast("Đã xảy ra lỗi khi cập nhật avatar", "error");
    } finally {
      setIsLoading(false);
      setIsCropDialogOpen(false);
      setCropImageSrc("");
      setCropTarget(null);
    }
  };

  const handleCloseCropDialog = useCallback(() => {
    setIsCropDialogOpen(false);
    setCropImageSrc("");
    setCropTarget(null);
  }, []);
 

  ///////
  const [chatAnchorEl, setChatAnchorEl] = useState(null);
  const [version, setVersion] = useState('...');

  useEffect(() => {
    // Fetch version.json với timestamp để bypass cache
    fetch(`/version.json?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => setVersion(data.version))
      .catch(() => setVersion('dev'));
  }, []);
  const handleChatClick = (event) => {
    setChatAnchorEl(event.currentTarget);
    handleMoreMenuClose();
  };

  const handleChatClose = () => {
    setChatAnchorEl(null);
  };

  const { totalUnread, fetchUnread } = useUnreadMessages();

  useEffect(() => {
    if (!user?.user?._id) return;
    fetchUnread(user.user._id);
    const handler = () => {
      if (user?.user?._id) {
        fetchUnread(user.user._id);
      }
    };
    window.addEventListener("chat:conversation-opened", handler);
    window.addEventListener("chat:refresh-unread", handler);
    return () => {
      window.removeEventListener("chat:refresh-unread", handler);
      window.removeEventListener("chat:conversation-opened", handler);
    };
  }, [fetchUnread, user]);
  //////

  // userPermissions are read from redux state (state.users.userPermissions)
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);

  useEffect(() => {
    if (themeOptions.app?.logoText) {
      document.title = themeOptions.app.logoText;
    }
  }, [themeOptions.app?.logoText]);
  const [addMenuAnchorEl, setAddMenuAnchorEl] = useState(null);
  const handleAddMenuOpen = (event) => {
    setAddMenuAnchorEl(event.currentTarget);
  };
  const handleAddMenuClose = () => {
    setAddMenuAnchorEl(null);
  };
  const handleOpenAddNewAndCloseMore = (event) => {
    handleMoreMenuClose(); // Đóng menu "Tiện ích"
    handleAddMenuOpen(event); // Mở menu "Thêm mới"
  };




  useEffect(() => {
    // Ensure user permissions are loaded in redux; dispatch only if missing
    if (!user?.user?.user) return;
    if (userPermissions) return; // already loaded

    const load = async () => {
      try {
        await dispatch(ensureUserPermissions(user.user.user));
      } catch (err) {
        logger.error("Error fetching user permissions:", err);
      }
    };

    load();
  }, [user, userPermissions, dispatch]);

  useEffect(() => {
    const buildAddMenuItems = () => {
      if (!user?.user?.user) return;

      const userRoles = userPermissions?.roles || [];

      if (userRoles.length === 0) {
        setAddMenuItems([]);
        return;
      }

      const allMenus = sideBarMenu || [];

      const filteredItems = allMenus
        .filter((item) => userRoles.includes(item.function?.code))
        .map((item) => {
          const roleCode = item.function?.code;
          const componentKey = ROLE_TO_COMPONENT_MAP[roleCode];

          return {
            // Sử dụng hàm formatMenuLabel để format text
            name: formatMenuLabel(roleCode, item.name),
            path: item.function?.path ? `/${item.function.path}` : "#",
            roleCode: roleCode,
            componentKey: componentKey,
          };
        })
        .filter((item) => item.componentKey);

      setAddMenuItems(filteredItems);
    };

    // If userPermissions not available yet, trigger fetch in previous effect and wait
    buildAddMenuItems();
  }, [user, sideBarMenu, userPermissions]);

  // Hàm gọi API tìm kiếm
  const searchAPI = useCallback(async (searchText) => {
    if (!searchText || searchText.trim().length === 0) {
      setSearchResults(suggestedResults);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.get(API_SEARCH_HEADER_ALL, {
        params: { searchText: searchText.trim() },
      });
      setSearchResults(response.data.data || []);
    } catch (error) {
      logger.error("Error searching:", error);
      setSearchResults([]);
      toast("Lỗi khi tìm kiếm", "error");
    } finally {
      setSearchLoading(false);
    }
    setStartIndex(0); // reset về đầu
  }, [suggestedResults, toast]);

  // Thêm debounce cho search
 const debouncedSearch = useMemo(
  () =>
    debounce((searchText) => {
      searchAPI(searchText);
    }, 500),
  [searchAPI]
);

  // Xử lý khi nhập text - CHỈ CẦN THAY ĐỔI HÀM NÀY
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);

    // Luôn mở popover khi có tương tác gõ
    const inputElement = searchInputRef.current;
    if (inputElement) {
      // Lấy phần tử cha đúng để làm anchor (thường là div bao TextField)
      const anchor = inputElement.closest('.MuiInputBase-root') || inputElement.parentElement?.parentElement;
      setSearchAnchorEl(anchor);
    }

    if (!value.trim()) {
      setSearchResults(suggestedResults);
      setStartIndex(0); // reset về đầu
      return;
    }

    // Debounced search
    debouncedSearch(value.trim());
  }
  function handleOpenPasswordFromProfile() {
    setOpenAdminChangePass(true);
  }
  function handleCloseAdminChangePass() {
    setOpenAdminChangePass(false);
  }
  async function handleAdminChangePassSubmit(data) {
    setIsLoading(true);
    try {
      const userId = user?.user?._id; 
      if (!userId) {
        toast("Không tìm thấy thông tin người dùng", "error");
        return;
      }
      const payload = {
        newPassword: data.newPassword
      };

      if (data.oldPassword) {
        payload.oldPassword = data.oldPassword;
      }

      const response = await api.put(`${API_GET_LIST_USERS}/${userId}/password`, payload);

      // 3. Xử lý kết quả trả về
      if (response?.data?.success || response?.status === 200) {
        handleCloseAdminChangePass();
        toast("Đổi mật khẩu thành công.", "success");
      } else {
        toast(response?.data?.message || "Đã xảy ra lỗi khi đổi mật khẩu!", "error");
      }
    } catch (error) {
      // Xử lý lỗi từ server (ví dụ: mật khẩu cũ không đúng)
      const errorMsg = error.response?.data?.message || error.message || "Lỗi kết nối hệ thống";
      toast(errorMsg, "error");
      logger.error("Change password error:", error);
    } finally {
      setIsLoading(false);
    }
  }
  // Xử lý focus: mở popover và load gợi ý nếu chưa có (chỉ fetch 1 lần duy nhất)
  async function handleSearchFocus(e) {
    // Không kích hoạt search khi đang có dialog khác đang mở
    if (openAdminChangePass || openUserProfileDialog || openThemeConfigDialog) return;

    setSearchAnchorEl(e.currentTarget);

    if (!searchValue.trim() && !hasFetchedSuggested.current) {
      hasFetchedSuggested.current = true; // đánh dấu trước để không fetch lại khi event fire nhiều lần
      setSearchLoading(true);
      try {
        const response = await axiosInstance.get(API_SEARCH_HEADER_ALL);
        if (response) {
          const data = response || [];
          setSuggestedResults(data);
          setSearchResults(data);
        }
      } catch (error) {
        logger.error("Error fetching suggested results:", error);
        setSearchResults([]);
        hasFetchedSuggested.current = false; // reset nếu lỗi để có thể thử lại
      } finally {
        setSearchLoading(false);
      }
    } else {
      setSearchResults(searchValue.trim() ? searchResults : suggestedResults);
    }
  }

  // (Bạn có thể giữ lại để hỗ trợ Enter nếu muốn, nhưng không bắt buộc)

  function handleSearchKeyPress(e) {
    if (e.key === 'Enter' && searchValue && searchValue.trim()) {
      searchAPI(searchValue);
      setSearchAnchorEl(e.currentTarget);
    }
  }

  // Đóng dropdown
  function handleSearchClose() {
    setSearchAnchorEl(null);
  }

  const handleClearSearch = useCallback(function(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsMobileSearchOpen(false);
    setSearchValue("");
    setSearchResults([]);
  }, []);

  const handleMobileSearchOpen = useCallback(function() {
    setIsMobileSearchOpen(true);
  }, []);

  const handleLogoClick = useCallback(function() {
    if (!linkToNews) return;
    if (linkToNews.startsWith("http")) {
      window.location.href = linkToNews;
    } else {
      navigate(linkToNews);
    }
  }, [linkToNews, navigate]);

  const combinedRoutes = useMemo(() => {
    const cloneRoute = (route) => ({
      ...route,
      subItems: route.subItems?.map(cloneRoute) || [],
    });

    return dynamicMenuRoutes.map(cloneRoute);
  }, [dynamicMenuRoutes]);

  // --- LOGIC TỪ SIDEBAR CHÍNH ---
  function hasSlug(path) {
    return path && path.includes(":");
  }
  // Hàm mở/đóng menu tiện ích trên mobile
  function handleMoreMenuOpen(event) {
    setMoreAnchorEl(event.currentTarget);
  }

  function handleMoreMenuClose() {
    setMoreAnchorEl(null);
  }

  // Hàm mở popover thông báo từ menu mobile
  function handleNotificationClick(event) {
    setNotificationAnchorEl(event.currentTarget);
    handleMoreMenuClose(); // Đóng menu tiện ích nếu đang mở
  }

  // const handleNewsClick = () => {
  //   window.open(`${CHANGE_DIRECTION_URL}`, "_blank");
  //   handleMoreMenuClose();
  // };
  function handleNotificationClose() {
    setNotificationAnchorEl(null);
  }

  function handleUpdateUnreadCount(count) {
    setUnreadCount(count);
  }

  // Hàm lọc sub-items đệ quy
  const filterSubItems = useCallback((subItems) => {
    if (!subItems || subItems.length === 0) return false;

    return subItems.some((item) => {
      // Bỏ qua các item hidden hoặc có slug
      if (item.hidden || hasSlug(item.path)) return false;

      // Nếu có subItems, check đệ quy
      if (item.subItems && item.subItems.length > 0) {
        return filterSubItems(item.subItems);
      }

      // Item này có thể hiển thị
      return true;
    });
  }, []);

	//Hàm cũ chưa có sort theo order
  // const filteredRoutes = useMemo(() => {
  //   return combinedRoutes.filter((route) => {
  //     // Bỏ qua routes có slug hoặc hidden
  //     if (hasSlug(route.path) || route.hidden) return false;

  //     // Nếu là menu cha (không có path), check có con nào hiển thị không
  //     if (route.subItems && !route.path) {
  //       return filterSubItems(route.subItems);
  //     }

  //     return true;
  //   });
  // }, [combinedRoutes, filterSubItems]);

  
	const filteredRoutes = useMemo(() => {
  	const filtered = combinedRoutes.filter((route) => {
  	  // Bỏ qua routes có slug hoặc hidden
  	  if (hasSlug(route.path) || route.hidden) return false;

  	  // Nếu là menu cha (không có path), check có con nào hiển thị không
  	  if (route.subItems && !route.path) {
  	    return filterSubItems(route.subItems);
  	  }

  	  return true;
  	});

  	return [...filtered].sort((a, b) => {
      // Ưu tiên "Điều hành văn bản" lên đầu nếu là văn thư TCT
      const groupCodes = user?.user?.groupCodes || [];
      if (groupCodes.includes("vanthutct")) {
        const isADHV = a.title === "Điều hành văn bản" || a.name === "Điều hành văn bản";
        const isBDHV = b.title === "Điều hành văn bản" || b.name === "Điều hành văn bản";
        if (isADHV && !isBDHV) return -1;
        if (!isADHV && isBDHV) return 1;
      }

  	  const getPriority = (item) => {
  	    if (item.order === undefined || item.order === null) return 2; // thấp nhất
  	    if (item.order === 0) return 1; // sau order > 0
  	    return 0; // ưu tiên cao nhất
  	  };

  	  const priorityA = getPriority(a);
  	  const priorityB = getPriority(b);

  	  // So sánh theo nhóm ưu tiên trước
  	  if (priorityA !== priorityB) {
  	    return priorityA - priorityB;
  	  }

  	  // Nếu cùng nhóm thì sort tiếp theo order tăng dần
  	  const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
  	  const orderB = b.order ?? Number.MAX_SAFE_INTEGER;

  	  return orderA - orderB;
  	});
	}, [combinedRoutes, filterSubItems, user]);

  // Hàm tìm phân hệ dựa trên đường dẫn hiện tại
  const findModuleByPath = useCallback((path, routes) => {
    if (!routes) return null;
    
    // Kiểm tra đệ quy xem đường dẫn hiện tại có khớp với route hoặc bất kỳ menu con nào không
    const checkMatch = (route) => {
      if (route.path && typeof route.path === "string") {
        // Sử dụng end: false để khớp các đường dẫn con (prefix match)
        const match = matchPath({ path: route.path, end: false }, path);
        if (match) {
          // Trường hợp đặc biệt cho trang chủ "/"
          if (route.path === "/" && path !== "/") return false;
          return true;
        }
      }
      if (route.subItems && route.subItems.length > 0) {
        return route.subItems.some(sub => checkMatch(sub));
      }
      return false;
    };

    return routes.find(route => checkMatch(route));
  }, []);

  // Tìm đối tượng module đầy đủ từ code được lưu trong Redux
  const selectedModule = useMemo(() => {
    if (!selectedModuleCode) return null;
    return filteredRoutes.find(
      (r) =>
        r.codeRouter === selectedModuleCode || r.title === selectedModuleCode
    );
  }, [selectedModuleCode, filteredRoutes]);

  // Đồng bộ phân hệ được chọn với URL hiện tại khi mount và khi chuyển trang
  useEffect(() => {
    if (filteredRoutes && filteredRoutes.length > 0) {
      const match = findModuleByPath(location.pathname, filteredRoutes);
      if (match) {
        const code = match.codeRouter || match.title;
        // Chỉ cập nhật nếu khác để tránh loop render
        if (selectedModuleCode !== code) {
          dispatch(setSelectedModule(code));
        }
      } else if (!selectedModuleCode) {
        // Nếu không khớp URL nào và chưa có gì được chọn, mặc định lấy cái đầu tiên
        dispatch(
          setSelectedModule(
            filteredRoutes[0].codeRouter || filteredRoutes[0].title
          )
        );
      }
    }
  }, [filteredRoutes, location.pathname, dispatch, selectedModuleCode, findModuleByPath]);

  // --- KẾT THÚC LOGIC TỪ SIDEBAR CHÍNH ---

  // Kiểm tra nếu path có dạng "/manage-unit/:id" hoặc "/something/:id" hoặc là chi tiết nhóm người dùng
  const hasDynamicId = combinedRoutes.some(
    (route) =>
      route.path && matchPath(route.path.replace(":id", "*"), location.pathname)
  );
  // Thêm điều kiện riêng cho chi tiết nhóm người dùng
  const isGroupUserDetail = /\/manage-group-user\/[\w-]+$/.test(
    location.pathname
  );
  const backPage =
    location.pathname.startsWith("/profile-management/add/") ||
    location.pathname.startsWith("/profile-management/edit/citizen") ||
    location.pathname.startsWith("/profile-management/edit/enterprise") ||
    location.pathname.startsWith("/profile-management/view/citizen") ||
    location.pathname.startsWith("/profile-management/view/enterprise") ||
    isGroupUserDetail;
  // Hàm tìm tiêu đề theo đường dẫn hiện tại
  // const findTitleByPath = (path) => {
  //   // Kiểm tra path có tồn tại không
  //   if (!path) return `${themeOptions.app?.logoText || titleApp}`;

  //   for (const route of combinedRoutes) {
  //     // Chỉ gọi matchPath nếu route.path tồn tại và là chuỗi
  //     if (route.path && typeof route.path === "string") {
  //       const match = matchPath({ path: route.path, exact: true }, path);
  //       if (match) return route.title;
  //     }

  //     if (route.subItems) {
  //       const subRoute = route.subItems.find((sub) =>
  //         // Chỉ gọi matchPath nếu sub.path tồn tại và là chuỗi
  //         sub.path && typeof sub.path === "string"
  //           ? matchPath({ path: sub.path, exact: true }, path)
  //           : false
  //       );
  //       if (subRoute)
  //         return (
  //           subRoute.configTitleTTHC ||
  //           subRoute.configTitleTTHC2 ||
  //           subRoute.configTitleTTHC3 ||
  //           subRoute.configTitleTTHC4 ||
  //           subRoute.title
  //         );
  //     }
  //   }
  //   return `${themeOptions.app?.logoText || titleApp}`;
  // };

  // const currentTitle = findTitleByPath(location.pathname);

  function handleMenuOpen(event) {
    setAnchorEl(event.currentTarget);
  }
  function handleMenuClose() {
    setAnchorEl(null);
  }
  function handleMenuLinkToTrangChuAndClose() {
    navigate("/");
    setAnchorEl(null);
  }

  // function handleMenuLinkToAuthConfigAndClose() {
  //   navigate("/admin/auth-config");
  //   setAnchorEl(null);
  // }

  function handleOpenUserProfileDialog() {
    setOpenUserProfileDialog(true);
    setAnchorEl(null);
  }

  // Hàm để mở/đóng sidebar ứng dụng
  // function handleAppsSidebarOpen() {
  //   setAppsSidebarOpen(true);
  // }
  function handleAppsSidebarClose() {
    setAppsSidebarOpen(false);
  }

  function handleOpenThemeConfigDialog() {
    setOpenThemeConfigDialog(true);
    setAnchorEl(null);
  }
  function handleCloseThemeConfigDialog() {
    setOpenThemeConfigDialog(false);
  }

  // function handleOpenStorageService() {
  //   navigate("/admin/storage-service");
  //   setAnchorEl(null);
  // }

  // const handleCloseDialog = (dialogKey) => {
  // 	setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  // };

  const handleCloseDialog = useCallback(
    (dialogKey) => {
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
    },
    [setOpenDialogs]
  );

  //   const handleCloseThemeConfigDialog = () => {
  //     // ✅ Chỉ đóng dialog, không cần gọi API ở đây nữa
  //     setOpenThemeConfigDialog(false);
  //   };

  function handleCloseUserProfileDialog() {
    setOpenUserProfileDialog(false);
  }

  async function handleChangePass(data) {
    setIsLoading(true);
    const formattedData = normalizeApiData(data);
    try {
      const userId = user?.user?._id;
      if (!userId) {
        toast("Không tìm thấy thông tin người dùng.", "error");
        return;
      }

      const res = await dispatch(
        ChangePassUsers({ idUser: userId, changePassData: formattedData })
      );

      if (res?.payload?.success) {
        handleCloseDialog("changePass");
        toast("Đổi mật khẩu thành công.", "success");
      } else {
        toast(
          res?.payload?.message || "Đã xảy ra lỗi khi đổi mật khẩu!",
          "error"
        );
      }
    } catch (error) {
      toast(error?.message || "Đã xảy ra lỗi khi đổi mật khẩu!", "error");
    } finally {
      setIsLoading(false);
    }
  }
  // const handleOpenChangePasswordDialog = useCallback(() => setOpenDialogs((prev) => ({ ...prev, changePass: true })), []);
  const handleBack = useCallback(function() { navigate(-1); }, [navigate]);

  const handleCloseChangePassDialog = useCallback(function() {
    handleCloseDialog("changePass");
  }, [handleCloseDialog]);

  // Hàm xử lý cho Popper
  const handleMenuEnter = (event, item) => {
    clearTimeout(popperTimerRef.current);
    setPopperAnchorEl(event.currentTarget);
    setPopperSubItems(item.subItems || []);
    setPopperParentItem(item); // <-- LƯU LẠI ITEM CHA
  };

  // const handleMenuLeave = () => {
  // 	popperTimerRef.current = window.setTimeout(() => {
  // 		handlePopperClose();
  // 	}, 200); // Đợi 200ms trước khi đóng
  // };

  // const handlePopperMouseEnter = useCallback(() => {
  // 	clearTimeout(popperTimerRef.current);
  // }, []);

  function handlePopperClose() {
    setPopperAnchorEl(null);
    setPopperSubItems([]);
    setPopperParentItem(null); // <-- RESET KHI ĐÓNG
  }

  // Hàm viết hoa chữ cái đầu và viết thường các chữ còn lại
  function capitalizeFirstLetter(string) {
    if (typeof string !== "string" || !string) return "";
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

  // Hàm xử lý khi click vào menu con trong Popper
  const handleSubItemClick = useCallback(
    (subItem) => {
      // Hàm tìm kiếm đệ quy path hợp lệ đầu tiên
      const findFirstNavigableNode = (node) => {
        if (node.path) return node;
        if (node.subItems && node.subItems.length > 0) {
          for (const sub of node.subItems) {
            const foundNode = findFirstNavigableNode(sub);
            if (foundNode) return foundNode;
          }
        }
        return null;
      };

      // Tìm node để điều hướng, ưu tiên chính nó hoặc con của nó
      const firstNode = findFirstNavigableNode(subItem);

      if (firstNode) {
        // CẬP NHẬT PHÂN HỆ CHA KHI CHỌN CON
        if (popperParentItem) {
          dispatch(
            setSelectedModule(
              popperParentItem.codeRouter || popperParentItem.title
            )
          );
        }

        navigate(firstNode.path);
        // Đóng tất cả các menu sau khi điều hướng thành công
        handlePopperClose(); // Đóng popper
        handleAppsSidebarClose(); // Đóng sidebar chọn phân hệ

        if (firstNode.collapsed) {
          dispatch(setSidebarOpen(false));
        } else if (!isMobile) {
          dispatch(setSidebarOpen(true));
        }
      }
    },
    [navigate, popperParentItem, dispatch, isMobile]
  ); // Dependencies: Thêm popperParentItem và dispatch
  function onSubItemClick(item) {
    return function() {
      handleSubItemClick(item);
    };
  }

  // Hàm tạo handler cho sự kiện onMouseEnter, được bọc trong useCallback để tối ưu
  const createMenuEnterHandler = useCallback(
    function(item) {
      return function(event) {
        const hasSubItems = item.subItems && item.subItems.length > 0;
        if (hasSubItems) {
          handleMenuEnter(event, item);
        }
      };
    },
    []
  ); // handleMenuEnter không thay đổi nên dependencies rỗng

  const handleAddMenuItemClick = useCallback(function(item) {
    handleAddMenuClose();

    if (item.componentKey) {
      const componentConfig = getComponentByKey(item.componentKey);

      if (componentConfig) {
        openDetailDialog(componentConfig, null);
      }
    } else if (item.path && item.path !== "#") {
      navigate(item.path);
      handleAddMenuClose();
    }
  }, [navigate]);

  const createAddMenuItemHandler = useCallback(function(item) {
    return function() {
      handleAddMenuItemClick(item);
    };
  }, [handleAddMenuItemClick]);

  const handleCloseAddDialog = useCallback(function() {
    setOpenAddDialog(false);
    setSelectedComponent(null);
  }, []);

  const handleSearchResultItemClick = useCallback(function(result) {
    return function() {
      const componentConfig = getComponentByKey(result.key_screen);

      if (componentConfig) {
        openDetailDialog(componentConfig, result.document_id);
      } else if (result.path) {
        navigate(result.path);
      }

      handleSearchClose(); // đóng popover tìm kiếm
      if (isSmallScreen) {
        setIsMobileSearchOpen(false);
      }
    };
  }, [navigate, isSmallScreen]);

  const handleSearchScroll = useCallback(() => {
    if (!listRef.current || searchResults.length === 0) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const itemHeight = 48; // chiều cao ước lượng mỗi item

    // Tính chỉ số đầu tiên đang hiển thị
    const currentStartIndex = Math.floor(scrollTop / itemHeight);

    // Khi scroll xuống gần đáy → tăng startIndex
    if (scrollTop + clientHeight >= scrollHeight - 150) {
      setStartIndex(prev => {
        const newIndex = prev + LOAD_MORE_STEP;
        return Math.min(newIndex, searchResults.length - DISPLAY_ITEMS);
      });
    }

    // Khi scroll lên gần đầu → giảm startIndex (nếu đang ở xa đầu)
    if (currentStartIndex < 5 && startIndex > 0) { // khi đang hiển thị ít hơn 5 item đầu tiên
      setStartIndex(prev => Math.max(prev - LOAD_MORE_STEP, 0));
    }
  }, [searchResults.length, startIndex]);

	const firstLetter = user?.user?.username?.charAt(0).toUpperCase() || "";
	
	const handleLinkToCNTT = useCallback(() => {
		navigateTo(linkToItPortal);
	}, [navigateTo]);

  return (
    <StyledAppBar isOpen={isOpen}>
      {/* --- BẮT ĐẦU: SIDEBAR ỨNG DỤNG --- */}
      <AppsSidebarDrawer
        anchor="left"
        open={isAppsSidebarOpen}
        onClose={handleAppsSidebarClose}
      >
        <BoxContainer role="presentation">
          <BoxChild>
            <Typography variant="h6" component="div">
              Chọn phân hệ
            </Typography>
            <IconButtonPH onClick={handleAppsSidebarClose} aria-label="close">
              <CloseIcon />
            </IconButtonPH>
          </BoxChild>
          <ListSt component="nav">
            {/* Chỉ render menu cấp 1 */}
            {filteredRoutes.map((item, index) => {
              const key = `parent-${index}`;
              // const hasSubItems = item.subItems && item.subItems.length > 0;
              const isSelected = selectedModule?.title === item.title;
              // const isPopperOpenForThisItem = openPopper && popperParentItem?.title === item.title;

              const handleParentItemClick = () => {
                // Luôn dispatch để chọn phân hệ và cập nhật sidebar chính
                dispatch(setSelectedModule(item.codeRouter || item.title));
                handleAppsSidebarClose(); // Đóng sidebar chọn phân hệ
                handlePopperClose(); // Đóng popper nếu đang mở

                // Điều hướng đến trang đầu tiên của phân hệ
                const findFirstNavigableNode = (node) => {
                  if (node.path) return node;
                  if (node.subItems && node.subItems.length > 0) {
                    return findFirstNavigableNode(node.subItems[0]);
                  }
                  return null;
                };
                
                const firstNode = findFirstNavigableNode(item);
                if (firstNode) {
                  navigate(firstNode.path);
                  
                  if (firstNode.collapsed) {
                    dispatch(setSidebarOpen(false));
                  } else if (!isMobile) {
                    dispatch(setSidebarOpen(true));
                  }
                } else {
                  if (item.collapsed) {
                    dispatch(setSidebarOpen(false));
                  } else if (!isMobile) {
                    dispatch(setSidebarOpen(true));
                  }
                }
              };
              return (
                <ParentMenuListItemButton
                  id={key}
                  key={key}
                  onClick={handleParentItemClick} // Chỉ sử dụng onClick
                  selected={isSelected}
                  onMouseEnter={
                    !isMobile ? createMenuEnterHandler(item) : undefined
                  }
                >
                  <ListItemIconStyledMenu>
                    <ParentMenuIconContainer index={index}>
                      {item?.settingIcon ? (
                        <SvgIconFromApi rawSvg={item.settingIcon} size={24} />
                      ) : item?.icon ? (
                        item.icon
                      ) : (
                        <PlaceholderBox />
                      )}
                    </ParentMenuIconContainer>
                  </ListItemIconStyledMenu>

                  <ParentMenuTextWrapper>
                    <ListItemText
                      primary={capitalizeFirstLetter(item.title)}
                      primaryTypographyProps={{ fontWeight: "bold" }}
                    />
                    <ParentMenuStatusText
                      data-status="active"
                      variant="caption"
                    >
                      Đang hoạt động
                    </ParentMenuStatusText>
                  </ParentMenuTextWrapper>

                  <ParentMenuStatusDot data-status="dot" />
                </ParentMenuListItemButton>
              );
            })}
          </ListSt>
        </BoxContainer>
      </AppsSidebarDrawer>
      <PopperStyled
        open={openPopper}
        anchorEl={popperAnchorEl}
        placement="right-start"
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [-5, 16],
            },
          },
          {
            name: "preventOverflow",
            enabled: true,
            options: {
              boundary: "clippingParents",
              padding: 8,
            },
          },
        ]}
      >
        <ClickAwayListener onClickAway={handlePopperClose}>
          <PaperStyled elevation={6}>
            {/* TIÊU ĐỀ POPPER */}
            <PopperMenuHeader>
              <PopperMenuIconContainer>
                {popperParentItem?.settingIcon ? (
                  <IconSpan>
                    <SvgIconFromApi rawSvg={popperParentItem.settingIcon} size={24} />
                  </IconSpan>
                ) : popperParentItem?.icon ? (
                  <ModuleIconWrapper>
                    {popperParentItem.icon}
                  </ModuleIconWrapper>
                ) : (
                  <BoxImg component="img" src="/menu.png" alt="Menu" />
                )}
              </PopperMenuIconContainer>
              <PopperMenuTitle variant="subtitle1">Menu chính</PopperMenuTitle>
            </PopperMenuHeader>

            {/* DANH SÁCH MENU CON (CÓ SCROLL) */}
            <PopperSubmenuList>
              {popperSubItems.map((subItem, subIndex) => {
                const checkIsActive = (item) => {
                  if (!item) return false;
                  if (item.path && matchPath({ path: item.path, end: false }, location.pathname)) {
                    if (item.path === "/" && location.pathname !== "/") return false;
                    return true;
                  }
                  if (item.subItems && item.subItems.length > 0) {
                    return item.subItems.some((sub) => checkIsActive(sub));
                  }
                  return false;
                };

                const isActive = checkIsActive(subItem);
                return (
                  <ListItemButtonStyled
                    key={subIndex}
                    onClick={onSubItemClick(subItem)}
                    selected={!!isActive}
                  >
                    <ListItemIconStyled>
                      {isActive && <PopperSubmenuItemIcon />}
                    </ListItemIconStyled>
                    <ListItemText primary={subItem.title} />
                  </ListItemButtonStyled>
                );
              })}
            </PopperSubmenuList>
          </PaperStyled>
        </ClickAwayListener>
      </PopperStyled>
      {/* --- KẾT THÚC: SIDEBAR ỨNG DỤNG --- */}

      <StyledToolbar>

        {isMobile && !isOpen && (
          <MobileMenuButton
            aria-label="open drawer"
            edge="start"
            onClick={toggleSidebar}
          >
            <MenuIcon />
          </MobileMenuButton>
        )}
        {/* Nút Back nếu có ID trong đường dẫn hoặc là trang chi tiết nhóm người dùng */}
        {(hasDynamicId || backPage) && !(location.pathname === "/") && (
          // <BackButton onClick={handleOpenChangePasswordDialog}>
          <BackButton onClick={handleBack}>
            <ArrowBackIos />
          </BackButton>
        )}

        <LogoContainer
          onClick={handleLogoClick}
          $hasLink={!!linkToNews}
        >
          <LogoImage 
            src={"/logotc.png"} 
            alt="Logo" 
          />
          {!isSmallScreen && (
            <BrandName variant="h6"> 
              SNP Doffice
            </BrandName>
          )}
        </LogoContainer>

        {/* Ô tìm kiếm được đưa ra ngoài UserDetails để có thể dịch sang trái */}
        <SearchContainer>
          {isSmallScreen && !isMobileSearchOpen ? (
            <Tooltip title="Tìm kiếm">
              <IconButton onClick={handleMobileSearchOpen}>
                <SearchIconST />
              </IconButton>
            </Tooltip>
          ) : (
            <>
              <TextFieldStyled
                variant="outlined"
                size="small"
                placeholder="Tìm kiếm văn bản, hồ sơ..."
                value={searchValue}
                onChange={handleSearchInputChange}
                onFocus={handleSearchFocus}
                onKeyPress={handleSearchKeyPress}
                inputRef={searchInputRef}
                autoFocus={isSmallScreen && isMobileSearchOpen}
                autoComplete="off"
                InputProps={{
                  endAdornment: (
                    <InputAdornmentStyled>
                      {isSmallScreen && isMobileSearchOpen ? (
                        <CloseIconST onClick={handleClearSearch} />
                      ) : (
                        <img src="/Icon.png" alt="Tìm kiếm" />
                      )}
                    </InputAdornmentStyled>
                  ),
                }}
                isExpanded={isMobileSearchOpen}
                isSmallScreen={isSmallScreen}
              />

              {/* Dropdown kết quả tìm kiếm - Giữ gần ô nhập liệu */}
              <SearchPopover
                open={Boolean(searchAnchorEl)}
                anchorEl={searchAnchorEl}
                onClose={handleSearchClose}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: isSmallScreen ? "center" : "left",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: isSmallScreen ? "center" : "left",
                }}
                disableRestoreFocus
                disableAutoFocus
                disableEnforceFocus
                slotProps={{
                  backdrop: { invisible: true },
                }}
              >
                <SearchResultsBox
                  ref={listRef}
                  onScroll={handleSearchScroll}
                  isSmallScreen={isSmallScreen}
                >
                  {searchLoading ? (
                    <SearchBox>
                      <CircularProgress size={24} />
                    </SearchBox>
                  ) : searchResults.length > 0 ? (
                    <>
                      {/* Danh sách kết quả */}
                      <List>
                        {searchResults
                          .slice(startIndex, startIndex + DISPLAY_ITEMS)
                          .map((result, index) => (
                            <SearchListItem
                              key={`${result.document_id || result.id}-${startIndex + index}`}
                              onClick={handleSearchResultItemClick(result)}
                            >
                              <ListItemText primary={result.name} />
                            </SearchListItem>
                          ))}
                      </List>

                      {/* Hiển thị thông báo còn bao nhiêu kết quả */}
                      {searchResults.length > 0 && (
                        <SearchResults>
                          Đang hiển thị {Math.min(startIndex + DISPLAY_ITEMS, searchResults.length)} / {searchResults.length} kết quả
                          {startIndex > 0 && <br />}
                          {startIndex > 0 && <Typography variant="caption">↑ Cuộn lên để xem trước</Typography>}
                          {startIndex + DISPLAY_ITEMS < searchResults.length && <br />}
                          {startIndex + DISPLAY_ITEMS < searchResults.length && (
                            <SearchTypography variant="caption">
                              ↓ Cuộn xuống để xem thêm ↓
                            </SearchTypography>
                          )}
                        </SearchResults>
                      )}
                    </>
                  ) : (
                    <NoResultsBox>
                      <Typography variant="body2">
                        {searchValue.trim() ? "Không tìm thấy kết quả" : "Nhập để tìm kiếm văn bản, hồ sơ..."}
                      </Typography>
                    </NoResultsBox>
                  )}
                </SearchResultsBox>
              </SearchPopover>
            </>
          )}
        </SearchContainer>

        {/* Spacer để đẩy phần UserDetails về bên phải */}
        <Spacer />

        {/* Nút thông báo & User */}
        <UserDetails>
          {/* Actions slot for theme switcher or other buttons */}
          {actions}

          {isSmallScreen ? (
            <>
              <Tooltip title="Tiện ích">
                <IconButtonTI onClick={handleMoreMenuOpen}>
                  <MoreVertIconStyled />
                </IconButtonTI>
              </Tooltip>
              <StyledMenu
                anchorEl={moreAnchorEl}
                open={Boolean(moreAnchorEl)}
                onClose={handleMoreMenuClose}
              >
                <StyledMenuItem onClick={handleOpenAddNewAndCloseMore}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M24 13.7143H13.7143V24H10.2857V13.7143H0V10.2857H10.2857V0H13.7143V10.2857H24V13.7143Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  &ensp;&ensp;Thêm mới
                </StyledMenuItem>
                <StyledMenuItem onClick={handleChatClick}>
                  <NotificationBadge badgeContent={totalUnread}>
                    <svg
                      width="23"
                      height="23"
                      viewBox="0 0 25 25"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.25 23.75C14.5245 23.75 16.7479 23.0755 18.6391 21.8119C20.5302 20.5483 22.0042 18.7522 22.8746 16.6509C23.745 14.5495 23.9728 12.2372 23.529 10.0065C23.0853 7.77568 21.99 5.72658 20.3817 4.11828C18.7734 2.50997 16.7243 1.4147 14.4935 0.970974C12.2628 0.527245 9.95049 0.754983 7.84914 1.62539C5.74779 2.4958 3.95173 3.96978 2.6881 5.86095C1.42446 7.75211 0.75 9.97552 0.75 12.25C0.75 14.09 1.18189 15.8278 1.95111 17.3701C2.52994 18.5341 1.72494 20.1045 1.41828 21.2507C1.35034 21.5042 1.35033 21.7711 1.41824 22.0246C1.48616 22.2781 1.61961 22.5092 1.80519 22.6948C1.99076 22.8804 2.22192 23.0138 2.47542 23.0818C2.72892 23.1497 2.99584 23.1497 3.24933 23.0817C4.3955 22.7751 5.96589 21.9701 7.12994 22.5502C8.72105 23.3402 10.4735 23.7509 12.25 23.75Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </NotificationBadge>
                  &ensp;&ensp;Trò chuyện
                </StyledMenuItem>
                <StyledMenuItem onClick={handleNotificationClick}>
                  <NotificationBadge badgeContent={unreadCount}>
                    <svg
                      width="24"
                      height="27"
                      viewBox="0 0 26 29"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M15.0567 26.4045C14.8223 26.8138 14.4858 27.1535 14.081 27.3896C13.6761 27.6257 13.2172 27.75 12.75 27.75C12.2828 27.75 11.8239 27.6257 11.419 27.3896C11.0142 27.1535 10.6777 26.8138 10.4433 26.4045M20.75 9.39153C20.75 7.10017 19.9073 4.90199 18.4073 3.2817C16.9073 1.66141 14.87 0.75 12.75 0.75C10.63 0.75 8.594 1.66006 7.09267 3.2817C5.59267 4.90199 4.75 7.10017 4.75 9.39153C4.75 19.4738 0.75 22.3538 0.75 22.3538H24.75C24.75 22.3538 20.75 19.4738 20.75 9.39153Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </NotificationBadge>
                  <span>Thông báo</span>
                </StyledMenuItem>
                {/* <StyledMenuItem onClick={handleNewsClick}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.89 20.1 3 19 3ZM19 19H5V5H19V19ZM7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H13V17H7V15Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  &ensp;&ensp;Tin tức
                </StyledMenuItem> */}
                <StyledMenuItem>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeWidth="2"
                      d="M12.0784 16.6078C12.0784 16.8211 12.0152 17.0296 11.8967 17.207C11.7782 17.3843 11.6098 17.5226 11.4127 17.6042C11.2156 17.6858 10.9988 17.7072 10.7896 17.6655C10.5804 17.6239 10.3883 17.5212 10.2374 17.3704C10.0866 17.2196 9.9839 17.0274 9.94229 16.8182C9.90068 16.609 9.92204 16.3922 10.0037 16.1951C10.0853 15.9981 10.2235 15.8297 10.4009 15.7112C10.5782 15.5927 10.7867 15.5294 11 15.5294C11.286 15.5294 11.5603 15.643 11.7626 15.8453C11.9648 16.0475 12.0784 16.3218 12.0784 16.6078ZM11 5.17647C8.7353 5.17647 6.90196 6.82108 6.90196 8.84314V9.27451C6.90196 9.44612 6.97014 9.6107 7.09148 9.73205C7.21283 9.85339 7.37741 9.92157 7.54902 9.92157C7.72063 9.92157 7.88522 9.85339 8.00656 9.73205C8.12791 9.6107 8.19608 9.44612 8.19608 9.27451V8.84314C8.19608 7.535 9.45353 6.47059 11 6.47059C12.5465 6.47059 13.8039 7.535 13.8039 8.84314C13.8039 10.1513 12.5465 11.2157 11 11.2157C10.8284 11.2157 10.6638 11.2839 10.5425 11.4052C10.4211 11.5265 10.3529 11.6911 10.3529 11.8627V12.7255C10.3529 12.8971 10.4211 13.0617 10.5425 13.183C10.6638 13.3044 10.8284 13.3725 11 13.3725C11.1716 13.3725 11.3362 13.3044 11.4575 13.183C11.5789 13.0617 11.6471 12.8971 11.6471 12.7255V12.4645C13.6001 12.1863 15.098 10.6678 15.098 8.84314C15.098 6.82108 13.2647 5.17647 11 5.17647ZM22 11C22 13.1756 21.3549 15.3023 20.1462 17.1113C18.9375 18.9202 17.2195 20.3301 15.2095 21.1627C13.1995 21.9952 10.9878 22.2131 8.85401 21.7886C6.72022 21.3642 4.76021 20.3165 3.22183 18.7782C1.68345 17.2398 0.635804 15.2798 0.211367 13.146C-0.21307 11.0122 0.00476594 8.80047 0.83733 6.79048C1.66989 4.78049 3.07979 3.06253 4.88873 1.85383C6.69767 0.645138 8.82441 0 11 0C13.9163 0.00342494 16.7122 1.16345 18.7744 3.22561C20.8365 5.28777 21.9966 8.08367 22 11ZM20.7059 11C20.7059 9.08036 20.1366 7.20382 19.0701 5.6077C18.0037 4.01158 16.4878 2.76755 14.7143 2.03293C12.9408 1.29832 10.9892 1.10611 9.10648 1.48061C7.22372 1.85512 5.4943 2.77951 4.13691 4.1369C2.77952 5.4943 1.85512 7.22372 1.48062 9.10647C1.10611 10.9892 1.29832 12.9408 2.03294 14.7143C2.76755 16.4878 4.01158 18.0036 5.6077 19.0701C7.20383 20.1366 9.08036 20.7059 11 20.7059C13.5733 20.703 16.0404 19.6795 17.8599 17.8599C19.6795 16.0404 20.703 13.5733 20.7059 11Z"
                      stroke="currentColor"
                      // strokeWidth="2"
                    />
                  </svg>
                  &ensp;&ensp;Trợ giúp
                </StyledMenuItem>
              </StyledMenu>
            </>
          ) : (
            <>
              {/* <Tooltip title="Thêm mới">
                <IconButtonTB aria-label="add" onClick={handleAddMenuOpen}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M24 13.7143H13.7143V24H10.2857V13.7143H0V10.2857H10.2857V0H13.7143V10.2857H24V13.7143Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </IconButtonTB>
              </Tooltip> */}
              <Tooltip title="Trò chuyện">
                <IconButtonTB aria-label="chat" onClick={handleChatClick}>
                  <NotificationBadge badgeContent={totalUnread}>
                    <svg
                      width="23"
                      height="23"
                      viewBox="0 0 25 25"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.25 23.75C14.5245 23.75 16.7479 23.0755 18.6391 21.8119C20.5302 20.5483 22.0042 18.7522 22.8746 16.6509C23.745 14.5495 23.9728 12.2372 23.529 10.0065C23.0853 7.77568 21.99 5.72658 20.3817 4.11828C18.7734 2.50997 16.7243 1.4147 14.4935 0.970974C12.2628 0.527245 9.95049 0.754983 7.84914 1.62539C5.74779 2.4958 3.95173 3.96978 2.6881 5.86095C1.42446 7.75211 0.75 9.97552 0.75 12.25C0.75 14.09 1.18189 15.8278 1.95111 17.3701C2.52994 18.5341 1.72494 20.1045 1.41828 21.2507C1.35034 21.5042 1.35033 21.7711 1.41824 22.0246C1.48616 22.2781 1.61961 22.5092 1.80519 22.6948C1.99076 22.8804 2.22192 23.0138 2.47542 23.0818C2.72892 23.1497 2.99584 23.1497 3.24933 23.0817C4.3955 22.7751 5.96589 21.9701 7.12994 22.5502C8.72105 23.3402 10.4735 23.7509 12.25 23.75Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </NotificationBadge>
                </IconButtonTB>
              </Tooltip>
              <Tooltip title="Thông báo">
                <IconButtonTB onClick={handleNotificationClick}>
                  <NotificationBadge badgeContent={unreadCount}>
                    <svg
                      width="24"
                      height="27"
                      viewBox="0 0 26 29"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M15.0567 26.4045C14.8223 26.8138 14.4858 27.1535 14.081 27.3896C13.6761 27.6257 13.2172 27.75 12.75 27.75C12.2828 27.75 11.8239 27.6257 11.419 27.3896C11.0142 27.1535 10.6777 26.8138 10.4433 26.4045M20.75 9.39153C20.75 7.10017 19.9073 4.90199 18.4073 3.2817C16.9073 1.66141 14.87 0.75 12.75 0.75C10.63 0.75 8.594 1.66006 7.09267 3.2817C5.59267 4.90199 4.75 7.10017 4.75 9.39153C4.75 19.4738 0.75 22.3538 0.75 22.3538H24.75C24.75 22.3538 20.75 19.4738 20.75 9.39153Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </NotificationBadge>
                </IconButtonTB>
              </Tooltip>
              {/* <Tooltip title="Tin tức">
                <IconButton onClick={handleNewsClick}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.89 20.1 3 19 3ZM19 19H5V5H19V19ZM7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H13V17H7V15Z"
                      fill="white"
                    />
                  </svg>
                </IconButton>
              </Tooltip>
              <Tooltip title="Trợ giúp">
                <IconButton aria-label="help">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeWidth="2"
                      d="M12.0784 16.6078C12.0784 16.8211 12.0152 17.0296 11.8967 17.207C11.7782 17.3843 11.6098 17.5226 11.4127 17.6042C11.2156 17.6858 10.9988 17.7072 10.7896 17.6655C10.5804 17.6239 10.3883 17.5212 10.2374 17.3704C10.0866 17.2196 9.9839 17.0274 9.94229 16.8182C9.90068 16.609 9.92204 16.3922 10.0037 16.1951C10.0853 15.9981 10.2235 15.8297 10.4009 15.7112C10.5782 15.5927 10.7867 15.5294 11 15.5294C11.286 15.5294 11.5603 15.643 11.7626 15.8453C11.9648 16.0475 12.0784 16.3218 12.0784 16.6078ZM11 5.17647C8.7353 5.17647 6.90196 6.82108 6.90196 8.84314V9.27451C6.90196 9.44612 6.97014 9.6107 7.09148 9.73205C7.21283 9.85339 7.37741 9.92157 7.54902 9.92157C7.72063 9.92157 7.88522 9.85339 8.00656 9.73205C8.12791 9.6107 8.19608 9.44612 8.19608 9.27451V8.84314C8.19608 7.535 9.45353 6.47059 11 6.47059C12.5465 6.47059 13.8039 7.535 13.8039 8.84314C13.8039 10.1513 12.5465 11.2157 11 11.2157C10.8284 11.2157 10.6638 11.2839 10.5425 11.4052C10.4211 11.5265 10.3529 11.6911 10.3529 11.8627V12.7255C10.3529 12.8971 10.4211 13.0617 10.5425 13.183C10.6638 13.3044 10.8284 13.3725 11 13.3725C11.1716 13.3725 11.3362 13.3044 11.4575 13.183C11.5789 13.0617 11.6471 12.8971 11.6471 12.7255V12.4645C13.6001 12.1863 15.098 10.6678 15.098 8.84314C15.098 6.82108 13.2647 5.17647 11 5.17647ZM22 11C22 13.1756 21.3549 15.3023 20.1462 17.1113C18.9375 18.9202 17.2195 20.3301 15.2095 21.1627C13.1995 21.9952 10.9878 22.2131 8.85401 21.7886C6.72022 21.3642 4.76021 20.3165 3.22183 18.7782C1.68345 17.2398 0.635804 15.2798 0.211367 13.146C-0.21307 11.0122 0.00476594 8.80047 0.83733 6.79048C1.66989 4.78049 3.07979 3.06253 4.88873 1.85383C6.69767 0.645138 8.82441 0 11 0C13.9163 0.00342494 16.7122 1.16345 18.7744 3.22561C20.8365 5.28777 21.9966 8.08367 22 11ZM20.7059 11C20.7059 9.08036 20.1366 7.20382 19.0701 5.6077C18.0037 4.01158 16.4878 2.76755 14.7143 2.03293C12.9408 1.29832 10.9892 1.10611 9.10648 1.48061C7.22372 1.85512 5.4943 2.77951 4.13691 4.1369C2.77952 5.4943 1.85512 7.22372 1.48062 9.10647C1.10611 10.9892 1.29832 12.9408 2.03294 14.7143C2.76755 16.4878 4.01158 18.0036 5.6077 19.0701C7.20383 20.1366 9.08036 20.7059 11 20.7059C13.5733 20.703 16.0404 19.6795 17.8599 17.8599C19.6795 16.0404 20.703 13.5733 20.7059 11Z"
                      fill="white"
                    />
                  </svg>
                </IconButton>
              </Tooltip> */}
              <Tooltip title="Cổng CNTT">
                <IconButton aria-label="help" onClick={handleLinkToCNTT}>
                  <StyledOpenInNewRoundedIcon />
                </IconButton>
              </Tooltip>
            </>
          )}

          <NavDivider />

          {/* User Section */}
          <UserButton onClick={handleMenuOpen}>
            <UserContentWrapper>
              <UserInfoWrapper>
                <Tooltip title={userData?.name  || "Tài khoản"}>
                  <UserNameText variant="subtitle2">
                     {userData?.name || ""}
                  </UserNameText>
                </Tooltip>
                <Tooltip title={userData?.positionName || userData?.position || " "}>
                  <UserDeptText variant="caption">
                    {userData?.positionName || userData?.position || " "}
                  </UserDeptText>
                </Tooltip>
              </UserInfoWrapper>
              <Tooltip title={userData?.name || "Tài khoản"}>
                <UserInitialAvatar 
                  username={userData?.name}
                  imageUrl={avatarUrl}
                  size={36}
                >
                  {!avatarUrl && firstLetter}
                </UserInitialAvatar>
              </Tooltip>
            </UserContentWrapper>
          </UserButton>

          {/* Menu Dropdown */}
          <StyledMenu
            anchorEl={anchorEl}
            open={isMenuOpen}
            onClose={handleMenuClose}
          >
            <UserInfoMenuItem onClick={handleMenuClose}>
              <Typography variant="body2">
                {userData?.organizationName || "Chưa có phòng ban"}
              </Typography>
            </UserInfoMenuItem>
            <StyledMenuItem onClick={handleMenuLinkToTrangChuAndClose}>
              {" "}
              <Home /> &ensp;&ensp; Trang chủ
            </StyledMenuItem>
            <StyledMenuItem onClick={handleOpenUserProfileDialog}>
              {" "}
              <AccountCircleIcon /> &ensp;&ensp; Thông tin tài khoản
            </StyledMenuItem>
            {/* Thêm mục menu để điều hướng đến trang cấu hình xác thực */}
            {/* TODO: Chỉ hiển thị mục này cho người dùng có vai trò admin */}
            {/* {checkPermissionAdmin && <StyledMenuItem onClick={handleMenuLinkToAuthConfigAndClose}>
              {" "}
              <Settings /> &ensp;&ensp; Thiết lập xác thực
            </StyledMenuItem>} */}
            <StyledMenuItem onClick={handleOpenThemeConfigDialog}>
              {" "}
              <Palette /> &ensp;&ensp; Cấu hình giao diện
            </StyledMenuItem>
            {/* {checkPermissionAdmin && <StyledMenuItem onClick={handleOpenStorageService}>
              {" "}
              <SettingsSystemDaydreamIcon /> &ensp;&ensp; Dịch vụ lưu trữ
            </StyledMenuItem>} */}
            {/* <MenuItem onClick={() => handleOpenDialog("changePass")} sx={{ fontSize: 14 }}>
              {" "}
              <LockOutlined /> &ensp;&ensp; Đổi mật khẩu
            </MenuItem> */}
            <StyledMenuItem onClick={logout}>
              {" "}
              <LogoutIcon />
              &ensp;&ensp; Đăng xuất
            </StyledMenuItem>
            <VersionMenuItem>
              v.{version}
            </VersionMenuItem>
          </StyledMenu>
        </UserDetails>
      </StyledToolbar>
      <ChangePassword
        open={openDialogs.changePass}
        // onClose={() => handleCloseDialog("changePass")}
        onClose={handleCloseChangePassDialog}
        onSave={handleChangePass}
        isLoading={isLoading}
      />
      {/* Popup Cấu hình giao diện */}
      {openAddDialog && selectedComponent && (
        <ThemeConfigDialog
          open={openAddDialog}
          onClick={handleCloseAddDialog}
          fullWidth
        //   maxWidth="lg" // Có thể điều chỉnh size: xs, sm, md, lg, xl
        >
          <DialogTitle>
            {selectedComponent.title}
            <StyledIconButton
              aria-label="close"
              onClick={handleCloseAddDialog}
            >
              <CloseIcon />
            </StyledIconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Suspense fallback={<Loading />}>
              {React.createElement(selectedComponent.component, {
                ...selectedComponent.props,
              })}
            </Suspense>
          </DialogContent>
        </ThemeConfigDialog>
      )}
      {/* Popover Thông báo - được điều khiển hoàn toàn bởi Navbar */}
      <Notification
        open={Boolean(notificationAnchorEl)}
        anchorEl={notificationAnchorEl}
        onClose={handleNotificationClose}
        onUpdateUnreadCount={handleUpdateUnreadCount}
      />
      {/* Dialog Thông tin người dùng */}
      <ThemeConfigDialog
        open={openUserProfileDialog}
        onClose={handleCloseUserProfileDialog}
        fullWidth
      >
        <DialogTitle>
          Thông tin người dùng
          <StyledIconButton
            aria-label="close"
            onClick={handleCloseUserProfileDialog}
          >
            <CloseIcon />
          </StyledIconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Suspense fallback={<Loading />}>
            <UserProfile />
          </Suspense>
          <ButtonChangePass
          onClick={handleOpenPasswordFromProfile}
          variant="outlined"
          size="small"
        >
          Đổi mật khẩu
        </ButtonChangePass>
        <ButtonChangePass
          onClick={handleAvatarClick}
          variant="outlined"
          size="small"
        >
          Đổi avatar
        </ButtonChangePass>
        <HiddenInput
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleAvatarChange}
        />
        </DialogContent>
        <DialogActionsST>
          <ButtonCloseST
            onClick={handleCloseUserProfileDialog}
            variant="contained"
          >
            Đóng
          </ButtonCloseST>
        </DialogActionsST>
      </ThemeConfigDialog>
      {/* Menu "Thêm mới" - Đặt ở đây để không bị lồng vào các menu khác */}
      <StyledMenu
        id="add-new-menu"
        anchorEl={addMenuAnchorEl}
        open={Boolean(addMenuAnchorEl)}
        onClose={handleAddMenuClose}
      >
        {addMenuItems.length > 0 ? (
          addMenuItems.map((item) => (
            <MenuItem
              key={item.roleCode}
              onClick={createAddMenuItemHandler(item)} // ✅ Gọi handler
            >
              {item.name}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>Không có mục nào</MenuItem>
        )}
      </StyledMenu>
      {/* Chat */}
      <Chat
        open={Boolean(chatAnchorEl)}
        anchorEl={chatAnchorEl}
        onClose={handleChatClose}
      // onUpdateUnreadCount={handleUpdateChatUnreadCount}
      />
      <ThemeConfigDialog
        open={openThemeConfigDialog}
        onClose={handleCloseThemeConfigDialog}
        fullWidth
      >
        <StyledDialogTitle>
          Cấu hình giao diện
          <StyledIconButton
            aria-label="close"
            onClick={handleCloseThemeConfigDialog}
          >
            <CloseIcon />
          </StyledIconButton>
        </StyledDialogTitle>
        <DialogContent dividers>
          <ThemeConfigPage />
        </DialogContent>
      </ThemeConfigDialog>
      {/* THÊM COMPONENT POPUP ĐỔI MẬT KHẨU VÀO CUỐI NAVBAR */}
      {/* Dialog cắt ảnh (Giống Banner trong Configuration) */}
      <CustomDialog
        open={isCropDialogOpen}
        onClose={handleCloseCropDialog}
        title={cropTarget === "featured" ? "Cắt ảnh đại diện" : "Cắt ảnh nội dung"}
        onSave={handleCropConfirm}
        titleButton="XÁC NHẬN"
        cancelButtonText="Hủy"
        type="add"
        size="md"
      >
        <DialogContent>
          <CropContainer>
            {cropImageSrc && (
              <ReactCrop
                crop={crop}
                onChange={handleCropChange}
                onComplete={handleCropComplete}
              >
                <img
                  src={cropImageSrc}
                  onLoad={onImageLoad}
                  alt="Crop source"
                />
              </ReactCrop>
            )}
          </CropContainer>
          <CropCaptionText>
            Kéo các góc hoặc cạnh để chọn vùng ảnh. Bạn có thể tự do điều chỉnh khung cắt theo ý muốn.
          </CropCaptionText>
        </DialogContent>
      </CustomDialog>

      <AdminChangePassword
        open={openAdminChangePass}
        onClose={handleCloseAdminChangePass}
        onSave={handleAdminChangePassSubmit}
        isLoading={isLoading}
      />
    </StyledAppBar>
  );
}

Navbar.propTypes = {
  isOpen: PropTypes.bool.isRequired, // Xác định trạng thái mở của sidebar
  onClose: PropTypes.func,
  actions: PropTypes.node, // Prop để nhận các nút hành động, ví dụ như nút chuyển theme
  toggleSidebar: PropTypes.func,
};

export default Navbar;
