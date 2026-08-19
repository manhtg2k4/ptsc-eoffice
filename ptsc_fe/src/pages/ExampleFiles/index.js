/* eslint-disable react/forbid-component-props */
import React, { memo, useState, useCallback } from "react";
import { useToast } from "@components/common/ToastProvider";
import CustomTable from "@components/CustomTable/CustomTable";
import {
  getExampleFiles,
  getExampleFileById,
  deleteExampleFile,
  downloadExampleFile,
  getExampleFileBlob,
} from "@services/ExampleFile/exampleFileService";
import { formatFileSize } from "./utils";
import ExampleFileUploadDialog from "./ExampleFileUploadDialog";
import ExampleFileEditDialog from "./ExampleFileEditDialog";
import { FileViewerDialog } from "@components/CustomDialog";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import api from "@services/api";
import { APP_BASE, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import * as XLSX from "xlsx";

// ─── Định nghĩa cột hiển thị ───────────────────────────────────────────────
const buildColumns = () => [
  { name: "Tên File", row: "file_name", width: "250px" },
  { name: "Mã", row: "example_key", width: "180px" },
  // { name: "Loại", row: "example_type", width: "120px" },
  {
    name: "Kích thước",
    row: "file_size",
    // eslint-disable-next-line camelcase
    accessor: (row) => formatFileSize(row.file_size),
    width: "120px",
  },
  {
    name: "Ngày tạo",
    row: "created_at",
    width: "140px",
    accessor: (row) =>
      row.created_at
        ? new Date(row.created_at).toLocaleDateString("vi-VN")
        : "—",
  },
  // {
  //   name: "Tải xuống",
  //   row: "_download",
  //   width: "90px",
  //   accessor: (row) => (
  //     <DownloadCell row={row} onDownload={onDownload} />
  //   ),
  // },
];

// Tách component riêng để tránh inline arrow trong JSX
// const DownloadCell = ({ row, onDownload }) => {
//   const handleClick = useCallback(
//     (e) => {
//       e.stopPropagation();
//       onDownload(row);
//     },
//     [row, onDownload]
//   );

//   return (
//     <Tooltip title="Tải xuống">
//       <IconButton size="small" onClick={handleClick}>
//         <Download sx={{ fontSize: 18 }} />
//       </IconButton>
//     </Tooltip>
//   );
// };

// ─── Các trường tìm kiếm ───────────────────────────────────────────────────
const filtersExampleFiles = [
  { name: "Tên File", code: "file_name" },
  { name: "Khóa", code: "example_key" },
];

// ──────────────────────────────────────────────────────────────────────────
const ExampleFiles = memo(() => {
  const toast = useToast();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, ids: [] });
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingFile, setViewingFile] = useState({ open: false, url: null, name: "", type: null });
  const [selectedFile, setSelectedFile] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ─── fetchData theo format CustomTable ──────────────────────────────────
  const fetchData = useCallback(
    async ({ page, limit, query, code }) => {
      try {
        const type = code === "example_type" ? query : undefined;
        const response = await getExampleFiles(type, page, limit);

        let data = [];
        let total = 0;

        if (Array.isArray(response)) {
          data = response;
          total = response.length;
        } else if (response && Array.isArray(response.data)) {
          data = response.data;
          total = response.total || response.data.length;
        }

        // Filter local theo query nếu có
        if (query && code && code !== "example_type") {
          const q = query.toLowerCase();
          data = data.filter((item) => {
            const fields = Array.isArray(code) ? code : [code];
            return fields.some((f) =>
              item[f]?.toString().toLowerCase().includes(q)
            );
          });
          total = data.length;
        }

        // Chuẩn hóa file_size
        data = data.map((item) => ({
          ...item,
          // eslint-disable-next-line camelcase
          file_size:
            typeof item.file_size === "string"
              ? parseInt(item.file_size, 10)
              : item.file_size,
        }));

        return { data, total };
      } catch (error) {
        toast("Lỗi khi tải danh sách file mẫu", "error");
        return { data: [], total: 0 };
      }
    },
    [toast]
  );

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleDownload = useCallback(
    async (row) => {
      try {
        await downloadExampleFile(row.id, row.file_name);
        toast("Tải file thành công", "success");
      } catch (error) {
        toast("Tải file thất bại", "error");
      }
    },
    [toast]
  );

  const columns = buildColumns(handleDownload);

  const handleAdd = useCallback(() => {
    setUploadDialogOpen(true);
  }, []);

  const handleView = useCallback(
    async (row) => {
      try {
        const id = typeof row === "object" ? row.id : row;
        const data = await getExampleFileById(id);
        if (data && data.id) {
          const fileName = data.file_name || "";
          const lower = fileName.toLowerCase();
          
          const isDoc = /\.(doc|docx)$/i.test(lower);
          const isExcel = /\.(xls|xlsx)$/i.test(lower);
          const isPpt = /\.(ppt|pptx)$/i.test(lower);
          const isOtherOffice = isPpt;
          const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

          let blob;
          let previewName = fileName;
          let type = null;

          if (isDoc) {
            const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${data.id}`;
            const res = await api.get(conversionApi, {
              responseType: "blob",
              timeout: 0,
            });
            blob = new Blob([res.data], { type: "application/pdf" });
            previewName = fileName;
            type = "pdf";
          } else if (isExcel) {
            const originalBlob = await getExampleFileBlob(data.id);
            const formData = new FormData();
            formData.append("file", new File([originalBlob], fileName));
            formData.append("fileId", data.id);

            const res = await api.post(API_XLSX_TO_PDF, formData, {
              responseType: "blob",
              timeout: 0,
            });
            blob = new Blob([res.data], { type: "application/pdf" });
            previewName = fileName;
            type = "pdf";
          } else if (isOtherOffice) {
            const originalBlob = await getExampleFileBlob(data.id);
            const arrayBuffer = await originalBlob.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const html = XLSX.utils.sheet_to_html(
              workbook.Sheets[workbook.SheetNames[0]]
            );
            blob = new Blob([html], { type: "text/html" });
            previewName = fileName;
            type = "html";
          } else if (isBrowserFile) {
            blob = await getExampleFileBlob(data.id);
          } else {
            toast("Định dạng file không được hỗ trợ xem trước.", "warning");
            return;
          }

          const url = window.URL.createObjectURL(blob);
          setViewingFile({
            open: true,
            url,
            name: previewName,
            type: type,
          });
        } else {
          toast("Không tìm thấy file để xem", "error");
        }
      } catch (error) {
        let errorMsg = "Lỗi khi xem file";
        if (error?.response?.data instanceof Blob) {
          error.response.data.text().then(text => logger.error("Blob error text:", text));
        } else {
          errorMsg = error?.response?.data?.message || error.message || errorMsg;
        }
        toast(errorMsg, "error");
      }
    },
    [toast]
  );

  const handleEdit = useCallback(
    async (row) => {
      try {
        if (typeof row === "object" && row !== null) {
          setSelectedFile(row);
          setEditDialogOpen(true);
        } else {
          // Fallback if only id is provided
          const data = await getExampleFileById(row);
          setSelectedFile(data);
          setEditDialogOpen(true);
        }
      } catch (error) {
        toast("Lỗi khi lấy thông tin file", "error");
      }
    },
    [toast]
  );

  const handleRowDelete = useCallback(
    (row) => {
      const id = typeof row === "object" ? row.id : row;
      if (id) {
        setDeleteDialog({ open: true, ids: [id] });
      }
    },
    []
  );

  const handleBulkDelete = useCallback(
    (ids) => {
      if (ids && ids.length > 0) {
        setDeleteDialog({ open: true, ids });
      }
    },
    []
  );

  const handleConfirmDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      await Promise.all(deleteDialog.ids.map(id => deleteExampleFile(id)));
      toast(`Xóa thành công ${deleteDialog.ids.length} file mẫu`, "success");
      setRefreshTrigger((prev) => prev + 1);
      setDeleteDialog({ open: false, ids: [] });
    } catch (error) {
      toast("Xóa file mẫu thất bại", "error");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDialog.ids, toast]);

  const handleCloseDelete = useCallback(() => {
    if (!isDeleting) {
      setDeleteDialog({ open: false, ids: [] });
    }
  }, [isDeleting]);

  const handleUploadSuccess = useCallback(() => {
    setUploadDialogOpen(false);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleEditSuccess = useCallback(() => {
    setEditDialogOpen(false);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleCloseUpload = useCallback(() => {
    setUploadDialogOpen(false);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditDialogOpen(false);
  }, []);

  const handleCloseFileViewer = useCallback(() => {
    setViewingFile((prev) => {
      if (prev.url && prev.url.startsWith("blob:")) {
        window.URL.revokeObjectURL(prev.url);
      }
      return { open: false, url: null, name: "", type: null };
    });
  }, []);

  return (
    <>
      <CustomTable
        key={`example-files-${refreshTrigger}`}
        codeModule="ExampleFiles"
        columns={columns}
        filter={filtersExampleFiles}
        fetchData={fetchData}
        onAdd={handleAdd}
        onView={handleView}
        onEdit={handleEdit}
        onRowDelete={handleRowDelete}
        onDelete={handleBulkDelete}
        disableSynchronize
				anableSTT={false}
				filterPopupAlignLeft
				encodeHtml
      />

      {/* Upload Dialog */}
      <ExampleFileUploadDialog
        open={uploadDialogOpen}
        onClose={handleCloseUpload}
        onSuccess={handleUploadSuccess}
      />

      {/* Edit Dialogs */}
      {selectedFile && (
        <ExampleFileEditDialog
          open={editDialogOpen}
          onClose={handleCloseEdit}
          file={selectedFile}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* File Viewer Dialog */}
      <FileViewerDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        fileUrl={viewingFile.url}
        fileName={viewingFile.name}
        fileType={viewingFile.type}
        title={`Xem file: ${viewingFile.name}`}
      />

      {/* Delete Confirmation Dialog */}
      <CustomDialog
        title="Xác nhận xóa"
        open={deleteDialog.open}
        onClose={handleCloseDelete}
        onSave={handleConfirmDelete}
        type="delete"
        isLoading={isDeleting}
        size="sm"
      >
        <div style={{ padding: "20px 0" }}>
          Bạn có chắc chắn muốn xóa {deleteDialog.ids.length > 1 ? `${deleteDialog.ids.length} file mẫu đã chọn` : "file mẫu này"} không? Hành động này không thể hoàn tác.
        </div>
      </CustomDialog>
    </>
  );
});

ExampleFiles.displayName = "ExampleFiles";

export default ExampleFiles;
