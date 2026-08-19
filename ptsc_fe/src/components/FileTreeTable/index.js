/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Box,
  IconButton,
  Table,
  TableContainer,
  Paper,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DescriptionIcon from "@mui/icons-material/Description";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import InsertLinkIcon from '@mui/icons-material/InsertLink';

import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";
import { useToast } from "@components/common/ToastProvider";
import { API_DOWNLOAD_FILE_ALL_ZIP, APP_BASE, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import LoadingDialog from "@components/LoadingDialog";
import { AttachFile, Person } from "@mui/icons-material";
import { SkyGrid, SkyTableBody, SkyTableCell, SkyTableHead, SkyTableRow, SkyTooltip } from "@styles/SkyStyles";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import * as XLSX from "xlsx";

const LinkIconSvg = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.3791 9.23464L9.54561 15.0681C8.69938 15.9007 7.55844 16.3651 6.37133 16.3603C5.18421 16.3555 4.04709 15.8818 3.20767 15.0423C2.36824 14.2029 1.89452 13.0658 1.88969 11.8787C1.88485 10.6916 2.3493 9.55062 3.18186 8.70439L9.01536 2.87089C9.29394 2.59231 9.62467 2.37132 9.98866 2.22055C10.3526 2.06979 10.7428 1.99219 11.1367 1.99219C11.5307 1.99219 11.9208 2.06979 12.2848 2.22055C12.6488 2.37132 12.9795 2.59231 13.2581 2.87089C13.5367 3.14947 13.7577 3.4802 13.9084 3.84418C14.0592 4.20817 14.1368 4.59829 14.1368 4.99226C14.1368 5.38624 14.0592 5.77636 13.9084 6.14034C13.7577 6.50433 13.5367 6.83506 13.2581 7.11364L7.42461 12.9471C7.14325 13.2285 6.76164 13.3866 6.36374 13.3866C5.96583 13.3866 5.58422 13.2285 5.30286 12.9471C5.0215 12.6658 4.86343 12.2842 4.86343 11.8863C4.86343 11.4884 5.0215 11.1068 5.30286 10.8254L10.6061 5.52289" stroke="#0062AD" strokeWidth="2" strokeLinecap="square" />
  </svg>
);


const StyledFolderIcon = styled(FolderIcon)(({ theme }) => ({
  color: "#FFA500",
  fontSize: "1.2rem",
  marginRight: theme.spacing(1),
}));

const StyledFolderOpenIcon = styled(FolderOpenIcon)(({ theme }) => ({
  color: "#FFA500",
  fontSize: "1.2rem",
  marginRight: theme.spacing(1),
}));

const StyledFileIcon = styled(DescriptionIcon)(({ theme }) => ({
  color: "#1b8ae4",
  fontSize: "1rem",
  marginRight: theme.spacing(1),
}));

const StyledLinkIcon = styled(InsertLinkIcon)(({ theme }) => ({
  color: "#1b8ae4",
  fontSize: "1.2rem",
  marginRight: theme.spacing(1),
}));

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  padding: 4,
  color: theme.palette.primary.main,
}));

const StyledTableContainer = styled(TableContainer)(() => ({
  maxHeight: 400,
  overflow: 'auto',
  // border: '1px solid #e0e0e0',
  borderRadius: '4px',
}));

const StyledTableCell = styled(SkyTableCell)(({ widt }) => ({
  width: widt,
  whiteSpace: 'nowrap',
}));

const StyledSourceType = styled(SkyGrid)(() => ({
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  whiteSpace: 'nowrap',
}));

const VerticalLine = styled(Box)(() => ({
  position: 'absolute',
  left: '60px',
  top: 0,
  bottom: 0,
  borderLeft: '2px solid #e0e0e0',
}));

const RowContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'depth' && prop !== 'isFolder',
})(({ depth, isFolder }) => ({
  display: 'flex',
  alignItems: 'center',
  flexGrow: 1,
  paddingTop: isFolder ? '16px' : '20px',
  paddingBottom: isFolder ? '16px' : '20px',
  marginLeft: depth > 0 ? '60px' : 0,
  paddingLeft: depth > 0 ? '12px' : 0,
  // borderBottom: '1px solid #f0f0f0',
}));

const StyledSkyTableRow = styled(SkyTableRow, {
  shouldForwardProp: (prop) => prop !== 'isLink',
})(({ isLink }) => ({
  backgroundColor: '#ffffff !important',
  '&:nth-of-type(odd)': { backgroundColor: '#ffffff !important' },
  '&:nth-of-type(even)': { backgroundColor: '#ffffff !important' },
  '&:hover': { bgcolor: '#f0f4ff !important' },
  cursor: isLink ? 'pointer' : 'default',
  '& td, & th': {
    borderBottom: '1px solid #f0f0f0 !important',
  },
}));

const NoBorderTableCell = styled(SkyTableCell)(() => ({
  padding: 0,
  borderBottom: 'none',
}));

const SmallIconButton = styled(IconButton)(() => ({
  padding: 0,
  marginRight: 8,
  color: '#1a1a1a',
}));

const HeaderTableCell = styled(StyledTableCell)(() => ({
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #f0f0f0 !important',
}));

const StickyHeaderTableCell = styled(HeaderTableCell)(() => ({
  position: 'sticky',
  right: 0,
  zIndex: 3,
  backgroundColor: '#ffffff !important',
  // borderLeft: '1px solid #f0f0f0 !important',
}));

const StickyBodyTableCell = styled(SkyTableCell)(() => ({
  position: 'sticky',
  right: 0,
  zIndex: 1,
  backgroundColor: '#ffffff !important',
  // borderLeft: '1px solid #f0f0f0 !important',
  // 'tr:hover &': {
  //   backgroundColor: '#f0f4ff !important',
  // },
}));

// Module-level handlers — không dùng state/props nên không cần useCallback
const handleFileNameMouseEnter = (e) => {
  e.currentTarget.style.textDecoration = 'underline';
};
const handleFileNameMouseLeave = (e) => {
  e.currentTarget.style.textDecoration = 'none';
};

const FileTreeTable = ({
  data = [],
  onFileMenuClick,
  MenuIcon: CustomMenuIcon,
  isView = false,
  fileName,
  sourceAsync,
  emptyMessage = "Chưa có tài liệu nào",
  showStt = false,
  disableHeader = false,
  hideActionColumn = false,
  // hideActionTitle = false,
  showUploader = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const toast = useToast();

  // --- Preview state ---
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const buildTreeStructure = useCallback((items) => {
    if (!items || items.length === 0) return [];
    const itemMap = {};
    const rootItems = [];

    // Step 1: Map all nodes under both id and public_id
    items.forEach((item) => {
      const id = item.id || item._id;
      const node = { ...item, children: [] };
      if (id) {
        itemMap[id] = node;
      }
      if (item.public_id) {
        itemMap[item.public_id] = node;
      }
    });

    // Step 2: Build the tree structure by linking parent-child relationships
    items.forEach((item) => {
      const id = item.id || item._id;
      const node = id ? itemMap[id] : (item.public_id ? itemMap[item.public_id] : null);
      if (!node) return;

      const parentId = item.parent_id;
      const parentNode = parentId ? itemMap[parentId] : null;

      if (parentNode) {
        // Prevent duplicate child entries if already pushed
        const alreadyExists = parentNode.children.some(
          (child) => (child.id || child._id) === (node.id || node._id)
        );
        if (!alreadyExists) {
          parentNode.children.push(node);
        }
      } else {
        // Prevent duplicate root entries
        const alreadyExists = rootItems.some(
          (root) => (root.id || root._id) === (node.id || node._id)
        );
        if (!alreadyExists) {
          rootItems.push(node);
        }
      }
    });

    return rootItems;
  }, []);

  const treeData = useMemo(() => {
    return buildTreeStructure(data);
  }, [data, buildTreeStructure]);

  const handleToggle = useCallback((e) => {
    const itemId = e.currentTarget.getAttribute('data-node-id');
    if (itemId) {
      setExpandedItems((prev) => ({
        ...prev,
        [itemId]: !prev[itemId],
      }));
    }
  }, []);

  const handleFileMenuClick = useCallback((e) => {
    e.stopPropagation();
    if (onFileMenuClick) {
      onFileMenuClick(e);
    }
  }, [onFileMenuClick]);

  const handleLinkClick = useCallback((e) => {
    const url = e.currentTarget.getAttribute('data-url');
    if (url) window.open(url, "_blank");
  }, []);

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleDownload = useCallback(async () => {
    setIsLoading(true);
    try {
      const ids = data
        .filter(item => item.parent_id === null)
        .map(item => item.id);
      const body = { ids: ids };
      const response = await axiosInstance.post(API_DOWNLOAD_FILE_ALL_ZIP, body, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([response], { type: 'application/zip' })
      );
      const link = document.createElement('a');
      link.href = url;
      const downloadName = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      logger.log('error', error);
      toast(error?.response?.data?.message || "Tải xuống tất cả thất bại!", "error");
    }
  }, [data, fileName, toast]);

  // --- Preview handlers ---
  const handleClosePreview = useCallback(() => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewOpen(false);
    setPreviewUrl(null);
    setPreviewFileName("");
  }, [previewUrl]);

  const handlePreview = useCallback(
    async (file) => {
      const name = file.file_name || file.name || file.fileName || "file";
      const lower = name.toLowerCase();

      const isDoc = /\.(doc|docx)$/i.test(lower);
      const isExcel = /\.(xls|xlsx)$/i.test(lower);
      const isPpt = /\.(ppt|pptx)$/i.test(lower);
      const isOtherOffice = isPpt;
      const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

      // --- CASE 1: File chưa upload ---
      // convertFilesToTreeData lưu File object vào property "file" (không phải "rawFile")
      // UploadFile.processUploadFiles lưu File object vào property "rawFile"
      // Cần check cả 2 case
      const rawFileObj = file.file instanceof File ? file.file
        : file.rawFile instanceof File ? file.rawFile
        : null;

      const isTempId = typeof (file.id || file._id) === "string"
        && String(file.id || file._id).startsWith("temp_");

      // File chưa upload: temp id (từ convertFilesToTreeData) HOẶC _id/id là null/undefined (từ UploadFile manualUpload)
      const isUnuploadedFile = rawFileObj && (isTempId || (!file._id && !file.id));

      if (isUnuploadedFile) {
        setIsPreviewLoading(true);
        try {
          if (isDoc || isExcel) {
            const formData = new FormData();
            formData.append("file", rawFileObj);
            const urlEndpoint = isDoc
              ? `${APP_BASE}/api/file-to-pdf`
              : API_XLSX_TO_PDF;
            const response = await api.post(urlEndpoint, formData, {
              responseType: "blob",
              timeout: 0,
            });
            const pdfBlob = new Blob([response.data], { type: "application/pdf" });
            setPreviewUrl(URL.createObjectURL(pdfBlob));
            setPreviewFileName(name);
            setPreviewOpen(true);
            return;
          }
          if (isOtherOffice) {
            const arrayBuffer = await rawFileObj.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const htmlString = XLSX.utils.sheet_to_html(
              workbook.Sheets[workbook.SheetNames[0]]
            );
            const htmlBlob = new Blob([htmlString], { type: "text/html" });
            setPreviewUrl(URL.createObjectURL(htmlBlob));
            setPreviewFileName(name);
            setPreviewOpen(true);
            return;
          }
          if (isBrowserFile) {
            // Dùng lại blob URL sẵn có trong file.path nếu có, hoặc tạo mới
            const blobUrl = (file.path && file.path.startsWith("blob:"))
              ? file.path
              : URL.createObjectURL(rawFileObj);
            setPreviewUrl(blobUrl);
            setPreviewFileName(name);
            setPreviewOpen(true);
            return;
          }
          toast("Định dạng không hỗ trợ xem trước khi chưa lưu.", "warning");
        } catch (e) {
          const status = e?.response?.status || e?.status;
          if (status === 403) {
            toast("Bạn không có quyền xem tài liệu này.", "error");
          } else {
            toast("Không thể xem trước file này.", "error");
          }
        } finally {
          setIsPreviewLoading(false);
        }
        return;
      }

      // --- CASE 2: File đã có ID thực trên server ---
      const fileId = file.id || file._id;
      if (!fileId || isUnuploadedFile) {
        toast("Không xác định được ID file để xem trước.", "error");
        return;
      }

      setIsPreviewLoading(true);
      try {
        let blob;
        let previewName = name;

        if (isDoc) {
          const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
          const res = await api.get(conversionApi, { responseType: "blob", timeout: 0 });
          blob = new Blob([res.data], { type: "application/pdf" });
        } else if (isExcel) {
          const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
          const fileRes = await api.get(downloadUrl, { responseType: "blob", timeout: 0 });
          const formData = new FormData();
          formData.append("file", new File([fileRes.data], name));
          formData.append("fileId", fileId);
          const res = await api.post(API_XLSX_TO_PDF, formData, { responseType: "blob", timeout: 0 });
          blob = new Blob([res.data], { type: "application/pdf" });
        } else if (isBrowserFile) {
          const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
          const res = await api.get(viewUrl, { responseType: "blob", timeout: 100000 });
          blob = new Blob([res.data], { type: res.headers["content-type"] || res.data.type });
        } else if (isOtherOffice) {
          const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
          const res = await api.get(viewUrl, { responseType: "blob", timeout: 100000 });
          const arrayBuffer = await res.data.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const html = XLSX.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[0]]);
          blob = new Blob([html], { type: "text/html" });
        } else {
          toast("Định dạng file không được hỗ trợ xem trước.", "warning");
          return;
        }

        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewFileName(previewName);
        setPreviewOpen(true);
      } catch (e) {
        const status = e?.response?.status || e?.status;
        if (status === 403) {
          toast("Bạn không có quyền xem tài liệu này.", "error");
        } else {
          toast("Không thể xem trước tài liệu.", "error");
        }
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [toast]
  );

  // Stable handler cho click tên file — đọc node qua data-node-id, tránh inline closure
  const handleFileNameClick = useCallback((e) => {
    e.stopPropagation();
    const nodeId = e.currentTarget.getAttribute('data-node-id');
    if (!nodeId) return;
    const flatNode = data.find((item) => String(item.id || item._id) === nodeId);
    if (flatNode) handlePreview(flatNode);
  }, [data, handlePreview]);

  const renderTreeRows = useCallback(
    (nodes, depth = 0, state = { index: 0 }) => {
      return nodes.flatMap((node) => {
        state.index += 1;
        const currentIndex = state.index;
        const nodeId = node.id || node._id;
        const isFolder = node.is_directory === 1 || node.type_file === "Thư mục";
        const fileName = node.file_name || node.name;
        const fromSource = node.from_source;
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedItems[nodeId] && isFolder;
        const sourceType = node.source_type;

        const rows = [
          <StyledSkyTableRow
            key={nodeId}
            isLink={node.type_file === 'link'}
            onClick={node.type_file === 'link' ? handleLinkClick : undefined}
            data-url={node.link || node.documentUrl}
          >
            {showStt && (
              <StyledTableCell align="center" widt="50px">
                {currentIndex}
              </StyledTableCell>
            )}
            <NoBorderTableCell>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                {/* Vertical Line for children */}
                {depth > 0 && (
                  <VerticalLine />
                )}

                {/* Content Row with borderBottom starting from line */}
                <RowContent depth={depth} isFolder={isFolder}>
                  {/* Chevron */}
                  {isFolder && hasChildren ? (
                    <SmallIconButton
                      size="small"
                      data-node-id={nodeId}
                      onClick={handleToggle}
                    >
                      {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                    </SmallIconButton>
                  ) : (
                    <div style={{ width: 24, marginRight: 8 }} />
                  )}

                  {/* Icon */}
                  {isFolder ? (
                    isExpanded ? <StyledFolderOpenIcon /> : <StyledFolderIcon />
                  ) : node.type_file === 'link' ? (
                    <StyledLinkIcon />
                  ) : (
                    <StyledFileIcon />
                  )}

                  {/* Text */}
                  {node.type_file === 'link' ? (
                    <a
                      href={node.link || node.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                      onClick={handleStopPropagation}
                    >
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 400,
                          color: '#1b8ae4',
                        }}
                      >
                        {fileName || node.documentName}
                      </span>
                    </a>
                  ) : isFolder ? (
                    <span style={{ fontSize: '0.875rem' }}>
                      {fileName}
                    </span>
                  ) : (
                    <span
                      data-node-id={String(nodeId)}
                      style={{
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        color: '#1b8ae4',
                        textDecoration: 'none',
                      }}
                      onClick={handleFileNameClick}
                      onMouseEnter={handleFileNameMouseEnter}
                      onMouseLeave={handleFileNameMouseLeave}
                    >
                      {fileName}
                    </span>
                  )}
                </RowContent>
              </div>
            </NoBorderTableCell>

            {sourceAsync && (
              <SkyTableCell>
                <StyledSourceType>
                  {sourceType === 'person' ? <Person /> : (sourceType === 'link' || node.type_file === 'link' ? <LinkIconSvg /> : <AttachFile />)}
                  {fromSource}
                </StyledSourceType>
              </SkyTableCell>
            )}

            {showUploader && (
              <SkyTableCell>
                {node.type_file === 'link' ? node.createdByName : node.created_by_name}
              </SkyTableCell>
            )}

            {!hideActionColumn && (
              <StickyBodyTableCell align="center">
                {CustomMenuIcon && !node.hideMenu && (
                  <IconButton
                    size="small"
                    data-file-id={nodeId}
                    data-is-folder={isFolder ? "1" : "0"}
                    onClick={handleFileMenuClick}
                  >
                    <CustomMenuIcon />
                  </IconButton>
                )}
              </StickyBodyTableCell>
            )}
          </StyledSkyTableRow>
        ];

        if (isExpanded && hasChildren) {
          rows.push(...renderTreeRows(node.children, depth + 1, state));
        }

        return rows;
      });
    },
    [expandedItems, handleToggle, handleFileMenuClick, handleFileNameClick, CustomMenuIcon, sourceAsync, showStt, showUploader]
  );

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 16, color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <StyledTableContainer component={Paper} elevation={0}>
        <Table size="small" stickyHeader>
          {!disableHeader && (
            <SkyTableHead>
              <SkyTableRow>
                {showStt && (
                  <HeaderTableCell align="center" widt="10%">
                    <strong>STT</strong>
                  </HeaderTableCell>
                )}
                <HeaderTableCell widt="70%">
                  <strong>TÊN TÀI LIỆU</strong>
                </HeaderTableCell>
                {sourceAsync && (
                  <HeaderTableCell>
                    <strong>NGUỒN TẢI</strong>
                  </HeaderTableCell>
                )}
                {showUploader && (
                  <HeaderTableCell>
                    <strong>NGƯỜI TẢI</strong>
                  </HeaderTableCell>
                )}
                {!hideActionColumn && (
                  <StickyHeaderTableCell align="center" widt="10%">
                    {/* {!hideActionTitle && <strong>HÀNH ĐỘNG</strong>} */}
                    {isView && (
                      <StyledIconButton size="small" onClick={handleDownload}>
                        <SkyTooltip title="Tải xuống tất cả tài liệu">
                          <FileDownloadOutlinedIcon />
                        </SkyTooltip>
                      </StyledIconButton>
                    )}
                  </StickyHeaderTableCell>
                )}
              </SkyTableRow>
            </SkyTableHead>
          )}
          <SkyTableBody>{renderTreeRows(treeData, 0, { index: 0 })}</SkyTableBody>
        </Table>
      </StyledTableContainer>
      <LoadingDialog open={isLoading || isPreviewLoading}>
        {isPreviewLoading ? "Đang tải file xem trước..." : "Đang tải tài liệu, vui lòng đợi..."}
      </LoadingDialog>
      <FilePreviewDialog
        open={previewOpen}
        onClose={handleClosePreview}
        fileName={previewFileName}
        url={previewUrl}
      />
    </>
  );
};

/* eslint-disable camelcase */
FileTreeTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      file_name: PropTypes.string,
      name: PropTypes.string,
      type_file: PropTypes.string,
      is_directory: PropTypes.number,
      parent_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
  onFileMenuClick: PropTypes.func,
  MenuIcon: PropTypes.elementType,
  emptyMessage: PropTypes.string,
  columnNameLabel: PropTypes.string,
  columnSourceLabel: PropTypes.string,
  showStt: PropTypes.bool,
  hideActionColumn: PropTypes.bool,
  showUploader: PropTypes.bool,
};


export default FileTreeTable;

