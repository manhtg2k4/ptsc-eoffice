import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
} from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";
import { styled } from "@mui/material/styles";

export const StyledTextField = styled(TextField, {
  shouldForwardProp: (prop) =>
    prop !== "customWidth" &&
    prop !== "inputBgColor" &&
    prop !== "autoWidth" &&
    prop !== "autoHeight" &&
    prop !== "noBorderRadius" &&
    prop !== "isFilter",
})(({
  theme,
  customWidth,
  size,
  inputBgColor,
  autoWidth,
  multiline,
  rows,
  minRows,
  select,
  autoHeight,
  noBorderRadius,
  isFilter,
}) => {
  return {
    width: autoWidth ? "auto" : customWidth || "100%",
    minWidth: autoWidth ? (select ? "150px" : "auto") : "none",

    "& .MuiOutlinedInput-root": {
      // Ghi đè style cho autofill của trình duyệt
      "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & textarea:-webkit-autofill, & textarea:-webkit-autofill:hover, & textarea:-webkit-autofill:focus, & div:-webkit-autofill":
      {
				//  border: `1px solid ${theme.palette.divider}`,
        border: "none !important",
        outline: "none !important",
        // Sử dụng màu nền của input từ theme, nếu không có thì dùng màu mặc định theo mode
        WebkitBoxShadow: `0 0 0 1000px ${inputBgColor ||
          theme.components?.MuiOutlinedInput?.styleOverrides?.root
            ?.backgroundColor ||
          (theme.palette.mode === "dark" ? "#1e293b" : "#F5F7FA")
          } inset !important`,
        // Sử dụng màu chữ chính của theme
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
        caretColor: `${theme.palette.text.primary} !important`,
        borderRadius: "inherit", // Giữ bo góc của input
        transition: "background-color 5000s ease-in-out 0s", // Trick để giữ màu nền
      },
      // ✅ Tự động điều chỉnh chiều cao cho select multiple
      ...(select &&
        autoHeight && {
        height: "auto", // Cho phép chiều cao tự động
        minHeight: size === "small" ? "40px" : "56px", // Giữ chiều cao tối thiểu
        // Thêm thanh cuộn khi nội dung vượt quá chiều cao tối đa
        maxHeight: "20px", // Giới hạn chiều cao tối đa (khoảng 3-4 dòng chip)
        overflowY: "auto !important", // Luôn hiển thị thanh cuộn dọc khi cần
      }),
      backgroundColor:
        inputBgColor ||
        theme.components?.MuiOutlinedInput?.styleOverrides?.root
          ?.backgroundColor ||
        (theme.palette.mode === "dark" ? "#1e293b" : "#F5F7FA"),
      borderRadius: theme.shape.borderRadius,
      ...(noBorderRadius && {
        borderTopRightRadius: "0px",
        borderBottomRightRadius: "0px",
      }),

      // Đảm bảo MuiOutlinedInput-root có đủ chiều cao cho multiline và tự động co giãn
      ...(multiline
        ? {
          height: "auto !important",
          ...(rows && !minRows
            ? {
              minHeight: (size === "small" && isFilter) ? `${rows * 20 + 20}px` : `${rows * 24 + 20}px`,
            }
            : {}),
        }
        : {}),

      "&.Mui-disabled": {
        backgroundColor:
          (theme.components?.MuiOutlinedInput?.styleOverrides?.root?.[
            "&.Mui-disabled"
          ]?.backgroundColor ||
          (theme.palette.mode === "dark" ? "#334155" : "#EBEBEB")) + " !important",

        color:
          (theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
            "&.Mui-disabled"
          ]?.color ||
         (theme.palette.mode === "dark" ? "#94a3b8" : "#000000") ||
          theme.palette.text.disabled) + " !important",
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.divider,
        },
      },
      "& .MuiInputBase-input.Mui-disabled": {
        WebkitTextFillColor:
          (theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
            "&.Mui-disabled"
          ]?.color || (theme.palette.mode === "dark" ? theme.palette.text.disabled : "#000000")) + " !important",
      },
      // ✅ Không hiển thị border khi hover vào disabled input
      "&:hover.Mui-disabled .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.palette.divider,
      },
      // Border color using divider from theme
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.palette.divider,
      },
    },
    // Hover effect for normal (not disabled) inputs
    "& .MuiOutlinedInput-root:not(.Mui-disabled):hover .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
    // Focus effect
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
    // Error effect
    "& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.error.main,
    },

    "& .MuiInputLabel-root": {
      fontWeight: 500,
      color: theme.palette.text.primary,
      "&.Mui-focused": {
        color: theme.palette.primary.main,
      },
      "&.Mui-error": {
        color: theme.palette.error.main, // ← LABEL ĐỎ KHI LỖI
      },
      "&.Mui-error ~ .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.palette.error.main, // viền đỏ (nếu cần)
      },
      // ✅ Giữ label màu bình thường khi disabled (không bị mờ)
      "&.Mui-disabled": {
        color: theme.palette.text.primary,
      },
    },

    "& .MuiInputLabel-asterisk": {
      color: "red",
    },

    "& .MuiOutlinedInput-input": {
      padding: multiline
        ? (size === "small" && isFilter)
          ? "8px 12px"
          : "10px 12px"
        : size === "small"
          ? "8px 14px"
          : "16.5px 14px",
    },
    // Restore wrapping and formatting for textarea
    "& .MuiOutlinedInput-root textarea": {
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      overflowWrap: "break-word",
      resize: "none",
    },
  };
});

export const StyledTextFieldTab = styled(TextField, {
  shouldForwardProp: (prop) =>
    prop !== 'customWidth' &&
    prop !== 'inputBgColor' &&
    prop !== 'autoWidth' &&
    prop !== 'autoHeight' &&
    prop !== 'noBorderRadius' &&
    prop !== 'autocompleteTagStyle',
})(({
  theme,
  customWidth,
  size,
  inputBgColor,
  autoWidth,
  noBorderRadius,
  // autocompleteTagStyle,
}) => ({
  width: autoWidth ? 'auto' : customWidth || '100%',
  minWidth: autoWidth ? '180px' : 'none',

  '& .MuiOutlinedInput-root': {
    // Cuộn ngang, không wrap
    flexWrap: 'nowrap !important',
    overflowX: 'auto !important',
    overflowY: 'hidden !important',

    // Giữ chiều cao cố định 1 dòng
    height: size === 'small' ? '40px' : '56px',
    minHeight: size === 'small' ? '40px' : '56px',
    maxHeight: size === 'small' ? '40px' : '56px',

    // ✅ QUAN TRỌNG: Ẩn notchedOutline, dùng border thông thường
    position: 'relative',
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none !important', // Loại bỏ hoàn toàn notchedOutline
    },

    // ✅ Dùng border thông thường để luôn bọc toàn bộ ô
    border: `1px solid ${theme.palette.divider}`,
    boxSizing: 'border-box',

    // Thanh cuộn mỏng đẹp
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.palette.grey[400]} transparent`,
    '&::-webkit-scrollbar': { height: '6px' },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.grey[500],
      borderRadius: '10px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: theme.palette.grey[600],
    },

    // Padding hợp lý, chỗ cho clear button nếu có
    padding: '0 12px !important',
    paddingRight: '56px !important',

    backgroundColor:
      inputBgColor ||
      (theme.palette.mode === 'dark' ? '#1e293b' : '#FFFFFF'),

    borderRadius: theme.shape.borderRadius,
    ...(noBorderRadius && {
      borderTopRightRadius: '0px',
      borderBottomRightRadius: '0px',
    }),

    // ✅ Hover state - đổi màu border trực tiếp
    '&:hover': {
      borderColor: theme.palette.primary.main,
    },

    // ✅ Focus state - border đậm hơn
    '&.Mui-focused': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
      // Giảm padding 1px để bù cho border dày thêm (tránh nhảy layout)
      padding: '0 11px !important',
      paddingRight: '47px !important',
    },

    // ✅ Error state
    '&.Mui-error': {
      borderColor: theme.palette.error.main,
    },

    // ✅ Disabled state - make it look like other disabled fields
    '&.Mui-disabled': {
      backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#EBEBEB',
      borderColor: theme.palette.divider,
      cursor: 'not-allowed',
      '& .MuiAutocomplete-input': {
        WebkitTextFillColor: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000',
      },
    },
  },

  // Ép inputRoot cuộn ngang
  '& .MuiAutocomplete-inputRoot': {
    flexWrap: 'nowrap !important',
    overflowX: 'auto !important',
    overflowY: 'hidden !important',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 0',
    minHeight: 'unset !important',
		paddingRight: '48px',
  },

  // Chip luôn nằm ngang, không co
  '& .MuiAutocomplete-tag': {
    flexShrink: 0,
    whiteSpace: 'nowrap',
    height: size === 'small' ? '24px' : '32px',
    margin: '0 !important',
    fontSize: size === 'small' ? '0.8125rem' : '0.875rem',
  },

  // Input gõ text
  '& .MuiAutocomplete-input': {
    minWidth: '120px !important',
    flexGrow: 1,
    padding: '0 !important',
  },

  // ✅ Nút Clear và endAdornment luôn sticky ở cuối
  // '& .MuiInputAdornment-root': {
  //   position: 'sticky !important',
  //   right: '8px',
  //   backgroundColor: inputBgColor || (theme.palette.mode === 'dark' ? '#1e293b' : '#F5F7FA'),
  //   paddingLeft: '8px',
  //   marginLeft: 'auto',
  //   zIndex: 10,
  // },

  // Label giữ nguyên
  '& .MuiInputLabel-root': {
    fontWeight: 500,
    color: theme.palette.text.primary,
    // marginTop: '4px',
    backgroundColor: inputBgColor || (theme.palette.mode === 'dark' ? '#1e293b' : '#FFFFFF'),
    paddingX: '4px',
    '&.Mui-focused': { color: theme.palette.primary.main },
    '&.Mui-error': { color: theme.palette.error.main },
    '&.Mui-disabled': { color: theme.palette.text.primary },
  },
  '& .MuiInputLabel-asterisk': { color: 'red' },
}));

export const StyleInputAdornment = styled(InputAdornment)(({
  stylePosition,
}) => {
  return {
    position: stylePosition,
  };
});
// export const SearchBoxContainer = styled("div")({
//   padding: "8px 16px",
//   position: "sticky",
//   top: 0,
//   backgroundColor: "white",
//   zIndex: 1,
// });

export const SearchBoxContainer = styled("div")(({ theme }) => ({
  padding: "8px 16px",
  position: "sticky",
  top: 0,
  backgroundColor: theme.palette.background.paper, // dùng theme từ MUI
  zIndex: 1,
  width: "100%",
}));

export const TreeLinesTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root .MuiOutlinedInput-input": {
    backgroundColor: theme.palette.background.paper,
  },
}));

export const TreeLinesContainer = styled("div")({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  pointerEvents: "none",
});

export const TreeParentVerticalLine = styled(Box, {
  shouldForwardProp: (prop) => prop !== "leftPos",
})(({ leftPos }) => ({
  position: "absolute",
  top: 0,
  bottom: 0,
  width: "1px",
  backgroundColor: "#E0E0E0",
  left: leftPos,
}));

export const TreeNodeVerticalLine = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isLastChild" && prop !== "leftPos",
})(({ isLastChild, leftPos }) => ({
  position: "absolute",
  top: 0,
  height: isLastChild ? "50%" : "100%",
  borderLeft: "1px solid #ccc",
  left: leftPos,
}));

export const TreeNodeHorizontalLine = styled(Box, {
  shouldForwardProp: (prop) => prop !== "leftPos",
})(({ leftPos }) => ({
  position: "absolute",
  top: "20px",
  height: "1px",
  width: "18px",
  backgroundColor: "#E0E0E0",
  left: leftPos,
}));

export const TreeItemContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== "level",
})(({ level = 0 }) => ({
  display: "flex",
  alignItems: "center",
  position: "relative",
  zIndex: 1,
  paddingLeft: `${12 + level * 28}px`,
}));

export const TreeToggleButton = styled(IconButton)({
  padding: "2px",
  marginRight: "4px",
});

export const TreeViewMenuItem = styled(MenuItem)(({ theme }) => ({
  position: "relative",
  padding: 0, // Loại bỏ padding mặc định của MenuItem
  color: theme.palette.text.primary,
  "&:hover": {
    backgroundColor: "transparent",
    color: theme.palette.text.primary,
  },
  "&.Mui-selected": {
    backgroundColor: theme.palette.action.selected,
  },
  "&.Mui-selected:hover": {
    backgroundColor: theme.palette.action.selected,
  },
}));

const BaseClearableAdornment = styled(InputAdornment)(({ theme }) => ({
  marginRight: theme.spacing(3),
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
}));

BaseClearableAdornment.defaultProps = {
  position: "end",
};
export const ClearableInputAdornment = BaseClearableAdornment;

export const ClearContentTag = styled(ClearableInputAdornment)(() => ({
  marginRight: 'unset',
	position: "absolute",
  justifyContent: "unset",
	paddingLeft: "unset",
	zIndex: 100,
	right: "2px",
	top: "50%",
	transform: "translateY(-50%)",
}));

const BasePasswordAdornment = styled(InputAdornment)({});
BasePasswordAdornment.defaultProps = {
  position: "end",
};
export const PasswordInputAdornment = BasePasswordAdornment;

export const StyleIconUploadFileToCmt = styled(InputAdornment)(({ theme }) => ({
  position: "end",
  "& .MuiSvgIcon-root": {
    // Thay đổi màu sắc dựa trên theme mode
    color: theme.palette.mode === "dark" ? "#fff" : "#333",
    fontSize: "22px",
    fontWeight: 600,
  },
}));

export const StyledMenuItems = styled(MenuItem)({
  padding: 10,
  position: "relative",
});

export const TreeViewPlaceholder = styled("div")({
  width: "28px", // Bằng với kích thước của TreeToggleButton
  height: "28px",
  flexShrink: 0,
  marginRight: "4px",
});

const BaseAdornment = styled(InputAdornment)({});
BaseAdornment.defaultProps = {
  position: "end",
};

export const SearchInputAdornment = styled(BaseAdornment)({
  margin: 0,
});

export const SearchClearButton = styled(IconButton)({
  padding: 0,
});
export const SmallClearIcon = styled(ClearIcon)({
  fontSize: "1.25rem", // Tương đương với fontSize="small"
});

export const RequiredLabel = styled("span")(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const TreeIconBox = styled(Box)(({ theme }) => ({
  cursor: "pointer",
  border: `1px solid ${theme.palette.divider}`,
  width: 20,
  height: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginRight: theme.spacing(1),
  color: theme.palette.text.secondary,
  backgroundColor: theme.palette.background.paper, // Để che đường kẻ phía sau
}));

export const TreeIcon = styled("svg")({
  fontSize: "1.1rem",
});

export const ChipContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "multiline",
})(({ theme, multiline }) => ({
  display: "flex",
  gap: "5px",
  flexWrap: multiline ? "wrap" : "nowrap",
  overflowX: multiline ? "hidden" : "auto",
  overflowY: multiline ? "auto" : "hidden",
  whiteSpace: multiline ? "normal" : "nowrap",
  maxHeight: multiline ? "110px" : "auto",

  /* Firefox */
  scrollbarWidth: "thin",
  scrollbarColor: `${theme.palette.divider} ${theme.palette.background.paper}`,

  /* Chrome / Edge / Safari */
  "&::-webkit-scrollbar": {
    height: "6px",
  },

  "&::-webkit-scrollbar-track": {
    backgroundColor: theme.palette.background.paper, // ⭐ ăn đúng màu sáng / tối
    borderRadius: "10px",
  },

  "&::-webkit-scrollbar-thumb": {
    backgroundColor: theme.palette.divider, // ⭐ đổi theo theme
    borderRadius: "10px",

    "&:hover": {
      backgroundColor: theme.palette.action.active,
    },
  },
}));

export const NoDataMenuItem = styled(MenuItem)({
  justifyContent: "center",
});

export const StyledChipTab = styled(Chip)(({theme}) => ({
  color: theme.palette.text.primary,
  '&.Mui-disabled': {
    opacity: 1,
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    '& .MuiChip-label': {
      color: theme.palette.text.primary,
    },
    '& .MuiChip-deleteIcon': {
      display: 'none',
    },
  },
}))

export const ClearButtonWrapper = styled("div")(({ theme }) => ({
  position: "absolute",
  right: 1,
  top: 1,
  bottom: 1,
  width: 44,
  minWidth: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,

  // border: `1px solid ${theme.palette.divider}`,
  borderLeft: "none", // dính liền input
  borderRadius: "0 8px 8px 0", // bo góc phải giống ảnh

  // backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#FFFFFF',

  "& button": {
    width: 32,
    height: 32,
    borderRadius: 6,
  },

  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));
export const TruncatedText = styled("div")({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  width: "100%",
  display: "block",
  minWidth: 0,
});

export const TruncatedWrapper = styled("div")({
  width: "100%",
  overflow: "hidden",
});
