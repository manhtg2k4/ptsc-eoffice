"use client";

import React from "react";
// import { AuthContext } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/AuthProvider";

function AuthModal(props) {
    const { isOpen, onClose } = props;
    // const { initializeAuth } = useContext(AuthContext);

    if (!isOpen) {
        return null;
    }

    const handleLogin = () => {
        // Redirect về trang login để dùng Keycloak login
        window.location.href = "/login";
    };

    return (
        <div className="auth-modal-overlay">
            <div className="auth-modal-content">
                <h3 className="auth-modal-title">Yêu cầu đăng nhập</h3>
                <p className="auth-modal-text">
                    Bạn chưa đăng nhập. Vui lòng đăng nhập để sử dụng tính năng này.
                </p>
                <div className="auth-modal-actions">
                    <button
                        onClick={onClose}
                        className="auth-modal-btn auth-modal-btn-cancel"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleLogin}
                        className="auth-modal-btn auth-modal-btn-login"
                    >
                        Đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AuthModal;