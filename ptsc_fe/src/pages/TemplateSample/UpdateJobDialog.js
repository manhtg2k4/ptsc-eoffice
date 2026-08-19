import React, { useCallback, useEffect, useMemo } from "react";
import { Grid, styled } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import withSharedComponents from "@components/WrapperComponent";
import { useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import FileTreeTable from "@components/FileTreeTable";
import { SkyBox, SkyListItem, SkyMenu, SkyMenuItem, SkyCheckbox, SkyFormControlLabel } from "@styles/SkyStyles";
import { JobPlaceholderText, JobSectionTitle, JobUploadPlaceholderBox, StyledBoxContainerContent, StyledListItemIcon, StyledMenuIcon, StytedDescriptionIcon, BoderBox } from "@pages/WorkManagement/components/Job.styles";
import { AttachFile, DeleteOutline, VisibilityOutlined, DownloadOutlined } from "@mui/icons-material";
import { JobButtonContainer } from "@components/SubmitApproval";
const ButtonOutline = React.lazy(() => import("@components/CustomButtonOutline"));
import FolderIcon from "@mui/icons-material/Folder";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import {
  UPLOAD_LIMITS_PER_FILE,
  UPLOAD_LIMITS_PER_FOLDER,
  UPLOAD_LIMITS_PER_BATCH,
  UPLOAD_LIMITS_PER_TASK,
  validateFileName,
  validateFileExtension,
  formatFileSize,
  generateDuplicateName
} from "@pages/WorkManagement/components/constants";
import { processFilesForUpload, convertFilesToTreeData } from "@utils/utils";
import { CustomDialog, FileViewerDialog } from "@components/CustomDialog";
import axiosInstance from "@utils/axiosInstance";
import { APP_BASE, API_VIEW_FILE } from "@EnvironmentFile/constants/urlConfig";

const SkyStyleBox = styled(SkyBox)({
  width: "100%",
})

const UpdateJobDialog = ({
  open,
  onClose,
  data,
  onSave, // Callback để cập nhật treeData ở component cha
  allTasks = [], // Danh sách tất cả các công việc để chọn phụ thuộc
  sharedComponents,
}) => {
  const { Dialog, InputComponents } = sharedComponents;
  const [uploadedFiles, setUploadedFiles] = React.useState([]);
  const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);

  const schema = yup.object().shape({
    taskName: yup.string().required("Vui lòng nhập tên công việc"),
    executionTime: yup.string().required("Vui lòng nhập thời gian thực hiện"),
    unit: yup.string().required("Vui lòng chọn đơn vị"),
    isApprovalRequired: yup.boolean(),
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      isApprovalRequired: false,
    },
  });

  const toast = useToast();
  const [pendingFiles, setPendingFiles] = React.useState([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [selectedFileId, setSelectedFileId] = React.useState(null);
  const [selectedIsFolder, setSelectedIsFolder] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [viewingFile, setViewingFile] = React.useState({
    open: false,
    url: "",
    name: "",
    type: null,
  });

  const { crmSource } = useSelector((state) => state.config);
  
  const urgencyOptions = useMemo(() => 
    crmSource.find((item) => item.code === "DOUUTIEN")?.data || [], [crmSource]);

  const timeOptions = useMemo(() => 
    crmSource.find((item) => item.code === "S34")?.data || [], [crmSource]);

  useEffect(() => {
    if (open && data) {
      reset({
        taskName: data.name || data.title || "",
        executionTime: data.executionTime || "",
        unit: data.unit || "ngày",
        priority: data.priority || "",
        description: data.description || data.note || "",
        reminderTime: data.deadlineReminder || data.reminderTime || "",
        dependency: data.dependency || "", // Lưu ID
        isApprovalRequired: data.isApprovedRequired || data.isApprovalRequired || false,
      });
      setUploadedFiles(data.files || data.attachments || []);
    }
  }, [open, data, reset]);

  const handleCloseFileMenu = useCallback(() => {
    setFileMenuAnchor(null);
    setSelectedFileId(null);
    setSelectedIsFolder(false);
    setSelectedFile(null);
  }, []);

   const handleConfirmUpload = useCallback((shouldContinue) => {
    if (shouldContinue) {
      const filesToAdd = processFilesForUpload(pendingFiles, uploadedFiles, generateDuplicateName);
      setUploadedFiles((prev) => [...prev, ...filesToAdd]);
    }
    setPendingFiles([]);
    setIsConfirmDialogOpen(false);
  }, [pendingFiles, uploadedFiles]);

  const handleCancelUpload = useCallback(() => {
    handleConfirmUpload(false);
  }, [handleConfirmUpload]);

  const handleConfirmUploadAction = useCallback(() => {
    handleConfirmUpload(true);
  }, [handleConfirmUpload]);

  const handleOpenDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(true);
    setFileMenuAnchor(null);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
  }, []);

  const handleSaveForm = async (formData) => {
    // Tách file cũ và file mới
    const oldFiles = uploadedFiles.filter(f => !(f instanceof File));
    const newFiles = uploadedFiles.filter(f => f instanceof File);

    // Nếu không có file mới thì lưu ngay
    if (newFiles.length === 0) {
      onSave?.({
        ...data,
        processId: data.processId || data.id,
        title: formData.taskName,
        name: formData.taskName,
        executionTime: formData.executionTime,
        unit: formData.unit,
        priority: formData.priority,
        description: formData.description,
        note: formData.description,
        reminderTime: formData.reminderTime,
        deadlineReminder: formData.reminderTime,
        dependency: formData.dependency,
        isApprovalRequired: formData.isApprovalRequired,
        files: oldFiles,
      });
      onClose();
      toast("Cập nhật thành công!", "success");
      return;
    }

    // Có file mới -> upload
    const objectId = data.id || data._id; // Sử dụng ID của job hiện tại
    const uploadedNewFiles = [];

    const isFolderUpload = newFiles.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));
    
    try {
      if (isFolderUpload) {
        const createdFolders = {};
        for (const file of newFiles) {
            const relativePath = file.webkitRelativePath;
            const pathParts = relativePath.split("/");
            const folderParts = pathParts.slice(0, -1);

            let parentId = null;
            let currentPath = "";

            // Tạo cấu trúc thư mục
            for (const folderName of folderParts) {
                currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

                if (createdFolders[currentPath]) {
                    parentId = createdFolders[currentPath];
                } else {
                    const folderPayload = {
                        objectType: 'process_template', // Hoặc loại object phù hợp
                        objectId: objectId,
                        name: folderName,
                        folderName: folderName,
                        parentId: parentId,
                    };

                    const response = await axiosInstance.post(`${APP_BASE}/api/files/folder`, folderPayload);
                    const resData = response.data || response;
                    const newFolderId = resData.id || resData._id;

                    createdFolders[currentPath] = newFolderId;
                    parentId = newFolderId;
                }
            }

            // Upload file vào thư mục
            const formDataUpload = new FormData();
            formDataUpload.append("file", file);
            formDataUpload.append("object_type", 'process_template');
            formDataUpload.append("object_id", objectId);
            if (parentId) {
                formDataUpload.append("parent_id", parentId);
            }

            // Gọi API upload như yêu cầu
            const res = await axiosInstance.post(`${APP_BASE}/api/files/upload`, formDataUpload, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            
            const uploadedFile = res.data || res;
            if (uploadedFile) {
               uploadedNewFiles.push(uploadedFile);
            }
        }
      } else {
        // Upload file lẻ
        for (const file of newFiles) {
            try {
                const uploadResponse = await apiUploadFile(file, "process_template", objectId);
                const uploadedFile = uploadResponse?.data || uploadResponse;
                if (uploadedFile) {
                    uploadedNewFiles.push(uploadedFile);
                }
            } catch (uploadError) {
                toast(`Tải lên tệp ${file.name} thất bại.`, "warning");
            }
        }
      }

      // Gộp file cũ và file mới đã upload
      const finalFiles = [...oldFiles, ...uploadedNewFiles];

      onSave?.({
        ...data,
        processId: data.processId || data.id,
        title: formData.taskName,
        name: formData.taskName,
        executionTime: formData.executionTime,
        unit: formData.unit,
        priority: formData.priority,
        description: formData.description,
        note: formData.description,
        reminderTime: formData.reminderTime,
        deadlineReminder: formData.reminderTime,
        dependency: formData.dependency,
        isApprovalRequired: formData.isApprovalRequired,
        files: finalFiles,
      });
      onClose();
      toast("Cập nhật và tải tệp tin thành công!", "success");

    } catch (error) {
       toast("Có lỗi xảy ra khi tải lên tệp tin!", "error");
    }
  };

  const fileTreeData = useMemo(() => {
    return convertFilesToTreeData(uploadedFiles);
  }, [uploadedFiles]);

  const handleFilesChange = (event) => {
    const isFolderInput = event.target.hasAttribute('webkitdirectory');
    const newFiles = Array.from(event.target.files);

    if (!newFiles.length) {
      if (isFolderInput) {
        toast("Thư mục đã chọn không có tệp tin nào để tải lên", "warning");
      }
      return;
    }

    // === VALIDATION 1: Kiểm tra số lượng file/folder theo BATCH ===
    const isFolderUpload = newFiles.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));

    if (isFolderUpload) {
      // Kiểm tra giới hạn folder/lần
      const folderCount = new Set(newFiles.map(f => f.webkitRelativePath.split('/')[0])).size;
      if (folderCount > UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS) {
        toast(`Chỉ được tải tối đa ${UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS} folder/lần`, "error");
        event.target.value = null;
        return;
      }
    } else {
      // Kiểm tra giới hạn file/lần
      if (newFiles.length > UPLOAD_LIMITS_PER_BATCH.MAX_FILES) {
        toast(`Vượt quá ${UPLOAD_LIMITS_PER_BATCH.MAX_FILES} file/lần tải lên. Hiện tại: ${newFiles.length} file`, "error");
        event.target.value = null;
        return;
      }
    }

    // === VALIDATION 2: Kiểm tra giới hạn theo CÔNG VIỆC ===
    const currentTotalCount = uploadedFiles.length;
    const newItemsCount = isFolderUpload ? 1 : newFiles.length;

    // Kiểm tra tổng số đính kèm
    if (currentTotalCount + newItemsCount > UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS) {
      toast(
        `Vượt quá giới hạn ${UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS} đính kèm/công việc. ` +
        `Hiện tại: ${currentTotalCount}, Muốn thêm: ${newItemsCount}`,
        "error"
      );
      event.target.value = null;
      return;
    }

    // Tính tổng dung lượng hiện có và mới
    const currentTotalSize = uploadedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    const newFilesSize = newFiles.reduce((sum, file) => sum + (file.size || 0), 0);

    if (currentTotalSize + newFilesSize > UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE) {
      toast(
        `Vượt quá tổng dung lượng ${formatFileSize(UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE)}/công việc. ` +
        `Hiện tại: ${formatFileSize(currentTotalSize)}, Muốn thêm: ${formatFileSize(newFilesSize)}`,
        "error"
      );
      event.target.value = null;
      return;
    }

    // === VALIDATION 3: Kiểm tra kích thước file/folder ===
    if (isFolderUpload) {
      // Kiểm tra tổng dung lượng folder
      const totalFolderSize = newFiles.reduce((sum, file) => sum + (file.size || 0), 0);
      if (totalFolderSize > UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE) {
        toast(
          `Folder vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE)}. ` +
          `Kích thước hiện tại: ${formatFileSize(totalFolderSize)}`,
          "error"
        );
        event.target.value = null;
        return;
      }

      // Kiểm tra số lượng file trong folder
      if (newFiles.length > UPLOAD_LIMITS_PER_FOLDER.MAX_FILES) {
        toast(`Folder chứa quá nhiều file (${newFiles.length}). Giới hạn: ${UPLOAD_LIMITS_PER_FOLDER.MAX_FILES} file`, "error");
        event.target.value = null;
        return;
      }

      // Kiểm tra từng file trong folder
      for (const file of newFiles) {
        if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
          toast(
            `File "${file.name}" vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FILE.MAX_SIZE)}. ` +
            `Kích thước: ${formatFileSize(file.size)}`,
            "error"
          );
          event.target.value = null;
          return;
        }

        const nameValidation = validateFileName(file.name);
        if (!nameValidation.valid) {
          toast(`File "${file.name}": ${nameValidation.message}`, "error");
          event.target.value = null;
          return;
        }

        const extValidation = validateFileExtension(file.name);
        if (!extValidation.valid) {
          toast(`File "${file.name}": ${extValidation.message}`, "error");
          event.target.value = null;
          return;
        }
      }
    } else {
      // Upload file đơn lẻ - kiểm tra từng file
      for (const file of newFiles) {
        if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
          toast(
            `File "${file.name}" vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FILE.MAX_SIZE)}. ` +
            `Kích thước: ${formatFileSize(file.size)}`,
            "error"
          );
          event.target.value = null;
          return;
        }

        const nameValidation = validateFileName(file.name);
        if (!nameValidation.valid) {
          toast(`File "${file.name}": ${nameValidation.message}`, "error");
          event.target.value = null;
          return;
        }

        const extValidation = validateFileExtension(file.name);
        if (!extValidation.valid) {
          toast(`File "${file.name}": ${extValidation.message}`, "error");
          event.target.value = null;
          return;
        }
      }
    }

    // === VALIDATION 4: Kiểm tra trùng tên ===
    const isDuplicate = Array.from(new Set(newFiles.map(nf => {
      const path = nf.webkitRelativePath || "";
      return path.includes("/") ? path.split("/")[0] : nf.name;
    }))).some(newItemName => {
      return uploadedFiles.some(ef => {
        const efPath = ef.path || ef.webkitRelativePath || "";
        const existingItemName = efPath.includes("/") ? efPath.split("/")[0] : (ef.name || ef.file_name);
        return newItemName === existingItemName;
      });
    });

    if (isDuplicate) {
      setPendingFiles(newFiles);
      setIsConfirmDialogOpen(true);
    } else {
      const processedFiles = newFiles.map(f => {
        if (f.webkitRelativePath) {
          f.path = f.webkitRelativePath;
        }
        return f;
      });
      setUploadedFiles((prev) => [...prev, ...processedFiles]);
    }

    if (event.target) {
      event.target.value = null;
    }
  };

  const handleFileMenuClick = useCallback((event) => {
    const anchor = event.currentTarget;
    const fileId = anchor.getAttribute('data-file-id');
    const isFolderValue = anchor.getAttribute('data-is-folder') === '1';

    if (!fileId) return;

    // Tìm node trong fileTreeData vì nó khớp với những gì đang hiển thị (bao gồm cả Folder ảo)
    let found = fileTreeData.find(item => 
      String(item.id) === String(fileId) || 
      String(item._id) === String(fileId) ||
      item.name === fileId
    );

    // Dự phòng tìm trong uploadedFiles
    if (!found) {
        found = uploadedFiles.find(f => (f.id || f._id || f.name) === fileId);
    }

    if (found) {
      setSelectedFile({ ...found, isFolder: isFolderValue });
    } else {
      setSelectedFile({ id: fileId, isFolder: isFolderValue, name: fileId });
    }

    setSelectedFileId(fileId);
    setSelectedIsFolder(isFolderValue);
    setFileMenuAnchor(anchor);
  }, [fileTreeData, uploadedFiles]);

  const handleCloseFileViewer = () => {
    if (viewingFile.url) {
      URL.revokeObjectURL(viewingFile.url);
    }
    setViewingFile({
      open: false,
      url: "",
      name: "",
      type: null,
    });
  };

  const handleViewFile = async () => {
    handleCloseFileMenu();
    if (!selectedFile) return;

    const fileToProcess = (selectedFile instanceof File) ? selectedFile : selectedFile?.file;

    // Trường hợp là File object mới chọn (chưa upload lên server)
    if (fileToProcess instanceof File) {
        const objectUrl = URL.createObjectURL(fileToProcess);
        const fileName = fileToProcess.name;
        const fileExtension = fileName?.split(".").pop().toLowerCase();
        let fileType = null;
        if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
          fileType = "image";
        } else if (fileExtension === "pdf") {
          fileType = "pdf";
        }

        setViewingFile({
          open: true,
          url: objectUrl,
          name: fileName,
          type: fileType,
        });
        return;
    }

    const fileId = selectedFile.id || selectedFile._id;
    if (!fileId) {
      toast("File không hợp lệ.", "warning");
      return;
    }

    try {
      const response = await axiosInstance.get(`${API_VIEW_FILE}/${fileId}`, {
        responseType: "blob",
      });
      const blob = response; 
      const objectUrl = URL.createObjectURL(blob);
      const fileName = selectedFile.file_name || selectedFile.name;
      const fileExtension = fileName?.split(".").pop().toLowerCase();
      let fileType = null;
      if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
        fileType = "image";
      } else if (fileExtension === "pdf") {
        fileType = "pdf";
      }

      setViewingFile({
        open: true,
        url: objectUrl,
        name: fileName,
        type: fileType,
      });
    } catch (error) {
      toast("Không thể tải file để xem trước.", "error");
    }
  };

  const handleDownloadFile = async () => {
    handleCloseFileMenu();
    if (!selectedFile) return;

    const fileToProcess = (selectedFile instanceof File) ? selectedFile : selectedFile?.file;

    // Trường hợp là File object mới chọn
    if (fileToProcess instanceof File) {
        const url = URL.createObjectURL(fileToProcess);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileToProcess.name;
        a.click();
        URL.revokeObjectURL(url);
        return;
    }

    const fileId = selectedFile.id || selectedFile._id;
    if (!fileId) return;

    try {
      const isFolder = selectedFile?.isFolder || selectedFile?.type_file === 'Thư mục';
      const fileName = selectedFile.file_name || selectedFile.name;

      if (isFolder) {
        const blob = await axiosInstance.get(
          `${APP_BASE}/api/files/download-folder/${fileId}`,
          { responseType: 'blob' }
        );

        const url = window.URL.createObjectURL(
          new Blob([blob], { type: 'application/zip' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${fileName || 'folder'}.zip`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      } else {
        const response = await axiosInstance.get(`${API_VIEW_FILE}/${fileId}`, {
          responseType: "blob",
        });
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      }
    } catch (error) {
      toast("Tải xuống thất bại!", "error");
    }
  };

  const findAllChildren = useCallback((nodes, parentId, result = []) => {
    nodes.forEach((node) => {
      if (node.parent_id === parentId) {
        result.push(node);
        findAllChildren(nodes, node.id || node._id, result);
      }
    });
    return result;
  }, []);

  const handleDeleteFile = useCallback(() => {
    if (!selectedFileId) {
      handleCloseFileMenu();
      return;
    }

    // Tìm node trong flattened array
    const fileNode = fileTreeData.find(
      (node) => String(node.id || node._id) === String(selectedFileId)
    );

    if (!fileNode) {
      handleCloseFileMenu();
      return;
    }

    // Thu thập tất cả file objects cần xóa
    const filesToRemove = new Set();

    // Nếu là folder, tìm tất cả children và thu thập file objects
    if (selectedIsFolder) {
      const allChildren = findAllChildren(fileTreeData, selectedFileId);
      allChildren.forEach((child) => {
        if (child.file) {
          filesToRemove.add(child.file);
        } else {
          // Trường hợp file đã upload có id/ _id
          const originalFile = uploadedFiles.find(f => (f.id || f._id) === (child.id || child._id));
          if (originalFile) filesToRemove.add(originalFile);
        }
      });
    } else {
      // Nếu là file, chỉ xóa file đó
      if (fileNode.file) {
        filesToRemove.add(fileNode.file);
      } else {
        const originalFile = uploadedFiles.find(f => (f.id || f._id) === (fileNode.id || fileNode._id));
        if (originalFile) filesToRemove.add(originalFile);
      }
    }

    // Xóa các file khỏi uploadedFiles
    setUploadedFiles((prev) =>
      prev.filter((file) => !filesToRemove.has(file))
    );

    setIsDeleteDialogOpen(false);
    handleCloseFileMenu();
  }, [selectedFileId, selectedIsFolder, fileTreeData, findAllChildren, handleCloseFileMenu, uploadedFiles]);

  return (
    <Dialog
      title={(data?.id || data?._id) ? "CẬP NHẬT CÔNG VIỆC" : "Thêm mới công việc"}
      open={open}
      onClose={onClose}
      onSave={handleSubmit(handleSaveForm)}
      type="edit"
      isLoading={false}
      size="lg"
    >
      <Grid container spacing={2} mt={1}>
        <Grid item xs={12}>
          <JobSectionTitle variant="h6" gutterBottom>
            <StytedDescriptionIcon />
            THÔNG TIN CHUNG
          </JobSectionTitle>
        <BoderBox>
          <Grid container spacing={3}>
            {/* Hàng 1: Tên công việc | Thời gian thực hiện | Đơn vị */}
            <Grid item xs={12} md={5}>
              <Controller
                name="taskName"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tên công việc"
                    {...field}
                    required
                    error={!!errors.taskName}
                    helperText={errors.taskName?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="executionTime"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Thời gian thực hiện"
                    {...field}
                    required
                    error={!!errors.executionTime}
                    helperText={errors.executionTime?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Đơn vị"
                    placeholder="Chọn đơn vị..."
                    options={[
                      { title: 'Ngày', value: 'ngày' },
                      { title: 'Giờ', value: 'giờ' },
                    ]}
                    customLabel="title"
                    customValue="value"
                    {...field}
                    required
                    error={!!errors.unit}
                    helperText={errors.unit?.message}
                  />
                )}
              />
            </Grid>

            {/* Hàng 2: Phụ thuộc | Thời gian nhắc hạn | Độ ưu tiên */}
            <Grid item xs={12} md={5}>
              <Controller
                name="dependency"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Phụ thuộc"
                    placeholder="Chọn công việc phụ thuộc..."
                    options={allTasks
                      .filter(t => {
                        const tId = t.id || t._id;
                        const currentId = data?.id || data?._id;
                        if (tId === currentId) return false;
                        const currentTask = allTasks.find(task => (task.id || task._id) === currentId);
                        const currentParent = currentTask?.parentId;
                        if (t.parentId === currentParent) return true;
                        if (tId === data?.dependency) return true;
                        return false;
                      })
                      .map(t => ({
                        title: t.name || t.title,
                        value: t.id || t._id
                      }))
                    }
                    customLabel="title"
                    customValue="value"
                    {...field}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="reminderTime"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Thời gian nhắc hạn"
                    placeholder="Chọn thời gian nhắc hạn..."
                    options={timeOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Độ ưu tiên"
                    placeholder="Chọn độ ưu tiên..."
                    options={urgencyOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                  />
                )}
              />
            </Grid>

            {/* Hàng 3: Mô tả full width */}
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Mô tả"
                    multiline
                    rows={4}
                    {...field}
                  />
                )}
              />
            </Grid>

            {/* Checkbox */}
            <Grid item xs={12}>
              <Controller
                name="isApprovalRequired"
                control={control}
                render={({ field }) => (
                  <SkyFormControlLabel
                    control={
                      <SkyCheckbox
                        {...field}
                        checked={field.value}
                      />
                    }
                    label="Xác nhận hoàn thành"
                    labelPlacement="start"
                  />
                )}
              />
            </Grid>
          </Grid>
        </BoderBox>
        </Grid>

        <SkyStyleBox>
          <StyledBoxContainerContent styledMarginTop>
            <JobSectionTitle variant="h6" gutterBottom>
              <StytedDescriptionIcon />
              TÀI LIỆU LIÊN QUAN
            </JobSectionTitle>
            <BoderBox>
            <JobButtonContainer>
              <ButtonOutline component="label" startIcon={<AttachFile />}>
                Thêm link
                <input type="file" hidden multiple onChange={handleFilesChange} />
              </ButtonOutline>
              <ButtonOutline component="label" startIcon={<AttachFile />}>
                Tải file
                <input type="file" hidden multiple onChange={handleFilesChange} />
              </ButtonOutline>
              <ButtonOutline component="label" startIcon={<FolderIcon />}>
                Tải thư mục
                <input type="file" hidden multiple webkitdirectory="" onChange={handleFilesChange} />
              </ButtonOutline>
            </JobButtonContainer>
  
            {fileTreeData.length > 0 ? (
              <>
                <FileTreeTable
                  data={fileTreeData}
                  onFileMenuClick={handleFileMenuClick}
                  MenuIcon={StyledMenuIcon}
                />
                 <SkyMenu
                  anchorEl={fileMenuAnchor}
                  open={Boolean(fileMenuAnchor)}
                  onClose={handleCloseFileMenu}
                  id="file-menu"
                >
                  {selectedFile && !selectedIsFolder && (
                    <SkyMenuItem onClick={handleViewFile}>
                        <StyledListItemIcon>
                            <VisibilityOutlined />
                        </StyledListItemIcon>
                        <SkyListItem>Xem</SkyListItem>
                    </SkyMenuItem>
                  )}
                  <SkyMenuItem onClick={handleOpenDeleteDialog}>
                    <StyledListItemIcon>
                      <DeleteOutline />
                    </StyledListItemIcon>
                    <SkyListItem>Xóa</SkyListItem>
                  </SkyMenuItem>
                  <SkyMenuItem onClick={handleDownloadFile}>
                    <StyledListItemIcon>
                        <DownloadOutlined />
                    </StyledListItemIcon>
                    <SkyListItem>Tải xuống</SkyListItem>
                  </SkyMenuItem>
                </SkyMenu>
              </>
            ) : (
              <JobUploadPlaceholderBox>
                <JobPlaceholderText variant="body2">Chưa có tài liệu đính kèm mẫu.</JobPlaceholderText>
              </JobUploadPlaceholderBox>
            )}
            </BoderBox>
  
          </StyledBoxContainerContent>
        </SkyStyleBox>
      </Grid>

      <CustomDialog
        open={isConfirmDialogOpen}
        onClose={handleCancelUpload}
        onSave={handleConfirmUploadAction}
        title="Xác nhận tải lên"
        titleButton="Tiếp tục"
        cancelButtonText="Hủy"
        size="sm"
      >
        Phát hiện tệp trùng tên. Tiếp tục?
      </CustomDialog>

      <CustomDialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onSave={handleDeleteFile}
        title="Xác nhận xóa"
        type="delete"
        size="sm"
      >
        Bạn có muốn xóa tài liệu này khỏi mẫu không?
       </CustomDialog>

      <FileViewerDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        fileUrl={viewingFile.url}
        fileName={viewingFile.name}
        fileType={viewingFile.type}
        title={`Xem file: ${viewingFile.name}`}
      />
    </Dialog>
  );
};

export default withSharedComponents(UpdateJobDialog);
