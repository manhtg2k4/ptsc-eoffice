import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { CustomDialog } from "@components/CustomDialog";
import {
  // Box,
  Grid,
  Typography,
  // CircularProgress
} from "@mui/material";
import CustomInput from "@components/CustomInput/CustomInput";
import { FullWidthGridItem } from "@styles/FormList.styles";
import { HalfWidthGridItem } from "@styles/ThemeConfig.styles";
import {
  StyledContainerPopupSignDigital,
  // StyledLoadingPopupSignDigital,
  // StyledSignaturePhoto
} from "@styles/UploadFile/UploadFile.style";
import { useSelector } from "react-redux";
// import { getDataSignaturePhoto } from "@redux/slices/DigitalSignatureFileSlice/DigitalSignatureFileSlice";
// import { useToast } from "@components/common/ToastProvider";

/**
 * Popup xác nhận ký số
 * Nhập: password, reason, location
 */
const PopupSignDigital = ({
  open,
  onClose,
  onSave,
  isLoading,
  fileName,
  hidePasswordField = false,
  // signType,
  signKey,
  documentDetail,
}) => {
  // logger.log("signType", signType);
  // const dispatch = useDispatch();
  // const toast = useToast();
  const { dataUser } = useSelector((state) => state.auth);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("Ký số điện tử");
  const [location, setLocation] = useState("Việt Nam");
  const [keyWord, setKeyWord] = useState("");
  const [imagesBase, setImagesBase] = useState("");
  const [errors, setErrors] = useState({});

  const activeActionType = useMemo(() => {
    const actions = documentDetail?.availableActions || [];
    const actionTypes = new Set(actions.map((item) => item?.type));
    const actionPriority = [
      "stampDoc",
      "reportSigner",
      "signCopy",
      "signFormatDraft",
      "signContentDraft",
      "officialSigner1",
      "officialSigner2",
      "officialSigner3",
    ];
    return actionPriority.find((type) => actionTypes.has(type)) || null;
  }, [documentDetail?.availableActions]);

  const isSignFormat = activeActionType === "signFormatDraft" || activeActionType === "signContentDraft";

  useEffect(() => {
    if (!open) return;
    const fetchSignTypeDetails = async () => {
      let signImageId = null;

      if (activeActionType === "signFormatDraft" || activeActionType === "signContentDraft") {
        const isBackGroundImg = documentDetail?.signKey?.isBackground;
        signImageId = isBackGroundImg ? dataUser?.paraphSignImage : dataUser?.paraphSignTransparentImage;
      } else if (
        activeActionType === "reportSigner" ||
        activeActionType === "signCopy" ||
        activeActionType === "officialSigner1" ||
        activeActionType === "officialSigner2" ||
        activeActionType === "officialSigner3"
      ) {
        signImageId = dataUser?.contentSignImage || dataUser?.paraphSignTransparentImage;
      } else if (activeActionType === "stampDoc") {
        signImageId = dataUser?.stampSignImage;
      }

      if (signImageId) {
        const getFileId = (field) => {
          if (!field) return "";
          if (typeof field === "object") {
            return field._id || field.id || "";
          }
          return field;
        };
        setImagesBase(getFileId(signImageId));
      }

      /* Logic cũ call api lấy file ảnh chữ ký khi ký:
      try {
        let signImageIdTemp = null;

        if (activeActionType === "signFormatDraft" || activeActionType === "signContentDraft") {
          const isBackGroundImg = documentDetail?.signKey?.isBackground;
          signImageIdTemp = isBackGroundImg ? dataUser?.paraphSignImage : dataUser?.paraphSignTransparentImage;
        } else if (
          activeActionType === "reportSigner" ||
          activeActionType === "signCopy" ||
          activeActionType === "officialSigner1" ||
          activeActionType === "officialSigner2" ||
          activeActionType === "officialSigner3"
        ) {
          signImageIdTemp = dataUser?.contentSignImage;
        } else if (activeActionType === "stampDoc") {
          signImageIdTemp = dataUser?.stampSignImage;
        }

        if (!signImageIdTemp) return;

        const res = await dispatch(getDataSignaturePhoto(signImageIdTemp)).unwrap();

        // Convert Blob sang base64 string
        if (res instanceof Blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result || "";
            // Lấy phần base64 sau dấu phẩy (bỏ prefix "data:image/...;base64,")
            const commaIndex = String(result).indexOf(",");
            const base64 =
              commaIndex >= 0
                ? String(result).slice(commaIndex + 1)
                : String(result);
            setImagesBase(base64);
          };
          reader.readAsDataURL(res);
        } else if (typeof res === "string") {
          // Nếu đã là string thì dùng trực tiếp
          setImagesBase(res);
        }
      } catch (error) {
        toast("Lỗi khi lấy dữ liệu ảnh chữ ký số", "error");
        logger.error("Lỗi khi lấy dữ liệu ảnh chữ ký số:", error);
      }
      */
    };

    fetchSignTypeDetails();
  }, [
    open,
    activeActionType,
    dataUser,
    documentDetail,
    /*
    dispatch,
    dataUser?.contentSignImage,
    dataUser?.paraphSignImage,
    dataUser?.paraphSignTransparentImage,
    dataUser?.stampSignImage,
    toast,
    documentDetail?.signKey?.isBackground,
    */
  ]);

  // Reset values và lấy vị trí khi mở popup
  useEffect(() => {
    if (open) {
      setPassword("");
      setReason("Ký số điện tử");
      setKeyWord(signKey || "");
      setImagesBase("");
      setErrors({});

      // Lấy tọa độ hiện tại (không cần gọi API)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            // Format: "Việt Nam (Lat: X.XXXX, Long: Y.YYYY)"
            const locationStr = `Việt Nam (${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E)`;
            setLocation(locationStr);
          },
          (error) => {
            logger.log("Lỗi khi lấy vị trí:", error);
            setLocation("Việt Nam");
          }
        );
      } else {
        setLocation("Việt Nam");
      }
    }
  }, [open, signKey]);

  const validate = useCallback(() => {
    const newErrors = {};

    // Chỉ kiểm tra password khi không ẩn trường này
    if (!hidePasswordField) {
      if (!password || password.trim() === "") {
        newErrors.password = "Vui lòng nhập mật khẩu xác nhận";
      } else if (password.trim().length < 6 || password.trim().length > 16) {
        newErrors.password = "Mật khẩu phải từ 6 đến 16 ký tự";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [password, hidePasswordField]);

  const handleSave = useCallback(() => {
    if (validate()) {
      onSave({
        password: password.trim(),
        reason: reason.trim() || "Ký số điện tử",
        location: location.trim() || "Việt Nam",
        keyWord: keyWord.trim(),
        imagesBase,
      });
    }
  }, [validate, onSave, password, reason, location, keyWord, imagesBase]);

  const handlePasswordChange = useCallback(
    (e) => {
      setPassword(e.target.value);
      // Xóa lỗi khi user bắt đầu nhập
      if (errors.password) {
        setErrors({});
      }
    },
    [errors.password]
  );

  const handleReasonChange = useCallback((e) => {
    setReason(e.target.value);
  }, []);

  const handleLocationChange = useCallback((e) => {
    setLocation(e.target.value);
  }, []);

  const handleKeyWordChange = useCallback((e) => {
    setKeyWord(e.target.value);
  }, []);

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title="Xác nhận ký số"
      isLoading={isLoading}
      titleButton="Xác nhận ký"
      size="sm"
    >
      <StyledContainerPopupSignDigital>
        {/* {isLoading && (
          <StyledLoadingPopupSignDigital>
            <CircularProgress />
          </StyledLoadingPopupSignDigital>
        )} */}
        <Grid container spacing={2}>
          {fileName && (
            <FullWidthGridItem item>
              <Typography variant="body2">
                <strong>File:</strong> {fileName}
              </Typography>
            </FullWidthGridItem>
          )}

          {!hidePasswordField && (
            <FullWidthGridItem item>
              <CustomInput
                label="Mật khẩu xác nhận (End Entity)"
                type="password"
                placeholder="Nhập mật khẩu End Entity"
                value={password}
                onChange={handlePasswordChange}
                error={!!errors.password}
                helperText={errors.password}
                required
                autoFocus
                disabled={isLoading}
              />
            </FullWidthGridItem>
          )}
          {!isSignFormat && (
            <>
              <HalfWidthGridItem item>
                <CustomInput
                  label="KeyWord"
                  placeholder="Nhập từ khóa"
                  value={keyWord}
                  onChange={handleKeyWordChange}
                  disabled={isLoading}
                />
              </HalfWidthGridItem>
            </>
          )}
          {/* {!signType === "certificate" && (
            <>
              <HalfWidthGridItem item>
                <CustomInput
                  label="KeyWord"
                  placeholder="Nhập từ khóa"
                  value={keyWord}
                  onChange={handleKeyWordChange}
                  disabled={isLoading}
                />
              </HalfWidthGridItem>
            </>
          )} */}

          <HalfWidthGridItem item>
            <CustomInput
              label="Lý do ký"
              placeholder="VD: Ký số điện tử"
              value={reason}
              onChange={handleReasonChange}
              disabled={isLoading}
            />
          </HalfWidthGridItem>

          <HalfWidthGridItem item>
            <CustomInput
              label="Địa điểm"
              placeholder="VD: Việt Nam"
              value={location}
              onChange={handleLocationChange}
              disabled={isLoading}
            />
          </HalfWidthGridItem>
        </Grid>
      </StyledContainerPopupSignDigital>
    </CustomDialog>
  );
};

PopupSignDigital.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSave: PropTypes.func,
  isLoading: PropTypes.bool,
  fileName: PropTypes.string,
  hidePasswordField: PropTypes.bool,
  signType: PropTypes.string,
  signKey: PropTypes.string,
  documentDetail: PropTypes.object,
};

export default PopupSignDigital;
