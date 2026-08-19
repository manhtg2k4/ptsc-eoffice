import { navigateNotification } from "@utils/notificationNavigation";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * Component xử lý Deep Link tự động ánh xạ và mở màn hình tương ứng
 */
const DeepLinkHandler = () => {
  const { deeplinkKey, deeplinkId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (deeplinkKey && deeplinkId) {
      navigateNotification({
        key: deeplinkKey,
        recordId: deeplinkId,
      }, navigate);
    }
    // Điều hướng về trang chủ ngầm để làm sạch URL và tải trang nền
    navigate("/", { replace: true });
  }, [deeplinkKey, deeplinkId, navigate]);

  return null;
};

export default DeepLinkHandler;
