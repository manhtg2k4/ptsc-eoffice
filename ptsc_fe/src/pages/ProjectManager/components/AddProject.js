/* eslint-disable camelcase */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useCallback, useContext, useMemo } from "react";
import {
    Grid,
    ListItemText,
    Menu,
    MenuItem,
} from "@mui/material";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import FolderIcon from "@mui/icons-material/Folder";
import LinkIcon from "@mui/icons-material/Link";
import CustomInput from "@components/CustomInput/CustomInputBase";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import { withFormWrapper, FormItem } from "@components/common/FormWrapper";

import * as yup from "yup";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import { APP_BASE, API_PROJECT_MANAGEMENT, API_GET_LIST_USERS, API_TEMPLATE_SAMPLE, API_MERGE_LINK } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import PopupTemplate from "@pages/WorkManagement/components/PopupTemplate";
import { calculateSiblingsDuration } from "@pages/TemplateSample/utils";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import { AuthContext } from "@AuthContext/AuthProvider";
import {
    JobButtonContainer,
    JobMainContent,
    JobPlaceholderText,
    JobSectionTitle,
    JobUploadPlaceholderBox,
    StyledBoxContainerContent,
    StyledIconWrapper,
    StyledListItemIcon,
    StyledMenuIcon,
} from "./AddProject.styles";
import { SkyFlexGap8, SkyGrid, SkyIconButton, SkyTooltip } from "@styles/SkyStyles";
import { useSelector } from "react-redux";
import FileTreeTable from "@components/FileTreeTable";
import {
    UPLOAD_LIMITS_PER_FILE,
    UPLOAD_LIMITS_PER_FOLDER,
    UPLOAD_LIMITS_PER_BATCH,
    UPLOAD_LIMITS_PER_TASK,
    validateFileName,
    validateFileExtension,
    formatFileSize,
    generateDuplicateName
} from "./constants";
import { processFilesForUpload, convertFilesToTreeData } from "@utils/utils";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import LoadingDialog from "@components/LoadingDialog";
import { DeleteOutline } from "@mui/icons-material";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import { 
    StyledCustomInput, 
    WrapChipContainer, 
    MemberCardWrapper,
    MoreMembersBadge,
    ClearableInputAdornment,
    ClearIconButton, 
} from "@styles/PopupTableMembersProject/PopupTableMembersProject.style";
import PopupTableMembersProject from "./PopupTableMembersProject";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { StyleLine, StytedDescriptionIcon, StytedPeopleIcon } from "@pages/WorkManagement/components/Job.styles";
import CustomButton from '@components/CustomButton';

dayjs.extend(isSameOrAfter);
const logger = console;

const AddProject = ({
    open,
    onClose,
    onSuccess,
    sharedComponents,
    title = "Thêm mới dự án",
}) => {
    const {
        // CustomSwipper,
        InputComponents: BaseInput,
        ButtonOutline,
    } = sharedComponents;

    // Wrapper component to move labels above inputs (giống GeneralInformation.js)
    const InputComponents = useMemo(() => {
        const Wrapped = withFormWrapper(BaseInput, "input");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "InputComponents";
        return Component;
    }, [BaseInput]);

    const WrappedDateTimeRangePicker = useMemo(() => {
        const Wrapped = withFormWrapper(DateTimeRangePicker, "date");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WrappedDateTimeRangePicker";
        return Component;
    }, []);

    const WrappedAsyncAutoComplete = useMemo(() => {
        const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WrappedAsyncAutoComplete";
        return Component;
    }, []);
    const { crmSource } = useSelector((state) => state.config);

    const [userOptions, setUserOptions] = React.useState([]);

    useEffect(() => {
        const fetchUserOptions = async () => {
            try {
                const response = await axiosInstance.get(`${API_GET_LIST_USERS}/all`);
                const data = response?.data?.data || response?.data || response || [];
                setUserOptions(data);
            } catch (error) {
                // eslint-disable-next-line no-console
                logger.error("Lỗi khi lấy danh sách người dùng:", error);
            }
        };
        fetchUserOptions();
    }, []);

    const urgencyOptions = useMemo(() =>
        crmSource.find((item) => item.code === "DOUUTIEN")?.data || [],
        [crmSource]);

    const projectTypeOptions = useMemo(() =>
        crmSource.find((item) => item.code === "LOAIDUAN")?.data || [],
        [crmSource]);

    const timeOptions = useMemo(() =>
        crmSource.find((item) => item.code === "S34")?.data || [],
        [crmSource]);

    const moneyOptions = useMemo(() => {
        const rawOptions = crmSource.find((item) => item.code === "TIENTEDUAN")?.data || [];
        return rawOptions.map(opt => ({
            ...opt,
            value: opt.value ? Number(opt.value) : opt.value
        }));
    }, [crmSource]);




    const { user } = useContext(AuthContext);

    const schema = yup.object().shape({
        name: yup.string()
            .required("Vui lòng nhập tên dự án, hạng mục đầu tư")
            .max(500, "Tên dự án, hạng mục đầu tư không được vượt quá 500 ký tự"),
        startDate: yup
            .date()
            .required("Vui lòng chọn ngày bắt đầu")
            .typeError("Ngày bắt đầu không hợp lệ")
            .test(
                "startDate-not-past",
                "Ngày bắt đầu không được ở trong quá khứ",
                (value) => {
                    if (!value) return true;
                    // Cho phép ngày hôm nay và tương lai
                    return dayjs(value).isSameOrAfter(dayjs(), 'day');
                }
            ),
        endDate: yup
            .date()
            .required("Vui lòng chọn ngày kết thúc")
            .typeError("Ngày kết thúc không hợp lệ")
            .test(
                "endDate-not-past",
                "Ngày kết thúc không được ở trong quá khứ",
                (value) => {
                    if (!value) return true;
                    return dayjs(value).isSameOrAfter(dayjs(), 'day');
                }
            )
            .test(
                'endDate-after-startDate',
                'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu',
                function (value) {
                    const { startDate } = this.parent;
                    if (!value || !startDate) return true;
                    return dayjs(value).isSameOrAfter(dayjs(startDate));
                }
            ),
        reminderDays: yup.string().default("12h"),
        budget: yup.string()
            .matches(/^[0-9.]*$/, "Chỉ cho phép nhập số")
            .max(50, "Tổng mức đầu tư không được vượt quá 50 ký tự")
            .nullable()
            .default("0"),
        moneyUnit: yup.mixed().nullable(),
        description: yup.string().nullable().max(3000, "Mô tả không được vượt quá 3000 ký tự"),
        manager: yup.mixed().required("Vui lòng chọn quản lý dự án"),
    });

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        trigger,
        setValue,
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            code: "",
            name: "",
            startDate: null,
            endDate: null,
            process: "",
            reminderDays: "12h",
            priority: "",
            typeProject: "",
            budget: 0,
            moneyUnit: "",
            description: "",
            projectStatus: "",
            manager: user?.user ? [{
                id: user.user._id || user.user.id,
                name: user.user.name || user.user.fullName || "Tôi",
                parentName: user.user.parentName || user.user.departmentName || user.user.organizationUnitName || user.user.groupName || (user.user.parent && user.user.parent.name) || (user.user.department && user.user.department.name) || ""
            }] : [],
            assigner: user?.user ? {
                id: user.user._id || user.user.id,
                name: user.user.name || user.user.fullName || "Tôi"
            } : null,
            members: [],
            viewers: [],
            files: [],
        },
    });

    const manager = useWatch({ control, name: "manager" });
    const members = useWatch({ control, name: "members" });
    const viewersList = useWatch({ control, name: "viewers" });

    const getId = (val) => val?.id || val?._id || val;
    const managerIds = Array.isArray(manager) ? manager.map(getId) : (manager ? [getId(manager)] : []);
    const memberIds = Array.isArray(members) ? members.map(getId) : [];
    const viewerIds = Array.isArray(viewersList) ? viewersList.map(getId) : [];

    const excludeForManager = [...memberIds, ...viewerIds].filter(Boolean).join(",");
    const excludeForMembers = [...managerIds, ...viewerIds].filter(Boolean).join(",");
    const excludeForViewers = [...managerIds, ...memberIds].filter(Boolean).join(",");

    const getChipLabel = useCallback((item) => {
        const name = item.name || item.fullName || item.id;
        return item.groupName ? `${name} (${item.groupName})` : name;
    }, []);
    const getFullChipLabel = useCallback((item) => {
        const name = item.name || item.fullName || item.id;
        return item.groupName ? `${name} (${item.groupName})` : name;
    }, []);
    const getMemberName = useCallback((item) => {
        return item.name || item.fullName || item.id;
    }, []);
    const getMemberGroup = useCallback((item) => {
        return item.groupName || item.organizationUnitName || item.departmentName || item.parentName || (item.parent && item.parent.name) || "";
    }, []);

    const handleDeleteChip = useCallback((e, item) => {
        e?.stopPropagation();
        const newList = (members || []).filter(u => (u.id || u._id) !== (item.id || item._id));
        setUserByOrganizationUnits(newList);
        setValue("members", newList, { shouldValidate: true });
    }, [members, setValue]);

    const handleClick = useCallback((e) => {
        e?.stopPropagation();
        setUserByOrganizationUnits([]);
        setValue("members", [], { shouldValidate: true });
    }, [setValue]);

    const selectValue = useMemo(() => {
        const filteredData = (members || []).filter(u => !u.isDepartment);
        return {
            data: filteredData,
            value: Array.isArray(filteredData) ? filteredData.map(u => {
                const name = u.name || u.fullName || u.id;
                return u.groupName ? `${name} (${u.groupName})` : name;
            }).join('; ') : ''
        };
    }, [members]);

    // Tự động thêm trưởng phòng của thành viên vào danh sách người xem
    useEffect(() => {
        if (!members || !Array.isArray(members)) return;

        const currentViewers = Array.isArray(viewersList) ? [...viewersList] : [];
        let hasChanges = false;

        members.forEach(memberId => {
            // Find the full user object from the options to get their manager
            const memberObj = userOptions.find(u => (u?._id || u?.id) === memberId);
            const deptManager = memberObj?.manager || memberObj?.directManager;

            if (deptManager) {
                const managerId = deptManager?._id || deptManager?.id || deptManager;

                const isAlreadyViewer = currentViewers.some(v => (v?._id || v?.id || v) === managerId);
                const isMember = members.some(m => (m?._id || m?.id || m) === managerId);

                if (!isAlreadyViewer && !isMember) {
                    currentViewers.push(managerId);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            setValue("viewers", currentViewers);
        }
    }, [members, userOptions, setValue]);

    const [uploadedFiles, setUploadedFiles] = React.useState([]);

    const [isLoading, setIsLoading] = React.useState(false);

    // State cho việc xử lý trùng lặp
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [pendingFiles, setPendingFiles] = React.useState([]);

    const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
    const [selectedFileId, setSelectedFileId] = React.useState(null);
    const [selectedIsFolder, setSelectedIsFolder] = React.useState(false);
    const toast = useToast();

    const [openPopupTemplate, setOpenPopupTemplate] = React.useState(false);
    const [selectedTemplateName, setSelectedTemplateName] = React.useState("");
    const [pendingPayload, setPendingPayload] = React.useState(null);

    const [isLinkPopupOpen, setIsLinkPopupOpen] = React.useState(false);
    const [linkFormValues, setLinkFormValues] = React.useState({ name: "", link: "" });
    const [linkErrors, setLinkErrors] = React.useState({ name: "", link: "" });

    const [openDialog, setOpenDialog] = React.useState(false);
    const [userByOrganizationUnits, setUserByOrganizationUnits] = React.useState([]);
    
    const validateURL = useCallback((url) => {
        const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_.~+%=&]*)?$', 'i'); // fragment locator
        return !!pattern.test(url.trim());
    }, []);

    const checkTemplateDuration = async (data) => {
        const processId = data.process?.id || data.process?._id || data.process;
        if (!processId || !data.startDate || !data.endDate) return true;

        try {
            const res = await axiosInstance.get(`${API_TEMPLATE_SAMPLE}/${processId}`);
            const templateData = res?.data?.data || res?.data || res || {};
            const tasks = templateData.tasks || [];

            if (tasks.length === 0) return true;

            const templateMinutes = calculateSiblingsDuration(tasks);
            const projectMinutes = dayjs(data.endDate).diff(dayjs(data.startDate), "minute");

            if (templateMinutes > projectMinutes) {
                setSelectedTemplateName(templateData.name || "Quy trình mẫu");
                return false;
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            logger.error("Lỗi khi kiểm tra thời gian quy trình:", error);
        }
        return true;
    };

    const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
        setValue("startDate", startDate, { shouldValidate: true });
        setValue("endDate", endDate, { shouldValidate: true });
        setTimeout(() => trigger(["startDate", "endDate"]), 0);
    }, [setValue, trigger]);


    // Reset form khi mở
    useEffect(() => {
        if (open) {
            reset({
                code: "",
                name: "",
                startDate: null,
                endDate: null,
                process: "",
                reminderDays: "12h",
                priority: "",
                typeProject: "",
                budget: 0,
                moneyUnit: "",
                description: "",
                projectStatus: "",
                manager: user?.user ? [{
                    id: user.user._id || user.user.id,
                    name: user.user.name || user.user.fullName || "Tôi",
                    parentName: user.user.parentName || user.user.departmentName || user.user.organizationUnitName || user.user.groupName || (user.user.parent && user.user.parent.name) || (user.user.department && user.user.department.name) || ""
                }] : [],
                members: [],
                viewers: [],
                files: [],
            });
            setUploadedFiles([]);
            setFileMenuAnchor(null);
            setSelectedFileId(null);
            setSelectedIsFolder(false);

        }
    }, [open, reset, user]);

    const onSubmit = async (data, bypassFlag = false) => {
        setIsLoading(true);
        const isBypass = typeof bypassFlag === 'boolean' ? bypassFlag : false;

        if (!isBypass && data.process) {
            const isDurationValid = await checkTemplateDuration(data);
            if (!isDurationValid) {
                setPendingPayload(data);
                setOpenPopupTemplate(true);
                setIsLoading(false);
                return;
            }
        }

        const getId = (val) => val?.id || val?._id || val;

        try {
            const payload = {
                code: data.code || "",
                name: data.name,
                startDate: data.startDate ? dayjs(data.startDate).toISOString() : null,
                endDate: data.endDate ? dayjs(data.endDate).toISOString() : null,
                process: data.process ? getId(data.process) : "",
                reminderDays: data.reminderDays || "12h",
                priority: data.priority || "",
                typeProject: data.typeProject || "",
                budget: data.budget ? Number(data.budget.toString().replace(/\./g, "")) : 0,
                moneyUnit: data.moneyUnit ? Number(data.moneyUnit) : null,
                description: data.description || "",
                managerId: Array.isArray(data.manager) ? data.manager.map(getId).join(',') : (data.manager ? getId(data.manager) : null),
                assignerId: data.assigner ? getId(data.assigner) : null,
                members: Array.isArray(data.members) ? data.members.filter(u => !u.isDepartment).map(getId).join(',') : '',
                organizationUnitId: Array.isArray(data.members) ? data.members.filter(u => u.isDepartment).map(getId) : [],
                viewers: Array.isArray(data.viewers) ? data.viewers.map(getId).join(',') : '',
                status: 1,
                bypassTemplateTimeValidation: isBypass
            };

            const response = await axiosInstance.post(API_PROJECT_MANAGEMENT, payload);
            const newProjectId = response?.data?.id || response?.id || response?.data?._id;

            if (!newProjectId) {
                throw new Error("Không nhận được ID dự án sau khi tạo.");
            }

            // Xử lý Gắn Link (nếu có)
            const links = uploadedFiles.filter(f => f.type_file === 'link');
            if (links.length > 0) {
                for (const linkItem of links) {
                    try {
                        await axiosInstance.post(API_MERGE_LINK, {
                            taskId: String(newProjectId),
                            documentName: linkItem.name,
                            documentUrl: linkItem.link
                        });
                    } catch (linkError) {
                        logger.error("Lỗi khi lưu link:", linkError);
                    }
                }
            }

            const filesToUpload = uploadedFiles.filter(f => f instanceof File);
            if (filesToUpload.length === 0) {
                toast("Thêm mới dự án thành công!", "success");
                onSuccess?.();
                onClose();
                return;
            }

            const isFolderUpload = filesToUpload.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));
            logger.log("isFolderUpload", isFolderUpload);
            // 3. Upload file nếu có
            if (isFolderUpload) {
                const createdFolders = {};
                for (const file of filesToUpload) {
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
                                objectType: 'project',
                                objectId: newProjectId,
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
                    formData.append("object_type", 'project');
                    formData.append("object_id", newProjectId);
                    if (parentId) {
                        formData.append("parent_id", parentId);
                    }

                    await axiosInstance.post(`${APP_BASE}/api/files/upload`, formData, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                }

            } else {

                // file bth

                const uploadedFileIds = [];
                for (const file of filesToUpload) {
                    try {
                        const uploadResponse = await apiUploadFile(file, "project", newProjectId);
                        const uploadedId = uploadResponse?.data?._id || uploadResponse?._id || uploadResponse?.id;
                        if (uploadedId) {
                            uploadedFileIds.push(uploadedId);
                        }
                    } catch (uploadError) {
                        toast(`Tải lên tệp ${file.name} thất bại.`, "warning");
                    }
                }
            }

            toast("Thêm mới dự án và tải tệp đính kèm thành công!", "success");
            onSuccess?.();
            onClose();
        } catch (error) {
            logger.log("error", error);
            toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClosePopupTemplate = useCallback(() => {
        setOpenPopupTemplate(false);
        setPendingPayload(null);
        setSelectedTemplateName("");
    }, []);

    const handleConfirmBypassTemplate = useCallback(async () => {
        if (pendingPayload) {
            setOpenPopupTemplate(false);
            await onSubmit(pendingPayload, true);
        }
    }, [pendingPayload, onSubmit]);

    const handleTemplateChange = useCallback((field) => (val) => {
        field.onChange(val);
        setSelectedTemplateName(val?.name || "");
    }, []);

    const formatNumber = (val) => {
        if (!val && val !== 0) return "";
        const stringVal = val.toString().replace(/\D/g, "");
        return stringVal.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const handleBudgetChange = useCallback((onChange) => (e) => {
        const val = e.target.value.replace(/\./g, "");
        if (/^\d*$/.test(val)) {
            onChange(formatNumber(val));
        }
    }, []);

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

        // Kiểm tra tổng số đính kèm (vì đây là form add new nên chưa có file cũ trên server)
        if (currentTotalCount + newItemsCount > UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS) {
            toast(
                `Vượt quá giới hạn ${UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS} đính kèm/dự án. ` +
                `Hiện tại: ${currentTotalCount}, Muốn thêm: ${newItemsCount}`,
                "error"
            );
            event.target.value = null;
            return;
        }

        // Tính tổng dung lượng hiện có và mới
        const currentTotalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
        const newFilesSize = newFiles.reduce((sum, file) => sum + file.size, 0);

        if (currentTotalSize + newFilesSize > UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE) {
            toast(
                `Vượt quá tổng dung lượng ${formatFileSize(UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE)}/dự án. ` +
                `Hiện tại: ${formatFileSize(currentTotalSize)}, Muốn thêm: ${formatFileSize(newFilesSize)}`,
                "error"
            );
            event.target.value = null;
            return;
        }

        // === VALIDATION 3: Kiểm tra kích thước file/folder ===
        if (isFolderUpload) {
            // Kiểm tra tổng dung lượng folder
            const totalFolderSize = newFiles.reduce((sum, file) => sum + file.size, 0);
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
        const existingFolders = new Set();
        uploadedFiles.forEach(f => {
            const path = f.path || f.webkitRelativePath || "";
            if (path.includes("/")) {
                existingFolders.add(path.split("/")[0]);
            }
        });

        const newFolders = new Set();
        newFiles.forEach(f => {
            const path = f.webkitRelativePath || "";
            if (path.includes("/")) {
                newFolders.add(path.split("/")[0]);
            }
        });

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
            // Không trùng, thêm bình thường nhưng vẫn gán path để đồng bộ
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

    const handleLinkNameChange = useCallback((e) => {
        setLinkFormValues(prev => ({ ...prev, name: e.target.value }));
        if (e.target.value.trim()) {
            setLinkErrors(prev => ({ ...prev, name: "" }));
        }
    }, []);

    const handleLinkUrlChange = useCallback((e) => {
        const url = e.target.value;
        setLinkFormValues(prev => ({ ...prev, link: url }));
        if (url.trim()) {
            if (validateURL(url)) {
                setLinkErrors(prev => ({ ...prev, link: "" }));
            } else {
                setLinkErrors(prev => ({ ...prev, link: "Đường dẫn tài liệu không hợp lệ." }));
            }
        } else {
            setLinkErrors(prev => ({ ...prev, link: "" }));
        }
    }, [validateURL]);

    const handleOpenLinkPopup = useCallback(() => {
        setIsLinkPopupOpen(true);
        setLinkFormValues({ name: "", link: "" });
        setLinkErrors({ name: "", link: "" });
    }, []);

    const handleCloseLinkPopup = useCallback(() => {
        setIsLinkPopupOpen(false);
        setLinkErrors({ name: "", link: "" });
    }, []);

    const handleSaveLink = useCallback(() => {
        const errors = { name: "", link: "" };
        let hasError = false;

        if (!linkFormValues.name.trim()) {
            errors.name = "Vui lòng nhập tên tài liệu";
            hasError = true;
        }
        if (!linkFormValues.link.trim()) {
            errors.link = "Vui lòng nhập đường dẫn tài liệu";
            hasError = true;
        } else if (!validateURL(linkFormValues.link)) {
            errors.link = "Đường dẫn tài liệu không hợp lệ.";
            hasError = true;
        }

        if (hasError) {
            setLinkErrors(errors);
            return;
        }

        /* eslint-disable camelcase */
        const newLinkNode = {
            id: `link_${Date.now()}`,
            _id: `link_${Date.now()}`,
            name: linkFormValues.name,
            file_name: linkFormValues.name,
            link: linkFormValues.link,
            type_file: "link",
            is_directory: 0,
            parent_id: null,
        };
        /* eslint-enable camelcase */

        setUploadedFiles((prev) => [...prev, newLinkNode]);
        handleCloseLinkPopup();
    }, [linkFormValues, handleCloseLinkPopup]);

    const handleConfirmUpload = (shouldContinue) => {
        if (shouldContinue) {
            const filesToAdd = processFilesForUpload(pendingFiles, uploadedFiles, generateDuplicateName);
            setUploadedFiles((prev) => [...prev, ...filesToAdd]);
        }
        setPendingFiles([]);
        setIsConfirmDialogOpen(false);
    };

    const handleCancelUpload = useCallback(() => {
        handleConfirmUpload(false);
    }, [handleConfirmUpload]);

    const handleConfirmUploadAction = useCallback(() => {
        handleConfirmUpload(true);
    }, [handleConfirmUpload]);

    // Convert uploadedFiles thành treeData cho FileTreeTable
    const fileTreeData = React.useMemo(() => {
        return convertFilesToTreeData(uploadedFiles);
    }, [uploadedFiles]);

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

    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleSave = useCallback((users) => {
        setUserByOrganizationUnits(users);
        setValue('members', users, { shouldValidate: true });
        handleCloseDialog();
    }, [setValue, handleCloseDialog]);

    const onError = useCallback((errors) => {
        logger.error("Form validation errors:", errors);
        toast("Vui lòng nhập đầy đủ thông tin", "error");
    }, [toast]);



    return (
        <CustomSwipper
            title={title}
            open={open}
            onClose={onClose}
            onSave={handleSubmit(onSubmit, onError)}
            type="add"
            hideBackdrop
            footer={
                  <>
                   <FlexGrowBox/>
                   <FooterActions>
                    <CustomButton
                    onClick={handleSubmit(onSubmit, onError)}
                    disabled={isLoading}
                    variant="primary"
                >
                    LƯU
                </CustomButton>
                </FooterActions>
                </>
            }
        >
            <JobMainContent>
                {/* THÔNG TIN CHUNG */}
                {/* THÔNG TIN CHUNG */}
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
                    <Grid container spacing={3} mb={4}>
                        {/* Hàng 1: Tên dự án + Ngày bắt đầu/kết thúc */}
                        <Grid item xs={12} md={8}>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        label="Tên dự án, hạng mục đầu tư"
                                        placeholder="Nhập tên dự án, hạng mục đầu tư"
                                        {...field}
                                        required
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <WrappedDateTimeRangePicker
                                showTime
                                label="Ngày bắt đầu - Ngày dự kiến kết thúc"
                                value={{
                                    startDate: watch("startDate"),
                                    endDate: watch("endDate"),
                                }}
                                onChange={handleDateRangeChange}
                                minDate={dayjs()}
                                startLabel="Ngày bắt đầu"
                                endLabel="Ngày kết thúc"
                                required
                                error={!!(errors.startDate || errors.endDate)}
                                helperText={errors.startDate?.message || errors.endDate?.message}
                            />
                        </Grid>

                        {/* Hàng 2: Quy trình + Độ ưu tiên + Loại dự án */}
                        <Grid item xs={12} md={4}>
                            <Controller
                                name="process"
                                control={control}
                                render={({ field }) => (
                                    <WrappedAsyncAutoComplete
                                        isSearchText
                                        url={API_TEMPLATE_SAMPLE}
                                        label="Quy trình"
                                        placeholder="Chọn quy trình mẫu..."
                                        queryParam="filter[name]"
                                        optionLabel="name"
                                        optionValue="id"
                                        {...field}
                                        onChange={handleTemplateChange(field)}
                                        error={!!errors.process}
                                        helperText={errors.process?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Controller
                                name="priority"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        select
                                        label="Độ ưu tiên"
                                        placeholder="Nhập dữ liệu..."
                                        options={urgencyOptions}
                                        customLabel="title"
                                        customValue="value"
                                        {...field}
                                        error={!!errors.priority}
                                        helperText={errors.priority?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Controller
                                name="typeProject"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        select
                                        label="Loại dự án"
                                        placeholder="Chọn loại dự án..."
                                        options={projectTypeOptions}
                                        customLabel="title"
                                        customValue="id"
                                        {...field}
                                        error={!!errors.typeProject}
                                        helperText={errors.typeProject?.message}
                                    />
                                )}
                            />
                        </Grid>

                        {/* Hàng 3: Mô tả + Thời gian nhắc hạn & Tổng mức đầu tư */}
                        <Grid item xs={12} md={8}>
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        label="Mô tả"
                                        multiline
                                        rows={4}
                                        placeholder="Nhập mô tả dự án..."
                                        {...field}
                                        error={!!errors.description}
                                        helperText={errors.description?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Controller
                                    name="reminderDays"
                                    control={control}
                                    render={({ field }) => (
                                        <InputComponents
                                            select
                                            label="Thời gian nhắc hạn"
                                            options={timeOptions}
                                            customLabel="title"
                                            customValue="value"
                                            {...field}
                                            error={!!errors.reminderDays}
                                            helperText={errors.reminderDays?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Grid container spacing={1}>
                                    <Grid item xs={8}>
                                        <Controller
                                            name="budget"
                                            control={control}
                                            render={({ field }) => (
                                                <InputComponents
                                                    label="Tổng mức đầu tư"
                                                    placeholder="Nhập Tổng mức đầu tư..."
                                                    {...field}
                                                    onChange={handleBudgetChange(field.onChange)}
                                                    error={!!errors.budget}
                                                    helperText={errors.budget?.message}
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Controller
                                            name="moneyUnit"
                                            control={control}
                                            render={({ field }) => (
                                                <InputComponents
                                                    select
                                                    label="Đơn vị"
                                                    placeholder="Chọn..."
                                                    options={moneyOptions}
                                                    customLabel="title"
                                                    customValue="value"
                                                    {...field}
                                                    error={!!errors.moneyUnit}
                                                    helperText={errors.moneyUnit?.message}
                                                />
                                            )}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </StyledBoxContainerContent>

                {/* THÔNG TIN NGƯỜI THAM GIA */}
                <StyledBoxContainerContent styledMarginTop>
                    <SkyFlexGap8 >
                                  <StyledIconWrapper>
                                    <StytedPeopleIcon />
                                  </StyledIconWrapper>
                                  <JobSectionTitle variant="h6" gutterBottom mb={0} >
                                    NGƯỜI THAM GIA
                                  </JobSectionTitle>
                                </SkyFlexGap8>
                                <StyleLine />
                    <Grid container rowSpacing={3} columnSpacing={3} mb={3}>

                        <Grid item xs={12} md={4}>
                            <Controller
                                name="manager"
                                control={control}
                                render={({ field }) => (
                                    <WrappedAsyncAutoComplete
                                        isMulti
                                        limitTags={2}
                                        url={`${API_GET_LIST_USERS}/project-users?processKey=CVDAN&excludeId=${excludeForManager}`}
                                        label="Quản lý dự án"
                                        placeholder="Tìm kiếm..."
                                         queryParams={["name", "email"]}
                                        optionLabel="name"
                                        optionValue="id"
                                        required
                                        optionSubLabel="parentName"
                                        error={!!errors.manager}
                                        heplText={errors.manager?.message}
                                        {...field}            
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Controller
                                name="members"
                                control={control}
                                render={({ field }) => (
                                    <FormItem label="Thành viên dự án">
                                    <StyledCustomInput
                                        {...field}
                                        value={selectValue?.data?.length > 0 ? ' ' : ''}
                                        InputProps={{
                                            readOnly: true,
                                            style: {
                                                cursor: 'pointer'
                                            },
                                            onClick: handleOpenDialog,
                                            startAdornment: selectValue?.data?.length > 0 ? (
                                                <WrapChipContainer>
                                                    {selectValue.data.slice(0, 2).map((item) => (
                                                        <MemberCardWrapper
                                                            key={item._id || item.id}
                                                            item={item}
                                                            name={getMemberName(item)}
                                                            groupName={getMemberGroup(item)}
                                                            fullLabel={getFullChipLabel(item)}
                                                            onDelete={handleDeleteChip}
                                                        />
                                                    ))}
                                                    {selectValue.data.length > 2 && (
                                                        <SkyTooltip 
                                                            title={selectValue.data.slice(2).map(getChipLabel).join(", ")} 
                                                            arrow 
                                                            placement="top"
                                                        >
                                                            <MoreMembersBadge>
                                                                +{selectValue.data.length - 2}
                                                            </MoreMembersBadge>
                                                        </SkyTooltip>
                                                    )}
                                                </WrapChipContainer>
                                            ) : null,
                                            endAdornment: selectValue?.data?.length ? (
                                                <ClearableInputAdornment>
                                                    <SkyIconButton size="small" onClick={handleClick} edge="end">
                                                       <ClearIconButton/>
                                                    </SkyIconButton>
                                                </ClearableInputAdornment>
                                            ) : null
                                        }}
                                    />
                                    </FormItem>
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Controller
                                name="viewers"
                                control={control}
                                render={({ field }) => (
                                    <WrappedAsyncAutoComplete
                                        isMulti
                                        url={`${API_GET_LIST_USERS}/project-users?processKey=CVDAN&excludeId=${excludeForViewers}`}
                                        label="Người xem"
                                        placeholder="Tìm thành viên dự án..."
                                         queryParams={["name", "email"]}
                                        optionLabel="name"
                                        optionValue="id"
                                        optionSubLabel="parentName"
                                        limitTags={2}
                                        {...field}
                                    />
                                )}
                            />
                        </Grid>

                    </Grid>
                </StyledBoxContainerContent>

                <SkyFlexGap8 mt={2.5}>
                    <StyledIconWrapper>
                        <StytedDescriptionIcon />
                    </StyledIconWrapper>
                    <JobSectionTitle variant="h6" gutterBottom mb={0} >
                        TÀI LIỆU DỰ ÁN
                    </JobSectionTitle>
                </SkyFlexGap8>
                <StyledBoxContainerContent>
                    {/* TÀI LIỆU DỰ ÁN */}

                    <JobButtonContainer>
                        <ButtonOutline component="label" startIcon={<AttachFileIcon />}>
                            Tải File
                            <input type="file" hidden multiple onChange={handleFilesChange} />
                        </ButtonOutline>
                        <ButtonOutline component="label" startIcon={<FolderIcon />}>
                            Tải Folder
                            <input type="file" hidden multiple webkitdirectory="" onChange={handleFilesChange} />
                        </ButtonOutline>
                        <ButtonOutline onClick={handleOpenLinkPopup} startIcon={<LinkIcon />}>
                            Gắn Link
                        </ButtonOutline>
                    </JobButtonContainer>

                    {/* Hiển thị FileTreeTable với cấu trúc cây */}
                    {fileTreeData.length > 0 ? (
                        <>
                            <FileTreeTable
                                data={fileTreeData}
                                onFileMenuClick={handleFileMenuClick}
                                MenuIcon={StyledMenuIcon}
                                disableHeader
                            />
                            <Menu
                                anchorEl={fileMenuAnchor}
                                open={Boolean(fileMenuAnchor)}
                                onClose={handleCloseFileMenu}
                                id="file-menu"
                            >
                                <MenuItem onClick={handleOpenDeleteDialog}>
                                    <StyledListItemIcon>
                                        <DeleteOutline />
                                    </StyledListItemIcon>
                                    <ListItemText>Xóa</ListItemText>
                                </MenuItem>
                            </Menu>
                        </>
                    ) : (
                        <JobUploadPlaceholderBox>
                            <JobPlaceholderText variant="body2">Chưa có tài liệu nào được tải lên.</JobPlaceholderText>
                        </JobUploadPlaceholderBox>
                    )}
                </StyledBoxContainerContent>
            </JobMainContent>

            <CustomDialog
                open={isConfirmDialogOpen}
                onClose={handleCancelUpload}
                onSave={handleConfirmUploadAction}
                title="Xác nhận tải lên"
                titleButton="Tiếp tục"
                cancelButtonText="Hủy"
                size="sm"
            >
                Phát hiện tệp hoặc thư mục trùng tên. Bạn có muốn tiếp tục tải lên và tự động đổi tên các tệp trùng lặp không?
            </CustomDialog>

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

            <PopupTemplate
                open={openPopupTemplate}
                onClose={handleClosePopupTemplate}
                onSave={handleConfirmBypassTemplate}
                templateName={selectedTemplateName}
            />

            <LoadingDialog open={isLoading} >
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>

            <CustomDialog
                open={isLinkPopupOpen}
                onClose={handleCloseLinkPopup}
                onSave={handleSaveLink}
                title="Gắn link tài liệu"
                titleButton="Lưu"
                disabled={!linkFormValues.name.trim() || !linkFormValues.link.trim() || !!linkErrors.link}
            >
                <SkyGrid container spacing={2}>
                    <SkyGrid item xs={12}>
                        <CustomInput
                            label={<>Tên link <span style={{ color: 'red' }}>*</span></>}
                            placeholder="Ví dụ: Báo cáo tháng 1"
                            fullWidth
                            value={linkFormValues.name}
                            onChange={handleLinkNameChange}
                            error={!!linkErrors.name}
                            helperText={linkErrors.name}
                        />
                    </SkyGrid>
                    <SkyGrid item xs={12}>
                        <CustomInput
                            label={<>Đường dẫn link <span style={{ color: 'red' }}>*</span></>}
                            placeholder="Ví dụ: https://docs.google.com/document/d/..."
                            fullWidth
                            value={linkFormValues.link}
                            onChange={handleLinkUrlChange}
                            error={!!linkErrors.link}
                            helperText={linkErrors.link}
                        />
                    </SkyGrid>
                </SkyGrid>
            </CustomDialog>

            <PopupTableMembersProject
                open={openDialog}
                onClose={handleCloseDialog}
                onSave={handleSave}
                dialogKey={openDialog}
                initialSelectedUnits={userByOrganizationUnits}
                excludeId={excludeForMembers}
            />
        </CustomSwipper>
    );
};

export default withSharedComponents(AddProject);