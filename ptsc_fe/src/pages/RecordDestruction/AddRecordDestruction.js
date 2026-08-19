import React, { memo, useCallback, useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
// import Swipper from "@components/Swipper";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Grid, useMediaQuery, useTheme, Menu, MenuItem, Collapse, ClickAwayListener, Checkbox, FormControlLabel } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import TuneIcon from "@mui/icons-material/Tune";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import { FormContainer } from "@styles/FormList.styles";
import {
    StyledSectionTitle,
    StyledStatusChip,
    StyledDialogHeaderWrapper,
    StyledDialogSearchWrapper,
    StyledFilterIconButton,
    StyledSearchIconButton,
    StyledSearchInputWrapper,
    StyledDatePickerWrapper,
    StyledDatePickersRow,
    StyledTitleWithToggle,
    StyledCollapseIconButton,
    SearchFilterBox,
    FilterTitle,
    FilterCheckboxAll,
    FilterCheckboxGrid,
    FilterActionsBox,
    FilterCancelButton,
    FilterApplyButton,
    FilterButtonWrapper,
    StyledDialogContentNoScrollbar,
    StyledDeleteIconButton,
    StyledSelectionDialog,
    StyledDialogHeaderTitle,
    StyledDialogTitleWhite,
    StyledTableWrapper,
    StyledTableContent,
    StyledHeaderWrapper,
    StyledHeaderActions,
    StyledSelectionButton,
    StyledDialogClearIconButton,
    StyledSelectionDialogActions,
    StyledDialogCancelButton,
    StyledDialogSaveButton,
    StyledBlockWrapper,
} from "@styles/RecordDestruction/RecordDestruction.styles";

import Button from "@components/CustomButton";
import { defaultValues, recordDestructionSchema, expiredRecordsColumns, selectedRecordsColumns } from "./constants";
import CustomTable from "@components/CustomTable/CustomTable";
import ViewRecordManagement from "@pages/RecordManagement/ViewRecordManagement";
import { useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import CommanderApprovalModal from "@components/SubmitApprovalModal/CommanderApprovalModal";
import { APP_BASE, API_GET_ACTION_DESTROY_RECORDS, API_ARCHIVES } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import dayjs from "dayjs";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import withSharedComponents from "@components/WrapperComponent";
import withFormWrapper from "@components/common/FormWrapper";
import { FileIconSvg } from "@assets/icons/FileIconSvg";

// Filter Dropdown Component
const FilterDropdown = memo(({
    openFilter,
    handleToggleFilter,
    handleCloseFilter,
    tempSelectedColumns,
    textSearchableFields,
    handleSelectAllColumnsChange,
    handleColumnToggle,
    handleApplyFilterClick,
}) => (
    <FilterButtonWrapper>
        <StyledFilterIconButton type="button" onClick={handleToggleFilter}>
            <TuneIcon />
        </StyledFilterIconButton>
        {openFilter && (
            <SearchFilterBox>
                <FilterTitle>
                    <span>Lọc tìm kiếm</span>
                    <SearchOutlinedIcon />
                </FilterTitle>

                <FilterCheckboxAll>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={tempSelectedColumns.length === textSearchableFields.length}
                                indeterminate={
                                    tempSelectedColumns.length > 0 &&
                                    tempSelectedColumns.length < textSearchableFields.length
                                }
                                onChange={handleSelectAllColumnsChange}
                                size="small"
                            />
                        }
                        label="Tất cả"
                    />
                </FilterCheckboxAll>

                <FilterCheckboxGrid>
                    {textSearchableFields?.map((column) => (
                        <FormControlLabel
                            key={column.code}
                            control={
                                <Checkbox
                                    checked={tempSelectedColumns.includes(column.code)}
                                    onChange={handleColumnToggle(column.code)}
                                    size="small"
                                />
                            }
                            label={column.name}
                        />
                    ))}
                </FilterCheckboxGrid>

                <FilterActionsBox>
                    <FilterCancelButton onClick={handleCloseFilter}>
                        Hủy
                    </FilterCancelButton>
                    <FilterApplyButton
                        variant="contained"
                        onClick={handleApplyFilterClick}
                    >
                        Áp dụng
                    </FilterApplyButton>
                </FilterActionsBox>
            </SearchFilterBox>
        )}
    </FilterButtonWrapper>
));

FilterDropdown.displayName = "FilterDropdown";

FilterDropdown.propTypes = {
    openFilter: PropTypes.bool.isRequired,
    handleToggleFilter: PropTypes.func.isRequired,
    handleCloseFilter: PropTypes.func.isRequired,
    tempSelectedColumns: PropTypes.array.isRequired,
    textSearchableFields: PropTypes.array.isRequired,
    handleSelectAllColumnsChange: PropTypes.func.isRequired,
    handleColumnToggle: PropTypes.func.isRequired,
    handleApplyFilterClick: PropTypes.func.isRequired,
};


const ActionButton = memo(({ action, onActionClick }) => {
    const handleClick = useCallback(() => {
        onActionClick(action);
    }, [action, onActionClick]);

    return (
        <Button
            variant={action.type === "create_daft_destroy_submit" ? "primary" : "outlined"}
            onClick={handleClick}
        >
            {action.label?.toUpperCase()}
        </Button>
    );
});

ActionButton.displayName = "ActionButton";
ActionButton.propTypes = {
    action: PropTypes.object.isRequired,
    onActionClick: PropTypes.func.isRequired,
};

function AddRecordDestruction(props) {
    const { open, onClose, setReloadData, sharedComponents } = props;
    const { InputComponents: BaseInput, DatePicker: BaseDatePicker } = sharedComponents;

    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md")); // < 900px
    const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // < 600px

    const [openDialog, setOpenDialog] = useState(false);
    const [openViewRecordManagement, setOpenViewRecordManagement] = useState({ open: false, archiveId: null });
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [tempSelectedRecords, setTempSelectedRecords] = useState([]);
    const [tableSelectedRecords, setTableSelectedRecords] = useState([]); // For checkbox in table
    const [dialogSearchText, setDialogSearchText] = useState("");
    const [dialogFromDate, setDialogFromDate] = useState(null);
    const [dialogToDate, setDialogToDate] = useState(null);
    const [appliedSearchText, setAppliedSearchText] = useState("");
    const [appliedFromDate, setAppliedFromDate] = useState(null);
    const [appliedToDate, setAppliedToDate] = useState(null);
    const [dialogPage, setDialogPage] = useState(0);
    const [dialogPageSize, setDialogPageSize] = useState(25);
    const toast = useToast();
    const [dataList, setDataList] = useState([]);
    const [actionDestroyRecords, setActionDestroyRecords] = useState([]);
    const [openCommanderApprovalModal, setOpenCommanderApprovalModal] = useState(false);
    const [commanderModalProps, setCommanderModalProps] = useState({
        title: "CHUYỂN XỬ LÝ",
        endpoint: "leaders-destroy-records",
        roles: "CHANH_VAN_PHONG"
    });
    const [pendingAction, setPendingAction] = useState(null);
    const [pendingFormData, setPendingFormData] = useState(null);

    // Mobile features
    const [isInfoCollapsed, setIsInfoCollapsed] = useState(false);
    const [isRecordsCollapsed, setIsRecordsCollapsed] = useState(false);
    const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);

    // Filter dropdown state
    const [openFilter, setOpenFilter] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [tempSelectedColumns, setTempSelectedColumns] = useState([]);
    const { crmSource } = useSelector((state) => state.config);
    const destroyReasonOptions =
        crmSource?.find((item) => item?.code === "destroyReason")?.data || [];

    const InputComponents = useMemo(() => {
        const Wrapped = withFormWrapper(BaseInput, "input");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "InputComponents";
        return Component;
    }, [BaseInput]);

    const DatePickerComponent = useMemo(() => {
        const Wrapped = withFormWrapper(BaseDatePicker, "date");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "DatePickerComponent";
        return Component;
    }, [BaseDatePicker]);


    // Get searchable text fields from columns
    const textSearchableFields = useMemo(() => {
        return expiredRecordsColumns
            .filter(col => col.row !== 'actions' && col.row !== 'yearCategory' && col.row !== 'retentionPeriod' && col.isFilter !== false)
            .map(col => ({
                code: col.row,
                name: col.label,
            }));
    }, []);

    // Initialize selected columns
    useEffect(() => {
        const allCodes = textSearchableFields.map(f => f.code);
        setSelectedColumns(allCodes);
        setTempSelectedColumns(allCodes);
    }, [textSearchableFields]);

    // Auto-collapse "Thông tin chung" when selectedRecords exist on mobile
    useEffect(() => {
        if (isMobile && selectedRecords.length > 0) {
            setIsInfoCollapsed(true);
        }
    }, [isMobile, selectedRecords.length]);

    const { control, reset, handleSubmit, formState: { errors } } = useForm({
        defaultValues,
        resolver: yupResolver(recordDestructionSchema),
    });

    useEffect(() => {
        if (open) {
            const fetchActions = async () => {
                try {
                    const response = await api.get(API_GET_ACTION_DESTROY_RECORDS);
                    if (response?.data) {
                        setActionDestroyRecords(response.data?.data || response.data);
                    }
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error("Error fetching actions:", error);
                }
            };
            fetchActions();
        }
    }, [open]);

    const onSubmit = useCallback(async (data, action) => {
        if (selectedRecords.length === 0) {
            toast("Bạn chưa chọn hồ sơ", "error");
            return;
        }

        // Trình phê duyệt: dùng CommanderApprovalModal
        if (action?.type === "create_daft_destroy_submit") {
            setPendingAction(action);
            setPendingFormData(data);
            setCommanderModalProps({
                title: "CHUYỂN XỬ LÝ",
                endpoint: "leaders-destroy-records",
                roles: "CHANH_VAN_PHONG"
            });
            setOpenCommanderApprovalModal(true);
            return;
        }

        // "Lưu" thông thường: call API ngay
        const payload = {
            destroyBatchCode: data.codeDestruction,
            dateDestruction: data.dateDestruction ? dayjs(data.dateDestruction).format("DD/MM/YYYY") : null,
            destroyBatchName: data.nameDestruction,
            destroyReason: data.reasonDestruction,
            actionCode: action?.code,
            workItem: actionDestroyRecords?.workItem,
            flowConfig: actionDestroyRecords?.flowConfig?.id,
            profileIds: selectedRecords.map(id => {
                const record = dataList.find(r => r.id === id);
                return record?.archiveRecordId || id;
            }),
        };
        try {
            const response = await axiosInstance.post(`${APP_BASE}/api/destroy-records`, payload);
            if (response) {
                toast(action?.label ? `${action.label} thành công` : "Lưu đợt tiêu hủy thành công", "success");
                reset(defaultValues);
                setSelectedRecords([]);
                onClose();
                setReloadData(new Date() * 1);
            }
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi tạo đợt tiêu hủy", "error")
        }
    }, [reset, onClose, setReloadData, selectedRecords, toast, dataList, actionDestroyRecords]);

    // Gọi sau khi chọn người trong popup -> call API với assigneeUserId
    const handleConfirmWithAssignee = useCallback(async (assigneeUserId) => {
        if (!pendingFormData || !pendingAction) return;
        if (selectedRecords.length === 0) {
            toast("Bạn chưa chọn hồ sơ", "error");
            return;
        }
        const data = pendingFormData;
        const action = pendingAction;

        const payload = {
            destroyBatchCode: data.codeDestruction,
            dateDestruction: data.dateDestruction ? dayjs(data.dateDestruction).format("DD/MM/YYYY") : null,
            destroyBatchName: data.nameDestruction,
            destroyReason: data.reasonDestruction,
            actionCode: action?.code,
            workItem: actionDestroyRecords?.workItem,
            flowConfig: actionDestroyRecords?.flowConfig?.id,
            assigneeUserId: assigneeUserId,
            profileIds: selectedRecords.map(id => {
                const record = dataList.find(r => r.id === id);
                return record?.archiveRecordId || id;
            }),
        };
        try {
            const response = await axiosInstance.post(`${APP_BASE}/api/destroy-records`, payload);
            if (response) {
                toast(action?.label ? `${action.label} thành công` : "Trình phê duyệt thành công", "success");
                reset(defaultValues);
                setSelectedRecords([]);
                setPendingAction(null);
                setPendingFormData(null);
                setOpenCommanderApprovalModal(false);
                onClose();
                setReloadData(new Date() * 1);
            }
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi trình phê duyệt", "error");
        }
    }, [pendingFormData, pendingAction, actionDestroyRecords, selectedRecords, dataList, reset, onClose, setReloadData, toast]);

    const handleActionClick = useCallback((action) => {
        handleSubmit((data) => onSubmit(data, action))();
    }, [handleSubmit, onSubmit]);

    const handleCloseCommanderApprovalModal = useCallback(() => {
        setOpenCommanderApprovalModal(false);
        setPendingAction(null);
        setPendingFormData(null);
    }, []);


    const handleOpenDialog = useCallback(() => {
        setTempSelectedRecords(selectedRecords);
        setOpenDialog(true);
    }, [selectedRecords]);

    const handleCloseDialog = useCallback(() => {
        setOpenDialog(false);
        setTempSelectedRecords([]);
    }, []);

    const handleConfirmSelection = useCallback(() => {
        if (tempSelectedRecords.length === 0) {
            toast("Bạn chưa chọn hồ sơ", "error");
            return;
        }
        setSelectedRecords(tempSelectedRecords);
        setOpenDialog(false);
    }, [tempSelectedRecords, toast]);

    const handleSelectionChange = useCallback((newSelection) => {
        setTempSelectedRecords(newSelection);
    }, []);

    const handleDeleteRecord = useCallback((record) => {
        const recordId = record?.archiveRecordId || record?.id || record;
        setSelectedRecords(prev => prev.filter(id => id !== recordId));
        setTableSelectedRecords(prev => prev.filter(id => id !== (record?.id || record)));
    }, []);

    const handleDeleteSelectedRecords = useCallback(() => {
        if (tableSelectedRecords.length === 0) return;
        setSelectedRecords(prev => prev.filter(id => !tableSelectedRecords.includes(id)));
        setTableSelectedRecords([]);
    }, [tableSelectedRecords]);

    const handleViewDetailRecord = useCallback((rowOrId) => {
        const id = typeof rowOrId === "object" ? (rowOrId?.archiveRecordId || rowOrId?._id || rowOrId?.id) : rowOrId;
        setOpenViewRecordManagement({ open: true, archiveId: id });
    }, []);

    const handleCloseViewRecordManagement = useCallback(() => {
        setOpenViewRecordManagement({ open: false, archiveId: null });
    }, []);

    const handleDialogFromDateChange = useCallback((date) => {
        setDialogFromDate(date);
    }, []);

    const handleDialogToDateChange = useCallback((date) => {
        setDialogToDate(date);
    }, []);

    const handleDialogSearchChange = useCallback((e) => {
        setDialogSearchText(e.target.value);
    }, []);

    const handleClearDialogSearch = useCallback(() => {
        setDialogSearchText("");
    }, []);

    const handleDialogSearch = useCallback(() => {
        if (dialogFromDate && dialogToDate && dayjs(dialogFromDate).isAfter(dayjs(dialogToDate))) {
            toast("Từ ngày không được lớn hơn đến ngày", "error");
            return false;
        }
        setAppliedSearchText(dialogSearchText);
        setAppliedFromDate(dialogFromDate);
        setAppliedToDate(dialogToDate);
        setDialogPage(0);
        return true;
    }, [dialogSearchText, dialogFromDate, dialogToDate, toast]);

    const handleDialogPageChange = useCallback((newPage) => {
        setDialogPage(newPage);
    }, []);

    const handleDialogPageSizeChange = useCallback((newPageSize) => {
        setDialogPageSize(newPageSize);
        setDialogPage(0); // Reset to first page when page size changes
    }, []);

    // Filter handlers
    const handleToggleFilter = useCallback(() => {
        if (!openFilter) {
            setTempSelectedColumns(selectedColumns);
        }
        setOpenFilter(prev => !prev);
    }, [openFilter, selectedColumns]);

    const handleCloseFilter = useCallback(() => {
        setOpenFilter(false);
    }, []);

    const handleColumnToggle = useCallback((columnCode) => () => {
        setTempSelectedColumns(prev =>
            prev.includes(columnCode)
                ? prev.filter(val => val !== columnCode)
                : [...prev, columnCode]
        );
    }, []);

    const handleSelectAllColumnsChange = useCallback((e) => {
        if (e.target.checked) {
            setTempSelectedColumns(textSearchableFields.map(f => f.code));
        } else {
            setTempSelectedColumns([]);
        }
    }, [textSearchableFields]);

    const handleApplyFilterClick = useCallback(() => {
        if (handleDialogSearch()) {
            setSelectedColumns(tempSelectedColumns);
            handleCloseFilter();
        }
    }, [tempSelectedColumns, handleDialogSearch, handleCloseFilter]);

    const handleChange = (field) => (e) => {
        const value = e.target.value.replace(/\s/g, "");
        field.onChange(value);
    };

    // Toggle collapse "Thông tin chung" section
    const handleToggleInfoCollapse = useCallback(() => {
        setIsInfoCollapsed(prev => !prev);
    }, []);

    // Toggle collapse "HỒ SƠ CẦN TIÊU HỦY" section
    const handleToggleRecordsCollapse = useCallback(() => {
        setIsRecordsCollapsed(prev => !prev);
    }, []);

    // Mobile more menu handlers
    const handleOpenMoreMenu = useCallback((event) => {
        setMoreMenuAnchor(event.currentTarget);
    }, []);

    const handleCloseMoreMenu = useCallback(() => {
        setMoreMenuAnchor(null);
    }, []);

    const handleMenuDeleteClick = useCallback(() => {
        handleDeleteSelectedRecords();
        handleCloseMoreMenu();
    }, [handleDeleteSelectedRecords, handleCloseMoreMenu]);

    const handleMenuSelectClick = useCallback(() => {
        handleOpenDialog();
        handleCloseMoreMenu();
    }, [handleOpenDialog, handleCloseMoreMenu]);


    const handleMoreAction = useCallback((action, row) => {
        if (action.onClick) {
            action.onClick(row?._id || row?.id);
        }
    }, []);

    const fetchData = useCallback(async (params) => {
        try {
            const combinedParams = {
                ...params,
                type: 'all',
                isExpired: 'true'
            };

            // Gửi khoảng ngày hết hạn (startDate, endDate) lên API
            if (appliedFromDate) {
                combinedParams['filter[expiryDate][startDate]'] = dayjs(appliedFromDate).format("YYYY-MM-DD");
            }
            if (appliedToDate) {
                combinedParams['filter[expiryDate][endDate]'] = dayjs(appliedToDate).format("YYYY-MM-DD");
            }

            if (appliedSearchText) {
                selectedColumns.forEach(col => {
                    combinedParams[`filter[${col}]`] = appliedSearchText;
                });
            }
            
            const response = await api.get(`${API_ARCHIVES}/list`, { params: combinedParams });
            
            // Lấy trực tiếp mảng dữ liệu từ API (đã được lọc sạch từ DB, không cần dùng hàm .filter() ở FE nữa)
            const responseData = response?.data?.items || response?.items || [];
            
            setDataList(Array.isArray(responseData) ? responseData : []);
            
            return {
                data: Array.isArray(responseData) ? responseData : [],
                // Lấy tổng số dòng thực tế từ Server trả về để phân trang chính xác
                total: response?.data?.total || response?.total || responseData.length
            };
            
        } catch (error) {
            toast(error?.message || error?.response?.data?.message || "Có lỗi xảy ra khi lấy danh sách hồ sơ tiêu hủy", "error");
            throw error;
        }
    }, [toast, appliedSearchText, appliedFromDate, appliedToDate, selectedColumns]);

    return (
        <>
            <CustomSwipper
                open={open}
                onClose={onClose}
                title="TẠO MỚI ĐỢT TIÊU HỦY HỒ SƠ"
                footer={
                    <>
                        <FlexGrowBox />
                        <FooterActions>
                            <div style={{ display: "flex", gap: "8px" }}>
                                {actionDestroyRecords?.availableActions?.map((action) => (
                                    <ActionButton
                                        key={action.code}
                                        action={action}
                                        onActionClick={handleActionClick}
                                    />
                                ))}
                            </div>
                        </FooterActions>
                    </>
                }
            >
                <FormContainer>
                    <Grid container spacing={3}>
                        {/* Khối 1: THÔNG TIN CHUNG */}
                        <Grid item xs={12}>
                            <StyledBlockWrapper>
                                <StyledHeaderWrapper>
                                    <StyledTitleWithToggle>
                                        <FileIconSvg />
                                        <StyledSectionTitle variant="h6" noWrap>
                                            THÔNG TIN CHUNG
                                        </StyledSectionTitle>
                                        <StyledStatusChip
                                            label="Chưa trình"
                                            status="pending"
                                            size="small"
                                            backgColor='#FEF9C2'
                                            textColor='#FFA600'
                                            bdColor='#FEF9C2'
                                        />
                                    </StyledTitleWithToggle>
                                    {isMobile && (
                                        <StyledHeaderActions>
                                            <StyledCollapseIconButton
                                                isCollapsed={isInfoCollapsed}
                                                onClick={handleToggleInfoCollapse}
                                            >
                                                <KeyboardArrowDownIcon />
                                            </StyledCollapseIconButton>
                                        </StyledHeaderActions>
                                    )}
                                </StyledHeaderWrapper>

                                {/* Form fields grid - Collapsible on mobile */}
                                <Collapse in={!isInfoCollapsed}>
                                    <Grid container spacing={3}>
                                        {/* Mã đợt yêu cầu tiêu hủy */}
                                        <Grid item xs={12} md={6}>
                                            <Controller
                                                name="codeDestruction"
                                                control={control}
                                                render={({ field }) => (
                                                    <InputComponents
                                                        {...field}
                                                        label="MÃ ĐỢT YÊU CẦU TIÊU HỦY"
                                                        placeholder="Nhập mã đợt yêu cầu tiêu hủy"
                                                        required
                                                        size="small"
                                                        onChange={handleChange(field)}
                                                        error={!!errors.codeDestruction}
                                                        helperText={errors.codeDestruction?.message}
                                                    />
                                                )}
                                            />
                                        </Grid>

                                        {/* Lý do tiêu hủy */}
                                        <Grid item xs={12} md={6}>
                                            <Controller
                                                name="reasonDestruction"
                                                control={control}
                                                render={({ field }) => (
                                                    <InputComponents
                                                        {...field}
                                                        label="LÝ DO TIÊU HỦY"
                                                        placeholder="Chọn lý do tiêu hủy"
                                                        size="small"
                                                        options={destroyReasonOptions}
                                                        required
                                                        select
                                                        error={!!errors.reasonDestruction}
                                                        helperText={errors.reasonDestruction?.message}
                                                    />
                                                )}
                                            />
                                        </Grid>

                                        {/* Tên đợt tiêu hủy */}
                                        <Grid item xs={12} md={6}>
                                            <Controller
                                                name="nameDestruction"
                                                control={control}
                                                render={({ field }) => (
                                                    <InputComponents
                                                        {...field}
                                                        label="TÊN ĐỢT TIÊU HỦY"
                                                        placeholder="Nhập tên đợt tiêu hủy"
                                                        required
                                                        size="small"
                                                        error={!!errors.nameDestruction}
                                                        helperText={errors.nameDestruction?.message}
                                                    />
                                                )}
                                            />
                                        </Grid>

                                        {/* Ngày tạo đợt */}
                                        <Grid item xs={12} md={6}>
                                            <Controller
                                                name="dateDestruction"
                                                control={control}
                                                render={({ field }) => (
                                                    <DatePickerComponent
                                                        {...field}
                                                        label="NGÀY TẠO ĐỢT"
                                                        required
                                                        disabled
                                                        error={!!errors.dateDestruction}
                                                        helperText={errors.dateDestruction?.message}
                                                    />
                                                )}
                                            />
                                        </Grid>
                                    </Grid>
                                </Collapse>
                            </StyledBlockWrapper>
                        </Grid>

                        {/* Khối 2: HỒ SƠ CẦN TIÊU HỦY */}
                        <Grid item xs={12}>
                            <StyledBlockWrapper>
                                <StyledHeaderWrapper>
                                    <StyledTitleWithToggle $isClickable onClick={handleToggleRecordsCollapse}>
                                        <FileIconSvg size={24} />
                                        <StyledSectionTitle variant="h6" noWrap>
                                            HỒ SƠ CẦN TIÊU HỦY
                                        </StyledSectionTitle>
                                        <StyledCollapseIconButton isCollapsed={isRecordsCollapsed}>
                                            <KeyboardArrowDownIcon />
                                        </StyledCollapseIconButton>
                                    </StyledTitleWithToggle>
                                    <StyledHeaderActions>
                                        {!isMobile && (
                                            <StyledSelectionButton>
                                                <Button
                                                    onClick={handleOpenDialog}
                                                    startIcon={<SearchIcon />}
                                                    variant="outlined"
                                                >
                                                    CHỌN HỒ SƠ CẦN TIÊU HỦY
                                                </Button>
                                            </StyledSelectionButton>
                                        )}
                                        {/* Desktop/Tablet: Show delete button */}
                                        {!isMobile && tableSelectedRecords.length > 0 && (
                                            <StyledDeleteIconButton onClick={handleDeleteSelectedRecords}>
                                                <DeleteIcon />
                                            </StyledDeleteIconButton>
                                        )}
                                        {/* Mobile: Show MoreVertIcon menu */}
                                        {isMobile && (
                                            <>
                                                <StyledCollapseIconButton onClick={handleOpenMoreMenu}>
                                                    <MoreVertIcon />
                                                </StyledCollapseIconButton>
                                                <Menu
                                                    anchorEl={moreMenuAnchor}
                                                    open={Boolean(moreMenuAnchor)}
                                                    onClose={handleCloseMoreMenu}
                                                >
                                                    <MenuItem onClick={handleMenuSelectClick}>
                                                        CHỌN HỒ SƠ TIÊU HỦY
                                                    </MenuItem>
                                                    {tableSelectedRecords.length > 0 && (
                                                        <MenuItem onClick={handleMenuDeleteClick}>
                                                            XÓA
                                                        </MenuItem>
                                                    )}
                                                </Menu>
                                            </>
                                        )}
                                    </StyledHeaderActions>
                                </StyledHeaderWrapper>

                                <Collapse in={!isRecordsCollapsed}>
                                    <StyledTableWrapper>
                                        <StyledTableContent $isMobile={isMobile}>
                                            <CustomTable
                                                columns={selectedRecordsColumns}
                                                data={dataList?.filter(record =>
                                                    selectedRecords.includes(record.id) || selectedRecords.includes(record.archiveRecordId)
                                                )}
                                                selection={tableSelectedRecords}
                                                onSelectionChange={setTableSelectedRecords}
                                                customMaxHeight={isMobile ? 400 : isMobileOrTablet ? 650 : 560}
                                                isMaxHeight={isMobile ? 400 : isMobileOrTablet ? 650 : 560}
                                                fixedHeight={selectedRecords.length > 0}
                                                disableAdd
                                                onlyTable
                                                paginationProps={selectedRecords.length > 0 ? true : false}
                                                disableAct={false}
                                                disableEdit
                                                disableDetail
                                                setDeleteFunc={handleDeleteRecord}
                                                enableMoreActions
                                                moreActions={[
                                                    {
                                                        id: "viewDetail",
                                                        label: "Xem chi tiết hồ sơ",
                                                        onClick: (row) => handleViewDetailRecord(row?.archiveRecordId || row?._id || row?.id),
                                                    },
                                                ]}
                                                onMoreAction={handleMoreAction}
                                                isInsideDialog
																								encodeHtml
                                            />
                                        </StyledTableContent>
                                    </StyledTableWrapper>
                                </Collapse>
                            </StyledBlockWrapper>
                        </Grid>
                    </Grid>
                </FormContainer>
            </CustomSwipper>

            {/* Dialog for selecting records */}
            <StyledSelectionDialog
                open={openDialog}
                onClose={handleCloseDialog}
                fullWidth
            >
                <StyledDialogContentNoScrollbar>
                    <StyledDialogHeaderTitle>
                        <StyledDialogTitleWhite variant="h6">
                            HỒ SƠ CẦN TIÊU HỦY
                        </StyledDialogTitleWhite>
                    </StyledDialogHeaderTitle>

                    <StyledDialogHeaderWrapper>
                        <StyledDialogSearchWrapper>
                            <StyledSearchInputWrapper>
                                <BaseInput
                                    placeholder="Tìm kiếm..."
                                    size="small"
                                    value={dialogSearchText}
                                    onChange={handleDialogSearchChange}
                                    InputProps={{
                                        endAdornment: (
                                            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                                {dialogSearchText && (
                                                    <StyledDialogClearIconButton
                                                        size="small"
                                                        onClick={handleClearDialogSearch}
                                                    >
                                                        <ClearIcon />
                                                    </StyledDialogClearIconButton>
                                                )}
                                                <ClickAwayListener onClickAway={handleCloseFilter}>
                                                    <div style={{ display: "inline-flex" }}>
                                                        <FilterDropdown
                                                            openFilter={openFilter}
                                                            handleToggleFilter={handleToggleFilter}
                                                            handleCloseFilter={handleCloseFilter}
                                                            tempSelectedColumns={tempSelectedColumns}
                                                            textSearchableFields={textSearchableFields}
                                                            handleSelectAllColumnsChange={handleSelectAllColumnsChange}
                                                            handleColumnToggle={handleColumnToggle}
                                                            handleApplyFilterClick={handleApplyFilterClick}
                                                        />
                                                    </div>
                                                </ClickAwayListener>
                                            </div>
                                        )
                                    }}
                                />
                            </StyledSearchInputWrapper>
                            <StyledSearchIconButton type="button" onClick={handleDialogSearch}>
                                <SearchIcon />
                            </StyledSearchIconButton>
                        </StyledDialogSearchWrapper>

                        <StyledDatePickersRow>
                            <StyledDatePickerWrapper>
                                <BaseDatePicker
                                    value={dialogFromDate}
                                    onChange={handleDialogFromDateChange}
                                    size="small"
                                    showClearIcon
                                />
                            </StyledDatePickerWrapper>
                            <StyledDatePickerWrapper>
                                <BaseDatePicker
                                    value={dialogToDate}
                                    onChange={handleDialogToDateChange}
                                    size="small"
                                    showClearIcon
                                />
                            </StyledDatePickerWrapper>
                        </StyledDatePickersRow>
                    </StyledDialogHeaderWrapper>

                    <CustomTable
                        columns={expiredRecordsColumns}
                        fetchData={openDialog ? fetchData : undefined}
                        selection={tempSelectedRecords}
                        onSelectionChange={handleSelectionChange}
                        disableAdd
                        disableAct
                        isInsideDialog
                        noneTitle
                        onlyTable
                        customMaxHeight={isMobileOrTablet ? 300 : 450}
                        paginationProps
                        page={dialogPage}
                        pageSize={dialogPageSize}
                        setPage={handleDialogPageChange}
                        setPageSize={handleDialogPageSizeChange}
												encodeHtml
                    />
                </StyledDialogContentNoScrollbar>
                <StyledSelectionDialogActions>
                    <StyledDialogCancelButton onClick={handleCloseDialog}>
                        HỦY
                    </StyledDialogCancelButton>
                    <StyledDialogSaveButton onClick={handleConfirmSelection}>
                        LƯU
                    </StyledDialogSaveButton>
                </StyledSelectionDialogActions>
            </StyledSelectionDialog>

            <ViewRecordManagement
                open={openViewRecordManagement.open}
                onClose={handleCloseViewRecordManagement}
                archiveId={openViewRecordManagement.archiveId}
            />

            {/* Commander Approval Modal for Complex workflow */}
            <CommanderApprovalModal
                open={openCommanderApprovalModal}
                onClose={handleCloseCommanderApprovalModal}
                onConfirmWithAssignee={handleConfirmWithAssignee}
                workItem={actionDestroyRecords?.workItem}
                flowConfig={actionDestroyRecords?.flowConfig?.id}
                title={commanderModalProps.title}
                endpoint={commanderModalProps.endpoint}
                roles={commanderModalProps.roles}
            />
        </>
    );
}

AddRecordDestruction.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    setReloadData: PropTypes.func,
};

AddRecordDestruction.displayName = "AddRecordDestruction";

export default withSharedComponents(memo(AddRecordDestruction));