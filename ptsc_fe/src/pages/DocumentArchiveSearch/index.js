import React, { useState, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import {
  getListChildParentsAchiveRecord,
  getListParentsAchiveRecord,
} from "@redux/slices/RecordManagement/RecordManagementSlice";
import { SkyBox } from "@styles/SkyStyles";
import {
  styled,
  Backdrop,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import Swipper from "@components/Swipper";
import {
  advancedFilterConfigDocumentArchiveSearch,
  columnsDocumentArchiveSearch,
  filterDocumentArchiveSearch,
} from "./constantsDocumentArchiveSearch";
import ViewRecordManagement from "@pages/RecordManagement/ViewRecordManagement";
import FileViewerDialog from "@components/CustomDialog/FileViewerDialog";
import { useToast } from "@components/common/ToastProvider";
import { RemoveRedEyeOutlined } from "@mui/icons-material";
import { viewFile } from "@redux/slices/UploadFile/UploadFileSlice";
import { APP_BASE, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import CustomTableTreeLoadmore from "@components/CustomTable/CustomTableTreeLoadmore";

const BoxContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "isGadget",
})(({ theme, isGadget, nonePdTop }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
	// padding: isGadget ? "16px 0px" : "0",
  backgroundColor: "#fff",
  borderRadius: "8px",
  overflow: "hidden",
	padding: isGadget
  ? theme.spacing(nonePdTop ? 0 : 2, 0)
  : 0,
}));

const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  color: "#fff",
  zIndex: theme.zIndex.drawer + 1,
}));

const StyledLoadingStack = styled(Stack)(({ theme }) => ({
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(2),
}));

const StyledCircularProgress = styled(CircularProgress)(() => ({
  color: "inherit",
}));

const DocumentArchiveSearch = ({ open, onClose, title, item }) => {
  const isGadget = !!item || !open;
  const dispatch = useDispatch();
  const toast = useToast();
  const [selectedRows, setSelectedRows] = useState("");
  const [objectType, setObjectType] = useState("folder");
  const [openViewRecordManagement, setOpenViewRecordManagement] = useState({
    open: false,
    archiveId: null,
  });
  const [openFileViewer, setOpenFileViewer] = useState({
    open: false,
    fileUrl: null,
    fileName: null,
    type: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data for parent level (folders)
  const getDataDistrictFromApi = useCallback(
    ({ page, limit, query, code, ...filterParams }) => {
      return dispatch(
        getListParentsAchiveRecord({
          page,
          limit,
          query,
          code,
          ...filterParams,
        })
      ).unwrap();
    },
    [dispatch]
  );

  // Fetch data for children level (files in folder)
  const fetchChildren = useCallback(
    ({ parentId, page, limit, query, code, ...filterParams }) => {
      return dispatch(
        getListChildParentsAchiveRecord({
          parentId,
          page,
          limit,
          query,
          code,
          ...filterParams,
        })
      ).unwrap();
    },
    [dispatch]
  );

  // Handle select row
  // const handleSelectRow = (row, isSelected) => {
  //   logger.log(
  //     "Dữ liệu dòng được chọn:",
  //     row,
  //     "- Trạng thái chọn:",
  //     isSelected
  //   );
  // };

  const handleViewParentArchiveRecord = useCallback((id) => {
    setOpenViewRecordManagement({ open: true, archiveId: id });
  }, []);

  const handleCloseViewRecordManagement = useCallback(() => {
    setOpenViewRecordManagement({ open: false, archiveId: null });
  }, []);

  const handleCloseFileViewer = useCallback(() => {
    // Revoke blob URL nếu có để tránh memory leak
    if (openFileViewer.fileUrl && openFileViewer.fileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(openFileViewer.fileUrl);
    }
    setOpenFileViewer({ open: false, fileUrl: null, fileName: null });
  }, [openFileViewer.fileUrl]);

  // Fetch file từ API giống như handlePreview trong ViewDialog
  const handlePreviewFile = useCallback(
    async (file) => {
      if (!file) {
        toast("File không hợp lệ", "warning");
        return;
      }

      const fileId = file.fileId || file.id;
      const fileName = file.fileName || file.name || "Tài liệu";
      const fileExtension = fileName?.split(".").pop().toLowerCase();
      const lower = fileName.toLowerCase();

      const isDoc = /\.(doc|docx)$/i.test(lower);
      const isExcel = /\.(xls|xlsx)$/i.test(lower);
      const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|bmp)$/i.test(lower);

      if (!fileId && !file.fileUrl && !file.url) {
        toast("File không có mã định danh hợp lệ để xem trước.", "error");
        return;
      }

      setIsLoading(true);

      try {
        let objectUrl;
        let fileType = null;

        if (isDoc && fileId) {
          const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
          const res = await api.get(conversionApi, {
            responseType: "blob",
            timeout: 0,
          });
          const blob = new Blob([res.data], { type: "application/pdf" });
          objectUrl = URL.createObjectURL(blob);
          fileType = "pdf";
        } else if (isExcel && fileId) {
          // EXCEL conversion to PDF
          const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
          const fileRes = await api.get(downloadUrl, {
            responseType: "blob",
            timeout: 0,
          });

          const formData = new FormData();
          formData.append("file", new File([fileRes.data], fileName));

          const res = await api.post(API_XLSX_TO_PDF, formData, {
            responseType: "blob",
            timeout: 0,
          });

          const blob = new Blob([res.data], { type: "application/pdf" });
          objectUrl = URL.createObjectURL(blob);
          fileType = "pdf";
        } else if (isBrowserFile && fileId) {
          // PDF, Image: direct fetch and view
          const response = await dispatch(viewFile(file)).unwrap();
          const blob = response.data || response;
          objectUrl = URL.createObjectURL(blob);
          
          if (fileExtension === "pdf") {
            fileType = "pdf";
          } else {
            fileType = "image";
          }
        } else if (file.fileUrl || file.url) {
          // If no fileId, use available URL directly
          objectUrl = file.fileUrl || file.url;
          if (fileExtension === "pdf") fileType = "pdf";
          else if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileExtension)) fileType = "image";
        } else {
          // Other types attempt direct view via viewFile
          const response = await dispatch(viewFile(file)).unwrap();
          const blob = response.data || response;
          objectUrl = URL.createObjectURL(blob);
        }

        setOpenFileViewer({
          open: true,
          fileUrl: objectUrl,
          fileName: fileName,
          type: fileType,
        });
      } catch (error) {
        logger.log("Error preview file:", error);
        toast("Không thể tải file để xem trước", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [toast, dispatch]
  );

  // Handle click on folder/file row
  const handleRowAction = useCallback(
    (row) => {
      if (row?.type === "file") {
        // Nếu là file, fetch và mở file viewer
        handlePreviewFile(row);
      } else {
        // Nếu là folder, xem chi tiết
        handleViewParentArchiveRecord(row?.id);
      }
    },
    [handlePreviewFile, handleViewParentArchiveRecord]
  );

  // Xử lý khi filter được áp dụng
  const handleApplyAdvancedFilter = useCallback(
    (filters) => {
      // Chỉ cập nhật objectType nếu typeObj có giá trị
      if (filters?.typeObj) {
        setObjectType(filters.typeObj);
      }
    },
    []
  );

  // Xử lý khi bất kỳ field nào trong bộ lọc thay đổi
  const handleAdvancedFieldChange = useCallback(
    (key, value) => {
      // Nếu là field "Loại đối tượng", cập nhật state ngay lập tức
      if (key === "typeObj") {
        setObjectType(value);
      }
    },
    []
  );

  const dynamicAdvancedFilterConfig = useMemo(() => {
    return advancedFilterConfigDocumentArchiveSearch.filter((field) => {
      // Luôn hiển thị field config chọn loại
      if (field.isConfig) return true;

      // Nếu chưa chọn loại đối tượng, chỉ hiển thị loại và ẩn các field khác
      if (!objectType) {
        return field.isConfig;
      }

      // Nếu field không có objectTypeKey, hiển thị
      if (!field.objectTypeKey) return true;

      // Chỉ hiển thị field có objectTypeKey phù hợp với objectType được chọn
      return field.objectTypeKey === objectType;
    });
  }, [objectType]);

  // Tạo advancedFiltersParams với giá trị mặc định cho typeObj
  const advancedFiltersParams = useMemo(() => ({
    typeObj: objectType,
  }), [objectType]);

  const content = (
    <BoxContainer isGadget={isGadget} nonePdTop>
      <CustomTableTreeLoadmore
        rowKey="id"
        columns={columnsDocumentArchiveSearch}
        fetchData={getDataDistrictFromApi}
        fetchChildren={fetchChildren}
        filter={filterDocumentArchiveSearch}
        // disablePagination
        disableSynchronize
        disableAdd
        selection={selectedRows}
        onSelectionChange={setSelectedRows}
        onlyTable
        disableDelete
        disableEdit
        // onSelectRow={handleSelectRow}
        noneTitle
        disableCheckbox
        disableDetail
        optionMore={[
          {
            title: (row) =>
              row?.type === "folder"
                ? "Xem chi tiết hồ sơ"
                : "Xem tài liệu/văn bản",
            onClick: handleRowAction,
            icon: RemoveRedEyeOutlined,
            isFullDataRow: true,
          },
        ]}
        filtersAdvanced
        enableAdvancedFilterPopup
        enableSearchFilterPopup
        advancedFilterConfig={dynamicAdvancedFilterConfig}
        advancedFiltersParams={advancedFiltersParams}
        onApplyAdvancedFilter={handleApplyAdvancedFilter}
        onAdvancedFieldChange={handleAdvancedFieldChange}
				noPadding
				pdBottom={4.375} // ~ 35px
      />
    </BoxContainer>
  );

  if (open) {
    return (
      <>
        <Swipper
          open={open}
          onClose={onClose}
          title={title || "Tra cứu hồ sơ, tài liệu lưu trữ"}
          type="view"
        >
          {content}
        </Swipper>
        <ViewRecordManagement
          open={openViewRecordManagement.open}
          onClose={handleCloseViewRecordManagement}
          archiveId={openViewRecordManagement.archiveId}
          title="Xem chi tiết hồ sơ"
        />
        <FileViewerDialog
          open={openFileViewer.open}
          onClose={handleCloseFileViewer}
          fileUrl={openFileViewer.fileUrl}
          fileName={openFileViewer.fileName}
          fileType={openFileViewer.type}
          title={openFileViewer.fileName}
        />
        <StyledBackdrop open={isLoading}>
          <StyledLoadingStack direction="column">
            <StyledCircularProgress />
            <Typography variant="body1">Đang xử lý tài liệu...</Typography>
          </StyledLoadingStack>
        </StyledBackdrop>
      </>
    );
  }

  return (
    <>
      {content}
      <ViewRecordManagement
        open={openViewRecordManagement.open}
        onClose={handleCloseViewRecordManagement}
        archiveId={openViewRecordManagement.archiveId}
        title="Xem chi tiết hồ sơ"
      />
      <FileViewerDialog
        open={openFileViewer.open}
        onClose={handleCloseFileViewer}
        fileUrl={openFileViewer.fileUrl}
        fileName={openFileViewer.fileName}
        fileType={openFileViewer.type}
        title={openFileViewer.fileName}
      />
      <StyledBackdrop open={isLoading}>
        <StyledLoadingStack direction="column">
          <StyledCircularProgress />
          <Typography variant="body1">Đang xử lý tài liệu...</Typography>
        </StyledLoadingStack>
      </StyledBackdrop>
    </>
  );
};

export default DocumentArchiveSearch;
