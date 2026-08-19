import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import PropTypes from "prop-types";
import { useThemeMode } from "@styles/ThemeContext";
import { deepmerge } from "@mui/utils";
// import { useDynamicMenuRoutes } from '@hooks/useDynamicMenuRoutes';
import { set as lodashSet } from "lodash"; // ✅ Import hàm set từ lodash
// import { useNavigate } from 'react-router-dom';
import { API_THEME_CONFIG } from "@EnvironmentFile/constants/ulrConfigNew";
import { callApi } from "@services/api"; // Import callApi
import {
  StyledColorInput,
  HeaderBox,
  StyledDivider,
  ConfigTextField,
  GlobalTransformSelect,
  InputConfigGrid,
  ConfigSectionSubheader,
  ResetButton,
  ColumnGrid,
  ColorPickerGrid,
  CenteredGridContainer,
  FullWidthGridItem,
  HalfWidthGridItem,
  PageWrapper,
  StickyHeader,
  PageTitle,
  ContentWrapper,
  CenterInputLabel,
  FormControlLabelStyled,
  CropContainer,
  SaveConfigButton,
  TopConfigGrid,
  ActionButtonsGrid,
  CreateNewButton,
  BorderWidthBox,
  BorderColorContainer,
  MarginControlBoxStyled,
  FlexGridItem,
  LogoImage,
  LogoGrid,
  DenseTextField,
  ErrorButton,
  LargeDialog,
  FlexStartGrid,
  PreviewGridItem,
  PreviewImageWrapper,
  PreviewImg,
  PreviewContainer,
  HeaderButtonContainer,
  ColorPickerWrapper,
  CancelButton, // eslint-disable-next-line no-unused-vars
} from "@styles/ThemeConfig.styles";
import { useToast } from "@components/common/ToastProvider";
// import { logger } from "@assets/js/appConfig";
import {
  default as ReactCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop"; // Thư viện cắt ảnh
import "react-image-crop/dist/ReactCrop.css";

const ColorPicker = ({ value, onChange }) => {
  const handleChange = useCallback(
    (e) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <StyledColorInput type="color" value={value} onChange={handleChange} />
  );
};

ColorPicker.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};



const ThemeConfigPage = () => {
  // const theme = useTheme(); // ✅ Thêm hook useTheme
  const { toggleThemeMode, updateThemeOptions, themeOptions } = useThemeMode();
  // const menuRoutes = useDynamicMenuRoutes();
  // const defaultShadows = [
  //     "none", "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)",
  //     // ... (thêm 23 giá trị shadow mặc định khác của MUI nếu cần)
  // ];

  const fontOptions = [
    { value: "Roboto, Arial, sans-serif", label: "Roboto (Mặc định)" },
    { value: "Times New Roman, Times, serif", label: "Times New Roman" },
    { value: "Courier New, Courier, monospace", label: "Courier New" },
    { value: "Georgia, serif", label: "Georgia" },
  ];

  const [config, setConfig] = useState(() => {
    const initialConfig = {
      palette: {
        primary: { main: "#0782E0" },
        secondary: { main: "#4DD0E1" },
        error: { main: "#D60B0B" },
        background: { default: "#F5F7FA", paper: "#FFFFFF" },
        text: { primary: "#020C1A", secondary: "#666" },
        action: { hover: "#E1ECFA" },
        divider: "#E0E0E0", // ✅ Sửa giá trị mặc định thành HEX
        sidebar: { background: "#FFFFFF", text: "#020C1A" },
        menuItemOverrides: {},
        pageOverrides: {},
      },
      typography: { fontFamily: "Roboto, Arial, sans-serif", fontSize: 14 },
      components: {
        MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              "&.Mui-disabled": {
                backgroundColor: "#F9FAFB",
              },
            },
          },
        },
      },
      shape: { borderRadius: 8 },
      // spacing: 8,
      // shadows: defaultShadows,
    };
    // Hợp nhất cấu hình mặc định với cấu hình từ context ngay từ đầu
    return deepmerge(initialConfig, themeOptions);
  });

  // ✅ State cho chức năng Custom Theme
  const [customThemes, setCustomThemes] = useState([]);
  const [selectedCustomThemeId, setSelectedCustomThemeId] = useState("");
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [globalThemeConfig, setGlobalThemeConfig] = useState({}); // ✅ State mới để lưu cấu hình global
  // const navigate = useNavigate();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false); // ✅ State cho dialog xác nhận xóa
  const toast = useToast(); // ✅ Sử dụng toast để thông báo

  // === STATE CẮT ẢNH ===
  const [cropState, setCropState] = useState({
    open: false,
    imgSrc: "",
    configPath: "",
    aspect: 16 / 9,
  });
  const [crop, setCrop] = useState();
  const imgRef = useRef(null);

  const [pixelCrop, setPixelCrop] = useState(null);

  // ✅ State để quản lý lỗi validation cho các trường nhập liệu
  const [validationErrors, setValidationErrors] = useState({
    cellHeight: "",
    rowHeight: "",
    fontSize: "",
    borderRadius: "",
    borderWidth: "", // ✅ Thêm state cho lỗi độ đậm viền
  });
  const [pendingChanges, setPendingChanges] = useState({});

  // const [configScope, setConfigScope] = useState('global'); // 'global' hoặc một path cụ thể

  // Tạo danh sách phẳng các menu item để hiển thị trong dropdown
  // const getFlattenedRoutes = (routes, level = 0) => {
  //     let flattened = [];
  //     routes.forEach(route => {
  //         if (route.path && !route.hidden) {
  //             flattened.push({ ...route, level });
  //         }
  //         if (route.subItems) {
  //             flattened = [...flattened, ...getFlattenedRoutes(route.subItems, level + 1)];
  //         }
  //     });
  //     return flattened;
  // };
  // const flattenedMenuRoutes = getFlattenedRoutes(menuRoutes);

  const handleConfigChange = useCallback((path, value) => {
    // ✅ Sử dụng lodash.set để cập nhật giá trị một cách an toàn
    // ✅ Chỉ tạo một đối tượng chứa các thay đổi, không phải toàn bộ themeOptions.
    let newOptions = {};

    // ✅ Xử lý trường hợp đặc biệt cho "Kiểu chữ toàn cục"
    if (path === "globalTextTransform") {
      const componentsToUpdate = [
        "MuiButton",
        "MuiTypography",
        "MuiInputLabel",
        "MuiTab",
        "MuiTableCell",
      ];
      componentsToUpdate.forEach((component) => {
        lodashSet(
          newOptions,
          `components.${component}.styleOverrides.root.textTransform`,
          value
        );
      });
    } else {
      // Sử dụng lodashSet để cập nhật hoặc xóa thuộc tính cho các trường hợp khác
      lodashSet(newOptions, path, value);
    }

    // Cập nhật state và context với cấu hình mới
    // ✅ Chỉ cập nhật vào pendingChanges (không lưu ngay)
    setPendingChanges((prev) => deepmerge(prev, newOptions));
    // ✅ Đồng thời cập nhật preview tại chỗ
    setConfig((prev) => deepmerge(prev, newOptions));
  }, []);

  // ✅ Đồng bộ state config cục bộ với themeOptions từ context
  // Đây là mấu chốt để UI của trang config luôn được cập nhật.
  useEffect(() => {
    setConfig(themeOptions);
  }, [themeOptions]);

  // ✅ Hàm gọi API để lấy cấu hình theme
  const fetchThemeConfig = useCallback(async () => {
    try {
      const response = await callApi("GET", API_THEME_CONFIG);
      if (response) {
        // ✅ Lưu vào localStorage
        localStorage.setItem("themeOptions", JSON.stringify(response)); // Cập nhật localStorage
        // ✅ Cập nhật state
        updateThemeOptions(response);
        setGlobalThemeConfig(response); // ✅ Lưu cấu hình global vào state
      }
    } catch (error) {
      logger.error("Failed to fetch theme config from server:", error);
      // Xử lý lỗi nếu cần
    }
  }, [updateThemeOptions]);

  // ✅ Gọi fetchThemeConfig khi component mount
  useEffect(() => {
    // Kiểm tra xem có dữ liệu trong localStorage chưa
    // Nếu có, dùng nó làm initial global config để tránh flash of unstyled content
    // trước khi API fetch hoàn tất.
    const storedTheme = localStorage.getItem("themeOptions");
    if (storedTheme) {
      setGlobalThemeConfig(JSON.parse(storedTheme));
    }
    fetchThemeConfig(); // Luôn gọi API để đảm bảo dữ liệu mới nhất
  }, [fetchThemeConfig]); // fetchThemeConfig is now stable, so this useEffect will only run once on mount.

  // ✅ === LOGIC CHO CUSTOM THEME ===

  const API_CUSTOM_THEME = `${API_THEME_CONFIG}/custom`;

  // Lấy danh sách custom theme của người dùng
  const fetchCustomThemes = useCallback(async () => {
    try {
      const response = await callApi("GET", API_CUSTOM_THEME);
      setCustomThemes(response || []);
    } catch (error) {
      logger.log("Không thể tải danh sách cấu hình tùy chỉnh:", error);
      toast("Không thể tải danh sách cấu hình tùy chỉnh", "error");
    }
  }, [toast, API_CUSTOM_THEME]);

  // Gọi API lấy danh sách khi component mount
  useEffect(() => {
    fetchCustomThemes();
  }, [fetchCustomThemes]);

  // Xử lý khi người dùng chọn một theme từ dropdown
  const handleSelectCustomTheme = (event) => {
    const themeId = event.target.value;
    setSelectedCustomThemeId(themeId);
    if (themeId) {
      const selectedTheme = customThemes.find((t) => t._id === themeId);
      if (selectedTheme) {
        const finalThemeToApply = deepmerge(
          globalThemeConfig,
          selectedTheme.options
        );
        updateThemeOptions(finalThemeToApply, true);
        setConfig(finalThemeToApply);
      }
    } else {
      // Reset về cấu hình global khi bỏ chọn
      updateThemeOptions(globalThemeConfig, true);
      setConfig(globalThemeConfig);
    }
  };

  const handleSaveTheme = async () => {
    if (!newThemeName.trim()) {
      toast("Vui lòng nhập tên cấu hình", "error");
      return;
    }
    try {
      // Backend sẽ tự động loại bỏ các trường không cần thiết (logo, ảnh nền...)
      const payload = {
        name: newThemeName,
        options: config, // ✅ Sửa: Luôn lưu cấu hình hiện tại trên màn hình (bao gồm cả pendingChanges)
      };
      const response = await callApi("POST", API_CUSTOM_THEME, payload);
      if (response) {
        // ✅ Kiểm tra response và cập nhật state
        updateThemeOptions(response.options, true);
        setConfig(response.options);
        toast("Đã lưu cấu hình theme mới thành công!", "success");
        fetchCustomThemes(); // Tải lại danh sách
        setOpenSaveDialog(false);
      } else {
        toast("Lưu cấu hình thất bại: Không có phản hồi từ server", "error");
      }
    } catch (error) {
      // navigate('/login');

      logger.error("Failed to save custom theme:", error);
      toast("Lưu cấu hình thất bại", "error");
    }
  };

  // Mở dialog để tạo mới
  const handleCreateNew = () => {
    setNewThemeName("");
    setIsSavingAs(false);
    setOpenSaveDialog(true);
  };

  // Xử lý cập nhật cấu hình hiện tại
  // const handleUpdateTheme = async () => {
  //     if (!selectedCustomThemeId) return;
  //     try {
  //         // ✅ Sửa lỗi: Chỉ gửi đi những thay đổi đang chờ, không gửi toàn bộ themeOptions
  //         const response = await callApi('PUT', `${API_CUSTOM_THEME}/${selectedCustomThemeId}`, { options: pendingChanges });
  //         if (response) {
  //             // ✅ Cập nhật state với phiên bản mới nhất từ server
  //             updateThemeOptions(response.options, true);
  //             setConfig(response.options);
  //             setPendingChanges({}); // ✅ Xóa các thay đổi đã lưu
  //             toast('Đã cập nhật cấu hình thành công!', 'success');
  //             fetchCustomThemes(); // Tải lại để đảm bảo dữ liệu đồng bộ
  //         } else {
  //             toast('Cập nhật cấu hình thất bại: Không có phản hồi từ server', 'error');
  //         }
  //     } catch (error) {
  //         logger.error('Failed to update custom theme:', error);
  //         toast('Cập nhật cấu hình thất bại', 'error');
  //     }
  // };

  // // Xử lý xóa cấu hình
  // const handleDeleteTheme = () => {
  //     if (!selectedCustomThemeId) return;
  //     setOpenDeleteDialog(true); // ✅ Mở dialog xác nhận thay vì dùng window.confirm
  // };

  // ✅ Hàm thực hiện xóa sau khi người dùng xác nhận trên dialog
  const confirmDeleteTheme = async () => {
    if (!selectedCustomThemeId) return;
    try {
      await callApi("DELETE", `${API_CUSTOM_THEME}/${selectedCustomThemeId}`);
      toast("Đã xóa cấu hình thành công!", "success");
      setSelectedCustomThemeId("");
      fetchCustomThemes(); // Tải lại danh sách
    } catch (error) {
      logger.error("Failed to delete custom theme:", error);
      toast("Xóa cấu hình thất bại", "error");
    } finally {
      setOpenDeleteDialog(false); // Đóng dialog sau khi hoàn tất
    }
  };

  // Hàm xử lý khi người dùng chọn ảnh, mở dialog cắt ảnh
  const handleImageUpload = useCallback(
    (event, configPath) => {
      const file = event.target.files[0];
      if (file) {
        // Đặt lại vùng crop
        setCrop(undefined);
        const reader = new FileReader();
        reader.onloadend = () => {
          // 🔥 TỶ LỆ CHUẨN THEO KÍCH THƯỚC UI THẬT
          let aspect = 16 / 9; // default cho ảnh ngang

          if (configPath.includes("sidebar")) {
            aspect = 240 / 1080;
          } else if (configPath.includes("navbar")) {
            aspect = 1920 / 64;
          } else if (configPath.includes("footer")) {
            aspect = 1920 / 64;
          }

          setCropState({
            open: true,
            imgSrc: reader.result?.toString() || "",
            configPath,
            aspect,
          });
        };

        reader.readAsDataURL(file);
        // Reset input để có thể chọn lại cùng một file
        event.target.value = "";
      }
    },
    [setCrop, setCropState]
  ); // Dependencies: setCrop, setCropState

  // Hàm được gọi khi ảnh trong dialog đã tải xong
  function onImageLoad(e) {
    imgRef.current = e.currentTarget;
    const { naturalWidth: imgWidth, naturalHeight: imgHeight } =
      e.currentTarget;
    const { aspect: cropAspect } = cropState;

    let cropConfig = { unit: "%" };

    const imageRatio = imgWidth / imgHeight;

    if (imageRatio > cropAspect) {
      // Ảnh rộng hơn tỷ lệ crop, giới hạn theo chiều cao của ảnh
      cropConfig.height = 100;
      cropConfig.width = (cropAspect / imageRatio) * 100;
    } else {
      // Ảnh cao hơn hoặc cùng tỷ lệ với crop, giới hạn theo chiều rộng của ảnh
      cropConfig.width = 100;
      cropConfig.height = (imageRatio / cropAspect) * 100;
    }

    const newCrop = centerCrop(
      makeAspectCrop(cropConfig, cropAspect, imgWidth, imgHeight),
      imgWidth,
      imgHeight
    );
    setCrop(newCrop);
  }

  // Hàm xử lý khi người dùng nhấn nút "Lưu" trên dialog cắt ảnh
  const handleSaveCrop = () => {
    if (!imgRef.current || !pixelCrop) {
      toast("Vui lòng chọn vùng ảnh cần cắt", "warning");
      return;
    }

    const image = imgRef.current; // a reference to the <img /> element
    const canvas = document.createElement("canvas");

    // Tính toán tỷ lệ co giãn của ảnh
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Áp dụng tỷ lệ để có được kích thước và tọa độ cắt trên ảnh gốc
    let cropWidth = pixelCrop.width * scaleX;
    let cropHeight = pixelCrop.height * scaleY;
    const cropX = pixelCrop.x * scaleX;
    const cropY = pixelCrop.y * scaleY;

    // Giới hạn kích thước ảnh đầu ra để giảm dung lượng base64
    const MAX_WIDTH = 800;
    let outputWidth = cropWidth;
    let outputHeight = cropHeight;
    if (cropWidth > MAX_WIDTH) {
      const ratio = MAX_WIDTH / cropWidth;
      outputWidth = MAX_WIDTH;
      outputHeight = cropHeight * ratio;
    }

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    const base64Image = canvas.toDataURL("image/jpeg", 0.7); // Nén JPEG quality 70%

    handleConfigChange(cropState.configPath, `url(${base64Image})`);
    setCropState({ ...cropState, open: false });

    toast(
      'Cắt và tải ảnh lên thành công! Nhấn "Lưu cấu hình" để áp dụng thay đổi.',
      "success"
    );
  };

  // Hàm đóng dialog cắt ảnh
  const handleCloseCropDialog = () => {
    setCropState({ ...cropState, open: false });
  };

  // const handleImageUpload_OLD = (event, configPath) => {
  //     const img = new Image();
  //     img.src = reader.result;
  //     img.onload = () => {
  //         setCrop(centerAspectCrop(img.naturalWidth, img.naturalHeight, aspect));
  //     };

  //     setPixelCrop(null);
  // }

  // 🚀 Hàm xử lý mới cho việc tải logo chung
  const handleSharedLogoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Nén ảnh logo trước khi lưu base64
        const img = new Image();
        img.onload = () => {
          const MAX_SIZE = 200; // Logo chỉ cần tối đa 200px
          let w = img.width;
          let h = img.height;
          if (w > MAX_SIZE || h > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const compressedBase64 = canvas.toDataURL("image/png");

          const newOptions = deepmerge(themeOptions, {
            app: {
              logoImage: compressedBase64,
              logoTab: compressedBase64,
            },
          });
          updateThemeOptions(newOptions);
          setConfig(newOptions);
          toast(
            'Tải logo thành công! Nhấn "Lưu cấu hình" để áp dụng thay đổi.',
            "success"
          );
        };
        img.src = reader.result?.toString() || "";
      };
      reader.readAsDataURL(file);
    }
  };

  // Đảm bảo config.shadows luôn là một mảng hợp lệ
  // if (!Array.isArray(config.shadows) || config.shadows.length < 2) {
  //     config.shadows = defaultShadows;
  // }

  const handleResetTheme = async () => {
    try {
      await callApi("DELETE", API_THEME_CONFIG);
      localStorage.removeItem("themeOptions"); // Xóa cả ở local
      window.location.reload();
    } catch (error) {
      logger.error("Failed to reset theme config on server:", error);
      // Nếu API lỗi, vẫn có thể reset ở client
    }
  };

  const handleSaveConfig = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast("Không có thay đổi nào để lưu", "info");
      return;
    }

    try {
      // Gọi API để lưu thay đổi lên server
      await callApi("PUT", API_THEME_CONFIG, pendingChanges);
      // Cập nhật context
      await updateThemeOptions(pendingChanges);
      // Cập nhật localStorage
      const updatedConfig = deepmerge(themeOptions, pendingChanges);
      localStorage.setItem("themeOptions", JSON.stringify(updatedConfig));
      setGlobalThemeConfig(updatedConfig);
      setPendingChanges({});
      toast("Lưu cấu hình giao diện thành công!", "success");
    } catch (error) {
      logger.error("Lưu cấu hình thất bại:", error);
      toast("Lưu cấu hình thất bại!", "error");
    }
  };

  const createColorChangeHandler = (path) => (color) => {
    handleConfigChange(path, color);
  };

  // Tạo handler riêng
  const handleEnableCustomBorderChange = (e) => {
    const isChecked = e.target.checked;
    handleConfigChange(
      "components.MuiTableCell.styleOverrides.root.enableCustomBorder",
      isChecked
    );

    if (isChecked) {
      // Nếu bật viền tùy chỉnh, đảm bảo màu viền và độ đậm mặc định được thiết lập
      // nếu chúng chưa tồn tại trong cấu hình hiện tại.
      // Điều này đảm bảo các giá trị này được bao gồm trong pendingChanges khi lưu.

      // Lấy màu divider mặc định của theme hiện tại
      const defaultDividerColor = themeOptions.palette?.divider || "#E0E0E0"; // Fallback an toàn

      // Kiểm tra nếu borderColor chưa được thiết lập trong config
      const currentBorderColor =
        config.components?.MuiTableCell?.styleOverrides?.root?.borderColor;
      if (!currentBorderColor) {
        handleConfigChange(
          "components.MuiTableCell.styleOverrides.root.borderColor",
          defaultDividerColor
        );
      }

      // Kiểm tra nếu borderWidth chưa được thiết lập trong config
      const currentBorderWidth =
        config.components?.MuiTableCell?.styleOverrides?.root?.borderWidth;
      if (!currentBorderWidth) {
        handleConfigChange(
          "components.MuiTableCell.styleOverrides.root.borderWidth",
          "1px"
        );
      }
    }
  };

  const handleBorderWidthChange = (e) => {
    const val = e.target.value;

    if (val === "") {
      handleConfigChange(
        "components.MuiTableCell.styleOverrides.root.borderWidth",
        ""
      );
      setValidationErrors((prev) => ({ ...prev, borderWidth: "" }));
      return;
    }

    const number = Number(val);

    if (!isNaN(number)) {
      handleConfigChange(
        "components.MuiTableCell.styleOverrides.root.borderWidth",
        `${number}px`
      );

      if (number < 1 || number > 4) {
        setValidationErrors((prev) => ({
          ...prev,
          borderWidth: "Giá trị phải từ 1 đến 4",
        }));
      } else {
        setValidationErrors((prev) => ({ ...prev, borderWidth: "" }));
      }
    }
  };

  const handleBorderWidthBlur = () => {
    const currentWidth = parseInt(
      config.components?.MuiTableCell?.styleOverrides?.root?.borderWidth,
      10
    );
    setValidationErrors((prev) => ({ ...prev, borderWidth: "" }));
    if (isNaN(currentWidth) || currentWidth < 1 || currentWidth > 4) {
      handleConfigChange(
        "components.MuiTableCell.styleOverrides.root.borderWidth",
        "1px"
      );
    }
  };
  const handleBorderColorChange = (color) => {
    handleConfigChange(
      "components.MuiTableCell.styleOverrides.root.borderColor",
      color
    );
  };

  const handleFontFamilyChange = (e) => {
    handleConfigChange("typography.fontFamily", e.target.value);
  };

  const handleFontSizeChange = (e) => {
    const remValue = e.target.value;
    if (remValue === "") {
      // Nếu người dùng xóa, tạm thời cho phép rỗng
      handleConfigChange("typography.fontSize", "");
      setValidationErrors((prev) => ({ ...prev, fontSize: "" }));
      return;
    }

    const number = parseFloat(remValue);
    if (!isNaN(number)) {
      // Chuyển đổi rem sang px (1rem = 16px) và cập nhật
      handleConfigChange("typography.fontSize", number * 16);

      if (number < 0.625) {
        // 10px
        setValidationErrors((prev) => ({
          ...prev,
          fontSize: "Giá trị không được nhỏ hơn 0.625rem",
        }));
      } else {
        setValidationErrors((prev) => ({ ...prev, fontSize: "" }));
      }
    }
  };
  const handleFontSizeBlur = () => {
    let currentPxValue = config.typography?.fontSize;

    // Chuyển đổi px sang rem để kiểm tra
    let currentRemValue = parseFloat(currentPxValue) / 16;

    setValidationErrors((prev) => ({ ...prev, fontSize: "" }));

    // Nếu giá trị không hợp lệ hoặc nhỏ hơn 10px (0.625rem), reset về 14px
    if (isNaN(currentRemValue) || currentRemValue < 0.625) {
      currentPxValue = 14;
    }

    handleConfigChange("typography.fontSize", currentPxValue);
  };

  const handleBorderRadiusChange = (e) => {
    const val = e.target.value;

    if (val === "") {
      handleConfigChange("shape.borderRadius", "");
      setValidationErrors((prev) => ({ ...prev, borderRadius: "" }));
      return;
    }

    const number = Number(val);

    if (!isNaN(number)) {
      handleConfigChange("shape.borderRadius", number);

      if (number <= 0) {
        setValidationErrors((prev) => ({
          ...prev,
          borderRadius: "Giá trị phải lớn hơn 0",
        }));
      } else {
        setValidationErrors((prev) => ({ ...prev, borderRadius: "" }));
      }
    }
  };
  const handleBorderRadiusBlur = () => {
    let currentValue = parseInt(config.shape?.borderRadius, 10);

    setValidationErrors((prev) => ({ ...prev, borderRadius: "" }));

    if (isNaN(currentValue) || currentValue <= 0) {
      currentValue = 8; // mặc định
    }

    handleConfigChange("shape.borderRadius", currentValue);
  };

  const handleGlobalTextTransformChange = (e) => {
    handleConfigChange("globalTextTransform", e.target.value);
  };
  const handleInputBgColorChange = createColorChangeHandler(
    "components.MuiOutlinedInput.styleOverrides.root.backgroundColor"
  );

  const handleInputTextColorChange = createColorChangeHandler(
    "components.MuiOutlinedInput.styleOverrides.input.color"
  );

  const handleInputBorderColorChange = createColorChangeHandler(
    "components.MuiOutlinedInput.styleOverrides.notchedOutline.borderColor"
  );

  const handleInputDisabledBgColorChange = createColorChangeHandler(
    'components.MuiOutlinedInput.styleOverrides.root["&.Mui-disabled"].backgroundColor'
  );

  const handleInputDisabledTextColorChange = createColorChangeHandler(
    'components.MuiOutlinedInput.styleOverrides.input["&.Mui-disabled"].color'
  );
  const handleDialogHeaderBgChange = createColorChangeHandler(
    "palette.dialog.headerBackground"
  );

  const handleDialogHeaderTextChange = createColorChangeHandler(
    "palette.dialog.headerColor"
  );
  const handleCellHeightChange = (e) => {
    const val = e.target.value;

    if (val === "") {
      handleConfigChange(
        "components.MuiOutlinedInput.styleOverrides.root.height",
        ""
      );
      setValidationErrors((prev) => ({ ...prev, cellHeight: "" }));
      return;
    }

    const number = Number(val);

    if (!isNaN(number)) {
      handleConfigChange(
        "components.MuiOutlinedInput.styleOverrides.root.height",
        number
      );

      if (number < 41) {
        setValidationErrors((prev) => ({
          ...prev,
          cellHeight: "Giá trị không được nhỏ hơn 41",
        }));
      } else {
        setValidationErrors((prev) => ({ ...prev, cellHeight: "" }));
      }
    }
  };

  const handleCellHeightBlur = () => {
    let currentValue = parseInt(
      config.components?.MuiOutlinedInput?.styleOverrides?.root?.height,
      10
    );

    setValidationErrors((prev) => ({ ...prev, cellHeight: "" }));

    if (isNaN(currentValue) || currentValue < 41) {
      currentValue = 41;
    }

    handleConfigChange(
      "components.MuiOutlinedInput.styleOverrides.root.height",
      `${currentValue}px`
    );
  };
  const handleRowHeightChange = (e) => {
    const val = e.target.value;

    if (val === "") {
      handleConfigChange("layout.dynamicTable.rowHeight", "");
      setValidationErrors((prev) => ({ ...prev, rowHeight: "" }));
      return;
    }

    const number = Number(val);

    if (!isNaN(number)) {
      handleConfigChange("layout.dynamicTable.rowHeight", number);

      if (number < 43) {
        setValidationErrors((prev) => ({
          ...prev,
          rowHeight: "Giá trị không được nhỏ hơn 43",
        }));
      } else {
        setValidationErrors((prev) => ({ ...prev, rowHeight: "" }));
      }
    }
  };
  const handleRowHeightBlur = () => {
    let currentValue = parseInt(config.layout?.dynamicTable?.rowHeight, 10);

    setValidationErrors((prev) => ({ ...prev, rowHeight: "" }));

    if (isNaN(currentValue) || currentValue < 43) {
      currentValue = 43;
    }

    handleConfigChange("layout.dynamicTable.rowHeight", `${currentValue}px`);
  };
  const handleLogoTextChange = (e) => {
    handleConfigChange("app.logoText", e.target.value);
  };
  const handleAppDescriptionChange = (e) => {
    handleConfigChange("app.description", e.target.value);
  };
  const handleClickSharedLogo = () => {
    const input = document.getElementById("shared-logo-input");
    if (input) input.click();
  };
  // Dialog lưu cấu hình
  const handleCloseSaveDialog = () => setOpenSaveDialog(false);
  const handleNewThemeNameChange = (e) => setNewThemeName(e.target.value);

  // Dialog xóa
  const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);

  // Crop image
  const handleCropChange = (pixelCrop, percentCrop) => {
    setPixelCrop(pixelCrop);
    setCrop(percentCrop);
  };

  const TABLE_HEAD_BG =
    "components.MuiTableHead.styleOverrides.root.backgroundColor";

  const handleSidebarUploadClick = () => {
    document.getElementById("background-image-input-sidebar").click();
  };

  const handleNavbarUploadClick = () => {
    document.getElementById("background-image-input-navbar").click();
  };

  const handleFooterUploadClick = () => {
    document.getElementById("background-image-input-footer").click();
  };

  // ✅ Tối ưu hóa: Sử dụng useCallback để không tạo lại hàm mỗi lần render
  const createImageUploadHandler = useCallback(
    (path) => (e) => {
      handleImageUpload(e, path);
    },
    [handleImageUpload]
  );

  return (
    <PageWrapper>
      {/* === TOÀN BỘ GIAO DIỆN CHÍNH === */}
      {/* ✅ Bọc phần header vào một Box riêng để làm sticky */}
      <StickyHeader>
        <HeaderBox>
          <PageTitle variant="h6">Cấu hình giao diện chung</PageTitle>
          <HeaderButtonContainer>
            <SaveConfigButton variant="contained" onClick={handleSaveConfig}>
              Lưu cấu hình
            </SaveConfigButton>
            <ResetButton onClick={handleResetTheme}>
              Reset về mặc định
            </ResetButton>
          </HeaderButtonContainer>
        </HeaderBox>
      </StickyHeader>
      {/* ✅ Phần nội dung còn lại sẽ có thanh cuộn riêng */}
      <ContentWrapper>
        <StyledDivider />

        {/* ✅ KHU VỰC CẤU HÌNH THEME TÙY CHỈNH */}
        <Typography variant="h6" gutterBottom>
          Cấu hình tùy chỉnh
        </Typography>
        <TopConfigGrid container>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <CenterInputLabel>Chọn cấu hình đã lưu</CenterInputLabel>
              <Select
                label="Chọn cấu hình đã lưu"
                value={selectedCustomThemeId}
                onChange={handleSelectCustomTheme}
              >
                <MenuItem value="">
                  <em>Không chọn</em>
                </MenuItem>
                {customThemes.map((theme) => (
                  <MenuItem key={theme._id} value={theme._id}>
                    {theme.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <ActionButtonsGrid item xs={12} md="auto" container>
            <Grid item>
              <CreateNewButton variant="contained" onClick={handleCreateNew}>
                Lưu mới
              </CreateNewButton>
            </Grid>
          </ActionButtonsGrid>
        </TopConfigGrid>

        <StyledDivider />

        <Grid container spacing={2}>
          {/* Cột trái */}
          <ColumnGrid item>
            <Typography variant="h6">Chế độ</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={themeOptions.mode === "dark"}
                  onChange={toggleThemeMode}
                />
              }
              label="Chế độ Tối"
            />
            <StyledDivider />

            <Typography variant="h6" gutterBottom>
              Palette (Màu sắc)
            </Typography>
            <CenteredGridContainer container spacing={1}>
              <ColorPickerGrid item>
                <Typography>Màu chính cho các nút và icon (Primary)</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.palette?.primary?.main ||
                      (themeOptions.mode === "dark" ? "#769ebf" : "#1976d2")
                    }
                    onChange={createColorChangeHandler("palette.primary.main")}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu lỗi cho các nút và icon xoá (Error)</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={config.palette?.error?.main || "#D60B0B"}
                    onChange={createColorChangeHandler("palette.error.main")}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu nền (Background Default)</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={config.palette?.background?.default || "#F5F7FA"}
                    onChange={createColorChangeHandler(
                      "palette.background.default"
                    )}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu nền giấy (Background Paper)</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={config.palette?.background?.paper || "#FFFFFF"}
                    onChange={createColorChangeHandler(
                      "palette.background.paper"
                    )}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu chữ chính (Text Primary)</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={config.palette?.text?.primary || "#020C1A"}
                    onChange={createColorChangeHandler("palette.text.primary")}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu chữ phụ (Text Secondary)</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={config.palette?.text?.secondary || "#666"}
                    onChange={createColorChangeHandler(
                      "palette.text.secondary"
                    )}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu khi hover (Action Hover)</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={config.palette?.action?.hover || "#EEEEEE"}
                    onChange={createColorChangeHandler("palette.action.hover")}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu đường kẻ (Divider)</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={config.palette?.divider || "#E0E0E0"}
                    onChange={createColorChangeHandler("palette.divider")}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu nền Sidebar</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.palette?.sidebar?.background ||
                      (themeOptions.mode === "dark" ? "#1e293b" : "#ffffffff")
                    }
                    onChange={createColorChangeHandler(
                      "palette.sidebar.background"
                    )}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu chữ Sidebar</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={config.palette?.sidebar?.text || "#020C1A"}
                    onChange={createColorChangeHandler("palette.sidebar.text")}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu nền Header</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.palette?.navbar?.background ||
                      (themeOptions.mode === "dark" ? "#1e293b" : "#FFFFFF")
                    }
                    onChange={createColorChangeHandler(
                      "palette.navbar.background"
                    )}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu nền Footer</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.palette?.footer?.background ||
                      (themeOptions.mode === "dark" ? "#1e293b" : "#FFFFFF")
                    }
                    onChange={createColorChangeHandler(
                      "palette.footer.background"
                    )}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              {/* Container cho 3 nút button */}
              <FlexStartGrid item container xs={12}>
                <Grid item>
                  <Button variant="outlined" onClick={handleSidebarUploadClick}>
                    Tải ảnh nền Sidebar
                  </Button>
                  <input
                    type="file"
                    id="background-image-input-sidebar"
                    hidden
                    accept="image/*"
                    onChange={createImageUploadHandler(
                      "palette.sidebar.backgroundImage"
                    )}
                  />
                </Grid>

                <Grid item>
                  <Button variant="outlined" onClick={handleNavbarUploadClick}>
                    Tải ảnh nền Header
                  </Button>
                  <input
                    type="file"
                    id="background-image-input-navbar"
                    hidden
                    accept="image/*"
                    onChange={createImageUploadHandler(
                      "palette.navbar.backgroundImage"
                    )}
                  />
                </Grid>

                <Grid item>
                  <Button variant="outlined" onClick={handleFooterUploadClick}>
                    Tải ảnh nền Footer
                  </Button>
                  <input
                    type="file"
                    id="background-image-input-footer"
                    hidden
                    accept="image/*"
                    onChange={createImageUploadHandler(
                      "palette.footer.backgroundImage"
                    )}
                  />
                </Grid>

                <PreviewContainer container>
                  {["sidebar", "navbar", "footer"].map((key) => {
                    const bgImage = config.palette?.[key]?.backgroundImage;
                    if (!bgImage || bgImage === "none") return null;

                    let imageUrl = bgImage;

                    if (bgImage.startsWith("url(")) {
                      imageUrl = bgImage.slice(4, -1).trim();
                      if (
                        (imageUrl.startsWith('"') && imageUrl.endsWith('"')) ||
                        (imageUrl.startsWith("'") && imageUrl.endsWith("'"))
                      ) {
                        imageUrl = imageUrl.slice(1, -1);
                      }
                    }

                    // ✅ Tính toán tỷ lệ và kích thước động để preview luôn chính xác
                    let aspect;
                    let previewWidth;
                    if (key === "sidebar") {
                      aspect = 240 / 1080;
                      previewWidth = "80px";
                    } else {
                      // navbar & footer
                      aspect = 1920 / 64;
                      previewWidth = "100%";
                    }
                    // Tính toán chiều cao dựa trên tỷ lệ, nhưng chỉ áp dụng cho sidebar
                    // Đối với navbar/footer, chiều cao sẽ tự động theo ảnh
                    const previewHeight =
                      key === "sidebar"
                        ? `calc(${previewWidth} / ${aspect})`
                        : "auto";

                    return (
                      <PreviewGridItem item key={key}>
                        <Typography variant="caption">
                          Ảnh nền {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Typography>

                        <PreviewImageWrapper
                          boxWidth={previewWidth}
                          boxHeight={previewHeight}
                        >
                          <PreviewImg src={imageUrl} alt={key} />
                        </PreviewImageWrapper>
                      </PreviewGridItem>
                    );
                  })}
                </PreviewContainer>
              </FlexStartGrid>
            </CenteredGridContainer>
            <StyledDivider />
            <Typography variant="h6" gutterBottom>
              Table
            </Typography>
            <CenteredGridContainer container spacing={1}>
              <ColorPickerGrid item>
                <Typography>Màu nền Header</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.components?.MuiTableHead?.styleOverrides?.root
                        ?.backgroundColor ||
                      (themeOptions.mode === "dark" ? "#1e293b" : "#F1F3F5")
                    }
                    onChange={createColorChangeHandler(TABLE_HEAD_BG)}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu nền hàng chẵn</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.palette?.table?.rowEven ||
                      (themeOptions.mode === "dark" ? "#0f172a" : "#FFFFFF")
                    }
                    onChange={createColorChangeHandler("palette.table.rowEven")}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu nền hàng lẻ</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.palette?.table?.rowOdd ||
                      (themeOptions.mode === "dark" ? "#2c3e50" : "#F1F3F5")
                    }
                    onChange={createColorChangeHandler("palette.table.rowOdd")}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>
            </CenteredGridContainer>

            {/* ✅ Thêm cơ chế bật/tắt viền tùy chỉnh */}
            <FormControlLabelStyled
              control={
                <Switch
                  checked={
                    !!config.components?.MuiTableCell?.styleOverrides?.root
                      ?.enableCustomBorder
                  }
                  onChange={handleEnableCustomBorderChange}
                />
              }
              label="Bật/Tắt viền tùy chỉnh"
            />

            {config.components?.MuiTableCell?.styleOverrides?.root
              ?.enableCustomBorder && (
              <>
                <BorderColorContainer container spacing={1}>
                  <ColorPickerGrid item>
                    <Typography>Màu viền bảng</Typography>
                  </ColorPickerGrid>

                  <ColorPickerGrid item>
                    <ColorPickerWrapper>
                      <ColorPicker
                        value={
                          config.components?.MuiTableCell?.styleOverrides?.root
                            ?.borderColor || config.palette.divider
                        }
                        onChange={handleBorderColorChange}
                      />
                    </ColorPickerWrapper>
                  </ColorPickerGrid>
                </BorderColorContainer>

                <BorderWidthBox>
                  <TextField
                    label="Độ đậm của đường kẻ viền bảng (px)"
                    variant="outlined"
                    type="number"
                    fullWidth
                    error={!!validationErrors.borderWidth}
                    helperText={validationErrors.borderWidth}
                    InputLabelProps={{ shrink: true }}
                    value={
                      config.components?.MuiTableCell?.styleOverrides?.root
                        ?.borderWidth === undefined ||
                      config.components?.MuiTableCell?.styleOverrides?.root
                        ?.borderWidth === null
                        ? 1 // Giá trị mặc định ban đầu
                        : config.components.MuiTableCell.styleOverrides.root.borderWidth.replace(
                            "px",
                            ""
                          ) // Hiển thị giá trị rỗng hoặc số
                    }
                    onChange={handleBorderWidthChange}
                    onBlur={handleBorderWidthBlur}
                  />
                </BorderWidthBox>
              </>
            )}
          </ColumnGrid>
          {/* Cột phải */}
          <ColumnGrid item>
            <Typography variant="h6" gutterBottom>
              Typography (Font chữ)
            </Typography>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Font Family</InputLabel>
              <Select
                label="Font Family"
                value={
                  config.typography?.fontFamily || "Roboto, Arial, sans-serif"
                }
                onChange={handleFontFamilyChange}
              >
                {fontOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <ConfigTextField
              label="Cỡ chữ cơ bản (rem)"
              variant="outlined"
              type="number"
              fullWidth
              error={!!validationErrors.fontSize}
              helperText={validationErrors.fontSize}
              value={
                // Chuyển đổi px sang rem để hiển thị
                config.typography?.fontSize !== undefined &&
                config.typography?.fontSize !== null &&
                config.typography?.fontSize !== ""
                  ? parseFloat(config.typography.fontSize) / 16
                  : 0.875 // 14px
              }
              onChange={handleFontSizeChange}
              onBlur={handleFontSizeBlur}
              inputProps={{ step: "0.01" }} // Cho phép nhập số thập phân
            />
            <StyledDivider />

            <Typography variant="h6" gutterBottom>
              Shape (Bo góc)
            </Typography>
            <ConfigTextField
              label="Border Radius (px)"
              variant="outlined"
              type="number"
              fullWidth
              error={!!validationErrors.borderRadius}
              helperText={validationErrors.borderRadius}
              value={
                config.shape?.borderRadius === undefined ||
                config.shape?.borderRadius === null
                  ? 8 // ✅ hiển thị mặc định ban đầu
                  : config.shape?.borderRadius
              }
              onChange={handleBorderRadiusChange}
              onBlur={handleBorderRadiusBlur}
            />
            <StyledDivider />

            {/* <Typography variant="h6" gutterBottom>Spacing (Khoảng cách)</Typography>
                        <ConfigTextField
                            label="Đơn vị khoảng cách cơ sở (px)"
                            variant="outlined"
                            type="number"
                            // onKeyDown={(e) => e.preventDefault()}
                            fullWidth
                            value={config.spacing || 8}
                            onChange={(e) => handleConfigChange('spacing', Number(e.target.value))}
                            helperText="Giá trị này sẽ được nhân lên. Ví dụ: theme.spacing(2) = 16px nếu giá trị là 8."
                        />
                        <StyledDivider />

                        <Typography variant="h6" gutterBottom>Shadows (Đổ bóng)</Typography>
                        <FormControl fullWidth variant="outlined">
                            <InputLabel>Đổ bóng cho Elevation cấp 1</InputLabel>
                            <Select
                                label="Đổ bóng cho Elevation cấp 1"
                                value={config.shadows[1] || 'none'}
                                onChange={(e) => handleConfigChange('shadows.1', e.target.value)}
                            >
                                {shadowOptions.map(option => (
                                    <MenuItem key={option.label} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <StyledDivider /> */}
            <Typography variant="h6" gutterBottom>
              Component Overrides
            </Typography>
            <FormControlLabel
              control={
                <GlobalTransformSelect
                  value={
                    config.components?.MuiButton?.styleOverrides?.root
                      ?.textTransform || "none"
                  }
                  onChange={handleGlobalTextTransformChange}
                >
                  <MenuItem value="none">Chữ thường</MenuItem>
                  <MenuItem value="uppercase">VIẾT HOA</MenuItem>
                </GlobalTransformSelect>
              }
              label="Kiểu chữ toàn cục:"
              labelPlacement="start"
            />
            <StyledDivider />
            <Typography variant="h6" gutterBottom>
              Input & TextField
            </Typography>
            <InputConfigGrid container spacing={1}>
              <FullWidthGridItem item>
                <ConfigSectionSubheader variant="subtitle1">
                  Trạng thái bình thường
                </ConfigSectionSubheader>
              </FullWidthGridItem>

              <ColorPickerGrid item>
                <Typography>Màu nền</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.components?.MuiOutlinedInput?.styleOverrides?.root
                        ?.backgroundColor ||
                      (themeOptions.mode === "dark" ? "#1e293b" : "#FFFFFF")
                    }
                    onChange={handleInputBgColorChange}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu chữ</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.components?.MuiOutlinedInput?.styleOverrides?.input
                        ?.color ||
                      (themeOptions.mode === "dark" ? "#f8fafc" : "#1e293b")
                    }
                    onChange={handleInputTextColorChange}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu viền</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.components?.MuiOutlinedInput?.styleOverrides
                        ?.notchedOutline?.borderColor || "#CCCCCC"
                    }
                    onChange={handleInputBorderColorChange}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <FullWidthGridItem item>
                <ConfigSectionSubheader variant="subtitle1">
                  Trạng thái Disabled
                </ConfigSectionSubheader>
              </FullWidthGridItem>

              <ColorPickerGrid item>
                <Typography>Màu nền (Disabled)</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.components?.MuiOutlinedInput?.styleOverrides
                        ?.root?.["&.Mui-disabled"]?.backgroundColor ||
                      (themeOptions.mode === "dark" ? "#334155" : "#F9FAFB")
                    }
                    onChange={handleInputDisabledBgColorChange}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu chữ (Disabled)</Typography>
              </ColorPickerGrid>
              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.components?.MuiOutlinedInput?.styleOverrides
                        ?.input?.["&.Mui-disabled"]?.color ||
                      (themeOptions.mode === "dark" ? "#94a3b8" : "#757575")
                    }
                    onChange={handleInputDisabledTextColorChange}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>
            </InputConfigGrid>

            <StyledDivider />
            {/* ✅ Đã di chuyển phần Dialog & Popup vào đây */}
            <Typography variant="h6" gutterBottom>
              Dialog & Popup
            </Typography>
            <CenteredGridContainer container spacing={0.5}>
              <ColorPickerGrid item>
                <Typography>Màu nền Header</Typography>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.palette?.dialog?.headerBackground ||
                      (themeOptions.mode === "dark" ? "#1e293b" : "#f0f4f8")
                    }
                    onChange={handleDialogHeaderBgChange}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <Typography>Màu chữ Header</Typography>
              </ColorPickerGrid>

              <ColorPickerGrid item>
                <ColorPickerWrapper>
                  <ColorPicker
                    value={
                      config.palette?.dialog?.headerColor ||
                      (themeOptions.mode === "dark" ? "#f8fafc" : "#020C1A")
                    }
                    onChange={handleDialogHeaderTextChange}
                  />
                </ColorPickerWrapper>
              </ColorPickerGrid>
            </CenteredGridContainer>

            <StyledDivider />
            <Typography variant="h6" gutterBottom>
              Kích thước (Size)
            </Typography>
            <Grid container spacing={3}>
              <HalfWidthGridItem item>
                <TextField
                  label="Chiều cao của ô (px)"
                  variant="outlined"
                  type="number"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={
                    config.components?.MuiOutlinedInput?.styleOverrides?.root
                      ?.height === undefined ||
                    config.components?.MuiOutlinedInput?.styleOverrides?.root
                      ?.height === null
                      ? 41 // ✅ hiển thị mặc định ban đầu
                      : parseInt(
                          config.components?.MuiOutlinedInput?.styleOverrides
                            ?.root?.height,
                          10
                        )
                  }
                  error={!!validationErrors.cellHeight}
                  helperText={validationErrors.cellHeight}
                  onChange={handleCellHeightChange}
                  onBlur={handleCellHeightBlur}
                />
              </HalfWidthGridItem>
              {/* <HalfWidthGridItem item>
                                <TextField
                                    label="Chiều rộng của ô(px)"
                                    variant="outlined"
                                    type="number"
                                    // onKeyDown={(e) => e.preventDefault()}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    value={parseInt(config.components?.MuiOutlinedInput?.styleOverrides?.root?.width) || ''}
                                    onChange={(e) => handleConfigChange('components.MuiOutlinedInput.styleOverrides.root.width', `${Number(e.target.value)}px`)}
                                    // helperText="Để trống nếu muốn 100%"
                                />
                            </HalfWidthGridItem> */}
              {/* ✅ Thay đổi từ chiều rộng sang chiều cao bảng */}
              <HalfWidthGridItem item>
                <TextField
                  label="Chiều cao của hàng (px)"
                  variant="outlined"
                  type="number"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={
                    config.layout?.dynamicTable?.rowHeight === undefined ||
                    config.layout?.dynamicTable?.rowHeight === null
                      ? 55
                      : parseInt(config.layout?.dynamicTable?.rowHeight, 10)
                  }
                  error={!!validationErrors.rowHeight}
                  helperText={validationErrors.rowHeight}
                  onChange={handleRowHeightChange}
                  onBlur={handleRowHeightBlur}
                />
              </HalfWidthGridItem>

              <HalfWidthGridItem item>
                <MarginControlBoxStyled
                  mlValue={
                    config.components?.MuiOutlinedInput?.styleOverrides?.root
                      ?.left
                  }
                >
                  {/* <TextField
                        label="Di chuyển ô sang(Trái - Phải)"
                        variant="outlined"
                        type="number"
                         InputLabelProps={{ shrink: true }}
                        value={config.components?.MuiFormControl?.styleOverrides?.root?.marginLeft?.replace('px', '') || ''}
                        onChange={(e) =>
                            handleConfigChange(
                            'components.MuiFormControl.styleOverrides.root.marginLeft',
                            `${e.target.value}px`
                            )
                        }
                        /> */}
                </MarginControlBoxStyled>
              </HalfWidthGridItem>
              {/* <HalfWidthGridItem item>
                                <Box
                                    sx={{
                                        marginRight: config.components?.MuiOutlinedInput?.styleOverrides?.root?.right || 0,
                                        width: '100%'
                                    }}
                                >
                                    <TextField
                                        label="Phải (px)"
                                        variant="outlined"
                                        type="number"
                                        // onKeyDown={(e) => e.preventDefault()}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        value={parseInt(config.components?.MuiOutlinedInput?.styleOverrides?.root?.right, 10) || ''}
                                        onChange={(e) => handleConfigChange('components.MuiOutlinedInput.styleOverrides.root.right', `${Number(e.target.value)}px`)}
                                    />
                                </Box>
                            </HalfWidthGridItem> */}
            </Grid>

            <StyledDivider />
            <Typography variant="h6" gutterBottom>
              Tên ứng dụng
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Tên Logo"
                  variant="outlined"
                  fullWidth
                  value={config.app?.logoText || ""}
                  onChange={handleLogoTextChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Mô tả ứng dụng"
                  variant="outlined"
                  fullWidth
                  value={config.app?.description || ""}
                  onChange={handleAppDescriptionChange}
                />
              </Grid>
              {/* 🚀 Gộp thành một nút duy nhất */}
              <FlexGridItem item xs={12} sm={4}>
                <Button
                  variant="outlined"
                  onClick={handleClickSharedLogo}
                  fullWidth
                >
                  Tải ảnh logo
                </Button>

                <input
                  type="file"
                  id="shared-logo-input"
                  hidden
                  accept="image/png, image/jpeg, image/svg+xml, image/x-icon"
                  onChange={handleSharedLogoChange}
                />
              </FlexGridItem>

              {/* Thêm khu vực hiển thị logo đã tải lên */}
              {config.app?.logoImage && (
                <LogoGrid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Logo hiện tại:
                  </Typography>
                  <LogoImage
                    src={config.app.logoImage}
                    alt="Logo hiện tại"
                    divider={config.palette.divider}
                  />
                </LogoGrid>
              )}
            </Grid>
          </ColumnGrid>
        </Grid>
      </ContentWrapper>

      {/* ✅ DIALOG ĐỂ LƯU CẤU HÌNH MỚI */}
      {/* DIALOG LƯU CẤU HÌNH MỚI */}
      <Dialog open={openSaveDialog} onClose={handleCloseSaveDialog}>
        <DialogTitle>
          {isSavingAs ? "Lưu thành cấu hình mới" : "Tạo cấu hình theme mới"}
        </DialogTitle>
        <DialogContent>
          <DenseTextField
            label="Tên cấu hình"
            fullWidth
            variant="standard"
            value={newThemeName}
            onChange={handleNewThemeNameChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveTheme} variant="contained">
            Lưu
          </Button>
          <CancelButton onClick={handleCloseSaveDialog}>Hủy</CancelButton>
        </DialogActions>
      </Dialog>

      {/* DIALOG XÁC NHẬN XÓA */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa cấu hình theme này không? Hành động này
            không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <ErrorButton variant="outlined" onClick={confirmDeleteTheme}>
            Xóa
          </ErrorButton>
          <CancelButton onClick={handleCloseDeleteDialog}>Hủy</CancelButton>
        </DialogActions>
      </Dialog>

      {/* DIALOG CẮT ẢNH */}
      <LargeDialog open={cropState.open} onClose={handleCloseCropDialog}>
        <DialogTitle>Cắt ảnh nền</DialogTitle>
        <DialogContent>
          {cropState.imgSrc && (
            <CropContainer>
              <ReactCrop
                crop={crop}
                onChange={handleCropChange}
                aspect={cropState.aspect}
                keepSelection
                locked
                ruleOfThirds
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={cropState.imgSrc}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </CropContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveCrop} variant="contained">
            Lưu ảnh
          </Button>
          <CancelButton onClick={handleCloseCropDialog}>Hủy</CancelButton>
        </DialogActions>
      </LargeDialog>
    </PageWrapper>
  );
};

export default ThemeConfigPage;
