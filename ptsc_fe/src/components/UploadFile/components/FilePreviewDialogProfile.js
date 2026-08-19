import React from "react";
import PropTypes from "prop-types";
import {
    Dialog,
    Typography,
    Box,
    IconButton,
    Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
    Close as CloseIcon,
    Download as DownloadIcon
} from "@mui/icons-material";
import moveToInboxIcon from "@assets/icons/moveToInboxIcon.svg";
// --- STYLED COMPONENTS ---

// 1. Dialog
// Loại bỏ prop maxWidth={false}, thay vào đó ta ép kiểu bằng CSS
const StyledDialog = styled(Dialog)(({ theme }) => ({
    "& .MuiDialog-paper": {
        width: "100%",
        // !important để ghi đè mặc định 'sm' của MUI khi không dùng prop maxWidth={false}
        maxWidth: "1200px !important",
        height: "90vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: "8px",
        overflow: "hidden",
        margin: theme.spacing(2), // Giữ khoảng cách lề trên mobile
    },
}));

// 2. Header Wrapper
const DialogHeader = styled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.primary?.main || "#1976d2",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    flexShrink: 0,
}));

// 3. Title
const StyledDialogTitle = styled(Typography)({
    fontWeight: 700,
    fontSize: "1rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginRight: "16px",
});

// 4. Wrapper cho các nút actions (Thay thế cho Box display="flex")
const HeaderActions = styled(Box)(({ theme }) => ({
    display: "flex",
    gap: theme.spacing(1), // Sử dụng theme spacing (thường là 8px)
}));

// 5. Button (Xử lý cả fontSize của icon bên trong)
const StyledIconBtn = styled(IconButton)({
    color: "#ffffff",
    "&:hover": {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    // Target trực tiếp vào icon bên trong để chỉnh size
    // Thay thế cho việc truyền fontSize="small" vào từng icon
    "& .MuiSvgIcon-root": {
        fontSize: "1.25rem", // Tương đương fontSize="small" của MUI
    },
});

// 6. Content Container
const ContentContainer = styled(Box)({
    flex: 1,
    backgroundColor: "#e0e0e0",
    position: "relative",
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
});

// 7. Preview Elements
const PreviewImage = styled('img')({
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
});

const PreviewIframe = styled('iframe')({
    border: "none",
    backgroundColor: "#fff",
    width: "100%",
    height: "100%",
});
const MoveToInboxIcon = styled("img")({
    width: 20,
    height: 20,
    color: "#000",
});
// --- MAIN COMPONENT ---

const FilePreviewDialogProfile = ({ open, onClose, fileName, url, hiddenDownload = false, downloadWatermark = false }) => {

    const handleDownload = () => {
        if (!url) return;
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadWatermark = () => {
        if (!url) return;
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderPreviewContent = () => {
        if (!url) return <Typography>Không có dữ liệu hiển thị</Typography>;

        const isImage = /\.(jpeg|jpg|png|gif|bmp|webp)$/i.test(fileName || "");
        const isIframeFriendly = /\.(pdf|txt|html|doc|docx|xls|xlsx|ppt|pptx)$/i.test(fileName || "");

        // Chỉ thêm #toolbar=0 cho các loại file sẽ hiển thị trong iframe
        const finalUrl = isIframeFriendly ? `${url}#toolbar=0` : url;

        if (isImage) {
            return <PreviewImage src={finalUrl} alt="Preview" />;
        }

        return <PreviewIframe src={finalUrl} title="File Preview" allow="fullscreen" />;
    };

    return (
        <StyledDialog
            open={open}
            onClose={onClose}
            scroll="paper"
        // Đã loại bỏ maxWidth={false} để tránh lỗi lint
        >
            <DialogHeader>
                <StyledDialogTitle variant="subtitle1" title={fileName}>
                    {fileName || "Xem tài liệu"}
                </StyledDialogTitle>

                {/* Sử dụng component HeaderActions thay vì Box với prop display */}
                <HeaderActions>
                    {!hiddenDownload && <Tooltip title="Tải xuống">
                        {/* size="small" là prop hợp lệ của IconButton, nhưng nếu lint bắt nốt thì bỏ size và chỉnh CSS padding */}
                        <StyledIconBtn size="small" onClick={handleDownload}>
                            {/* Không truyền fontSize="small" nữa */}
                            <DownloadIcon />
                        </StyledIconBtn>
                    </Tooltip>}
                    {downloadWatermark && <Tooltip title="Tải xuống bản sao có watermark">
                        <StyledIconBtn size="small" onClick={handleDownloadWatermark}>
                            <MoveToInboxIcon src={moveToInboxIcon} />
                        </StyledIconBtn>
                    </Tooltip>}

                    <Tooltip title="Đóng">
                        <StyledIconBtn size="small" onClick={onClose}>
                            <CloseIcon />
                        </StyledIconBtn>
                    </Tooltip>
                </HeaderActions>
            </DialogHeader>

            <ContentContainer>
                {renderPreviewContent()}
            </ContentContainer>
        </StyledDialog>
    );
};

FilePreviewDialogProfile.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    fileName: PropTypes.string,
    url: PropTypes.string,
    hiddenDownload: PropTypes.bool,
    downloadWatermark: PropTypes.bool,
};

export default FilePreviewDialogProfile;