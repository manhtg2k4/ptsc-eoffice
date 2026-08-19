import React, { useCallback, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
    SkyGrid as Grid,
    SkyMenu as Menu,
    SkyMenuItem as MenuItem,
    SkyListItemText as ListItemText,
} from "@styles/SkyStyles";
import {
    HealthDialogContainer,
    HealthAttachmentSection,
    HealthAttachmentTitle,
    // BlueActionButton,
    HiddenInput,
    StyledMenuIcon,
    StyledListItemIcon,
    JobButtonContainer,
    SmallVisibilityIcon,
    SmallDeleteIcon,
} from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
// import { Visibility, DeleteOutline } from "@mui/icons-material";
import FileTreeTable from "@components/FileTreeTable";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import dayjs from "dayjs";
import { callApi } from "@services/api";
import { API_DOC_TO_PDF, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";


const HealthCheckScheduleDialog = ({
    open,
    onClose,
    onSave,
    sharedComponents,
    isLoading,
}) => {
    const {
        Dialog,
        // InputComponents,
        DatePicker,
        toast,
        ButtonOutline
    } = sharedComponents;

    const [healthFiles, setHealthFiles] = React.useState([]);
    const fileInputRef = useRef(null);

    // File menu and preview state
    const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
    const [selectedFileId, setSelectedFileId] = React.useState(null);
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [previewUrl, setPreviewUrl] = React.useState("");
    const [previewFileName, setPreviewFileName] = React.useState("");
    const [localLoading, setLocalLoading] = React.useState(false);
    const tempPreviewUrlRef = React.useRef(null);

    const schema = yup.object().shape({
        examDate: yup.date()
            .required("Vui lòng chọn ngày khám")
            .typeError("Ngày khám không hợp lệ")
            .max(new Date(), "Ngày khám không được lớn hơn ngày hiện tại"),
        healthFiles: yup.array().min(1, "Vui lòng đính kèm giấy khám sức khỏe"),
    });

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
    } = useForm({
        resolver: yupResolver(schema),
        mode: "onChange",
        defaultValues: {
            examDate: null,
            healthFiles: [],
        },
    });

    React.useEffect(() => {
        if (open) {
            reset({
                examDate: null,
                healthFiles: [],
            });
            setHealthFiles([]);
        }
    }, [open, reset]);

    const handleSave = handleSubmit(
        (data) => {
            onSave?.({
                ...data,
                files: healthFiles,
            });
        },
        (errors) => {
            if (errors.healthFiles) {
                toast(errors.healthFiles.message, "error");
            }
        }
    );

    const handleFileUpload = useCallback((event) => {
        const files = Array.from(event.target.files);
        const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"];
        const MAX_SIZE_MB = 10;
        const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

        const currentFilesCount = healthFiles.length;
        if (currentFilesCount + files.length > 10) {
            toast("Vượt số lượng cho phép 10 file", "error");
            return;
        }

        const validFiles = [];
        for (const file of files) {
            const extension = file.name.split(".").pop().toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(extension)) {
                toast(`Định dạng tệp ${file.name} không được hỗ trợ.`, "error");
                continue;
            }
            if (file.size > MAX_SIZE_BYTES) {
                toast(`Tệp ${file.name} vượt quá dung lượng tối đa 10MB.`, "error");
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length > 0) {
            const newFiles = validFiles.map((file, index) => ({
                id: (Date.now() + index).toString(),
                file: file,
                name: file.name,
                url: URL.createObjectURL(file)
            }));
            const updatedFiles = [...healthFiles, ...newFiles];
            setHealthFiles(updatedFiles);
            setValue("healthFiles", updatedFiles, { shouldValidate: true });
        }
        event.target.value = null;
    }, [toast, healthFiles, setValue]);

    const handleUploadClick = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);

    const handleFileMenuClick = useCallback((event) => {
        const fileId = event.currentTarget.getAttribute('data-file-id');
        setSelectedFileId(fileId);
        setFileMenuAnchor(event.currentTarget);
    }, []);

    const handleCloseFileMenu = useCallback(() => {
        setFileMenuAnchor(null);
    }, []);

    const handleClose = useCallback(() => {
        healthFiles.forEach(file => {
            if (file.url) {
                URL.revokeObjectURL(file.url);
            }
        });
        if (tempPreviewUrlRef.current) {
            URL.revokeObjectURL(tempPreviewUrlRef.current);
            tempPreviewUrlRef.current = null;
        }
        onClose?.();
    }, [healthFiles, onClose]);

    const handleViewFile = useCallback(async () => {
        const fileObj = healthFiles.find(img => img.id === selectedFileId);
        if (fileObj) {
            const fileName = fileObj.name || "";
            const lower = fileName.toLowerCase();
            const isDoc = /\.(doc|docx)$/i.test(lower);
            const isExcel = /\.(xls|xlsx)$/i.test(lower);

            if (isDoc || isExcel) {
                setLocalLoading(true);
                try {
                    const formData = new FormData();
                    formData.append("file", fileObj.file);

                    let response;
                    if (isDoc) {
                        response = await callApi(
                            "post",
                            API_DOC_TO_PDF,
                            formData,
                            { responseType: "blob", timeout: 30000 }
                        );
                    } else {
                        response = await callApi(
                            "post",
                            API_XLSX_TO_PDF,
                            formData,
                            { responseType: "blob", timeout: 30000 }
                        );
                    }

                    const pdfBlob = new Blob([response], { type: "application/pdf" });
                    const tempUrl = URL.createObjectURL(pdfBlob);

                    tempPreviewUrlRef.current = tempUrl;
                    setPreviewUrl(tempUrl);
                    setPreviewFileName(fileName + ".pdf");
                    setPreviewOpen(true);
                } catch (error) {
                    logger.error("Error converting file:", error);
                    toast("Không thể xem trước tệp tài liệu này.", "error");
                } finally {
                    setLocalLoading(false);
                }
            } else {
                setPreviewUrl(fileObj.url);
                setPreviewFileName(fileObj.name);
                setPreviewOpen(true);
            }
        }
        handleCloseFileMenu();
    }, [healthFiles, selectedFileId, handleCloseFileMenu, toast]);

    const handleDeleteFile = useCallback(() => {
        const remainingFiles = healthFiles.filter((img) => img.id !== selectedFileId);
        const deleted = healthFiles.find((img) => img.id === selectedFileId);

        if (deleted && deleted.url) {
            URL.revokeObjectURL(deleted.url);
        }

        setHealthFiles(remainingFiles);
        setValue("healthFiles", remainingFiles, { shouldValidate: true });
        handleCloseFileMenu();
    }, [selectedFileId, healthFiles, setValue, handleCloseFileMenu]);

    const handleClosePreview = useCallback(() => {
        setPreviewOpen(false);
        if (tempPreviewUrlRef.current) {
            URL.revokeObjectURL(tempPreviewUrlRef.current);
            tempPreviewUrlRef.current = null;
        }
        setPreviewUrl("");
        setPreviewFileName("");
    }, []);

    const fileTreeData = React.useMemo(() => {
        return healthFiles.map((file) => ({
            id: file.id,
            name: file.name,
            isFolder: false
        }));
    }, [healthFiles]);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            onSave={handleSave}
            title="Lịch khám sức khỏe"
            size="sm"
            isLoading={isLoading || localLoading}
        >
            <HealthDialogContainer>
                <Grid container>
                    <Grid item xs={12}>
                        <Controller
                            name="examDate"
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    label="Ngày khám"
                                    placeholder="dd/mm/yyyy"
                                    required
                                    {...field}
                                    maxDate={dayjs()}
                                    error={!!errors.examDate}
                                    helperText={errors.examDate?.message}
                                />
                            )}
                        />
                    </Grid>
                </Grid>

                <HealthAttachmentSection>
                    <HealthAttachmentTitle variant="subtitle1">
                        TỆP ĐÍNH KÈM GIẤY KHÁM SỨC KHỎE
                    </HealthAttachmentTitle>

                    <JobButtonContainer>
                        <ButtonOutline
                            variant="contained"
                            startIcon={<CloudUploadIcon />}
                            onClick={handleUploadClick}
                        >
                            Tải Lên
                        </ButtonOutline>
                    </JobButtonContainer>

                    <HiddenInput
                        type="file"
                        multiple
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />

                    {healthFiles.length > 0 && (
                        <FileTreeTable
                            data={fileTreeData}
                            onFileMenuClick={handleFileMenuClick}
                            MenuIcon={StyledMenuIcon}
                            showStt
                        />
                    )}
                </HealthAttachmentSection>

                <Menu
                    anchorEl={fileMenuAnchor}
                    open={Boolean(fileMenuAnchor)}
                    onClose={handleCloseFileMenu}
                >
                    <MenuItem onClick={handleViewFile}>
                        <StyledListItemIcon>
                            <SmallVisibilityIcon />
                        </StyledListItemIcon>
                        <ListItemText>Xem chi tiết</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleDeleteFile}>
                        <StyledListItemIcon>
                            <SmallDeleteIcon />
                        </StyledListItemIcon>
                        <ListItemText>Xóa</ListItemText>
                    </MenuItem>
                </Menu>

                <FilePreviewDialog
                    open={previewOpen}
                    onClose={handleClosePreview}
                    fileName={previewFileName}
                    url={previewUrl}
                />
            </HealthDialogContainer>
        </Dialog>
    );
};

export default HealthCheckScheduleDialog;
