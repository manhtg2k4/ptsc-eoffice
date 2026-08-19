/* eslint-disable camelcase */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useCallback } from "react";
import {
    Grid,
    ListItemText,
    Menu,
    MenuItem,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import FolderIcon from "@mui/icons-material/Folder";
import * as yup from "yup";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_COMMON_WORK, API_GET_COMMON_WORK_USER, APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import {
    JobBlueButton,
    JobButtonContainer,
    JobMainContent,
    JobPlaceholderText,
    JobSectionTitle,
    JobUploadPlaceholderBox,
    StyledBoxContainerContent,
    StyledListItemIcon,
    StyledMenuIcon,
} from "./AddProject.styles";
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


dayjs.extend(isSameOrAfter);

const AddJobProject = ({
    open,
    onClose,
    onSuccess,
    sharedComponents,
    title = "Thêm mới dự án",
    parentId = null,
    parentName = null,
    parentStartDate = null,
    parentEndDate = null,
}) => {
    const {
        CustomSwipper,
        InputComponents,
        ButtonOutline,
        AsyncAutoCompleted,
    } = sharedComponents;
    const { crmSource } = useSelector((state) => state.config);
    const optionModeOfWork =
        crmSource.find((item) => item.code === "CONGVIECLAPLAI")?.data || [];
    const urgencyOptions =
        crmSource.find((item) => item.code === "DOUUTIEN")?.data || [];
    const optionTypeOfProcess =
        crmSource.find((item) => item.code === "S99ultra")?.data || [];
    const timeOptions =
        crmSource.find((item) => item.code === "S34")?.data || [];

    const schema = yup.object().shape({
        taskName: yup.string().required("Vui lòng nhập tên dự án"),
        deadline: yup
            .date()
            .required("Vui lòng chọn hạn xử lý")
            .typeError("Hạn xử lý không hợp lệ")
            .test(
                'not-past',
                'Hạn xử lý không được ở trong quá khứ',
                function (value) {
                    if (parentStartDate) {
                        return dayjs(value)?.isSameOrAfter(dayjs(parentStartDate), 'minute');
                    }
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
                'max-date',
                'Hạn xử lý không được vượt quá ngày kết thúc của dự án/công việc cha',
                function (value) {
                    if (!value || !parentEndDate) return true;
                    return dayjs(value).valueOf() <= dayjs(parentEndDate).endOf('day').valueOf();
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
                    if (parentStartDate) {
                        return dayjs(value).isSameOrAfter(dayjs(parentStartDate), 'minute');
                    }
                    return dayjs(value).isSameOrAfter(dayjs(), 'minute');
                }
            )
            .test(
                'max-date',
                'Ngày bắt đầu không được vượt quá ngày kết thúc của dự án/công việc cha',
                function (value) {
                    if (!value || !parentEndDate) return true;
                    return dayjs(value).valueOf() <= dayjs(parentEndDate).endOf('day').valueOf();
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
        reset,
        trigger,
        watch,
        setValue,
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            taskName: "",
            startDate: null,
            deadline: null,
            reminderTime: "24h",
            priority: "",
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
        },
    });

    const [uploadedFiles, setUploadedFiles] = React.useState([]);

    const [isLoading, setIsLoading] = React.useState(false);
    const [leaderType, setLeaderType] = React.useState("person");
    const [coordinatorType, setCoordinatorType] = React.useState("person");

    // State cho việc xử lý trùng lặp
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [pendingFiles, setPendingFiles] = React.useState([]);

    const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
    const [selectedFileId, setSelectedFileId] = React.useState(null);
    const [selectedIsFolder, setSelectedIsFolder] = React.useState(false);
    const toast = useToast();



    const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
        setValue("startDate", startDate, { shouldValidate: true });
        setValue("deadline", endDate, { shouldValidate: true });
        setTimeout(() => trigger(["startDate", "deadline"]), 0);
    }, [setValue, trigger]);

    // Reset form khi mở
    useEffect(() => {
        if (open) {
            reset({
                taskName: "",
                startDate: null,
                deadline: null,
                reminderTime: "24h",
                priority: "",
                mode: "",
                repeatTask: parentId ? (optionModeOfWork.find(opt => opt.title?.includes("Không"))?.value || "") : (optionModeOfWork[0]?.value || "Theo quý"),
                recurringMonth: "",
                recurringDay: null,
                recurringTime: null,
                description: "",
                assigner: null,
                leader: null,
                coordinators: [],
                viewers: [],
                files: [],
            });
            setUploadedFiles([]);
            setLeaderType("person");
            setCoordinatorType("person");
            setFileMenuAnchor(null);
            setSelectedFileId(null);
            setSelectedIsFolder(false);

        }
    }, [open, reset, optionModeOfWork, parentId]);

    const onSubmit = async (data) => {
        setIsLoading(true);
        const getId = (val) => val?._id || val?.id || val?.processId || val;

        try {
            // Mapping data to new backend structure
            const payload = {
                name: data.taskName,
                startDate: data.startDate ? dayjs(data.startDate).toISOString() : null,
                endDate: data.deadline ? dayjs(data.deadline).toISOString() : null,
                priority: data.priority,
                topic: data.mode,
                note: data.description,
                progress: "0",
                parent: parentId,
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

            };

            // 1. Tạo công việc trước
            const response = await axiosInstance.post(API_ADD_COMMON_WORK, payload);
            const newTaskId = response?.data?._id || response?._id || response?.id;

            if (!newTaskId) {
                throw new Error("Không nhận được ID công việc sau khi tạo.");
            }

            // 2. Nếu không có file thì kết thúc
            if (uploadedFiles.length === 0) {
                toast("Thêm mới công việc thành công!", "success");
                onSuccess?.();
                onClose();
                return;
            }

            const isFolderUpload = uploadedFiles.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));
            logger.log("isFolderUpload", isFolderUpload);
            // 3. Upload file nếu có
            if (isFolderUpload) {
                const createdFolders = {};
                for (const file of uploadedFiles) {
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

                const uploadedFileIds = [];
                for (const file of uploadedFiles) {
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

            // 4. Cập nhật lại công việc với danh sách file (nếu backend yêu cầu cập nhật field files)
            // if (uploadedFileIds.length > 0) {
            //   const updatePayload = {
            //     ...payload,
            //     files: uploadedFileIds,
            //   };
            //   await axiosInstance.put(`${API_ADD_COMMON_WORK}/${newTaskId}`, updatePayload);
            // }

            toast("Thêm mới công việc và tải tệp đính kèm thành công!", "success");
            onSuccess?.();
            onClose();
        } catch (error) {
            logger.log("error", error);
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

    return (
        <CustomSwipper
            title={title}
            open={open}
            onClose={onClose}
            onSave={handleSubmit(onSubmit)}
            type="add"
            hideBackdrop
            moreActions={
                <ButtonOutline
                    onClick={handleSubmit(onSubmit)}
                    disabled={isLoading}
                    variant="outlined"
                >
                    LƯU
                </ButtonOutline>
            }
        >
            <JobMainContent>
                {/* THÔNG TIN CHUNG */}
                <StyledBoxContainerContent>
                    <JobSectionTitle variant="h6" gutterBottom mt={0}>
                        THÔNG TIN CHUNG
                    </JobSectionTitle>

                    <Grid container spacing={2}>
                        {/* Cột 1: Tên công việc, Quy trình, Độ ưu tiên */}
                        <Grid item xs={12} md={3.8}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Controller
                                        name="taskName"
                                        control={control}
                                        render={({ field }) => (
                                            <InputComponents
                                                label="Tên công việc"
                                                placeholder="Nhập tên công việc"
                                                {...field}
                                                required
                                                error={!!errors.taskName}
                                                helperText={errors.taskName?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller
                                        name="process"
                                        control={control}
                                        render={({ field }) => (
                                            <InputComponents
                                                select
                                                label="Quy trình"
                                                placeholder="Tìm kiếm"
                                                options={optionTypeOfProcess}
                                                customLabel="title"
                                                customValue="value"
                                                {...field}
                                                error={!!errors.process}
                                                helperText={errors.process?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller
                                        name="priority"
                                        control={control}
                                        render={({ field }) => (
                                            <InputComponents
                                                select
                                                label="Độ ưu tiên"
                                                placeholder="Bình thường"
                                                options={urgencyOptions}
                                                customLabel="title"
                                                customValue="code"
                                                {...field}
                                                error={!!errors.priority}
                                                helperText={errors.priority?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Cột 2: Ngày bắt đầu/Hạn xử lý, Thời gian nhắc hạn, Công việc cha */}
                        <Grid item xs={12} md={4.7}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <DateTimeRangePicker
                                        showTime
                                        label="Ngày bắt đầu - Hạn xử lý"
                                        value={{
                                            startDate: watch("startDate"),
                                            endDate: watch("deadline"),
                                        }}
                                        onChange={handleDateRangeChange}
                                        minDate={parentStartDate ? dayjs(parentStartDate) : dayjs()}
                                        maxDate={parentEndDate ? dayjs(parentEndDate).endOf('day') : undefined}
                                        startLabel="Ngày bắt đầu"
                                        endLabel="Hạn xử lý"
                                        required
                                        error={!!(errors.startDate || errors.deadline)}
                                        helperText={errors.startDate?.message || errors.deadline?.message}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller
                                        name="reminderTime"
                                        control={control}
                                        render={({ field }) => (
                                            <InputComponents
                                                select
                                                label="Thời gian nhắc hạn"
                                                placeholder="24h"
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
                                <Grid item xs={12}>
                                    <InputComponents
                                        label="Công việc cha"
                                        placeholder="Nhập 100 container"
                                        value={parentName || ""}
                                        disabled
                                    />
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Cột 3: Mô tả */}
                        <Grid item xs={12} md={3.5}>
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        label="Mô tả"
                                        multiline
                                        rows={4.5}
                                        placeholder="Nhập mô tả công việc..."
                                        {...field}
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>
                </StyledBoxContainerContent>

                {/* THÔNG TIN NGƯỜI THAM GIA */}
                <StyledBoxContainerContent styledMarginTop>
                    <JobSectionTitle variant="h6" gutterBottom>
                        THÔNG TIN NGƯỜI THAM GIA
                    </JobSectionTitle>

                    <Grid container spacing={2} mb={3}>
                        <Grid item xs={12} md={6}>
                            <Controller
                                name="assigner"
                                control={control}
                                render={({ field }) => (
                                    <AsyncAutoCompleted
                                        label="Người giao việc"
                                        placeholder="Tìm kiếm"
                                        {...field}
                                        url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=assigner`}
                                        queryParam="name"
                                        optionLabel="name"
                                        optionValue="_id"
                                        required
                                        error={!!errors.assigner}
                                        helperText={errors.assigner?.message}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Controller
                                name="leader"
                                control={control}
                                render={({ field }) => (
                                    <AsyncAutoCompleted
                                        label="Người chủ trì"
                                        placeholder="Tìm kiếm"
                                        {...field}
                                        url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=assigner`}
                                        queryParam="name"
                                        optionLabel="name"
                                        optionValue="_id"
                                        error={!!errors.leader}
                                        helperText={errors.leader?.message}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Controller
                                name="coordinators"
                                control={control}
                                render={({ field }) => (
                                    <AsyncAutoCompleted
                                        isMulti
                                        label="Người phối hợp"
                                        placeholder="Tìm kiếm"
                                        {...field}
                                        url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=viewer`}
                                        queryParam="name"
                                        optionLabel="name"
                                        optionValue="_id"
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Controller
                                name="viewers"
                                control={control}
                                render={({ field }) => (
                                    <AsyncAutoCompleted
                                        isMulti
                                        label="Người xem"
                                        placeholder="Tìm kiếm"
                                        {...field}
                                        url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=viewer`}
                                        queryParam="name"
                                        optionLabel="name"
                                        optionValue="_id"
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>
                </StyledBoxContainerContent>
                <StyledBoxContainerContent styledMarginTop>
                    {/* TÀI LIỆU DỰ ÁN */}
                    <JobSectionTitle variant="h6" gutterBottom>
                        TÀI LIỆU DỰ ÁN
                    </JobSectionTitle>

                    <JobButtonContainer>
                        <JobBlueButton component="label" variant="contained" startIcon={<InsertDriveFileIcon />}>
                            Tải File
                            <input type="file" hidden multiple onChange={handleFilesChange} />
                        </JobBlueButton>
                        <JobBlueButton component="label" variant="contained" startIcon={<FolderIcon />}>
                            Tải Folder
                            <input type="file" hidden multiple webkitdirectory="" onChange={handleFilesChange} />
                        </JobBlueButton>
                    </JobButtonContainer>

                    {/* Hiển thị FileTreeTable với cấu trúc cây */}
                    {fileTreeData.length > 0 ? (
                        <>
                            <FileTreeTable
                                data={fileTreeData}
                                onFileMenuClick={handleFileMenuClick}
                                MenuIcon={StyledMenuIcon}
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

            <LoadingDialog open={isLoading} >
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>

        </CustomSwipper>
    );
};

export default withSharedComponents(AddJobProject);