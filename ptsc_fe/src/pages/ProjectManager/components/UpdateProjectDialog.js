import React, { useCallback, useEffect } from "react";
import { Grid } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import withSharedComponents from "@components/WrapperComponent";
import { API_GET_LIST_USERS, API_PROJECT_MANAGEMENT, API_TEMPLATE_SAMPLE } from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import { withFormWrapper, FormItem } from "@components/common/FormWrapper";
import { 
    StyledCustomInput, 
    WrapChipContainer, 
    MemberCardWrapper,
    MoreMembersBadge,
    ClearableInputAdornment,
    ClearIconButton, 
} from "@styles/PopupTableMembersProject/PopupTableMembersProject.style";
import { SkyIconButton, SkyTooltip } from "@styles/SkyStyles";
import PopupTableMembersProject from "./PopupTableMembersProject";

const fixedStatusOptions = [
  { value: "1", title: "Chuẩn bị" },
  { value: "2", title: "Đang thực hiện" },
  { value: "3", title: "Hoàn thành" },
  { value: "4", title: "Hủy" },
  { value: "5", title: "Tạm dừng" },
];

const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return html;
  if (!html.includes('<')) return html;
  const match = html.match(/>([^<]+)</);
  return match ? match[1].trim() : html;
};

const UpdateProjectDialog = ({
  open,
  onClose,
  onSave,
  data,
  type, // 'general' | 'participants' | 'status'
  isLoading,
  sharedComponents,
  fetchJobDetail
}) => {
  const { Dialog, InputComponents } = sharedComponents;

  const WrappedAsyncAutoComplete = React.useMemo(() => {
    const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedAsyncAutoComplete";
    return Component;
  }, []);

  // Schema validation tùy theo loại cập nhật
  const schema = yup.object().shape({
    ...(type === 'general' && {
      taskName: yup.string()
        .required("Vui lòng nhập tên dự án, hạng mục đầu tư")
        .max(500, "Tên dự án, hạng mục đầu tư không được vượt quá 500 ký tự"),
      endDate: yup.date().required("Vui lòng chọn ngày kết thúc").typeError("Ngày kết thúc không hợp lệ"),
      budget: yup.string()
        .matches(/^[0-9.]*$/, "Chỉ cho phép nhập số")
        .max(50, "Tổng mức đầu tư không được vượt quá 50 ký tự")
        .nullable()
        .default("0"),
      moneyUnit: yup.mixed().nullable(),
      description: yup.string().nullable().max(3000, "Mô tả không được vượt quá 3000 ký tự"),
    }),
    ...(type === 'participants' && {
      manager: yup.mixed().required("Vui lòng chọn người quản lý"),
    }),
    ...(type === 'status' && {
      status: yup.string().required("Vui lòng chọn trạng thái"),
    }),
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      process: null,
      taskName: "",
      manager: [],
      members: [],
      viewers: [],
      budget: 0,
      moneyUnit: "",
    },
  });
  const [projectDetails, setProjectDetails] = React.useState(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [userByOrganizationUnits, setUserByOrganizationUnits] = React.useState([]);
  const [userOptions, setUserOptions] = React.useState([]);

  useEffect(() => {
    const fetchUserOptions = async () => {
      try {
        const response = await axiosInstance.get(`${API_GET_LIST_USERS}/all`);
        const data = response?.data?.data || response?.data || response || [];
        setUserOptions(data);
      } catch (error) {
        logger.error("Lỗi khi lấy danh sách người dùng:", error);
      }
    };
    fetchUserOptions();
  }, []);

  const getChipLabel = useCallback((item) => {
    const name = item.name || item.fullName || item.id;
    return item.groupName ? `${name} (${item.groupName})` : name;
  }, []);
  const getFullChipLabel = useCallback((item) => {
    const name = item.name || item.fullName || item.id;
    return item.groupName ? `${name} (${item.groupName})` : name;
  }, []);
  const getMemberName = useCallback((item) => {
    return item.name || item.fullName || item.id;
  }, []);
  const getMemberGroup = useCallback((item) => {
    return item.groupName || item.organizationUnitName || item.departmentName || item.parentName || (item.parent && item.parent.name) || "";
  }, []);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSaveMembers = useCallback((users) => {
    setUserByOrganizationUnits(users);
    setValue('members', users, { shouldValidate: true });
    handleCloseDialog();
  }, [setValue]);

  const handleDeleteChip = useCallback((e, item) => {
    e?.stopPropagation();
    const membersList = watch("members") || [];
    const newList = membersList.filter(u => (u.id || u._id) !== (item.id || item._id));
    setUserByOrganizationUnits(newList);
    setValue("members", newList, { shouldValidate: true });
  }, [watch, setValue]);

  const handleClearMembers = useCallback((e) => {
    e?.stopPropagation();
    setUserByOrganizationUnits([]);
    setValue("members", [], { shouldValidate: true });
  }, [setValue]);

  const members = watch("members") || [];
  const selectValue = React.useMemo(() => {
    const filteredData = (members || []).filter(u => !u.isDepartment);
    return {
      data: filteredData,
      value: Array.isArray(filteredData) ? filteredData.map(u => {
        const name = u.name || u.fullName || u.id;
        return u.groupName ? `${name} (${u.groupName})` : name;
      }).join('; ') : ''
    };
  }, [members]);

  useEffect(() => {
    if (open && data && (data.id || data._id)) {
      const id = data.id || data._id;
      
      // Khởi tạo projectDetails bằng data ban đầu để hiển thị ngay lập tức tên quy trình
      // Tránh việc bị trống dữ liệu ở lần mở đầu tiên khi chưa kịp fetch details
      setProjectDetails(data);

      const fetchDetails = async () => {
        try {
          const res = await axiosInstance.get(`${API_PROJECT_MANAGEMENT}/${id}`);
          const detail = res?.data?.data || res?.data || res || [];
          setProjectDetails(detail);
        } catch (err) {
          logger.error("UpdateProjectDialog - Fetch Error:", err);
        }
      };
      fetchDetails();
    }
  }, [data, open]);

  // Reset form khi projectDetails đã sẵn sàng
  useEffect(() => {
    if (open && projectDetails) {
      const formData = { ...projectDetails };

      // Đảm bảo tên công việc được map đúng
      if (!formData.taskName && formData.name) {
        formData.taskName = formData.name;
      }

      // Xử lý manager (hỗ trợ chọn nhiều)
      const rawManager = formData.managerId || formData.manager;
      if (rawManager) {
        const managersArray = Array.isArray(rawManager) ? rawManager : [rawManager];
        formData.manager = managersArray.map(item => {
          if (typeof item === 'object' && item !== null) {
            const id = item.userId || item.id || item._id || item.processId;
            return {
              id: id,
              _id: id,
              name: item.name || item.fullName || "N/A",
              parentName: item.parentName || item.departmentName || item.organizationUnitName || item.groupName || (item.parent && item.parent.name) || (item.department && item.department.name) || ""
            };
          } else {
            return {
              id: item,
              _id: item,
              name: "N/A",
              parentName: ""
            };
          }
        });
      } else {
        formData.manager = [];
      }

      // Xử lý assigner
      const rawAssigner = formData.assignerId || formData.assigner;
      if (rawAssigner) {
        if (typeof rawAssigner === 'object') {
          formData.assigner = {
            id: rawAssigner.userId || rawAssigner.id || rawAssigner._id || rawAssigner.processId,
            name: rawAssigner.name || rawAssigner.fullName || formData.assignerName || "N/A",
            _id: rawAssigner.userId || rawAssigner.id || rawAssigner._id || rawAssigner.processId
          };
        } else {
          formData.assigner = {
            id: rawAssigner,
            name: formData.assignerName || "N/A",
            _id: rawAssigner
          };
        }
      }

      // Xử lý members - giữ nguyên object
      if (Array.isArray(formData.members)) {
        formData.members = formData.members.map(m => {
          if (typeof m === 'object' && m !== null) {
            const id = m.userId || m.id || m._id;
            const userOpt = userOptions.find(u => (u.id || u._id || u.userId) === id);
            return {
              ...m,
              id: id,
              _id: id,
              name: m.name || m.fullName || "N/A",
              groupName: m.groupName || userOpt?.groupName || userOpt?.organizationUnitName || null,
            };
          }
          return m;
        });
      }

      // Xử lý viewers - giữ nguyên object
      if (Array.isArray(formData.viewers)) {
        formData.viewers = formData.viewers.map(v => {
          if (typeof v === 'object' && v !== null) {
            const id = v.userId || v.id || v._id;
            const userOpt = userOptions.find(u => (u.id || u._id || u.userId) === id);
            return {
              ...v,
              id: id,
              _id: id,
              name: v.name || v.fullName || "N/A",
              groupName: v.groupName || userOpt?.groupName || userOpt?.organizationUnitName || null,
            };
          }
          return v;
        });
      }
      // Xử lý projectStatus (Trường hợp nhận HTML từ backend)
      const rawStatus = formData.projectStatus || formData.status;
      if (rawStatus) {
        const plainTextStatus = stripHtml(rawStatus);
        const foundOption = fixedStatusOptions.find(opt =>
          opt.title === plainTextStatus || opt.value === String(plainTextStatus)
        );
        formData.status = foundOption ? foundOption.value : plainTextStatus;
      }

      // Xử lý process - Hiển thị processName và lưu process (GUID)
      if (formData.process || formData.processName) {
        // Kiểm tra xem process đã là object chưa để tránh nested object
        const processId = typeof formData.process === 'object' 
          ? (formData.process.id || formData.process._id) 
          : formData.process;
        
        const processName = formData.processName 
          ? stripHtml(formData.processName) 
          : (typeof formData.process === 'object' ? formData.process.name : (formData.process || "N/A"));

        formData.process = {
          id: processId,
          name: processName,
          _id: processId
        };
      }
      
      const formatNumber = (val) => {
        if (!val && val !== 0) return "";
        const stringVal = val.toString().replace(/\D/g, "");
        return stringVal.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      };

      if (formData.budget) {
        formData.budget = formatNumber(formData.budget);
      }
      let rawMoneyUnit = formData.moneyUnit || formData.number || "";
      if (rawMoneyUnit && typeof rawMoneyUnit === "object") {
        rawMoneyUnit = rawMoneyUnit.value ?? rawMoneyUnit.id ?? rawMoneyUnit._id ?? rawMoneyUnit.code ?? rawMoneyUnit;
      }
      formData.moneyUnit = rawMoneyUnit ? Number(rawMoneyUnit) : "";

      const initialMembers = Array.isArray(formData.members) ? formData.members : [];
      const initialDepts = Array.isArray(formData.organizationUnitId) 
        ? formData.organizationUnitId.map(id => ({ 
            id, 
            _id: id, 
            types: 'company', 
            type: 'folder', 
            isDepartment: true 
          }))
        : [];
      
      const combinedParticipants = [...initialMembers, ...initialDepts];
      setUserByOrganizationUnits(combinedParticipants);
      
      formData.members = combinedParticipants;
      reset(formData);
    }
  }, [open, projectDetails, reset]);
 
  const watchManager = watch("manager");
   const watchMembers = watch("members");
  const watchViewers = watch("viewers");
 
  const getId = (val) => val?.id || val?._id || val;
 
  const excludeForManager = React.useMemo(() => {
    const memberIds = Array.isArray(watchMembers) ? watchMembers.map(getId).filter(Boolean) : [];
    const viewerIds = Array.isArray(watchViewers) ? watchViewers.map(getId).filter(Boolean) : [];
    return [...memberIds, ...viewerIds].filter(Boolean).join(",");
  }, [watchMembers, watchViewers]);
 
  const excludeForMembers = React.useMemo(() => {
    const managerIds = Array.isArray(watchManager) ? watchManager.map(getId).filter(Boolean) : (watchManager ? [getId(watchManager)] : []);
    const viewerIds = Array.isArray(watchViewers) ? watchViewers.map(getId).filter(Boolean) : [];
    return [...managerIds, ...viewerIds].filter(Boolean).join(",");
  }, [watchManager, watchViewers]);
 
  const excludeForViewers = React.useMemo(() => {
    const managerIds = Array.isArray(watchManager) ? watchManager.map(getId).filter(Boolean) : (watchManager ? [getId(watchManager)] : []);
    const memberIds = Array.isArray(watchMembers) ? watchMembers.map(getId).filter(Boolean) : [];
    return [...managerIds, ...memberIds].filter(Boolean).join(",");
  }, [watchManager, watchMembers]);
 
  const { crmSource } = useSelector((state) => state.config);

  const urgencyOptions = React.useMemo(() =>
    crmSource.find((item) => item.code === "DOUUTIEN")?.data || [], [crmSource]);



  const projectTypeOptions = React.useMemo(() =>
    crmSource.find((item) => item.code === "LOAIDUAN")?.data || [], [crmSource]);

  const timeOptions = React.useMemo(() =>
    crmSource.find((item) => item.code === "S34")?.data || [], [crmSource]);

  const moneyOptions = React.useMemo(() => {
    const rawOptions = crmSource.find((item) => item.code === "TIENTEDUAN")?.data || [];
    return rawOptions.map(opt => ({
      ...opt,
      value: opt.value ? Number(opt.value) : opt.value
    }));
  }, [crmSource]);



  const handleSaveForm = (formData) => {
    const getId = (val) => val?.id || val?._id || val;
    const isValidGuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    // Xử lý process: gửi GUID (process). Nếu không tìm thấy GUID hợp lệ thì lấy GUID gốc từ API
    const processValue = formData.process ? getId(formData.process) : "";
    const finalProcess = isValidGuid(processValue) ? processValue : (projectDetails?.process || "");

    const payload = {
      name: formData.taskName || formData.name,
      startDate: formData.startDate ? dayjs(formData.startDate).toISOString() : null,
      endDate: formData.endDate ? dayjs(formData.endDate).toISOString() : null,
      process: finalProcess,
      reminderDays: formData.reminderDays || "24h",
      priority: formData.priority || "",
      typeProject: formData.typeProject || "",
      budget: formData.budget ? Number(formData.budget.toString().replace(/\./g, "")) : 0,
      moneyUnit: formData.moneyUnit ? Number(formData.moneyUnit) : null,
      description: formData.description || "",
      projectStatus: formData.status ? String(formData.status) : "",
      progress: formData.progress !== undefined ? Number(formData.progress) : 0,
      managerId: Array.isArray(formData.manager) ? formData.manager.map(getId).join(',') : (formData.manager ? getId(formData.manager) : null),
      assignerId: formData.assigner ? getId(formData.assigner) : null,
      members: Array.isArray(formData.members) ? formData.members.filter(u => !u.isDepartment).map(getId).join(',') : '',
      organizationUnitId: Array.isArray(formData.members) ? formData.members.filter(u => u.isDepartment).map(getId) : [],
      viewers: Array.isArray(formData.viewers) ? formData.viewers.map(getId).join(',') : '',
      status: 1,
    };

    // Nếu có trường code và backend yêu cầu (tùy theo logic AddProject)
    if (formData.code) {
      payload.code = formData.code;
    }

    onSave(payload);
    fetchJobDetail?.();
  };
  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setValue("startDate", startDate, { shouldValidate: true });
    setValue("endDate", endDate, { shouldValidate: true });
    setTimeout(() => trigger(["startDate", "endDate"]), 0);
  }, [setValue, trigger]);

  const formatNumber = (val) => {
    if (!val && val !== 0) return "";
    const stringVal = val.toString().replace(/\D/g, "");
    return stringVal.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleBudgetChange = useCallback((onChange) => (e) => {
    const val = e.target.value.replace(/\./g, "");
    if (/^\d*$/.test(val)) {
        onChange(formatNumber(val));
    }
  }, []);

  return (
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
      <Grid container spacing={2} mt={1}>
        {type === "general" && (
          <>
            <Grid item xs={12} md={4}>
              <Controller
                name="taskName"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tên dự án, hạng mục đầu tư"
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
                label="Ngày bắt đầu - Ngày kết thúc"
                value={{
                  startDate: watch("startDate"),
                  endDate: watch("endDate"),
                }}
                onChange={handleDateRangeChange}
                minDate={dayjs()}
                startLabel="Ngày bắt đầu"
                endLabel="Ngày kết thúc"
                required
                error={!!(errors.startDate || errors.endDate)}
                helperText={errors.startDate?.message || errors.endDate?.message}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="reminderDays"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Nhắc hạn"
                    placeholder="Chọn thời gian nhắc..."
                    options={timeOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                    error={!!errors.reminderDays}
                    helperText={errors.reminderDays?.message}
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
                    url={API_TEMPLATE_SAMPLE}
                    label="Quy trình mẫu"
                    placeholder="Chọn quy trình mẫu..."
                    queryParam="filter[name]"
                    optionLabel="name"
                    optionValue="id"
                    {...field}
                    disabled={!!(projectDetails?.process)}
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
                  <InputComponents
                    select
                    label="Độ ưu tiên"
                    placeholder="Nhập dữ liệu..."
                    options={urgencyOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                    error={!!errors.priority}
                    helperText={errors.priority?.message}
                  />
                )}
              />
            </Grid>


            <Grid item xs={12} md={4}>
              <Controller
                name="typeProject"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Loại dự án"
                    placeholder="Nhập dữ liệu..."
                    options={projectTypeOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                    error={!!errors.typeProject}
                    helperText={errors.typeProject?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Grid container spacing={1}>
                <Grid item xs={8}>
                  <Controller
                    name="budget"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Tổng mức đầu tư"
                        placeholder="Nhập Tổng mức đầu tư..."
                        {...field}
                        onChange={handleBudgetChange(field.onChange)}
                        error={!!errors.budget}
                        helperText={errors.budget?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Controller
                    name="moneyUnit"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        select
                        label="Đơn vị"
                        placeholder="Chọn..."
                        options={moneyOptions}
                        customLabel="title"
                        customValue="value"
                        {...field}
                        error={!!errors.moneyUnit}
                        helperText={errors.moneyUnit?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
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
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Grid>
          </>
        )}

        {type === "participants" && (
          <>
            
            <Grid item xs={12} md={4}>
              <Controller
                name="manager"
                control={control}
                render={({ field }) => (
                  <WrappedAsyncAutoComplete
                    isMulti
                    limitTags={2}
                    url={`${API_GET_LIST_USERS}/project-users?processKey=CVDAN&excludeId=${excludeForManager}`}
                    label="Quản lý dự án"
                    placeholder="Tìm kiếm..."
                    queryParam="name"
                    optionLabel="name"
                    optionValue="id"
                    required
                    optionSubLabel="parentName"
                    error={!!errors.manager}
                    heplText={errors.manager?.message}
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="members"
                control={control}
                render={({ field }) => (
                  <FormItem label="Thành viên dự án">
                  <StyledCustomInput
                    {...field}
                    value={selectValue?.data?.length > 0 ? ' ' : ''}
                    InputProps={{
                      readOnly: true,
                      style: {
                        cursor: 'pointer'
                      },
                      onClick: handleOpenDialog,
                      startAdornment: selectValue?.data?.length > 0 ? (
                        <WrapChipContainer>
                          {selectValue.data.slice(0, 2).map((item) => (
                            <MemberCardWrapper
                              key={item._id || item.id}
                              item={item}
                              name={getMemberName(item)}
                              groupName={getMemberGroup(item)}
                              fullLabel={getFullChipLabel(item)}
                              onDelete={handleDeleteChip}
                            />
                          ))}
                          {selectValue.data.length > 2 && (
                            <SkyTooltip
                              title={selectValue.data.slice(2).map(getChipLabel).join(", ")}
                              arrow
                              placement="top"
                            >
                              <MoreMembersBadge>
                                +{selectValue.data.length - 2}
                              </MoreMembersBadge>
                            </SkyTooltip>
                          )}
                        </WrapChipContainer>
                      ) : null,
                      endAdornment: selectValue?.data?.length ? (
                        <ClearableInputAdornment>
                          <SkyIconButton size="small" onClick={handleClearMembers} edge="end">
                            <ClearIconButton />
                          </SkyIconButton>
                        </ClearableInputAdornment>
                      ) : null
                    }}
                  />
                  </FormItem>
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="viewers"
                control={control}
                render={({ field }) => (
                  <WrappedAsyncAutoComplete
                    isMulti
                    url={`${API_GET_LIST_USERS}/project-users?processKey=CVDAN&excludeId=${excludeForViewers}`}
                    label="Người xem"
                    placeholder="Tìm thành viên dự án..."
                    queryParam="name"
                    optionLabel="name"
                    optionValue="id"
                    limitTags={2}
                    isPB
                    optionSubLabel="parentName"
                    {...field}
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
                  options={fixedStatusOptions}
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
      <PopupTableMembersProject
        open={openDialog}
        onClose={handleCloseDialog}
        onSave={handleSaveMembers}
        dialogKey={openDialog}
        initialSelectedUnits={userByOrganizationUnits}
        excludeId={excludeForMembers}
      />
    </Dialog>
  );
};

export default withSharedComponents(UpdateProjectDialog);