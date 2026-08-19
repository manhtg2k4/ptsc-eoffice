/* eslint-disable camelcase */
import { yupResolver } from '@hookform/resolvers/yup';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { defaultValues, schema, weekDays, weekdayOptions, weekOfMonthOptions, monthInQuarterOptions } from './constant';
import Swipper from '@components/Swipper/BaseSwiper';
import CustomInputBase from '@components/CustomInput/CustomInputBase';
import DateTimeRangePicker from '@components/CustomDateTimePicker';
import {
    JobButtonContainer,
    JobMainContent,
    JobSectionHeader,
    JobSectionTitle,
    StyledBoxContainerContent,
    StyledListItemIcon,
    StyledMenuIcon,
    UploadDropZone,
    BoldSkyFormControlLabel,
    ParticipantInfoContainer,
    SkyFlexGap16Center,
    StytedDescriptionIcon,
    StytedPeopleIcon
} from '@pages/WorkManagement/components/Job.styles';
import { SkyBox, SkyFlexGap8, SkyGrid, SkyListItemText, SkyMenu, SkyMenuItem, SkyRadio, SkyCheckbox } from '@styles/SkyStyles';
import { useSelector } from 'react-redux';
import {
    API_XLSX_TO_PDF,
    APP_BASE,
    API_MERGE_LINK
} from '@EnvironmentFile/constants/urlConfig';
import FileTreeTable from '@components/FileTreeTable';
import { AttachFile, DeleteOutline, DownloadOutlined, Edit, Folder, VisibilityOutlined, Link as LinkIcon } from '@mui/icons-material';
import { useToast } from '@components/common/ToastProvider';
import { formatFileSize, generateDuplicateName, truncateFileName, UPLOAD_LIMITS_PER_BATCH, UPLOAD_LIMITS_PER_FILE, UPLOAD_LIMITS_PER_FOLDER, UPLOAD_LIMITS_PER_TASK, validateFileExtension, validateFileName } from '@pages/WorkManagement/components/constants';
import { CustomDialog } from '@components/CustomDialog';
import DOMPurify from "dompurify";
import LoadingDialog from '@components/LoadingDialog';
import { InlineGroup, NarrowInputWrapper, RadioContainer, StyledFormControlLabel, StyledRadioGroup, StyleSkyBox, StyleSkyBoxContainer, StyleTypography } from './styles';
import UpdateRepetiviveWork from './UpdateRepetiviveWork';
import axiosInstance from '@utils/axiosInstance';
import dayjs from 'dayjs';
import { apiUploadFile } from '@services/FileUpload/fileUpload';
import PauseRepetivePopup from './PauseRepetivePopup';
import FinalRepetinviWork from './FinalRepetinviWork';
import ContinueRepetiviWork from './ContinueRepetiviWork';
import api from '@services/api';
import * as XLSX from "xlsx";
import FilePreviewDialog from '@components/UploadFile/components/FilePreviewDialog';
import withFormWrapper from '@components/common/FormWrapper';
import { StyledIconWrapper } from '@pages/ProjectManager/components/AddProject.styles';
import CustomAsyncAutoComplete from '@components/CustomAsyncAutoComplete';
const ButtonOutline = React.lazy(() => import("@components/CustomButtonOutline"));

const ViewRepetitiveWork = (props) => {
    const { open, onClose, data, setReloadData } = props;
    const {
        control,
        reset,
        watch
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: defaultValues
    });
    const { dataUser: authUser } = useSelector((state) => state.auth || {});
    const userData = authUser || {};


    const { crmSource } = useSelector((state) => state.config);
    const optionModeOfWork =
        crmSource.find((item) => item.code === "CONGVIECDUOCLAPLAI")?.data || [];
    const urgencyOptions =
        crmSource.find((item) => item.code === "DOUUTIEN")?.data || [];
    const toast = useToast();
    const repeatTask = watch("repetitiveTask");

    const [taskDocuments, setTaskDocuments] = React.useState([]);
    const [finalDocuments, setFinalDocuments] = React.useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDraggingTask, setIsDraggingTask] = useState(false);
    const [updateDialogState, setUpdateDialogState] = useState({
        open: false,
        type: null, // 'general' | 'participants'
    });
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const timeOptions =
        crmSource.find((item) => item.code === "S34")?.data || [];
    const topicOptions =
        crmSource.find((item) => item.code === "CDCV")?.data || [];
    const [dataDetail, setDataDetail] = useState([]);
    const [openDialog, setOpenDialog] = useState({
        pause: false,
        continue: false,
        finish: false,
    });
    const [viewingFile, setViewingFile] = useState({
        open: false,
        url: null,
        name: "",
        type: null,
    });

    const [linkPopupOpen, setLinkPopupOpen] = useState(false);
    const [linkSection, setLinkSection] = useState("task"); // 'task' or 'final'
    const [linkFormValues, setLinkFormValues] = useState({ documentName: "", documentUrl: "" });
    const [linkErrors, setLinkErrors] = useState({ documentName: "", documentUrl: "" });

    const validateURL = useCallback((url) => {
        const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_.~+%=&]*)?$', 'i'); // fragment locator (fixed to allow =)
        return !!pattern.test(url.trim());
    }, []);

    const handleOpenLinkPopup = useCallback((section = "task") => {
        setLinkSection(section);
        setLinkPopupOpen(true);
        setLinkFormValues({ documentName: "", documentUrl: "" });
        setLinkErrors({ documentName: "", documentUrl: "" });
    }, []);

    const handleOpenTaskLinkPopup = useCallback(() => handleOpenLinkPopup("task"), [handleOpenLinkPopup]);

    const handleCloseLinkPopup = useCallback(() => {
        setLinkPopupOpen(false);
        setLinkErrors({ documentName: "", documentUrl: "" });
    }, []);

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

    const refetchFiles = useCallback(async () => {
        const currentTaskId = data?._id || data?.id;
        if (!currentTaskId) return;
        const id = currentTaskId;
        try {
            const currentUserName = userData?.user?.name || userData?.name || "Người dùng";

            const [taskDocsRes, finalDocsRes, linksRes] = await Promise.all([
                axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=taskdocuments&object_id=${id}`),
                axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=finaldocuments&object_id=${id}`),
                axiosInstance.get(`${API_MERGE_LINK}?taskId=${id}`)
            ]);

            const taskDocsData = taskDocsRes?.data?.data || taskDocsRes?.data || taskDocsRes || [];
            const finalDocsData = finalDocsRes?.data?.data || finalDocsRes?.data || finalDocsRes || [];
            const linksDataRaw = linksRes?.data?.data || linksRes?.data || linksRes || [];

            const linksDataArray = Array.isArray(linksDataRaw) ? linksDataRaw : (linksDataRaw && typeof linksDataRaw === 'object' && Object.keys(linksDataRaw).length > 0 ? [linksDataRaw] : []);

            /* eslint-disable camelcase */
            const linksData = linksDataArray.map(l => ({
                ...l,
                name: l.documentName,
                file_name: l.documentName,
                type_file: 'link',
                id: l._id || l.id,
                is_uploader: !!l.isCreator,
                from_source: l.createdByName || l.userName || l.created_by_name || l.fullName || (l.isCreator ? currentUserName : ""),
                source_type: 'link'
            }));
            /* eslint-enable camelcase */

            setTaskDocuments(Array.isArray(taskDocsData) ? [...taskDocsData, ...linksData.filter(l => !l.objectType || l.objectType === 'taskdocuments')] : linksData.filter(l => !l.objectType || l.objectType === 'taskdocuments'));
            setFinalDocuments(Array.isArray(finalDocsData) ? [...finalDocsData, ...linksData.filter(l => l.objectType === 'finaldocuments')] : linksData.filter(l => l.objectType === 'finaldocuments'));
        } catch (error) {
            logger.error("Không thể tải danh sách tệp đính kèm.", error);
            toast(error?.response?.data?.message || "Lấy danh sách tệp đính kèm thất bại!", "error");
        }
    }, [data, toast, authUser]);

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

        const id = data?.id || data?._id;
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
            refetchFiles();
            handleCloseLinkPopup();
        } catch (error) {
            toast("Gắn link thất bại!", "error");
        } finally {
            setIsLoading(false);
        }
    }, [linkFormValues, data, toast, refetchFiles, handleCloseLinkPopup, linkSection, validateURL]);
    const handleOpenDialog = useCallback((type) => {
        setOpenDialog({
            pause: false,
            continue: false,
            finish: false,
            [type]: true
        });
    }, []);

    const handleCloseDialog = useCallback((type) => {
        setOpenDialog((prev) => ({ ...prev, [type]: false }));
    }, []);


    // Tìm tất cả node con (recursively) trong flattened array
    const findAllChildren = useCallback((nodes, parentId, result = []) => {
        nodes.forEach((node) => {
            if (node.parent_id === parentId) {
                result.push(node);
                // Tìm tiếp các node con của node này
                findAllChildren(nodes, node.id || node._id, result);
            }
        });
        return result;
    }, []);

    // Xử lý click menu từ FileTreeTable

    const handleMenuClick = useCallback((event, file) => {
        setAnchorEl(event.currentTarget);
        setSelectedFile(file);
    }, []);


    const handleDynamicFileMenuClick = useCallback((event) => {
        const fileId = event.currentTarget.dataset.fileId;
        const isFolder = event.currentTarget.dataset.isFolder === "1";
        const allFiles = [...taskDocuments, ...finalDocuments];
        const file = allFiles.find(f => (f.id || f._id).toString() === fileId);
        if (file) {
            handleMenuClick(event, { ...file, name: file.file_name || file.name, isFolder });
        }
    }, [handleMenuClick, taskDocuments, finalDocuments]);
    // Đóng menu


    // Xử lý xóa file
    const handleDeleteFile = async () => {
        if (!selectedFile) return;
        const fileId = selectedFile.id || selectedFile._id;
        if (!fileId) return;

        try {
            if (selectedFile?.type_file === 'link') {
                await axiosInstance.delete(`${API_MERGE_LINK}/${fileId}`);
                toast("Xóa link thành công!", "success");
            } else {
                await axiosInstance.delete(`${APP_BASE}/api/files/${fileId}`);
                toast("Xóa file thành công!", "success");
            }
            refetchFiles();
        } catch (error) {
            toast(error?.response?.data?.message || "Xóa thất bại!", "error");
        } finally {
            setIsDeleteDialogOpen(false);
        }
    };

    const handleOpenDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(true);
        setAnchorEl(null);
    }, []);

    const handleCloseDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(false);
    }, []);





    const handleOpenUpdateDialog = useCallback((type) => {
        setUpdateDialogState({ open: true, type });
    }, []);



    const handleOpenUpdateGeneralDialog = useCallback(() => {
        handleOpenUpdateDialog('general');
    }, [handleOpenUpdateDialog]);

    const handleOpenUpdateParticipantsDialog = useCallback(() => {
        handleOpenUpdateDialog('participants');
    }, [handleOpenUpdateDialog]);

    const handleCloseUpdateDialog = () => {
        setUpdateDialogState({ open: false, type: null });
    };

    const fetchData = useCallback(async () => {
        const id = data?.id || data?._id;
        try {
            setIsLoading(true);
            const response = await axiosInstance.get(`${APP_BASE}/api/tasks/recurring/${id}`);
            if (response) {
                const transformedData = {
                    ...response,
                   
                    startTime: response.startTime
                        ? (() => {
                            // Check if HH:mm format
                            if (typeof response.startTime === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(response.startTime)) {
                                const [hours, minutes] = response.startTime.split(':');
                                return dayjs().set('hour', hours).set('minute', minutes).set('second', 0).toDate();
                            }
                            // Convert GMT string "Sat, 07 Feb 2026 19:15:00 GMT" to Date object
                            const dateFromGMT = new Date(response.startTime);
                            return dayjs(dateFromGMT).isValid() ? dayjs(dateFromGMT).toDate() : response.startTime;
                        })()
                        : response?.startTime,


                    templateName: response.templateName || null,
                    isApprovalRequired: !!response.isApprovalRequired,
                };

                // Xử lý logic cho tháng: map executionType sang monthPattern
                if (response.repetitiveTask === 'thang') {
                    if (response.executionType === 'relative_day') {
                        // Trường hợp: Vào Thứ X, Tuần Y của tháng
                        transformedData.monthPattern = 'weekday';
                        transformedData.monthWeekday = response.relativeDay; // 0-6
                        transformedData.monthWeekPosition = response.relativeWeek; // 'first', 'last', etc.
                    } else if (response.executionType === 'specific_day') {
                        // Trường hợp: Vào ngày X của tháng
                        transformedData.monthPattern = 'dayOfMonth';
                        transformedData.monthDay = response.dayOfMonth; // 1-31
                    } else if (response.executionType === 'last_day') {
                        // Trường hợp: Vào ngày cuối cùng của tháng
                        transformedData.monthPattern = 'lastDay';
                    }
                }

                // Xử lý logic cho quý: map monthInQuarter sang quarterMonth và executionType sang quarterPattern
                if (response.repetitiveTask === 'quy') {
                    transformedData.quarterMonth = response.monthInQuarter || 1;

                    if (response.executionType === 'relative_day') {
                        // Trường hợp: Vào Thứ X, Tuần Y của tháng trong quý
                        transformedData.quarterPattern = 'weekday';
                        transformedData.quarterWeekday = response.relativeDay; // 0-6
                        transformedData.quarterWeekPosition = response.relativeWeek; // 'first', 'last'
                    } else if (response.executionType === 'specific_day') {
                        // Trường hợp: Vào ngày X của tháng trong quý
                        transformedData.quarterPattern = 'dayOfMonth';
                        transformedData.quarterDay = response.dayOfMonth; // 1-31
                    } else if (response.executionType === 'last_day') {
                        // Trường hợp: Vào ngày cuối cùng của tháng trong quý
                        transformedData.quarterPattern = 'lastDay';
                    }
                }

                reset(transformedData);
                setDataDetail(transformedData);
                setIsLoading(false);
            }
        } catch (error) {
            setIsLoading(false);
            toast(error?.response?.data?.message || "Lấy chi tiết công việc thất bại!", "error");
        } finally {
            setIsLoading(false);
        }
    }, [data, reset, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    useEffect(() => {
        refetchFiles();
    }, [refetchFiles]);

    const getFilesFromEntries = useCallback(async (items) => {
        const files = [];
        const readEntry = async (entry, path = "") => {
            if (entry.isFile) {
                const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
                try {
                    Object.defineProperty(file, "webkitRelativePath", {
                        value: path ? `${path}/${file.name}` : file.name,
                        writable: false,
                        configurable: true,
                    });
                } catch (e) {
                    file.customRelativePath = path ? `${path}/${file.name}` : file.name;
                }
                files.push(file);
            } else if (entry.isDirectory) {
                const dirReader = entry.createReader();
                const entriesInDir = await new Promise((resolve, reject) => {
                    let allEntries = [];
                    const readMore = () => {
                        dirReader.readEntries((results) => {
                            if (results.length) {
                                allEntries = allEntries.concat(results);
                                readMore();
                            } else {
                                resolve(allEntries);
                            }
                        }, reject);
                    };
                    readMore();
                });
                for (const childEntry of entriesInDir) {
                    await readEntry(childEntry, path ? `${path}/${entry.name}` : entry.name);
                }
            }
        };

        const entries = [];
        for (let i = 0; i < items.length; i++) {
            const entry = items[i].webkitGetAsEntry();
            if (entry) entries.push(entry);
        }

        for (const entry of entries) {
            await readEntry(entry);
        }
        return files;
    }, []);

    const processFilesUpload = useCallback(async (files, objectType) => {
        const id = data?.id || data?._id;
        if (!files.length || !id) return;

        // === VALIDATION 1: Kiểm tra số lượng file/folder theo BATCH ===
        const isFolderUpload = files.some((f) => (f.webkitRelativePath && f.webkitRelativePath.includes("/")) || f.customRelativePath);

        if (isFolderUpload) {
            const folderPaths = files.map(f => (f.webkitRelativePath || f.customRelativePath).split('/')[0]);
            const folderCount = new Set(folderPaths).size;
            if (folderCount > UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS) {
                toast(`Chỉ được tải tối đa ${UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS} folder/lần`, "error");
                return;
            }
        } else {
            if (files.length > UPLOAD_LIMITS_PER_BATCH.MAX_FILES) {
                toast(`Vượt quá ${UPLOAD_LIMITS_PER_BATCH.MAX_FILES} file/lần tải lên. Hiện tại: ${files.length} file`, "error");
                return;
            }
        }

        // === VALIDATION 2: Kiểm tra giới hạn theo CÔNG VIỆC ===
        const allAttachments = [...taskDocuments, ...finalDocuments];
        const targetDocuments = objectType === "taskdocuments" ? taskDocuments : finalDocuments;

        const currentTotalCount = allAttachments.length;
        const currentTotalSize = allAttachments.reduce((sum, file) => sum + parseInt(file.file_size || 0, 10), 0);
        const newFilesSize = files.reduce((sum, file) => sum + file.size, 0);
        const newItemsCount = isFolderUpload ? 1 : files.length;

        if (currentTotalCount + newItemsCount > UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS) {
            toast(`Vượt quá giới hạn ${UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS} đính kèm/công việc.`, "error");
            return;
        }

        if (currentTotalSize + newFilesSize > UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE) {
            toast(`Vượt quá tổng dung lượng ${formatFileSize(UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE)}/công việc.`, "error");
            return;
        }

        // === VALIDATION 3: Kiểm tra kích thước file/folder ===
        if (isFolderUpload) {
            const totalFolderSize = files.reduce((sum, file) => sum + file.size, 0);
            if (totalFolderSize > UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE) {
                toast(`Folder vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE)}.`, "error");
                return;
            }
            if (files.length > UPLOAD_LIMITS_PER_FOLDER.MAX_FILES) {
                toast(`Folder chứa quá nhiều file (${files.length}).`, "error");
                return;
            }
        }

        for (const file of files) {
            if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
                toast(`File "${truncateFileName(file.name, 20)}" vượt quá giới hạn.`, "error");
                return;
            }
            const nameValidation = validateFileName(file.name);
            if (!nameValidation.valid) {
                toast(`File "${file.name}": ${nameValidation.message}`, "error");
                return;
            }
            const extValidation = validateFileExtension(file.name);
            if (!extValidation.valid) {
                toast(`File "${file.name}": ${extValidation.message}`, "error");
                return;
            }
        }

        setIsLoading(true);
        try {
            if (isFolderUpload) {
                const createdFolders = {};
                for (const file of files) {
                    const relativePath = file.webkitRelativePath || file.customRelativePath;
                    const pathParts = relativePath.split("/");
                    const folderParts = pathParts.slice(0, -1);
                    let parentId = null;
                    let currentPath = "";

                    for (const folderName of folderParts) {
                        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
                        if (createdFolders[currentPath]) {
                            parentId = createdFolders[currentPath];
                        } else {
                            const existingFoldersInParent = targetDocuments
                                .filter(f => (f.is_directory === 1 || f.type_file === 'Thư mục') && (f.parent_id?.toString() || null) === (parentId?.toString() || null))
                                .map(f => f.file_name || f.name);

                            let finalFolderName = folderName;
                            if (existingFoldersInParent.includes(finalFolderName)) {
                                finalFolderName = generateDuplicateName(finalFolderName, existingFoldersInParent);
                            }

                            const folderPayload = { objectType, objectId: id, name: finalFolderName, folderName: finalFolderName, parentId: parentId };
                            const response = await axiosInstance.post(`${APP_BASE}/api/files/folder`, folderPayload);
                            const newFolderId = (response.data || response).id || (response.data || response)._id;
                            createdFolders[currentPath] = newFolderId;
                            parentId = newFolderId;
                        }
                    }

                    const existingFilesInParent = targetDocuments
                        .filter(f => (f.parent_id?.toString() || null) === (parentId?.toString() || null))
                        .map(f => f.file_name || f.name);

                    let finalFileName = file.name;
                    if (existingFilesInParent.includes(finalFileName)) {
                        finalFileName = generateDuplicateName(finalFileName, existingFilesInParent);
                    }

                    const formData = new FormData();
                    formData.append("file", finalFileName !== file.name ? new File([file], finalFileName, { type: file.type }) : file);
                    formData.append("object_type", objectType);
                    formData.append("object_id", id);
                    if (parentId) formData.append("parent_id", parentId);

                    await axiosInstance.post(`${APP_BASE}/api/files/upload`, formData, { headers: { "Content-Type": "multipart/form-data" } });
                }
            } else {
                for (const file of files) {
                    const existingFilesAtRoot = targetDocuments.filter(f => !f.parent_id).map(f => f.file_name || f.name);
                    let finalFileName = file.name;
                    if (existingFilesAtRoot.includes(finalFileName)) {
                        finalFileName = generateDuplicateName(finalFileName, existingFilesAtRoot);
                    }
                    await apiUploadFile(finalFileName !== file.name ? new File([file], finalFileName, { type: file.type }) : file, objectType, id);
                }
            }
            toast("Tải lên tài liệu thành công!", "success");
            await refetchFiles();
        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
        } finally {
            setIsLoading(false);
        }
    }, [data, taskDocuments, finalDocuments, toast, refetchFiles]);

    const handleFileUpload = useCallback(async (event, objectType) => {
        const files = Array.from(event.target.files);
        await processFilesUpload(files, objectType);
        event.target.value = null;
    }, [processFilesUpload]);

    const handleTaskDocumentsUpload = useCallback((e) => handleFileUpload(e, "taskdocuments"), [handleFileUpload]);

    // === DRAG & DROP HANDLERS ===
    const handleDragOverInternal = useCallback((e, setter) => {
        e.preventDefault();
        e.stopPropagation();
        setter(true);
    }, []);

    const handleDragLeaveInternal = useCallback((e, setter) => {
        e.preventDefault();
        e.stopPropagation();
        setter(false);
    }, []);

    const handleDropInternal = useCallback(async (e, objectType, setter) => {
        e.preventDefault();
        e.stopPropagation();
        setter(false);

        const items = e.dataTransfer.items;
        if (items) {
            const files = await getFilesFromEntries(items);
            if (files.length > 0) {
                await processFilesUpload(files, objectType);
            }
        }
    }, [getFilesFromEntries, processFilesUpload]);

    const handleDragOverTask = useCallback((e) => {
        handleDragOverInternal(e, setIsDraggingTask);
    }, [handleDragOverInternal]);

    const handleDragLeaveTask = useCallback((e) => {
        handleDragLeaveInternal(e, setIsDraggingTask);
    }, [handleDragLeaveInternal]);

    const handleDropTask = useCallback((e) => {
        handleDropInternal(e, "taskdocuments", setIsDraggingTask);
    }, [handleDropInternal]);



    const handlePauseRepetitiveWork = useCallback(() => {
        handleOpenDialog('pause');
    }, [handleOpenDialog])

    const handleClosePauseDialog = useCallback(() => {
        handleCloseDialog('pause');
    }, [handleCloseDialog])

    const handleFinishClick = useCallback(() => {
        handleOpenDialog('finish');
    }, [handleOpenDialog])

    const handleCloseFinishDialog = useCallback(() => {
        handleCloseDialog('finish');
    }, [handleCloseDialog])

    const handleContinueClick = useCallback(() => {
        handleOpenDialog('continue');
    }, [handleOpenDialog])

    const handleCloseContinueDialog = useCallback(() => {
        handleCloseDialog('continue');
    }, [handleCloseDialog])
    const handleViewFile = async () => {
        if (!selectedFile) return;
        handleMenuClose();

        if (selectedFile?.type_file === 'link') {
            toast("Link đính kèm không thể xem trực tiếp, vui lòng Copy link!", "warning");
            return;
        }

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

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedFile(null);
    };
    const handleDownloadFile = async () => {
        if (!selectedFile) return;
        handleMenuClose();
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

    const handleCloseFileViewer = useCallback(() => {
        if (viewingFile.url) URL.revokeObjectURL(viewingFile.url);
        setViewingFile({ open: false, url: null, name: "", type: null });
    }, [viewingFile.url]);

    const checkCanDeleteFile = dataDetail?.status === 1;

    // const nameUser = userData?.name;
    // // Kiểm tra người tạo
    // const assignerUsername =
    //     dataDetail?.assigners?.name || dataDetail?.assigner || data?.assigners?.[0]?.name;

    // Wrapper component to move labels above inputs (giống GeneralInformation.js)
    const CustomInput = useMemo(() => {
        const Wrapped = withFormWrapper(CustomInputBase, "input");
        const Component = (props) => <Wrapped {...props} isView />;
        Component.displayName = "CustomInput";
        return Component;
    }, []);

    const CustomDateTimePicker = useMemo(() => {
        const Wrapped = withFormWrapper(DateTimeRangePicker, "date");
        const Component = (props) => <Wrapped {...props} isView />;
        Component.displayName = "CustomDateTimePicker";
        return Component;
    }, []);



    const WrappedCustomAsyncAutoComplete = useMemo(() => {
        const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
        // Không ép isView: để CustomAsyncAutoComplete render dạng chip (giống ViewJob),
        // thay vì wrapper gộp tên thành text plain ngăn bởi dấu phẩy.
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WrappedCustomAsyncAutoComplete";
        return Component;
    }, []);




    return (
        <Swipper
            open={open}
            title="Chi tiết công việc lặp lại"
            onClose={onClose}
            moreActions={
                <>
                    {dataDetail?.status === 1 && (
                        <>
                            <ButtonOutline
                                onClick={handlePauseRepetitiveWork}
                                variant="outlined"
                            >
                                TẠM DỪNG
                            </ButtonOutline>

                            <ButtonOutline
                                onClick={handleFinishClick}
                                variant="outlined"
                            >
                                KẾT THÚC
                            </ButtonOutline>
                        </>
                    )}

                    {dataDetail?.status === 2 && (
                        <>
                            <ButtonOutline
                                onClick={handleContinueClick}
                                variant="outlined"
                            >
                                TIẾP TỤC
                            </ButtonOutline>

                            <ButtonOutline
                                onClick={handleFinishClick}
                                variant="outlined"
                            >
                                KẾT THÚC
                            </ButtonOutline>
                        </>
                    )}
                </>
            }
        >

            <JobMainContent>
                <StyledBoxContainerContent>
                    <JobSectionHeader>
                        <JobSectionTitle variant="h6" gutterBottom mt={0}>
                            THÔNG TIN CHUNG
                        </JobSectionTitle>
                        <SkyFlexGap8>
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(dataDetail?.statusText) }} />
                            {dataDetail?.status === 1 && <ButtonOutline startIcon={<Edit />} onClick={handleOpenUpdateGeneralDialog}>Cập nhật</ButtonOutline>}

                        </SkyFlexGap8>
                    </JobSectionHeader>
                    <SkyGrid container spacing={2} mb={4}>
                        {/* Cột 1: Tên CV, Thời gian nhắc, Chủ đề, Ngày bắt đầu/kết thúc, Số ngày/Giờ lặp */}
                        <SkyGrid item xs={12} md={4}>
                            <SkyGrid container spacing={2}>
                                {/* Tên công việc */}
                                <SkyGrid item xs={12}>
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field }) => (
                                            <CustomInput
                                                label="Tên công việc"
                                                placeholder="Nhập tên công việc"
                                                {...field}
                                                disabled
                                            />
                                        )}
                                    />
                                </SkyGrid>

                                {/* Thời gian nhắc hạn */}
                                <SkyGrid item xs={12}>
                                    <Controller
                                        name="reminderTime"
                                        control={control}
                                        render={({ field }) => (
                                            <CustomInput
                                                select
                                                label="Thời gian nhắc hạn"
                                                placeholder="Chọn thời gian"
                                                optionLabel="label"
                                                optionValue="value"
                                                options={timeOptions}
                                                {...field}
                                                disabled
                                            />
                                        )}
                                    />
                                </SkyGrid>

                                {/* Chủ đề */}
                                <SkyGrid item xs={12}>
                                    <Controller
                                        name="topic"
                                        control={control}
                                        render={({ field }) => (
                                            <CustomInput
                                                select
                                                label="Chủ đề"
                                                placeholder="Chọn chủ đề"
                                                optionLabel="label"
                                                options={topicOptions}
                                                optionValue="value"
                                                {...field}
                                                disabled
                                            />
                                        )}
                                    />
                                </SkyGrid>



                                {/* Số ngày và Giờ lặp - CÙNG HÀNG */}
                                {repeatTask !== 'ngay' && (
                                    <SkyGrid item xs={6}>
                                        <Controller
                                            name="durationDays"
                                            control={control}
                                            render={({ field }) => (
                                                <CustomInput
                                                    type="number"
                                                    label="Số ngày thực hiện"
                                                    placeholder="Nhập số ngày"
                                                    {...field}
                                                    disabled
                                                />
                                            )}
                                        />
                                    </SkyGrid>
                                )}
                                <SkyGrid item xs={repeatTask && repeatTask !== 'ngay' ? 6 : 12}>
                                    <Controller
                                        name="startTime"
                                        control={control}
                                        render={({ field }) => (
                                            <CustomDateTimePicker
                                                timeOnly
                                                label="Giờ lặp"
                                                {...field}
                                                disabled
                                            />
                                        )}
                                    />
                                </SkyGrid>
                            </SkyGrid>
                        </SkyGrid>

                        {/* Cột 2: Quy trình, Độ ưu tiên, CV lặp lại, Ngày trong tuần */}
                        <SkyGrid item xs={12} md={4}>
                            <SkyGrid container spacing={2}>
                                <SkyGrid item xs={12}>
                                    <Controller
                                        name="code"
                                        control={control}
                                        render={({ field }) => (
                                            <CustomInput
                                                label="Mã công việc lặp lại"
                                                {...field}
                                                disabled
                                            />
                                        )}
                                    />
                                </SkyGrid>

                                {/* Quy trình */}
                                <SkyGrid item xs={12}>
                                    <Controller
                                        name="templateName"
                                        control={control}
                                        render={({ field }) => (
                                            <CustomInput
                                                label="Quy trình"
                                                placeholder="Tìm kiếm"
                                                {...field}
                                                disabled
                                            />
                                        )}
                                    />
                                </SkyGrid>

                                {/* Độ ưu tiên */}
                                <SkyGrid item xs={12}>
                                    <Controller
                                        name="priority"
                                        control={control}
                                        render={({ field }) => (
                                            <CustomInput
                                                select
                                                label="Độ ưu tiên"
                                                placeholder="Chọn độ ưu tiên"
                                                options={urgencyOptions}
                                                optionLabel="label"
                                                optionValue="value"
                                                {...field}
                                                disabled
                                            />
                                        )}
                                    />
                                </SkyGrid>

                                {/* Công việc lặp lại */}
                                <SkyGrid item xs={12}>
                                    <Controller
                                        name="repetitiveTask"
                                        control={control}
                                        render={({ field }) => (
                                            <CustomInput
                                                select
                                                label="Chu kỳ"
                                                options={optionModeOfWork}
                                                optionLabel="title"
                                                optionValue="value"
                                                {...field}
                                                disabled
                                            />
                                        )}
                                    />
                                </SkyGrid>

                                {/* Conditional sections cho tuần/tháng/quý */}
                                <SkyGrid item xs={12}>
                                    {/* ===== CHO TUẦN ===== */}
                                    {repeatTask === 'tuan' && (
                                        <Controller
                                            name="daysOfWeek"
                                            control={control}
                                            render={({ field }) => (
                                                <SkyBox>
                                                    <StyledRadioGroup
                                                        row
                                                        value={field.value || ''}
                                                        onChange={field.onChange}
                                                    >
                                                        {weekDays.map((day) => (
                                                            <StyledFormControlLabel
                                                                key={day.value}
                                                                value={day.value}
                                                                control={<SkyRadio size="small" />}
                                                                label={day.label}
                                                                disabled
                                                            />
                                                        ))}
                                                    </StyledRadioGroup>
                                                </SkyBox>
                                            )}
                                        />
                                    )}

                                    {/* ===== CHO THÁNG ===== */}
                                    {repeatTask === 'thang' && (
                                        <SkyGrid container spacing={2}>
                                            {/* Radio: Vào thứ X + Đầu tiên của tháng */}
                                            <SkyGrid item xs={12}>
                                                <Controller
                                                    name="monthPattern"
                                                    control={control}
                                                    render={({ field }) => {
                                                        const handleWeekdayChange = () => field.onChange('weekday');
                                                        return (
                                                            <RadioContainer>
                                                                <InlineGroup>
                                                                    <SkyRadio
                                                                        checked={field.value === 'weekday'}
                                                                        onChange={handleWeekdayChange}
                                                                        size="small"
                                                                        disabled
                                                                    />
                                                                    <StyleTypography >Vào</StyleTypography>
                                                                </InlineGroup>
                                                                <StyleSkyBoxContainer >
                                                                    <Controller
                                                                        name="monthWeekday"
                                                                        control={control}
                                                                        render={({ field: weekdayField }) => (
                                                                            <StyleSkyBox flx={1} mWidth="80px">
                                                                                <CustomInput
                                                                                    select
                                                                                    options={weekdayOptions}
                                                                                    optionLabel="label"
                                                                                    optionValue="value"
                                                                                    disabled
                                                                                    {...weekdayField}
                                                                                />
                                                                            </StyleSkyBox>
                                                                        )}
                                                                    />
                                                                    <Controller
                                                                        name="monthWeekPosition"
                                                                        control={control}
                                                                        render={({ field: positionField }) => (
                                                                            <StyleSkyBox flx={1.5} mWidth="120px">
                                                                                <CustomInput
                                                                                    select
                                                                                    options={weekOfMonthOptions}
                                                                                    optionLabel="label"
                                                                                    optionValue="value"
                                                                                    disabled
                                                                                    {...positionField}
                                                                                />
                                                                            </StyleSkyBox>
                                                                        )}
                                                                    />
                                                                </StyleSkyBoxContainer>
                                                            </RadioContainer>
                                                        );
                                                    }}
                                                />
                                            </SkyGrid>

                                            {/* Radio: Vào ngày + Date Grid Popup */}
                                            <SkyGrid item xs={12}>
                                                <Controller
                                                    name="monthPattern"
                                                    control={control}
                                                    render={({ field }) => {
                                                        const handleDayOfMonthChange = () => field.onChange('dayOfMonth');
                                                        return (
                                                            <SkyBox>
                                                                <RadioContainer>
                                                                    <SkyRadio
                                                                        checked={field.value === 'dayOfMonth'}
                                                                        onChange={handleDayOfMonthChange}
                                                                        size="small"
                                                                        disabled
                                                                    />
                                                                    <StyleTypography>Vào ngày</StyleTypography>
                                                                    <Controller
                                                                        name="monthDay"
                                                                        control={control}
                                                                        render={({ field: dayField }) => {
                                                                            return (
                                                                                <NarrowInputWrapper>
                                                                                    <CustomInput
                                                                                        type="number"
                                                                                        disabled
                                                                                        {...dayField}
                                                                                    />
                                                                                </NarrowInputWrapper>
                                                                            );
                                                                        }}
                                                                    />
                                                                    <StyleTypography>của tháng</StyleTypography>
                                                                </RadioContainer>
                                                            </SkyBox>
                                                        );
                                                    }}
                                                />
                                            </SkyGrid>

                                            {/* Radio: Vào ngày cuối */}
                                            <SkyGrid item xs={12}>
                                                <Controller
                                                    name="monthPattern"
                                                    control={control}
                                                    render={({ field }) => {
                                                        const handleLastDayChange = () => field.onChange('lastDay');
                                                        return (
                                                            <RadioContainer>
                                                                <SkyRadio
                                                                    checked={field.value === 'lastDay'}
                                                                    onChange={handleLastDayChange}
                                                                    size="small"
                                                                    disabled
                                                                />
                                                                <StyleTypography>Vào ngày cuối</StyleTypography>
                                                            </RadioContainer>
                                                        );
                                                    }}
                                                />
                                            </SkyGrid>
                                        </SkyGrid>
                                    )}

                                    {/* ===== CHO QUÝ ===== */}
                                    {repeatTask === 'quy' && (
                                        <SkyGrid container spacing={2}>
                                            {/* Chọn tháng trong quý */}
                                            <SkyGrid item xs={12}>
                                                <Controller
                                                    name="monthInQuarter"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomInput
                                                            select
                                                            label="Chọn tháng lặp trong quý"
                                                            options={monthInQuarterOptions}
                                                            optionLabel="label"
                                                            optionValue="value"
                                                            {...field}
                                                            disabled
                                                        />
                                                    )}
                                                />
                                            </SkyGrid>

                                            {/* Radio: Vào ngày X của tháng + Popup Grid Selection */}
                                            <SkyGrid item xs={12}>
                                                <Controller
                                                    name="quarterPattern"
                                                    control={control}
                                                    render={({ field }) => {
                                                        const handleQuarterDayPatternChange = () => field.onChange('dayOfMonth');
                                                        return (
                                                            <SkyBox>
                                                                <RadioContainer>
                                                                    <SkyRadio
                                                                        checked={field.value === 'dayOfMonth'}
                                                                        onChange={handleQuarterDayPatternChange}
                                                                        size="small"
                                                                        disabled
                                                                    />
                                                                    <StyleTypography>Vào ngày</StyleTypography>
                                                                    <Controller
                                                                        name="quarterDay"
                                                                        control={control}
                                                                        render={({ field: dayField }) => {
                                                                            return (
                                                                                <NarrowInputWrapper>
                                                                                    <CustomInput
                                                                                        type="number"
                                                                                        disabled
                                                                                        {...dayField}
                                                                                    />
                                                                                </NarrowInputWrapper>
                                                                            );
                                                                        }}
                                                                    />
                                                                    <StyleTypography>của tháng</StyleTypography>
                                                                </RadioContainer>
                                                            </SkyBox>
                                                        );
                                                    }}
                                                />
                                            </SkyGrid>


                                            {/* Radio: Vào ngày cuối cùng của tháng */}
                                            <SkyGrid item xs={12}>
                                                <Controller
                                                    name="quarterPattern"
                                                    control={control}
                                                    render={({ field }) => {
                                                        const handleLastDayChange = () => field.onChange('lastDay');
                                                        return (
                                                            <RadioContainer>
                                                                <SkyRadio
                                                                    checked={field.value === 'lastDay'}
                                                                    onChange={handleLastDayChange}
                                                                    size="small"
                                                                    disabled
                                                                />
                                                                <StyleTypography>Vào ngày cuối cùng của tháng</StyleTypography>
                                                            </RadioContainer>
                                                        );
                                                    }}
                                                />
                                            </SkyGrid>
                                        </SkyGrid>
                                    )}
                                </SkyGrid>
                            </SkyGrid>
                        </SkyGrid>

                        {/* Cột 3: Mô tả */}
                        <SkyGrid item xs={12} md={4}>
                            <Controller
                                name="note"
                                control={control}
                                render={({ field }) => (
                                    <CustomInput
                                        multiline
                                        rows={10}
                                        label="Mô tả"
                                        // placeholder="Nhập mô tả"
                                        {...field}
                                        disabled
                                    />
                                )}
                            />
                        </SkyGrid>
                    </SkyGrid>
                </StyledBoxContainerContent>

                <StyledBoxContainerContent styledMarginTop>
                    <JobSectionHeader mt={2.5} mb={2.5}>
                        <SkyFlexGap8 >
                            <StyledIconWrapper>
                                <StytedPeopleIcon />
                            </StyledIconWrapper>
                            <JobSectionTitle variant="h6" gutterBottom mb={0} >
                                THÔNG TIN NGƯỜI THAM GIA
                            </JobSectionTitle>
                        </SkyFlexGap8>
                        <SkyFlexGap16Center>
                            <ParticipantInfoContainer>
                                <Controller
                                    name="isApprovalRequired"
                                    control={control}
                                    render={({ field }) => (
                                        <BoldSkyFormControlLabel
                                            control={
                                                <SkyCheckbox
                                                    {...field}
                                                    checked={!!field.value}
                                                    disabled
                                                />
                                            }
                                            label="Xác nhận hoàn thành"
                                            labelPlacement="start"
                                        />
                                    )}
                                />
                            </ParticipantInfoContainer>
                            {dataDetail?.status === 1 && <ButtonOutline startIcon={<Edit />} onClick={handleOpenUpdateParticipantsDialog}>Cập nhật</ButtonOutline>}
                        </SkyFlexGap16Center>
                    </JobSectionHeader>
                    <SkyGrid container spacing={2} mb={3}>
                        {/* Người giao việc */}
                        <SkyGrid item xs={12} md={6}>
                            <WrappedCustomAsyncAutoComplete
                                limitTags={2}
                                options={dataDetail?.assigners?.[0] ? [dataDetail.assigners[0]] : []}
                                value={dataDetail?.assigners?.[0] ? [dataDetail.assigners[0]] : []}
                                disabled
                                isMulti
                                optionValue="_id"
                                optionLabel="name"
                                optionSubLabel="parentName"
                                label="Người giao việc"
                            />
                        </SkyGrid>

                        {/* Người chủ trì */}
                        <SkyGrid item xs={12} md={6}>
                            <WrappedCustomAsyncAutoComplete
                                limitTags={2}
                                options={dataDetail?.directors?.[0] ? [dataDetail.directors[0]] : []}
                                value={dataDetail?.directors?.[0] ? [dataDetail.directors[0]] : []}
                                disabled
                                isMulti
                                optionValue="_id"
                                optionLabel="name"
                                optionSubLabel="parentName"
                                label="Người chủ trì"
                            />
                        </SkyGrid>

                        {/* Người phối hợp */}
                        <SkyGrid item xs={12} md={6}>
                            <WrappedCustomAsyncAutoComplete
                                label="Người phối hợp"
                                limitTags={2}
                                options={Array.isArray(dataDetail?.supporters) ? dataDetail.supporters : []}
                                value={Array.isArray(dataDetail?.supporters) ? dataDetail.supporters : []}
                                disabled
                                isMulti
                                optionValue="_id"
                                optionLabel="name"
                                optionSubLabel="parentName"
                            />
                        </SkyGrid>

                        {/* Người xem */}
                        <SkyGrid item xs={12} md={6}>
                            <WrappedCustomAsyncAutoComplete
                                limitTags={2}
                                options={Array.isArray(dataDetail?.viewers) ? dataDetail.viewers : []}
                                value={Array.isArray(dataDetail?.viewers) ? dataDetail.viewers : []}
                                disabled
                                isMulti
                                optionValue="_id"
                                optionLabel="name"
                                optionSubLabel="parentName"
                                label="Người xem"
                            />
                        </SkyGrid>

                        {/* Người tạo */}
                        {/* {!(dataDetail?.createdBy === nameUser && assignerUsername === nameUser) && (
                            <SkyGrid item xs={12} md={4}>
                                <WrappedCustomAsyncAutoComplete
                                    limitTags={2}
                                    options={dataDetail?.createdBy ? [dataDetail.createdBy] : []}
                                    value={dataDetail?.createdBy ? [dataDetail.createdBy] : []}
                                    disabled
                                    isMulti
                                    optionValue="_id"
                                    optionLabel="name"
                                    optionSubLabel="parentName"
                                    label="Người tạo"
                                />
                            </SkyGrid>
                        )} */}
                    </SkyGrid>
                </StyledBoxContainerContent>

                {/* ==================== TÀI LIỆU CÔNG VIỆC ==================== */}
                <UploadDropZone
                    styledMarginTop
                    as={StyledBoxContainerContent}
                    isDragging={isDraggingTask}
                    onDragOver={handleDragOverTask}
                    onDragLeave={handleDragLeaveTask}
                    onDrop={handleDropTask}
                >
                    <SkyBox>
                        <SkyFlexGap8 mt={2.5} mb={2.5}>
                            <StyledIconWrapper>
                                <StytedDescriptionIcon />
                            </StyledIconWrapper>
                            <JobSectionTitle variant="h6" gutterBottom mb={0} >
                                TÀI LIỆU LIÊN QUAN
                            </JobSectionTitle>
                        </SkyFlexGap8>
                        <JobButtonContainer>
                            <ButtonOutline onClick={handleOpenTaskLinkPopup} startIcon={<LinkIcon />}>
                                Thêm link
                            </ButtonOutline>
                            <ButtonOutline component="label" startIcon={<AttachFile />}>
                                Tải fiel
                                <input type="file" hidden multiple onChange={handleTaskDocumentsUpload} />
                            </ButtonOutline>
                            <ButtonOutline component="label" startIcon={<Folder />}>
                                Thư mục
                                <input type="file" hidden multiple webkitdirectory="" onChange={handleTaskDocumentsUpload} />
                            </ButtonOutline>

                        </JobButtonContainer>
                    </SkyBox>

                    {/* Tree View tài liệu */}
                    <FileTreeTable
                        data={taskDocuments}
                        onFileMenuClick={handleDynamicFileMenuClick}
                        MenuIcon={StyledMenuIcon}
                        isView
                        sourceAsync
                        emptyMessage="Kéo thả tệp hoặc thư mục vào đây để tải lên"
                    />
                </UploadDropZone>

            </JobMainContent>

            <CustomDialog
                open={isDeleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                onSave={handleDeleteFile}
                title="Xác nhận xóa"
                type="delete"
                size="sm"
            >
                Bạn có muốn xóa không?
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

            <UpdateRepetiviveWork
                open={updateDialogState.open}
                onClose={handleCloseUpdateDialog}
                type={updateDialogState.type}
                data={dataDetail}
                dataDetail={dataDetail}
                setReloadData={setReloadData}
                fetchData={fetchData}
            />

            <FinalRepetinviWork
                open={openDialog.finish}
                onClose={handleCloseFinishDialog}
                dataDetail={dataDetail}
                docId={dataDetail?.id}
                onCloseDialog={onClose}
                setReloadData={setReloadData}
            />
            <ContinueRepetiviWork
                open={openDialog.continue}
                onClose={handleCloseContinueDialog}
                dataDetail={dataDetail}
                docId={dataDetail?.id}
                onCloseDialog={onClose}
                setReloadData={setReloadData}
            />
            <PauseRepetivePopup
                open={openDialog.pause}
                onClose={handleClosePauseDialog}
                dataDetail={dataDetail}
                docId={dataDetail?.id}
                onCloseDialog={onClose}
                setReloadData={setReloadData}
            />
            <FilePreviewDialog
                open={viewingFile.open}
                onClose={handleCloseFileViewer}
                url={viewingFile.url}
                fileName={viewingFile.name}
                fileType={viewingFile.type}
                title={`Xem file: ${viewingFile.name}`}
            />
            <SkyMenu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                id="file-menu"
            >
                {selectedFile && !selectedFile.isFolder && selectedFile.type_file !== 'link' && (
                    <SkyMenuItem onClick={handleViewFile}>
                        <StyledListItemIcon>
                            <VisibilityOutlined />
                        </StyledListItemIcon>
                        <SkyListItemText>Xem</SkyListItemText>
                    </SkyMenuItem>
                )}
                {
                    checkCanDeleteFile
                    && <SkyMenuItem onClick={handleOpenDeleteDialog}>
                        <StyledListItemIcon>
                            <DeleteOutline />
                        </StyledListItemIcon>
                        <SkyListItemText>Xóa</SkyListItemText>
                    </SkyMenuItem>
                }
                {selectedFile && selectedFile.type_file !== 'link' && (
                    <SkyMenuItem onClick={handleDownloadFile}>
                        <StyledListItemIcon>
                            <DownloadOutlined />
                        </StyledListItemIcon>
                        <SkyListItemText>Tải xuống</SkyListItemText>
                    </SkyMenuItem>
                )}
            </SkyMenu>
            <LoadingDialog open={isLoading} >
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>
        </Swipper >
    );
};

export default memo(ViewRepetitiveWork);
