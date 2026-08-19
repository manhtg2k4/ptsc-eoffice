import React, { useState, useEffect, useCallback, useRef } from "react";
import { Close as CloseIcon, Search as SearchIcon } from "@mui/icons-material";
import { DialogActions, Grid, DialogTitle, InputBase, Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import withSharedComponents from "@components/WrapperComponent";
import { FileViewerDialog } from "@components/CustomDialog";
import dayjs from "dayjs";
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
  TableContainer,
    PaginationSection,
    FixedTypography,
    FixedDropdown,
    FixedFileIcon,
    FixedTypographyColor,
    FixedPopover,
    FixedDropdownBox,
    FixedLink,
  } from "./DocumentReplyDialog.style";
  // import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
  import {
    CancelButton,
    SaveButton,
  } from "@styles/CustomDialog.styles";
  import axiosInstance from "@utils/axiosInstance";
  import {
    API_REPLACE_INCOMING_DOCUMENT,
    API_VIEW_FILE,
  } from "@EnvironmentFile/constants/urlConfig";
  import { useToast } from "@components/common/ToastProvider";
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
  const DocumentRevocation = ({
    open,
    onClose,
    onSave,
    sharedComponents,
    initialSelectedIds = [], // Thêm prop mới với giá trị mặc định là mảng rỗng
    bpmnVersion, // Truyền bpmnVersion để lọc VB cùng luồng quy trình
  }) => {
    const { DatePicker } = sharedComponents;
    const toast = useToast();
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sort, setSort] = useState({
      orderBy: null,
      order: "desc",
    });
    const [viewingFile, setViewingFile] = useState({
      open: false,
      url: null,
      name: "",
      type: null,
    });

    const createViewFileHandler = useCallback(
      (file) => async () => {
        if (!file || !file.fileId) {
          toast("File không hợp lệ hoặc không có ID.", "warning");
          return;
        }
        try {
          const response = await axiosInstance.get(
            `${API_VIEW_FILE}/${file.fileId}`,
            { responseType: "blob" }
          );
          const blob = response;
          const objectUrl = URL.createObjectURL(blob);

          const fileExtension = file.fileName?.split(".").pop().toLowerCase();
          let fileType = null;
          if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
            fileType = "image";
          } else if (fileExtension === "pdf") {
            fileType = "pdf";
          }

          setViewingFile({
            open: true,
            url: objectUrl,
            name: file.fileName,
            type: fileType,
          });
        } catch (error) {
          toast("Không thể tải file để xem trước.", "error");
        }
      },
      [toast]
    );

    const handleCloseFileViewer = useCallback(() => {
      if (viewingFile.url) {
        URL.revokeObjectURL(viewingFile.url);
      }
      setViewingFile({ open: false, url: null, name: "", type: null });
    }, [viewingFile.url]);

    // ---- COLUMN GIỐNG ẢNH ----
    const columns = [
  {
    name: "Số, Ký hiệu văn bản",
    row: "toBookTextSymbols",
    width: "200px",
  },
  { 
    name: "Trích yếu", 
    row: "abstractNote", 
    width: "360px" 
  },
  { 
    name: "Ngày ban hành", 
    row: "releaseDate", 
    width: "160px" 
  },
  { 
    name: "Loại văn bản", 
    row: "documentField", 
    width: "160px" 
  },
  { 
    name: "Người ký dự thảo", 
    row: "draftSigner", 
    width: "160px" 
  },
  {
    name: "File dự thảo",
    row: "files",
    width: "200px",
    accessor: (row) => {
      const files = row.files && Array.isArray(row.files) ? row.files : [];
      if (files.length === 0) {
        return null;
      }
      return (
        <FileIconWithDropdown
          files={files}
          onFileClick={createViewFileHandler}
        />
      );
    },
  }
];

    // ---- SEARCH FORM ----
    const [searchParams, setSearchParams] = useState({
      startDate: dayjs().subtract(6, "month"),
      endDate: dayjs(),
      soVB: "",
      trichYeu: "",
      trangThai: "",
      loaiVB: "",
      donVi: "",
    });

    const handleInputChange = (name) => (eventOrValue) => {
      const value = eventOrValue?.target
        ? eventOrValue.target.value
        : eventOrValue;
      setSearchParams((p) => ({ ...p, [name]: value }));
    };

    // const handleDateRangeChange = useCallback((dates) => {
    //   setSearchParams((p) => ({
    //     ...p,
    //     startDate: dates?.[0] || "",
    //     endDate: dates?.[1] || "",
    //   }));
    // }, []); // setSearchParams is stable, so dependency array can be empty

    const [tableData, setTableData] = useState([]);
    const [selectedRows, setSelectedRows] = useState(initialSelectedIds); // Khởi tạo state với các ID đã chọn

    // Cập nhật selectedRows khi initialSelectedIds thay đổi (khi dialog được mở lại)
    useEffect(() => {
      if (open) {
        setSelectedRows(initialSelectedIds);
      }
    }, [open, initialSelectedIds]);

    // Handler để chỉ cho phép chọn 1 văn bản
    const handleSelectionChange = useCallback((newSelectedRows) => {
      // Chỉ cho phép tối đa 1 hàng được chọn
      if (newSelectedRows.length > 1) {
        // Nếu đang chọn thêm, giữ lại chỉ hàng vừa chọn mới nhất
        const lastSelected = newSelectedRows[newSelectedRows.length - 1];
        setSelectedRows([lastSelected]);
        toast("Chỉ được chọn 1 văn bản", "info");
      } else {
        setSelectedRows(newSelectedRows);
      }
    }, [toast]);

    useEffect(() => {
      setPage(1); // Reset về trang 1 mỗi khi search thay đổi
    }, [searchParams]);

    const handleSort = useCallback((newSort) => {
      setSort(newSort);
      setPage(1); // Reset về trang 1 khi sắp xếp
    }, []);

    const formatDate = (dateString) => {
      if (!dateString) return "";
      return dayjs(dateString).format("YYYY-MM-DD");
    };

    const fetchData = useCallback(async () => {
      try {
        const filter = {
          releaseNo: searchParams.donVi || undefined,
          abstractNote: searchParams.donVi || undefined,
          status: searchParams.trangThai || undefined,
          documentType: searchParams.loaiVB || undefined,
        };
        if (searchParams.startDate || searchParams.endDate) {
          filter["release_date"] = {};
          if (searchParams.startDate)
            filter.release_date.startDate = formatDate(searchParams.startDate);
          if (searchParams.endDate)
            filter.release_date.endDate = formatDate(searchParams.endDate);
        }
        const params = {
          page: page,
          limit: rowsPerPage,
          filter: Object.fromEntries(
            Object.entries(filter).filter(
              ([, v]) =>
                v !== undefined &&
                v !== "" &&
                (typeof v !== "object" || Object.keys(v).length > 0)
            )
          ),
          ...(bpmnVersion ? { bpmnVersion } : {}), // Thêm
        };
        if (sort.orderBy) {
          const sortKey = `sort[${sort.orderBy}]`;
          params[sortKey] = sort.order === "desc" ? -1 : 1;
        }
        const response = await axiosInstance.get(API_REPLACE_INCOMING_DOCUMENT, {
          params,
        });
        if (response && Array.isArray(response.items)) {
          const formattedData = response.items.map((item) => ({
            ...item,
            id: item.documentId || item.document_id, // Đảm bảo mỗi hàng có trường id
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
    }, [searchParams, page, rowsPerPage, toast, sort, bpmnVersion]);

    useEffect(() => {
      if (open) {
        fetchData();
      }
    }, [open, fetchData]);

    const handleClose = useCallback(() => {
      if (viewingFile.url) {
        URL.revokeObjectURL(viewingFile.url);
      }
      setViewingFile({ open: false, url: null, name: "", type: null });
      setSearchParams({
        startDate: dayjs().subtract(6, "month"),
        endDate: dayjs(),
        soVB: "",
        trichYeu: "",
        trangThai: "",
        loaiVB: "",
        donVi: "",
      });
      setSelectedRows([]);
      setTableData([]);
      setTotal(0);
      setPage(1);
      setSort({
        orderBy: null,
        order: "desc",
      });
      if (onClose) {
        onClose();
      }
    }, [onClose, viewingFile.url]);

    const handleSave = () => {
      const selected = tableData.filter((i) => selectedRows.includes(i.id));
      if (onSave) {
        onSave(selected); // Gọi callback onSave và truyền dữ liệu đã chọn
      }
      handleClose();
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
      <StyledDialog open={open} onClose={handleClose}>
        <DialogTitle>
          TÌM KIẾM VĂN BẢN ĐÃ BAN HÀNH
          <CloseButton onClick={handleClose}>
            <CloseIcon />
          </CloseButton>
        </DialogTitle>

        <DialogHeaderBar>
          <DialogHeaderTitle>TÌM KIẾM VĂN BẢN ĐÃ BAN HÀNH</DialogHeaderTitle>
          <DialogHeaderCloseButton onClick={handleClose} aria-label="Đóng">
            <CloseIcon />
          </DialogHeaderCloseButton>
        </DialogHeaderBar>
        <StyledDialogContent dividers>
          <FixedSection>
            <SearchFormGrid container spacing={2}>
              {/* Số văn bản */}
              {/* <Grid item xs={12} sm={4}>
                <InputComponents
                  label="Số ký hiệu văn bản"
                  placeholder="Nhập số ký hiệu văn bản"
                  value={searchParams.soVB}
                  onChange={handleInputChange("soVB")}
                />
              </Grid> */}

              {/* Trích yếu */}
              {/* <Grid item xs={12} sm={4}>
                <InputComponents
                  label="Trích yếu"
                  placeholder="Nhập trích yếu"
                  value={searchParams.trichYeu}
                  onChange={handleInputChange("trichYeu")}
                />
              </Grid> */}
              {/* Ngày kết thúc */}
              {/* <Grid item xs={12} sm={4}>
                <CustomDateRangePicker
                  label="Ngày ban hành"
                  value={[searchParams.startDate, searchParams.endDate]}
                  onChange={handleDateRangeChange}
                />
              </Grid> */}

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

            {/* Từ ngày */}
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Ngày phát hành-Từ ngày"
                placeholder="DD/MM/YYYY"
                value={searchParams.startDate}
                onChange={handleInputChange("startDate")}
              />
            </Grid>

            {/* Đến ngày */}
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Đến ngày"
                placeholder="DD/MM/YYYY"
                value={searchParams.endDate}
                onChange={handleInputChange("endDate")}
              />
            </Grid>
              
            </SearchFormGrid>
          </FixedSection>

          <TableContainer>
            <CustomTable
              rowKey="id"
              columns={columns}
              data={tableData}
              disableAct
              disablePagination
              selection={selectedRows}
              onSelectionChange={handleSelectionChange}
              onlyTable
              onOrder={handleSort}
              defaultSort={{ orderBy: sort.orderBy, order: sort.order }}
              stickyHeader
              disableSelectAll
              autoHeight
              disablePaperHeight
              isInsideDialog
							// encodeHtml
            />
          </TableContainer>

          <PaginationSection>
            <CustomPagination
              total={total}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </PaginationSection>
        </StyledDialogContent>

        <DialogActions>
          <SaveButton onClick={handleSave}>Lưu</SaveButton>
          <CancelButton onClick={handleClose}>Đóng</CancelButton>
        </DialogActions>

        <FileViewerDialog
          open={viewingFile.open}
          onClose={handleCloseFileViewer}
          fileUrl={viewingFile.url}
          fileName={viewingFile.name}
          fileType={viewingFile.type}
          title={`Xem file: ${viewingFile.name}`}
        />
      </StyledDialog>
    );
  };

  export default withSharedComponents(DocumentRevocation);
