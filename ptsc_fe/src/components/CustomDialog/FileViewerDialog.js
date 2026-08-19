import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { styled } from "@mui/system";
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  VerifiedUser as VerifiedUserIcon,
} from "@mui/icons-material";
import {
  StyledDialog,
  StyledDialogTitleViewFile,
  StyledDialogContent,
} from "@styles/CustomDialog.styles";
import SignatureDetailsPopup from "@components/UploadFile/components/SignatureDetailsPopup";

const SignatureIcon = styled(VerifiedUserIcon, {
  shouldForwardProp: (prop) => prop !== "istrusted",
})(({ theme, istrusted }) => ({
  color: istrusted ? theme.palette.success.main : theme.palette.warning.main,
}));

const StyledCloseIcon = styled(CloseIcon)(({ theme }) => ({
  color: theme.palette.dialog?.headerColor || "#ffffff",
  fontSize: 26,
}));

// Styled Zoom Icons
const StyledZoomInIcon = styled(ZoomInIcon)(({ theme }) => ({
  color: theme.palette.dialog?.headerColor || "#ffffff",
}));

const StyledZoomOutIcon = styled(ZoomOutIcon)(({ theme }) => ({
  color: theme.palette.dialog?.headerColor || "#ffffff",
}));

const StyledDownloadIcon = styled(DownloadIcon)(({ theme }) => ({
  color: theme.palette.dialog?.headerColor || "#ffffff",
}));

// Styled components
const StyledDialogContentBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
});

const StyledContentArea = styled(Box)({
  flex: 1,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "auto",
  backgroundColor: "#f5f5f5", // Thêm màu nền nhẹ để dễ nhìn biên file
});

const StyledImage = styled("img")(({ zoomlevel }) => ({
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  transform: `scale(${zoomlevel / 100})`,
  transition: "transform 0.2s ease",
  cursor: "zoom-in",
}));

const StyledIframe = styled("iframe")({
  width: "100%",
  height: "100%",
  border: "none",
  minHeight: "600px",
  backgroundColor: "#ffffff", // Iframe nền trắng cho dễ đọc text/excel
});

// --- THÊM STYLED VIDEO ---
const StyledVideo = styled("video")({
  maxWidth: "100%",
  maxHeight: "100%",
  outline: "none",
});

const StyledTitleBox = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

const StyledTypographyTitle = styled(Typography)(({ theme }) => ({
  flex: 1,
  color: theme.palette.dialog?.headerColor || "#ffffff",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  marginRight: theme.spacing(2),
}));

const StyledActionIcons = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
}));

const StyledLoadingBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
});

const StyledZoomLabel = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  paddingLeft: "8px",
  paddingRight: "8px",
  minWidth: "50px",
  color: theme.palette.dialog?.headerColor || "#ffffff",
}));

const StyledErrorBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
  textAlign: "center",
});

/**
 * Chuyển đổi PDF string/data thành blob URL
 */
const convertPdfDataToUrl = (pdfData) => {
  try {
    if (!pdfData) return null;
    if (pdfData.startsWith("blob:")) return pdfData;
    if (pdfData.startsWith("data:application/pdf;base64,")) return pdfData;
    if (/^[A-Za-z0-9+/=]+$/.test(pdfData)) {
      const binaryString = atob(pdfData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    }
    if (pdfData.startsWith("%PDF")) {
      const bytes = new Uint8Array(pdfData.length);
      for (let i = 0; i < pdfData.length; i++) {
        bytes[i] = pdfData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    }
    if (pdfData.startsWith("http://") || pdfData.startsWith("https://")) {
      return pdfData;
    }
    return pdfData;
  } catch (error) {
    return null;
  }
};

/**
 * Chuyển đổi image data string thành src URL
 */
const convertImageDataToUrl = (imageData) => {
  try {
    if (!imageData) return null;
    if (imageData.startsWith("blob:")) return imageData;
    if (imageData.startsWith("data:image/")) return imageData;
    if (/^[A-Za-z0-9+/=]+$/.test(imageData)) {
      return `data:image/png;base64,${imageData}`;
    }
    if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
      return imageData;
    }
    return imageData;
  } catch (error) {
    return null;
  }
};

const FileViewerDialog = ({
  open,
  onClose,
  fileUrl,
  fileName,
  fileType,
  title,
  size = "lg",
  showDownloadButton = true,
  onDownload,
  showZoomControls = true,
  isheight,
  verificationResult = null,
  showSignatureIcon = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [detectedFileType, setDetectedFileType] = useState(fileType);
  const [processedFileUrl, setProcessedFileUrl] = useState(fileUrl);
  const [sigAnchorEl, setSigAnchorEl] = useState(null);

  const handleOpenSigDetails = (event) => {
    setSigAnchorEl(event.currentTarget);
  };

  const handleCloseSigDetails = () => {
    setSigAnchorEl(null);
  };

  const openSigDetails = Boolean(sigAnchorEl);

  // Detect file type và xử lý dữ liệu file
  useEffect(() => {
    if (!fileUrl) {
      setDetectedFileType(null);
      setProcessedFileUrl(null);
      return;
    }

    // 1. Nếu được cung cấp loại file tường minh (Ưu tiên)
    if (fileType) {
      setDetectedFileType(fileType);
      if (fileType === "pdf") {
        setProcessedFileUrl(convertPdfDataToUrl(fileUrl));
      } else if (fileType === "image") {
        setProcessedFileUrl(convertImageDataToUrl(fileUrl));
      } else {
        // html, txt, video dùng trực tiếp URL
        setProcessedFileUrl(fileUrl);
      }
      return;
    }

    // 2. Auto-detect (Fallback nếu không truyền fileType)
    const urlLower = fileUrl.toLowerCase();
    const nameLower = fileName ? fileName.toLowerCase() : "";
    let detectedType = "image"; // Mặc định

    if (nameLower.endsWith(".pdf") || fileUrl.includes("application/pdf")) {
      detectedType = "pdf";
      setProcessedFileUrl(convertPdfDataToUrl(fileUrl));
    } else if (
      nameLower.endsWith(".html") ||
      nameLower.endsWith(".htm") ||
      fileUrl.includes("text/html")
    ) {
      detectedType = "html";
      setProcessedFileUrl(fileUrl);
    } else if (nameLower.endsWith(".txt") || fileUrl.includes("text/plain")) {
      detectedType = "txt";
      setProcessedFileUrl(fileUrl);
    } else if (
      nameLower.match(/\.(mp4|webm|ogg|mov|mkv|avi)$/) ||
      fileUrl.includes("video/")
    ) {
      detectedType = "video";
      setProcessedFileUrl(fileUrl);
    } else if (
      urlLower.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/) ||
      fileUrl.includes("data:image/") ||
      nameLower.match(/\.(jpg|jpeg|png|gif|webp)$/)
    ) {
      detectedType = "image";
      setProcessedFileUrl(convertImageDataToUrl(fileUrl));
    } else {
      detectedType = "image";
      setProcessedFileUrl(convertImageDataToUrl(fileUrl));
    }

    setDetectedFileType(detectedType);
  }, [fileUrl, fileType, fileName]);

  useEffect(() => {
    if (open) {
      setZoomLevel(100);
      setError(null);
    }
  }, [open, fileUrl]);

  const handleZoomIn = useCallback(
    () => setZoomLevel((prev) => Math.min(prev + 10, 200)),
    []
  );
  const handleZoomOut = useCallback(
    () => setZoomLevel((prev) => Math.max(prev - 10, 50)),
    []
  );

  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload(fileUrl, fileName);
    } else {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName || "file";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [fileUrl, fileName, onDownload]);

  const handleImageError = useCallback(
    () => setError("Không thể xem trước file."),
    []
  );
  const handlePdfLoadError = useCallback(
    () => setError("Không thể tải file PDF."),
    []
  );
  const handleLoadError = useCallback(
    () => setError("Không thể tải file."),
    []
  );
  const handleLoadSuccess = useCallback(() => setLoading(false), []);

  const dialogTitle = title || fileName || "Xem File";

  // Group các loại file dùng iframe (bao gồm cả PDF)
  const isIframeType = ["pdf", "html", "txt", "doc", "excel", "ppt"].includes(
    detectedFileType
  );

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      dialogSize={size}
      fullWidth
      isheight={isheight}
      TransitionComponent={null}
      TransitionProps={{ timeout: 0 }}
      disablePortal
    >
      <StyledDialogTitleViewFile>
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

            {showSignatureIcon && verificationResult && fileName?.toLowerCase().endsWith(".pdf") && (
              <Tooltip title="Kiểm tra chữ ký số">
                <IconButton size="small" onClick={handleOpenSigDetails}>
                  <SignatureIcon istrusted={verificationResult?.overallStatus?.isTrusted ? 1 : 0} />
                </IconButton>
              </Tooltip>
            )}

            <IconButton onClick={onClose} size="small">
              <StyledCloseIcon />
            </IconButton>
          </StyledActionIcons>
        </StyledTitleBox>
      </StyledDialogTitleViewFile>

      <StyledDialogContent>
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
                <Typography variant="body2" >
                  {error}
                </Typography>
                {processedFileUrl && showDownloadButton && (
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
                {/* 1. IFRAME GROUP (PDF, HTML, TXT) */}
                {isIframeType && (
                  <StyledIframe
                    src={!showDownloadButton && detectedFileType === "pdf" ? (processedFileUrl.includes("#") ? `${processedFileUrl}&toolbar=0` : `${processedFileUrl}#toolbar=0`) : processedFileUrl}
                    title={fileName}
                    onError={
                      detectedFileType === "pdf"
                        ? handlePdfLoadError
                        : handleLoadError
                    }
                    onLoad={handleLoadSuccess}
                  />
                )}

                {/* 2. IMAGE GROUP */}
                {detectedFileType === "image" && (
                  <StyledImage
                    src={processedFileUrl}
                    alt={fileName}
                    onError={handleImageError}
                    onLoad={handleLoadSuccess}
                    zoomlevel={zoomLevel}
                  />
                )}

                {/* 3. VIDEO GROUP (Thêm mới) */}
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

            {!processedFileUrl && (
              <Typography variant="body2">Không có file để hiển thị</Typography>
            )}
          </StyledContentArea>
        </StyledDialogContentBox>
      </StyledDialogContent>
      <SignatureDetailsPopup
        open={openSigDetails}
        anchorEl={sigAnchorEl}
        onClose={handleCloseSigDetails}
        result={verificationResult}
      />
    </StyledDialog>
  );
};

FileViewerDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  fileUrl: PropTypes.string,
  fileName: PropTypes.string,
  fileType: PropTypes.string,
  title: PropTypes.string,
  size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
  showDownloadButton: PropTypes.bool,
  onDownload: PropTypes.func,
  showZoomControls: PropTypes.bool,
  isheight: PropTypes.string,
  verificationResult: PropTypes.object,
  showSignatureIcon: PropTypes.bool,
};

FileViewerDialog.defaultProps = {
  fileUrl: null,
  fileName: "File",
  fileType: null,
  title: null,
  size: "lg",
  showDownloadButton: true,
  onDownload: null,
  showZoomControls: true,
  showSignatureIcon: false,
};

export default FileViewerDialog;
