// src/pages/BookDocumentDetails.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import withSharedComponents from "@components/WrapperComponent";
import {
  Grid,
  Checkbox,
  CircularProgress,
  IconButton,
  Collapse,
  useMediaQuery,
  Box,
  Typography,
  Popper,
  MenuItem,
  styled,
} from "@mui/material";
import api from "@services/api";
import {
  API_BOOK_DOCUMENT_DETAIL,
  APP_BASE,
  API_GET_VIEW_CONFIG,
} from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import {
  DetailsContainer,
  LoadingContainer,
  CheckboxGridItem,
  StyledCheckboxLabel,
  TableTitle,
  TableWrapper,
  ContainerBoxInput,
  SectionBox,
} from "./BookDocumentDetails.styles";

import {
	ExpandMore as ExpandMoreIcon,
	ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
// import { StyledAttachFileIcon } from "@builder-popup/components/Input/FileUpload.styles";
import { CustomDialog } from "@components/CustomDialog";
import FileViewerDialog from "@components/CustomDialog/FileViewerDialog";
import ViewDialog from "@pages/TextAway/Tab/SigningSubmissionTab/ViewDialog";
import ViewIncommingDoc from "@pages/IncomingDocumentManagement/components/ViewIncommingDoc";
import StatusBadge from "./StatusBadge";
import { StyledBackdrop, StyledLoadingStack } from "@styles/UploadFile/UploadFile.style";
import { StyledCircularProgress } from "@styles/AutocompletepPro.styles";
import withFormWrapper from "@components/common/FormWrapper";
// import { Controller } from "react-hook-form";
const FileIconButton = styled(IconButton)({});
const FileCountTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginLeft: theme.spacing(0.5),
}));
const FilePopoverContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0.5, 0),
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius,
  maxHeight: 200,
  overflowY: 'auto', 
}));
const PopperStyled = styled(Popper)(()=>({
  zIndex: 1400
}));
const BoxStyleds = styled(Box)(() => ({
  display: 'inline-flex', alignItems: 'center'
}));
const StyledAttachFileIcon = styled(InsertDriveFileIcon)(({ theme }) => ({
  fontSize: theme.typography.pxToRem(20),
  color: theme.palette.text.primary,
}));


const BookDocumentDetails = ({
  sharedComponents,
  open,
  onClose,
  bookDocumentId,
  dialogKey
}) => {
  // sharedComponents chứa các component như BaseSwipper, Input, Button,...
	const {
		BaseSwipper,
		Input:BaseInput,
		TableNotification
	} = sharedComponents;

	const isView = true;
	const Input = useMemo(() => {
		const Wrapped = withFormWrapper(BaseInput, "input");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView}/>;
		Component.displayName = "Input";
		return Component;
	}, [BaseInput, isView]);
	

  const toast = useToast();
	const isSmallScreen = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const [tableData, setTableData] = useState([]); // State để lưu dữ liệu của bảng
  const [details, setDetails] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reloadTable, setReloadTable] = useState(0);
    // State cho modal chi tiết văn bản đến
	const [openViewIncomingDoc, setOpenViewIncomingDoc] = useState(false);
	const [openViewOutgoingDoc, setOpenViewOutgoingDoc] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });

  const handleCloseViewIncomingDoc = useCallback(() => {
    setOpenViewIncomingDoc(false);
  }, []);
	const handleCloseViewOutgoingDoc = useCallback(() => {
		setOpenViewOutgoingDoc(false);
	}, []);

  // State cho popover file
  const [filePopoverAnchorEl, setFilePopoverAnchorEl] = useState(null);
  const [currentFiles, setCurrentFiles] = useState([]);
  const filePopoverTimeoutRef = useRef(null); // Sử dụng useRef để quản lý timeout

  const [showInputs, setShowInputs] = useState(true);

  const handleToggleInputs = useCallback(() => {
    setShowInputs((prev) => !prev);
  }, []);
  // Cấu hình cột cho sổ văn bản đến
  // Cấu hình cột cho sổ văn bản đến
const [columns] = useState([
  {
    name: "Tệp đính kèm",
    row: "files",
    isShow: true,
    width: "120px",
    accessor: (row) => {
      const files = row.files || row.files_list || []; // Fallback for files
      if (Array.isArray(files) && files.length > 0) {
        return (
          <BoxStyleds>
            <FileIconButton
              size="small"
              onMouseEnter={createFileIconMouseEnterHandler(files)}
              onMouseLeave={handleCloseFilePopoverWithDelay}
            >
              <StyledAttachFileIcon />
            </FileIconButton>
            {files.length > 1 && (
              <FileCountTypography variant="caption">
                ({files.length})
              </FileCountTypography>
            )}
          </BoxStyleds>
        );
      }
      return null;
    },
  },
  { 
    name: "Sổ Văn bản đến", 
    row: "bookDocumentId", 
    isShow: true, 
    width: "150px",
    accessor: (row) => {
      // Nếu có tên sổ thì hiển thị, không thì hiển thị ID
      return row.bookDocumentName || row.book_document_name || row.bookDocumentId || row.book_document_id;
    }
  },
  { 
    name: "Ngày văn bản", 
    row: "documentDate", 
    isShow: true, 
    width: "150px",
    accessor: (row) => row.documentDate || row.document_date
  },
  { 
    name: "Số văn bản", 
    row: "toBook", 
    isShow: true, 
    width: "250px",
    accessor: (row) => row.toBook || row.to_book
  },
  { 
    name: "Cơ quan gửi", 
    row: "senderUnit", 
    isShow: true, 
    width: "200px",
    accessor: (row) => row.senderUnit || row.sender_unit
  },
  {
    name: "Số đến",
    row: "toBookCode",
    isShow: true,
    width: "120px",
    accessor: (row) => {
      return row.toBookCode || row.to_book_code;
    },
  },
  {
    name: "Trạng thái",
    row: "statusCode",
    isShow: true,
    width: "150px",
    accessor: (row) => {
      // Hỗ trợ nhiều tên trường có thể có
      const statusValue = row.statusCode || row.status_code || "";
      return <StatusBadge value={statusValue} />;
    },
  },
]);
  // Cấu hình cột cho sổ văn bản đi
const [columnsOut] = useState([
  {
    name: "Số, ký hiệu văn bản",
    row: "releaseNo",
    isShow: true,
    width: "200px",
    accessor: (row) => row.releaseNo || row.release_no
  },
  { 
    name: "Trích yếu", 
    row: "abstractNote", 
    isShow: true, 
    width: "300px",
    accessor: (row) => row.abstractNote || row.abstract_note
  },
  {
    name: "Loại văn bản",
    row: "documentType",
    isShow: true,
    width: "150px",
    accessor: (row) => row.documentType || row.document_type
  },
  { 
    name: "Độ khẩn", 
    row: "urgencyLevel", 
    isShow: true, 
    width: "120px",
    accessor: (row) => row.urgencyLevel || row.urgency_level
  },
  {
    name: "File đính kèm",
    row: "files",
    isShow: true,
    width: "120px",
    accessor: (row) => {
      const files = row.files || row.files_list || [];
      if (Array.isArray(files) && files.length > 0) {
        return (
          <BoxStyleds>
            <FileIconButton
              size="small"
              onMouseEnter={createFileIconMouseEnterHandler(files)}
              onMouseLeave={handleCloseFilePopoverWithDelay}
            >
              <StyledAttachFileIcon />
            </FileIconButton>
            {files.length > 1 && (
              <FileCountTypography variant="caption">
                ({files.length})
              </FileCountTypography>
            )}
          </BoxStyleds>
        );
      }
      return null;
    },
  },
  { 
    name: "Người ký phát hành", 
    row: "reportSigner", 
    isShow: true, 
    width: "180px",
    accessor: (row) => row.reportSigner || row.report_signer
  },
  { 
    name: "Ngày soạn thảo", 
    row: "createdAt", 
    isShow: true, 
    width: "150px",
    accessor: (row) => row.createdAt || row.created_at
  },
  {
    name: "Trạng thái",
    row: "statusCode",
    isShow: true,
    width: "150px",
    accessor: (row) => {
      // Hỗ trợ nhiều tên trường có thể có
      const statusValue = row.statusCode || row.status_code || row.status || row.activeStatus || row.active_status || "–";
      return <StatusBadge value={statusValue} />;
    },
  },
  { 
    name: "Người soạn thảo", 
    row: "drafter", 
    isShow: true, 
    width: "150px" 
  },
]);

  // Chọn cấu hình cột phù hợp dựa trên dialogKey
  const activeColumns = useMemo(() => {
    if (dialogKey === 'bookDocumentDetailsOut') {
      return columnsOut;
    }
    return columns;
  }, [dialogKey, columns, columnsOut]);

  // Logic xử lý popover file
  const handleFileIconMouseEnter = useCallback(
    (event, files) => {
      if (filePopoverTimeoutRef.current) {
        clearTimeout(filePopoverTimeoutRef.current);
      }
      setFilePopoverAnchorEl(event.currentTarget);
      setCurrentFiles(files);
    },
    []
  );

  const handleCloseFilePopoverWithDelay = useCallback(() => {
    filePopoverTimeoutRef.current = setTimeout(() => {
      setFilePopoverAnchorEl(null);
    }, 200);
  }, []);

  const handlePopoverMouseEnter = useCallback(() => {
    if (filePopoverTimeoutRef.current) {
      clearTimeout(filePopoverTimeoutRef.current);
    }
  }, []);

  const handlePreview = useCallback(async (file) => {
  if (!file || !file.fileId) {
    toast("Tài liệu không có file đính kèm hoặc ID không hợp lệ.", "warning");
    return;
  }

  setIsLoading(true);
  try {
    const fileName = file.fileName || "Tài liệu";
    const lower = fileName.toLowerCase();
    const fileExtension = fileName.split(".").pop().toLowerCase();
    
    // Logic xác định loại file
    const isDoc = /\.(doc|docx)$/i.test(lower);
    const isExcel = /\.(xls|xlsx)$/i.test(lower);
    const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|bmp)$/i.test(lower);

    let objectUrl;
    let fileType = null;

    if (isDoc) {
      const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${file.fileId}`;
      const res = await api.get(conversionApi, { responseType: "blob", timeout: 0 });
      objectUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      fileType = "pdf";
    } else if (isExcel) {
      const fileRes = await api.get(`${APP_BASE}/api/files/download/${file.fileId}`, { responseType: "blob" });
      const formData = new FormData();
      formData.append("file", new File([fileRes.data], fileName));
      const res = await api.post(`${APP_BASE}/api/xlsx-to-pdf`, formData, { responseType: "blob", timeout: 0 });
      objectUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      fileType = "pdf";
    } else {
      const res = await api.get(`${APP_BASE}/api/files/view/${file.fileId}`, { responseType: "blob" });
      objectUrl = URL.createObjectURL(res.data);
      fileType = isBrowserFile ? (fileExtension === "pdf" ? "pdf" : "image") : null;
    }

    setViewingFile({ open: true, url: objectUrl, name: fileName, type: fileType });
  } catch (error) {
    toast("Không thể tải file để xem trước.", "error");
  } finally {
    setIsLoading(false);
  }
  }, [toast]);

  const handleFileClick = useCallback((file) => () => {
    handlePreview(file); 
    setFilePopoverAnchorEl(null); 
  }, [handlePreview]);

  const openFilePopper = Boolean(filePopoverAnchorEl);
  const handleCloseFileViewer = useCallback(() => {
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, []);

  // Hàm tạo event handler cho onMouseEnter của icon file
  const createFileIconMouseEnterHandler = useCallback(
    (files) => (e) => {
      handleFileIconMouseEnter(e, files);
    },
    [handleFileIconMouseEnter]
  );
  // Mở modal chi tiết văn bản đến
  const handleViewDetails = useCallback((row) => {
		const documentId = row.documentId || row.document_id;
		if (documentId) {
			setSelectedDocumentId(documentId);
			// Kiểm tra dialogKey để quyết định mở dialog nào
			if (dialogKey === "bookDocumentDetailsOut") {
				setOpenViewOutgoingDoc(true);
			} else {
				setOpenViewIncomingDoc(true);
			}
		} else {
			toast("Không tìm thấy ID văn bản để xem chi tiết.", "warning");
		}
	}, [toast, dialogKey]);

  // Cấu hình các trường cho bộ lọc tìm kiếm
  const [filterOptions] = useState([
    { name: "Trích yếu", code: "abstractNote" },
    { name: "Số đến", code: "toBookCode" },
  ]);
  const [advancedFilterOptions, setAdvancedFilterOptions] = useState([]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data: res } = await api.get(`${API_GET_VIEW_CONFIG}/find-by-code/SoVB`);
        if (res && res.field) {
          setAdvancedFilterOptions(res.field);
        }
      } catch (error) {
        // console.error("Lỗi khi tải cấu hình Bộ thuộc tính", error);
      }
    };
    fetchConfig();
  }, []);

  const fetchDataForTable = useCallback(
    async ({ page, limit, query, code, sort, ...rest }) => {
      if (!details) {
        return { data: [], total: 0 };
      }

      try {
        let listDocsUrl = "";
        const typeDoc = details.typeDocument || details.type_document || "";

        if (
          typeDoc.toLowerCase().includes("incomming") ||
          typeDoc.toLowerCase().includes("đến")
        ) {
          listDocsUrl = `${APP_BASE}/api/book-documents/${bookDocumentId}/incomming-documents`;
        } else if (
          typeDoc.toLowerCase().includes("outgoing") ||
          typeDoc.toLowerCase().includes("đi")
        ) {
          listDocsUrl = `${APP_BASE}/api/book-documents/${bookDocumentId}/outgoing_documents`;
        }

        if (!listDocsUrl) return { data: [], total: 0 };

        const params = {
          page,
          limit,
        };

        // Bổ sung tất cả các trường nâng cao (ví dụ: các field từ Bộ lọc nâng cao)
        Object.entries(rest).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== "") {
            params[key] = value;
          }
        });

        // Sửa lại logic để gửi đúng định dạng param cho API
        // Thay vì gửi { query: 'abc', code: 'field' }, sẽ gửi { field: 'abc' }
        if (query && Array.isArray(code) && code.length > 0) {
          code.forEach((c) => {
            params[c] = query;
          });
        }

        // Xử lý tham số sort
        if (sort) {
          try {
            const sortObject = JSON.parse(sort);
            // Gộp đối tượng sort vào params
            Object.assign(params, { sort: sortObject });
          } catch (e) {
            logger.error("Lỗi khi phân tích tham số sort:", e);
          }
        }

        const response = await api.get(listDocsUrl, { params });
        const items = response.data?.items || [];
        const formattedItems = items.map((item) => ({
          ...item,
          id: item._id || item.id || crypto.randomUUID(), // Đảm bảo mỗi dòng có một ID duy nhất
        }));
        setTableData(formattedItems); // Lưu dữ liệu vào state
        return {
          data: formattedItems,
          total: response.data?.total || 0,
        };
      } catch (error) {
        toast("Không thể tải danh sách văn bản.", "error");
        return { data: [], total: 0 };
      }
    },
    [details, bookDocumentId, toast]
  );

  const handleExportAll = useCallback(
    async (params) => {
      if (!details) return null;

      try {
        let exportUrl = "";
        const typeDoc = details.typeDocument || details.type_document || "";

        if (
          typeDoc.toLowerCase().includes("incomming") ||
          typeDoc.toLowerCase().includes("đến")
        ) {
          exportUrl = `${APP_BASE}/api/book-documents/${bookDocumentId}/incomming-documents/export`;
        } else if (
          typeDoc.toLowerCase().includes("outgoing") ||
          typeDoc.toLowerCase().includes("đi")
        ) {
          exportUrl = `${APP_BASE}/api/book-documents/${bookDocumentId}/outgoing_documents/export`;
        }

        if (!exportUrl) return null;

        const response = await api.get(exportUrl, {
          params: {
            ...params,
          },
          responseType: "blob",
        });

        return response.data;
      } catch (error) {
        toast("Có lỗi xảy ra khi xuất file.", "error");
        return null;
      }
    },
    [details, bookDocumentId, toast]
  );

  const fetchDetails = useCallback(async () => {
    if (open && bookDocumentId) {
      try {
        // 1. Lấy chi tiết sổ văn bản
        const detailUrl = API_BOOK_DOCUMENT_DETAIL(bookDocumentId);
        const detailRes = await api.get(detailUrl);
        const bookData = detailRes.data || {};

        // Lưu dữ liệu chi tiết vào state riêng
        setDetails({
          ...bookData,
        });
        setReloadTable((prev) => prev + 1);
      } catch (error) {
        toast("Không thể tải dữ liệu chi tiết sổ văn bản.", "error");
        logger.error("Lỗi khi tải chi tiết sổ văn bản:", error);
      }
    } else if (!open) {
      // Reset state khi đóng dialog
      setDetails(null);
    }
  }, [open, bookDocumentId, toast]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleDelete = (selectedRowIds) => {
    const documentIdsToDelete = tableData
      .filter(row => selectedRowIds.includes(row.id))
      .map(row => row.documentId || row.document_id)
      .filter(Boolean);

    if (documentIdsToDelete.length === 0) {
      toast("Xóa không thành công!.", "warning");
      return;
    };

    setSelectedIds(documentIdsToDelete);
    setOpenDeleteDialog(true);
  };
  const handleConfirmDelete = async () => {
    try {
      // API endpoint để xóa văn bản theo thông tin bạn cung cấp
      const deleteUrl = `${APP_BASE}/api/documents/update-status`;
      await api.delete(deleteUrl, { data: { ids: selectedIds } });

      toast("Xóa văn bản khỏi sổ thành công!", "success");
      setOpenDeleteDialog(false);
      setSelectedIds([]);
      // Cập nhật trực tiếp state tableData để giao diện cập nhật ngay lập tức
      setTableData((prevData) =>
        prevData.filter((item) => !selectedIds.includes(item.documentId || item.document_id))
      );

      // setReloadTable((prev) => prev + 1); // Trigger để tải lại bảng (có thể không cần)

      // Nếu bạn vẫn muốn sử dụng refreshTrigger, hãy giữ lại dòng này
      setReloadTable((prev) => prev + 1);
    } catch (error) {
      toast("Có lỗi xảy ra khi xóa văn bản.", "error");
      logger.error("Lỗi khi xóa văn bản khỏi sổ:", error);
      setOpenDeleteDialog(false);
    }
  };

  const handleCloseDeleteDialog = useCallback(() => {
    setOpenDeleteDialog(false);
  }, []);

  if (!open || !details) {
    return (
      <BaseSwipper
        title="Thông tin chi tiết sổ văn bản"
        open={open}
        onClose={onClose}
      >
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      </BaseSwipper>
    );
	}

  return (
    <BaseSwipper
      title="Thông tin chi tiết sổ văn bản"
      open={open}
      onClose={onClose}
    >
      <DetailsContainer>
        {/* ... (phần code còn lại không đổi) ... */}
        <ContainerBoxInput isSmallScreen={isSmallScreen}>
          <IconButton onClick={handleToggleInputs} size="small">
            {showInputs ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </ContainerBoxInput>
        <SectionBox>
      <Collapse in={showInputs}>
        <Grid container spacing={2}>
             <Grid item xs={12} sm={6} md={4}>
            <Input
              label="Đơn vị"
              name="senderUnit"
              value={details.senderUnit || details.sender_unit}
              disabled
              labelProps={{ style: { fontWeight: 600 } }}
            />
          </Grid>
            <Grid item xs={12} sm={6} md={4}>
            <Input
              label="Loại sổ"
              name="typeDocument"
              value={details.typeDocument || details.type_document}
              disabled
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Input
              label="Năm"
              name="year"
              value={details.year}
              type="number"
              required
              disabled
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Input
              label="Tên số"
              name="name"
              value={details.name}
              required
              disabled
            />
          </Grid>
        

          <Grid item xs={12} sm={6} md={4}>
            <Input
              label="Mã số"
              name="toBookCode"
              value={details.toBookCode || details.to_book_code}
              disabled
            />
          </Grid>
           <Grid item xs={12} sm={6} md={4}>
            <Input
              label="Văn thư quản lý sổ"
              name="managerBook"
                value={
                Array.isArray(details.managerBook || details.manager_book)
                  ? (details.managerBook || details.manager_book).map((item) => item.name).join(", ")
                  : ""
              }
              disabled
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Input
              label="Số bắt đầu"
              name="count"
              value={details.count}
              type="number"
              disabled
            />
          </Grid>
         
          <Grid item xs={12} sm={6} md={4}>
            <Input
              label="Lĩnh vực"
              name="documentField"
               value={
                Array.isArray(details.documentField || details.document_field)
                  ? (details.documentField || details.document_field).map((item) => item.name).join(", ")
                  : ""
              }
              disabled
            />
          </Grid>

          <CheckboxGridItem item xs={12} sm={6} md={4}>
            <StyledCheckboxLabel
              control={<Checkbox checked={details.active === "Hoạt động"} disabled />}
              label={details.active}
            />
             <StyledCheckboxLabel
              control={<Checkbox checked={!!(details.isDefault || details.is_default)} disabled />}
              label="Mặc định"
            />
          </CheckboxGridItem>
       
        </Grid>
      </Collapse>
     </SectionBox>
     <SectionBox>
        <TableTitle variant="h6">Danh sách văn bản</TableTitle>
        <TableWrapper isSmallScreen={!showInputs}>
          <TableNotification
            fetchData={fetchDataForTable}
            columns={activeColumns}
            filter={filterOptions}
            advancedFilterConfig={advancedFilterOptions}
            onDelete={handleDelete}
            onView= {handleViewDetails}
            refreshTrigger={reloadTable}
            disableAdd
            disableDelete 
            disableEdit
            disableSynchronize
            disableCheckbox={dialogKey !== "bookDocumentDetailsOut"}
            isExportAll
            onExportAll={handleExportAll}
            fileName="Danh sách văn bản"
            disableBL
            enableTableConfig
            codeModule={dialogKey === "bookDocumentDetailsOut" ? "OutGoing" : "Incomming"}
            // disableAct
          />
        </TableWrapper>
        </SectionBox>
      </DetailsContainer>
      <CustomDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onSave={handleConfirmDelete}
        title="Xác nhận xóa"
        type="delete"
      >
        Bạn có chắc chắn muốn xóa {selectedIds.length} văn bản đã chọn khỏi sổ
        này không?
      </CustomDialog>
      <PopperStyled
        open={openFilePopper}
        anchorEl={filePopoverAnchorEl}
        placement="bottom-start"
        modifiers={[
          { name: "flip", enabled: true, options: { fallbackPlacements: ["top-start"] } },
          { name: "preventOverflow", enabled: true, options: { boundary: "viewport" } },
        ]}
      >
        <FilePopoverContainer onMouseEnter={handlePopoverMouseEnter} onMouseLeave={handleCloseFilePopoverWithDelay}>
          {currentFiles.map((file, fileIndex) => (
            <MenuItem
              key={file.fileId || fileIndex}
              onClick={handleFileClick(file)}
            >
              <Typography variant="body2">{file.fileName}</Typography>
            </MenuItem>
          ))}
        </FilePopoverContainer>
      </PopperStyled>
      {viewingFile.open && (
        <FileViewerDialog
          open={viewingFile.open}
          onClose={handleCloseFileViewer}
          fileUrl={viewingFile.url}
          fileName={viewingFile.name}
          title={viewingFile.name}
          fileType={viewingFile.type} 
        />
      )}
      <StyledBackdrop open={isLoading}>
        <StyledLoadingStack direction="column">
          <StyledCircularProgress />
          <Typography variant="body1">Đang xử lý tài liệu...</Typography>
        </StyledLoadingStack>
      </StyledBackdrop>
       {openViewIncomingDoc && (
        <ViewIncommingDoc
          open={openViewIncomingDoc}
          onClose={handleCloseViewIncomingDoc}
          documentId={selectedDocumentId}
        />
      )}
      {openViewOutgoingDoc && (
        <ViewDialog
          open={openViewOutgoingDoc}
          onClose={handleCloseViewOutgoingDoc}
          documentId={selectedDocumentId}
        />
      )}
    </BaseSwipper>
  );
};

export default withSharedComponents(BookDocumentDetails);
