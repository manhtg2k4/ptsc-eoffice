import React, { useState, useEffect, useCallback } from "react";
import {
  DialogActions,
  Grid,
  DialogTitle,
  CircularProgress,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
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
} from "./componentStyle/JobProfileSearchDialog.style";
import { useToast } from "@components/common/ToastProvider";
// import { useSelector } from "react-redux";
import dayjs from "dayjs";
import CustomPagination from "@pages/TextAway/Tab/component/CustomPagination";
import { CancelButton, SaveButton } from "@styles/CustomDialog.styles";
import PropTypes from "prop-types";
import { getUnitId } from "./constants";
import { useDispatch } from "react-redux";
import {
  getLishDataJobProfile,
  updateDataJobProfile,
} from "@redux/slices/IncomingDocument/JobProfileSlice";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const JobProfileSearchDialog = ({
  open,
  onClose,
  onSave,
  sharedComponents,
  isNotCallApiWithSave,
  ...props
}) => {
  const { documentId } = props;
  const { InputComponents } = sharedComponents;
  const toast = useToast();
  const dispatch = useDispatch();
  // const { crmSource } = useSelector((state) => state.config);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // ---- COLUMN GIỐNG ẢNH ----
  // Cập nhật các cột để khớp với schema FakeTask và thêm định dạng ngày
  const columns = [
    { name: "Tên công việc", row: "name", width: "250px" },
    { name: "Người giao việc", row: "assigner", width: "180px" },
    { name: "Người xử lý chính", row: "director", width: "180px" },
    { name: "Người phối hợp", row: "supporter", width: "200px" },
    {
      name: "Ngày giao",
      row: "startDate",
      width: "150px",
      accessor: (row) =>
        row.startDate
          ? dayjs(row.startDate, "DD/MM/YYYY").format("DD/MM/YYYY")
          : "–",
    },
    // { name: "Trạng thái", row: "status", width: "120px" },
    // {
    //   name: "Hạn xử lý",
    //   row: "dueDate",
    //   width: "150px",
    //   accessor: (row) =>
    //     row.dueDate ? dayjs(row.dueDate).format("DD/MM/YYYY") : "–",
    // },
    // { name: "Loại hồ sơ", row: "documentType", width: "150px" },
    // { name: "Độ mật", row: "confidentiality", width: "120px" },
  ];

  // ---- SEARCH FORM ----
  // Cập nhật các trường tìm kiếm
  const [searchParams, setSearchParams] = useState({
    keyword: "",
    // documentType: "",
  });

  const handleInputChange = (name) => (eventOrValue) => {
    const value = eventOrValue?.target
      ? eventOrValue.target.value
      : eventOrValue;
    setSearchParams((p) => ({ ...p, [name]: value }));
  };
  // Sử dụng S26 cho Loại hồ sơ/công việc
  // const documentTypeOptions =
  //   crmSource.find((item) => item.code === "S26")?.data || [];
  const [tableData, setTableData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPage(1); // Reset về trang 1 mỗi khi search thay đổi
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    // Cập nhật logic gọi API
    try {
      const filter = {
        name: searchParams.keyword || undefined,
        taskContent: searchParams.keyword || undefined,
        // documentType: searchParams.documentType || undefined,
      };
      const params = {
        page: page,
        limit: rowsPerPage,

        filter: Object.fromEntries(
          Object.entries(filter).filter(([, v]) => v !== undefined && v !== "")
        ),
      };
      const responseData = await dispatch(
        getLishDataJobProfile({ params })
      ).unwrap();
      setTableData(responseData.data || []);
      setTotal(responseData.total || responseData?.data?.length || 0);
    } catch (error) {
      toast("Lỗi khi tải dữ liệu hồ sơ công việc!", "error");
      setTableData([]);
      setTotal(0);
    }
  }, [searchParams, page, rowsPerPage, toast, dispatch]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData, page, rowsPerPage]);

  const handleSaveNoApi = () => {
    const selected = tableData.filter((i) =>
      selectedRows.includes(getUnitId(i))
    );
    logger.log("handleSaveNoApi", selected);
    if (onSave) {
      onSave(selected); // Gọi callback onSave và truyền dữ liệu đã chọn
    }
    onClose();
  };

  const handleSaveWithApi = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      const selected = tableData
        .filter((i) => selectedRows.includes(getUnitId(i)))
        .map((item) => getUnitId(item));
      const payload = {
        docId: documentId,
        taskIds: selected,
      };
      await dispatch(updateDataJobProfile(payload)).unwrap();
      toast("Chọn hồ sơ công việc thành công!", "success");
      onClose();
    } catch (error) {
      logger.log("Lỗi khi chọn hồ sơ công việc!", error);
      toast("Lỗi khi chọn hồ sơ công việc!", "error");
    } finally {
      setIsSaving(false);
    }
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

  const handleSave = isNotCallApiWithSave ? handleSaveNoApi : handleSaveWithApi;

  return (
    <StyledDialog open={open} onClose={onClose}>
      <DialogTitle>
        TÌM KIẾM CÔNG VIỆC ĐÍNH KÈM
        <CloseButton onClick={onClose}>
          <CloseIcon />
        </CloseButton>
      </DialogTitle>

      {/* Thay đổi DialogContent để sử dụng flexbox */}
      <DialogHeaderBar>
        <DialogHeaderTitle>TÌM KIẾM CÔNG VIỆC ĐÍNH KÈM</DialogHeaderTitle>
        <DialogHeaderCloseButton onClick={onClose} aria-label="Đóng">
          <CloseIcon />
        </DialogHeaderCloseButton>
      </DialogHeaderBar>
      <StyledDialogContent dividers>
        {/* Phần tìm kiếm không cuộn */}
        <FixedSection>
          <SearchFormGrid container spacing={2}>
            {/* Tên công việc / Nội dung công việc */}
            <Grid item xs={12} sm={12}>
              <InputComponents
                // label="Tên công việc / Nội dung công việc"
                placeholder="Tìm kiếm mã công việc, tên công việc,..."
                value={searchParams.keyword}
                onChange={handleInputChange("keyword")}
              />
            </Grid>

            {/* Loại hồ sơ */}
            {/* <Grid item xs={12} sm={4}>
              <InputComponents
                select
                label="Loại hồ sơ"
                value={searchParams.documentType}
                onChange={handleInputChange("documentType")}
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
            rowKey="id"
            columns={columns}
            data={tableData}
            disableAct
            disablePagination
            autoHeight
            selection={selectedRows}
            onSelectionChange={setSelectedRows}
            onlyTable
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
        <SaveButton
          onClick={handleSave}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          {isSaving ? "Đang lưu..." : "Lưu"}
        </SaveButton>
        <CancelButton onClick={onClose} disabled={isSaving}>
          Đóng
        </CancelButton>
      </DialogActions>
    </StyledDialog>
  );
};

JobProfileSearchDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func,
  sharedComponents: PropTypes.object,
  isNotCallApiWithSave: PropTypes.bool,
};

export default withSharedComponents(JobProfileSearchDialog);
