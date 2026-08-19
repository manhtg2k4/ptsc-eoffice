import React, { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import {
  Collapse,
  Box,
  CircularProgress,
} from "@mui/material";
import {
  KeyboardArrowDown,
  KeyboardArrowRight,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import styled from "styled-components";

// --- IMPORTS HỆ THỐNG ---
import { APP_BASE, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import { useToast } from "@components/common/ToastProvider";
import { useDispatch, useSelector } from "react-redux";
import { verifyPdfSignature } from "@redux/slices/DigitalSignatureFileSlice/DigitalSignatureFileSlice";

// --- IMPORT SOCKET ---
// Đảm bảo đường dẫn này đúng với cấu trúc dự án của bạn
// import getSocketGetFile from "@utils/socketFileUpdate/socket";

// --- IMPORT COMPONENTS ---
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import FileTableInPopup from "@components/UploadFile/components/FileTableInPopup";

// --- STYLED COMPONENTS ---
import {
  TableContainer,
  SectionTitle, 
} from "./DraftSection.styles";
import { SectionGrid } from "./AddDialog.style";

// =============================
//  Styled Components
// =============================

// Overlay Loading
const LoadingOverlay = styled(Box)(() => ({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.3)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

// Wrapper table scroll
const ScrollWrapper = styled(Box)(() => ({
  width: "100%",
  maxWidth: "100%",
  overflowX: "auto",
  marginTop: "4px",
  display: "block",

  "&::-webkit-scrollbar": {
    height: "6px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: "4px",
  },
}));

// Header
const StyledTableHeaderRoot = styled("div")(() => ({
  display: "flex",
  alignItems: "center",
  padding: "10px",
  cursor: "pointer",
  borderBottom: "1px solid #e0e0e0",
}));

const StyledTableHeaderTitle = styled("span")(() => ({
  fontSize: "14px",
  fontWeight: 500,
  marginLeft: "8px",
}));

const Wrapper = styled(Box)({
  width: "100%",
});

// Helper Component cho Header (Đưa ra ngoài để tránh re-render)
function StyledTableHeader({ open, onToggle, title }) {
  const handleClick = () => onToggle((p) => !p);

  return (
    <StyledTableHeaderRoot onClick={handleClick}>
      {open ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
      <StyledTableHeaderTitle>{title}</StyledTableHeaderTitle>
    </StyledTableHeaderRoot>
  );
}

// =============================
//  Main Component
// =============================
function DraftVersionTable({ 
  title, 
  reload, 
  fetchApi, 
  // Nhận thêm props để kết nối socket
  // objectId, 
	// objectType,
	setIsOpen,
	hiddenTitle = false,
	hiddenToggleIcon = false,
  showSignatureIcon = false,
	noneBorder = false,
  hiddenPreview = false,
}) {
  const dispatch = useDispatch();
  const { verificationResult } = useSelector((state) => state.digitalSignatureFile);
  const toast = useToast();
  const [open, setOpen] = useState(hiddenToggleIcon ? true : false);
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // State cho Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");

  const downloadRef = useRef(null);

  // ================================ LOGIC HANDLERS =================================
  const handleDownload = useCallback(
    async (file) => {
      if (!file) {
        toast("Không có file để tải!", "error");
        return;
      }
      setIsLoading(true);
      const fileName = file.fileName || file.name || file.file_name || "download";
      
      const ext = fileName.split(".").pop()?.toLowerCase();
      const imageExt = ["jpg", "jpeg", "png", "gif", "webp"];
      const docExt = ["doc", "docx"];
      const excelExt = ["xls", "xlsx"];
      const pptExt = ["ppt", "pptx"];
      const pdfExt = ["pdf"];
      const txtExt = ["txt"];

      try {
        let blob;
        if (file.rawFile instanceof File) {
          blob = file.rawFile;
        } 
        else if (file._id || file.id) {
          const downloadUrl = `${APP_BASE}/api/files/download/${file._id || file.id}`;
          const res = await api.get(downloadUrl, { responseType: "blob", timeout: 0 });
          
          if (excelExt.includes(ext)) {
            blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          } else if (docExt.includes(ext)) {
            blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
          } else if ([...imageExt, ...pdfExt, ...txtExt].includes(ext)) {
            blob = new Blob([res.data], { type: res.data.type });
          } else if (pptExt.includes(ext)) {
            blob = res.data;
          } else {
            blob = new Blob([res.data], { type: res.data.type || "application/octet-stream" });
          }
        } else {
          toast("File không có dữ liệu để tải!", "error");
          setIsLoading(false);
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;

        const container = downloadRef.current || document.body;
        container.appendChild(link);
        link.click();

        if (container.contains(link)) {
          container.removeChild(link);
        }

        window.URL.revokeObjectURL(objectUrl);

      } catch (error) {
        toast("Không thể tải file!", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const handlePreview = useCallback(
    async (file) => {
      const fileName = file.fileName || file.name || file.file_name || "file";
      const lower = fileName.toLowerCase();

      const isDoc = /\.(doc|docx)$/i.test(lower);
      const isExcel = /\.(xls|xlsx)$/i.test(lower);
      const isPpt = /\.(ppt|pptx)$/i.test(lower);
      const isOtherOffice = isPpt;
      const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

      if (file.rawFile instanceof File && !file._id) {
        setIsLoading(true);
        try {
          if (isDoc || isExcel) {
            const formData = new FormData();
            formData.append("file", file.rawFile);

            let urlEndpoint;
            if (isDoc) {
              urlEndpoint = `${APP_BASE}/api/file-to-pdf`;
            } else {
              urlEndpoint = API_XLSX_TO_PDF;
            }

            const response = await api.post(urlEndpoint, formData, { responseType: "blob", timeout: 0 });
            const pdfBlob = new Blob([response.data], { type: "application/pdf" });
            setPreviewUrl(URL.createObjectURL(pdfBlob));
            setPreviewFileName(fileName);
            setPreviewOpen(true);
            return;
          }
          if (isOtherOffice) {
            const arrayBuffer = await file.rawFile.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const htmlString = XLSX.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[0]]);
            const htmlBlob = new Blob([htmlString], { type: "text/html" });
            setPreviewUrl(URL.createObjectURL(htmlBlob));
            setPreviewFileName(fileName);
            setPreviewOpen(true);
            return;
          }
          if (isBrowserFile) {
            const blobUrl = URL.createObjectURL(file.rawFile);
            setPreviewUrl(blobUrl);
            setPreviewFileName(fileName);
            setPreviewOpen(true);
            return;
          }
          toast("Định dạng không hỗ trợ xem trước khi chưa lưu.", "warning");
        } catch (e) {
          toast("Không thể xem trước file này.", "error");
        } finally {
          setIsLoading(false);
        }
        return;
      }

      if (file._id || file.id) {
        setIsLoading(true);
        const fileId = file._id || file.id;

        try {
          let blob;
          let previewName = fileName;

          if (isDoc) {
            const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
            const res = await api.get(conversionApi, { responseType: "blob", timeout: 0 });
            blob = new Blob([res.data], { type: "application/pdf" });
            previewName = fileName;
          } else if (isExcel) {
             // 1. Download file from server
            const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
            const fileRes = await api.get(downloadUrl, {
              responseType: "blob",
              timeout: 0,
            });

            // 2. Convert to PDF using new API
            const formData = new FormData();
            formData.append("file", new File([fileRes.data], fileName));

            const res = await api.post(API_XLSX_TO_PDF, formData, {
              responseType: "blob",
              timeout: 0,
            });

            blob = new Blob([res.data], { type: "application/pdf" });
            previewName = fileName;
          } else if (isBrowserFile) {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const res = await api.get(viewUrl, { responseType: "blob", timeout: 0 });
            blob = new Blob([res.data], { type: res.headers["content-type"] || res.data.type });
          } else if (isOtherOffice) {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const res = await api.get(viewUrl, { responseType: "blob", timeout: 0 });
            const arrayBuffer = await res.data.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const html = XLSX.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[0]]);
            blob = new Blob([html], { type: "text/html" });
            previewName = fileName;
          } else {
            throw new Error("Định dạng file không được hỗ trợ xem trước.");
          }

          // Gọi API xác thực chữ ký số nếu là file PDF
          if (lower.endsWith(".pdf")) {
            dispatch(verifyPdfSignature(fileId));
          }

          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setPreviewFileName(previewName);
          setPreviewOpen(true);
        } catch (e) {
          toast("Không thể xem trước tài liệu.", "error");
        } finally {
          setIsLoading(false);
        }
        return;
      }
      toast("Không xác định được nguồn file để xem trước.", "error");
    },
    [toast]
  );

  const handleClosePreview = () => {
    setPreviewOpen(false);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };


  // ================================ LOAD DATA =================================
    // SỬA ĐOẠN NÀY: Dùng useCallback chuẩn
  const loadData = useCallback(async () => {
    if (!fetchApi) return;
    
    setIsLoading(true);
    try {
      const data = await fetchApi();
      const listData = data?.data || []; // Lấy data an toàn
      
      // So sánh nhẹ để tránh set state nếu dữ liệu không đổi (Optional nhưng tốt cho hiệu năng)
      setVersions(prev => {
         if (JSON.stringify(prev) === JSON.stringify(listData)) return prev;
         return listData;
      });

      // Logic mở panel khi có dữ liệu
      if (listData.length > 0) {
        setOpen(true);
        // Kiểm tra xem setIsOpen có tồn tại không trước khi gọi
        if (setIsOpen) {
           setIsOpen((prev) => ({
             ...prev,
             draftVersion: true,
           }));
        }
      }
    } catch (e) {
      setVersions([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchApi, setIsOpen]); // Dependency là fetchApi (đã được bọc useCallback ở cha)

  // useEffect chỉ chạy khi 'reload' thay đổi hoặc 'fetchApi' thay đổi
  useEffect(() => {
    loadData();
  }, [loadData, reload]); 
  // 2. Mở panel khi có dữ liệu
  useEffect(() => {
		if (versions.length > 0) {
			setOpen(true);
			setIsOpen((prev) => ({
      ...prev,
      draftVersion: true,
    }));
    }
  }, [versions,setOpen, setIsOpen]);

  // // 3. --- REALTIME SOCKET INTEGRATION ---
  // useEffect(() => {
  //   // Chỉ kết nối nếu có objectId và objectType
  //   if (!objectId || !objectType) return;

  //   const socket = getSocketGetFile({ objectId, objectType });
    
  //   const handleFileUpdated = (payload) => {
  //     // Log kiểm tra (có thể bỏ comment nếu cần)
  //     logger.log("Realtime: fileUpdateSuccess", payload);
      
  //     // Gọi lại API để làm mới danh sách
  //     loadData();
  //   };

  //   // Lắng nghe sự kiện
  //   socket.on("fileUpdateSuccess", handleFileUpdated);

  //   // Dọn dẹp listener khi component unmount
  //   return () => {
  //     socket.off("fileUpdateSuccess", handleFileUpdated);
  //   };
  // }, [objectId, objectType]); // Dependencies

  // ================================ CONFIG COLUMNS =================================
  const extraColumns = [
    {
      header: "Người chỉnh sửa",
      width: "150px",
      render: (file) => <span>{file.created_by || "-"}</span>,
    },
    {
      header: "Ngày chỉnh sửa",
      width: "150px",
      render: (file) => (
        <span>
          {file.updated_at
        ? new Date(file.updated_at).toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "-"}
        </span>
      ),
    },
  ];

  // ================================ RENDER =================================

  // TRƯỜNG HỢP KHÔNG CÓ DỮ LIỆU
  if (!isLoading && (!versions || versions.length === 0)) {
    return (
      <Box>
        <div ref={downloadRef} style={{ display: "none" }} />
        {!hiddenTitle && (
          <SectionGrid item xs={12}>
            <SectionTitle>{title}</SectionTitle>
          </SectionGrid>
        )}
      </Box>
    );
  }

  // TRƯỜNG HỢP CÓ DỮ LIỆU
  return (
    <Wrapper>
      <div ref={downloadRef} style={{ display: "none" }} />

      {isLoading && (
        <LoadingOverlay>
          <CircularProgress />
        </LoadingOverlay>
      )}

      <TableContainer noneBorder={noneBorder}>
        {!hiddenToggleIcon && (
          <StyledTableHeader
            open={open}
            onToggle={setOpen}
            title={title || "Danh sách phiên bản"}
          />
        )}

        <Collapse in={open}>
          <ScrollWrapper>
            <FileTableInPopup
              files={versions}
              onPreview={handlePreview}
              onDownload={handleDownload}
              isView
              canNotDeleteFile
              editFile={false}
              extraColumns={extraColumns}
              hiddenPreview={hiddenPreview}
            />
          </ScrollWrapper>
        </Collapse>
      </TableContainer>

      <FilePreviewDialog
        open={previewOpen}
        onClose={handleClosePreview}
        fileName={previewFileName}
        url={previewUrl}
        verificationResult={verificationResult}
        showSignatureIcon={showSignatureIcon}
      />
    </Wrapper>
  );
}

DraftVersionTable.propTypes = {
  title: PropTypes.string,
  reload: PropTypes.any,
  fetchApi: PropTypes.func.isRequired,
  // Thêm props type cho socket
  objectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  objectType: PropTypes.string,
  hiddenTitle: PropTypes.bool,
  hiddenToggleIcon: PropTypes.bool,
  showSignatureIcon: PropTypes.bool,
  hiddenPreview: PropTypes.bool,
};

export default DraftVersionTable;