import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { deepmerge } from "@mui/utils";

// Cấu hình nền tảng, áp dụng cho cả 2 chế độ
const baseConfig = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 16,
    h5: {
      fontSize: "25px",
      fontWeight: 600,
    },
    h6: {
      fontSize: "21px",
      fontWeight: 600,
    },
    body1: {
      fontSize: "1rem", // 16px
      fontWeight: 450,
    },
    body2: {
      fontSize: "0.9375rem", // 15px
      fontWeight: 450,
    },
    subtitle1: {
      fontSize: "1.0625rem", // 17px
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: "1rem", // 16px
      fontWeight: 500,
    },
    caption: {
      fontSize: "0.875rem", // 14px
      fontWeight: 450,
    },
    button: {
      fontSize: "1rem", // 16px
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8, // ✅ Đặt giá trị mặc định hợp lý
  },
  layout: {
    dynamicTable: {
      indexCellWidth: 60,
      actionsCellWidth: 180,
      defaultCellWidth: 200,
    },
    accordion: {
      debouncedInputMinWidth: 200,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "@font-face": {
          fontFamily: "Inter",
          fontStyle: "normal",
          fontWeight: 400,
          src: `local('Inter'), local('Inter-Regular')`,
        },
        "html, body, #root": {
          height: "100%",
          margin: 0,
          padding: 0,
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
          // Sử dụng giá trị từ theme.shape
          borderRadius: (theme) => theme.shape.borderRadius,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow:
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          borderRadius: (theme) => theme.shape.borderRadius,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        // Paper sẽ kế thừa bo góc từ theme.shape.borderRadius mặc định
        // không cần ghi đè ở đây trừ khi muốn giá trị khác
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: (theme) => theme.shape.borderRadius,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          // ✅ Đặt giá trị mặc định cho màu và độ đậm của viền
          borderColor: (theme) => theme.palette.divider,
          borderWidth: "1px",
        },
        head: {
          fontSize: "14px", // Giảm 2px từ font size mặc định (16px)
          fontWeight: 600,
        },
      },
    },
  },
};

// Bảng màu cho từng chế độ
const lightPalette = {
  primary: {
    main: "#0062AD",
    contrastText: "#ffffff", // Đảm bảo chữ luôn trắng
  },
  secondary: { main: "#26a69a" },
  background: { default: "#f4f6f8", paper: "#ffffff" },
  text: { primary: "#000000", secondary: "#1a1a1a" },
  divider: "#e2e8f0",
  action: {
    active: "rgba(30, 41, 59, 0.1)",
    hover: "#eeeeee", // ✅ Thay thế màu trong suốt bằng màu đục
    selected: "rgba(30, 41, 59, 0.08)",
    disabled: "rgba(20, 98, 224, 0.26)",
    disabledBackground: "rgba(30, 41, 59, 0.12)",
  },
  sidebar: {
    background: "#ffffffff",
    text: "#020C1A",
  },
  table: {
    // Cấu hình mặc định cho table (Light Mode)
    rowEven: "#FFFFFF",
    rowOdd: "#F1F3F5",
    header: "#F1F3F5",
  },
  dialog: {
    // Thêm cấu hình mặc định cho dialog
    headerBackground: "#f0f4f8", 
    headerColor: "#020C1A",
  },
};

const lightComponents = {
  MuiOutlinedInput: {
    // Hợp nhất các định nghĩa MuiOutlinedInput
    styleOverrides: {
      root: {
        backgroundColor: "#FFFFFF", // Màu nền mặc định cho Input ở light mode
        "&.Mui-disabled": {
          backgroundColor: "#F9FAFB", // Màu nền disabled ở light mode
        },
      },
      input: {
        color: "#000000", // Màu chữ mặc định cho Input ở light mode
        "&.Mui-disabled": {
          color: "#000000", // Màu chữ disabled ở light mode - đen
          WebkitTextFillColor: "#000000", // Đảm bảo màu chữ không bị ghi đè bởi Webkit
        },
      },
    },
  },
};
const darkPalette = {
  primary: {
    main: "#769ebf", // Màu mặc định mới cho chế độ tối
    contrastText: "#ffffff", // Luôn đảm bảo chữ màu trắng trên nền này
  },
  secondary: { main: "#80cbc4" },
  background: {
    default: "#0f172a",
    paper: "#1e293b",
  },
  text: { primary: "#f8fafc", secondary: "#cbd5e1" },
  divider: "#334155",
  action: {
    active: "rgba(248, 250, 252, 0.1)",
    hover: "#334155", // ✅ Thay thế màu trong suốt bằng màu đục (giống màu divider)
    selected: "rgba(248, 250, 252, 0.08)",
    disabled: "rgba(248, 250, 252, 0.3)",
    disabledBackground: "rgba(51, 65, 85, 0.5)",
  },
  sidebar: {
    background: "#1e293b",
    text: "#ffffff",
  },
  table: {
    // Cấu hình mặc định cho table (Dark Mode) theo yêu cầu
    rowEven: "#0f172a",
    rowOdd: "#2c3e50",
    header: "#334155",
  },
  dialog: {
    // Thêm cấu hình mặc định cho dialog
    headerBackground: "#1e293b", // Giống màu paper mặc định nhưng độc lập
    headerColor: "#f8fafc",
  },
};

const darkComponents = {
  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: "#1e293b !important",
        borderRadius: theme.shape.borderRadius, // ✅ Dùng borderRadius từ theme
        boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
      }),
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: "#1e293b !important",
        borderRadius: theme.shape.borderRadius, // ✅ Bo góc theo theme
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: "#334155", // ✅ Viền mặc định
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "#90caf9", // ✅ Viền xanh khi hover
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: "#90caf9", // ✅ Viền xanh khi focus
        },
        "&.Mui-disabled": {
          backgroundColor: "rgba(51, 65, 85, 0.7)", // Màu nền mặc định cho Input disabled ở dark mode
        },
      }),
      input: {
        color: "#f8fafc", // Màu chữ mặc định cho Input ở dark mode
        "&.Mui-disabled": {
          color: "#94a3b8", // Màu chữ mặc định cho Input disabled ở dark mode
          WebkitTextFillColor: "#94a3b8", // Đảm bảo màu chữ không bị ghi đè bởi Webkit
        },
      },
    },
  },

  MuiTableHead: {
    styleOverrides: {
      root: {
        backgroundColor: "#1e293b", // Màu nền header mặc định ở dark mode
      },
    },
  },

  MuiTextField: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
      }),
    },
  },
};

// DARK MODE của GOOGLE
// const darkPalette = {
//   primary: { main: '#8AB4F8' }, // Google blue
//   secondary: { main: '#03DAC6' }, // Teal accent
//   background: {
//     default: '#121212', // Nền tổng thể
//     paper: '#1E1E1E',   // Nền card, form...
//   },
//   text: {
//     primary: '#E3E3E3',     // Chữ chính
//     secondary: '#B3B3B3',   // Chữ phụ
//     disabled: '#777777',    // Chữ khi disable
//   },
//   divider: '#2C2C2C', // Viền mờ
//   action: {
//     active: 'rgba(255, 255, 255, 0.54)',
//     hover: 'rgba(255, 255, 255, 0.08)',
//     selected: 'rgba(255, 255, 255, 0.16)',
//     disabled: 'rgba(255, 255, 255, 0.3)',
//     disabledBackground: 'rgba(255, 255, 255, 0.12)',
//     focus: 'rgba(255, 255, 255, 0.12)',
//   },
//   sidebar: {
//     background: '#1E1E1E',
//     text: '#FFFFFF',
//   },
// };

// const darkComponents = {
//   MuiCard: {
//     styleOverrides: {
//       root: {
//         backgroundColor: '#1E1E1E !important',
//         borderRadius: (theme) => theme.shape.borderRadius,
//         boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
//       },
//     },
//   },
//   MuiOutlinedInput: {
//     styleOverrides: {
//       root: {
//         backgroundColor: '#1E1E1E !important',
//         borderRadius: (theme) => theme.shape.borderRadius,
//         '& .MuiOutlinedInput-input': {
//           color: '#E3E3E3',
//         },
//         '& .MuiOutlinedInput-notchedOutline': {
//           borderColor: '#2C2C2C',
//         },
//         '&:hover .MuiOutlinedInput-notchedOutline': {
//           borderColor: '#8AB4F8', // viền xanh nhẹ khi hover
//         },
//         '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
//           borderColor: '#8AB4F8',
//         },
//         '&.Mui-disabled': {
//           backgroundColor: 'rgba(255,255,255,0.08) !important',
//           '& .MuiOutlinedInput-notchedOutline': {
//             borderColor: '#2C2C2C',
//           },
//           '& .MuiInputBase-input.Mui-disabled': {
//             WebkitTextFillColor: '#777777',
//           },
//         },
//       },
//     },
//   },
//   MuiTextField: {
//     styleOverrides: {
//       root: {
//         backgroundColor: '#1E1E1E !important',
//         borderRadius: (theme) => theme.shape.borderRadius,
//         '& .MuiInputBase-input': {
//           color: '#E3E3E3',
//         },
//       },
//     },
//   },
//   MuiPaper: {
//     styleOverrides: {
//       root: {
//         backgroundColor: '#1E1E1E !important',
//         borderRadius: (theme) => theme.shape.borderRadius,
//       },
//     },
//   },
// };

const getTheme = (options = {}) => {
  const { mode = "light", ...customOptions } = options;

  const defaultPalette = mode === "dark" ? darkPalette : lightPalette;
  const modeComponents = mode === "dark" ? darkComponents : lightComponents;

  const mergedConfig = deepmerge(
    baseConfig,
    {
      ...customOptions,
      components: deepmerge(
        {
          MuiCssBaseline: {
            styleOverrides: {
              // ✅ Custom scrollbar toàn cục
              "*::-webkit-scrollbar": {
                width: "8px",
                height: "8px",
              },
              "*::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "*::-webkit-scrollbar-thumb": {
                backgroundColor:
                  mode === "dark"
                    ? "rgba(255, 255, 255, 0.3)"
                    : "rgba(100, 100, 100, 0.6)",
                borderRadius: "4px",
              },
              "*::-webkit-scrollbar-thumb:hover": {
                backgroundColor:
                  mode === "dark"
                    ? "rgba(255, 255, 255, 0.5)"
                    : "rgba(100, 100, 100, 0.8)",
              },
              "*::-webkit-scrollbar-corner": {
                background: "transparent",
              },
              "*::-webkit-scrollbar-track-piece": {
                background: "transparent",
              },
            },
          },
          ...modeComponents,
        },
        customOptions.components || {}
      ),
    },
    { clone: true }
  );

  const modeTheme = createTheme(
    deepmerge(mergedConfig, {
      palette: {
        mode,
        ...deepmerge(defaultPalette, customOptions.palette || {}),
      },
    })
  );

  return responsiveFontSizes(modeTheme);
};

export default getTheme;
