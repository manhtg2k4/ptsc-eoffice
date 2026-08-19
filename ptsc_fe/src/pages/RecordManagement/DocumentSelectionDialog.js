import React, { useState, useEffect, useCallback } from "react";
import { Search, FilterList as FilterListIcon } from "@mui/icons-material";
import {
  ClickAwayListener,
  IconButton,
  Grid,
  styled,
  Backdrop,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import withSharedComponents from "@components/WrapperComponent";
import CustomTable from "@components/CustomTable/CustomTable";
import {
  StyledDialogContent,
  SearchContainer,
  FixedSection,
  TableContainer,
  PaginationSection,
  FilterBoxTitleWrapper,
  FilterTitleText,
  FilterDateLabel,
  ResetButton,
  CancelButtonLink,
  ApplyFilterButton,
  DateRangeGrid,
  CenteredSeparator,
  FilterActionWrapper,
  FilterBox
} from "./DocumentSelectionDialog.styles";
import {
  SearchAdornment,
  StyledClearIcon,
} from "@styles/CustomTable.styles";
import axiosInstance from "@utils/axiosInstance";
import dayjs from "dayjs";
import api from "@services/api";
import {
  API_SELECT_DOCUMENTS_PROFILE,
  API_VIEW_FILE,
  APP_BASE,
  API_XLSX_TO_PDF,
} from "@EnvironmentFile/constants/urlConfig";
import { FileViewerDialog } from "@components/CustomDialog";
import { useToast } from "@components/common/ToastProvider";
import CustomPagination from "@pages/TextAway/Tab/component/CustomPagination";
import {
  FilterBoxWrapper,
  FilterButton,
  LoadingContainer,
  SearchButton,
  StyledSearchFieldWrapper,
  TabChip,
  TabsContainer,
  TabsWrapper,
} from "@styles/RecordManagement.styles";
// import { useDispatch, useSelector } from "react-redux";

const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  color: "#fff",
  zIndex: theme.zIndex.drawer + 2000, // Ensure it's above the dialog
}));

const StyledLoadingStack = styled(Stack)(({ theme }) => ({
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(2),
}));

const StyledCircularProgress = styled(CircularProgress)(() => ({
  color: "inherit",
}));

// Helper function to get document type label
function getDocumentType(value) {
  switch (value) {
    case "incoming":
      return "Văn bản đến";
    case "outgoing":
      return "Văn bản đi";
    case "work":
      return "Công việc / Dự án";
    default:
      return "Tài liệu";
  }
}

const TAB_CONFIG = [
  { label: "Văn bản đến", value: "incoming" },
  { label: "Văn bản đi", value: "outgoing" },
  { label: "Công việc / Dự án", value: "work" },
];

const DocumentSelectionDialog = ({
  open,
  onClose,
  onSave,
  initialSelectedIds = [],
  sharedComponents,
}) => {
  const { Dialog, DatePicker } = sharedComponents;
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sort
  const [sort, setSort] = useState({
    orderBy: null,
    order: "desc",
  });

  const columns = [
    { name: "Loại", row: "type", width: "150px" },
    { name: "Tên tài liệu", row: "fileName", width: "auto" },
  ];

  // Filter configuration
  const filterColumns = [
    { name: "Loại", code: "type" },
    { name: "Tên tài liệu", code: "fileName" },
  ];

  // Search and data
  const [searchKeyword, setSearchKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [tableData, setTableData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [openFilter, setOpenFilter] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState(
    filterColumns.map(function (col) {
      return col.name;
    })
  );
  const [tempSelectedColumns, setTempSelectedColumns] =
    useState(selectedColumns);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Tab labels with counts
  const [tabLabels, setTabLabels] = useState([
    { label: "Văn bản đến", value: "incoming", count: 0 },
    { label: "Văn bản đi", value: "outgoing", count: 0 },
    { label: "Công việc / Dự án", value: "work", count: 0 },
  ]);

  // Update selected rows when dialog opens
  useEffect(
    function () {
      if (open) {
        const initialIds = Array.isArray(initialSelectedIds) 
          ? initialSelectedIds.map(id => typeof id === 'object' ? String(id.fileId || id.id || id._id || id.documentId || '') : String(id))
          : [];
        setSelectedRows(initialIds);
        
        // Also initialize selected objects if possible
        if (Array.isArray(initialSelectedIds) && initialSelectedIds.length > 0 && typeof initialSelectedIds[0] === 'object') {
          setSelectedObjects(initialSelectedIds.map(obj => ({
            ...obj,
            id: String(obj.fileId || obj.id || obj._id || obj.documentId || '')
          })));
        } else {
          setSelectedObjects([]);
        }
        
        setSearchKeyword("");
        setInputValue("");
        setPage(1);
        setStartDate(null);
        setEndDate(null);
        setTempStartDate(null);
        setTempEndDate(null);
      }
    },
    [open, initialSelectedIds] // Run when dialog opens or initial selection changes
  );

  // Handle tab change
  function handleTabChange(tabIndex) {
    setActiveTab(tabIndex);
    setPage(1);
    setSearchKeyword("");
    setInputValue("");
  }

  // Handle input change
  const handleInputChange = useCallback(function (e) {
    setInputValue(e.target.value);
  }, []);

  // Handle input blur
  const handleInputBlur = useCallback(function () {
    // Không làm gì khi blur
  }, []);

  // Handle clear search
  const handleClearSearch = useCallback(function () {
    setSearchKeyword("");
    setInputValue("");
    setPage(1);
  }, []);

  // Handle filter toggle
  const handleFilterToggle = useCallback(
    function () {
      if (!openFilter) {
        setTempSelectedColumns(selectedColumns);
        setTempStartDate(startDate);
        setTempEndDate(endDate);
      }
      setOpenFilter(function (prev) {
        return !prev;
      });
    },
    [openFilter, selectedColumns, startDate, endDate]
  );

  // Handle filter away
  const handleFilterAway = useCallback(function () {
    setOpenFilter(false);
  }, []);

  // Handle column filter change
  // const handleColumnFilterChangeDirect = useCallback(function (columnName) {
  //   return function () {
  //     setTempSelectedColumns(function (prev) {
  //       if (prev.includes(columnName)) {
  //         return prev.filter(function (val) {
  //           return val !== columnName;
  //         });
  //       }
  //       return [...prev, columnName];
  //     });
  //   };
  // }, []);

  // Handle select all columns
  // function handleSelectAllColumns(e) {
  //   if (e.target.checked) {
  //     setTempSelectedColumns(
  //       filterColumns.map(function (col) {
  //         return col.name;
  //       })
  //     );
  //   } else {
  //     setTempSelectedColumns([]);
  //   }
  // }

  // Handle apply filter
  function handleApplyFilter() {
    if (tempStartDate && tempEndDate) {
      if (dayjs(tempEndDate).isBefore(dayjs(tempStartDate), 'day')) {
        toast("Ngày kết thúc không được nhỏ hơn ngày bắt đầu", "error");
        return;
      }
    } else if (tempStartDate || tempEndDate) {
      toast("Vui lòng nhập đầy đủ thông tin từ ngày và đến ngày", "error");
      return;
    }

    setSelectedColumns(tempSelectedColumns);
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setPage(1);
    handleFilterAway();
  }

  // Handle reset filter
  function handleResetFilter() {
    setTempStartDate(null);
    setTempEndDate(null);
    setStartDate(null);
    setEndDate(null);
    setPage(1);
    // Có thể chọn đóng filter hoặc giữ nguyên
    // handleFilterAway(); 
  }

  // Handle search button click
  function handleSearchClick() {
    setSearchKeyword(inputValue);
    setPage(1);
  }

  // Handle key press
  function handleKeyPress(e) {
    if (e.key === "Enter") {
      handleSearchClick();
    }
  }

  // Handle sort
  const handleSort = useCallback(function (newSort) {
    setSort(newSort);
    setPage(1);
  }, []);

  // Fetch data
  const fetchData = useCallback(
    async function () {
      if (!open) return;

      setLoading(true);
      try {
        const currentTab = TAB_CONFIG[activeTab];
        
        // Build params
        const params = {
          page: page,
          limit: rowsPerPage,
          type: currentTab.value,
        };

        // Add search keyword if exists
        if (searchKeyword && searchKeyword.trim()) {
          params["filter[fileName]"] = searchKeyword.trim();
        }

        // Add sort if exists
        if (sort.orderBy) {
          const sortKey = `sort[${sort.orderBy}]`;
          params[sortKey] = sort.order === "desc" ? -1 : 1;
        }

        // Add date filter
        if (startDate) {
          params["filter[startDate]"] = dayjs(startDate).format("YYYY-MM-DD");
        }
        if (endDate) {
          params["filter[endDate]"] = dayjs(endDate).format("YYYY-MM-DD");
        }

        const response = await axiosInstance.get(API_SELECT_DOCUMENTS_PROFILE, {
          params,
        });

        if (response) {
          const items = Array.isArray(response) ? response : (response.items || response.data || []);

          if (Array.isArray(items)) {
            const formattedData = items.map(function (item) {
              const originalId = item.id || item.documentId || item._id;
              const itemId = String(originalId || '');
              return {
                ...item,
                id: itemId,
                _id: itemId,
                originalId: originalId,
                type: getDocumentType(currentTab.value),
                fileName: item.fileName || item.documentName || item.name || item.title || "Không có tên",
              };
            });

            setTableData(formattedData);
            setTotal(response.total || items.length);

            // Update tab counts if available
            const counts = response.totals || response.counts;
            if (counts) {
              setTabLabels(function (prev) {
                return prev.map(function (tab) {
                  return {
                    ...tab,
                    count:
                      counts[tab.value] !== undefined
                        ? counts[tab.value]
                        : tab.count,
                  };
                });
              });
            }
          } else {
            setTableData([]);
            setTotal(0);
          }
        } else {
          setTableData([]);
          setTotal(0);
        }
      } catch (error) {
        toast("Lỗi khi tải dữ liệu tài liệu!", "error");
        setTableData([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [open, activeTab, searchKeyword, page, rowsPerPage, sort, startDate, endDate, toast]
  );

  // Fetch data when dependencies change
  useEffect(
    function () {
      fetchData();
    },
    [fetchData]
  );

  // Handle selection change
  const handleSelectionChange = useCallback(function (newSelectedIds) {
    setSelectedRows(newSelectedIds);
    
    // Update selected objects cache
    setSelectedObjects(function(prev) {
      const newObjects = [...prev];
      
      // Add newly selected objects from current table data
      tableData.forEach(function(row) {
        if (newSelectedIds.includes(row.id) && !newObjects.some(obj => obj.id === row.id)) {
          newObjects.push(row);
        }
      });
      
      // Remove unselected objects
      return newObjects.filter(function(obj) {
        return newSelectedIds.includes(obj.id);
      });
    });
  }, [tableData]);

  // Handle save
  function handleConfirm() {
    if (!selectedObjects || selectedObjects.length === 0) {
      toast("Vui lòng thêm hồ sơ", "error");
      return;
    }
    if (onSave) {
      onSave(selectedObjects);
    }
    onClose();
  }

  const handlePreview = useCallback(
    async (rowOrId) => {
      // Handle both row object and ID
      let row = rowOrId;
      if (typeof rowOrId !== "object" && tableData) {
        row = tableData.find(f => (f.fileId === rowOrId || f.id === rowOrId || f._id === rowOrId));
      }

      if (!row) {
        toast("Không tìm thấy thông tin tài liệu.", "warning");
        return;
      }

      // In DocumentSelectionDialog, row is a document object
      // We try to find the fileId either on the row itself or in row.files[0]
      const fileId = row.fileId || (row.files && row.files[0] && (row.files[0].fileId || row.files[0].id || row.files[0]._id)) || row.id || row._id;
      const fileName = row.fileName || row.name || (row.files && row.files[0] && row.files[0].name) || "Tài liệu";
      const lower = fileName.toLowerCase();

      if (!fileId) {
        toast("Tài liệu này không có file đính kèm hoặc ID không hợp lệ.", "warning");
        return;
      }

      setIsLoading(true);

      try {
        const fileExtension = fileName.split(".").pop().toLowerCase();
        const isDoc = /\.(doc|docx)$/i.test(lower);
        const isExcel = /\.(xls|xlsx)$/i.test(lower);
        const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|bmp)$/i.test(lower);

        let objectUrl;
        let fileType = null;

        if (isDoc) {
          const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
          const res = await api.get(conversionApi, {
            responseType: "blob",
            timeout: 0,
          });
          const blob = new Blob([res.data], { type: "application/pdf" });
          objectUrl = URL.createObjectURL(blob);
          fileType = "pdf";
        } else if (isExcel) {
          // EXCEL conversion to PDF
          const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
          const fileRes = await api.get(downloadUrl, {
            responseType: "blob",
            timeout: 0,
          });

          const formData = new FormData();
          formData.append("file", new File([fileRes.data], fileName));

          const res = await api.post(API_XLSX_TO_PDF, formData, {
            responseType: "blob",
            timeout: 0,
          });

          const blob = new Blob([res.data], { type: "application/pdf" });
          objectUrl = URL.createObjectURL(blob);
          fileType = "pdf";
        } else if (isBrowserFile) {
          // PDF, Image: direct fetch and view
          const res = await api.get(`${API_VIEW_FILE}/${fileId}`, { responseType: "blob" });
          const blob = res.data;
          objectUrl = URL.createObjectURL(blob);
          
          if (fileExtension === "pdf") {
            fileType = "pdf";
          } else {
            fileType = "image";
          }
        } else {
          // Other types: attempt direct view
          const res = await api.get(`${API_VIEW_FILE}/${fileId}`, { responseType: "blob" });
          const blob = res.data;
          objectUrl = URL.createObjectURL(blob);
        }

        setViewingFile({
          open: true,
          url: objectUrl,
          name: fileName,
          type: fileType,
        });
      } catch (error) {
        toast("Không thể tải file để xem trước.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [toast, tableData]
  );

  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url) {
      URL.revokeObjectURL(viewingFile.url);
    }
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);


  // Handle page change
  function handlePageChange(newPage) {
    setPage(newPage);
  }

  // Handle rows per page change
  function handleRowsPerPageChange(newRowsPerPage) {
    setRowsPerPage(newRowsPerPage);
    setPage(1);
  }

  // Render tab chip
  function renderTabChip(tab, index) {
    const handleTabClick = (event) => {
      const index = Number(event.currentTarget.dataset.index);
      // if (index === 2) {
      //   dispatch(getDataFakeSelectFolder());
      // }
      handleTabChange(index);
    };

    return (
      <TabChip
        key={index}
        data-index={index}
        label={`${tab.label} (${tab.count})`}
        active={activeTab === index ? 1 : 0}
        onClick={handleTabClick}
      />
    );
  }

  // const getDataDistrictFromApi = useCallback(
  //   async ({ page, limit, query, code, sort, parentId }) => {
  //     if (!page || !limit) {
  //       return { data: [], total: 0 };
  //     }
  //     try {
  //       let response;
  //       if (query !== "" && code && sort) {
  //         response = await dispatch(
  //           getDataFakeSelectFolder({
  //             page,
  //             limit,
  //             query,
  //             code,
  //             sort,
  //             parentId,
  //           })
  //         ).unwrap();
  //       } else if (sort) {
  //         //Chỉ sort thì rơi vào nhánh này
  //         response = await dispatch(
  //           getDataFakeSelectFolder({
  //             page,
  //             limit,
  //             query,
  //             code,
  //             sort,
  //             parentId,
  //           })
  //         ).unwrap();
  //       } else {
  //         //Mặc định
  //         response = await dispatch(
  //           getDataFakeSelectFolder({ page, limit, sort, parentId })
  //         ).unwrap();
  //       }
  //       return {
  //         data: response.data || [], // Giả sử fetchDocuments trả về mảng dữ liệu
  //         total: response.total || response.length || 0, // Cần điều chỉnh nếu API trả về total
  //       };
  //     } catch (error) {
  //       return { data: [], total: 0 };
  //     }
  //   },
  //   [dispatch] // Dependency chỉ có dispatch, không phụ thuộc vào list
  // );

  // Render filter column checkbox

  // function renderFilterColumn(column) {
  //   return (
  //     <FormControlLabel
  //       key={column.code}
  //       control={
  //         <Checkbox
  //           checked={tempSelectedColumns.includes(column.name)}
  //           onChange={handleColumnFilterChangeDirect(column.name)}
  //           size="small"
  //         />
  //       }
  //       label={column.name}
  //     />
  //   );
  // }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      dialogSize="lg"
      title="CHỌN TÀI LIỆU"
      titleButton="THÊM VÀO HỒ SƠ"
      onSave={handleConfirm}
    >
      <StyledDialogContent dividers>
        {/* Tabs Section */}
        <TabsWrapper>
          <TabsContainer>{tabLabels.map(renderTabChip)}</TabsContainer>
        </TabsWrapper>

        {/* Search Section */}
        <FixedSection>
          <SearchContainer>
            <StyledSearchFieldWrapper
              variant="outlined"
              size="small"
              placeholder="Tìm kiếm..."
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyPress={handleKeyPress}
              InputProps={{
                endAdornment: inputValue && (
                  <SearchAdornment>
                    <IconButton
                      aria-label="clear search"
                      onClick={handleClearSearch}
                      edge="end"
                      size="small"
                    >
                      <StyledClearIcon />
                    </IconButton>
                  </SearchAdornment>
                ),
              }}
            />
            <SearchButton aria-label="search" onClick={handleSearchClick}>
              <Search />
            </SearchButton>
            <ClickAwayListener onClickAway={handleFilterAway}>
              <div style={{ display: 'contents' }}>
                <FilterButton
                  onClick={handleFilterToggle}
                  startIcon={<FilterListIcon />}
                >
                  Bộ Lọc
                </FilterButton>
                <FilterBoxWrapper>
                  {openFilter && (
                    <FilterBox>
                    <FilterBoxTitleWrapper>
                      <FilterTitleText>
                        Bộ lọc <FilterListIcon />
                      </FilterTitleText>
                    </FilterBoxTitleWrapper>

                    <div style={{ padding: '0 5px' }}>
                      <FilterDateLabel>
                        Ngày văn bản
                      </FilterDateLabel>
                      <DateRangeGrid container spacing={2}>
                        <Grid item xs={5.5}>
                          <DatePicker
                            value={tempStartDate ? dayjs(tempStartDate) : null}
                            onChange={setTempStartDate}
                            placeholder="yyyy-mm-dd"
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                          />
                        </Grid>
                        <CenteredSeparator item xs={1}>
                          -
                        </CenteredSeparator>
                        <Grid item xs={5.5}>
                          <DatePicker
                            value={tempEndDate ? dayjs(tempEndDate) : null}
                            onChange={setTempEndDate}
                            placeholder="yyyy-mm-dd"
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                          />
                        </Grid>
                      </DateRangeGrid>
                    </div>

                    <FilterActionWrapper>
                      <ResetButton onClick={handleResetFilter}>
                        Đặt lại
                      </ResetButton>
                      <CancelButtonLink onClick={handleFilterAway}>
                        Hủy
                      </CancelButtonLink>
                      <ApplyFilterButton
                        variant="contained"
                        onClick={handleApplyFilter}
                      >
                        Áp dụng lọc
                      </ApplyFilterButton>
                    </FilterActionWrapper>
                  </FilterBox>
                )}
                </FilterBoxWrapper>
              </div>
            </ClickAwayListener>
          </SearchContainer>
        </FixedSection>

        {/* Table Section */}
        <TableContainer>
          {loading ? (
            <LoadingContainer>
              <span>Đang tải dữ liệu...</span>
            </LoadingContainer>
          ) : (
            <CustomTable
              columns={columns}
              data={tableData}
              disablePagination
              selection={selectedRows}
              onSelectionChange={handleSelectionChange}
              onlyTable
              autoHeight
              onOrder={handleSort}
              defaultSort={{ orderBy: sort.orderBy, order: sort.order }}
              disableEdit
              disableDelete
              onView={handlePreview}
							encodeHtml
            />
          )}
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

      <FileViewerDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        fileUrl={viewingFile.url}
        fileName={viewingFile.name}
        fileType={viewingFile.type}
        title={`Xem file: ${viewingFile.name}`}
      />
      
      <StyledBackdrop open={isLoading}>
        <StyledLoadingStack direction="column">
          <StyledCircularProgress />
          <Typography variant="body1">Đang xử lý tài liệu...</Typography>
        </StyledLoadingStack>
      </StyledBackdrop>
    </Dialog>
  );
};

export default withSharedComponents(DocumentSelectionDialog);
