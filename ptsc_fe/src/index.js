// import { Buffer } from "buffer";
// import process from "process";

// window.Buffer = Buffer;
// window.process = process;

// Polyfills for crypto.randomUUID in HTTP context
import "./utils/polyfills";

import React from "react";
import ReactDOM from "react-dom/client";
import reportWebVitals from "./reportWebVitals";
import { Provider } from "react-redux";
import store from "./redux/store";
import { ToastProvider } from "@components/common/ToastProvider";
// import '!file-loader?name=[name].[ext]!./images/favicon.ico';
import "!file-loader?name=[name].[ext]!./assets/js/appConfig.js";
import "./styles.css";
import "@progress/kendo-theme-default/dist/all.css";
import App from "./App";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // <React.StrictMode>
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <App /> 
      </ToastProvider>
    </ThemeProvider>
  </Provider>
);

reportWebVitals();
