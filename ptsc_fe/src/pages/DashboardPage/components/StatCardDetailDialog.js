import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { styled } from "@mui/material/styles";
import { Box, Chip, Typography, TableBody, MenuItem, PaginationItem } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import Flag from "@mui/icons-material/Flag";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomTableBorderTree from "@components/CustomTable/CustomTableBorderTree";
import PaginationSection from "@builder-table/components/PaginationSection";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import { APP_BASE, API_ADD_COMMON_WORK } from "@EnvironmentFile/constants/urlConfig";
import { getDataDashboardNormalStats } from "@redux/slices/DashboardPage/DashboardPageSlice";
import dayjs from "dayjs";
import { getComponentByKey } from "@builder-table/components/componentRegistry";
import { openDetailDialog } from "@components/GlobalDialogPortal";
import {
  PaginationContainer as BeautifulPaginationContainer,
  InfoBox as BeautifulInfoBox,
  StyledPagination as BeautifulStyledPagination,
  RowsPerPageBox as BeautifulRowsPerPageBox,
  DisplayTypography as BeautifulDisplayTypography,
  RowsPerPageSelect as BeautifulRowsPerPageSelect,
  RowsPerPageStack as BeautifulRowsPerPageStack,
} from "@builder-table/components/PaginationSection.styles";
import {
  StyledPaper,
  StyledTableContainer,
  StyledTable,
  StyledTableHead,
  StyledTableRow,
  StyledTableCell,
  StyledTableHeaderCell,
  HeaderCellContainer,
} from "@styles/CustomTable.styles";

const HeaderLeftBox = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

const TitleIconBox = styled(Box)(({ theme }) => ({
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  backgroundColor: "rgba(33, 150, 243, 0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.primary.main,
}));

const TitleText = styled(Typography)({
  fontWeight: "bold",
  lineHeight: 1.2,
});

const SubTitleText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const PrimaryValueChip = styled(Chip)(({ theme }) => ({
  fontWeight: "bold",
  marginLeft: "8px",
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

const TreeTableWrapperBox = styled(Box)({
  width: "100%",
  marginTop: "8px",
    "& th:first-of-type, & td:first-of-type": {
      display: "none !important",
    },
});


const StyledInput = styled("input")({
  width: "100%",
  padding: "6px 12px",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  fontSize: "0.875rem",
  outline: "none",
  backgroundColor: "#FAFAFA",
  transition: "all 0.15s ease",
  "&:focus": {
    borderColor: "#1976d2",
    backgroundColor: "#fff",
    boxShadow: "0 0 0 2px rgba(25, 118, 210, 0.1)",
  },
  "&::placeholder": {
    color: "#bdbdbd",
    fontStyle: "italic",
  },
});

const StyledFlag = styled(Flag, {
  shouldForwardProp: (prop) => prop !== "flagColor",
})(({ flagColor }) => ({
  color: flagColor,
  marginRight: "6px",
  fontSize: "1.1rem",
}));

const FlagIcon = ({ priority }) => {
  let color = "#bdbdbd"; // Gray by default
  const p = String(priority || "").toLowerCase();
  if (p === "gấp" || p === "gap" || p === "1") {
    color = "#f44336"; // Red
  }
  return <StyledFlag flagColor={color} />;
};

const StyledTypeChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== "customBgColor" && prop !== "textColor",
})(({ customBgColor, textColor }) => ({
  backgroundColor: customBgColor,
  color: textColor,
  fontWeight: "600",
  fontSize: "12px",
  borderRadius: "15px",
  border: "none",
}));

const getTypeTaskChip = (typeTask, typeTaskText) => {
  let label = typeTaskText || "Công việc chung";
  let customBgColor = "#DBEAFE";
  let color = "#0062AD";

  const type = String(typeTask || "").toLowerCase();
  if (type.includes("document") || type.includes("van_ban") || type.includes("văn bản")) {
    customBgColor = "#FEF9C2";
    color = "#D97706";
    label = "Công việc từ văn bản";
  } else if (type.includes("project") || type.includes("du_an") || type.includes("dự án")) {
    customBgColor = "#FEE2E2";
    color = "#EF4444";
    label = "Dự án";
  } else if (type.includes("meeting") || type.includes("cuoc_hop") || type.includes("cuộc họp")) {
    customBgColor = "#DCFCE7";
    color = "#16A34A";
    label = "Công việc từ cuộc họp";
  }

  return (
    <StyledTypeChip
      label={label}
      size="small"
      customBgColor={customBgColor}
      textColor={color}
    />
  );
};

const FlexBox = styled(Box)({
  display: "flex",
  alignItems: "center",
});

const TaskLinkText = styled(Typography)({
  color: "#1976d2",
  cursor: "pointer",
  textDecoration: "underline",
  fontWeight: 500,
});

const CenteredTableCell = styled(StyledTableCell)({
  padding: "40px 0",
});

const HeightPreservingTableCell = styled(CenteredTableCell)({
  height: "350px",
});

const ScrollableTableContainer = styled(StyledTableContainer)({
  maxHeight: "520px",
  overflowY: "auto",
});

const DelayJobRowItem = React.memo(({ row, reasonVal, onReasonChange, onRowClick }) => {
  const rowId = row.id || row.taskId;
  const handleChange = useCallback((e) => {
    onReasonChange(rowId, e.target.value);
  }, [rowId, onReasonChange]);

  const handleTaskClick = useCallback(() => {
    if (onRowClick) {
      onRowClick(rowId);
    }
  }, [rowId, onRowClick]);

  const formattedEndDate = useMemo(() => {
    if (row.endDateNotHTML) return row.endDateNotHTML;
    if (!row.endDate) return "-";
    if (dayjs(row.endDate).isValid()) {
      return dayjs(row.endDate).format("DD/MM/YYYY HH:mm");
    }
    return row.endDate;
  }, [row.endDateNotHTML, row.endDate]);

  return (
    <StyledTableRow>
      {/* 1. Tên công việc */}
      <StyledTableCell stylePaddingLeft="16px" styleWidth="260px">
        <FlexBox>
          <FlagIcon priority={row.priority} />
          <TaskLinkText variant="body2" onClick={handleTaskClick}>
            {row.name}
          </TaskLinkText>
        </FlexBox>
      </StyledTableCell>

      {/* 2. Hạn kết thúc */}
      <StyledTableCell styleWidth="140px">
        {formattedEndDate}
      </StyledTableCell>

      {/* 3. Người giao */}
      <StyledTableCell styleWidth="140px">
        {row.assignerName || row.assigner || "-"}
      </StyledTableCell>

      {/* 4. Nguồn công việc */}
      <StyledTableCell styleWidth="180px">
        {getTypeTaskChip(row.typeTask, row.sourceName || row.typeTaskText)}
      </StyledTableCell>

      {/* 5. Lý do trễ hạn */}
      <StyledTableCell>
        <StyledInput
          placeholder="Bạn hãy nhập lý do chậm tiến độ..."
          value={reasonVal}
          onChange={handleChange}
        />
      </StyledTableCell>
    </StyledTableRow>
  );
});

DelayJobRowItem.displayName = "DelayJobRowItem";

const StatCardDetailDialog = ({
  open,
  onClose,
  statBlock,
  customData,
  customColumns,
  isFromNotification,
  isNormal,
  isMedium,
}) => {
  const dispatch = useDispatch();
  const { dataUser } = useSelector((state) => state.auth);
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [paginationState, setPaginationState] = useState({
    page: 1,
    rowsPerPage: 10,
  });

  const [editedReasons, setEditedReasons] = useState({});

  const isNotification = Boolean(isFromNotification || statBlock?.isFromNotification);

  const handleReasonChange = useCallback((taskId, value) => {
    setEditedReasons((prev) => ({
      ...prev,
      [taskId]: value,
    }));
  }, []);

  const handleRowClick = useCallback((taskId, row) => {
    if (!taskId) return;
    
    let componentKey = "VIEW_TASK";
    const isOutgoingDocs = statBlock?.parentCard?.id === 'outgoing-documents' || statBlock?.id === 'outgoing-documents';
    const isIncomingDocs = statBlock?.parentCard?.id === 'incoming-documents' || statBlock?.id === 'incoming-documents';
    const isMediumDocs = statBlock?.parentCard?.id === 'documents-month' || statBlock?.id === 'documents-month';
    const isPremiumDocs = statBlock?.parentCard?.id === 'company-documents' || statBlock?.id === 'company-documents';

    if (isOutgoingDocs) {
      componentKey = "VIEW_OUTCOMING_DOC_DI";
    } else if (isIncomingDocs) {
      componentKey = "VIEW_INCOMING_DOC";
    } else if (isMediumDocs || isPremiumDocs) {
      if (row?.docType === 'outgoing') {
        componentKey = "VIEW_OUTCOMING_DOC_DI";
      } else {
        componentKey = "VIEW_INCOMING_DOC";
      }
    }

    const componentInfo = getComponentByKey(componentKey);
    if (componentInfo) {
      openDetailDialog(componentInfo, taskId);
      onClose();
    }
  }, [onClose, statBlock]);

  const handleCellClick = useCallback((row, key) => {
    if (key === "name" || key === "title" || key === "abstractNote") {
      const rowId = row?.documentId || row?.id || row?.taskId || row?._id;
      handleRowClick(rowId, row);
    }
  }, [handleRowClick]);

  // Reset edited reasons when opening dialog
  useEffect(() => {
    if (open) {
      setEditedReasons({});
    }
  }, [open]);

  // Load data: call overdue-reason-requests API if from notification, else set from props/mock
  useEffect(() => {
    if (!open) {
      setTableData([]);
      setEditedReasons({});
      return;
    }

    if (isNotification) {
      let isMounted = true;
      setLoading(true);
      axiosInstance
        .get(`${API_ADD_COMMON_WORK}/overdue-reason-requests`, {
          params: {
            page: paginationState.page,
            limit: paginationState.rowsPerPage,
          },
        })
        .then((res) => {
          if (!isMounted) return;
          const items = Array.isArray(res?.items)
            ? res.items
            : (Array.isArray(res?.data?.items)
              ? res.data.items
              : (Array.isArray(res?.data) ? res.data : []));
          const total = res?.total ?? res?.data?.total ?? items.length;
          const pages = res?.totalPages ?? res?.data?.totalPages ?? (Math.ceil(total / paginationState.rowsPerPage) || 1);

          setTableData(items);
          setTotalCount(total);
          setTotalPages(pages);
        })
        .catch((err) => {
          if (!isMounted) return;
          toast(err?.response?.data?.message || "Có lỗi xảy ra khi lấy danh sách công việc chậm tiến độ từ thông báo", "error");
          setTableData([]);
          setTotalCount(0);
          setTotalPages(1);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else if (statBlock) {
      if (customData && Array.isArray(customData)) {
        setTableData(customData);
        setTotalCount(customData.length);
        setTotalPages(Math.ceil(customData.length / paginationState.rowsPerPage) || 1);
      } else if (Array.isArray(statBlock.data)) {
        setTableData(statBlock.data);
        setTotalCount(statBlock.data.length);
        setTotalPages(Math.ceil(statBlock.data.length / paginationState.rowsPerPage) || 1);
      } else {
        let isMounted = true;
        setLoading(true);

        let apiEndpoint = '';
        let queryParams = {
          page: paginationState.page,
          limit: paginationState.rowsPerPage,
        };

        if (isMedium) {
          const isMediumDocs = statBlock?.parentCard?.id === 'documents-month' || statBlock?.id === 'documents-month';
          if (isMediumDocs) {
            apiEndpoint = `${APP_BASE}/api/dashboard/medium/documents-list`;
            let filter = 'total';
            if (statBlock?.key === 'main') {
              filter = 'total';
            } else {
              const id = String(statBlock?.id || '').toLowerCase();
              if (id === 'doc-overdue' || id === 'overdue' || id === 'late') filter = 'overdue';
              else if (id === 'doc-pending' || id === 'pending') filter = 'pending';
              else if (id === 'doc-done' || id === 'done' || id === 'processed') filter = 'done';
              else filter = 'total';
            }
            queryParams.filter = filter;
          } else {
            apiEndpoint = `${APP_BASE}/api/dashboard/medium/tasks-room-list`;
            let filter = 'today';
            if (statBlock?.key === 'main') {
              filter = 'today';
            } else {
              const id = String(statBlock?.id || '').toLowerCase();
              if (id === 'doing') filter = 'doing';
              else if (id === 'overdue' || id === 'late') filter = 'overdue';
              else if (id === 'done') filter = 'done';
              else filter = 'today';
            }
            queryParams.filter = filter;
          }
        } else if (isNormal) {
          const isOutgoingDocs = statBlock?.parentCard?.id === 'outgoing-documents' || statBlock?.id === 'outgoing-documents';
          const isIncomingDocs = statBlock?.parentCard?.id === 'incoming-documents' || statBlock?.id === 'incoming-documents';
          if (isOutgoingDocs) {
            apiEndpoint = `${APP_BASE}/api/dashboard/normal/outgoing-documents-list`;
            let filter = 'total';
            if (statBlock?.key === 'main') {
              filter = 'total';
            } else {
              const label = String(statBlock?.label || statBlock?.title || '').toLowerCase();
              if (label.includes('dự thảo')) filter = 'draft';
              else if (label.includes('chờ duyệt')) filter = 'pending';
              else if (label.includes('quá hạn')) filter = 'overdue';
              else filter = 'total';
            }
            queryParams.filter = filter;
          } else if (isIncomingDocs) {
            apiEndpoint = `${APP_BASE}/api/dashboard/normal/incoming-documents-list`;
            let filter = 'total';
            if (statBlock?.key === 'main') {
              filter = 'total';
            } else {
              const label = String(statBlock?.label || statBlock?.title || '').toLowerCase();
              if (label.includes('chờ xử lý')) filter = 'pending';
              else if (label.includes('đang xử lý')) filter = 'in-progress';
              else if (label.includes('quá hạn')) filter = 'overdue';
              else filter = 'total';
            }
            queryParams.filter = filter;
          } else {
            apiEndpoint = `${APP_BASE}/api/dashboard/normal/tasks-list`;
            let filter = 'total';
            if (statBlock?.key === 'main') {
              filter = 'total';
            } else {
              const label = String(statBlock?.label || statBlock?.title || '').toLowerCase();
              if (label.includes('đang thực hiện')) filter = 'doing';
              else if (label.includes('quá hạn')) filter = 'overdue';
              else if (label.includes('chờ phê duyệt')) filter = 'pending-approval';
              else if (label.includes('hoàn thành')) filter = 'done';
              else filter = 'total';
            }
            queryParams.filter = filter;
          }
        } else {
          const isPremiumDocs = statBlock?.parentCard?.id === 'company-documents' || statBlock?.id === 'company-documents';
          if (isPremiumDocs) {
            apiEndpoint = `${APP_BASE}/api/dashboard/premium/company-documents`;
            let type = 'all';
            if (statBlock?.key === 'main') {
              type = 'all';
            } else {
              const id = String(statBlock?.id || '').toLowerCase();
              if (id === 'processed' || id === 'done') type = 'processed';
              else if (id === 'late' || id === 'doc-late') type = 'late';
              else type = 'all';
            }
            queryParams.type = type;
          } else {
            apiEndpoint = `${APP_BASE}/api/dashboard/premium/company-tasks`;
            let type = 'all';
            if (statBlock?.key === 'main') {
              type = 'all';
            } else {
              const id = String(statBlock?.id || '').toLowerCase();
              if (id === 'done') type = 'done';
              else if (id === 'late') type = 'late';
              else type = 'all';
            }
            queryParams.type = type;
          }
        }

        axiosInstance
          .get(apiEndpoint, {
            params: queryParams,
            skipUnwrap: true,
          })
          .then((res) => {
            if (!isMounted) return;
            
            let items = [];
            let total = 0;
            let pages = 1;

            let responseData = res?.data || res;

            // Bóc tách nếu API bọc data 2 lớp (vd: { success: true, data: { data: [], total: 93 } })
            if (responseData && typeof responseData === 'object' && responseData.data && !Array.isArray(responseData.data)) {
              if (Array.isArray(responseData.data.data) || Array.isArray(responseData.data.items) || responseData.data.total !== undefined) {
                responseData = responseData.data;
              }
            }

            if (Array.isArray(responseData)) {
              items = responseData;
            } else if (responseData && typeof responseData === 'object') {
              if (Array.isArray(responseData.data)) items = responseData.data;
              else if (Array.isArray(responseData.items)) items = responseData.items;
              else if (Array.isArray(responseData.tasks)) items = responseData.tasks;
            }

            const mappedItems = items.map((item) => ({
              ...item,
              docCode: item.toBookCode || item.textSymbols || "",
            }));

            total = responseData?.total ?? responseData?.totalCount ?? responseData?.totalItems ?? items.length;
            pages = responseData?.totalPages ?? 1;

            setTableData(mappedItems);
            setTotalCount(total);
            setTotalPages(pages);
          })
          .catch((err) => {
            if (!isMounted) return;
            toast(err?.response?.data?.message || "Có lỗi xảy ra khi lấy danh sách công việc", "error");
            setTableData([]);
            setTotalCount(0);
            setTotalPages(1);
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });

        return () => {
          isMounted = false;
        };
      }
    }
  }, [open, statBlock, customData, isNotification, paginationState.page, paginationState.rowsPerPage, toast, isNormal, isMedium]);

  const dialogTitle = statBlock?.label || statBlock?.title || statBlock?.subText || "Chi tiết thống kê";
  const isDelayJobs =
    statBlock?.code === "delay" ||
    statBlock?.id === "delay" ||
    isNotification ||
    String(dialogTitle).toLowerCase().includes("chậm tiến độ");


  const columns = useMemo(() => {
    if (customColumns && Array.isArray(customColumns)) {
      return customColumns;
    }
    if (isDelayJobs) {
      return [
        { key: "name", label: "Tên công việc", width: 260 },
        { key: "endDateNotHTML", label: "Ngày kết thúc", width: 140 },
        { key: "assigner", label: "Người giao", width: 140 },
        { key: "typeTask", label: "Nguồn công việc", width: 180 },
        { key: "slowReason", label: "Lý do trễ hạn", width: 300 },
      ];
    }
    
    const isOutgoing = statBlock?.parentCard?.id === 'outgoing-documents' || statBlock?.id === 'outgoing-documents';
    const isIncoming = statBlock?.parentCard?.id === 'incoming-documents' || statBlock?.id === 'incoming-documents';
    const isMediumDoc = statBlock?.parentCard?.id === 'documents-month' || statBlock?.id === 'documents-month';
    const isPremiumDoc = statBlock?.parentCard?.id === 'company-documents' || statBlock?.id === 'company-documents';

    if (isOutgoing) {
      return [
        { key: "textSymbols", name: "textSymbols", label: "Số văn bản", isShow: true, width: "120px" },
        { key: "abstractNote", name: "abstractNote", label: "Trích yếu", isShow: true, width: "300px" },
        { key: "files", name: "files", label: "File văn bản", isShow: true, width: "100px", margin: "center" },
        { key: "documentDate", name: "documentDate", label: "Ngày trên văn bản", isShow: true, width: "140px" },
        { key: "deadline", name: "deadline", label: "Hạn văn bản", isShow: true, width: "120px" },
        { key: "statusCode", name: "statusCode", label: "Trạng thái", isShow: true, width: "150px", margin: "center" },
      ];
    }
    if (isIncoming) {
      return [
        { key: "toBookCode", name: "toBookCode", label: "Số văn bản", isShow: true, width: "120px" },
        { key: "abstractNote", name: "abstractNote", label: "Trích yếu", isShow: true, width: "300px" },
        { key: "files", name: "files", label: "File văn bản", isShow: true, width: "100px", margin: "center" },
        { key: "documentDate", name: "documentDate", label: "Ngày trên văn bản", isShow: true, width: "140px" },
        { key: "deadline", name: "deadline", label: "Hạn văn bản", isShow: true, width: "120px" },
        { key: "statusCode", name: "statusCode", label: "Trạng thái", isShow: true, width: "150px", margin: "center" },
      ];
    }
    if (isMediumDoc || isPremiumDoc) {
      return [
        { key: "docCode", name: "docCode", label: "Số văn bản", isShow: true, width: "120px" },
        { key: "abstractNote", name: "abstractNote", label: "Trích yếu", isShow: true, width: "300px" },
        { key: "files", name: "files", label: "File văn bản", isShow: true, width: "100px", margin: "center" },
        { key: "documentDate", name: "documentDate", label: "Ngày trên văn bản", isShow: true, width: "140px" },
        { key: "deadline", name: "deadline", label: "Hạn văn bản", isShow: true, width: "120px" },
        { key: "statusCode", name: "statusCode", label: "Trạng thái", isShow: true, width: "150px", margin: "center" },
      ];
    }

    return [
      { key: "name", name: "name", label: "Tên công việc", isShow: true, width: "260px" },
      { key: "processStatusUi", name: "processStatusUi", label: "Trạng thái", isShow: true, width: "160px", margin: "center" },
      { key: "assigner", name: "assigner", label: "Người giao", isShow: true, width: "140px" },
      { key: "director", name: "director", label: "Người thực hiện", isShow: true, width: "150px" },
      { key: "parentDirector", name: "parentDirector", label: "Đơn vị thực hiện", isShow: true, width: "180px" },
      { key: "startDateNotHTML", name: "startDateNotHTML", label: "Ngày bắt đầu", isShow: true, width: "120px" },
      { key: "endDateNotHTML", name: "endDateNotHTML", label: "Hạn hoàn thành", isShow: true, width: "120px" },
      { key: "progressView", name: "progressView", label: "Tiến độ", isShow: true, width: "140px" },
    ];
  }, [customColumns, isDelayJobs, statBlock?.id, statBlock?.parentCard?.id]);

  // Save changes handler
  const handleSaveReasons = useCallback(async () => {
    const modifiedTasks = tableData.filter((row) => {
      const rowId = row.id || row.taskId;
      const currentVal = editedReasons[rowId];
      const originalVal = row.slowReason || row.reasonComment || "";
      return currentVal !== undefined && currentVal.trim() !== originalVal.trim();
    });

    if (modifiedTasks.length === 0) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const promises = modifiedTasks.map((row) => {
        const rowId = row.id || row.taskId;
        const commentData = {
          type: "slowReason",
          userId: dataUser?._id || dataUser?.id,
          userName: dataUser?.name || dataUser?.username,
          content: editedReasons[rowId].trim(),
          fileId: [],
          mentionIds: [],
        };
        return axiosInstance.post(`${APP_BASE}/api/task/${rowId}/comments`, commentData);
      });

      await Promise.all(promises);
      toast("Cập nhật lý do chậm tiến độ thành công!", "success");

      // Refetch the normal dashboard statistics to update the count
      dispatch(getDataDashboardNormalStats());

      onClose();
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi lưu lý do chậm tiến độ", "error");
    } finally {
      setLoading(false);
    }
  }, [tableData, editedReasons, dataUser, toast, onClose, dispatch]);

  // Phân trang dữ liệu dạng cây hoặc phân trang danh sách chậm tiến độ
  const { paginatedData, paginationObject } = useMemo(() => {
    if (!tableData || tableData.length === 0) {
      return {
        paginatedData: [],
        paginationObject: { page: 1, rowsPerPage: paginationState.rowsPerPage, total: 0, totalPages: 1 },
      };
    }

    // Nếu có totalCount > độ dài mảng hiện tại => Data đang được phân trang ở Server (Server-side pagination)
    // HOẶC isNotification => luôn dùng Server-side pagination info
    const isServerSidePagination = totalCount > tableData.length || isNotification;

    if (isDelayJobs) {
      if (isServerSidePagination) {
        return {
          paginatedData: tableData, // Không slice vì server đã slice, dạng phẳng
          paginationObject: {
            page: paginationState.page,
            rowsPerPage: paginationState.rowsPerPage,
            total: totalCount,
            totalPages: totalPages || Math.ceil(totalCount / paginationState.rowsPerPage) || 1,
          },
        };
      }

      const total = tableData.length;
      const calcTotalPages = Math.ceil(total / paginationState.rowsPerPage) || 1;
      const currentPage = Math.min(paginationState.page, calcTotalPages);
      const startIdx = (currentPage - 1) * paginationState.rowsPerPage;
      const slice = tableData.slice(startIdx, startIdx + paginationState.rowsPerPage);
      return {
        paginatedData: slice,
        paginationObject: {
          page: currentPage,
          rowsPerPage: paginationState.rowsPerPage,
          total,
          totalPages: calcTotalPages,
        },
      };
    }

    if (isServerSidePagination) {
      return {
        // Xóa thuộc tính parent để bảng CustomTableBorderTree không tự động build tree ẩn các record con
        paginatedData: tableData, 
        paginationObject: {
          page: paginationState.page,
          rowsPerPage: paginationState.rowsPerPage,
          total: totalCount,
          totalPages: totalPages || Math.ceil(totalCount / paginationState.rowsPerPage) || 1,
        },
      };
    }

    const total = tableData.length;
    const calcTotalPages = Math.ceil(total / paginationState.rowsPerPage) || 1;
    const currentPage = Math.min(paginationState.page, calcTotalPages);
    const startIdx = (currentPage - 1) * paginationState.rowsPerPage;
    const slice = tableData.slice(startIdx, startIdx + paginationState.rowsPerPage);

    return {
      // Xóa thuộc tính parent để bảng hiển thị dạng phẳng
      paginatedData: slice.map(item => ({ ...item, parent: null, parentId: null })),
      paginationObject: {
        page: currentPage,
        rowsPerPage: paginationState.rowsPerPage,
        total,
        totalPages: calcTotalPages,
      },
    };
  }, [tableData, paginationState.page, paginationState.rowsPerPage, isDelayJobs, isNotification, totalCount, totalPages]);

  const handlePaginationChange = useCallback((newPagination) => {
    setPaginationState({
      page: newPagination.page,
      rowsPerPage: newPagination.rowsPerPage,
    });
  }, []);

  const handlePageChangeBeautiful = useCallback((event, newPage) => {
    setPaginationState((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handleRowsPerPageChangeSelect = useCallback((event) => {
    setPaginationState({
      page: 1,
      rowsPerPage: parseInt(event.target.value, 10),
    });
  }, []);

  const renderPreviousSlot = useCallback(() => "Trước", []);
  const renderNextSlot = useCallback(() => "Sau", []);
  const paginationSlots = useMemo(
    () => ({ previous: renderPreviousSlot, next: renderNextSlot }),
    [renderPreviousSlot, renderNextSlot]
  );

  const renderPaginationItem = useCallback(
    (item) => <PaginationItem slots={paginationSlots} {...item} />,
    [paginationSlots]
  );

  const handleSelect = useCallback(() => { }, []);
  const handleAction = useCallback(() => { }, []);

  if (!open && !statBlock && !isNotification) return null;

  const parentTitle = statBlock?.parentCard?.label || statBlock?.parentCard?.title || null;
  const chipTotalValue = statBlock?.value !== undefined ? statBlock.value : (totalCount > 0 ? totalCount : undefined);

  const dialogTitleNode = (
    <HeaderLeftBox>
      <TitleIconBox>
        <AccountTreeOutlinedIcon />
      </TitleIconBox>
      <Box>
        <TitleText variant="h6">
          {dialogTitle}
        </TitleText>
        {parentTitle && (
          <SubTitleText variant="caption">
            Thuộc khối: {parentTitle}
          </SubTitleText>
        )}
      </Box>
      {chipTotalValue !== undefined && (
        <PrimaryValueChip
          label={`Tổng: ${chipTotalValue}`}
          size="small"
        />
      )}
    </HeaderLeftBox>
  );

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title={isDelayJobs ? "Danh sách công việc chậm tiến độ" : dialogTitleNode}
      size="xl"
      disableSave={!isDelayJobs}
      onSave={handleSaveReasons}
      cancelButtonText="ĐÓNG"
      titleButton="LƯU"
      isLoading={loading}
    >
      {isDelayJobs ? (
        <TreeTableWrapperBox>
          <StyledPaper isInsideDialog>
            <ScrollableTableContainer>
              <StyledTable size="small">
                <StyledTableHead>
                  <StyledTableRow>
                    {columns.map((col) => (
                      <StyledTableHeaderCell
                        key={col.key}
                        isBold
                        align="left"
                        styleWidth={`${col.width}px`}
                        styleMinWidth={`${col.width}px`}
                        styleMaxWidth={`${col.width}px`}
                      >
                        <HeaderCellContainer align="left">
                          {col.label}
                        </HeaderCellContainer>
                      </StyledTableHeaderCell>
                    ))}
                  </StyledTableRow>
                </StyledTableHead>
                <TableBody>
                  {loading ? (
                    <StyledTableRow>
                      <HeightPreservingTableCell colSpan={5} align="center">
                        Đang tải dữ liệu...
                      </HeightPreservingTableCell>
                    </StyledTableRow>
                  ) : paginatedData.length === 0 ? (
                    <StyledTableRow>
                      <HeightPreservingTableCell colSpan={5} align="center">
                        Không có dữ liệu công việc chậm tiến độ
                      </HeightPreservingTableCell>
                    </StyledTableRow>
                  ) : (
                    paginatedData.map((row) => {
                      const rowId = row.id || row.taskId;
                      const reasonVal =
                        editedReasons[rowId] !== undefined
                          ? editedReasons[rowId]
                          : (row.slowReason || row.reasonComment || "");
                      return (
                        <DelayJobRowItem
                          key={rowId}
                          row={row}
                          reasonVal={reasonVal}
                          onReasonChange={handleReasonChange}
                          onRowClick={handleRowClick}
                        />
                      );
                    })
                  )}
                </TableBody>
              </StyledTable>
            </ScrollableTableContainer>

            {/* Premium Pagination Section */}
            <BeautifulPaginationContainer isCentered={false}>
              <BeautifulInfoBox isCentered={false}>
                <Typography variant="body2">
                  Hiển thị{" "}
                  <strong>
                    {paginationObject.total > 0
                      ? (paginationObject.page - 1) * paginationObject.rowsPerPage + 1
                      : 0}
                    -
                    {Math.min(
                      paginationObject.page * paginationObject.rowsPerPage,
                      paginationObject.total
                    )}
                  </strong>{" "}
                  trong tổng số <strong>{paginationObject.total?.toLocaleString()}</strong> bản ghi
                </Typography>
              </BeautifulInfoBox>

              <BeautifulRowsPerPageStack>
                <BeautifulRowsPerPageBox>
                  <BeautifulDisplayTypography>Hiển thị</BeautifulDisplayTypography>
                  <BeautifulRowsPerPageSelect
                    value={paginationObject.rowsPerPage}
                    onChange={handleRowsPerPageChangeSelect}
                    size="small"
                  >
                    {[10, 25, 50, 100].map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </BeautifulRowsPerPageSelect>
                </BeautifulRowsPerPageBox>

                <BeautifulStyledPagination
                  count={paginationObject.totalPages || 1}
                  page={paginationObject.page}
                  onChange={handlePageChangeBeautiful}
                  renderItem={renderPaginationItem}
                  shape="rounded"
                  variant="text"
                  showFirstButton={false}
                  showLastButton={false}
                  siblingCount={1}
                  boundaryCount={1}
                />
              </BeautifulRowsPerPageStack>
            </BeautifulPaginationContainer>
          </StyledPaper>
        </TreeTableWrapperBox>
      ) : (
        <TreeTableWrapperBox>
          <CustomTableBorderTree
            type={"statDetailTreeTable"}
            data={paginatedData}
            dataColumn={columns}
            loading={loading}
            onSelect={handleSelect}
            onAction={handleAction}
            onCellClick={handleCellClick}
            allowColumnDrag
            customMaxHeight="420px"
          />
          <PaginationSection
            pagination={paginationObject}
            onPaginationChange={handlePaginationChange}
          />
        </TreeTableWrapperBox>
      )}
    </CustomDialog>
  );
};

StatCardDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  statBlock: PropTypes.object,
  customData: PropTypes.array,
  customColumns: PropTypes.array,
  isFromNotification: PropTypes.bool,
};

export default React.memo(StatCardDetailDialog);
