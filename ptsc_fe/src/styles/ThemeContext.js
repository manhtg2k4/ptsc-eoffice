import React, { createContext, useContext, useMemo } from "react"; // Removed useState, useEffect
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import getTheme from "./getTheme";

export const ThemeModeContext = createContext({
  toggleThemeMode: () => {},
  updateThemeOptions: () => {},
  themeOptions: {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

export const ThemeProvider = ({ children }) => {
  // 🚀 ThemeProvider này giờ chỉ là một wrapper cho MuiThemeProvider
  const { themeOptions } = useContext(ThemeModeContext); // Lấy themeOptions từ context
  const theme = useMemo(() => getTheme(themeOptions), [themeOptions]); // Tạo theme từ themeOptions

  return (
    // Render MuiThemeProvider
    <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
  );
};
