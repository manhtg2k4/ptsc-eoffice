import React, { useCallback, useEffect, useMemo, useContext } from "react";
import dayjs from "dayjs";
import { Grid, styled, Dialog as MuiDialog, DialogContent as MuiDialogContent, DialogActions as MuiDialogActions, Button as MuiButton } from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import withSharedComponents from "@components/WrapperComponent";
import { API_ADD_COMMON_WORK, API_GET_COMMON_WORK_USER, API_PROJECT_MANAGEMENT, API_TEMPLATE } from "@EnvironmentFile/constants/urlConfig";
import { useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import LoadingDialog from "@components/LoadingDialog";
import { useToast } from "@components/common/ToastProvider";
import CustomInput from "@components/CustomInput/CustomInputBase";
import PopupTemplate from "@pages/WorkManagement/components/PopupTemplate";
import { calculateSiblingsDuration } from "@pages/TemplateSample/utils";

import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import { SkyCheckbox, SkyBox } from "@styles/SkyStyles";
import { BoldSkyFormControlLabel } from "./Job.styles";
import { AuthContext } from "@AuthContext/AuthProvider";

const SkyFlexEnd = styled(SkyBox)({
  display: "flex",
  justifyContent: "flex-end",
});

const GridCompactItem = styled(Grid)({
  paddingTop: "0 !important",
  marginBottom: "-15px",
  marginTop: "-15px",
});

const WarningHeader = styled(SkyBox)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  backgroundColor: '#0b6bcb', // Blue color matching screenshot 1
  color: '#ffffff',
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
});

const CustomWarningDialog = styled(MuiDialog)({
  '& .MuiPaper-root': {
    borderRadius: '4px',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '500px',
  }
});

const StyledWarningIcon = styled(WarningIcon)({
  color: '#ffb300',
  fontSize: '24px',
});

const StyledWarningDialogContent = styled(MuiDialogContent)({
  padding: '24px',
  textAlign: 'center',
  backgroundColor: '#ffffff',
});

const StyledWarningDialogActions = styled(MuiDialogActions)({
  padding: '16px 24px',
  backgroundColor: '#ffffff',
  justifyContent: 'flex-end',
  gap: '12px',
});

const CancelMuiButton = styled(MuiButton)({
  backgroundColor: '#e0e0e0',
  color: '#161616',
  textTransform: 'none',
  fontWeight: 'normal',
  padding: '6px 16px',
  borderRadius: '4px',
  boxShadow: 'none',
  '&:hover': {
    backgroundColor: '#d5d5d5',
  }
});

const ConfirmMuiButton = styled(MuiButton)({
  backgroundColor: '#0b6bcb',
  color: '#ffffff',
  textTransform: 'none',
  fontWeight: 'bold',
  padding: '6px 16px',
  borderRadius: '4px',
  boxShadow: 'none',
  '&:hover': {
    backgroundColor: '#0043ce',
  }
});


const UpdateJobDialog = ({
  open,
  onClose,
  data,
  type, // 'general' | 'participants' | 'status'
  fetchJobDetail,
  fetchHistory,
  setIsUpdated,
  currentTaskId,
  sharedComponents,
  documentId,
  isFromProject = false,
  projectId = null,
  projectDetail = null,
  hasPermission = {},
  startDateParent,
    endDateParent
}) => {
  const { Dialog, InputComponents } = sharedComponents;
  const { user: authUser } = useContext(AuthContext);
  const [isLoading, setIsLoading] = React.useState(false);
  const toast = useToast();
  const [allMembers, setAllMembers] = React.useState([]);

  const [openPopupTemplate, setOpenPopupTemplate] = React.useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = React.useState("");
  const [pendingPayload, setPendingPayload] = React.useState(null);
  const [jobDetails, setJobDetails] = React.useState(null);
  const [openCancelConfirm, setOpenCancelConfirm] = React.useState(false);
  const [pendingFormData, setPendingFormData] = React.useState(null);

  const { crmSource } = useSelector((state) => state.config);
  const urgencyOptions = useMemo(() =>
    crmSource.find((item) => item.code === "DOUUTIEN")?.data || [], [crmSource]);
  const timeOptions = useMemo(() =>
    crmSource.find((item) => item.code === "S34")?.data || [], [crmSource]);
  const statusOptions = useMemo(() =>
    crmSource.find((item) => item.code === "TTCV")?.data || [], [crmSource]);


  // Foundational callbacks
  const checkTemplateDuration = useCallback(async (data) => {
    const processId = data.process?.id || data.process?._id || data.process;
    if (!processId || !data.startDate || !data.deadline) return true;

    try {
      const res = await axiosInstance.get(`${API_TEMPLATE}/${processId}`);
      const templateData = res?.data?.data || res?.data || res || {};
      const tasks = templateData.tasks || [];

      if (tasks.length === 0) return true;

      const templateMinutes = calculateSiblingsDuration(tasks);
      const projectMinutes = dayjs(data.deadline).diff(dayjs(data.startDate), "minute");

      if (templateMinutes > projectMinutes) {
        setSelectedTemplateName(templateData.name || "Quy trình mẫu");
        return false;
      }
    } catch (error) {
      // Logic error handling
    }
    return true;
  }, []);

  const handleClosePopupTemplate = useCallback(() => {
    setOpenPopupTemplate(false);
    setPendingPayload(null);
    setSelectedTemplateName("");
  }, []);

  const handleTemplateChange = useCallback((field) => (val) => {
    field.onChange(val);
    setSelectedTemplateName(val?.name || "");
  }, []);

  // handleSaveUpdate needs to be defined BEFORE handleConfirmBypassTemplate
  const handleSaveUpdate = useCallback(async (updatedData, bypassFlag = false) => {
    const isBypass = typeof bypassFlag === 'boolean' ? bypassFlag : false;
    const getVal = (val) => val?.processId || val?._id || val?.id || (typeof val === 'string' ? val : null);

    try {
      setIsLoading(true);

      if (type === 'general' && !isBypass && updatedData.process) {
        const isDurationValid = await checkTemplateDuration(updatedData);
        if (!isDurationValid) {
          setPendingPayload(updatedData);
          setOpenPopupTemplate(true);
          setIsLoading(false);
          return;
        }
      }

      const id = currentTaskId || documentId?.id;
      if (!id) throw new Error("ID công việc không tồn tại");

      let payload = {};

      if (type === 'status') {
        const selectedOption = statusOptions.find(opt => String(opt.value) === String(updatedData.status));
        const statusTitle = (selectedOption?.title || "").toLowerCase();
        const isCancelStatus = statusTitle.includes("hủy") || statusTitle.includes("huỷ") || updatedData.status === "8";

        if (isCancelStatus) {
          const currentUserId = authUser?.user?._id || authUser?.user?.id || authUser?._id || authUser?.id;
          const getValId = (val) => val?._id || val?.id || val?.processId || (typeof val === 'string' ? val : null);
          const formAssigner = watch ? watch("assigner") : null;
          const assignerId = getValId(formAssigner) || jobDetails?.assigners?.[0]?.processId || jobDetails?.assigners?.[0]?.id || jobDetails?.assigners?.[0]?._id || jobDetails?.assigner?.id || jobDetails?.assigner?._id || jobDetails?.assigner;
          const isAssigner = currentUserId && assignerId && String(currentUserId).toLowerCase() === String(assignerId).toLowerCase();

          if (!isAssigner) {
            toast("Chỉ người giao việc mới được cập nhật trạng thái công việc sang Hủy", "error");
            setIsLoading(false);
            return;
          }
        }

        let processStatus = updatedData.status;

        if (statusTitle.includes("hoàn thành")) {
          processStatus = "4";
        } else if (isCancelStatus) {
          processStatus = "8";
        }
        payload = { processStatus };
      } else if (type === 'general') {
        payload = {
          name: updatedData.taskName,
          priority: updatedData.priority,
          topic: updatedData.topic,
          note: updatedData.description,
          processStatus: updatedData.status,
          reminderTime: updatedData.reminderTime,
          templateId: updatedData.process ? getVal(updatedData.process) : null,
          bypassTemplateTimeValidation: isBypass
        };
      } else if (type === 'participants') {
        payload = {
          assigners: updatedData.assigner ? [{ processId: getVal(updatedData.assigner) }] : [],
          directors: updatedData.leader ? [{
            processId: getVal(updatedData.leader),
            name: updatedData.leader?.name || '',
            type: 1
          }] : [],
          supporters: Array.isArray(updatedData.coordinators) ? updatedData.coordinators.map(id => ({
            processId: getVal(id),
            type: 1
          })) : [],
          viewers: Array.isArray(updatedData.viewers) ? updatedData.viewers.map(id => ({
            processId: getVal(id)
          })) : [],
          isApprovalRequired: !!updatedData.isApprovalRequired,
        };
      }

      payload.isTaskProject = true;

      await axiosInstance.patch(`${API_ADD_COMMON_WORK}/${id}`, payload);
      toast("Cập nhật công việc thành công!", "success");

      onClose();
      if (typeof fetchHistory === 'function') fetchHistory();
      if (typeof fetchJobDetail === 'function') fetchJobDetail();
      if (typeof setIsUpdated === 'function') setIsUpdated(true);
    } catch (error) {
      toast(error?.response?.data?.message || error.message || "Cập nhật thất bại!", "error");
    } finally {
      setIsLoading(false);
    }
  }, [type, currentTaskId, documentId, statusOptions, onClose, fetchHistory, fetchJobDetail, setIsUpdated, toast, checkTemplateDuration]);

  const handleConfirmBypassTemplate = useCallback(async () => {
    if (pendingPayload) {
      setOpenPopupTemplate(false);
      await handleSaveUpdate(pendingPayload, true);
    }
  }, [pendingPayload, handleSaveUpdate]);

  // Tạo projectParticipants từ dữ liệu dự án
  const projectParticipants = useMemo(() => {
    const mapUser = (u) => {
      if (!u) return null;
      return {
        id: u.userId || u.id || u._id,
        _id: u.userId || u.id || u._id,
        name: u.name || u.fullName,
        parentName: u.parentName || u.parent?.name || u.departmentName,
        email: u.email || "",
      };
    };

    if (isFromProject && Array.isArray(allMembers) && allMembers.length > 0) {
      const allUnique = [];
      const seenIds = new Set();
      allMembers.forEach(m => {
        const id = m.userId || m.id || m._id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          const mapped = mapUser(m);
          if (mapped.id) allUnique.push(mapped);
        }
      });

      return {
        manager: allMembers.filter(m => m.role === 'manager').map(mapUser).filter(Boolean),
        members: allMembers.filter(m => m.role === 'member').map(mapUser).filter(Boolean),
        viewers: allMembers.filter(m => m.role === 'viewer').map(mapUser).filter(Boolean),
        all: allUnique,
      };
    }

    if (!projectDetail) return { manager: [], members: [], viewers: [], all: [] };

    // Xử lý trường hợp managerId có thể là object hoặc array hoặc id đơn lẻ
    let managers = [];
    if (projectDetail.managerId) {
      if (Array.isArray(projectDetail.managerId)) {
        managers = projectDetail.managerId.map(mapUser).filter(Boolean);
      } else {
        const mapped = mapUser(projectDetail.managerId);
        if (mapped) managers = [mapped];
      }
    }

    const members = Array.isArray(projectDetail.members) ? projectDetail.members.map(mapUser).filter(Boolean) : [];
    const viewers = Array.isArray(projectDetail.viewers) ? projectDetail.viewers.map(mapUser).filter(Boolean) : [];

    const allUniqueFallback = [];
    const seenIdsFallback = new Set();
    [...managers, ...members, ...viewers].forEach(u => {
      const id = u.id || u._id;
      if (id && !seenIdsFallback.has(id)) {
        seenIdsFallback.add(id);
        allUniqueFallback.push(u);
      }
    });

    return { manager: managers, members, viewers, all: allUniqueFallback };
  }, [projectDetail, allMembers, isFromProject]);

  // Fetch danh sách người tham gia từ dự án
  const fetchAllMembers = useCallback(async (pId) => {
    try {
      const response = await axiosInstance.get(`${API_PROJECT_MANAGEMENT}/${pId}/all-members`);
      const dataRes = response?.data || response;
      if (Array.isArray(dataRes)) {
        setAllMembers(dataRes);
      }
    } catch (error) {
      logger.error("Error fetching all members:", error);
    }
  }, []);

  // Fetch dữ liệu khi projectId thay đổi và dialog đang mở
  useEffect(() => {
    if (open && isFromProject && projectId) {
      fetchAllMembers(projectId);
    }
  }, [open, isFromProject, projectId, fetchAllMembers]);

  const stripHtml = (html) => {
    if (!html || typeof html !== 'string') return html;
    if (!html.includes('<')) return html;
    const match = html.match(/>([^<]+)</);
    return match ? match[1].trim() : html;
  };

  // Fetch chi tiết công việc khi mở dialog
  useEffect(() => {
    if (open && (data?.id || data?._id || currentTaskId || documentId?.id)) {
      const id = data?.id || data?._id || currentTaskId || documentId?.id;

      // Load dữ liệu tạm thời từ row data trước
      setJobDetails(data);

      const fetchDetails = async () => {
        try {
          // Sử dụng endpoint chuẩn để lấy chi tiết công việc
          const res = await axiosInstance.get(`${API_ADD_COMMON_WORK}/${id}`);
          const detail = res?.data?.data || res?.data || res;
          if (detail) {
            setJobDetails(detail);
          }
        } catch (err) {
          logger.error("UpdateJobDialogNew - Fetch Detail Error:", err);
        }
      };
      fetchDetails();
    }
  }, [open, data, currentTaskId, documentId]);

  // Schema validation tùy theo loại cập nhật
  const schema = useMemo(() => yup.object().shape({
    ...(type === 'general' && {
      taskName: yup.string().required("Vui lòng nhập tên công việc").trim(),
      deadline: yup.date().required("Vui lòng chọn hạn xử lý").typeError("Hạn xử lý không hợp lệ"),
    }),
    ...(type === 'participants' && {
      assigner: yup.mixed().required("Vui lòng chọn người giao việc"),
    }),
    ...(type === 'status' && {
      status: yup.string().required("Vui lòng chọn trạng thái"),
    }),
  }), [type]);

  const {
    control,
    handleSubmit,
    reset,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      viewers: [],
      isApprovalRequired: false,
    },
  });

  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setValue("startDate", startDate, { shouldValidate: true });
    setValue("deadline", endDate, { shouldValidate: true });
    setTimeout(() => trigger(["startDate", "deadline"]), 0);
  }, [setValue, trigger]);


  const watchAssigner = watch("assigner");
  const watchLeader = watch("leader");
  const watchCoordinators = watch("coordinators");
  // const watchViewers = watch("viewers");

  const getId = (val) => val?._id || val?.id || val?.processId || (typeof val === 'string' ? val : null);

  const filteredStatusOptions = useMemo(() => {
    const currentUserId = authUser?.user?._id || authUser?.user?.id || authUser?._id || authUser?.id;
    const getValId = (val) => val?._id || val?.id || val?.processId || (typeof val === 'string' ? val : null);
    const formAssigner = watch ? watch("assigner") : null;
    const assignerId = getValId(formAssigner) || jobDetails?.assigners?.[0]?.processId || jobDetails?.assigners?.[0]?.id || jobDetails?.assigners?.[0]?._id || jobDetails?.assigner?.id || jobDetails?.assigner?._id || jobDetails?.assigner;
    const isAssigner = currentUserId && assignerId && String(currentUserId).toLowerCase() === String(assignerId).toLowerCase();

    if (isAssigner) {
      return statusOptions;
    }
    return statusOptions.filter(opt => {
      const title = (opt.title || "").toLowerCase();
      return !title.includes("hủy") && !title.includes("huỷ") && opt.value !== "8";
    });
  }, [statusOptions, authUser, jobDetails, watch]);

  const isProjectMember = useMemo(() => {
    if (!isFromProject || !authUser?.user || !projectParticipants) return false;
    const currentUserId = String(authUser.user._id || authUser.user.id);
    const isManager = projectParticipants.manager.some(m => String(m.id || m._id) === currentUserId);
    return !isManager; 
  }, [isFromProject, authUser, projectParticipants]);

  const shouldHideCoordinators = useMemo(() => {
    const assignerId = getId(watchAssigner);
    const leaderId = getId(watchLeader);
    const isHostAssigner = assignerId && leaderId && String(assignerId) === String(leaderId);
    return isHostAssigner || isProjectMember;
  }, [watchAssigner, watchLeader, isProjectMember]);

  useEffect(() => {
    if (shouldHideCoordinators && Array.isArray(watchCoordinators) && watchCoordinators.length > 0) {
      setValue("coordinators", [], { shouldValidate: true });
    }
  }, [shouldHideCoordinators, watchCoordinators, setValue]);

  const leaderExcludeIds = useMemo(() => {
    return "";
  }, []);

  const coordinatorExcludeIds = useMemo(() => {
    const ids = [];
    const leaderId = getId(watchLeader);
    if (leaderId) ids.push(leaderId);
    const assignerId = getId(watchAssigner);
    if (assignerId) ids.push(assignerId);
    return ids.join(",");
  }, [watchLeader, watchAssigner]);

  const viewerExcludeIds = useMemo(() => {
    const ids = [];
    const leaderId = getId(watchLeader);
    if (leaderId) ids.push(leaderId);
    const assignerId = getId(watchAssigner);
    if (assignerId) ids.push(assignerId);
    if (Array.isArray(watchCoordinators)) {
      watchCoordinators.forEach((item) => {
        const id = getId(item);
        if (id) ids.push(id);
      });
    }
    return ids.join(",");
  }, [watchLeader, watchAssigner, watchCoordinators]);

  const coordinatorProjectOptions = useMemo(() => {
    if (!isFromProject) return undefined;
    const candidates = [...projectParticipants.manager, ...projectParticipants.members];
    const unique = candidates.reduce((acc, current) => {
      const x = acc.find(item => String(item.id || item._id) === String(current.id || current._id));
      if (!x) return acc.concat([current]);
      return acc;
    }, []);
    const excludes = coordinatorExcludeIds.split(',').filter(Boolean);
    return unique.filter(u => {
      const id = String(u?._id || u?.id);
      return !excludes.includes(id);
    });
  }, [isFromProject, projectParticipants, coordinatorExcludeIds]);

  const viewerProjectOptions = useMemo(() => {
    if (!isFromProject) return undefined;
    const candidates = [...projectParticipants.manager, ...projectParticipants.members, ...projectParticipants.viewers];
    const unique = candidates.reduce((acc, current) => {
      const x = acc.find(item => String(item.id || item._id) === String(current.id || current._id));
      if (!x) return acc.concat([current]);
      return acc;
    }, []);
    const excludes = viewerExcludeIds.split(',').filter(Boolean);
    return unique.filter(u => {
      const id = String(u?._id || u?.id);
      return !excludes.includes(id);
    });
  }, [isFromProject, projectParticipants, viewerExcludeIds]);


  // Reset form khi mở dialog hoặc khi data thay đổi
  useEffect(() => {
    if (open && jobDetails) {
      const formattedData = { ...jobDetails };

      // Map tên công việc nếu cần
      if (!formattedData.taskName && formattedData.name) {
        formattedData.taskName = formattedData.name;
      }

      // Map hạn xử lý (deadline) và mô tả (description) từ API (endDate và note)
      if (!formattedData.deadline && formattedData.endDate) {
        formattedData.deadline = formattedData.endDate;
      }
      if (!formattedData.description && formattedData.note) {
        formattedData.description = formattedData.note;
      }

      // Logic mapping Quy trình (process) - CustomAsyncAutoComplete cần object {id, name}
      // Ưu tiên lấy từ templateId/templateName có trong jobDetails
      const processId = jobDetails.templateId || (typeof jobDetails.template === 'object' ? (jobDetails.template.id || jobDetails.template._id) : (jobDetails.template || jobDetails.process));
      const processName = jobDetails.templateName || jobDetails.processName || (typeof jobDetails.template === 'object' ? jobDetails.template.name : null);

      if (processId) {
        formattedData.process = {
          id: processId,
          name: stripHtml(processName) || "Quy trình đã chọn",
          _id: processId
        };
      }

      // Mapping các trường người tham gia từ định dạng của API chi tiết (assigners, directors, supporters, viewers)
      const mapUser = (u) => {
        if (!u) return null;
        const id = u.processId || u.id || u._id || u.userId;
        const name = u.name || u.fullName || u.userName || "N/A";
        const parentName = u.parentName || u.parent?.name || u.departmentName;
        return id ? { id, _id: id, name, parentName } : null;
      };

      if (jobDetails.assigners && Array.isArray(jobDetails.assigners) && jobDetails.assigners.length > 0) {
        formattedData.assigner = mapUser(jobDetails.assigners[0]);
      } else if (jobDetails.assigner) {
        formattedData.assigner = mapUser(jobDetails.assigner);
      }

      if (jobDetails.directors && Array.isArray(jobDetails.directors) && jobDetails.directors.length > 0) {
        formattedData.leader = mapUser(jobDetails.directors[0]);
      } else if (jobDetails.leader) {
        formattedData.leader = mapUser(jobDetails.leader);
      }

      if (jobDetails.supporters && Array.isArray(jobDetails.supporters)) {
        formattedData.coordinators = jobDetails.supporters.map(mapUser).filter(Boolean);
      } else if (jobDetails.coordinators) {
        formattedData.coordinators = jobDetails.coordinators.map(mapUser).filter(Boolean);
      }

      if (jobDetails.viewers && Array.isArray(jobDetails.viewers)) {
        formattedData.viewers = jobDetails.viewers.map(mapUser).filter(Boolean);
      }
      formattedData.isApprovalRequired = !!jobDetails.isApprovalRequired;
      reset(formattedData);
    }
  }, [open, jobDetails, reset]);

  const handleSaveForm = useCallback((formData) => {
    if (type === 'status') {
      const selectedOption = statusOptions.find(opt => String(opt.value) === String(formData.status));
      const statusTitle = (selectedOption?.title || "").toLowerCase();
      const isCancelStatus = statusTitle.includes("hủy") || statusTitle.includes("huỷ") || formData.status === "8";
      const isCompleteStatus = statusTitle.includes("hoàn thành") || formData.status === "4";
      if (isCancelStatus || isCompleteStatus) {
        setPendingFormData(formData);
        setOpenCancelConfirm(true);
        return;
      }
    }
    handleSaveUpdate(formData);
  }, [handleSaveUpdate, type, statusOptions]);

  const handleConfirmCancel = useCallback(() => {
    setOpenCancelConfirm(false);
    if (pendingFormData) {
      handleSaveUpdate(pendingFormData);
    }
  }, [pendingFormData, handleSaveUpdate]);

  const handleCloseCancelConfirm = useCallback(() => {
    setOpenCancelConfirm(false);
  }, []);

  const getParsedDate = useCallback((val) => {
      if (!val) return null;
      const parsed = dayjs(val, ["DD/MM/YYYY HH:mm", "DD/MM/YYYY", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"], true);
      return parsed.isValid() ? parsed : dayjs(val);
    }, []);

  return (
    <>
      <Dialog
        title={
          type === "general" ? "Cập nhật thông tin chung"
            : type === "participants" ? "Cập nhật thông tin người tham gia"
              : "Cập nhật trạng thái"
        }
        open={open}
        onClose={onClose}
        onSave={handleSubmit(handleSaveForm)}
        type="edit"
        isLoading={isLoading}
        size={type === "status" ? "xs" : "xl"}
      >
        <Grid container spacing={2} mt={0}>
          {type === "general" && (
            <>
              <Grid item xs={12} md={4}>
                <Controller
                  name="taskName"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      label="Tên công việc"
                      {...field}
                      required
                      error={!!errors.taskName}
                      helperText={errors.taskName?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <DateTimeRangePicker
                  showTime
                  label="Ngày bắt đầu - Hạn xử lý"
                  value={{
                    startDate: watch("startDate"),
                    endDate: watch("deadline"),
                  }}
                  onChange={handleDateRangeChange}
                  minDate={startDateParent ? getParsedDate(startDateParent) : dayjs()}
                  maxDate={endDateParent ? getParsedDate(endDateParent) : undefined}
                  startLabel="Ngày bắt đầu"
                  endLabel="Hạn xử lý"
                  required
                  error={!!(errors.startDate || errors.deadline)}
                  helperText={errors.startDate?.message || errors.deadline?.message}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="reminderTime"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      select
                      label="Thời gian nhắc hạn"
                      placeholder="Chọn thời gian nhắc hạn..."
                      options={timeOptions}
                      customLabel="title"
                      customValue="value"
                      {...field}
                      error={!!errors.reminderTime}
                      helperText={errors.reminderTime?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="process"
                  control={control}
                  render={({ field }) => (
                    <CustomAsyncAutoComplete
                      isSearchText
                      url={API_TEMPLATE}
                      label="Quy trình"
                      placeholder="Chọn quy trình mẫu..."
                      queryParam="filter[name]"
                      optionLabel="name"
                      optionValue="id"
                      {...field}
                      onChange={handleTemplateChange(field)}
                      disabled={!!data?.process || !!data?.templateId}
                      error={!!errors.process}
                      helperText={errors.process?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <CustomInput
                      select
                      label="Độ ưu tiên"
                      placeholder="Nhập dữ liệu..."
                      options={urgencyOptions}
                      optionLabel="title"
                      optionValue="value"
                      {...field}
                      error={!!errors.priority}
                      helperText={errors.priority?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <InputComponents
                  label="Thuộc dự án"
                  value={projectDetail?.name || data?.projectName || data?.project?.name || ""}
                  disabled
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      label="Mô tả"
                      multiline
                      rows={4}
                      {...field}
                    />
                  )}
                />
              </Grid>
            </>
          )}

          {type === "participants" && (
            <>
              <GridCompactItem item xs={12}>
                <SkyFlexEnd>
                  <Controller
                    name="isApprovalRequired"
                    control={control}
                    render={({ field }) => (
                      <BoldSkyFormControlLabel
                        control={
                          <SkyCheckbox
                            {...field}
                            checked={!!field.value}
                          />
                        }
                        label="Xác nhận hoàn thành"
                        labelPlacement="start"
                      />
                    )}
                  />
                </SkyFlexEnd>
              </GridCompactItem>
              <Grid item xs={12} md={6}>
                <Controller
                  name="assigner"
                  control={control}
                  render={({ field }) => (
                    <CustomAsyncAutoComplete
                      label="Người giao việc"
                      placeholder="Tìm kiếm"
                      {...field}
                      url={isFromProject ? "" : `${API_GET_COMMON_WORK_USER}?typeTaskUser=assigner`}
                      {...(isFromProject && { options: projectParticipants.all })}
                      disabled={isFromProject}
                      queryParams={["name", "email"]}
                      optionLabel="name"
                      optionValue="_id"
                      optionSubLabel="parentName"
                      required
                      error={!!errors.assigner}
                      helperText={errors.assigner?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="leader"
                  control={control}
                  render={({ field }) => (
                    <CustomAsyncAutoComplete
                      {...field}
                      label="Người chủ trì"
                      url={isFromProject ? "" : `${API_GET_COMMON_WORK_USER}?typeTaskUser=director&excludeId=${leaderExcludeIds}`}
                      options={isFromProject ? (() => {
                        if (isProjectMember) {
                          const currentUser = authUser?.user ? {
                            _id: authUser.user._id || authUser.user.id,
                            id: authUser.user._id || authUser.user.id,
                            name: authUser.user.name || authUser.user.fullName || "Tôi",
                          } : null;
                          return currentUser ? [currentUser] : [];
                        }

                        const candidates = [...projectParticipants.manager, ...projectParticipants.members];
                        const assignerId = getId(watchAssigner);
                        if (assignerId) {
                          const alreadyExists = candidates.some(u => String(u.id || u._id) === String(assignerId));
                          if (!alreadyExists) {
                            const assignerObj = projectParticipants.all.find(u => String(u.id || u._id) === String(assignerId));
                            if (assignerObj) candidates.push(assignerObj);
                          }
                        }
                        const unique = candidates.reduce((acc, current) => {
                          const x = acc.find(item => String(item.id || item._id) === String(current.id || current._id));
                          if (!x) return acc.concat([current]);
                          return acc;
                        }, []);
                        return unique.filter(u => {
                          const id = u?._id || u?.id;
                          return !leaderExcludeIds.split(',').filter(Boolean).includes(String(id));
                        });
                      })() : undefined}
                      queryParams={["name", "email"]}
                      optionLabel="name"
                      optionValue="_id"
                      optionSubLabel="parentName"
                    />
                  )}
                />
              </Grid>

              {(!hasPermission?.disableSuporter && !shouldHideCoordinators) && <Grid item xs={12} md={6}>
                <Controller
                  name="coordinators"
                  control={control}
                  render={({ field }) => (
                    <CustomAsyncAutoComplete
                      {...field}
                      label="Người phối hợp"
                      url={isFromProject ? "" : `${API_GET_COMMON_WORK_USER}?typeTaskUser=supporter&excludeId=${coordinatorExcludeIds}`}
                      options={isFromProject ? coordinatorProjectOptions : undefined}
                      queryParams={["name", "email"]}
                      optionLabel="name"
                      isMulti
                      limitTags={2}
                      optionValue="_id"
                      optionSubLabel="parentName"
                    />
                  )}
                />
              </Grid>
              }

              <Grid item xs={12} md={6}>
                <Controller
                  name="viewers"
                  control={control}
                  render={({ field }) => (
                    <CustomAsyncAutoComplete
                      isMulti
                      label="Người xem"
                      placeholder="Tìm kiếm"
                      {...field}
                      url={isFromProject ? "" : `${API_GET_COMMON_WORK_USER}?typeTaskUser=viewer&excludeId=${viewerExcludeIds}`}
                      options={isFromProject ? viewerProjectOptions : undefined}
                      queryParams={["name", "email"]}
                      optionLabel="name"
                      optionValue="_id"
                      optionSubLabel="parentName"
                      limitTags={2}
                    />
                  )}
                />
              </Grid>
            </>
          )}

          {type === "status" && (
            <Grid item xs={12}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Trạng thái"
                    placeholder="Chọn trạng thái công việc..."
                    options={filteredStatusOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                    error={!!errors.status}
                    helperText={errors.status?.message}
                  />
                )}
              />
            </Grid>
          )}
        </Grid>
        <LoadingDialog open={isLoading} >
          Đang tải tài liệu, vui lòng đợi...
        </LoadingDialog>
      </Dialog>
      <PopupTemplate
        open={openPopupTemplate}
        onClose={handleClosePopupTemplate}
        onSave={handleConfirmBypassTemplate}
        templateName={selectedTemplateName}
      />
      {openCancelConfirm && (
        <CustomWarningDialog
          open={openCancelConfirm}
          onClose={handleCloseCancelConfirm}
        >
          <WarningHeader>
            <StyledWarningIcon />
            THÔNG BÁO
          </WarningHeader>
          <StyledWarningDialogContent>
            <p style={{ fontWeight: 'bold', fontSize: '15px', color: '#161616', marginBottom: '12px', lineHeight: '1.6', marginTop: 0 }}>
              Xác nhận cập nhật trạng thái công việc, người dùng sẽ không cập nhật được trạng thái khác khi ở trạng thái <span style={{ color: '#198038' }}>Hoàn thành</span> hoặc <span style={{ color: '#da1e28' }}>Hủy</span>
            </p>
            <p style={{ fontSize: '14px', color: '#525252', margin: 0 }}>
              Tác vụ này sẽ không thể hoàn tác
            </p>
          </StyledWarningDialogContent>
          <StyledWarningDialogActions>
            <CancelMuiButton onClick={handleCloseCancelConfirm}>
              Hủy
            </CancelMuiButton>
            <ConfirmMuiButton
              onClick={handleConfirmCancel}
              variant="contained"
              disabled={isLoading}
            >
              ĐỒNG Ý
            </ConfirmMuiButton>
          </StyledWarningDialogActions>
        </CustomWarningDialog>
      )}
    </>
  );
};

export default withSharedComponents(UpdateJobDialog);