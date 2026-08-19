// ViewFileBase64.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  CircularProgress,
  Typography,
  Button,
  Tooltip,
  IconButton,
} from "@mui/material";

import {
  StyledDialogTitle,
} from "@styles/CustomDialog.styles";
import {
  StyledActionIcons,
  StyledCloseIcon,
  StyledContentArea,
  StyledDialogContentBox,
  StyledDownloadIcon,
  StyledErrorBox,
  StyledIframe,
  StyledImage,
  StyledLoadingBox,
  StyledTitleBox,
  StyledTypographyTitle,
  StyledVideo,
  StyledZoomInIcon,
  StyledZoomLabel,
  StyledZoomOutIcon,
} from "@styles/UploadFile/UploadFile.style";
import { CustomDialog } from "@components/CustomDialog";

const ViewFileBase64 = ({
  open,
  onClose,
  base64String,
  fileName = "file.pdf",
  mimeType,
  title,
  size = "lg",
  showDownloadButton = true,
  showZoomControls = true,
}) => {
  const [processedFileUrl, setProcessedFileUrl] = useState(null);
  const [detectedFileType, setDetectedFileType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Hàm chuyển Base64 → Blob URL (ổn định 100% cho PDF)
  const base64ToBlobUrl = useCallback((base64, type) => {
    if (!base64) return null;
    try {
      const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
      const byteCharacters = atob(cleanBase64);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = Array.from(slice, (char) => char.charCodeAt(0));
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      const blob = new Blob(byteArrays, { type });
      return URL.createObjectURL(blob);
    } catch (err) {
      logger.error("Base64 decode error:", err);
      return null;
    }
  }, []);

  // Xử lý khi mở dialog hoặc thay đổi base64
  useEffect(() => {
    if (!open || !base64String) {
      setProcessedFileUrl(null);
      setDetectedFileType(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setZoomLevel(100);

    // 1. Detect MIME type
    const lowerName = fileName.toLowerCase();
    let type = mimeType;
    let detected = "other";

    if (!type) {
      if (lowerName.endsWith(".pdf")) type = "application/pdf";
      else if (/\.(jpe?g|png|gif|webp|bmp)$/i.test(lowerName)) type = "image";
      else if (/\.(mp4|webm|ogg|mov)$/i.test(lowerName)) type = "video/mp4";
      else type = "application/pdf";
    }

    if (type === "application/pdf") detected = "pdf";
    else if (type.includes("image/")) detected = "image";
    else if (type.includes("video/")) detected = "video";
    else detected = "pdf";

    setDetectedFileType(detected);

    // 2. Tạo Blob URL
    const blobUrl = base64ToBlobUrl(base64String, type || "application/pdf");
    if (!blobUrl) {
      setError("Không thể đọc dữ liệu file");
      setLoading(false);
      return;
    }

    setProcessedFileUrl(blobUrl);
    setLoading(false);

    // Cleanup khi đóng hoặc đổi file
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [open, base64String, fileName, mimeType, base64ToBlobUrl]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 20, 50));

  const handleDownload = () => {
    if (!processedFileUrl) return;
    const a = document.createElement("a");
    a.href = processedFileUrl;
    a.download = fileName || "download";
    a.click();
  };

  const handlePdfLoadError = () => setError("Không thể tải file PDF.");
  const handleImageError = () => setError("Không thể tải hình ảnh.");
  const handleLoadError = () => setError("Không thể tải file.");
  const handleLoadSuccess = () => setLoading(false);

  const isIframeType = ["pdf", "html", "txt"].includes(detectedFileType);
  const dialogTitle = title || fileName || "Xem trước file";

  return (
    <CustomDialog
      // <CustomDialog
      open={open}
      onClose={onClose}
      dialogSize={size}
      fullWidth
      TransitionComponent={null}
      TransitionProps={{ timeout: 0 }}
      disablePortal
      disableSave
      size="lg"
      customTitleContent={
        <StyledDialogTitle>
          <StyledTitleBox>
            <Tooltip title={dialogTitle} placement="bottom-start">
              <StyledTypographyTitle variant="h6">
                {dialogTitle}
              </StyledTypographyTitle>
            </Tooltip>
            <StyledActionIcons>
              {detectedFileType === "image" && showZoomControls && (
                <>
                  <Tooltip title="Thu nhỏ">
                    <IconButton
                      size="small"
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 50}
                    >
                      <StyledZoomOutIcon />
                    </IconButton>
                  </Tooltip>
                  <StyledZoomLabel variant="caption">
                    {zoomLevel}%
                  </StyledZoomLabel>
                  <Tooltip title="Phóng to">
                    <IconButton
                      size="small"
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 200}
                    >
                      <StyledZoomInIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              {showDownloadButton && processedFileUrl && (
                <Tooltip title="Tải xuống file">
                  <IconButton size="small" onClick={handleDownload}>
                    <StyledDownloadIcon />
                  </IconButton>
                </Tooltip>
              )}

              <IconButton onClick={onClose} size="small">
                <StyledCloseIcon />
              </IconButton>
            </StyledActionIcons>
          </StyledTitleBox>
        </StyledDialogTitle>
      }
    >
      <StyledDialogContentBox>
        <StyledContentArea>
          {loading && (
            <StyledLoadingBox>
              <CircularProgress />
              <Typography>Đang tải file...</Typography>
            </StyledLoadingBox>
          )}

          {error && (
            <StyledErrorBox>
              <Typography variant="body2">{error}</Typography>
              {processedFileUrl && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleDownload}
                >
                  Tải xuống file
                </Button>
              )}
            </StyledErrorBox>
          )}

          {!loading && !error && processedFileUrl && (
            <>
              {/* PDF, HTML, TXT */}
              {isIframeType && (
                <StyledIframe
                  src={processedFileUrl}
                  title={fileName}
                  onError={
                    detectedFileType === "pdf"
                      ? handlePdfLoadError
                      : handleLoadError
                  }
                  onLoad={handleLoadSuccess}
                />
              )}

              {/* Ảnh */}
              {detectedFileType === "image" && (
                <StyledImage
                  src={processedFileUrl}
                  alt={fileName}
                  onError={handleImageError}
                  onLoad={handleLoadSuccess}
                  zoomlevel={zoomLevel}
                />
              )}

              {/* Video */}
              {detectedFileType === "video" && (
                <StyledVideo
                  controls
                  autoPlay={false}
                  src={processedFileUrl}
                  onError={handleLoadError}
                  onLoadedData={handleLoadSuccess}
                >
                  Trình duyệt không hỗ trợ thẻ video.
                </StyledVideo>
              )}
            </>
          )}

          {!processedFileUrl && !loading && (
            <Typography variant="body2">Không có file để hiển thị</Typography>
          )}
        </StyledContentArea>
      </StyledDialogContentBox>
    </CustomDialog>
  );
};

export default ViewFileBase64;
