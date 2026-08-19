/* eslint-disable camelcase */

import { yupResolver } from '@hookform/resolvers/yup';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { defaultValues, schema, weekDays, weekdayOptions, weekOfMonthOptions, monthInQuarterOptions } from './constant';


import CustomInput from '@components/CustomInput/CustomInputBase';
import CustomDateTimePicker from '@components/CustomDateTimePicker';
import {
    JobButtonContainer,
    JobCommentHeader,
    JobMainContent,
    JobSectionTitle,
    StyledBoxContainerContent,
    StyledListItemIcon,
    UploadDropZone,
    BoldSkyFormControlLabel,
    StytedDescriptionIcon,
    StyleLine,
    StytedPeopleIcon,
    StytedAddJob,
} from '@pages/WorkManagement/components/Job.styles';
import { SkyBox, SkyGrid, SkyListItemText, SkyMenu, SkyMenuItem, SkyRadio, SkyPopover, SkyCheckbox, SkyFlexGap8 } from '@styles/SkyStyles';
import { useSelector } from 'react-redux';
import PersonOrUnitAsyncInput from '@components/PersonOrUnitAsyncInput';
import FileTreeTable from '@components/FileTreeTable';
import { DeleteOutline } from '@mui/icons-material';
import {
    API_GET_COMMON_WORK_ORG,
    API_GET_COMMON_WORK_USER,
    API_TEMPLATE,
    APP_BASE,
    API_MERGE_LINK
} from '@EnvironmentFile/constants/urlConfig';
import { convertFilesToTreeData, processFilesForUpload } from '@utils/utils';
import { useToast } from '@components/common/ToastProvider';
import { FILE_NAME_LIMITS, truncateFileName, formatFileSize, generateDuplicateName, UPLOAD_LIMITS_PER_BATCH, UPLOAD_LIMITS_PER_FILE, UPLOAD_LIMITS_PER_FOLDER, UPLOAD_LIMITS_PER_TASK, validateFileExtension, validateFileName } from '@pages/WorkManagement/components/constants';
import { CustomDialog } from '@components/CustomDialog';
import { StyledMenuIcon } from '@styles/CustomTable.styles';
import LoadingDialog from '@components/LoadingDialog';
const ButtonOutline = React.lazy(() => import("@components/CustomButtonOutline"));
import { DateCell, DateGridContainer, StyledFormControlLabel, StyledRadioGroup, StyleSkyBox, StyleTypography, MonthOptionCard, MonthOptionLabel, MonthlyRadioContainer, LastDayRadioContainer, MonthlySkyBoxContainer, MonthlyInlineGroup, MonthlyInputWrapper } from './styles';
import axiosInstance from '@utils/axiosInstance';
import { apiUploadFile } from '@services/FileUpload/fileUpload';
import CustomAsyncAutoComplete from '@components/CustomAsyncAutoComplete';
import PopupTemplate from '@pages/WorkManagement/components/PopupTemplate';
import CustomAutoComplete from "@components/CustomAutoCompleteSearch";
import Swipper from "@components/Swipper/BaseSwiper";
import { FlexGrowBox, FooterActions } from '@styles/BaseSwiper/BaseSwiper.style';
import { StyledIconWrapper } from '@pages/ProjectManager/components/AddProject.styles';
import withFormWrapper from '@components/common/FormWrapper';
import CustomButton from '@components/CustomButton';


const RepetitiveWork = (props) => {
    const { open, onClose, setReloadData } = props;
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        setValue,

    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: defaultValues,
        mode: 'onChange'
    });
    const { dataUser } = useSelector((state) => state.auth);

    const user = dataUser
    const { crmSource } = useSelector((state) => state.config);
    const optionModeOfWork =
        crmSource.find((item) => item.code === "CONGVIECDUOCLAPLAI")?.data || [];

    const urgencyOptions =
        crmSource.find((item) => item.code === "DOUUTIEN")?.data || [];
    const toast = useToast();
    const repeatTask = watch("repetitiveTask");
    const watchLeader = watch("directors");
    const watchCoordinators = watch("supporters");
    const watchViewers = watch("viewers");

    const getId = (val) => val?._id || val?.id || val?.processId || (typeof val === 'string' ? val : null);

    
    const leaderExcludeIds = React.useMemo(() => {
        const ids = [];
        if (Array.isArray(watchCoordinators)) {
            watchCoordinators.forEach((item) => {
                const id = getId(item);
                if (id) ids.push(id);
            });
        }
        if (Array.isArray(watchViewers)) {
            watchViewers.forEach((item) => {
                const id = getId(item);
                if (id) ids.push(id);
            });
        }
        return ids.join(",");
    }, [watchCoordinators, watchViewers]);

    const coordinatorExcludeIds = React.useMemo(() => {
        const ids = [];
        if (user?.id) ids.push(user.id);
        const leaderId = getId(watchLeader);
        if (leaderId) ids.push(leaderId);
        if (Array.isArray(watchViewers)) {
            watchViewers.forEach((item) => {
                const id = getId(item);
                if (id) ids.push(id);
            });
        }
        return ids.join(",");
    }, [user?.id, watchLeader, watchViewers]);

    const viewerExcludeIds = React.useMemo(() => {
        const ids = [];
        if (user?.id) ids.push(user.id);
        const leaderId = getId(watchLeader);
        if (leaderId) ids.push(leaderId);
        if (Array.isArray(watchCoordinators)) {
            watchCoordinators.forEach((item) => {
                const id = getId(item);
                if (id) ids.push(id);
            });
        }
        return ids.join(",");
    }, [user?.id, watchLeader, watchCoordinators]);
    const hideCoordinators = React.useMemo(() => {
        const assignerId = getId(user);
        const leaderId = getId(watchLeader);
        return !!(assignerId && leaderId && assignerId === leaderId);
    }, [user, watchLeader]);

    useEffect(() => {
        if (hideCoordinators) {
            setValue("supporters", []);
        }
    }, [hideCoordinators, setValue]);

    const [checkPermision, setCheckPermision] = React.useState(false);
    // State cho date grid popup (Tháng)
    const [dateGridAnchor, setDateGridAnchor] = useState(null);
    const isDateGridOpen = Boolean(dateGridAnchor);
    const [leaderType, setLeaderType] = React.useState("person");
    const [coordinatorType, setCoordinatorType] = React.useState("person");

    const [uploadedFiles, setUploadedFiles] = React.useState([]);
    // State cho việc xử lý trùng lặp
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
    const [selectedFileId, setSelectedFileId] = React.useState(null);
    const [selectedIsFolder, setSelectedIsFolder] = React.useState(false);
    const [loading, setIsLoading] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const timeOptions =
        crmSource.find((item) => item.code === "S34")?.data || [];

    const [quarterDateGridAnchor, setQuarterDateGridAnchor] = useState(null);
    const isQuarterDateGridOpen = Boolean(quarterDateGridAnchor);
    const [pendingPayload, setPendingPayload] = React.useState(null);
    const [templateWarningInfo, setTemplateWarningInfo] = React.useState({
        templateName: "",
        requiredDays: 0,
        availableDays: 0
    });
    const [openPopupTemplate, setOpenPopupTemplate] = React.useState(false);

    const [linkPopupOpen, setLinkPopupOpen] = useState(false);
    const [linkFormValues, setLinkFormValues] = useState({ documentName: "", documentUrl: "" });
    const [linkErrors, setLinkErrors] = useState({ documentName: "", documentUrl: "" });

    const validateURL = useCallback((url) => {
        const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_.~+%=&]*)?$', 'i'); // fragment locator
        return !!pattern.test(url.trim());
    }, []);

    const handleOpenLinkPopup = useCallback(() => {
        setLinkPopupOpen(true);
        setLinkFormValues({ documentName: "", documentUrl: "" });
        setLinkErrors({ documentName: "", documentUrl: "" });
    }, []);

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

    const handleSaveLink = useCallback(() => {
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

        const newLink = {
            name: linkFormValues.documentName,
            link: linkFormValues.documentUrl,
            type_file: 'link',
            id: `link-${Date.now()}`
        };
        setUploadedFiles(prev => [...prev, newLink]);
        handleCloseLinkPopup();
    }, [linkFormValues, handleCloseLinkPopup, validateURL]);




    const handleRepetitiveTaskChange = useCallback((e) => {
        const newValue = e?.target?.value !== undefined ? e.target.value : e;
        setValue('repetitiveTask', newValue);
        // Clear and set default values for modes when switching
        if (newValue === 'tuan') {
            setValue('daysOfWeek', '2'); // Default to Monday

            setValue('monthPattern', 'weekday');
            setValue('monthDay', 1);
            setValue('monthWeekday', '2');
            setValue('monthWeekPosition', 1);
            setValue('quarterPattern', 'dayOfMonth');
            setValue('quarterDay', 1);
            setValue('quarterWeekday', '2');
            setValue('quarterWeekPosition', 1);
            setValue('monthInQuarter', 1);
        } else if (newValue === 'thang') {
            setValue('daysOfWeek', '2');

            setValue('monthPattern', 'weekday');
            setValue('monthDay', 1);
            setValue('monthWeekday', '2');
            setValue('monthWeekPosition', 1);

            setValue('quarterPattern', 'dayOfMonth');
            setValue('quarterDay', 1);
            setValue('quarterWeekday', '2');
            setValue('quarterWeekPosition', 1);
            setValue('monthInQuarter', 1);
        } else if (newValue === 'quy') {
            setValue('daysOfWeek', '2');

            setValue('monthPattern', 'weekday');
            setValue('monthDay', 1);
            setValue('monthWeekday', '2');
            setValue('monthWeekPosition', 1);

            setValue('quarterPattern', 'dayOfMonth');
            setValue('quarterDay', 1);
            setValue('quarterWeekday', '2');
            setValue('quarterWeekPosition', 1);
            setValue('monthInQuarter', 1);
        } else {
            // Clear all when not repeating or other types
            setValue('daysOfWeek', '2');
            setValue('monthPattern', 'weekday');
            setValue('monthDay', 1);
            setValue('monthWeekday', '2');
            setValue('monthWeekPosition', 1);
            setValue('quarterPattern', 'dayOfMonth');
            setValue('quarterDay', 1);
            setValue('quarterWeekday', '2');
            setValue('quarterWeekPosition', 1);
            setValue('monthInQuarter', 1);
        }
    }, [setValue]);

    const onSubmit = useCallback(async (data, bypassFlag = false) => {
        // === VALIDATION: Kiểm tra độ dài tên file ===
        const validUploadedFiles = uploadedFiles.filter(f => {
            if (!(f instanceof File)) return true;
            const name = f.path || f.webkitRelativePath || f.name || f.file_name || "";
            const fileName = name.includes("/") ? name.split("/").pop() : name;
            return fileName.length <= FILE_NAME_LIMITS.MAX_LENGTH;
        });

        const invalidFiles = uploadedFiles.filter(f => {
            if (!(f instanceof File)) return false;
            const name = f.path || f.webkitRelativePath || f.name || f.file_name || "";
            const fileName = name.includes("/") ? name.split("/").pop() : name;
            return fileName.length > FILE_NAME_LIMITS.MAX_LENGTH;
        });

        if (invalidFiles.length > 0) {
            const truncatedNames = invalidFiles.map(f => {
                const name = f.path || f.webkitRelativePath || f.name || f.file_name || "";
                const fileName = name.includes("/") ? name.split("/").pop() : name;
                return truncateFileName(fileName);
            }).join(", ");
            toast(`File ${truncatedNames}: vượt quá giới hạn 255 ký tự`, "error");
        }

        // Cập nhật lại danh sách file hợp lệ trước khi tiến hành
        setUploadedFiles(validUploadedFiles);

        setIsLoading(true);
        const isBypass = typeof bypassFlag === 'boolean' ? bypassFlag : false;

        const getId = (val) => val?._id || val?.id || val?.processId || val;

        try {

            // Xây dựng body cơ bản
            const body = {
                name: data.name,
                note: data.note,
                startTime: data.startTime || '',
                reminderTime: data.reminderTime,
                topic: data.topic,
                priority: data.priority,
                repetitiveTask: data.repetitiveTask,
                assigners: [{ processId: getId(user) }],
                directors: data.directors ? [{ processId: getId(data.directors), type: leaderType === 'person' ? 1 : 2 }] : [],
                supporters: Array.isArray(data.supporters) ? data.supporters.map(item => ({ processId: getId(item), type: coordinatorType === 'person' ? 1 : 2 })) : [],
                viewers: Array.isArray(data.viewers) ? data.viewers.map(item => ({ processId: getId(item) })) : [],
                monthInQuarter: data.monthInQuarter,
                templateId: data.templateId?.id,
                bypassTemplateTimeValidation: isBypass,
                isApprovalRequired: data.isApprovalRequired,
            }

            // Chỉ thêm durationDays nếu repetitiveTask !== 'ngay'
            if (data.repetitiveTask !== 'ngay') {
                body.durationDays = data.durationDays;
            }

            // Xử lý logic theo loại lặp lại
            if (data.repetitiveTask === 'tuan') {
                // Cho tuần: gửi daysOfWeek
                body.daysOfWeek = data.daysOfWeek;
            } else if (data.repetitiveTask === 'thang') {
                // Cho tháng: xác định executionType dựa trên monthPattern
                if (data.monthPattern === 'weekday') {
                    // Trường hợp 1: Vào [Thứ X] [Tuần Y] của tháng
                    body.executionType = 'relative_day';
                    body.relativeWeek = data.monthWeekPosition; // 'first', 'second', 'third', 'fourth', 'last'
                    body.relativeDay = data.monthWeekday; // 0-6 (CN-T7)
                } else if (data.monthPattern === 'dayOfMonth') {
                    // Trường hợp 2: Vào ngày [X] của tháng
                    body.executionType = 'specific_day';
                    body.dayOfMonth = data.monthDay; // 1-31
                } else if (data.monthPattern === 'lastDay') {
                    // Trường hợp 3: Vào ngày cuối cùng của tháng
                    body.executionType = 'last_day';
                }
            } else if (data.repetitiveTask === 'quy') {
                body.monthInQuarter = Number(data.monthInQuarter) || 1;

                if (data.quarterPattern === 'weekday') {
                    // Trường hợp 1: Vào Thứ X, Tuần Y của tháng Z
                    body.executionType = 'relative_day';
                    body.relativeWeek = data.quarterWeekPosition; // 'first'/'last'
                    body.relativeDay = data.quarterWeekday; // 0-6
                } else if (data.quarterPattern === 'dayOfMonth') {
                    // Trường hợp 2: Vào ngày X của tháng Z
                    body.executionType = 'specific_day';
                    body.dayOfMonth = data.quarterDay; // 1-31
                } else if (data.quarterPattern === 'lastDay') {
                    // Trường hợp 3: Vào ngày cuối của tháng Z
                    body.executionType = 'last_day';
                }
            }
            logger.log("body", body);
            const res = await axiosInstance.post(`${APP_BASE}/api/tasks/recurring`, body)
            const newTaskId = res?.data?._id || res?._id || res?.id;

            if (!newTaskId) {
                throw new Error("Không nhận được ID công việc sau khi tạo.");
            }

            // Tách file vật lý và link
            const physicalFiles = validUploadedFiles.filter(f => (f instanceof File || (f.webkitRelativePath && f.webkitRelativePath.includes("/"))));
            const linksToSave = validUploadedFiles.filter(f => f.type_file === 'link');

            // 2. Nếu không có file/link thì kết thúc
            if (validUploadedFiles.length === 0) {
                toast("Thêm mới công việc thành công!", "success");
                setReloadData(new Date());
                onClose();
                return;
            }

            // 3. Upload file nếu có
            if (physicalFiles.length > 0) {
                const isFolderUpload = physicalFiles.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));
                if (isFolderUpload) {
                    const createdFolders = {};
                    for (const file of physicalFiles) {
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
                                const folderPayload = {
                                    objectType: 'taskdocuments',
                                    objectId: newTaskId,
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

                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("object_type", 'taskdocuments');
                        formData.append("object_id", newTaskId);
                        if (parentId) {
                            formData.append("parent_id", parentId);
                        }

                        await axiosInstance.post(`${APP_BASE}/api/files/upload`, formData, {
                            headers: { "Content-Type": "multipart/form-data" },
                        });
                    }

                } else {
                    // file bth
                    for (const file of physicalFiles) {
                        try {
                            await apiUploadFile(file, "taskdocuments", newTaskId);
                        } catch (uploadError) {
                            toast(`Tải lên tệp ${file.name} thất bại.`, "warning");
                        }
                    }
                }
            }

            // 4. Lưu link nếu có
            if (linksToSave.length > 0) {
                for (const linkObj of linksToSave) {
                    try {
                        await axiosInstance.post(API_MERGE_LINK, {
                            taskId: String(newTaskId),
                            documentName: linkObj.name,
                            documentUrl: linkObj.link
                        });
                    } catch (linkError) {
                        logger.error("Lỗi khi lưu link:", linkError);
                    }
                }
            }

            // 4. Cập nhật lại công việc với danh sách file (nếu backend yêu cầu cập nhật field files)
            // if (uploadedFileIds.length > 0) {


            toast("Thêm mới công việc và tải tệp đính kèm thành công!", "success");
            reset();
            setReloadData(new Date());
            onClose();
        } catch (error) {
            logger.log("error", error);
            const errorData = error?.response?.data;

            if (errorData?.code === "TEMPLATE_TIME_EXCEEDED") {
                setPendingPayload(data); // Lưu data gốc để submit lại khi user confirm
                setTemplateWarningInfo({
                    templateName: errorData.templateName,
                    requiredDays: errorData.requiredDays || 0,
                    availableDays: errorData.availableDays || 0
                });
                setOpenPopupTemplate(true); // Mở popup confirm
                setIsLoading(false); // Tắt loading
                return; // Không hiển thị toast error
            }
            toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
        } finally {
            setIsLoading(false);
        }
    }, [uploadedFiles, toast, user, leaderType, coordinatorType, setReloadData, onClose, reset]);



    // Handler cho single date selection
    const handleSingleDaySelect = (day, onChange, setAnchor) => {
        onChange(day);
        setAnchor(null);
    };



    const fileTreeData = React.useMemo(() => {
        return convertFilesToTreeData(uploadedFiles);
    }, [uploadedFiles]);


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

    const processFilesUpload = useCallback(async (files) => {
        if (!files.length) return;

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
        const currentTotalCount = uploadedFiles.length;
        const currentTotalSize = uploadedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
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

        // === VALIDATION 4: Xử lý tự động đổi tên nếu trùng ===
        const filesToAdd = processFilesForUpload(files, uploadedFiles, generateDuplicateName);
        setUploadedFiles((prev) => [...prev, ...filesToAdd]);
    }, [uploadedFiles, toast]);

    const handleFilesChange = useCallback(async (event) => {
        const files = Array.from(event.target.files);
        await processFilesUpload(files);
        event.target.value = null;
    }, [processFilesUpload]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const items = e.dataTransfer.items;
        if (items) {
            const files = await getFilesFromEntries(items);
            if (files.length > 0) {
                await processFilesUpload(files);
            }
        }
    }, [getFilesFromEntries, processFilesUpload]);
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
    const handleFileMenuClick = useCallback((event) => {
        const fileId = event.currentTarget.getAttribute('data-file-id');
        const isFolder = event.currentTarget.getAttribute('data-is-folder') === '1';

        if (!fileId) return;

        setSelectedFileId(fileId);
        setSelectedIsFolder(isFolder);
        setFileMenuAnchor(event.currentTarget);
    }, []);

    // Đóng menu
    const handleCloseFileMenu = useCallback(() => {
        setFileMenuAnchor(null);
        setSelectedFileId(null);
        setSelectedIsFolder(false);
    }, []);

    // Xử lý xóa file
    const handleDeleteFile = useCallback(() => {
        if (!selectedFileId) {
            handleCloseFileMenu();
            return;
        }

        // Tìm node trong flattened array
        const fileNode = fileTreeData.find(
            (node) => (node.id === selectedFileId || node._id === selectedFileId)
        );

        if (!fileNode) {
            handleCloseFileMenu();
            return;
        }

        // Nếu là link, chỉ xóa link đó
        if (fileNode.type_file === 'link') {
            setUploadedFiles((prev) => prev.filter((f) => (f.id || f._id) !== selectedFileId));
            setIsDeleteDialogOpen(false);
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
                }
            });
        } else {
            // Nếu là file, chỉ xóa file đó
            if (fileNode.file) {
                filesToRemove.add(fileNode.file);
            }
        }

        // Xóa các file khỏi uploadedFiles
        setUploadedFiles((prev) =>
            prev.filter((file) => !filesToRemove.has(file))
        );

        setIsDeleteDialogOpen(false);
        handleCloseFileMenu();
    }, [selectedFileId, selectedIsFolder, fileTreeData, findAllChildren, handleCloseFileMenu]);

    const handleOpenDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(true);
        setFileMenuAnchor(null);
    }, []);

    const handleCloseDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(false);
    }, []);



    const onInvalid = useCallback(() => {
        toast("Vui lòng nhập đầy đủ thông tin", "error");
    }, [toast]);

    const checkPermission = useCallback(async () => {
        try {
            const response = await axiosInstance.get(`${APP_BASE}/api/tasks/check-create-permission`);
            setCheckPermision(response);
        } catch (error) {
            logger.log("Error checking permission:", error);

        }
    }, []);

    useEffect(() => {
        checkPermission();
    }, [checkPermission])

    const handleClosePopupTemplate = useCallback(() => {
        setOpenPopupTemplate(false);
        setPendingPayload(null); // Clear pending payload khi đóng popup
        setTemplateWarningInfo({
            templateName: "",
            requiredDays: 0,
            availableDays: 0
        });
    }, []);
    const handleConfirmBypassTemplate = useCallback(async () => {
        if (pendingPayload) {
            // Gọi lại onSubmit với flag bypassTemplateWarning = true
            await onSubmit(pendingPayload, true);
        }
    }, [pendingPayload, onSubmit])

    const WrappedCustomInput = useMemo(() => {
        const Wrapped = withFormWrapper(CustomInput, "input");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WrappedCustomInputt";
        return Component;
    }, []);

    const WrappedAsyncAutoComplete = useMemo(() => {
        const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WrappedAsyncAutoComplete";
        return Component;
    }, []);
    const WrappedPersonOrUnitAsyncInput = useMemo(() => {
        const Wrapped = withFormWrapper(PersonOrUnitAsyncInput, "asyncSelect");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WrappedPersonOrUnitAsyncInput";
        return Component;
    }, []);

    const WapperCustomAutoComplete = useMemo(() => {
        const Wrapped = withFormWrapper(CustomAutoComplete, "asyncSelect");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WapperCustomAutoComplete";
        return Component;
    }, []);

    const WapperCustomDateTimePicker = useMemo(() => {
        const Wrapped = withFormWrapper(CustomDateTimePicker, "dateTime");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WapperCustomDateTimePicker";
        return Component;
    }, []);

    return (
        <Swipper
            open={open}
            title="Thêm mới công việc lặp lại"
            onClose={onClose}
            isLoading={loading}
            footer={
                <>
                    <FlexGrowBox />
                    <FooterActions>
                        <CustomButton
                            onClick={handleSubmit(onSubmit, onInvalid)}
                            disabled={loading}
                            variant="primary"
                        >
                            Lưu
                        </CustomButton>
                    </FooterActions>
                </>
            }
        >
            <JobMainContent>
                <StyledBoxContainerContent>
                    <SkyFlexGap8 mt={2}>
                        <StyledIconWrapper>
                            <StytedDescriptionIcon />
                        </StyledIconWrapper>
                        <JobSectionTitle variant="h6" gutterBottom mb={0} >
                            THÔNG TIN CHUNG
                        </JobSectionTitle>
                    </SkyFlexGap8>
                    <StyleLine />
                    <SkyGrid container spacing={2} mb={4}>
                        {/* Hàng 1: Tên công việc (rộng) + Thời gian nhắc hạn */}
                        {/* Tên công việc */}
                        <SkyGrid item xs={12} md={8}>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <WrappedCustomInput
                                        label="Tên công việc"
                                        placeholder="Nhập tên công việc"
                                        {...field}
                                        required
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                    />
                                )}
                            />
                        </SkyGrid>
                        {/* Thời gian nhắc hạn */}
                        <SkyGrid item xs={12} md={4}>
                            <Controller
                                name="reminderTime"
                                control={control}
                                render={({ field }) => (
                                    <WrappedCustomInput
                                        select
                                        label="Thời gian nhắc hạn"
                                        customLabel="label"
                                        customValue="value"
                                        options={timeOptions}
                                        {...field}
                                        error={!!errors.reminderTime}
                                        helperText={errors.reminderTime?.message}
                                    />
                                )}
                            />
                        </SkyGrid>

                        {/* Hàng 2: Quy trình + Độ ưu tiên + Chủ đề */}
                        {/* Quy trình */}
                        <SkyGrid item xs={12} md={4}>
                            <Controller
                                name="templateId"
                                control={control}
                                render={({ field }) => (
                                    <WrappedAsyncAutoComplete
                                        label="Quy trình"
                                        placeholder="Tìm kiếm"
                                        {...field}
                                        url={`${API_TEMPLATE}`}
                                        queryParam="name"
                                        optionLabel="name"
                                        optionValue="id"

                                    />
                                )}
                            />
                        </SkyGrid>
                        {/* Độ ưu tiên */}
                        <SkyGrid item xs={12} md={4}>
                            <Controller
                                name="priority"
                                control={control}
                                render={({ field }) => (
                                    <WrappedCustomInput
                                        select
                                        label="Độ ưu tiên"
                                        placeholder="Chọn độ ưu tiên"
                                        options={urgencyOptions}
                                        customLabel="label"
                                        customValue="value"
                                        {...field}
                                        error={!!errors.priority}
                                        helperText={errors.priority?.message}
                                    />
                                )}
                            />
                        </SkyGrid>
                        {/* Chủ đề */}
                        <SkyGrid item xs={12} md={4}>
                            <Controller
                                name="topic"
                                control={control}
                                render={({ field }) => (
                                    <WapperCustomAutoComplete
                                        label="Chủ đề"
                                        placeholder="Tìm kiếm"
                                        code='CDCV'
                                        {...field}
                                    />
                                )}
                            />
                        </SkyGrid>

                        {/* Hàng 3: Công việc cần phê duyệt + Công việc lặp + Giờ lặp */}
                        {/* Công việc cần phê duyệt */}
                        <StytedAddJob item xs={12} md={4}>
                            <Controller
                                name="isApprovalRequired"
                                control={control}
                                render={({ field }) => (
                                    <BoldSkyFormControlLabel
                                        control={
                                            <SkyCheckbox
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label="Xác nhận hoàn thành"
                                    />
                                )}
                            />
                        </StytedAddJob>
                        {/* Công việc lặp lại */}
                        <SkyGrid item xs={12} md={4}>
                            <Controller
                                name="repetitiveTask"
                                control={control}
                                render={({ field }) => (
                                    <WrappedCustomInput
                                        select
                                        label="Chu kỳ"
                                        options={optionModeOfWork}
                                        customLabel="title"
                                        customValue="value"
                                        {...field}
                                        onChange={handleRepetitiveTaskChange}
                                        error={!!errors.repetitiveTask}
                                        helperText={errors.repetitiveTask?.message}
                                    />
                                )}
                            />
                        </SkyGrid>
                        {/* Số ngày thực hiện và Giờ lặp HOẶC Chọn tháng lặp trong quý */}
                        {repeatTask === 'quy' ? (
                            <SkyGrid item xs={12} md={4}>
                                <Controller
                                    name="monthInQuarter"
                                    control={control}
                                    render={({ field }) => (
                                        <WrappedCustomInput
                                            select
                                            label="Chọn tháng lặp trong quý"
                                            options={monthInQuarterOptions}
                                            customLabel="label"
                                            customValue="value"
                                            {...field}
                                            required
                                        />
                                    )}
                                />
                            </SkyGrid>
                        ) : (
                            <SkyGrid item xs={12} md={4}>
                                <SkyGrid container spacing={2}>
                                    {repeatTask !== 'ngay' ? (
                                        <>
                                            <SkyGrid item xs={6}>
                                                <Controller
                                                    name="durationDays"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <WrappedCustomInput
                                                            type="number"
                                                            required
                                                            label="Số ngày thực hiện"
                                                            placeholder="Nhập số ngày"
                                                            {...field}
                                                            error={!!errors.durationDays}
                                                            helperText={errors.durationDays?.message}
                                                        />
                                                    )}
                                                />
                                            </SkyGrid>
                                            <SkyGrid item xs={6}>
                                                <Controller
                                                    name="startTime"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <WapperCustomDateTimePicker
                                                            timeOnly
                                                            label="Giờ lặp"
                                                            required
                                                            {...field}
                                                            error={!!errors.startTime}
                                                            helperText={errors.startTime?.message}
                                                        />
                                                    )}
                                                />
                                            </SkyGrid>
                                        </>
                                    ) : (
                                        <SkyGrid item xs={12}>
                                            <Controller
                                                name="startTime"
                                                control={control}
                                                render={({ field }) => (
                                                    <WapperCustomDateTimePicker
                                                        timeOnly
                                                        label="Giờ lặp"
                                                        required
                                                        {...field}
                                                        error={!!errors.startTime}
                                                        helperText={errors.startTime?.message}
                                                    />
                                                )}
                                            />
                                        </SkyGrid>
                                    )}
                                </SkyGrid>
                            </SkyGrid>
                        )}

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
                                    {/* Tùy chọn 1: Vào thứ X + Đầu tiên của tháng */}
                                    <SkyGrid item xs={12} md={4}>
                                        <Controller
                                            name="monthPattern"
                                            control={control}
                                            render={({ field }) => {
                                                const handleWeekdayChange = () => field.onChange('weekday');
                                                return (
                                                    <MonthlyRadioContainer>
                                                        <SkyRadio
                                                            checked={field.value === 'weekday'}
                                                            onChange={handleWeekdayChange}
                                                            size="small"
                                                        />
                                                        <MonthOptionCard>
                                                            <MonthOptionLabel>Vào ngày</MonthOptionLabel>
                                                            <MonthlySkyBoxContainer>
                                                                <Controller
                                                                    name="monthWeekday"
                                                                    control={control}
                                                                    render={({ field: weekdayField }) => (
                                                                        <StyleSkyBox flx={1} mWidth="80px">
                                                                            <WrappedCustomInput
                                                                                select
                                                                                disableClear
                                                                                options={weekdayOptions}
                                                                                customLabel="label"
                                                                                customValue="value"
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
                                                                            <WrappedCustomInput
                                                                                select
                                                                                disableClear
                                                                                options={weekOfMonthOptions}
                                                                                customLabel="label"
                                                                                customValue="value"
                                                                                {...positionField}
                                                                            />
                                                                        </StyleSkyBox>
                                                                    )}
                                                                />
                                                            </MonthlySkyBoxContainer>
                                                        </MonthOptionCard>
                                                    </MonthlyRadioContainer>
                                                );
                                            }}
                                        />
                                    </SkyGrid>

                                    {/* Tùy chọn 2: Vào ngày + Date Grid Popup */}
                                    <SkyGrid item xs={12} md={4}>
                                        <Controller
                                            name="monthPattern"
                                            control={control}
                                            render={({ field }) => {
                                                const handleDayOfMonthChange = () => field.onChange('dayOfMonth');
                                                return (
                                                    <MonthlyRadioContainer>
                                                        <SkyRadio
                                                            checked={field.value === 'dayOfMonth'}
                                                            onChange={handleDayOfMonthChange}
                                                            size="small"
                                                        />
                                                        <MonthOptionCard>
                                                            <MonthOptionLabel>Vào ngày</MonthOptionLabel>
                                                            <MonthlyInlineGroup>
                                                                <Controller
                                                                    name="monthDay"
                                                                    control={control}
                                                                    render={({ field: dayField }) => {
                                                                        const handleInputClick = (event) => {
                                                                            setDateGridAnchor(event.currentTarget);
                                                                        };

                                                                        const handlePopoverClose = () => {
                                                                            setDateGridAnchor(null);
                                                                        };

                                                                        return (
                                                                            <>
                                                                                <MonthlyInputWrapper onClick={handleInputClick}>
                                                                                    <WrappedCustomInput
                                                                                        type="number"
                                                                                        {...dayField}
                                                                                        readOnly
                                                                                        inputProps={{ min: 1, max: 28 }}
                                                                                    />
                                                                                </MonthlyInputWrapper>

                                                                                <SkyPopover
                                                                                    open={isDateGridOpen}
                                                                                    anchorEl={dateGridAnchor}
                                                                                    onClose={handlePopoverClose}
                                                                                    anchorOrigin={{
                                                                                        vertical: 'bottom',
                                                                                        horizontal: 'left',
                                                                                    }}
                                                                                    transformOrigin={{
                                                                                        vertical: 'top',
                                                                                        horizontal: 'left',
                                                                                    }}
                                                                                >
                                                                                    <DateGridContainer>
                                                                                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                                                                                            const isSelected = Number(dayField.value) === day;
                                                                                            const handleClick = () => handleSingleDaySelect(day, dayField.onChange, setDateGridAnchor);
                                                                                            return (
                                                                                                <DateCell
                                                                                                    key={day}
                                                                                                    isSelected={isSelected}
                                                                                                    onClick={handleClick}
                                                                                                >
                                                                                                    {day}
                                                                                                </DateCell>
                                                                                            );
                                                                                        })}
                                                                                    </DateGridContainer>
                                                                                </SkyPopover>
                                                                            </>
                                                                        );
                                                                    }}
                                                                />
                                                                <StyleTypography>của tháng</StyleTypography>
                                                            </MonthlyInlineGroup>
                                                        </MonthOptionCard>
                                                    </MonthlyRadioContainer>
                                                );
                                            }}
                                        />
                                    </SkyGrid>

                                    {/* Tùy chọn 3: Vào ngày cuối cùng của tháng */}
                                    <SkyGrid item xs={12} md={4}>
                                        <Controller
                                            name="monthPattern"
                                            control={control}
                                            render={({ field }) => {
                                                const handleLastDayChange = () => field.onChange('lastDay');
                                                return (
                                                    <LastDayRadioContainer>
                                                        <SkyRadio
                                                            checked={field.value === 'lastDay'}
                                                            onChange={handleLastDayChange}
                                                            size="small"
                                                        />
                                                        <StyleTypography>Vào ngày cuối cùng của tháng</StyleTypography>
                                                    </LastDayRadioContainer>
                                                );
                                            }}
                                        />
                                    </SkyGrid>
                                </SkyGrid>
                            )}

                            {/* ===== CHO QUÝ ===== */}
                            {repeatTask === 'quy' && (
                                <SkyGrid container spacing={2}>
                                    {/* Số ngày thực hiện và Giờ lặp */}
                                    <SkyGrid item xs={12} md={4}>
                                        <SkyGrid container spacing={2}>
                                            <SkyGrid item xs={6}>
                                                <Controller
                                                    name="durationDays"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <WrappedCustomInput
                                                            type="number"
                                                            required
                                                            label="Số ngày thực hiện"
                                                            placeholder="Nhập số ngày"
                                                            {...field}
                                                            error={!!errors.durationDays}
                                                            helperText={errors.durationDays?.message}
                                                        />
                                                    )}
                                                />
                                            </SkyGrid>
                                            <SkyGrid item xs={6}>
                                                <Controller
                                                    name="startTime"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <WapperCustomDateTimePicker
                                                            timeOnly
                                                            label="Giờ lặp"
                                                            required
                                                            {...field}
                                                            error={!!errors.startTime}
                                                            helperText={errors.startTime?.message}
                                                        />
                                                    )}
                                                />
                                            </SkyGrid>
                                        </SkyGrid>
                                    </SkyGrid>

                                    {/* Radio: Vào ngày X của tháng + Popup Grid Selection */}
                                    <SkyGrid item xs={12} md={4}>
                                        <Controller
                                            name="quarterPattern"
                                            control={control}
                                            render={({ field }) => {
                                                const handleQuarterDayPatternChange = () => field.onChange('dayOfMonth');
                                                return (
                                                    <MonthlyRadioContainer>
                                                        <SkyRadio
                                                            checked={field.value === 'dayOfMonth'}
                                                            onChange={handleQuarterDayPatternChange}
                                                            size="small"
                                                        />
                                                        <MonthOptionCard>
                                                            <MonthOptionLabel>Vào ngày</MonthOptionLabel>
                                                            <MonthlyInlineGroup>
                                                                <Controller
                                                                    name="quarterDay"
                                                                    control={control}
                                                                    render={({ field: dayField }) => {
                                                                        const handleInputClick = (event) => {
                                                                            setQuarterDateGridAnchor(event.currentTarget);
                                                                        };

                                                                        const handlePopoverClose = () => {
                                                                            setQuarterDateGridAnchor(null);
                                                                        };

                                                                        return (
                                                                            <>
                                                                                <MonthlyInputWrapper onClick={handleInputClick}>
                                                                                    <WrappedCustomInput
                                                                                        type="number"
                                                                                        {...dayField}
                                                                                        readOnly
                                                                                        inputProps={{ min: 1, max: 28 }}
                                                                                    />
                                                                                </MonthlyInputWrapper>

                                                                                <SkyPopover
                                                                                    open={isQuarterDateGridOpen}
                                                                                    anchorEl={quarterDateGridAnchor}
                                                                                    onClose={handlePopoverClose}
                                                                                    anchorOrigin={{
                                                                                        vertical: 'bottom',
                                                                                        horizontal: 'left',
                                                                                    }}
                                                                                    transformOrigin={{
                                                                                        vertical: 'top',
                                                                                        horizontal: 'left',
                                                                                    }}
                                                                                >
                                                                                    <DateGridContainer>
                                                                                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                                                                                            const isSelected = Number(dayField.value) === day;
                                                                                            const handleClick = () => handleSingleDaySelect(day, dayField.onChange, setQuarterDateGridAnchor);
                                                                                            return (
                                                                                                <DateCell
                                                                                                    key={day}
                                                                                                    isSelected={isSelected}
                                                                                                    onClick={handleClick}
                                                                                                >
                                                                                                    {day}
                                                                                                </DateCell>
                                                                                            );
                                                                                        })}
                                                                                    </DateGridContainer>
                                                                                </SkyPopover>
                                                                            </>
                                                                        );
                                                                    }}
                                                                />
                                                                <StyleTypography>của tháng</StyleTypography>
                                                            </MonthlyInlineGroup>
                                                        </MonthOptionCard>
                                                    </MonthlyRadioContainer>
                                                );
                                            }}
                                        />
                                    </SkyGrid>

                                    {/* Radio: Vào ngày cuối cùng của tháng */}
                                    <SkyGrid item xs={12} md={4}>
                                        <Controller
                                            name="quarterPattern"
                                            control={control}
                                            render={({ field }) => {
                                                const handleLastDayChange = () => field.onChange('lastDay');
                                                return (
                                                    <LastDayRadioContainer>
                                                        <SkyRadio
                                                            checked={field.value === 'lastDay'}
                                                            onChange={handleLastDayChange}
                                                            size="small"
                                                        />
                                                        <StyleTypography>Vào ngày cuối cùng của tháng</StyleTypography>
                                                    </LastDayRadioContainer>
                                                );
                                            }}
                                        />
                                    </SkyGrid>
                                </SkyGrid>
                            )}
                        </SkyGrid>

                        {/* Hàng 4: Mô tả */}
                        <SkyGrid item xs={12}>
                            <Controller
                                name="note"
                                control={control}
                                render={({ field }) => (
                                    <WrappedCustomInput
                                        multiline
                                        rows={4}
                                        label="Mô tả"
                                        placeholder="Nhập mô tả"
                                        {...field}
                                        error={!!errors.note}
                                        helperText={errors.note?.message}
                                    />
                                )}
                            />
                        </SkyGrid>
                    </SkyGrid>
                </StyledBoxContainerContent>

                <StyledBoxContainerContent styledMarginTop>
                    <JobCommentHeader mt={2.5} mb={2.5}>
                        <SkyFlexGap8 >
                            <StyledIconWrapper noBg>
                                <StytedPeopleIcon />
                            </StyledIconWrapper>
                            <JobSectionTitle variant="h6" gutterBottom mb={0} >
                                NGƯỜI THAM GIA
                            </JobSectionTitle>
                        </SkyFlexGap8>
                         
                    </JobCommentHeader>
                    <SkyGrid container spacing={2} mb={3}>
                        <SkyGrid item xs={12} md={6}>
                            <WrappedAsyncAutoComplete
                                label="Người giao việc"
                                disabled
                                isMulti
                                options={user ? [{ id: user?.id, name: user?.name, parentName: user?.organizationName }] : []}
                                value={user ? [{ id: user?.id, name: user?.name, parentName: user?.organizationName }] : []}
                                optionLabel="name"
                                optionValue="id"
                                optionSubLabel="parentName"
                            />
                        </SkyGrid>

                        <SkyGrid item xs={12} md={6}>
                            <Controller
                                name="directors"
                                control={control}
                                render={({ field }) => (
                                    !(checkPermision?.directorSelectDepartment) ?
                                        <WrappedAsyncAutoComplete
                                            {...field}
                                            label="Người chủ trì"
                                            url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=director&leaderId=${user?.id || ""}&excludeId=${leaderExcludeIds}`}
                                            queryParams={["name", "email"]}
                                            optionLabel="name"
                                            optionValue="id"
                                            optionSubLabel="parentName"

                                        /> : <WrappedPersonOrUnitAsyncInput
                                            {...field}
                                            label="Người chủ trì"
                                            personUrl={`${API_GET_COMMON_WORK_USER}?typeTaskUser=director&leaderId=${user?.id || ""}&excludeId=${leaderExcludeIds}`}
                                            unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=director`}
                                            personQueryParams={["name", "email"]}
                                            unitQueryParams={["name"]}
                                            optionValue="id"
                                            onTypeChange={setLeaderType}
                                            defaultType={leaderType}
                                            optionSubLabel="parentName"
                                        />
                                )}
                            />
                        </SkyGrid>

                        {!checkPermision?.disableSuporter && !hideCoordinators &&
                            <SkyGrid item xs={12} md={6}>
                                <Controller
                                    name="supporters"
                                    control={control}
                                    render={({ field }) => (
                                        !(checkPermision?.supporterSelectDepartment) ?
                                            <WrappedAsyncAutoComplete
                                                {...field}
                                                label="Người phối hợp"
                                                url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=supporter&leaderId=${user?.id || ""}&excludeId=${coordinatorExcludeIds}`}
                                                queryParams={["name", "email"]}
                                                optionLabel="name"
                                                isMulti
                                                limitTags={3}
                                                optionValue="id"
                                                optionSubLabel="parentName"
                                            /> : <WrappedPersonOrUnitAsyncInput
                                                {...field}
                                                label="Người phối hợp"
                                                personUrl={`${API_GET_COMMON_WORK_USER}?typeTaskUser=supporter&leaderId=${user?.id || ""}&excludeId=${coordinatorExcludeIds}`}
                                                unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=supporter`}
                                                personQueryParams={["name", "email"]}
                                                unitQueryParams={["name"]}
                                                isMulti
                                                limitTags={2}
                                                optionValue="id"
                                                onTypeChange={setCoordinatorType}
                                                defaultType={coordinatorType}
                                                optionSubLabel="parentName"
                                            />
                                    )}
                                />
                            </SkyGrid>
                        }

                        <SkyGrid item xs={12} md={6}>
                            <Controller
                                name="viewers"
                                control={control}
                                render={({ field }) => (
                                    <WrappedAsyncAutoComplete
                                        isMulti
                                        label="Người xem"
                                        placeholder="Tìm kiếm"
                                        {...field}
                                        url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=viewer&leaderId=${user?.id || ""}&excludeId=${viewerExcludeIds}`}
                                        queryParams={["name", "email"]}
                                        optionLabel="name"
                                        optionValue="id"
                                        optionSubLabel="parentName"
                                        limitTags={3}
                                     />
                                )}
                            />
                        </SkyGrid>
                    </SkyGrid>
                </StyledBoxContainerContent>

                <SkyFlexGap8 mt={2.5} mb={2.5}>
                    <StyledIconWrapper>
                        <StytedDescriptionIcon />
                    </StyledIconWrapper>
                    <JobSectionTitle variant="h6" gutterBottom mb={0} >
                        TÀI LIỆU LIÊN QUAN
                    </JobSectionTitle>
                </SkyFlexGap8>
                <UploadDropZone
                    styledMarginTop
                    as={StyledBoxContainerContent}
                    isDragging={isDragging}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >

                    <JobButtonContainer>
                        <ButtonOutline onClick={handleOpenLinkPopup} startIcon={<svg width="16" height="8" viewBox="0 0 16 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.13215 7.2L3.96231 7.2C2.86607 7.2 1.93176 6.84888 1.15937 6.14664C0.386986 5.4444 0.000528848 4.59552 5.40929e-07 3.6C-0.000527766 2.60448 0.385929 1.7556 1.15937 1.05336C1.93281 0.35112 2.86712 0 3.96231 0L7.13215 0V1.44L3.96231 1.44C3.30192 1.44 2.74059 1.65 2.27833 2.07C1.81606 2.49 1.58492 3 1.58492 3.6C1.58492 4.2 1.81606 4.71 2.27833 5.13C2.74059 5.55 3.30192 5.76 3.96231 5.76L7.13215 5.76V7.2ZM4.75477 4.32V2.88L11.0945 2.88L11.0945 4.32L4.75477 4.32ZM8.71707 7.2V5.76L11.8869 5.76C12.5473 5.76 13.1086 5.55 13.5709 5.13C14.0332 4.71 14.2643 4.2 14.2643 3.6C14.2643 3 14.0332 2.49 13.5709 2.07C13.1086 1.65 12.5473 1.44 11.8869 1.44L8.71707 1.44V0L11.8869 0C12.9832 0 13.9177 0.35112 14.6906 1.05336C15.4636 1.7556 15.8497 2.60448 15.8492 3.6C15.8487 4.59552 15.4622 5.44464 14.6898 6.14736C13.9175 6.85008 12.9832 7.20096 11.8869 7.2L8.71707 7.2Z" fill="#2364B0" />
                        </svg>}>
                            Thêm Link
                        </ButtonOutline>
                        <ButtonOutline component="label" startIcon={<svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.05 4.69141C10.42 4.69141 10.72 4.99137 10.72 5.36141C10.72 5.73145 10.42 6.03141 10.05 6.03141L0.67 6.03141C0.299972 6.03141 0 5.73145 0 5.36141C0 4.99137 0.299972 4.69141 0.67 4.69141L10.05 4.69141Z" fill="#2364B0" />
                            <path d="M4.68945 10.05L4.68945 0.67C4.68945 0.299972 4.98941 0 5.35945 0C5.72949 0 6.02945 0.299972 6.02945 0.67L6.02945 10.05C6.02945 10.42 5.72949 10.72 5.35945 10.72C4.98941 10.72 4.68945 10.42 4.68945 10.05Z" fill="#2364B0" />
                        </svg>}>
                            Thêm File
                            <input type="file" hidden multiple onChange={handleFilesChange} />
                        </ButtonOutline>
                        <ButtonOutline component="label" startIcon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_7026_12675)">
                                <path d="M0.630859 12.0247L0.630859 3.31469C0.630859 2.7816 0.84278 2.27051 1.21973 1.89356C1.59668 1.51661 2.10777 1.30469 2.64086 1.30469L5.27375 1.30469L5.39872 1.30861C5.68824 1.32665 5.97083 1.4074 6.22706 1.54547C6.51997 1.70332 6.76967 1.93104 6.95264 2.20893L7.49119 3.00651L7.49508 3.01305L7.54546 3.08045C7.59973 3.14387 7.66566 3.19671 7.73983 3.23617C7.83865 3.2888 7.94907 3.31575 8.06103 3.31469L13.3609 3.31469L13.5598 3.3245C14.0198 3.37024 14.4522 3.57378 14.782 3.90356C15.1589 4.28051 15.3709 4.7916 15.3709 5.32469L15.3709 12.0247C15.3709 12.5578 15.1589 13.0689 14.782 13.4458C14.4051 13.8228 13.894 14.0347 13.3609 14.0347L2.64086 14.0347C2.10777 14.0347 1.59668 13.8228 1.21973 13.4458C0.84278 13.0689 0.630859 12.5577 0.630859 12.0247ZM1.97086 12.0247C1.97086 12.2024 2.0415 12.3728 2.16715 12.4984C2.2928 12.6241 2.46316 12.6947 2.64086 12.6947L13.3609 12.6947C13.5385 12.6947 13.7089 12.6241 13.8345 12.4984C13.9602 12.3728 14.0309 12.2024 14.0309 12.0247L14.0309 5.32469C14.0309 5.14699 13.9602 4.97663 13.8345 4.85098C13.7246 4.741 13.5804 4.67316 13.4269 4.65796L13.3609 4.65469L8.06759 4.65469C7.7338 4.65683 7.40443 4.57609 7.10969 4.41914C6.81523 4.2623 6.56465 4.03426 6.38016 3.75634L5.83775 2.95286L5.83318 2.94632C5.77221 2.85375 5.68929 2.77778 5.59174 2.72517C5.51859 2.68575 5.43882 2.66017 5.35685 2.64992L5.27375 2.64469L2.64086 2.64469C2.46316 2.64469 2.2928 2.71533 2.16715 2.84098C2.0415 2.96663 1.97086 3.13699 1.97086 3.31469L1.97086 12.0247Z" fill="#2364B0" />
                            </g>
                            <defs>
                                <clipPath id="clip0_7026_12675">
                                    <rect width="16" height="16" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>}>
                            Thư mục
                            <input type="file" hidden multiple webkitdirectory="" onChange={handleFilesChange} />
                        </ButtonOutline>
                    </JobButtonContainer>

                    {/* Hiển thị FileTreeTable với cấu trúc cây */}
                    <FileTreeTable
                        data={fileTreeData}
                        onFileMenuClick={handleFileMenuClick}
                        MenuIcon={StyledMenuIcon}
                        emptyMessage="Kéo thả tệp hoặc thư mục vào đây để tải lên"
                        disableHeader
                    />
                    <SkyMenu
                        anchorEl={fileMenuAnchor}
                        open={Boolean(fileMenuAnchor)}
                        onClose={handleCloseFileMenu}
                        id="file-menu"
                    >
                        <SkyMenuItem onClick={handleOpenDeleteDialog}>
                            <StyledListItemIcon>
                                <DeleteOutline />
                            </StyledListItemIcon>
                            <SkyListItemText>Xóa</SkyListItemText>
                        </SkyMenuItem>
                    </SkyMenu>
                </UploadDropZone>
            </JobMainContent>



            <PopupTemplate
                open={openPopupTemplate}
                onClose={handleClosePopupTemplate}
                onSave={handleConfirmBypassTemplate}
                templateWarningInfo={templateWarningInfo?.templateName}
                onCloseDialog={onClose}
                setReloadData={setReloadData}
                templateName={templateWarningInfo?.templateName}
            />

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
            <LoadingDialog open={loading}>
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>

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
                        <WrappedCustomInput
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
                        <WrappedCustomInput
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


        </Swipper>
    );
}

export default memo(RepetitiveWork)