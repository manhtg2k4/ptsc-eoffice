/* eslint-disable camelcase */
import { useToast } from '@components/common/ToastProvider';
import CustomButtonOutline from '@components/CustomButtonOutline';
import { CustomDialog, FileViewerDialog } from '@components/CustomDialog'
import CustomInput from '@components/CustomInput/CustomInputBase';
import FileTreeTable from '@components/FileTreeTable';
import LoadingDialog from '@components/LoadingDialog';
import { API_MERGE_LINK, API_XLSX_TO_PDF, APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import * as XLSX from "xlsx";
import { AttachFile, DeleteOutlined, Description, DownloadOutlined, Folder, VisibilityOutlined } from '@mui/icons-material';
import { Box, ListItemText, Menu, MenuItem, styled, Typography } from '@mui/material'
import { formatFileSize, generateDuplicateName, UPLOAD_LIMITS_PER_BATCH, UPLOAD_LIMITS_PER_FILE, UPLOAD_LIMITS_PER_FOLDER, UPLOAD_LIMITS_PER_TASK, validateFileExtension, validateFileName } from '@pages/WorkManagement/components/constants';
import { StyledBoxContainerContent, StyledListItemIcon, StyledMenuIcon } from '@pages/WorkManagement/components/Job.styles';
import api from '@services/api';
import { apiUploadFile } from '@services/FileUpload/fileUpload';
import axiosInstance from '@utils/axiosInstance';
import { convertFilesToTreeData } from '@utils/utils';
import PropTypes from 'prop-types'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux';
import { SkyGrid } from '@styles/SkyStyles';
import LinkIcon from "@mui/icons-material/Link";


const StyledDescriptionIcon = styled(Description)(({ theme }) => ({
    color: theme.palette.primary.main,
}));

const StyledApproveContent = styled(StyledBoxContainerContent)(({ theme }) => ({
    marginTop: theme.spacing(2),
}));

const InfoItemContainer = styled(Box)(({ theme }) => ({
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
}));

const IconWrapper = styled(Box)(({ theme }) => ({
    marginTop: theme.spacing(0.3),
}));

const ContentWrapper = styled(Box)(() => ({
    flex: 1,
}));

const LabelTypography = styled(Typography)(({ theme }) => ({
    color: theme.palette.text.primary,
}));

const ValueTypography = styled(Typography)(() => ({
    // fontWeight: 500,
}));

export const JobSectionTitle = styled(Typography, {
    shouldForwardProp: (prop) => prop !== "mt",
})(({ theme, mt }) => ({
    marginTop: mt ? theme.spacing(mt) : theme.spacing(1),
    marginBottom: theme.spacing(1),
    color: theme.palette.text.primary,
    fontWeight: "bold",
}));


const LocalInfoItem = ({ icon, label, value }) => (
    <InfoItemContainer>
        {icon && <IconWrapper>{icon}</IconWrapper>}
        <ContentWrapper>
            <LabelTypography variant="subtitle1"><b>{label}</b></LabelTypography>
            <ValueTypography >{value || ""}</ValueTypography>
        </ContentWrapper>
    </InfoItemContainer>
);

export const JobButtonContainer = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    ...(theme.palette.mode === 'dark' && {
        '& .MuiButton-root': {
            color: 'white',
        },
    }),
}));


function SubmitApproval(props) {
    const { dataDetail, setReloadData, onCloseDialog, viewMode, typeAction, open = false, actionCode, onCloseAppBar, label } = props
    const currentTaskId = dataDetail?.id;
    const isSlowReason = dataDetail?.flags?.isSlowReason === true;
    const [description, setDescription] = useState('');
    const [finalDocuments, setFinalDocuments] = useState([]);
    const { dataUser } = useSelector((state) => state.auth || {});
    const toast = useToast()
    const [isLoading, setIsLoading] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rload, setRload] = useState(null);
    const [viewingFile, setViewingFile] = useState({
        open: false,
        url: null,
        name: "",
        type: null,
    });
    const checkUpdateFolder = dataDetail?.flags?.canUpdateFolder || dataDetail?.flags?.canUpdateFolderFromDoc
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const [linkPopupOpen, setLinkPopupOpen] = useState(false);
    const [linkSection, setLinkSection] = useState("task"); // 'task' or 'final'
    const [linkErrors, setLinkErrors] = useState({ documentName: "", documentUrl: "" });
    const [linkFormValues, setLinkFormValues] = useState({ documentName: "", documentUrl: "" });

    const validateURL = useCallback((url) => {
        const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_.~+%=&]*)?$', 'i'); // fragment locator
        return !!pattern.test(url.trim());
    }, []);

    // Reset dữ liệu khi đóng dialog
    useEffect(() => {
        if (!open) {
            setDescription('');
            setFinalDocuments([]);
        }
    }, [open]);

    const handleCloseDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(false);
    }, []);


    const handleViewFile = async () => {
    handleMenuClose();
    if (!selectedFile) return;
    const fileId = selectedFile.id || selectedFile._id;
    if (!fileId) {
      toast("File không hợp lệ.", "warning");
      return;
    }
    setIsLoading(true);
    try {

      const fileName = selectedFile.file_name || selectedFile.name;
      const lower = fileName.toLowerCase();

      const isDoc = /\.(doc|docx)$/i.test(lower);
      const isExcel = /\.(xls|xlsx)$/i.test(lower);
      const isPpt = /\.(ppt|pptx)$/i.test(lower);
      const isOtherOffice = isPpt;
      const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

      if (selectedFile?.id || selectedFile?._id) {

        const fileId = selectedFile._id || selectedFile.id;

        let blob;
        let previewName = fileName;

        if (isDoc) {
          const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
          const res = await api.get(conversionApi, {
            responseType: "blob",
            timeout: 0,
          });
          blob = new Blob([res.data], { type: "application/pdf" });
          previewName = fileName;
        } else if (isExcel) {
          // Download file first
          const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
          const fileRes = await api.get(downloadUrl, {
            responseType: "blob",
            timeout: 0,
          });

          // Convert to PDF
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
          const res = await api.get(viewUrl, {
            responseType: "blob",
            timeout: 0,
          });
          blob = new Blob([res.data], {
            type: res.headers["content-type"] || res.data.type,
          });
        } else if (isOtherOffice) {
          const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
          const res = await api.get(viewUrl, {
            responseType: "blob",
            timeout: 0,
          });
          const arrayBuffer = await res.data.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const html = XLSX.utils.sheet_to_html(
            workbook.Sheets[workbook.SheetNames[0]]
          );
          blob = new Blob([html], { type: "text/html" });
          previewName = fileName;
        } else {
          throw new Error("Định dạng file không được hỗ trợ xem trước.");
        }

        const url = URL.createObjectURL(blob);
        setViewingFile({
          open: true,
          url: url,
          name: previewName,

        });

      }


            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            toast("Không thể tải file để xem trước.", "error");
        }
    };
    const handleOpenLinkPopup = useCallback((section = "task") => {
        setLinkSection(section);
        setLinkPopupOpen(true);
        setLinkFormValues({ documentName: "", documentUrl: "" });
        setLinkErrors({ documentName: "", documentUrl: "" });
    }, []);



    const handleOpenFinalLinkPopup = useCallback(() => handleOpenLinkPopup("final"), [handleOpenLinkPopup]);


    const handleDownloadFile = async () => {
        handleMenuClose();
        if (!selectedFile) return;
        const fileId = selectedFile.id || selectedFile._id;
        if (!fileId) return;

        try {
            setIsLoading(true);

            const isFolder = selectedFile?.type_file === 'Thư mục';
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
                const downloadName = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`;
                link.setAttribute('download', downloadName);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else {
                const blob = await axiosInstance.get(
                    `${APP_BASE}/api/files/download/${fileId}`,
                    { responseType: 'blob' }
                );

                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', fileName);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);
            }

            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            toast("Tải xuống thất bại!", "error");
        }
    };


    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedFile(null);
    };


    const handleMenuClick = useCallback((event, file) => {
        setAnchorEl(event.currentTarget);
        setSelectedFile(file);
    }, []);


    const hanldeChangeDescription = useCallback((e) => {
        setDescription(e.target.value);
    }, [])

    const refetchFiles = useCallback(async () => {
        if (!currentTaskId) return;
        const currentUserName = dataUser?.user?.name || dataUser?.name || "Người dùng";
        try {

            const [finalDoc, linksRes] = await Promise.all([
                axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=finaldocuments&object_id=${currentTaskId}`),
                axiosInstance.get(`${API_MERGE_LINK}?taskId=${currentTaskId}`)
            ]);

            const finalDocsData = finalDoc?.data?.data || finalDoc?.data || finalDoc || [];
            const linksDataRaw = linksRes?.data?.data || linksRes?.data || linksRes || [];
            const linksDataArray = Array.isArray(linksDataRaw) ? linksDataRaw : (linksDataRaw && typeof linksDataRaw === 'object' && Object.keys(linksDataRaw).length > 0 ? [linksDataRaw] : []);

            const linksData = linksDataArray.map(l => ({
                ...l,
                name: l.documentName,
                file_name: l.documentName,
                type_file: 'link',
                id: l._id || l.id,
                is_uploader: !!l.isCreator,
                from_source: l.createdByName || l.userName || l.created_by_name || l.fullName || (l.isCreator ? currentUserName : ""),
                source_type: 'link',
                hideMenu: true
            }));

            const filteredLinks = linksData.filter(l => l.objectType === 'finaldocuments');
            const mergedDocs = Array.isArray(finalDocsData) ? [...finalDocsData, ...filteredLinks] : filteredLinks;
            
            setFinalDocuments(mergedDocs);

        } catch (error) {
            // eslint-disable-next-line no-undef
            if (typeof logger !== 'undefined') logger.error("Không thể tải danh sách tệp đính kèm.", error);
            toast("Không thể tải danh sách tệp đính kèm.", "error");
        }
    }, [currentTaskId, toast, dataUser]);

    const handleFileUpload = async (event, objectType) => {
        const files = Array.from(event.target.files);
        const id = currentTaskId;
        if (!files.length || !id) return;

        // === VALIDATION 1: Kiểm tra số lượng file/folder theo BATCH ===
        const isFolderUpload = files.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));

        if (isFolderUpload) {
            // Kiểm tra giới hạn folder/lần
            const folderCount = new Set(files.map(f => f.webkitRelativePath.split('/')[0])).size;
            if (folderCount > UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS) {
                toast(`Chỉ được tải tối đa ${UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS} folder/lần`, "error");
                event.target.value = null;
                return;
            }
        } else {
            // Kiểm tra giới hạn file/lần
            if (files.length > UPLOAD_LIMITS_PER_BATCH.MAX_FILES) {
                toast(`Vượt quá ${UPLOAD_LIMITS_PER_BATCH.MAX_FILES} file/lần tải lên. Hiện tại: ${files.length} file`, "error");
                event.target.value = null;
                return;
            }
        }

        // === VALIDATION 2: Kiểm tra giới hạn theo CÔNG VIỆC ===
        // Tính tổng số đính kèm hiện có (cả taskDocuments và finalDocuments)
        const currentAttachments = [...finalDocuments];
        const currentTotalCount = currentAttachments.length;

        // Tính tổng dung lượng hiện có
        const currentTotalSize = currentAttachments.reduce((sum, file) => {
            const fileSize = parseInt(file.file_size || 0, 10);
            return sum + fileSize;
        }, 0);

        // Tính dung lượng file mới
        const newFilesSize = files.reduce((sum, file) => sum + file.size, 0);

        // Tính số items mới (folder upload = 1 item, files = số lượng file)
        const newItemsCount = isFolderUpload ? 1 : files.length;

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

        // Kiểm tra tổng dung lượng
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
            const totalFolderSize = files.reduce((sum, file) => sum + file.size, 0);
            if (totalFolderSize > UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE) {
                toast(
                    `Folder vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE)}. ` +
                    `Kích thước hiện tại: ${formatFileSize(totalFolderSize)}`
                    , "error"
                );
                event.target.value = null;
                return;
            }

            // Kiểm tra số lượng file trong folder
            if (files.length > UPLOAD_LIMITS_PER_FOLDER.MAX_FILES) {
                toast(`Folder chứa quá nhiều file (${files.length}). Giới hạn: ${UPLOAD_LIMITS_PER_FOLDER.MAX_FILES} file`, "error");
                event.target.value = null;
                return;
            }

            // Kiểm tra từng file trong folder
            for (const file of files) {
                // Kiểm tra kích thước từng file
                if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
                    toast(
                        `File "${file.name}" vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FILE.MAX_SIZE)}. ` +
                        `Kích thước: ${formatFileSize(file.size)}`
                        , "error"
                    );
                    event.target.value = null;
                    return;
                }

                // Validate tên file
                const nameValidation = validateFileName(file.name);
                if (!nameValidation.valid) {
                    toast(`File "${file.name}": ${nameValidation.message}`, "error");
                    event.target.value = null;
                    return;
                }

                // Validate extension
                const extValidation = validateFileExtension(file.name);
                if (!extValidation.valid) {
                    toast(`File "${file.name}": ${extValidation.message}`, "error");
                    event.target.value = null;
                    return;
                }
            }
        } else {
            // Upload file đơn lẻ - kiểm tra từng file
            for (const file of files) {
                // Kiểm tra kích thước file
                if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
                    toast(
                        `File "${file.name}" vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FILE.MAX_SIZE)}. ` +
                        `Kích thước: ${formatFileSize(file.size)}`
                        , "error"
                    );
                    event.target.value = null;
                    return;
                }

                // Validate tên file
                const nameValidation = validateFileName(file.name);
                if (!nameValidation.valid) {
                    toast(`File "${file.name}": ${nameValidation.message}`, "error");
                    event.target.value = null;
                    return;
                }

                // Validate extension
                const extValidation = validateFileExtension(file.name);
                if (!extValidation.valid) {
                    toast(`File "${file.name}": ${extValidation.message}`, "error");
                    event.target.value = null;
                    return;
                }
            }
        }

        // Set loading state
        setIsLoading(true);

        await new Promise(resolve => setTimeout(resolve, 0));

        try {
            if (isFolderUpload) {
                const createdFolders = {};

                for (const file of files) {
                    const relativePath = file.webkitRelativePath;
                    const pathParts = relativePath.split("/");
                    const folderParts = pathParts.slice(0, -1);

                    let parentId = null;
                    let currentPath = "";

                    for (const folderName of folderParts) {
                        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

                        if (createdFolders[currentPath]) {
                            parentId = createdFolders[currentPath];
                        } else {
                            // === XỬ LÝ TRÙNG TÊN FOLDER ===
                            // Lấy danh sách tên folder hiện có (cùng parentId)
                            const existingFoldersInParent = currentAttachments
                                .filter(f => {
                                    const isFolder = f.is_directory === 1 || f.type_file === 'Thư mục';
                                    const folderParentId = f.parent_id?.toString() || null;
                                    const targetParentId = parentId?.toString() || null;
                                    return isFolder && folderParentId === targetParentId;
                                })
                                .map(f => f.file_name || f.name);

                            // Kiểm tra và đổi tên nếu trùng
                            let finalFolderName = folderName;
                            if (existingFoldersInParent.includes(finalFolderName)) {
                                finalFolderName = generateDuplicateName(finalFolderName, existingFoldersInParent);
                            }

                            const folderPayload = {
                                objectType: objectType,
                                objectId: id,
                                name: finalFolderName,
                                folderName: finalFolderName,
                                parentId: parentId,
                            };

                            const response = await axiosInstance.post(`${APP_BASE}/api/files/folder`, folderPayload);
                            const resData = response.data || response;
                            const newFolderId = resData.id || resData._id;

                            createdFolders[currentPath] = newFolderId;
                            parentId = newFolderId;
                        }
                    }

                    const formData = new FormData();

                    // === XỬ LÝ TRÙNG TÊN FILE ===
                    // Lấy danh sách tên file hiện có trong công việc (cùng parentId)
                    const existingFilesInParent = currentAttachments
                        .filter(f => {
                            const fileParentId = f.parent_id?.toString() || null;
                            const targetParentId = parentId?.toString() || null;
                            return fileParentId === targetParentId;
                        })
                        .map(f => f.file_name || f.name);

                    // Kiểm tra và đổi tên nếu trùng
                    let finalFileName = file.name;
                    if (existingFilesInParent.includes(finalFileName)) {
                        finalFileName = generateDuplicateName(finalFileName, existingFilesInParent);
                    }

                    // Tạo File object mới với tên đã đổi (nếu cần)
                    const fileToUpload = finalFileName !== file.name
                        ? new File([file], finalFileName, { type: file.type })
                        : file;

                    formData.append("file", fileToUpload);
                    formData.append("object_type", objectType);
                    formData.append("object_id", id);
                    if (parentId) {
                        formData.append("parent_id", parentId);
                    }

                        await axiosInstance.post(`${APP_BASE}/api/files/upload`, formData, {
                            headers: { "Content-Type": "multipart/form-data" },
                        });
                    }
                    setRload(new Date());

            } else {
                // Upload file đơn lẻ
                for (const file of files) {
                    // === XỬ LÝ TRÙNG TÊN FILE ===
                    // Lấy danh sách tên file hiện có (không có parent)
                    const existingFilesAtRoot = currentAttachments
                        .filter(f => !f.parent_id)
                        .map(f => f.file_name || f.name);

                    // Kiểm tra và đổi tên nếu trùng
                    let finalFileName = file.name;
                    if (existingFilesAtRoot.includes(finalFileName)) {
                        finalFileName = generateDuplicateName(finalFileName, existingFilesAtRoot);
                    }

                    // Tạo File object mới với tên đã đổi (nếu cần)
                    const fileToUpload = finalFileName !== file.name
                        ? new File([file], finalFileName, { type: file.type })
                        : file;

                    await apiUploadFile(fileToUpload, objectType, id);
                }
                setRload(new Date());
            }
            toast("Tải lên tài liệu thành công!", "success");
            await refetchFiles();
            setReloadData?.();

        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
        } finally {
            setIsLoading(false);
            event.target.value = null;
        }
    };

    const handleFinalDocumentsUpload = (e) => handleFileUpload(e, "finaldocuments");

    const handleDynamicFileMenuClick = useCallback((event) => {
        const fileId = event.currentTarget.dataset.fileId;
        const isFolder = event.currentTarget.dataset.isFolder === "1";
        const allFiles = [...finalDocuments];
        const file = allFiles.find(f => (f.id || f._id).toString() === fileId);
        if (file) {
            handleMenuClick(event, { ...file, name: file.file_name || file.name, isFolder });
        }
    }, [handleMenuClick, finalDocuments]);



    const handleOpenDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(true);
        setAnchorEl(null);
    }, []);



    const handleDeleteFile = async () => {
        if (!selectedFile) return;
        const fileId = selectedFile.id || selectedFile._id;
        if (!fileId) return;

        try {
            await axiosInstance.delete(`${APP_BASE}/api/files/${fileId}`);
            toast("Xóa file thành công!", "success");
            setReloadData?.();
            setRload(new Date());
        } catch (error) {
            toast("Xóa file thất bại!", "error");

        } finally {
            setIsDeleteDialogOpen(false);
        }
    };

    const handleCloseFileViewer = useCallback(() => {
        if (viewingFile.url) URL.revokeObjectURL(viewingFile.url);
        setViewingFile({ open: false, url: null, name: "", type: null });
    }, [viewingFile.url]);


    // Tự động tải lại danh sách file khi mở dialog Phê duyệt
    useEffect(() => {
        if (open) {
            refetchFiles();
        }
    }, [open, rload, refetchFiles]);

    const treeData = useMemo(() => {
        return convertFilesToTreeData(finalDocuments);
    }, [finalDocuments]);



    const handleConfirmAction = async () => {
        const id = currentTaskId;
        if (!id) return;
        try {
            setIsLoading(true);
            const checkApi = viewMode === 'meeting' ? `${APP_BASE}/api/tasks/send-approval-form-meeting` : viewMode === 'jobGeneral' ? `${APP_BASE}/api/tasks/send-approval` : `${APP_BASE}/api/tasks/send-approval-form-doc`;
            
            if (isSlowReason) {
                await axiosInstance.post(`${APP_BASE}/api/task/${id}/comments`, {
                    type: "slowReason",
                    content: description,
                    fileId: [],
                    mentionIds: []
                });
            }

            await axiosInstance.post(checkApi, {
                note: description,
                taskId: id,
                actionCode: actionCode,
            });
            toast(`Đã gửi phê duyệt công việc thành công`, "success");
            setIsLoading(false);
            setReloadData?.(new Date());
            onCloseDialog?.();
            onCloseAppBar?.()
        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
            setIsLoading(false);
        }
    };


    const handleCloseLinkPopup = useCallback(() => {
        setLinkPopupOpen(false);
        setLinkErrors({ documentName: "", documentUrl: "" });
    }, []);

    const handleSaveLink = useCallback(async () => {
        const errors = { documentName: "", documentUrl: "" };
        let hasError = false;

        if (!linkFormValues.documentName.trim()) {
            errors.documentName = "Vui lòng nhập tên tài liệu";
            hasError = true;
        }
        if (!linkFormValues.documentUrl.trim()) {
            errors.documentUrl = "Vui lòng nhập đường dẫn tài liệu";
            hasError = true;
        } else if (!validateURL(linkFormValues.documentUrl)) {
            errors.documentUrl = "Đường dẫn tài liệu không hợp lệ.";
            hasError = true;
        }

        if (hasError) {
            setLinkErrors(errors);
            return;
        }
        const id = currentTaskId;
        if (!id) return;
        setIsLoading(true);
        try {
            await axiosInstance.post(API_MERGE_LINK, {
                taskId: String(id),
                documentName: linkFormValues.documentName,
                documentUrl: linkFormValues.documentUrl,
                objectType: linkSection === "task" ? "taskdocuments" : "finaldocuments"
            });
            toast("Gắn link thành công!", "success");
            await refetchFiles();
            setReloadData?.();
            setRload(new Date());

            handleCloseLinkPopup();
        } catch (error) {
            toast("Gắn link thất bại!", "error");
        } finally {
            setIsLoading(false);
        }
    }, [linkFormValues, currentTaskId, toast, refetchFiles, handleCloseLinkPopup, linkSection, validateURL, setReloadData]);


    const handleLinkNameChange = useCallback((e) => {
        setLinkFormValues(prev => ({ ...prev, documentName: e.target.value }));
        if (e.target.value.trim()) {
            setLinkErrors(prev => ({ ...prev, documentName: "" }));
        }
    }, []);

    const handleLinkUrlChange = useCallback((e) => {
        const url = e.target.value;
        setLinkFormValues(prev => ({ ...prev, documentUrl: url }));
        if (url.trim()) {
            if (validateURL(url)) {
                setLinkErrors(prev => ({ ...prev, documentUrl: "" }));
            } else {
                setLinkErrors(prev => ({ ...prev, documentUrl: "Đường dẫn tài liệu không hợp lệ." }));
            }
        } else {
            setLinkErrors(prev => ({ ...prev, documentUrl: "" }));
        }
    }, [validateURL]);

    return (
        <>
            <CustomDialog
                open={open}
                onClose={onCloseDialog}
                title={label || 'TRÌNH PHÊ DUYỆT'}
                onSave={handleConfirmAction}
                isLoading={isLoading}
                titleButton={typeAction === 'approvetaskformdoc' ? 'TRÌNH PHÊ DUYỆT' : 'PHẢN HỒI'}
                disabled={typeAction === 'approvetaskformdoc' ? false : !description}
                cancelButtonText="ĐÓNG"
            >
                <Box>
                    <LocalInfoItem
                        icon={<StyledDescriptionIcon />}
                        label="Tên công việc"
                        value={dataDetail?.name}
                    />
                    {isSlowReason && (
                        <JobSectionTitle variant="h6" gutterBottom>
                            Nhập lý do chậm tiến độ <span style={{ color: 'red' }}>*</span>
                        </JobSectionTitle>
                    )}
                    <CustomInput
                        value={description}
                        multiline
                        rows={4}
                        placeholder={isSlowReason ? "Nhập lý do chậm tiến độ..." : "Nhập mô tả..."}
                        onChange={hanldeChangeDescription}

                    />

                    {typeAction === 'approvetaskformdoc' &&
                        <>
                            <StyledApproveContent>
                                <JobSectionTitle variant="h6" gutterBottom>
                                    TÀI LIỆU KẾT QUẢ
                                </JobSectionTitle>

                                {checkUpdateFolder && <JobButtonContainer>
                                    <CustomButtonOutline component="label" startIcon={<AttachFile />}>
                                        TẢI FILE
                                        <input type="file" hidden multiple onChange={handleFinalDocumentsUpload} />
                                    </CustomButtonOutline>
                                    <CustomButtonOutline component="label" startIcon={<Folder />}>
                                        TẢI FOLDER
                                        <input
                                            type="file"
                                            hidden
                                            multiple
                                            webkitdirectory=""
                                            onChange={handleFinalDocumentsUpload}
                                        />
                                    </CustomButtonOutline>
                                    <CustomButtonOutline onClick={handleOpenFinalLinkPopup} startIcon={<LinkIcon />}>
                                        Gắn Link
                                    </CustomButtonOutline>
                                </JobButtonContainer>}

                                <FileTreeTable
                                    data={treeData}
                                    onFileMenuClick={handleDynamicFileMenuClick}
                                    MenuIcon={StyledMenuIcon}
                                />
                            </StyledApproveContent>
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                            >
                                {selectedFile && !selectedFile.isFolder && (
                                    <MenuItem onClick={handleViewFile}>
                                        <StyledListItemIcon>
                                            <VisibilityOutlined />
                                        </StyledListItemIcon>
                                        <ListItemText>Xem</ListItemText>
                                    </MenuItem>
                                )}
                                <MenuItem onClick={handleOpenDeleteDialog}>
                                    <StyledListItemIcon>
                                        <DeleteOutlined />
                                    </StyledListItemIcon>
                                    <ListItemText>Xóa</ListItemText>

                                </MenuItem>
                                <MenuItem onClick={handleDownloadFile}>
                                    <StyledListItemIcon>
                                        <DownloadOutlined />
                                    </StyledListItemIcon>
                                    <ListItemText>Tải xuống</ListItemText>
                                </MenuItem>
                            </Menu>
                        </>
                    }

                </Box>


                <LoadingDialog open={isLoading} >
                    Đang tải tài liệu, vui lòng đợi...
                </LoadingDialog>
                <CustomDialog
                    open={isDeleteDialogOpen}
                    onClose={handleCloseDeleteDialog}
                    onSave={handleDeleteFile}
                    title="Xác nhận xóa"
                    type="delete"
                    size="sm"
                    isLoading={isLoading}
                >
                    Bạn có muốn xóa không?
                </CustomDialog>

                <FileViewerDialog
                    open={viewingFile.open}
                    onClose={handleCloseFileViewer}
                    fileUrl={viewingFile.url}
                    fileName={viewingFile.name}
                    fileType={viewingFile.type}
                    title={`Xem file: ${viewingFile.name}`}
                />
            </CustomDialog>
            <CustomDialog
                open={linkPopupOpen}
                onClose={handleCloseLinkPopup}
                onSave={handleSaveLink}
                title="Gắn link tài liệu"
                titleButton="Lưu"
                disabled={!linkFormValues.documentName.trim() || !linkFormValues.documentUrl.trim() || !!linkErrors.documentUrl}
            >
                <SkyGrid container spacing={2}>
                    <SkyGrid item xs={12}>
                        <CustomInput
                            label={<>Tên link <span style={{ color: 'red' }}>*</span></>}
                            placeholder="Ví dụ: Báo cáo tháng 1"
                            fullWidth
                            value={linkFormValues.documentName}
                            onChange={handleLinkNameChange}
                            error={!!linkErrors.documentName}
                            helperText={linkErrors.documentName}
                        />
                    </SkyGrid>
                    <SkyGrid item xs={12}>
                        <CustomInput
                            label={<>Đường dẫn link <span style={{ color: 'red' }}>*</span></>}
                            placeholder="Ví dụ: https://docs.google.com/document/d/..."
                            fullWidth
                            value={linkFormValues.documentUrl}
                            onChange={handleLinkUrlChange}
                            error={!!linkErrors.documentUrl}
                            helperText={linkErrors.documentUrl}
                        />
                    </SkyGrid>
                </SkyGrid>
            </CustomDialog>

        </>
    )
}

SubmitApproval.propTypes = {
    dataDetail: PropTypes.object,
    setReloadData: PropTypes.func,
    onClose: PropTypes.func,
    viewMode: PropTypes.string
}

SubmitApproval.displayName = 'SubmitApproval'

export default memo(SubmitApproval)
