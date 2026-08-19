import React, { memo, useState, useCallback, useEffect } from "react";
import { Grid, Checkbox, FormControlLabel, useMediaQuery } from "@mui/material";
import TuneIcon from '@mui/icons-material/Tune';
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
    StyledFilterIconButton,
    SearchFilterBox,
    FilterTitle,
    FilterCheckboxAll,
    FilterCheckboxGrid,
    FilterActionsBox,
    FilterCancelButton,
    FilterApplyButton,
    FilterButtonWrapper,
    StyledDialogSearchWrapper,
    StyledSearchInputWrapper,
    StyledSearchIconButton,
    SearchContainer,
    SearchTitle,
    SearchTitleActions,

    SearchDropdownWrapper,
    SearchDropdownMenu,
    SearchDropdownMenuItem,
    SearchBarWrapper,
    SearchButtonWrapper,
    WarningContainer,
    WarningIconBox,
    WarningTitle,
    WarningMessage,
    WarningSecondaryMessage,
} from "@styles/DocumentStatisticsSearch/DocumentStatisticsSearch.styled";
import Input from '@components/CustomInput/CustomInputBase'
import DatePicker from '@components/CustomDatePicker'
import AsyncAutoComplete from '@components/CustomAsyncAutoCompletes'
import Button from '@components/CustomButton'
import { tableData, TEXT_SEARCHABLE_FIELDS } from "./constant";
import { Download, WarningAmber } from "@mui/icons-material";
import TableDocumentStatic from "./TableDocumentStatic";
import { API_GET_LIST_UNIT, API_SO_VANBANDEN_V2, APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import { useDispatch, useSelector } from "react-redux";
import {
    getDataListUnit,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { fetchDhvbConfig } from "@redux/slices/configSlice";
import CustomInput from "@components/CustomInput/CustomInput";
import axiosInstance from "@utils/axiosInstance";

// Mock load options function - để tránh duplicate code
const mockLoadOptions = async () => {
    return [];
};

function DocumentStatisticsSearch() {

    const { listUnit } = useSelector((state) => state.unit);
    const { crmSource } = useSelector((state) => state.config);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(false);
    const [openFilter, setOpenFilter] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [tempSelectedColumns, setTempSelectedColumns] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [replyDeadline, setReplyDeadline] = useState(null);
    const [solutionDeadline, setSolutionDeadline] = useState(null);
    const [arrivalDate, setArrivalDate] = useState(null);
    const [senderUnit, setSenderUnit] = useState(null);
    const [receiverUnit, setReceiverUnit] = useState(null);
    const [documentType, setDocumentType] = useState(null);
    const [documentNumber, setDocumentNumber] = useState('');
    const [receiveMethod, setReceiveMethod] = useState(null);
    const [mainHandler, setMainHandler] = useState(null);
    const [processed, setProcessed] = useState(null);
    const [creator, setCreator] = useState(null);
    const [field, setField] = useState(null);

    const [urgency, setUrgency] = useState(null);
    const [stage, setStage] = useState(null);
    const [bookDocumentOptions, setBookDocumentOptions] = useState([]);
    const isSmallScreen = useMediaQuery('(max-width:900px)');
    const dispatch = useDispatch();


    const methodOptions =
        crmSource.find((item) => item.code === "S27")?.data || [];

    const fieldOptions =
        crmSource.find((item) => item.code === "S40")?.data || [];

    const urgencyOptions =
        crmSource.find((item) => item.code === "S20")?.data || [];
    const documentTypeOptions =
        crmSource.find((item) => item.code === "S19")?.data || [];
    const stageOptions =
        crmSource.find((item) => item.code === "giaiDoan")?.data || [];

    useEffect(() => {
        dispatch(getDataListUnit({ page: 1, limit: 9999 }));
        dispatch(fetchDhvbConfig());

        const fetchBookDocuments = async () => {
            try {
                const result = await axiosInstance.get(API_SO_VANBANDEN_V2, {
                    params: {
                        'type_document': "IncommingDocument",
                        processFn: "SoVBden",
                    },
                });
                // console.log("Danh sách sổ văn bản đến:", result);
                const options = result?.data?.items || [];
                // console.log("options:", options);
                setBookDocumentOptions(options);
                // if (!isView && options.length > 0 && setValue) {
                //   setValue("bookDocumentId", options[0].bookDocumentId);
                // }
            } catch (error) {
                logger.error("Lỗi khi tải danh sách sổ văn bản:", error);
            }
        };
        fetchBookDocuments();
    }, [dispatch]);


    // Filter handlers
    const handleToggleFilter = useCallback(() => {
        setOpenFilter((prev) => !prev);
        setTempSelectedColumns(selectedColumns);
    }, [selectedColumns]);

    const handleCloseFilter = useCallback(() => {
        setOpenFilter(false);
        setTempSelectedColumns(selectedColumns);
    }, [selectedColumns]);

    const handleSelectAllColumnsChange = useCallback((event) => {
        if (event.target.checked) {
            const allCodes = TEXT_SEARCHABLE_FIELDS.map((f) => f.code);
            setTempSelectedColumns(allCodes);
        } else {
            setTempSelectedColumns([]);
        }
    }, []);

    const handleColumnToggle = useCallback((code) => {
        return () => {
            setTempSelectedColumns((prev) => {
                if (prev.includes(code)) {
                    return prev.filter((col) => col !== code);
                }
                return [...prev, code];
            });
        };
    }, []);

    const handleApplyFilterClick = useCallback(() => {
        setSelectedColumns(tempSelectedColumns);
        setOpenFilter(false);
    }, [tempSelectedColumns]);

    const handleSearch = useCallback(async () => {
        // Xử lý tìm kiếm ở đây
        const allParams = {
            searchText,
            selectedColumns,
            fromDate,
            toDate,
            replyDeadline,
            solutionDeadline,
            arrivalDate,
            senderUnit,
            receiverUnit,
            documentType,
            documentNumber,
            receiveMethod,
            mainHandler,
            processed,
            creator,
            field,
            urgency,
            stage,
        };

        // Chỉ gửi các trường có dữ liệu (loại bỏ null, undefined, '', và mảng rỗng)
        const searchParams = Object.entries(allParams).reduce((acc, [key, value]) => {
            if (value !== null && value !== undefined && value !== '' &&
                !(Array.isArray(value) && value.length === 0)) {
                acc[key] = value;
            }
            return acc;
        }, {});

        logger.log('Searching with:', searchParams);
        // API tra cứu thống kê văn bản đến (thay vì organization-units)
        // const result = await axiosInstance.get(`${APP_BASE}/api/documentStatistics`, {
        //     params: searchParams,
        // });
        



    }, [
        searchText,
        selectedColumns,
        fromDate,
        toDate,
        replyDeadline,
        solutionDeadline,
        arrivalDate,
        senderUnit,
        receiverUnit,
        documentType,
        documentNumber,
        receiveMethod,
        mainHandler,
        processed,
        creator,
        field,
        urgency,
        stage,
    ]);

    // Input change handlers
    const handleSearchTextChange = useCallback((e) => {
        setSearchText(e.target.value);
    }, []);

    const handleDocumentNumberChange = useCallback((e) => {
        setDocumentNumber(e.target.value);
    }, []);

    // DatePicker change handlers
    const handleFromDateChange = useCallback((newValue) => {
        setFromDate(newValue);
    }, []);

    const handleToDateChange = useCallback((newValue) => {
        setToDate(newValue);
    }, []);

    const handleReplyDeadlineChange = useCallback((newValue) => {
        setReplyDeadline(newValue);
    }, []);

    const handleSolutionDeadlineChange = useCallback((newValue) => {
        setSolutionDeadline(newValue);
    }, []);

    const handleArrivalDateChange = useCallback((newValue) => {
        setArrivalDate(newValue);
    }, []);

    // AsyncAutoComplete change handlers
    const handleSenderUnitChange = useCallback((newValue) => {
        setSenderUnit(newValue);
    }, []);

    const handleReceiverUnitChange = useCallback((value) => {
        setReceiverUnit(value);
    }, []);

    const handleDocumentTypeChange = useCallback((value) => {
        setDocumentType(value);
    }, []);

    const handleReceiveMethodChange = useCallback((newValue) => {
        setReceiveMethod(newValue);
    }, []);

    const handleMainHandlerChange = useCallback((newValue) => {
        setMainHandler(newValue);
    }, []);

    const handleProcessedChange = useCallback((newValue) => {
        setProcessed(newValue);
    }, []);

    const handleCreatorChange = useCallback((newValue) => {
        setCreator(newValue);
    }, []);

    const handleFieldChange = useCallback((newValue) => {
        setField(newValue);
    }, []);

    const handleUrgencyChange = useCallback((newValue) => {
        setUrgency(newValue);
    }, []);

    const handleStageChange = useCallback((newValue) => {
        setStage(newValue);
    }, []);

    // Collapse/expand handlers
    const handleToggleCollapse = useCallback(() => {
        setIsCollapsed((prev) => !prev);
    }, []);

    // Dropdown menu handlers
    const handleToggleDropdown = useCallback(() => {
        setOpenDropdown((prev) => !prev);
    }, []);

    const handleCloseDropdown = useCallback(() => {
        setOpenDropdown(false);
    }, []);

    const handleExportExcel = useCallback(() => {
        // Xử lý xuất Excel ở đây
        logger.log('Exporting to Excel...');
        setOpenDropdown(false);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdown) {
                // Check if click is outside dropdown
                const dropdown = event.target.closest('[data-dropdown-wrapper]');
                if (!dropdown) {
                    handleCloseDropdown();
                }
            }
        };

        if (openDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openDropdown, handleCloseDropdown]);

    return (
        <>

            {isSmallScreen ? 
                <WarningContainer>
                    <WarningIconBox>
                        <WarningAmber />
                    </WarningIconBox>
                    <WarningTitle variant="h5">
                        Thông báo
                    </WarningTitle>
                    <WarningMessage variant="body1">
                        Giao diện hiện không hỗ trợ trên thiết bị di động và màn hình máy tính bảng
                    </WarningMessage>
                    <WarningSecondaryMessage variant="body2">
                        Vui lòng sử dụng máy tính để xem nội dung này
                    </WarningSecondaryMessage>
                </WarningContainer>
                :
                <>
                    <SearchContainer>
                        {/* Tiêu đề và nút collapse/expand khi collapsed */}
                        <SearchTitle isCollapsed={isCollapsed}>
                            TRA CỨU THỐNG KÊ
                            {isCollapsed && (
                                <SearchTitleActions>
                                    {/* Nút collapse/expand - chỉ hiển thị khi collapsed */}
                                    <Button onClick={handleToggleCollapse}>
                                        <KeyboardArrowDownIcon />
                                    </Button>
                                </SearchTitleActions>
                            )}
                        </SearchTitle>

                        {/* Search bar và form - chỉ hiển thị khi không collapsed */}
                        {!isCollapsed && (
                            <>
                                {/* Search bar với filter */}
                                <SearchBarWrapper>
                                    <StyledDialogSearchWrapper>
                                        <StyledSearchInputWrapper>
                                            <Input
                                                placeholder="Tìm kiếm..."
                                                value={searchText}
                                                onChange={handleSearchTextChange}
                                                noBorderRadius
                                            />
                                        </StyledSearchInputWrapper>
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
                                                                    checked={tempSelectedColumns.length === TEXT_SEARCHABLE_FIELDS.length}
                                                                    indeterminate={
                                                                        tempSelectedColumns.length > 0 &&
                                                                        tempSelectedColumns.length < TEXT_SEARCHABLE_FIELDS.length
                                                                    }
                                                                    onChange={handleSelectAllColumnsChange}
                                                                    size="small"
                                                                />
                                                            }
                                                            label="Tất cả"
                                                        />
                                                    </FilterCheckboxAll>

                                                    <FilterCheckboxGrid>
                                                        {TEXT_SEARCHABLE_FIELDS?.map((column) => (
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
                                        <StyledSearchIconButton onClick={handleSearch}>
                                            <SearchOutlinedIcon />
                                        </StyledSearchIconButton>
                                    </StyledDialogSearchWrapper>
                                </SearchBarWrapper>

                                {/* Form fields - Grid layout */}
                                <Grid container spacing={2}>
                                    {/* Row 1 */}
                                    <Grid item xs={12} sm={6} md={3}>
                                        <DatePicker
                                            label="Từ ngày nhận VB"
                                            value={fromDate}
                                            onChange={handleFromDateChange}
                                            slotProps={{
                                                textField: {
                                                    size: 'small',
                                                    fullWidth: true,
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <DatePicker
                                            label="Đến ngày nhập VB"
                                            value={toDate}
                                            onChange={handleToDateChange}
                                            slotProps={{
                                                textField: {
                                                    size: 'small',
                                                    fullWidth: true,
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <DatePicker
                                            label="Hạn trả lời"
                                            value={replyDeadline}
                                            onChange={handleReplyDeadlineChange}
                                            slotProps={{
                                                textField: {
                                                    size: 'small',
                                                    fullWidth: true,
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <DatePicker
                                            label="Hạn giải quyết văn đơn"
                                            value={solutionDeadline}
                                            onChange={handleSolutionDeadlineChange}
                                            slotProps={{
                                                textField: {
                                                    size: 'small',
                                                    fullWidth: true,
                                                },
                                            }}
                                        />
                                    </Grid>

                                    {/* Row 2 */}
                                    <Grid item xs={12} sm={6} md={3}>
                                        <DatePicker
                                            label="Ngày đến"
                                            value={arrivalDate}
                                            onChange={handleArrivalDateChange}
                                            slotProps={{
                                                textField: {
                                                    size: 'small',
                                                    fullWidth: true,
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <AsyncAutoComplete
                                            label="Đơn vị gửi"
                                            placeholder="Chọn đơn vị gửi"
                                            {...field}
                                            // Kiểm tra field.value trước khi truy cập _id
                                            value={senderUnit}
                                            url={API_GET_LIST_UNIT}
                                            queryParam="name"
                                            optionLabel="name"
                                            optionValue="_id"
                                            onChange={handleSenderUnitChange}
                                            returnObject={false}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <CustomInput
                                            select
                                            label="Đơn vị nhận"
                                            options={listUnit}
                                            customLabel="name"
                                            customValue="_id"
                                            placeholder="Chọn đơn vị nhận"

                                            value={receiverUnit}
                                            onChange={handleReceiverUnitChange}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <CustomInput
                                            label="Loại văn bản"
                                            select
                                            value={documentType}
                                            onChange={handleDocumentTypeChange}
                                            placeholder="Chọn loại văn bản"
                                            options={documentTypeOptions}
                                            customLabel="title"
                                            customValue="value"

                                        />
                                    </Grid>

                                    {/* Row 3 */}
                                    <Grid item xs={12} sm={6} md={3}>
                                        <CustomInput
                                            select
                                            label="Sổ văn bản"
                                            placeholder="Chọn sổ văn bản"
                                            options={bookDocumentOptions}
                                            value={documentNumber}
                                            onChange={handleDocumentNumberChange}
                                            size="small"
                                            fullWidth
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <CustomInput
                                            select
                                            label="Phương thức nhận"
                                            placeholder="Chọn phương thức nhận"
                                            options={methodOptions}
                                            customLabel="title"
                                            customValue="value"
                                            value={receiveMethod}
                                            onChange={handleReceiveMethodChange}
                                            size="small"
                                            loadOptions={mockLoadOptions}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <AsyncAutoComplete
                                            label="Chưa xử lý"
                                            placeholder="Chọn người chưa xử lý"
                                            url={`${APP_BASE}/api/users/all`}
                                            queryParam="name"
                                            optionLabel="name"
                                            optionValue="_id"
                                            value={mainHandler}
                                            onChange={handleMainHandlerChange}
                                            size="small"
                                            loadOptions={mockLoadOptions}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <AsyncAutoComplete
                                            label="Đã xử lý"
                                            placeholder="Chọn người xử lý"
                                            url={`${APP_BASE}/api/users/all`}
                                            queryParam="name"
                                            optionLabel="name"
                                            optionValue="_id"
                                            value={processed}
                                            onChange={handleProcessedChange}
                                            size="small"
                                            loadOptions={mockLoadOptions}
                                        />
                                    </Grid>

                                    {/* Row 4 */}
                                    <Grid item xs={12} sm={6} md={3}>
                                        <AsyncAutoComplete
                                            label="Người tạo"
                                            placeholder="Chọn người tạo"
                                            url={`${APP_BASE}/api/users/all`}
                                            queryParam="name"
                                            optionLabel="name"
                                            optionValue="_id"
                                            value={creator}
                                            onChange={handleCreatorChange}
                                            size="small"
                                            loadOptions={mockLoadOptions}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <CustomInput
                                            select
                                            label="Lĩnh vực"
                                            placeholder="Chọn lĩnh vực"
                                            value={field}
                                            options={fieldOptions}
                                            customLabel="title"
                                            customValue="value"
                                            onChange={handleFieldChange}
                                            size="small"
                                            loadOptions={mockLoadOptions}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <CustomInput
                                            select
                                            label="Độ khẩn"
                                            options={urgencyOptions}
                                            customLabel="title"
                                            customValue="value"
                                            placeholder="Chọn độ khẩn"
                                            value={urgency}
                                            onChange={handleUrgencyChange}
                                            size="small"
                                            loadOptions={mockLoadOptions}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <CustomInput
                                            select
                                            label="Giai đoạn"
                                            options={stageOptions}
                                            customLabel="title"
                                            customValue="value"
                                            placeholder="Chọn giai đoạn"
                                            value={stage}
                                            onChange={handleStageChange}
                                            size="small"
                                            loadOptions={mockLoadOptions}
                                        />
                                    </Grid>
                                </Grid>

                                {/* Button Tra cứu và Action buttons - cùng 1 hàng */}
                                <SearchButtonWrapper>
                                    <Button onClick={handleSearch}>
                                        Tra cứu
                                    </Button>

                                    {/* Action buttons */}
                                    <SearchTitleActions>

                                        {/* Nút dropdown menu */}
                                        <SearchDropdownWrapper data-dropdown-wrapper="true">
                                            <Button onClick={handleToggleDropdown}>
                                                <Download />
                                            </Button>
                                            {openDropdown && (
                                                <SearchDropdownMenu>
                                                    <SearchDropdownMenuItem onClick={handleExportExcel}>
                                                        Xuất Excel
                                                    </SearchDropdownMenuItem>
                                                </SearchDropdownMenu>
                                            )}
                                        </SearchDropdownWrapper>

                                        {/* Nút collapse/expand - chỉ hiển thị khi expanded (vị trí 1) */}
                                        <Button onClick={handleToggleCollapse}>
                                            <KeyboardArrowUpIcon />
                                        </Button>
                                    </SearchTitleActions>
                                </SearchButtonWrapper>
                            </>
                        )}



                    </SearchContainer>
                    <TableDocumentStatic tableData={tableData} />
                </>}
        </>

    )
}

DocumentStatisticsSearch.displayName = "DocumentStatisticsSearch";

export default memo(DocumentStatisticsSearch);

