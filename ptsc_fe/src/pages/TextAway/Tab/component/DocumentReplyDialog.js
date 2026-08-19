import React, { useState, useEffect, useCallback, useRef } from "react";
import { DialogActions, Grid, DialogTitle, InputBase, Box } from "@mui/material";
import { Close as CloseIcon, Search as SearchIcon } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import withSharedComponents from "@components/WrapperComponent";
import CustomTable from "@components/CustomTable/CustomTable";
import {
  CloseButton,
  SearchFormGrid,
  StyledDialog,
  StyledDialogContent,
  DialogHeaderBar,
  DialogHeaderTitle,
  DialogHeaderCloseButton,
  FixedSection,
  PaginationSection,
  TableContainer,
  FixedTypography,
  FixedDropdown,
  FixedFileIcon,
  FixedTypographyColor,
  FixedPopover,
  FixedDropdownBox,
  FixedLink,
} from "./DocumentReplyDialog.style";
import axiosInstance from "@utils/axiosInstance";
import { API_SEARCH_DOCUMENT_REPLY } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
// import { useSelector } from "react-redux";
import {
  CancelButton,
  SaveButton,
} from "@styles/CustomDialog.styles";
import dayjs from "dayjs";
import CustomPagination from "./CustomPagination";

// Styled Components for Search Input
 const SearchInputWrapper = styled(Box)(({ theme }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  // ✅ Màu nền giống ảnh 1 - màu xám đậm
  backgroundColor: theme.palette.mode === "dark" ? "#3d4756" : "#ffffff",
  // ✅ Viền giống với ô input "Đến ngày"
  border: `1px solid ${theme.palette.mode === "dark" ? "#5a6477" : "#ddd"}`,
  borderRadius: "8px",
  padding: "8px 12px",
  transition: "all 0.3s ease",
  "&:hover": {
    // ✅ Hover cũng giữ màu tương tự
    backgroundColor: theme.palette.mode === "dark" ? "#434d5f" : "#f0f0f0",
    borderColor: theme.palette.mode === "dark" ? "#6b7588" : "#bbb",
  },
  "&:focus-within": {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${theme.palette.primary.main}20`,
    backgroundColor: theme.palette.mode === "dark" ? "#3d4756" : "white",
  },
}));

const StyledSearchIcon = styled(SearchIcon)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? "#bbb" : "#666",
  marginRight: "8px",
  fontSize: "20px",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  flex: 1,
  "& .MuiInputBase-input": {
    padding: 0,
    fontSize: "14px",
    color: theme.palette.mode === "dark" ? "#fff" : "#333",
    "&::placeholder": {
      color: theme.palette.mode === "dark" ? "#999" : "#999",
      opacity: 0.8,
    },
  },
}));

// Component hiển thị icon file với dropdown
const FileIconWithDropdown = ({ files, onFileClick }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = (event) => {
    // Xóa timeout cũ nếu có
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setAnchorEl(event.currentTarget);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setAnchorEl(null);
    }, 200); // giảm xuống 200ms cho mượt hơn
  };

  const handlePopoverMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handlePopoverMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setAnchorEl(null);
    }, 100);
  };

  const handleClosePopover = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleFileClick = useCallback((file) => {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      onFileClick(file)();
      setAnchorEl(null);
    };
  }, [onFileClick]);

  const open = Boolean(anchorEl);

  if (!files || files.length === 0) {
    return <FixedTypography>-</FixedTypography>;
  }

  return (
    <FixedDropdown
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <FixedFileIcon/>
      <FixedTypographyColor>
        ({files.length})
      </FixedTypographyColor>

      <FixedPopover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        disableRestoreFocus
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            onMouseEnter: handlePopoverMouseEnter,
            onMouseLeave: handlePopoverMouseLeave,
          },
        }}
      >
        <FixedDropdownBox>
          {files.map((file, index) => (
            <FixedLink
              key={file.fileId || index}
              component="button"
              variant="body2"
              onClick={handleFileClick(file)}
            >
              {file.fileName || `File ${index + 1}`}
            </FixedLink>
          ))}
        </FixedDropdownBox>
      </FixedPopover>
    </FixedDropdown>
  );
};

const DocumentReplyDialog = ({ open, onClose, onSave, sharedComponents, initialSelectedIds = [] }) => {
  const { DatePicker } = sharedComponents;
  const toast = useToast();
  // const { crmSource } = useSelector((state) => state.config);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sort, setSort] = useState({
    orderBy: null, // Bỏ cột mặc định
    order: "desc", // Giữ hướng mặc định hoặc đổi thành 'asc'
  });

  // ---- COLUMN GIỐNG ẢNH ----
  const columns = [
    { name: "Số văn bản", row: "toBook", width: "160px" },
    { name: "Trích yếu", row: "abstractNote", width: "400px" },
    { name: "Đơn vị gửi", row: "sendingUnit", width: "160px" },
    { name: "Ngày VB", row: "documentDate", width: "160px" },
    {
      name: "Tệp đính kèm",
      row: "files",
      width: "120px",
      accessor: (row) => {
        const files = row.files && Array.isArray(row.files) ? row.files : [];
        if (files.length === 0) {
          return null;
        }
        return (
          <FileIconWithDropdown
            files={files}
            // onFileClick={createViewFileHandler}
          />
        );
      },
    },
  ];

  // ---- SEARCH FORM ----
  const [searchParams, setSearchParams] = useState({
    startDate: "",
    endDate: "",
    soVB: "",
    trichYeu: "",
    trangThai: "",
    loaiVB: "",
    donVi: ""
  });

  const handleInputChange = (name) => (eventOrValue) => {
    const value = eventOrValue?.target
      ? eventOrValue.target.value
      : eventOrValue;
    setSearchParams((p) => ({ ...p, [name]: value }));
  };

  // const documentTypeOptions =
  //   crmSource.find((item) => item.code === "S19")?.data || [];

  const [tableData, setTableData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  // Keep the initial selections stable; the default [] prop would otherwise change on every render
  const initialSelectedIdsRef = useRef(initialSelectedIds || []);

  useEffect(() => {
    initialSelectedIdsRef.current = initialSelectedIds || [];
  }, [initialSelectedIds]);

  useEffect(() => {
    if (open) {
      setSelectedRows(initialSelectedIdsRef.current);
    }
  }, [open]);

  useEffect(() => {
    setPage(1); // Reset về trang 1 mỗi khi search thay đổi
  }, [searchParams]);

  const handleSort = useCallback((newSort) => {
    // console.log("Đã click vào icon sort, giá trị sắp xếp mới là:", newSort);
    setSort(newSort);
    setPage(1); // Reset về trang 1 khi sắp xếp
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const filter = {
        abstractNote: searchParams.donVi || undefined,
        toBook: searchParams.donVi || undefined,
        status: searchParams.trangThai || undefined,
        documentType: searchParams.loaiVB || undefined,
      };
      // Thay đổi cách gửi tham số ngày để phù hợp với yêu cầu backend
      if (searchParams.startDate || searchParams.endDate) {
        filter.documentDate = {};
        if (searchParams.startDate) {
          filter.documentDate.startDate = dayjs(searchParams.startDate).format(
            "YYYY-MM-DD"
          );
        }
        if (searchParams.endDate) {
          filter.documentDate.endDate = dayjs(searchParams.endDate).format(
            "YYYY-MM-DD"
          );
        }
      }
      const params = {
        page: page,
        limit: rowsPerPage,
        processFn: "phucdap",
        filter: Object.fromEntries(
          Object.entries(filter).filter(([, v]) => v !== undefined && v !== "")
        ),
      };
      // Thêm tham số sort vào API
      if (sort.orderBy) {
        const sortKey = `sort[${sort.orderBy}]`;
        params[sortKey] = sort.order === "desc" ? -1 : 1; // -1 cho giảm dần, 1 cho tăng dần
      }
      const response = await axiosInstance.get(API_SEARCH_DOCUMENT_REPLY, {
        params,
      });
      if (response && Array.isArray(response.items)) {
        const formattedData = response.items.map((item) => ({
          ...item,
          id: item.documentId || item.document_id, // Gán id cho table selection
        }));
        setTableData(formattedData);
        setTotal(response.total || response.items.length);
      } else {
        setTableData([]);
        setTotal(0);
      }
    } catch (error) {
      toast("Lỗi khi tải dữ liệu phúc đáp văn bản!", "error");
      setTableData([]);
      setTotal(0);
    }
  }, [searchParams, page, rowsPerPage, toast, sort]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  const handleSave = () => {
    const selected = tableData.filter((i) => selectedRows.includes(i.id));
    if (onSave) {
      onSave(selected); // Gọi callback onSave và truyền dữ liệu đã chọn
    }
    onClose();
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setPage(1); // Reset to first page
  };

  // ---- OPTIONS ----
  // const trangThaiList = [
  //   { label: "Đã xử lý", value: "done" },
  //   { label: "Đang xử lý", value: "processing" },
  // ];

  // const loaiVBList = [
  //   { label: "Công văn đến", value: "den" },
  //   { label: "Công văn đi", value: "di" },
  // ];

  return (
    <StyledDialog open={open} onClose={onClose}>
      <DialogTitle>
        TÌM KIẾM PHÚC ĐÁP VĂN BẢN
        <CloseButton onClick={onClose}>
          <CloseIcon />
        </CloseButton>
      </DialogTitle>

      {/* Thay đổi DialogContent để sử dụng flexbox */}
      <DialogHeaderBar>
        <DialogHeaderTitle>TÌM KIẾM PHÚC ĐÁP VĂN BẢN</DialogHeaderTitle>
        <DialogHeaderCloseButton onClick={onClose} aria-label="Đóng">
          <CloseIcon />
        </DialogHeaderCloseButton>
      </DialogHeaderBar>
      <StyledDialogContent dividers>
        {/* Phần tìm kiếm không cuộn */}
        <FixedSection>
          <SearchFormGrid container spacing={2}>
            {/* Ngày bắt đầu */}

            {/* Số văn bản - Trích yếu */}
            <Grid item xs={12}>
              <SearchInputWrapper>
                <StyledSearchIcon />
                <StyledInputBase
                  placeholder="Tìm kiếm số văn bản, trích yếu..."
                  value={searchParams.donVi}
                  onChange={handleInputChange("donVi")}
                  fullWidth
                />
              </SearchInputWrapper>
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Ngày nhận VB-Từ ngày"
                placeholder="DD/MM/YYYY"
                value={searchParams.startDate}
                onChange={handleInputChange("startDate")}
              />
            </Grid>

            {/* Ngày kết thúc */}
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Đến ngày"
                placeholder="DD/MM/YYYY"
                value={searchParams.endDate}
                onChange={handleInputChange("endDate")}
              />
            </Grid>

            {/* Trạng thái
          <Grid item xs={12} sm={4}>
            <Input
              select
              label="Trạng thái"
              value={searchParams.trangThai}
              onChange={handleSelectChange("trangThai")}
              options={trangThaiList}
            />
          </Grid> */}

            {/* Loại văn bản */}
            {/* <Grid item xs={12} sm={4}>
              <InputComponents
                select
                label="Loại văn bản"
                value={searchParams.loaiVB}
                onChange={handleInputChange("loaiVB")}
                options={documentTypeOptions}
                customLabel="title"
                customValue="value"
              />
            </Grid> */}
          </SearchFormGrid>
        </FixedSection>

        {/* Phần bảng có thể cuộn */}
        <TableContainer>
          <CustomTable
            columns={columns}
            data={tableData}
            disableAct
            disablePagination
            selection={selectedRows}
            onSelectionChange={setSelectedRows}
            onlyTable
            onOrder={handleSort} // Prop để xử lý sort
            defaultSort={{ orderBy: sort.orderBy, order: sort.order }} // Prop để truyền trạng thái sort
            stickyHeader
            autoHeight
            disablePaperHeight
            isInsideDialog
						encodeHtml
          />
        </TableContainer>
        {/* Pagination nằm ngoài vùng cuộn */}
        <PaginationSection>
          <CustomPagination
            total={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
						onRowsPerPageChange={handleRowsPerPageChange}
						styleJustifyContent
          />
        </PaginationSection>
      </StyledDialogContent>

      <DialogActions>
        <SaveButton onClick={handleSave}>Lưu</SaveButton>
        <CancelButton onClick={onClose}>Đóng</CancelButton>
      </DialogActions>
    </StyledDialog>
  );
};

export default withSharedComponents(DocumentReplyDialog);
