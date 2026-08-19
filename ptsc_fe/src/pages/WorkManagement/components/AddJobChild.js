/* eslint-disable react/forbid-component-props */
/* eslint-disable camelcase */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useCallback, useMemo } from "react";
import {
    Grid,
    ListItemText,
    Menu,
    MenuItem,
    styled,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import * as yup from "yup";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_COMMON_WORK, API_GET_COMMON_WORK_ORG, API_GET_COMMON_WORK_USER, API_TEMPLATE, APP_BASE, API_MERGE_LINK } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import {
    JobButtonContainer,
    JobMainContent,

    JobSectionTitle,
    StyledBoxContainerContent,
    StyledClearIcon,
    StyledListItemIcon,
    StyledMenuIcon,
    ConfirmDialogContent,
    ConfirmDialogIconWrapper,
    ConfirmDialogText,
    ConfirmDialogSubText,
    RedText,
    JobCommentHeader,
    DelegatedNoteText,
    BoldSkyFormControlLabel,

    StyleLine,
    StytedDescriptionIcon,
    StytedPeopleIcon,
    UploadDropZone,
} from "./Job.styles";
import { useSelector } from "react-redux";
import PersonOrUnitAsyncInput from
    "@components/PersonOrUnitAsyncInput";
import FileTreeTable from "@components/FileTreeTable";
import {
    UPLOAD_LIMITS_PER_FILE,
    UPLOAD_LIMITS_PER_FOLDER,
    UPLOAD_LIMITS_PER_BATCH,
    UPLOAD_LIMITS_PER_TASK,
    FILE_NAME_LIMITS,
    validateFileName,
    validateFileExtension,
    truncateFileName,
    formatFileSize,
    generateDuplicateName
} from "./constants";
import { processFilesForUpload, convertFilesToTreeData } from "@utils/utils";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import LoadingDialog from "@components/LoadingDialog";
import { DeleteOutline, WarningAmber as WarningAmberIcon } from "@mui/icons-material";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import PopupTemplate from "./PopupTemplate";
import { SkyCheckbox, SkyFlexGap8, SkyGrid, SkyTypography } from "@styles/SkyStyles";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import { DialogTitleBox } from "@pages/MeetingCalendar/componentStyle/MeetingAttendance.styles";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { StyledIconWrapper } from "@pages/ProjectManager/components/AddProject.styles";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import withFormWrapper from "@components/common/FormWrapper";
import CustomButton from "@components/CustomButton";
export const StyleSkyTypography = styled(SkyTypography)(({ theme }) => ({
    fontWeight: "bold",
    color: theme.palette.dialog?.headerColor || "#ffffff",
}));


dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const AddJobChild = ({
    open,
    onClose,
    onSuccess,
    sharedComponents,
    parentId: parentIdProps = null,
    parentName: parentNameProps = null,
    setReloadData,
    dataDetail,
    parentProgress: parentProgressProp = 0,
    hasChildren: hasChildrenProp = false,
    onResetParentProgress,
    type,
    parentStartDate: parentStartDateProp = null,
    parentEndDate: parentEndDateProp = null,
    parentTopic: parentTopicProp = null,
    // typeView='typeView',
}) => {
    const parentStartDate = useMemo(() => {
        const date = dataDetail?.startDateISO ?? parentStartDateProp;
        if (!date) return null;
        // Thử parse với format Việt Nam trước, nếu không được thì dùng mặc định
        const parsed = dayjs(date, ["DD/MM/YYYY HH:mm", "DD/MM/YYYY"], true);
        return parsed.isValid() ? parsed : dayjs(date);
    }, [dataDetail?.startDateISO, parentStartDateProp]);

    const parentEndDate = useMemo(() => {
        const date = dataDetail?.endDateISO ?? parentEndDateProp;
        if (!date) return null;
        const parsed = dayjs(date, ["DD/MM/YYYY HH:mm", "DD/MM/YYYY"], true);
        return parsed.isValid() ? parsed : dayjs(date);
    }, [dataDetail?.endDateISO, parentEndDateProp]);
    const parentTopic = dataDetail?.topic ?? parentTopicProp;

    const parentId = dataDetail?.id || parentIdProps;
    const parentName = dataDetail?.name || parentNameProps;
    const parentProgress = dataDetail?.progress ?? parentProgressProp;
    const hasChildren = dataDetail?.flags?.hasChildren ?? hasChildrenProp;
    const {
        InputComponents: BaseInput,
        DatePicker,
        ButtonOutline,
    } = sharedComponents;
    const { crmSource } = useSelector((state) => state.config);
    const optionModeOfWork = React.useMemo(() =>
        crmSource.find((item) => item.code === "CONGVIECLAPLAI")?.data || [], [crmSource]);
    const urgencyOptions = React.useMemo(() =>
        crmSource.find((item) => item.code === "DOUUTIEN")?.data || [], [crmSource]);
    const timeOptions = React.useMemo(() =>
        crmSource.find((item) => item.code === "S34")?.data || [], [crmSource]);
    const monthOptions = React.useMemo(() =>
        crmSource.find((item) => item.code === "S35")?.data || [], [crmSource]);

    const schema = yup.object().shape({
        taskName: yup.string()
            .required("Vui lòng nhập tên công việc")
            .max(500, "Tên công việc không được vượt quá 500 ký tự"),
        description: yup.string()
            .max(3000, "Mô tả không được vượt quá 3000 ký tự"),
        deadline: yup
            .date()
            .required("Vui lòng chọn hạn xử lý")
            .typeError("Hạn xử lý không hợp lệ")
            .test(
                'not-past',
                'Hạn xử lý không được ở trong quá khứ',
                function (value) {
                    if (!value) return true;
                    return dayjs(value)?.isSameOrAfter(dayjs(), 'minute');
                }
            )
            .test(
                'deadline-after-start',
                'Hạn xử lý phải lớn hơn hoặc bằng ngày bắt đầu',
                function (value) {
                    const { startDate } = this.parent;
                    if (!value || !startDate) return true; // skip if one side is empty (other validators handle required)
                    return dayjs(value)?.isSameOrAfter(dayjs(startDate));
                }
            )
            .test(
                'deadline-within-parent',
                parentEndDate
                    ? `Hạn xử lý không được vượt quá hạn kết thúc của công việc cha (${dayjs(parentEndDate).format('DD/MM/YYYY HH:mm')})`
                    : 'Hạn xử lý vượt quá hạn kết thúc của công việc cha',
                function (value) {
                    if (!value || !parentEndDate) return true;
                    return dayjs(value).isSameOrBefore(dayjs(parentEndDate));
                }
            ),
        assigner: yup.mixed().required("Vui lòng chọn người giao việc"),
        startDate: yup
            .date()
            .required("Vui lòng chọn ngày bắt đầu")
            .typeError("Ngày bắt đầu không hợp lệ")
            .test(
                'not-past',
                'Ngày bắt đầu không được ở trong quá khứ',
                function (value) {
                    if (!value) return true;
                    return dayjs(value).isSameOrAfter(dayjs(), 'minute');
                }
            )
            .test(
                'startDate-within-parent',
                parentStartDate
                    ? `Ngày bắt đầu không được trước ngày bắt đầu của công việc cha (${dayjs(parentStartDate).format('DD/MM/YYYY HH:mm')})`
                    : 'Ngày bắt đầu trước ngày bắt đầu của công việc cha',
                function (value) {
                    if (!value || !parentStartDate) return true;
                    return dayjs(value).isSameOrAfter(dayjs(parentStartDate));
                }
            )
            .test(
                'startDate-before-parent-end',
                parentEndDate
                    ? `Ngày bắt đầu không được vượt quá hạn kết thúc của công việc cha (${dayjs(parentEndDate).format('DD/MM/YYYY HH:mm')})`
                    : 'Ngày bắt đầu vượt quá hạn kết thúc của công việc cha',
                function (value) {
                    if (!value || !parentEndDate) return true;
                    return dayjs(value).isSameOrBefore(dayjs(parentEndDate));
                }
            ),
        reminderTime: yup.string().required("Vui lòng chọn thời gian nhắc hạn"),
        recurringMonth: yup.string().when("repeatTask", {
            is: (val) => val === (optionModeOfWork.find(opt => opt.title?.includes("quý"))?.value),
            then: (schema) => schema.required("Vui lòng chọn tháng lặp trong quý"),
            otherwise: (schema) => schema.nullable(),
        }),
        recurringDay: yup.date().when("repeatTask", {
            is: (val) => val !== (optionModeOfWork.find(opt => opt.title?.includes("Không"))?.value),
            then: (schema) => schema.required("Vui lòng chọn ngày lặp").typeError("Ngày lặp không hợp lệ"),
            otherwise: (schema) => schema.nullable(),
        }),
        recurringTime: yup.date().when("repeatTask", {
            is: (val) => val !== (optionModeOfWork.find(opt => opt.title?.includes("Không"))?.value),
            then: (schema) => schema.required("Vui lòng chọn thời gian lặp đến").typeError("Thời gian lặp không hợp lệ"),
            otherwise: (schema) => schema.nullable(),
        }),
    });

    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
        reset,
        trigger,
        setValue
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            taskName: "",
            startDate: null,
            deadline: null,
            reminderTime: "1_day",
            priority: urgencyOptions[0]?.value || "",
            mode: "",
            repeatTask: optionModeOfWork[0]?.value || "Theo quý",
            recurringMonth: "",
            recurringDay: null,
            recurringTime: null,
            description: "",
            assigner: null,
            leader: null,
            coordinators: [],
            viewers: [],
            files: [], // sẽ quản lý riêng
            templateId: null,
            isConfidential: false,
            isApprovalRequired: true,
        },
    });

    const [uploadedFiles, setUploadedFiles] = React.useState([]);
    const [isDragging, setIsDragging] = React.useState(false);
    const repeatTask = watch("repeatTask");
    const [isLoading, setIsLoading] = React.useState(false);
    // State cho việc đồng bộ type
    const [leaderType, setLeaderType] = React.useState("person");
    const [coordinatorType, setCoordinatorType] = React.useState("person");
    const [assignerDelegatedNote, setAssignerDelegatedNote] = React.useState("");
    const watchAssigner = watch("assigner");
    const watchLeader = watch("leader");
    const watchCoordinators = watch("coordinators");
    const watchViewers = watch("viewers");

    const getId = (val) => val?._id || val?.id || val?.processId || (typeof val === "string" ? val : null);

    const leaderExcludeIds = useMemo(() => {
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

    const coordinatorExcludeIds = useMemo(() => {
        const ids = [];
        const assignerId = getId(watchAssigner);
        if (assignerId) ids.push(assignerId);
        const leaderId = getId(watchLeader);
        if (leaderId) ids.push(leaderId);
        if (Array.isArray(watchViewers)) {
            watchViewers.forEach((item) => {
                const id = getId(item);
                if (id) ids.push(id);
            });
        }
        return ids.join(",");
    }, [watchAssigner, watchLeader, watchViewers]);

    const viewerExcludeIds = useMemo(() => {
        const ids = [];
        const assignerId = getId(watchAssigner);
        if (assignerId) ids.push(assignerId);
        const leaderId = getId(watchLeader);
        if (leaderId) ids.push(leaderId);
        if (Array.isArray(watchCoordinators)) {
            watchCoordinators.forEach((item) => {
                const id = getId(item);
                if (id) ids.push(id);
            });
        }
        return ids.join(",");
    }, [watchAssigner, watchLeader, watchCoordinators]);
    const hideCoordinators = useMemo(() => {
        const assignerId = getId(watchAssigner);
        const leaderId = getId(watchLeader);
        return !!(assignerId && leaderId && assignerId === leaderId);
    }, [watchAssigner, watchLeader]);

    useEffect(() => {
        if (hideCoordinators) {
            setValue("coordinators", []);
        }
    }, [hideCoordinators, setValue]);

    // State cho việc xử lý trùng lặp
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);


    const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
    const [selectedFileId, setSelectedFileId] = React.useState(null);
    const [selectedIsFolder, setSelectedIsFolder] = React.useState(false);
    const [checkPermision, setCheckPermision] = React.useState(false);
    const [openPopupTemplate, setOpenPopupTemplate] = React.useState(false);
    const [pendingPayload, setPendingPayload] = React.useState(null);
    const [templateWarningInfo, setTemplateWarningInfo] = React.useState({
        templateName: "",
        requiredDays: 0,
        availableDays: 0
    });
    const toast = useToast();
    const [confirmResetOpen, setConfirmResetOpen] = React.useState(false);
    const [pendingSubmitData, setPendingSubmitData] = React.useState(null);
    const [linkFormValues, setLinkFormValues] = React.useState({ documentName: "", documentUrl: "" });

    const [linkErrors, setLinkErrors] = React.useState({ documentName: "", documentUrl: "" });

    const [linkPopupOpen, setLinkPopupOpen] = React.useState(false);

    const selectedRepeatOption = optionModeOfWork.find(opt => opt.value === repeatTask);
    const noRepeatOption = optionModeOfWork.find(opt => opt.title?.includes("Không"));
    const quarterlyOption = optionModeOfWork.find(opt => opt.title?.includes("quý"));

    const showRecurringFields = noRepeatOption ? repeatTask !== noRepeatOption.value : true;
    const showRecurringMonthField = quarterlyOption ? repeatTask === quarterlyOption.value : false;
    // const handleDateChange = useCallback((onChange, fieldName) => {
    //     return (date) => {
    //         onChange(date);
    //         // Trigger validation for both fields when either changes
    //         setTimeout(() => {
    //             if (fieldName === 'startDate') {
    //                 trigger(['startDate', 'deadline']);
    //             } else if (fieldName === 'deadline') {
    //                 trigger(['deadline', 'startDate']);
    //             }
    //         }, 0);
    //     };
    // }, [trigger]);


    const getFilesFromEntries = useCallback(async (items) => {
        const files = [];

        const readEntry = async (entry, path = "") => {
            if (entry.isFile) {
                const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
                // Gán relative path thủ công vì webkitRelativePath là read-only
                try {
                    Object.defineProperty(file, "webkitRelativePath", {
                        value: path ? `${path}/${file.name}` : file.name,
                        writable: false,
                        configurable: true,
                    });
                } catch (e) {
                    // Fallback nếu không định nghĩa lại được
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
            const filesFromDrag = await getFilesFromEntries(items);
            if (filesFromDrag.length > 0) {
                // Tái sử dụng logic validation từ handleFilesChange
                const currentTotalCount = uploadedFiles.length;
                const currentTotalSize = uploadedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
                const newFilesSize = filesFromDrag.reduce((sum, file) => sum + (file.size || 0), 0);

                if (currentTotalCount + filesFromDrag.length > UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS) {
                    toast(`Vượt quá giới hạn ${UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS} đính kèm.`, "error");
                    return;
                }
                if (currentTotalSize + newFilesSize > UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE) {
                    toast(`Vượt quá tổng dung lượng ${formatFileSize(UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE)}.`, "error");
                    return;
                }

                const processedFiles = processFilesForUpload(filesFromDrag, uploadedFiles, generateDuplicateName);
                setUploadedFiles(prev => [...prev, ...processedFiles]);

            }
        }
    }, [getFilesFromEntries, uploadedFiles, toast]);

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


    const checkPermission = useCallback(async (leaderId = null) => {
        try {
            const response = await axiosInstance.get(`${APP_BASE}/api/tasks/check-create-permission`, {
                params: {
                    leaderId: leaderId || undefined,
                }
            });
            setCheckPermision(response);
        } catch (error) {
            logger.log("Error checking permission:", error);
        }
    }, []);

    useEffect(() => {
        const getId = (val) => val?._id || val?.id || val?.processId || (typeof val === 'string' ? val : null);
        const assignerId = getId(watchAssigner);
        checkPermission(assignerId);
    }, [watchAssigner, checkPermission]);



 

    // Reset form khi mở
    useEffect(() => {
        if (open) {
            const noRepeatVal = optionModeOfWork.find(opt => opt.title?.includes("Không"))?.value;
            reset({
                taskName: "",
                startDate: null,
                deadline: null,
                reminderTime: "1_day",
                priority: urgencyOptions[0]?.value || "",
                mode: "",
                repeatTask: parentId ? (noRepeatVal || "") : (optionModeOfWork[0]?.value || "Theo quý"),
                recurringMonth: "",
                recurringDay: null,
                recurringTime: null,
                description: "",
                assigner: null,
                leader: null,
                coordinators: [],
                viewers: [],
                files: [],
                templateId: null,
                isConfidential: false,
                isApprovalRequired: true,
            });
            setUploadedFiles([]);
            setLeaderType("person");
            setCoordinatorType("person");
            setFileMenuAnchor(null);
            setSelectedFileId(null);
            setSelectedIsFolder(false);

        }
    }, [open, reset, optionModeOfWork, parentId, urgencyOptions]);

    const getRecurringDayLabel = () => {
        const title = selectedRepeatOption?.title || "";
        if (title.includes("tuần")) {
            return "Ngày lặp theo tuần";
        } else if (title.includes("tháng")) {
            return "Ngày lặp theo tháng";
        } else if (title.includes("quý")) {
            return "Ngày lặp trong quý";
        }
        return "Ngày lặp";
    };

    const onSubmit = async (data, bypassFlag = false) => {
        // === VALIDATION: Kiểm tra độ dài tên file ===
        const validUploadedFiles = uploadedFiles.filter(f => {
            const name = f.path || f.webkitRelativePath || f.name || f.file_name || "";
            const fileName = name.includes("/") ? name.split("/").pop() : name;
            return fileName.length <= FILE_NAME_LIMITS.MAX_LENGTH;
        });

        const invalidFiles = uploadedFiles.filter(f => {
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
            toast(`File ${truncatedNames} vượt quá giới hạn 255 ký tự`, "error");
        }

        // Cập nhật lại danh sách file hợp lệ trước khi tiến hành
        setUploadedFiles(validUploadedFiles);

        setIsLoading(true);
        const isBypass = typeof bypassFlag === 'boolean' ? bypassFlag : false;
        const getId = (val) => val?._id || val?.id || val?.processId || val;

        try {
            if (data.coordinators.length > 0 && !data.leader) {
                toast("Công việc chưa được thêm người chủ trì", 'error');
                return;
            }
            // Mapping data to new backend structure
            const payload = {
                name: data.taskName,
                startDate: data.startDate ? dayjs(data.startDate).toISOString() : null,
                endDate: data.deadline ? dayjs(data.deadline).toISOString() : null,
                priority: data.priority,
                topic: data.mode || parentTopic,
                note: data.description,
                progress: "0",
                parent: parentId ? Number(parentId) : parentId,
                // code: "ma546", // Backend should generate or handle if missing
                processStatus: "1",
                assigners: data.assigner ? [{ processId: getId(data.assigner) }] : [],
                directors: data.leader ? [{ processId: getId(data.leader), type: leaderType === 'person' ? 1 : 2 }] : [],
                supporters: Array.isArray(data.coordinators) ? data.coordinators.map(item => ({ processId: getId(item), type: coordinatorType === 'person' ? 1 : 2 })) : [],
                viewers: Array.isArray(data.viewers) ? data.viewers.map(item => ({ processId: getId(item) })) : [],
                reminderTime: data.reminderTime,
                repetitiveTask: data.repeatTask,
                month: data.recurringMonth,
                repetitiveStart: data.recurringDay ? dayjs(data.recurringDay).toISOString() : null,
                repetitiveEnd: data.recurringTime ? dayjs(data.recurringTime).toISOString() : null,
                templateId: data.templateId?.id,
                bypassTemplateTimeValidation: isBypass,
                isConfidential: data.isConfidential,
                isApprovalRequired: data.isApprovalRequired,
            };

            // const url = typeView === 'jobGeneral' ? `${API_ADD_COMMON_WORK}/child` : API_ADD_COMMON_WORK
            const url = `${API_ADD_COMMON_WORK}/child`


            // 1. Tạo công việc trước
            const response = await axiosInstance.post(url, payload);
            const newTaskId = response?.data?._id || response?._id || response?.id;

            if (!newTaskId) {
                throw new Error("Không nhận được ID công việc sau khi tạo.");
            }

            // 2. Nếu không có file thì kết thúc
            if (validUploadedFiles.length === 0) {
                toast("Thêm mới công việc thành công!", "success");
                onSuccess?.();
                setReloadData?.(new Date());
                onClose();
                return;
            }

            // Tách file vật lý và link
            const physicalFiles = validUploadedFiles.filter(f => (f instanceof File || (f.webkitRelativePath && f.webkitRelativePath.includes("/"))));
            const linksToSave = validUploadedFiles.filter(f => f.type_file === 'link');

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

                    const uploadedFileIds = [];
                    for (const file of physicalFiles) {
                        try {
                            // objectType là "tasks" cho công việc chung
                            const uploadResponse = await apiUploadFile(file, "taskdocuments", newTaskId);
                            const uploadedId = uploadResponse?.data?._id || uploadResponse?._id || uploadResponse?.id;
                            if (uploadedId) {
                                uploadedFileIds.push(uploadedId);
                            }
                        } catch (uploadError) {
                            toast(`Tải lên tệp ${file.name} thất bại.`, "warning");
                        }
                    }
                }
            }

            // 4. Lưu link
            if (linksToSave.length > 0) {
                for (const linkObj of linksToSave) {
                    try {
                        await axiosInstance.post(API_MERGE_LINK, {
                            taskId: String(newTaskId),
                            documentName: linkObj.name,
                            documentUrl: linkObj.link,
                            objectType: 'taskdocuments'
                        });
                    } catch (linkError) {
                        logger.error("Lỗi khi lưu link:", linkError);
                    }
                }
            }

            toast("Thêm mới công việc và tải tệp đính kèm thành công!", "success");
            onSuccess?.();
            onClose();
            setReloadData?.(new Date());
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
    };

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
                `Vượt quá giới hạn ${UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS} đính kèm/công việc. ` +
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
                `Vượt quá tổng dung lượng ${formatFileSize(UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE)}/công việc. ` +
                `Hiện tại: ${formatFileSize(currentTotalSize)}, Muốn thêm: ${formatFileSize(newFilesSize)}`,
                "error"
            );
            event.target.value = null;
            return;
        }

        // === VALIDATION 3: Kiểm tra kích thước file/folder và lọc tên file quá dài ===
        const invalidFileNamesSet = new Set();
        const filteredFiles = [];

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
                        `File "${truncateFileName(file.name)}" vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FILE.MAX_SIZE)}. ` +
                        `Kích thước: ${formatFileSize(file.size)}`,
                        "error"
                    );
                    event.target.value = null;
                    return;
                }

                const nameValidation = validateFileName(file.name);
                if (!nameValidation.valid) {
                    if (file.name.length > FILE_NAME_LIMITS.MAX_LENGTH) {
                        invalidFileNamesSet.add(truncateFileName(file.name));
                        continue;
                    }
                    toast(`File "${truncateFileName(file.name)}": ${nameValidation.message}`, "error");
                    event.target.value = null;
                    return;
                }

                const extValidation = validateFileExtension(file.name);
                if (!extValidation.valid) {
                    toast(`File "${truncateFileName(file.name)}": ${extValidation.message}`, "error");
                    event.target.value = null;
                    return;
                }
                filteredFiles.push(file);
            }
        } else {
            // Upload file đơn lẻ - kiểm tra từng file
            for (const file of newFiles) {
                if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
                    toast(
                        `File "${truncateFileName(file.name)}" vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FILE.MAX_SIZE)}. ` +
                        `Kích thước: ${formatFileSize(file.size)}`,
                        "error"
                    );
                    event.target.value = null;
                    return;
                }

                const nameValidation = validateFileName(file.name);
                if (!nameValidation.valid) {
                    if (file.name.length > FILE_NAME_LIMITS.MAX_LENGTH) {
                        invalidFileNamesSet.add(truncateFileName(file.name));
                        continue;
                    }
                    toast(`File "${truncateFileName(file.name)}": ${nameValidation.message}`, "error");
                    event.target.value = null;
                    return;
                }

                const extValidation = validateFileExtension(file.name);
                if (!extValidation.valid) {
                    toast(`File "${truncateFileName(file.name)}": ${extValidation.message}`, "error");
                    event.target.value = null;
                    return;
                }
                filteredFiles.push(file);
            }
        }

        if (invalidFileNamesSet.size > 0) {
            toast(`File ${Array.from(invalidFileNamesSet).join(", ")}: vượt quá giới hạn 255 ký tự`, "error");
        }

        if (filteredFiles.length === 0) {
            event.target.value = null;
            return;
        }

        const currentFilesToProcess = filteredFiles;

        const processedFiles = processFilesForUpload(currentFilesToProcess, uploadedFiles, generateDuplicateName);
        setUploadedFiles((prev) => [...prev, ...processedFiles]);


        if (event.target) {
            event.target.value = null;
        }
    };

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


    // Tự động điền người giao việc khi không phải văn thư (chỉ có 1 option)
    useEffect(() => {
        const autoFillAssigner = async () => {
            if (checkPermision !== false && !checkPermision?.isVanThu && open && !watchAssigner) {
                try {
                    const response = await axiosInstance.get(`${API_GET_COMMON_WORK_USER}?typeTaskUser=assigner`);
                    const assignerData = response?.data || response?.items || response;

                    if (assignerData && Array.isArray(assignerData) && assignerData.length > 0) {
                        setValue("assigner", assignerData[0], { shouldValidate: true, shouldDirty: true });
                    }
                } catch (error) {
                    logger.log("Error fetching assigner for auto-fill:", error);
                }
            }
        };

        autoFillAssigner();
    }, [checkPermision, open, setValue, watchAssigner]);

    // Handler cho Tên công việc - validate realtime để hiện lỗi đỏ khi vượt 500 ký tự
    const handleTaskNameChange = useCallback((field) => (e) => {
        field.onChange(e);
        trigger("taskName");
    }, [trigger]);

    // Handler cho Mô tả - validate realtime để hiện lỗi đỏ khi vượt 3000 ký tự
    const handleDescriptionChange = useCallback((field) => (e) => {
        field.onChange(e);
        trigger("description");
    }, [trigger]);

    const needsConfirm = (parentProgress !== "0" && parentProgress !== 0) && hasChildren === false;

    const handleSaveClick = (data) => {
        if (needsConfirm) {
            setPendingSubmitData(data);
            setConfirmResetOpen(true);
        } else {
            onSubmit(data);
        }
    };

    const onError = () => {
        toast("Vui lòng nhập đầy đủ thông tin", "error");
    };

    const handleConfirmReset = async () => {
        setConfirmResetOpen(false);
        try {
            if (onResetParentProgress) {
                await onResetParentProgress();

            } else if (type === "addJobChild") {
                await axiosInstance.patch(`${API_ADD_COMMON_WORK}/${parentId}`, { progress: "0" });
                setReloadData(new Date());

            }
        } catch (error) {
            toast(error?.response?.data?.message || "Cập nhật tiến độ thất bại!", "error");
            return;
        }
        if (pendingSubmitData) {
            onSubmit(pendingSubmitData);
        }
        setPendingSubmitData(null);
    };


    const handleCloseConfirmReset = () => {
        setConfirmResetOpen(false);
        setPendingSubmitData(null);
    };

    const handleAssignerChange = useCallback((field) => (val) => {
        field.onChange(val);
        setAssignerDelegatedNote(val?.delegatedByNote || "");
    }, []);

    const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
        setValue("startDate", startDate, { shouldValidate: true });
        setValue("deadline", endDate, { shouldValidate: true });
        setTimeout(() => trigger(["startDate", "deadline"]), 0);
    }, [setValue, trigger]);


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
    const WrappedPersonOrUnitAsyncInput = useMemo(() => {
        const Wrapped = withFormWrapper(PersonOrUnitAsyncInput, "asyncSelect");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WrappedPersonOrUnitAsyncInput";
        return Component;
    }, []);

 


    return (
        <CustomSwipper
            title={
                <SkyFlexGap8 component="span" sx={{ display: 'inline-flex' }}>
                    {'Thêm mới công việc con'}
                    {/* Thông tin người uỷ quyền */}
                    {assignerDelegatedNote && (
                        <DelegatedNoteText component="span">
                            {assignerDelegatedNote}
                        </DelegatedNoteText>
                    )}
                </SkyFlexGap8>
            }
            open={open}
            onClose={onClose}
            onSave={handleSubmit(handleSaveClick, onError)}
            type="add"
            hideBackdrop
            isLoading={isLoading}
            footer={
                <>
                    <FlexGrowBox />
                    <FooterActions>
                        <CustomButton
                            onClick={handleSubmit(handleSaveClick, onError)}
                            disabled={isLoading}
                            variant="primary"
                        >
                            Lưu
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


                    <Grid container spacing={3} mb={2}>
                        {/* Hàng 1: Tên công việc (md=8) + Ngày bắt đầu - Hạn xử lý (md=4) */}
                        <Grid item xs={12} md={8}>
                            <Controller
                                name="taskName"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        label="Tên công việc"
                                        placeholder="Nhập tên công việc"
                                        {...field}
                                        onChange={handleTaskNameChange(field)}
                                        inputProps={{ maxLength: 501 }}
                                        required
                                        error={!!errors.taskName}
                                        helperText={errors.taskName?.message}
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
                                    endDate: watch("deadline"),
                                }}
                                onChange={handleDateRangeChange}
                                minDate={parentStartDate || dayjs()}
                                maxDate={parentEndDate}
                                startLabel="Ngày bắt đầu"
                                endLabel="Hạn xử lý"
                                required
                                error={!!(errors.startDate || errors.deadline)}
                                helperText={errors.startDate?.message || errors.deadline?.message}
                            />
                        </Grid>

                        {/* Hàng 2: Quy trình (md=4) + Độ ưu tiên (md=4) + Thời gian nhắc hạn (md=4) */}
                        <Grid item xs={12} md={4}>
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
                                name="reminderTime"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        select
                                        label="Thời gian nhắc hạn"
                                        options={timeOptions}
                                        customLabel="title"
                                        customValue="value"
                                        {...field}
                                        error={!!errors.reminderTime}
                                        helperText={errors.reminderTime?.message}
                                    />
                                )}
                            />
                        </Grid>

                        {/* Hàng 3: Mô tả (Bên trái, md=8) + [Công việc cha/Chủ đề/Phê duyệt] (Bên phải, md=4) */}
                        <Grid item xs={12} md={8}>
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        label="Mô tả"
                                        multiline
                                        rows={2}
                                        placeholder="Nhập mô tả công việc..."
                                        {...field}
                                        onChange={handleDescriptionChange(field)}
                                        inputProps={{ maxLength: 3001 }}
                                        error={!!errors.description}
                                        helperText={errors.description?.message}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Grid container spacing={2}>
                                {/* Công việc cha */}
                                <Grid item xs={12}>
                                    {parentName ? (
                                        <InputComponents
                                            label="Công việc cha"
                                            value={parentName || ""}
                                            disabled
                                        />
                                    ) : (
                                        // <Controller
                                        //     name="repeatTask"
                                        //     control={control}
                                        //     render={({ field }) => (
                                        //         <InputComponents
                                        //             select
                                        //             label="Công việc lặp lại"
                                        //             placeholder="Chọn loại công việc lặp lại..."
                                        //             options={optionModeOfWork}
                                        //             customLabel="title"
                                        //             customValue="value"
                                        //             {...field}
                                        //             error={!!errors.repeatTask}
                                        //             helperText={errors.repeatTask?.message}
                                        //         />
                                        //     )}
                                        // />
                                        <></>
                                    )}
                                </Grid>

                           

                                {/* Công việc cần phê duyệt & Công việc mật checkboxes - Cùng hàng */}
                                {(!checkPermision?.disableSuporter && !hideCoordinators) ? (
                                    <>
                                        <Grid item xs={8}>
                                            <Controller
                                                name="isApprovalRequired"
                                                control={control}
                                                render={({ field }) => (
                                                    <BoldSkyFormControlLabel
                                                        control={
                                                            <SkyCheckbox
                                                                {...field}
                                                                checked={!!field.value}
                                                            />
                                                        }
                                                        label="Xác nhận hoàn thành"
                                                    />
                                                )}
                                            />
                                        </Grid>
                                         
                                    </>
                                ) : (
                                    null
                                )}
                                {/* Lặp lại công việc */}
                                {showRecurringFields && (
                                    <>
                                        {showRecurringMonthField && (
                                            <Grid item xs={12}>
                                                <Controller
                                                    name="recurringMonth"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <InputComponents
                                                            select
                                                            label="Chọn tháng lặp trong quý"
                                                            placeholder="Tìm kiếm"
                                                            {...field}
                                                            options={monthOptions}
                                                            customLabel="title"
                                                            customValue="value"
                                                            required={showRecurringMonthField}
                                                            endAdornment={<StyledClearIcon />}
                                                            error={!!errors.recurringMonth}
                                                            helperText={errors.recurringMonth?.message}
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                        )}

                                        <Grid item xs={12}>
                                            <Controller
                                                name="recurringDay"
                                                control={control}
                                                render={({ field }) => (
                                                    <DatePicker
                                                        label={getRecurringDayLabel()}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        error={!!errors.recurringDay}
                                                        helperText={errors.recurringDay?.message}
                                                        required={showRecurringFields}
                                                    />
                                                )}
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Controller
                                                name="recurringTime"
                                                control={control}
                                                render={({ field }) => (
                                                    <DatePicker
                                                        label="Lặp đến ngày"
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        error={!!errors.recurringTime}
                                                        helperText={errors.recurringTime?.message}
                                                        required={showRecurringFields}
                                                    />
                                                )}
                                            />
                                        </Grid>
                                    </>
                                )}
                            </Grid>
                        </Grid>
                    </Grid>
                </StyledBoxContainerContent>

                {/* THÔNG TIN NGƯỜI THAM GIA */}
                <StyledBoxContainerContent styledMarginTop>
                    <JobCommentHeader mt={2.5} mb={2.5}>
                        <SkyFlexGap8 >
                            <StyledIconWrapper noBg>
                                <StytedPeopleIcon />
                            </StyledIconWrapper>
                            <JobSectionTitle variant="h6" gutterBottom mb={0} >
                                THÔNG TIN NGƯỜI THAM GIA
                            </JobSectionTitle>
                        </SkyFlexGap8>


                    </JobCommentHeader>

                    <Grid container rowSpacing={3} columnSpacing={3} mb={3}>
                        <Grid item xs={12} md={6}>
                            <Controller
                                name="assigner"
                                control={control}
                                render={({ field }) => (
                                    <WrappedAsyncAutoComplete
                                        label="Người giao việc"
                                        placeholder="Tìm kiếm"
                                        {...field}
                                        onChange={handleAssignerChange(field)}
                                        url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=assigner`}
                                        queryParams={["name", "email"]}
                                        optionLabel="name"
                                        optionValue="id"
                                        required
                                        error={!!errors.assigner}
                                        disabled={!(checkPermision?.isVanThu)}
                                        helperText={errors.assigner?.message}
                                         optionSubLabel="parentName"
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Controller
                                name="leader"
                                control={control}
                                render={({ field }) => (
                                    !(checkPermision?.directorSelectDepartment) ?
                                        <WrappedAsyncAutoComplete
                                            {...field}
                                            label="Người chủ trì"
                                            url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=director&leaderId=${getId(watchAssigner) || ""}&excludeId=${leaderExcludeIds}`}
                                            queryParams={["name", "email"]}
                                            optionLabel="name"
                                            optionValue="id"
                                             optionSubLabel="parentName"

                                        /> :
                                        <WrappedPersonOrUnitAsyncInput
                                            {...field}
                                            label="Người chủ trì"
                                            personUrl={`${API_GET_COMMON_WORK_USER}?typeTaskUser=director&leaderId=${getId(watchAssigner) || ""}&excludeId=${leaderExcludeIds}`}
                                            unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=director`}
                                            personQueryParams={["name", "email"]}
                                            unitQueryParams={["name"]}
                                            onTypeChange={setLeaderType}
                                            defaultType={leaderType}
                                              optionSubLabel="parentName"
                                            disabled={!(checkPermision?.directorSelectDepartment)}
                                            disabledInput={checkPermision?.disableSuporter}
                                        />
                                )}
                            />
                        </Grid>

                        {!checkPermision?.disableSuporter && !hideCoordinators && <Grid item xs={12} md={6}>
                            <Controller
                                name="coordinators"
                                control={control}
                                render={({ field }) => (
                                    !(checkPermision?.supporterSelectDepartment) ?
                                        <WrappedAsyncAutoComplete
                                            {...field}
                                            label="Người phối hợp"
                                            url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=supporter&leaderId=${getId(watchAssigner) || ""}&excludeId=${coordinatorExcludeIds}`}
                                            queryParams={["name", "email"]}
                                            optionLabel="name"
                                            isMulti
                                            limitTags={3}
                                             optionSubLabel="parentName"
                                            optionValue="id"
                                        /> :
                                        <WrappedPersonOrUnitAsyncInput
                                            {...field}
                                            label="Người phối hợp"
                                            personUrl={`${API_GET_COMMON_WORK_USER}?typeTaskUser=supporter&leaderId=${getId(watchAssigner) || ""}&excludeId=${coordinatorExcludeIds}`}
                                            unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=supporter`}
                                            personQueryParams={["name", "email"]}
                                            unitQueryParams={["name"]}
                                            isMulti
                                            limitTags={2}
                                             optionSubLabel="parentName"
                                            disabled={!(checkPermision?.supporterSelectDepartment)}
                                            onTypeChange={setCoordinatorType}
                                            defaultType={coordinatorType}
                                        />
                                )}
                            />
                        </Grid>
                        }
                        <Grid item xs={12} md={6}>
                            <Controller
                                name="viewers"
                                control={control}
                                render={({ field }) => (
                                    <WrappedAsyncAutoComplete
                                        isMulti
                                        label="Người xem"
                                        placeholder="Tìm kiếm"
                                        {...field}
                                        url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=viewer&excludeId=${viewerExcludeIds}&leaderId=${getId(watchAssigner) || ""}`}
                                        queryParams={["name", "email"]}
                                        optionLabel="name"
                                        optionValue="id"
                                        optionSubLabel="parentName"
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>
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
                    {/* TÀI LIỆU CÔNG VIỆC */}
                    {/* <JobSectionTitle variant="h6" gutterBottom>
                            TÀI LIỆU CÔNG VIỆC
                          </JobSectionTitle> */}

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
                </UploadDropZone>
            </JobMainContent>

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
            <PopupTemplate
                open={openPopupTemplate}
                onClose={handleClosePopupTemplate}
                onSave={handleConfirmBypassTemplate}
                templateWarningInfo={templateWarningInfo?.templateName}
                onCloseDialog={onClose}
                setReloadData={setReloadData}
                templateName={templateWarningInfo?.templateName}

            />

            <LoadingDialog open={isLoading} >
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>

            {/* Dialog xác nhận reset tiến độ công việc cha */}
            {confirmResetOpen && (
                <CustomDialog
                    open={confirmResetOpen}
                    onClose={handleCloseConfirmReset}
                    onSave={handleConfirmReset}
                    title={
                        <DialogTitleBox>
                            <ConfirmDialogIconWrapper>
                                <WarningAmberIcon />
                            </ConfirmDialogIconWrapper>
                            <StyleSkyTypography>THÔNG BÁO</StyleSkyTypography>
                        </DialogTitleBox>
                    }
                    titleButton="ĐỒNG Ý"
                    isLoading={isLoading}
                >
                    <ConfirmDialogContent>
                        <ConfirmDialogText variant="body1">
                            Vì công việc <strong>{parentName}</strong> đã cập nhật tiến độ trước đó, nếu bạn vẫn muốn tạo công việc con cho công việc <strong>{parentName}</strong> thì tiến độ công việc <strong>{parentName}</strong> sẽ chuyển về <RedText component="span">0%</RedText>. Khi đó hệ thống sẽ tự động tính tiến độ thực hiện công việc <strong>{parentName}</strong> dựa vào tiến độ hoàn thành các công việc con
                        </ConfirmDialogText>
                        <ConfirmDialogSubText variant="body2">
                            Tác vụ này sẽ không thể hoàn tác
                        </ConfirmDialogSubText>
                    </ConfirmDialogContent>
                </CustomDialog>
            )}
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
                        <InputComponents
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
                        <InputComponents
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
        </CustomSwipper>
    );
};

export default withSharedComponents(AddJobChild);