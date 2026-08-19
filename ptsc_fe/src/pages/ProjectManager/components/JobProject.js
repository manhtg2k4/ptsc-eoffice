import React, { useState, useCallback, useEffect, useRef, useMemo, useContext } from "react";
import { useSelector } from "react-redux";
import { AuthContext } from "@AuthContext/AuthProvider";
import {
  Popover,
  Checkbox,
  TextField,
  MenuItem,
  Typography,
  Grid
} from "@mui/material";
import {
  FilterAlt as FilterAltIcon,
} from "@mui/icons-material";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_COMMON_WORK, API_EXPORT_FILE_EXCEL_PROJECT, API_PROJECT_MANAGEMENT } from "@EnvironmentFile/constants/urlConfig";
import dayjs from "dayjs";
import {
  JobSubTaskHeader,
  JobSectionTitle,
  JobSubTaskTableContainer,
  JobSubTaskProgressWrapper,
  JobSubTaskProgress,
  JobSubTaskStatusButton,
  ViewSwitcherContainer,
  ViewSwitcherItem,
  ViewSwitcherLabel,
  AdvancedFilterButton,
  FilterPopOverContainer,
  FilterPopoverHeader,
  FilterPopoverContent,
  FilterPopoverFooter,
  FilterLabel,

  FilterActionWrapper,
  FilterResetButton,
  FilterCancelButton,
  FilterApplyButton,
  FilterFormControlLabel,
  FilterGridContainer
} from "./AddProject.styles";
import AddNewJob from "@pages/WorkManagement/components/AddNewJobProject";
import TaskDetailPanel from "@components/TaskDetailPanel/TaskDetailPanel";
import UpdateJobDialog from "@pages/WorkManagement/components/UpdateJobDialogNew";
import GanttExample from "@components/CustomGantt/GanttExample";
import KanbanPage from "@pages/DemoKanban";
import CustomTableBorderCalendarTree from "@components/CustomTableBorder/CustomTableBorderCalendarTree";
import CustomTableBorderTreeJob from "@components/CustomTableBorder/CustomTableBorderTreeJob";
import LoadingDialog from "@components/LoadingDialog";
import FormButton from "@components/FormButton";
import CustomAutoCompleteSearch from "@components/CustomAutoCompleteSearch";
import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";

const logger = console;

const filterOptions = [
  { name: "Mã công việc", code: "code" },
  { name: "Tên công việc", code: "name" },
];
const statusOptions = [
  { value: "1", title: "Công việc mới" },
  { value: "2", title: "Đang thực hiện" },
  { value: "3", title: "Chờ phê duyệt" },
  { value: "4", title: "Hoàn thành" },
  { value: "6", title: "Điều chỉnh" },
  { value: "8", title: "Hủy" }
];

const CELL_RENDERERS = {
  progress: {
    key: "progress",
    label: "Tiến độ",
    name: "Tiến độ",
    row: "progress",
    width: 250,
    minWidth: 250,
    accessor: (row) => {
      // Return raw HTML string if it exists, otherwise return progress number
      if (row.progressView) return row.progressView;
      return (
        <JobSubTaskProgressWrapper>
          <JobSubTaskProgress variant="determinate" value={parseFloat(row.progress) || 0} />
          <Typography variant="body2">{parseFloat(row.progress) || 0}%</Typography>
        </JobSubTaskProgressWrapper>
      );
    },
  },
  priority: {
    key: "priority",
    label: "Độ ưu tiên",
    name: "Độ ưu tiên",
    row: "priority",
    width: 120,
    accessor: (row) => {
      const p = String(row.priority || "").toLowerCase();
      if (p === "gap" || p === "1") return "Gấp";
      if (p === "binhthuong" || p === "0") return "Bình thường";
      return row.priority || "";
    }
  },
  startDate: {
    key: "startDate",
    label: "Ngày bắt đầu",
    name: "Ngày bắt đầu",
    row: "startDate",
    width: 120,
    accessor: (row) => {
      if (!row.startDate) return "";
      // Return raw string to let the table component handle HTML formatting
      if (typeof row.startDate === 'string' && row.startDate.includes('<')) {
        return row.startDate;
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(row.startDate)) return row.startDate;
      return dayjs(row.startDate).isValid() ? dayjs(row.startDate).format("DD/MM/YYYY") : row.startDate;
    },
  },
  endDate: {
    key: "endDate",
    label: "Hạn kết thúc",
    name: "Hạn kết thúc",
    row: "endDate",
    width: 120,
  },
  assigners: {
    key: "assigners",
    label: "Người giao",
    name: "Người giao",
    row: "assigners",
    width: 150,
    accessor: (row) => {
      if (Array.isArray(row.assigners) && row.assigners.length > 0) {
        return row.assigners.map(u => u.name || u.processName).join(", ");
      }
      return row.assigner || row.taskUsers?.find(u => u.role === 'assigner')?.processName || "";
    }
  },
  directors: {
    key: "directors",
    label: "Người chủ trì",
    name: "Người chủ trì",
    row: "directors",
    width: 150,
    accessor: (row) => {
      if (Array.isArray(row.directors) && row.directors.length > 0) {
        return row.directors.map(u => u.name || u.processName).join(", ");
      }
      return row.director || row.taskUsers?.find(u => u.role === 'director')?.processName || "";
    }
  },
  processStatus: {
    key: "processStatus",
    label: "Trạng thái",
    name: "Trạng thái",
    row: "processStatus",
    width: 150,
    accessor: (row) => {
      let content = row.processStatusUi || (typeof row.processStatus === 'string' && row.processStatus.includes('<div') ? row.processStatus : null);
      if (content) return content; // Return raw HTML string
      return (
        <JobSubTaskStatusButton size="small" taskStatus={row.processStatus}>
          {row.processStatus}
        </JobSubTaskStatusButton>
      );
    },
  },
};

const JobProject = ({
  currentTaskId,
  displayData,
  sharedComponents,
  setIsUpdated,
  isProjectCompletedCancelledOrPaused
}) => {
  
   const { toast, Dialog } = sharedComponents;
  const { user: authUser } = useContext(AuthContext);
  const { crmSource } = useSelector((state) => state.config);
  const reduxBreadcrumbs = useSelector((state) => state.layout.currentPageBreadcrumb || []);

  const addJobBreadcrumbs = useMemo(() => {
    return [{ title: "Dummy" }, ...reduxBreadcrumbs];
  }, [reduxBreadcrumbs]);

  const urgencyOptions = useMemo(() => crmSource.find((item) => item.code === "DOUUTIEN")?.data || [], [crmSource]);
  // Compute columns dynamically based on TaskProject viewConfig
  const columns = useMemo(() => {
    try {
      const viewConfigStr = localStorage.getItem("viewConfig");
      // Use default columns if no config
      const defaultColumns = [
        CELL_RENDERERS.progress,
        CELL_RENDERERS.startDate,
        CELL_RENDERERS.endDate,
        CELL_RENDERERS.assigners,
        CELL_RENDERERS.directors,
        CELL_RENDERERS.processStatus
      ].map(col => ({ ...col, isShow: true }));

      if (!viewConfigStr) return defaultColumns;

      const viewConfigData = JSON.parse(viewConfigStr);
      const configArray = Array.isArray(viewConfigData) ? viewConfigData : viewConfigData?.data;

      // Find config for quanlycvpb
      const taskProjectConfig = Array.isArray(configArray)
        ? configArray.find((config) => config.code === "quanlycvpb")
        : null;

      if (taskProjectConfig && Array.isArray(taskProjectConfig.field)) {
        // Loại bỏ các trường trùng lặp theo name để tránh hiển thị nhiều lần trong cấu hình
        const uniqueFields = [];
        const seenNames = new Set();
        taskProjectConfig.field.forEach(f => {
          if (!seenNames.has(f.name)) {
            uniqueFields.push(f);
            seenNames.add(f.name);
          }
        });

        const dynamicColumns = uniqueFields
          .map((f) => {
            // Loại bỏ hoàn toàn trường 'topic' (Chủ đề) theo yêu cầu
            if (f.name === "topic") {
              return null;
            }

            // Bỏ qua các trường chỉ dùng để lọc nâng cao mà không phải là cột dữ liệu
            if (f.advancedSearch && (f.type === 'checkbox' || f.name.includes('_from'))) {
              return null;
            }

            let rendererKey = f.name;

            // Mapping special fields from "quanlycvpb" schema to internal renderers
            if (rendererKey === "progressView") rendererKey = "progress";
            if (rendererKey === "processStatusUi") rendererKey = "processStatus";
            if (rendererKey === "assigner") rendererKey = "assigners";
            if (rendererKey === "director") rendererKey = "directors";

            // ✅ Fix trùng lặp: Nếu đã có một cột sử dụng cùng rendererKey và đang hiển thị, bỏ qua cột này
            if (seenNames.has(`renderer_${rendererKey}`)) {
              return null;
            }
            if (f.showInList !== false) {
              seenNames.add(`renderer_${rendererKey}`);
            }

            const renderer = CELL_RENDERERS[rendererKey];

            // Xử lý đặc biệt cho cột Tên công việc (tree_name)
            if (f.name === "name") {
              return {
                key: "tree_name",
                row: "name",
                label: f.label || "Tên công việc",
                name: f.label || "Tên công việc",
                isShow: f.showInList !== false,
                ...(f.width && { width: f.width }),
                originalField: f
              };
            }

            if (renderer) {
              return {
                ...renderer,
                label: f.label || renderer.label,
                isShow: f.showInList !== false,
                ...(f.width && { width: f.width }),
                originalField: f
              };
            }

            // Mặc định cho các trường khác có trong cấu hình (priority, topic, templateName, code, v.v.)
            return {
              key: f.name,
              row: f.name,
              label: f.label,
              name: f.label,
              isShow: f.showInList !== false,
              width: f.width || 150,
              accessor: (row) => {
                const val = row[f.name];
                if (val === null || val === undefined) return "";
                return String(val);
              },
              originalField: f
            };
          })
          .filter(Boolean);

        if (dynamicColumns.length > 0) {
          return dynamicColumns;
        }
      }
      return defaultColumns;
    } catch (error) {
      return [
        CELL_RENDERERS.progress,
        CELL_RENDERERS.startDate,
        CELL_RENDERERS.endDate,
        CELL_RENDERERS.assigners,
        CELL_RENDERERS.directors,
        CELL_RENDERERS.processStatus
      ].map(col => ({ ...col, isShow: true }));
    }
  }, []);

  const [subTasksData, setSubTasksData] = useState([]);
  const [selectedSubTasks, setSelectedSubTasks] = useState([]);
  const [isAddSubJobOpen, setIsAddSubJobOpen] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState(null);
  const [viewingTaskData, setViewingTaskData] = useState(null);
  const [selectedJobForUpdate, setSelectedJobForUpdate] = useState(null);
  const [isUpdateParticipantOpen, setIsUpdateParticipantOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState({ id: null, name: null, progress: 0, hasChildren: false });
  const [confirmDeleteSubTask, setConfirmDeleteSubTask] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // 'list', 'gantt', 'kanban', 'calendar'
  const [isLoading, setIsLoading] = useState(false);
  const [reloadTable, setReloadTable] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [selectedJobForApproval, setSelectedJobForApproval] = useState(null);

  // Kiểm tra xem user hiện tại có phải là manager của dự án không
  const isProjectManager = useMemo(() => {
    const currentUserId = authUser?.user?._id || authUser?.user?.id;
    if (!currentUserId) return false;

    // Phân quyền nhanh dựa vào myRole của BE
    if (displayData?.myRole === "manager") return true;

    const managers = displayData?.managerId;
    if (Array.isArray(managers)) {
      return managers.some(m => {
        const mId = m.userId || m._id || m.id;
        return mId === currentUserId;
      });
    }

    const managerId = managers?.userId || managers?._id || managers?.id;
    return currentUserId === managerId;
  }, [authUser, displayData]);

  const initialFilter = useMemo(() => ({
    myTasks: false,
    myAssign: false,
    myDirector: false,
    mySupporter: false,
    overdue: false,
    viewers: false,
    assignee: null,
    status: "all",
    startDateFrom: null,
    startDateTo: null,
    endDateFrom: null,
    endDateTo: null,
    priority: "all",
    timeType: "thang",
  }), []);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [advancedFilter, setAdvancedFilter] = useState(initialFilter);
  const [appliedFilter, setAppliedFilter] = useState(initialFilter);
  const searchStateRef = useRef({ query: "", code: [] });
  const isActionInProgress = useRef(false);

  const handleViewModeChange = useCallback((mode) => () => {
    setViewMode(mode);
  }, []);

  // Per-view toggle state: mỗi view (list, gantt, kanban, calendar) có toggle riêng
  // Khai báo ở đây để có thể dùng trong deps array của useEffect bên dưới
  const [perViewToggle, setPerViewToggle] = useState({
    list:     { myAssign: false, myDirector: false, mySupporter: false },
    gantt:    { myAssign: false, myDirector: false, mySupporter: false },
    kanban:   { myAssign: false, myDirector: false, mySupporter: false },
    calendar: { myAssign: false, myDirector: false, mySupporter: false },
  });

  const handleFetchData = useCallback(async ({ page, limit, query, code, timeType, sort, overrideToggle }) => {
    // Lấy query và code thực tế: Ưu tiên từ tham số truyền vào, nếu không có thì lấy từ ref
    const effectiveQuery = query !== undefined ? query : searchStateRef.current.query;
    const effectiveCode = code !== undefined ? code : searchStateRef.current.code;

    // Cập nhật ref nếu có giá trị tìm kiếm mới từ thanh tìm kiếm
    if (query !== undefined) {
      searchStateRef.current = { query, code: code || [] };
    }

    try {
      const parentId = currentTaskId;
      const params = {
        "filter[parent]": parentId,
        "filter[projectId]": currentTaskId,
        typeTask: "project",
        page,
        limit,
        isSortStart: true,
        viewMode: viewMode === "kanban" ? "kanban" : null,
      };

      // Kết hợp search query và code
      if (effectiveQuery && effectiveCode && Array.isArray(effectiveCode)) {
        effectiveCode.forEach((field) => {
          params[`filter[${field}]`] = effectiveQuery;
        });
      }

      // overrideToggle: dùng cho non-list views (gantt/kanban/calendar) để tránh dùng chung appliedFilter
      const myAssignVal    = overrideToggle !== undefined ? overrideToggle.myAssign    : appliedFilter.myAssign;
      const myDirectorVal  = overrideToggle !== undefined ? overrideToggle.myDirector  : appliedFilter.myDirector;
      const mySupporterVal = overrideToggle !== undefined ? overrideToggle.mySupporter : appliedFilter.mySupporter;

      // Chuyển đổi Advanced filters sang định dạng filter[key]
      if (myAssignVal)    params["filter[myAssign]"]    = myAssignVal;
      if (myDirectorVal)  params["filter[myDirector]"]  = myDirectorVal;
      if (mySupporterVal) params["filter[mySupporter]"] = mySupporterVal;

      if (appliedFilter.overdue)  params["filter[overdueWork]"] = appliedFilter.overdue;
      if (appliedFilter.viewers)  params["filter[viewers]"]     = appliedFilter.viewers;
      const assigneeId = appliedFilter.assignee?.id || appliedFilter.assignee?._id || appliedFilter.assignee;
      if (assigneeId) params["filter[director]"] = assigneeId;

      if (appliedFilter.status !== "all") {
        params["filter[processStatus]"] = appliedFilter.status;
      }

      if (appliedFilter.startDateFrom) {
        params["filter[start_date_from][startDate]"] = dayjs(appliedFilter.startDateFrom).format("YYYY-MM-DD");
      }
      if (appliedFilter.startDateTo) {
        params["filter[start_date_from][endDate]"] = dayjs(appliedFilter.startDateTo).format("YYYY-MM-DD");
      }
      if (appliedFilter.endDateFrom) {
        params["filter[end_date_from][startDate]"] = dayjs(appliedFilter.endDateFrom).format("YYYY-MM-DD");
      }
      if (appliedFilter.endDateTo) {
        params["filter[end_date_from][endDate]"] = dayjs(appliedFilter.endDateTo).format("YYYY-MM-DD");
      }

      if (appliedFilter.priority !== "all") {
        params["filter[priority]"] = appliedFilter.priority;
      }

      const effectiveTimeType = timeType || appliedFilter.timeType;
      if (effectiveTimeType) {
        params["filter[timeType]"] = effectiveTimeType;
      }

      // Sắp xếp: sort[field] = 1 (tăng) hoặc -1 (giảm)
      if (sort && typeof sort === "object") {
        Object.entries(sort).forEach(([field, direction]) => {
          if (field) {
            params[`sort[${field}]`] = direction;
          }
        });
      }

      const response = await axiosInstance.get(API_ADD_COMMON_WORK, { params });
      const responseData = response.data || response;
      let tasks = responseData.data || responseData || [];
      setSubTasksData(tasks);

      return {
        data: tasks,
        total: tasks.total || tasks.length || 0
      };
    } catch (error) {
      return { data: [], total: 0 };
    }
  }, [currentTaskId, appliedFilter, viewMode]);

  // Fetch dữ liệu cho non-list views khi: chuyển tab hoặc toggle thay đổi
  useEffect(() => {
    if (viewMode !== 'list' && currentTaskId) {
      handleFetchData({ page: 1, limit: 500, overrideToggle: perViewToggle[viewMode] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, currentTaskId, perViewToggle]);

  const handleOpenAddSubJob = useCallback(() => {
    if (!isProjectManager) {
      toast("Bạn không có quyền thực hiện chức năng này", "warning");
      return;
    }
    setViewingTaskId(null);
    setSelectedParent({ id: null, name: null });
    setIsAddSubJobOpen(true);
  }, [isProjectManager, toast]);

  const handleAddChild = useCallback((row, id, name) => {
    isActionInProgress.current = true;
    setViewingTaskId(null);
    setSelectedParent({
      id,
      name,
      progress: row?.progress || 0,
      hasChildren: row?.flags?.hasChildren || row?.hasChildren || false,
      startDate: row?.startDate || null,
      endDate: row?.endDate || null
    });
    setIsAddSubJobOpen(true);
    setTimeout(() => {
      isActionInProgress.current = false;
    }, 100);
  }, []);

  const handleCloseAddSubJob = useCallback(() => {
    setIsAddSubJobOpen(false);
    setSelectedParent({ id: null, name: null });
  }, []);

  const handleCloseViewJob = useCallback(() => {
    setViewingTaskId(null);
    setViewingTaskData(null);
  }, []);

  const handleAddSubJobSuccess = async () => {
    handleCloseAddSubJob();
    setIsLoading(true);
    await handleFetchData({ page: 1, limit: 25 });
    setReloadTable(prev => !prev);
    setIsLoading(false);
    setIsUpdated?.(true);
  };

  const handleAssignSubTask = async (id) => {
    try {
      const response = await axiosInstance.get(`${API_ADD_COMMON_WORK}/${id}`);
      const taskData = response.data?.data || response.data || response;

      // Map data from new backend structure (assigners, directors, supporters, viewers)
      const mapUser = (u) => u ? { id: u.processId || u._id || u.id, name: u.name || u.processName } : null;
      const mapUsers = (list) => Array.isArray(list) ? list.map(mapUser) : [];

      const formattedData = {
        ...taskData,
        assigner: mapUser(taskData.assigners?.[0]),
        leader: mapUser(taskData.directors?.[0]),
        coordinators: mapUsers(taskData.supporters),
        viewers: mapUsers(taskData.viewers),
      };

      setIsUpdateParticipantOpen(true);
      setSelectedJobForUpdate(formattedData);
      setViewingTaskId(id);
    } catch (error) {
      toast("Không thể tải thông tin công việc", "error");
    }
  };

  const handleCloseUpdateParticipant = useCallback(() => {
    setViewingTaskId(null);
    setIsUpdateParticipantOpen(false);
  }, []);

  const handleViewSubTask = useCallback(async (idOrRow) => {
    if (isActionInProgress.current) return;
    // onSelectView truyền cả row object, onView truyền chỉ id
    const taskId = typeof idOrRow === "object"
      ? (idOrRow._id || idOrRow.id)
      : idOrRow;
    setViewingTaskId(taskId);
    // Nếu đã có đủ data trong row object thì dùng luôn, không cần fetch
    if (typeof idOrRow === "object" && idOrRow._id) {
      setViewingTaskData(idOrRow);
    }
    try {
      const response = await axiosInstance.get(`${API_ADD_COMMON_WORK}/${taskId}`);
      const taskData = response.data?.data || response.data || response;
      setViewingTaskData(taskData);
    } catch (error) {
      // Nếu fetch thất bại nhưng đã có row object thì vẫn hiển thị được
    }
  }, []);

  const handleOpenViewJobDialog = useCallback(async (idOrRow) => {
    const taskId = typeof idOrRow === "object"
      ? (idOrRow._id || idOrRow.id)
      : idOrRow;
    if (!taskId) return;
    
    try {
      const { getComponentByKey } = await import("@builder-table/components/componentRegistry");
      const { openDetailDialog } = await import("@components/GlobalDialogPortal");
      
      const componentInfo = getComponentByKey('VIEW_JOB_PROJECT');
      if (componentInfo) {
        openDetailDialog({
          ...componentInfo,
          defaultProps: {
            ...componentInfo.defaultProps,
            setReloadData: () => {
              setReloadTable((prev) => !prev);
            },
          }
        }, taskId, { sharedComponents, isFromProject: true, projectId: currentTaskId, projectDetail: displayData });
      }
    } catch (err) {
      logger.error("Error opening VIEW_JOB_PROJECT dialog:", err);
    }
  }, [handleFetchData, sharedComponents, currentTaskId, displayData]);

  const handleDeleteSubTasks = useCallback((ids) => {
    isActionInProgress.current = true;
    setSelectedSubTasks(Array.isArray(ids) ? ids : [ids]);
    setConfirmDeleteSubTask(true);
    setTimeout(() => {
      isActionInProgress.current = false;
    }, 100);
  }, []);

  const handleCloseConfirmDelete = useCallback(() => {
    setConfirmDeleteSubTask(false);
  }, []);

  const handleConfirmDeleteSubTasks = async () => {
    try {
      setIsLoading(true);
      await axiosInstance.delete(API_ADD_COMMON_WORK, { data: { ids: selectedSubTasks } });
      toast("Xóa công việc con thành công!", "success");
      await handleFetchData({ page: 1, limit: 500 });
      setReloadTable((prev) => !prev);
      setSelectedSubTasks([]);
      setConfirmDeleteSubTask(false);
      setIsUpdated?.(true);
    } catch (error) {
      toast(error?.response?.data?.message || "Xóa thất bại!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // const handleApprove = useCallback(async (id) => {
  //   try {
  //     const response = await axiosInstance.get(`${API_ADD_COMMON_WORK}/${id}`);
  //     const taskData = response.data?.data || response.data || response;
  //     setSelectedJobForApproval(taskData);
  //     setIsApprovalDialogOpen(true);
  //   } catch (error) {
  //     toast("Không thể tải thông tin công việc", "error");
  //   }
  // }, [toast]);

  const handleCloseApprovalDialog = useCallback(() => {
    setIsApprovalDialogOpen(false);
    setSelectedJobForApproval(null);
  }, []);

  const handleOpenFilter = useCallback((event) => {
    setFilterAnchorEl(event.currentTarget);
  }, []);

  const handleCloseFilter = useCallback(() => {
    setFilterAnchorEl(null);
  }, []);

  const handleAssigneeChange = useCallback((val) => {
    const userId = val?.userId || val?._id || val?.id || val;
    setAdvancedFilter((prev) => {
      if (prev.assignee === userId) return prev;
      return { ...prev, assignee: userId };
    });
  }, []);

  const handleAdvancedFilterChange = useCallback(
    (field) => (eventOrValue) => {
      let value;

      if (eventOrValue?.target) {
        // case input / checkbox
        value =
          eventOrValue.target.type === "checkbox"
            ? eventOrValue.target.checked
            : eventOrValue.target.value;
      } else {
        // case autocomplete
        value = eventOrValue;
      }

      setAdvancedFilter((prev) => {
        if (prev[field] === value) return prev;
        return { ...prev, [field]: value };
      });
    },
    []
  );

  const handleApplyFilter = useCallback(() => {
    setAppliedFilter(advancedFilter);
    handleCloseFilter();
  }, [advancedFilter, handleCloseFilter]);

  const handleResetFilter = useCallback(() => {
    setAdvancedFilter(initialFilter);
    setAppliedFilter(initialFilter);
  }, [initialFilter]);

  // Factory tạo handler toggle cho từng view (myAssign, myDirector, mySupporter)
  const makeToggle = useCallback((view, key) => () => {
    setPerViewToggle((prev) => ({
      ...prev,
      [view]: { ...prev[view], [key]: !prev[view][key] },
    }));
    if (view === 'list') {
      setAppliedFilter((prev) => ({ ...prev, [key]: !prev[key] }));
      setAdvancedFilter((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  }, []);

  // Pre-memoize handlers riêng cho từng view
  const handleMyAssignToggle     = useMemo(() => makeToggle('list', 'myAssign'),     [makeToggle]);
  const handleMyDirectorToggle   = useMemo(() => makeToggle('list', 'myDirector'),   [makeToggle]);
  const handleMySupporterToggle  = useMemo(() => makeToggle('list', 'mySupporter'),  [makeToggle]);

  const handleGanttMyAssign      = useMemo(() => makeToggle('gantt', 'myAssign'),    [makeToggle]);
  const handleGanttMyDirector    = useMemo(() => makeToggle('gantt', 'myDirector'),  [makeToggle]);
  const handleGanttMySupporter   = useMemo(() => makeToggle('gantt', 'mySupporter'), [makeToggle]);

  const handleKanbanMyAssign     = useMemo(() => makeToggle('kanban', 'myAssign'),   [makeToggle]);
  const handleKanbanMyDirector   = useMemo(() => makeToggle('kanban', 'myDirector'), [makeToggle]);
  const handleKanbanMySupporter  = useMemo(() => makeToggle('kanban', 'mySupporter'),[makeToggle]);

  const handleCalendarMyAssign   = useMemo(() => makeToggle('calendar', 'myAssign'),   [makeToggle]);
  const handleCalendarMyDirector = useMemo(() => makeToggle('calendar', 'myDirector'), [makeToggle]);
  const handleCalendarMySupporter= useMemo(() => makeToggle('calendar', 'mySupporter'),[makeToggle]);

  const activeTaskView         = useMemo(() => perViewToggle.list, [perViewToggle.list]);
  const ganttActiveTaskView    = useMemo(() => perViewToggle.gantt, [perViewToggle.gantt]);
  const kanbanActiveTaskView   = useMemo(() => perViewToggle.kanban, [perViewToggle.kanban]);
  const calendarActiveTaskView = useMemo(() => perViewToggle.calendar, [perViewToggle.calendar]);

  const handleStartDateFromChange = useCallback((dates) => {
    const [start, end] = dates || [null, null];
    setAdvancedFilter(prev => {
      if (prev.startDateFrom === start && prev.startDateTo === end) return prev;
      return { ...prev, startDateFrom: start, startDateTo: end };
    });
  }, []);

  const handleEndDateFromChange = useCallback((dates) => {
    const [start, end] = dates || [null, null];
    setAdvancedFilter(prev => {
      if (prev.endDateFrom === start && prev.endDateTo === end) return prev;
      return { ...prev, endDateFrom: start, endDateTo: end };
    });
  }, []);

  const handleGanttSearch = useCallback((query, code, timeType) => {
    if (timeType) {
      setAdvancedFilter(prev => {
        if (prev.timeType === timeType) return prev;
        return { ...prev, timeType };
      });
      setAppliedFilter(prev => {
        if (prev.timeType === timeType) return prev;
        return { ...prev, timeType };
      });
    }
    handleFetchData({ page: 1, limit: 500, query, code, timeType });
  }, [handleFetchData]);

  const renderAdvancedFilter = useCallback((options = {}) => {
    const { hideButton } = options;
    const { AsyncAutoCompleted } = sharedComponents;
    return (
      <>
        {!hideButton && (
          <AdvancedFilterButton
            startIcon={<FilterAltIcon />}
            onClick={handleOpenFilter}
          >
            Bộ Lọc
          </AdvancedFilterButton>
        )}
        <Popover
          open={Boolean(filterAnchorEl)}
          anchorEl={filterAnchorEl}
          onClose={handleCloseFilter}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          disableScrollLock
        >
          <FilterPopOverContainer>
            <FilterPopoverHeader>
              <Typography variant="h6">Bộ lọc</Typography>
              <FilterAltIcon />
            </FilterPopoverHeader>

            <FilterPopoverContent>
              <FilterGridContainer container spacing={2}>
                {/* Row 1 */}
                <Grid item xs={6}>
                  <FilterFormControlLabel
                    labelPlacement="start"
                    control={
                      <Checkbox
                        size="small"
                        checked={advancedFilter.overdue}
                        onChange={handleAdvancedFilterChange("overdue")}
                      />
                    }
                    label={<Typography variant="body2">Công việc quá hạn</Typography>}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FilterFormControlLabel
                    labelPlacement="start"
                    control={
                      <Checkbox
                        size="small"
                        checked={advancedFilter.myAssign}
                        onChange={handleAdvancedFilterChange("myAssign")}
                      />
                    }
                    label={<Typography variant="body2">Công việc tôi giao</Typography>}
                  />
                </Grid>

                {/* Row 3 */}
                <Grid item xs={12}>
                  <FilterLabel>Người thực hiện</FilterLabel>
                  <AsyncAutoCompleted
                    fullWidth
                    size="small"
                    placeholder="Tất cả"
                    url={`${API_PROJECT_MANAGEMENT}/${currentTaskId}/all-members`}
                    queryParam="name"
                    optionLabel="name"
                    optionValue="userId"
                    value={advancedFilter.assignee}
                    onChange={handleAssigneeChange}
                  />
                </Grid>

                {/* Row 3 */}

                <Grid item xs={6}>
                  <CustomDateRangePicker
                    label={"Ngày bắt đầu"}
                    start={advancedFilter.startDateFrom}
                    end={advancedFilter.startDateTo}
                    onChange={handleStartDateFromChange}
                  />
                </Grid>
                <Grid item xs={6}>
                  <CustomDateRangePicker
                    label={"Hạn kết thúc"}
                    start={advancedFilter.endDateFrom}
                    end={advancedFilter.endDateTo}
                    onChange={handleEndDateFromChange}
                  />
                </Grid>
                {/* Row 4 */}
                <Grid item xs={6}>
                  <FilterLabel>Trạng thái công việc</FilterLabel>
                  <CustomAutoCompleteSearch
                    fullWidth
                    size="small"
                    placeholder="Tất cả"
                    options={statusOptions}
                    optionLabel="title"
                    optionValue="value"
                    isMulti
                    limitTags={1}
                    value={advancedFilter.status}
                    onChange={handleAdvancedFilterChange("status")}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FilterLabel>Độ ưu tiên</FilterLabel>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    value={advancedFilter.priority}
                    onChange={handleAdvancedFilterChange("priority")}
                  >
                    <MenuItem value="all">Tất cả mức độ</MenuItem>
                    {urgencyOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.title}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </FilterGridContainer>
            </FilterPopoverContent>

            <FilterPopoverFooter>
              <FilterResetButton
                variant="outlined"
                size="small"
                onClick={handleResetFilter}
              >
                Đặt lại
              </FilterResetButton>
              <FilterActionWrapper>
                <FilterCancelButton
                  variant="outlined"
                  size="small"
                  onClick={handleCloseFilter}
                >
                  Hủy
                </FilterCancelButton>
                <FilterApplyButton
                  variant="contained"
                  size="small"
                  onClick={handleApplyFilter}
                >
                  Áp dụng lọc
                </FilterApplyButton>
              </FilterActionWrapper>
            </FilterPopoverFooter>
          </FilterPopOverContainer>
        </Popover>
      </>
    );
  }, [
    sharedComponents,
    filterAnchorEl,
    handleCloseFilter,
    advancedFilter,
    urgencyOptions,
    handleAssigneeChange,
    currentTaskId,
    handleOpenFilter,
    handleAdvancedFilterChange,
    handleApplyFilter,
    handleResetFilter,
    handleStartDateFromChange,

    handleEndDateFromChange,

  ]);

  const handleExport = async (format) => {
    try {
      setIsLoading(true);
      const params = {
        exportType: format === 'xlsx' ? 'excel' : format,
        "filter[projectId]": currentTaskId,
        typeTask: "project",
      };

      // Copy filter logic from handleFetchData
      const effectiveQuery = searchStateRef.current.query;
      const effectiveCode = searchStateRef.current.code;

      if (effectiveQuery && effectiveCode && Array.isArray(effectiveCode)) {
        effectiveCode.forEach((field) => {
          params[`filter[${field}]`] = effectiveQuery;
        });
      }

      if (appliedFilter.myTasks) params["filter[myJob]"] = appliedFilter.myTasks;
      if (appliedFilter.overdue) params["filter[overdueWork]"] = appliedFilter.overdue;

      const assigneeId = appliedFilter.assignee?.id || appliedFilter.assignee?._id || appliedFilter.assignee;
      if (assigneeId) params["filter[assignee]"] = assigneeId;

      if (appliedFilter.status !== "all") {
        params["filter[processStatus]"] = appliedFilter.status;
      }

      if (appliedFilter.startDateFrom) {
        params["filter[start_date_from][startDate]"] = dayjs(appliedFilter.startDateFrom).format("YYYY-MM-DD");
      }
      if (appliedFilter.startDateTo) {
        params["filter[start_date_from][endDate]"] = dayjs(appliedFilter.startDateTo).format("YYYY-MM-DD");
      }
      if (appliedFilter.endDateFrom) {
        params["filter[end_date_from][startDate]"] = dayjs(appliedFilter.endDateFrom).format("YYYY-MM-DD");
      }
      if (appliedFilter.endDateTo) {
        params["filter[end_date_from][endDate]"] = dayjs(appliedFilter.endDateTo).format("YYYY-MM-DD");
      }

      if (appliedFilter.priority !== "all") {
        params["filter[priority]"] = appliedFilter.priority;
      }

      if (appliedFilter.timeType) {
        params["filter[timeType]"] = appliedFilter.timeType;
      }

      const response = await axiosInstance.get(API_EXPORT_FILE_EXCEL_PROJECT, {
        params,
        responseType: 'blob',
      });

      // Use response directly because axiosInstance interceptor unwraps data
      const mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = response instanceof Blob ? response : new Blob([response], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'pdf' ? 'pdf' : 'xlsx';
      link.setAttribute('download', `DanhSachCongViec.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast("Xuất file thành công!", "success");
    } catch (error) {
      toast("Xuất file thất bại!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const calendarConfig = useMemo(() => ({
    props: {
      dateFieldKey: "startDate",
      endDateFieldKey: "endDate",
      configs: []
    },
    id: "calendar-job"
  }), []);

  const defaultCalendarValues = useMemo(() => [], []);

  return (
    <>
      <JobSubTaskHeader>
        <JobSectionTitle variant="h6" mt={0}>
        </JobSectionTitle>

        <ViewSwitcherContainer>
          <ViewSwitcherItem
            active={viewMode === "list"}
            onClick={handleViewModeChange("list")}
          >
            <ViewSwitcherLabel active={viewMode === "list"}>Danh sách</ViewSwitcherLabel>
          </ViewSwitcherItem>

          <ViewSwitcherItem
            active={viewMode === "gantt"}
            onClick={handleViewModeChange("gantt")}
          >
            <ViewSwitcherLabel active={viewMode === "gantt"}>Gantt</ViewSwitcherLabel>
          </ViewSwitcherItem>

          <ViewSwitcherItem
            active={viewMode === "kanban"}
            onClick={handleViewModeChange("kanban")}
          >
            <ViewSwitcherLabel active={viewMode === "kanban"}>Kanban</ViewSwitcherLabel>
          </ViewSwitcherItem>

          <ViewSwitcherItem
            active={viewMode === "calendar"}
            onClick={handleViewModeChange("calendar")}
          >
            <ViewSwitcherLabel active={viewMode === "calendar"}>Lịch</ViewSwitcherLabel>
          </ViewSwitcherItem>
        </ViewSwitcherContainer>
      </JobSubTaskHeader>



      {viewMode === "gantt" ? (
        <GanttExample
          data={subTasksData}
          enableDependencies={false}
          renderAfterSearch={renderAdvancedFilter}
          onSearch={handleGanttSearch}
          filterOptions={filterOptions}
          onAdd={handleOpenAddSubJob}
          disableAdd={!isProjectManager || isProjectCompletedCancelledOrPaused}
          onExport={handleExport}
          onAdvancedFilterClick={handleOpenFilter}
          addButtonLabel="Thêm công việc"
          onMyAssign={handleGanttMyAssign}
          onMyDirector={handleGanttMyDirector}
          onMySupporter={handleGanttMySupporter}
          activeTaskView={ganttActiveTaskView}
        />
      ) : (
        <JobSubTaskTableContainer>
          {viewMode === "list" && (
            <CustomTableBorderTreeJob
              columns={columns}
              fetchData={handleFetchData}
              filter={filterOptions}
              onAdd={handleOpenAddSubJob}
              onAddChild={!isProjectCompletedCancelledOrPaused ? handleAddChild : undefined}
              onAssign={isProjectManager && !isProjectCompletedCancelledOrPaused ? handleAssignSubTask : undefined}
              enableViewConfig
              codeModule="quanlycvpb"
              onView={handleOpenViewJobDialog}
              onSelectView={handleViewSubTask}
              onDelete={isProjectManager && !isProjectCompletedCancelledOrPaused ? handleDeleteSubTasks : undefined}
              disableAdd={!isProjectManager || isProjectCompletedCancelledOrPaused}
              disableDelete={!isProjectManager || isProjectCompletedCancelledOrPaused}
              // onApprove={handleApprove}
              disableTitle
              disableSynchronize
              reload={reloadTable}
              onExport={handleExport}
              renderAfterSearch={renderAdvancedFilter}
              onAdvancedFilterClick={handleOpenFilter}
              apiUrl={API_ADD_COMMON_WORK}
              setReloadData={setReloadTable}
              addButtonLabel="Thêm công việc"
              onMyAssign={handleMyAssignToggle}
              onMyDirector={handleMyDirectorToggle}
              onMySupporter={handleMySupporterToggle}
              activeTaskView={activeTaskView}
              isSortStart
              paramChildren={{
                "filter[myAssign]": appliedFilter.myAssign,
                "filter[myDirector]": appliedFilter.myDirector,
                "filter[mySupporter]": appliedFilter.mySupporter,
              }}
            />
          )}
          {viewMode === "kanban" && (
            <KanbanPage
              data={subTasksData}
              onSearch={handleGanttSearch}
              renderAfterSearch={renderAdvancedFilter}
              filterOptions={filterOptions}
              onAdd={handleOpenAddSubJob}
              disableAdd={!isProjectManager || isProjectCompletedCancelledOrPaused}
              onExport={handleExport}
              onAdvancedFilterClick={handleOpenFilter}
              addButtonLabel="Thêm công việc"
              mt={'15px'}
              onMyAssign={handleKanbanMyAssign}
              onMyDirector={handleKanbanMyDirector}
              onMySupporter={handleKanbanMySupporter}
              activeTaskView={kanbanActiveTaskView}
            />
          )}
          {viewMode === "calendar" && (
            <CustomTableBorderCalendarTree
              data={subTasksData}
              type="job"
              onSearch={handleGanttSearch}
              renderAfterSearch={renderAdvancedFilter}
              onAdvancedSearch={handleOpenFilter}
              filterOptions={filterOptions}
              dataColumn={columns}
              item={calendarConfig}
              defaultValues={defaultCalendarValues}
              addButtonLabel="Thêm công việc"
              onAdd={handleOpenAddSubJob}
              disableAdd={!isProjectManager || isProjectCompletedCancelledOrPaused}
              onExport={handleExport}
              onMyAssign={handleCalendarMyAssign}
              onMyDirector={handleCalendarMyDirector}
              onMySupporter={handleCalendarMySupporter}
              activeTaskView={calendarActiveTaskView}
            />
          )}
        </JobSubTaskTableContainer>
      )}

      <TaskDetailPanel
        open={!!viewingTaskId && !isUpdateParticipantOpen && !isAddSubJobOpen}
        onClose={handleCloseViewJob}
        dataDetail={viewingTaskData}
        setReloadData={() => {
          handleFetchData({ page: 1, limit: 500 });
          setReloadTable((prev) => !prev);
        }}
        typeJob="project"
        projectId={currentTaskId}
        projectDetail={displayData}
      />

      <AddNewJob
        open={isAddSubJobOpen}
        onClose={handleCloseAddSubJob}
        onSuccess={handleAddSubJobSuccess}
        title={selectedParent.id ? `Thêm công việc con cho: ${selectedParent.name}` : "Thêm mới công việc từ dự án"}
        parentId={selectedParent.id}
        parentName={selectedParent.name}
        parentProgress={selectedParent.progress}
        hasChildren={selectedParent.hasChildren}
        sharedComponents={sharedComponents}
        isFromProject
        projectId={currentTaskId}
        projectDetail={displayData}
        parentStartDate={displayData?.deadlineStartParentISO ?? displayData?.deadlineStartParent ?? displayData?.startDate}
        parentEndDate={displayData?.deadlineEndParentISO ?? displayData?.deadlineEndParent ?? displayData?.endDate}
        breadcrumbs={addJobBreadcrumbs}
        dataDetail={selectedParent.id ? subTasksData?.filter((item) => item.id === selectedParent.id) : null}
      />

      <UpdateJobDialog
        open={isUpdateParticipantOpen}
        onClose={handleCloseUpdateParticipant}
        type="participants"
        data={selectedJobForUpdate}
        dataDetail={selectedJobForUpdate}
        currentTaskId={viewingTaskId}
        fetchJobDetail={useCallback(async () => {
          setIsLoading(true);
          await handleFetchData({ page: 1, limit: 500 });
          setReloadTable((prev) => !prev);
          setIsLoading(false);
        }, [handleFetchData])}
        fetchHistory={() => { }}
        setIsUpdated={setIsUpdated}
        sharedComponents={sharedComponents}
        isFromProject
        projectId={currentTaskId}
        projectDetail={displayData}
      />

      <Dialog
        open={confirmDeleteSubTask}
        onClose={handleCloseConfirmDelete}
        onSave={handleConfirmDeleteSubTasks}
        title="Xác nhận xóa"
      >
        <Typography>Bạn có chắc chắn muốn xóa các công việc con đã chọn không?</Typography>
      </Dialog>

      <LoadingDialog open={isLoading}>
        <Typography>Đang tải dữ liệu...</Typography>
      </LoadingDialog>

      {/* Approval Dialog */}
      {isApprovalDialogOpen && selectedJobForApproval && (
        <FormButton
          dataDetail={selectedJobForApproval}
          setReloadData={() => {
            handleFetchData({ page: 1, limit: 500 });
            setReloadTable(prev => !prev);
          }}
          viewMode="jobGeneral"
          onClose={handleCloseApprovalDialog}
          open={isApprovalDialogOpen}
        />
      )}
    </>
  );
};

export default React.memo(JobProject);