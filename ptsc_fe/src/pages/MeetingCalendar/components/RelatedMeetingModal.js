import React, { useState, useEffect, useCallback } from "react";
import { styled } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";

const StyledTableWrapper = styled("div")(() => ({
  "& .unit-task-wrapper": {
    position: "relative",
    display: "inline-block !important",
    whiteSpace: "normal !important",
    wordBreak: "break-word !important",
    overflow: "visible !important",
  },
  "& .unit-task-wrapper:hover": {
    zIndex: "10000001 !important",
  },
  "& .unit-task-tooltip": {
    display: "none",
    position: "absolute",
    top: "22px",
    left: 0,
    background: "#fff",
    border: "1px solid #ddd",
    padding: "10px",
    borderRadius: "6px",
    whiteSpace: "normal !important",
    maxWidth: "300px !important",
    width: "max-content",
    zIndex: "10000000 !important",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    overflow: "visible !important",
  },
  "& .unit-task-wrapper:hover .unit-task-tooltip": {
    display: "block !important",
  },
  "& td:has(.unit-task-wrapper), & th:has(.unit-task-wrapper), & .MuiTableCell-root:has(.unit-task-wrapper)": {
    overflow: "visible !important",
  },
  "& div:has(.unit-task-wrapper)": {
    overflow: "visible !important",
    whiteSpace: "normal !important",
  },
}));
import CustomTable from "@components/CustomTable/CustomTableFolder";
import ViewMeetingSchedulePopup from "./ViewMeetingSchedulePopup";
import api from "@services/api";
import { 
  API_ADD_MEETING_SCHEDULE, 
  API_GET_LIST_UNIT, 
  // API_CRMSOURCE_DHVB 
} from "@EnvironmentFile/constants/urlConfig";
import {
  SelectedCountBox,
  SelectedCountText,
} from "@pages/MeetingCalendar/componentStyle/MeetingConclusion.styles";

// Move static configurations outside component to maintain stable references
const COLUMNS = [
  {
    name: "meetingTitle",
    title: "Tiêu đề lịch họp",
    width: 250,
  },
  {
    name: "meetingType",
    title: "Loại cuộc họp",
    width: 150,
  },
  {
    name: "meetingUnitCreate",
    title: "Đơn vị tổ chức",
    width: 200,
  },
  {
    name: "meetingUnitParticipants",
    title: "Đơn vị tham gia",
    width: 250,
  },
  {
    name: "conclusion",
    title: "Kết luận cuộc họp",
    width: 150,
    render: (row) => (
      <div dangerouslySetInnerHTML={{ __html: (row?.conclusion === "-" || row === "-") ? "0 kết luận" : (row?.conclusion || row || "0 kết luận") }} />
    ),
  },
];

const SEARCHABLE_FIELDS = [
  { 
    name: "meetingType", 
    label: "Loại cuộc họp", 
    type: "select",
    options: [
      { id: "517c9371-ddd0-4ea0-9321-7b8053b3f662", title: "Họp nội bộ", value: "NB" },
      { id: "054a5a23-2004-41cb-8530-a1a11ce1dbeb", title: "Họp liên phòng ban", value: "LPB" },
      { id: "e436c50a-beeb-45f1-bfba-4788e2192b8e", title: "Họp đối tác", value: "DT" }
    ],
    customLabel: "title",
    customValue: "value"
  },
  {
    name: "organizerUnitName",
    label: "Đơn vị tổ chức",
    type: "asyncSelect",
    api: API_GET_LIST_UNIT,
    customLabel: "name",
    customValue: "id", // We want to search and store the name for the filter
    queryParam: "name"
  },
  {
    name: "participantUnitName",
    label: "Đơn vị tham gia",
    type: "asyncSelect",
    api: API_GET_LIST_UNIT,
    customLabel: "name",
    customValue: "id",
    queryParam: "name"
  }
];

const FILTER_CONFIG = [
  { name: "Tiêu đề lịch họp", code: "meetingTitle" },
  { name: "Kết luận cuộc họp", code: "conclusion" },
];

const RelatedMeetingModal = ({ open, onClose, onConfirm, meetingId, initialSelected = [], sharedComponents }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [openViewMeeting, setOpenViewMeeting] = useState(false);
  const [viewingMeetingId, setViewingMeetingId] = useState(null);

  const fetchData = useCallback(async (params = {}) => {
    // Only fetch if the modal is open and we have a meetingId
    if (!meetingId || !open) return { data: [], total: 0 };
    setLoading(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { sort, ...restParams } = params;
      const response = await api.get(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/finished-meetings-for-linking`, {
        params: {
          page: restParams.page || 1,
          limit: restParams.limit || 25,
          ...restParams,
        },
      });

      if (response?.data?.success) {
        const items = response.data.items || [];
        const totalItems = response.data.total || 0;
        setData(items);
        setTotal(totalItems);

        return { data: items, total: totalItems };
      }
      return { data: [], total: 0 };
    } catch (error) {
      logger.error("Error fetching related meetings:", error);
      return { data: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, [meetingId, open]);

  useEffect(() => {
    if (open) {
      const initialIds = (initialSelected || []).map(m => m.id || m._id);
      setSelectedIds(initialIds);
      setSelectedRows(initialSelected || []);
    }
  }, [open]);

  const handleSelectionChange = (newSelectedIds) => {
    setSelectedIds(newSelectedIds);
    
    // Find rows from current data
    const newSelectedFromData = data.filter(row => newSelectedIds.includes(row._id || row.id));
    
    // Keep previously selected rows that are still in newSelectedIds but not in current data page
    const existingSelectedNotInData = selectedRows.filter(row => 
      newSelectedIds.includes(row._id || row.id) && !data.some(d => (d._id || d.id) === (row._id || row.id))
    );

    setSelectedRows([...newSelectedFromData, ...existingSelectedNotInData]);
  };

  const handleConfirm = () => {
    onConfirm(selectedRows);
    onClose();
  };

  const handleViewDetail = (id) => {
    setViewingMeetingId(id);
    setOpenViewMeeting(true);
  };

  const handleCloseViewDetail = () => {
    setOpenViewMeeting(false);
    setViewingMeetingId(null);
  };

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title="Liên kết cuộc họp liên quan"
      titleButton="Xác nhận"
      onSave={handleConfirm}
      size="lg"
      fullWidth
    >
      <SelectedCountBox>
        <SelectedCountText variant="body2">
          Đã chọn: ( {selectedIds.length} ) Cuộc họp
        </SelectedCountText>
      </SelectedCountBox>
      <StyledTableWrapper>
        <CustomTable
          data={data}
          columns={COLUMNS}
          loading={loading}
          total={total}
          fetchData={fetchData}
          filter={FILTER_CONFIG}
          disableAdd
          disableEdit
          disableDeletePQ
          disableDelete
          disableSynchronize
          disableView={false}
          onView={handleViewDetail}
          disableFilter={false}
          disableBL
          searchableFields={SEARCHABLE_FIELDS}
          disableDefaultSort
          disableSort
          selection={selectedIds}
          onSelectionChange={handleSelectionChange}
          isInsideDialog
        />
      </StyledTableWrapper>
      {openViewMeeting && (
        <ViewMeetingSchedulePopup
          open={openViewMeeting}
          onClose={handleCloseViewDetail}
          meetingId={viewingMeetingId}
          sharedComponents={sharedComponents}
        />
      )}
    </CustomDialog>
  );
};

export default RelatedMeetingModal;
