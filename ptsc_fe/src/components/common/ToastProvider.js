import React, { createContext, useContext, useState, useCallback } from "react";
import { Snackbar } from "@mui/material";
import PropTypes from "prop-types";
import { StyledAlert } from "@styles/ToastProvider.styles";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const showToast = useCallback((message, severity = "info") => {
    setToast({ open: true, message, severity });
  }, []);

  const hideToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={hideToast}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <StyledAlert onClose={hideToast} severity={toast.severity}>
          {toast.message}
        </StyledAlert>
      </Snackbar>
    </ToastContext.Provider>
  );
};
ToastProvider.propTypes = {
  children: PropTypes.node.isRequired, // Bắt buộc phải là React node (JSX, text, component...)
};

export const useToast = () => useContext(ToastContext);
