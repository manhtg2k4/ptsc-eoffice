/* eslint-disable no-prototype-builtins */
import React, {
  useEffect,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react"; // Thêm useRef, useCallback
import { BrowserRouter } from "react-router-dom";
import RouterConfig from "./routers/RouterConfig";

// import { API_GET_VIEW_CONFIG } from "@EnvironmentFile/constants/urlConfig";
// import { useToast } from "@components/common/ToastProvider";
import { AuthProvider, AuthContext } from "./AuthContext/AuthProvider";
import { useDispatch } from "react-redux";
import { ensureUserPermissions } from "./redux/slices/managementUsersSlice";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { CssBaseline, ThemeProvider as MuiThemeProvider } from "@mui/material"; // Đổi tên để tránh xung đột
import { ThemeModeContext } from "./styles/ThemeContext";
import getTheme from "./styles/getTheme";
import { deepmerge } from "@mui/utils";
import { callApi } from "./services/api";
import { API_THEME_CONFIG } from "@EnvironmentFile/constants/ulrConfigNew";
// import axiosInstance from "@utils/axiosInstance";
import { getViewConfig } from "@redux/slices/ViewConfig/ViewConfigSlice";
import { getListRoleDetail } from "@redux/slices/PermissionSlice/PermissionSlice";
import { fetchDhvbConfig } from "@redux/slices/configSlice";
import GlobalDialogPortal from "@components/GlobalDialogPortal";
import axios from "axios";
axios.defaults.withCredentials = true;

// Component to load user-specific data like permissions after authentication
const UserDataLoader = () => {
  const dispatch = useDispatch();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const userInfo = user?.user;
    if (userInfo) {
      dispatch(ensureUserPermissions(userInfo.user));
      dispatch(getViewConfig());
      dispatch(getListRoleDetail());
      dispatch(fetchDhvbConfig({ forceRefresh: true }));
    }
  }, [dispatch, user]);

  return null; // This component does not render anything to the DOM
};

// Component to wrap the app with ThemeProvider and manage theme state
const ThemeWrapper = ({ children }) => {
  // 🚀 Định nghĩa cấu hình theme mặc định cơ bản
  const baseDefaultTheme = {
    mode: "light",
    app: { logoText: "TCSG", logoImage: null, logoTab: null }, // Default logo text, image, and tab
    components: {
      MuiOutlinedInput: { styleOverrides: { root: { height: "41px" } } },
      MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
      MuiTypography: { styleOverrides: { root: { textTransform: "none" } } },
      MuiInputLabel: { styleOverrides: { root: { textTransform: "none" } } },
      MuiTab: { styleOverrides: { root: { textTransform: "none" } } },
      MuiTableCell: { styleOverrides: { root: { textTransform: "none" } } },
    },
    palette: {},
    typography: { fontFamily: "Roboto, Arial, sans-serif" },
  };

  // Lấy cấu hình theme từ localStorage hoặc dùng giá trị khởi tạo
  const [themeOptions, setThemeOptions] = useState(() => {
    try {
      const savedOptions = localStorage.getItem("themeOptions");
      if (savedOptions) {
        return JSON.parse(savedOptions);
      }
      // Hợp nhất cấu hình từ localStorage với cấu hình mặc định
      // Điều này đảm bảo các thuộc tính không có trong localStorage vẫn dùng default
      return deepmerge(baseDefaultTheme, JSON.parse(savedOptions));
    } catch (error) {
      logger.error("Could not parse theme options from localStorage", error);
    }
    return baseDefaultTheme; // Trả về cấu hình mặc định nếu không có trong localStorage hoặc lỗi
  });

  // 🚀 Tải cấu hình từ server khi component được mount lần đầu
  useEffect(() => {
    const fetchThemeConfig = async () => {
      try {
        // Chỉ gọi API nếu có token (người dùng đã đăng nhập)
        if (
          localStorage.getItem("token") ||
          localStorage.getItem("access_token")
        ) {
          const savedOptions = await callApi("GET", API_THEME_CONFIG);
          if (
            savedOptions &&
            typeof savedOptions === "object" &&
            Object.keys(savedOptions).length > 0
          ) {
            // ✅ Xử lý trường hợp backend trả về giá trị mặc định cũ
            if (savedOptions.app && savedOptions.app.logoText === "TCSG") {
              // Không ghi đè logoText nếu nó là giá trị mặc định cũ từ backend
              delete savedOptions.app.logoText;
            }

            // Nếu có cấu hình từ server, hợp nhất và cập nhật state
            setThemeOptions((prevOptions) => {
              return deepmerge(prevOptions, savedOptions); // Hợp nhất cấu hình từ server vào state hiện tại
            });
          }
        }
      } catch (error) {
        logger.error(
          "Không thể tải cấu hình giao diện từ server, sử dụng giá trị cục bộ.",
          error
        );
        // Nếu API lỗi, không cần làm gì thêm vì state đã có giá trị từ localStorage
      }
    };

    fetchThemeConfig();
  }, []); // Mảng rỗng đảm bảo useEffect chỉ chạy một lần

  // 🚀 Hook để cập nhật favicon của trình duyệt
  useEffect(() => {
    // Tìm thẻ link của favicon trong document head
    let favicon = document.querySelector("link[rel*='icon']");

    // Lấy nguồn ảnh logo từ themeOptions
    const newFaviconSrc = themeOptions?.app?.logoTab; // 🚀 Sử dụng logoTab

    if (newFaviconSrc) {
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "shortcut icon";
        document.getElementsByTagName("head")[0].appendChild(favicon);
      }
      favicon.href = newFaviconSrc;
    } else if (favicon) {
      favicon.parentNode?.removeChild(favicon);
    }
  }, [themeOptions?.app?.logoTab]); // 🚀 Chạy lại mỗi khi logoTab thay đổi

  // 🚀 Hook để cập nhật thẻ meta description
  useEffect(() => {
    const newDescription = themeOptions?.app?.description;
    if (newDescription) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.name = "description";
        document.getElementsByTagName("head")[0].appendChild(metaDescription);
      }
      metaDescription.content = newDescription;
    }
  }, [themeOptions?.app?.description]);

  // ✅ Sử dụng useCallback với mảng dependency rỗng để ổn định hàm.
  // Hàm này sẽ không bị tạo lại sau mỗi lần render.
  const updateThemeOptions = useCallback((newOptions) => {
    setThemeOptions((prevOptions) => {
      const cleanedOptions = JSON.parse(
        JSON.stringify(newOptions, (key, value) => {
          return value === undefined ? undefined : value;
        })
      );

      // ✅ Hợp nhất các thay đổi (cleanedOptions) vào state cũ (prevOptions)
      const updatedOptions = deepmerge(prevOptions, cleanedOptions);

      // Cập nhật localStorage với state đã được hợp nhất hoàn chỉnh
      localStorage.setItem("themeOptions", JSON.stringify(updatedOptions));

      // ✅ Tạo payload một cách có chọn lọc, chỉ bao gồm các trường được phép.
      const payloadToSend = {};

      // Kiểm tra các trường trong 'app'
      if (cleanedOptions.app) {
        const appPayload = {};
        if (
          Object.prototype.hasOwnProperty.call(cleanedOptions.app, "logoText")
        )
          appPayload.logoText = cleanedOptions.app.logoText;
        if (
          Object.prototype.hasOwnProperty.call(cleanedOptions.app, "logoImage")
        )
          appPayload.logoImage = cleanedOptions.app.logoImage;
        if (Object.prototype.hasOwnProperty.call(cleanedOptions.app, "logoTab"))
          appPayload.logoTab = cleanedOptions.app.logoTab;
        if (
          Object.prototype.hasOwnProperty.call(
            cleanedOptions.app,
            "description"
          )
        )
          appPayload.description = cleanedOptions.app.description;
        if (Object.keys(appPayload).length > 0) {
          payloadToSend.app = appPayload;
        }
      }

      // Kiểm tra các trường trong 'palette'
      if (cleanedOptions.palette) {
        const palettePayload = {};
        // ✅ Chỉ kiểm tra và thêm 'backgroundImage' cho sidebar, navbar, footer
        if (cleanedOptions.palette.sidebar?.hasOwnProperty("backgroundImage")) {
          palettePayload.sidebar = {
            backgroundImage: cleanedOptions.palette.sidebar.backgroundImage,
          };
        }
        if (cleanedOptions.palette.navbar?.hasOwnProperty("backgroundImage")) {
          palettePayload.navbar = {
            backgroundImage: cleanedOptions.palette.navbar.backgroundImage,
          };
        }
        if (cleanedOptions.palette.footer?.hasOwnProperty("backgroundImage")) {
          palettePayload.footer = {
            backgroundImage: cleanedOptions.palette.footer.backgroundImage,
          };
        }
        if (Object.keys(palettePayload).length > 0) {
          payloadToSend.palette = palettePayload;
        }
      }

      // ✅ Chỉ gọi API nếu payload có chứa dữ liệu hợp lệ.
      if (Object.keys(payloadToSend).length > 0) {
        callApi("PUT", API_THEME_CONFIG, payloadToSend).catch((err) =>
          logger.error("Failed to save theme config to server", err)
        );
      }

      return updatedOptions;
    });
  }, []); // ✅ Mảng rỗng là mấu chốt để phá vỡ vòng lặp

  // ✅ Tương tự, ổn định hàm toggleThemeMode
  const toggleThemeMode = useCallback(() => {
    setThemeOptions((prevOptions) => {
      const { palette, ...restOptions } = prevOptions;
      const newMode = prevOptions.mode === "light" ? "dark" : "light";

      const newOptions = {
        ...restOptions,
        mode: newMode,
        palette: palette, // ✅ Giữ lại toàn bộ đối tượng palette cũ
      };

      localStorage.setItem("themeOptions", JSON.stringify(newOptions));

      // ✅ Đã loại bỏ việc gọi API khi chỉ thay đổi mode

      return newOptions;
    });
  }, []); // ✅ Mảng rỗng

  // ✅ useMemo bây giờ sẽ cung cấp các hàm ổn định và giá trị themeOptions mới nhất
  const themeMode = useMemo(
    () => ({
      toggleThemeMode,
      updateThemeOptions,
      themeOptions,
    }),
    [themeOptions, toggleThemeMode, updateThemeOptions]
  );

  const theme = useMemo(() => getTheme(themeOptions), [themeOptions]);

  return (
    <ThemeModeContext.Provider value={themeMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <ThemeWrapper>
            <UserDataLoader />
            <RouterConfig />
            <GlobalDialogPortal />
          </ThemeWrapper>
        </LocalizationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
