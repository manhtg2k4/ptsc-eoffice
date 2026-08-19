import React, { memo, useCallback, useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Grid, useMediaQuery, useTheme, Menu, MenuItem, Collapse, ClickAwayListener, Checkbox, FormControlLabel, Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import { FormContainer } from "@styles/FormList.styles";
import {
    StyledHeaderWrapper,
    StyledSectionTitle,
    StyledStatusChip,
    StyledDialogHeaderWrapper,
    StyledDialogSearchWrapper,
    StyledSearchIconButton,
    StyledSearchInputWrapper,
    StyledDatePickerWrapper,
    StyledDatePickersRow,
    StyledTitleWithToggle,
    StyledHeaderActions,
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
    StyledSelectionButton,
    StyledDialogClearIconButton,
    StyledNestedFilterIconButton,
    StyledSelectionDialogActions,
    StyledDialogCancelButton,
    StyledDialogSaveButton,
    StyledBlockWrapper,
} from "@styles/RecordDestruction/RecordDestruction.styles";
import withSharedComponents from "@components/WrapperComponent";
import withFormWrapper from "@components/common/FormWrapper";
import { defaultValues, recordDestructionSchema, expiredRecordsColumns, selectedRecordsColumns } from "./constants";
import SenderReceiverInfo from "@components/SenderReceiverInfo/SenderReceiverInfo";
import ViewRecordManagement from "@pages/RecordManagement/ViewRecordManagement";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import { APP_BASE, API_ARCHIVES } from "@EnvironmentFile/constants/urlConfig";
import dayjs from "dayjs";
import api from "@services/api";
import DOMPurify from "dompurify";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { FileIconSvg } from "@assets/icons/FileIconSvg";
import CustomTableProfile from "@components/CustomTable/CustomTableProfile";
import { useSelector } from "react-redux";

const FilterCustomIcon = () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.3553 2.01172C11.7253 2.01172 12.0253 2.31169 12.0253 2.68172C12.0253 3.05175 11.7253 3.35172 11.3553 3.35172L5.32527 3.35172C4.95523 3.35172 4.65527 3.05175 4.65527 2.68172C4.65527 2.31169 4.95523 2.01172 5.32527 2.01172L11.3553 2.01172Z" fill="#161A1D"/>
        <path d="M7.35527 8.67188C7.72531 8.67188 8.02527 8.97183 8.02527 9.34188C8.02527 9.71192 7.72531 10.0119 7.35527 10.0119L1.32527 10.0119C0.955246 10.0119 0.655273 9.71192 0.655273 9.34188C0.655273 8.97183 0.955246 8.67188 1.32527 8.67188L7.35527 8.67188Z" fill="#161A1D"/>
        <path d="M10.6802 9.34016C10.6802 8.60007 10.0802 8.00016 9.34016 8.00016C8.60007 8.00016 8.00016 8.60007 8.00016 9.34016C8.00016 10.0802 8.60007 10.6802 9.34016 10.6802C10.0802 10.6802 10.6802 10.0802 10.6802 9.34016ZM12.0202 9.34016C12.0202 10.8203 10.8203 12.0202 9.34016 12.0202C7.86006 12.0202 6.66016 10.8203 6.66016 9.34016C6.66016 7.86006 7.86006 6.66016 9.34016 6.66016C10.8203 6.66016 12.0202 7.86006 12.0202 9.34016Z" fill="#161A1D"/>
        <path d="M4.02 2.68C4.02 1.93994 3.42006 1.34 2.68 1.34C1.93994 1.34 1.34 1.93994 1.34 2.68C1.34 3.42006 1.93994 4.02 2.68 4.02C3.42006 4.02 4.02 3.42006 4.02 2.68ZM5.36 2.68C5.36 4.16012 4.16012 5.36 2.68 5.36C1.19988 5.36 0 4.16012 0 2.68C0 1.19988 1.19988 0 2.68 0C4.16012 0 5.36 1.19988 5.36 2.68Z" fill="#161A1D"/>
    </svg>
);

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
        <StyledNestedFilterIconButton
            type="button"
            onClick={handleToggleFilter}
        >
            <FilterCustomIcon />
        </StyledNestedFilterIconButton>
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

function RecordDestructionEdit(props) {
    const { open, onClose, setReloadData, documentId, sharedComponents } = props;
    const { InputComponents: BaseInput, DatePicker: BaseDatePicker } = sharedComponents;
    const { crmSource } = useSelector((state) => state.config);

    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [tempSelectedRecords, setTempSelectedRecords] = useState([]);
    const [tableSelectedRecords, setTableSelectedRecords] = useState([]);
    const [dialogSearchText, setDialogSearchText] = useState("");
    const [openViewRecordManagement, setOpenViewRecordManagement] = useState({ open: false, archiveId: null });
    
    const { control, reset, handleSubmit, formState: { errors } } = useForm({
        defaultValues,
        resolver: yupResolver(recordDestructionSchema),
    });

    const [dialogFromDate, setDialogFromDate] = useState(null);
    const [dialogToDate, setDialogToDate] = useState(null);
    const [appliedSearchText, setAppliedSearchText] = useState("");
    const [appliedFromDate, setAppliedFromDate] = useState(null);
    const [appliedToDate, setAppliedToDate] = useState(null);
    const [isInfoCollapsed, setIsInfoCollapsed] = useState(false);
    const [isRecordsCollapsed, setIsRecordsCollapsed] = useState(false);
    const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
    const [openFilter, setOpenFilter] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [tempSelectedColumns, setTempSelectedColumns] = useState([]);
    const [dataDetail, setDataDetail] = useState({});
    const [dataList, setDataList] = useState([]);
    const toast = useToast();

    const destroyReasonOptions =
        crmSource?.find((item) => item?.code === "destroyReason")?.data || [];

    // Cấu hình Input và DatePicker luôn ở chế độ edit (isView = false)
    const InputComponents = useMemo(() => {
        const Wrapped = withFormWrapper(BaseInput, "input");
        const Component = (props) => (
            <Wrapped 
                {...props} 
                isView={props.isView !== undefined ? props.isView : false}
            />
        );
        Component.displayName = "InputComponents";
        return Component;
    }, [BaseInput]);

    const DatePickerComponent = useMemo(() => {
        const Wrapped = withFormWrapper(BaseDatePicker, "date");
        const Component = (props) => (
            <Wrapped 
                {...props} 
                isView={props.isView !== undefined ? props.isView : false}
            />
        );
        Component.displayName = "DatePickerComponent";
        return Component;
    }, [BaseDatePicker]);

    const fetchDataDetail = useCallback(async () => {
        if (!documentId) return;
        try {
            const response = await axiosInstance.get(`${APP_BASE}/api/destroy-records/${documentId}`);
            setDataDetail(response || {});
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Lỗi không thể tải thông tin bản ghi", "error");
        }
    }, [documentId, toast]);

    useEffect(() => {
        if (open && documentId) {
            fetchDataDetail();
        }
    }, [open, documentId, fetchDataDetail]);

    const textSearchableFields = useMemo(() => {
        return expiredRecordsColumns
            .filter(col => col.row !== 'actions' && col.row !== 'yearCategory' && col.row !== 'retentionPeriod' && col.isFilter !== false)
            .map(col => ({
                code: col.row,
                name: col.label,
            }));
    }, []);

    useEffect(() => {
        const allCodes = textSearchableFields.map(f => f.code);
        setSelectedColumns(allCodes);
        setTempSelectedColumns(allCodes);
    }, [textSearchableFields]);

    useEffect(() => {
        if (isMobile && selectedRecords.length > 0) {
            setIsInfoCollapsed(true);
        }
    }, [isMobile, selectedRecords.length]);

    useEffect(() => {
        if (dataDetail && Object.keys(dataDetail).length > 0) {
            const formData = {
                codeDestruction: dataDetail.destroyBatchCode || '',
                dateDestruction: dataDetail.createdAt ? dayjs(dataDetail.createdAt, 'DD/MM/YYYY') : '',
                nameDestruction: dataDetail.destroyBatchName || '',
                reasonDestruction: dataDetail.destroyReason || '',
            };

            reset(formData);

            if (dataDetail.profileIds && Array.isArray(dataDetail.profileIds)) {
                setSelectedRecords(dataDetail.profileIds);
            }
        }
    }, [dataDetail, reset]);

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

    useEffect(() => {
        const fetchInitialData = async () => {
            if (open && selectedRecords.length > 0) {
                try {
                    await fetchData({});
                } catch (error) {
                    // Tránh crash ứng dụng khi lỗi API ban đầu
                }
            }
        };
        fetchInitialData();
    }, [open, selectedRecords.length, fetchData]);

    const onSubmit = useCallback(async (data) => {
        if (selectedRecords.length === 0) {
            toast("Bạn chưa chọn hồ sơ", "error");
            return;
        }
        const payload = {
            destroyBatchCode: data.codeDestruction,
            dateDestruction: data.dateDestruction ? dayjs(data.dateDestruction).format('DD/MM/YYYY') : null,
            destroyBatchName: data.nameDestruction,
            destroyReason: data.reasonDestruction,
            status: "Trả lại",
            profileIds: selectedRecords.map(id => {
                const record = dataList.find(r => r.id === id);
                return record?.archiveRecordId || id;
            }),
        };
        try {
            const response = await axiosInstance.put(`${APP_BASE}/api/destroy-records/${documentId}`, payload);
            if (response) {
                toast("Cập nhật đợt tiêu hủy thành công", "success");
                setReloadData(new Date() * 1);
                onClose();
            }
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi cập nhật", "error");
        }
    }, [selectedRecords, toast, documentId, dataList, dataDetail, setReloadData, onClose]);

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
        return true;
    }, [dialogSearchText, dialogFromDate, dialogToDate, toast]);

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

    const handleToggleInfoCollapse = useCallback(() => {
        setIsInfoCollapsed(prev => !prev);
    }, []);

    const handleToggleRecordsCollapse = useCallback(() => {
        setIsRecordsCollapsed(prev => !prev);
    }, []);

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

    const handleMoreAction = useCallback((action, row) => {
        if (action.onClick) {
            action.onClick(row?._id || row?.id);
        }
    }, []);

    return (
        <>
            <CustomSwipper
                open={open}
                onClose={onClose}
                title="Chỉnh sửa đợt tiêu hủy hồ sơ"
                type="edit"
                footer={
                    <>
                        <FlexGrowBox />
                        <FooterActions>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <Button variant="outlined" onClick={handleSubmit(onSubmit)}>
                                    LƯU
                                </Button>
                                {/* <Button variant="error" onClick={onClose}>
                                    HỦY BỎ
                                </Button> */}
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
                                        {dataDetail?.status && typeof dataDetail.status === 'string' && dataDetail.status.includes('<') ? (
                                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${dataDetail?.status}</p>`) }} />
                                        ) : (
                                            <StyledStatusChip
                                                label={dataDetail?.status || "Chưa trình"}
                                                status="pending"
                                                size="small"
                                                backgColor='#FEF9C2'
                                                textColor='#FFA600'
                                                bdColor='#FEF9C2'
                                            />
                                        )}
                                    </StyledTitleWithToggle>
                                    <StyledHeaderActions>
                                        {isMobile && (
                                            <StyledCollapseIconButton
                                                isCollapsed={isInfoCollapsed}
                                                onClick={handleToggleInfoCollapse}
                                            >
                                                <KeyboardArrowDownIcon />
                                            </StyledCollapseIconButton>
                                        )}
                                    </StyledHeaderActions>
                                </StyledHeaderWrapper>

                                <Collapse in={!isInfoCollapsed}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={6}>
                                            <Controller
                                                name="codeDestruction"
                                                control={control}
                                                render={({ field }) => (
                                                    <InputComponents
                                                        {...field}
                                                        label="MÃ ĐỢT YÊU CẦU TIÊU HỦY"
                                                        placeholder="Nội dung trường thông tin (Text)"
                                                        required
                                                        disabled
                                                        size="small"
                                                        error={!!errors.codeDestruction}
                                                        helperText={errors.codeDestruction?.message}
                                                    />
                                                )}
                                            />
                                        </Grid>

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
                                                        select
                                                        required
                                                        optionLabel="title"
                                                        optionValue="title"
                                                        error={!!errors.reasonDestruction}
                                                        helperText={errors.reasonDestruction?.message}
                                                    />
                                                )}
                                            />
                                        </Grid>

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
                                            <>
                                                <StyledSelectionButton>
                                                    <Button onClick={handleOpenDialog} startIcon={<SearchIcon />} variant="outlined">
                                                        CHỌN HỒ SƠ TIÊU HỦY
                                                    </Button>
                                                </StyledSelectionButton>
                                                {tableSelectedRecords.length > 0 && (
                                                    <StyledDeleteIconButton onClick={handleDeleteSelectedRecords}>
                                                        <DeleteIcon />
                                                    </StyledDeleteIconButton>
                                                )}
                                            </>
                                        )}
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
                                            <CustomTableProfile
                                                columns={selectedRecordsColumns}
                                                data={dataList?.filter(record =>
                                                    selectedRecords.includes(record.id) || selectedRecords.includes(record.archiveRecordId)
                                                )}
                                                disableCheckbox
                                                selection={tableSelectedRecords}
                                                onSelectionChange={setTableSelectedRecords}
                                                customMaxHeight={isMobile ? 400 : isMobileOrTablet ? 650 : 560}
                                                isMaxHeight={isMobile ? 400 : isMobileOrTablet ? 650 : 560}
                                                fixedHeight={selectedRecords.length > 0}
                                                disableAdd
                                                onlyTable
                                                paginationProps={selectedRecords.length > 0}
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
                                            />
                                        </StyledTableContent>
                                    </StyledTableWrapper>
                                </Collapse>
                            </StyledBlockWrapper>
                        </Grid>

                        {/* Khối 3: THÔNG TIN GỬI NHẬN */}
                        <Grid item xs={12}>
                            <StyledBlockWrapper>
                                <SenderReceiverInfo data={dataDetail?.audit || []} />
                            </StyledBlockWrapper>
                        </Grid>
                    </Grid>
                </FormContainer>
            </CustomSwipper>

            {/* Dialog lựa chọn hồ sơ */}
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

                    <CustomTableProfile
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
        </>
    );
}

RecordDestructionEdit.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    setReloadData: PropTypes.func,
    documentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    sharedComponents: PropTypes.object,
};

RecordDestructionEdit.displayName = "RecordDestructionEdit";

export default withSharedComponents(memo(RecordDestructionEdit));