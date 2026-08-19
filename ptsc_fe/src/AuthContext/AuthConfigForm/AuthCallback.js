import React, { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@components/common/ToastProvider";
import { AuthContext } from "@AuthContext/AuthProvider";
import authService from "@services/AuthService";

const AuthCallback = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { revalidateUser, authConfig } = useContext(AuthContext);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const token = urlParams.get("token");
        const authType = urlParams.get("auth_type");

        // ✅ Keycloak: BE gửi token trực tiếp qua redirect URL
        if (authType === "keycloak" && token) {
          toast("Đang xử lý xác thực Keycloak...", "info");
          authService.setStrategy("keycloak");

          // Lưu app token và id_token vào localStorage
          localStorage.setItem("token", token);
          if (urlParams.get("id_token")) {
            localStorage.setItem("id_token", urlParams.get("id_token"));
          }

          // Xoá token khỏi URL cho sạch
          window.history.replaceState({}, document.title, window.location.pathname);

          // Reset bộ đếm vòng lặp khi đăng nhập thành công
          sessionStorage.removeItem("auth_retry_count");

          // Cập nhật user state
          await revalidateUser("keycloak");

          toast("Xác thực Keycloak thành công!", "success");
          navigate("/");
          return;
        }

        // ✅ WSO2: FE nhận code, gọi BE để đổi lấy token
        if (code) {
          if (!code) {
            throw new Error("Không tìm thấy mã code trong URL callback!");
          }
          toast("Đang xử lý xác thực, vui lòng đợi...", "info");
          authService.setStrategy("wso2");
          await authService.handleCallback(code);
          toast("Xác thực thành công!", "success");
          await revalidateUser("wso2");
          navigate("/");
          return;
        }

        throw new Error("Không tìm thấy token hoặc code trong URL callback!");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[AuthCallback] Lỗi:", error);
        toast(error.message || "Lỗi khi xử lý xác thực!", "error");
        navigate("/login");
      }
    };

    handleCallback();
  }, [navigate, toast, revalidateUser, authConfig]);

  return <div>🔄 Đang xử lý xác thực, vui lòng đợi...</div>;
};

export default AuthCallback;
