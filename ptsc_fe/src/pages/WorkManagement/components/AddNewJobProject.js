/* eslint-disable camelcase */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useCallback, useContext, useMemo } from "react";
import {
  Grid,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import { SkyCheckbox, SkyFlexGap8, SkyFormControlLabel, SkyGrid, SkyRadio, SkyTypography } from "@styles/SkyStyles";
import CustomInput from "@components/CustomInput/CustomInputBase";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import customParseFormat from "dayjs/plugin/customParseFormat";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import {
  API_ADD_COMMON_WORK,
  API_GET_COMMON_WORK_USER,
  API_JOB_TO_DOCUMENT,
  API_JOB_TO_MEETING,
  APP_BASE,
  API_PROJECT_MANAGEMENT,
  API_TEMPLATE,
  API_MERGE_LINK
} from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import PopupTemplate from "@pages/WorkManagement/components/PopupTemplate";
import { calculateSiblingsDuration } from "@pages/TemplateSample/utils";
import {
  BoldSkyFormControlLabel,
  JobButtonContainer,
  JobMainContent,
  JobPlaceholderText,
  JobSectionTitle,
  JobUploadPlaceholderBox,
  StyledBoxContainerContent,
  StyledListItemIcon,
  StyledMenuIcon,
  ConfirmDialogContent,
  ConfirmDialogIconWrapper,
  ConfirmDialogText,
  ConfirmDialogSubText,
  RedText,
  StytedPeopleIcon,
  StytedDescriptionIcon,
  StyleLine,
} from "./Job.styles";
import { useSelector } from "react-redux";
import { AuthContext } from "@AuthContext/AuthProvider";
import FileTreeTable from "@components/FileTreeTable";
import {
  UPLOAD_LIMITS_PER_FILE,
  UPLOAD_LIMITS_PER_FOLDER,
  UPLOAD_LIMITS_PER_BATCH,
  UPLOAD_LIMITS_PER_TASK,
  validateFileName,
  validateFileExtension,
  formatFileSize,
  generateDuplicateName
} from "./constants";
import { processFilesForUpload, convertFilesToTreeData } from "@utils/utils";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import LoadingDialog from "@components/LoadingDialog";
import { DeleteOutline, WarningAmber as WarningAmberIcon } from "@mui/icons-material";
import { DialogTitleBox } from "@pages/MeetingCalendar/componentStyle/MeetingAttendance.styles";
import { styled } from "@mui/material/styles";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import { withFormWrapper } from "@components/common/FormWrapper";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import { StyledIconWrapper } from "@pages/ProjectManager/components/AddProject.styles";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import CustomButton from "@components/CustomButton";

export const StyleSkyTypography = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  color: theme.palette.dialog?.headerColor || "#ffffff",
}));


dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);
const logger = console;
 
 
 

const DayCheckbox = React.memo(({ day, field, onToggle }) => {
  const handleChange = useCallback(() => {
    onToggle(field, day.value);
  }, [field, day.value, onToggle]);

  return (
    <SkyFormControlLabel
      key={day.value}
      control={
        <SkyRadio
          checked={field.value === day.value}
          onChange={handleChange}
        />
      }
      label={day.label}
    />
  );
});
DayCheckbox.displayName = 'DayCheckbox';



const AddNewJob = ({
  dataDetail,
  viewType,
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Thêm mới công việc chung",
  parentId = null,
  parentName = null,
  isFromProject = false,
  projectId = null,
  projectDetail = null,
  parentProgress = 0,
  hasChildren = false,
  parentStartDate: parentStartDateProp = null,
  parentEndDate: parentEndDateProp = null,
  breadcrumbs: breadcrumbsProp,
   
}) => {
    const { user: authUser } = useContext(AuthContext);
  const {
    InputComponents: BaseInput,
    ButtonOutline,

  } = sharedComponents;
 
  const parentStartDate = useMemo(() => {
      const date = dataDetail?.[0]?.startDateISO ?? parentStartDateProp;
      if (!date) return null;
      // Thử parse với format Việt Nam trước, nếu không được thì dùng mặc định
      const parsed = dayjs(date, ["DD/MM/YYYY HH:mm", "DD/MM/YYYY"], true);
      return parsed.isValid() ? parsed : dayjs(date);
    }, [dataDetail?.[0]?.startDateISO, parentStartDateProp]);
  
    const parentEndDate = useMemo(() => {
      const date = dataDetail?.[0]?.endDateISO ?? parentEndDateProp;
      if (!date) return null;
      const parsed = dayjs(date, ["DD/MM/YYYY HH:mm", "DD/MM/YYYY"], true);
      return parsed.isValid() ? parsed : dayjs(date);
    }, [dataDetail?.[0]?.endDateISO, parentEndDateProp]);

  // Wrapper để label nằm trên ô input (giống AddProject.js)
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput]);

  const WrappedDateTimeRangePicker = useMemo(() => {
    const Wrapped = withFormWrapper(DateTimeRangePicker, "date");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedDateTimeRangePicker";
    return Component;
  }, []);

  const WrappedAsyncAutoComplete = useMemo(() => {
    const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedAsyncAutoComplete";
    return Component;
  }, []);
  const { crmSource } = useSelector((state) => state.config);
  const optionModeOfWork =
    crmSource.find((item) => item.code === "CONGVIECLAPLAI")?.data || [];
  const urgencyOptions =
    crmSource.find((item) => item.code === "DOUUTIEN")?.data || [];
  const timeOptions =
    crmSource.find((item) => item.code === "S34")?.data || [];

  const toast = useToast();
  const [checkPermision, setCheckPermision] = React.useState(false);
  const [allMembers, setAllMembers] = React.useState([]);
  

  const schema = yup.object().shape({
    taskName: yup.string().required("Vui lòng nhập tên công việc"),
    deadline: yup
      .date()
      .required("Vui lòng chọn hạn xử lý")
      .typeError("Hạn xử lý không hợp lệ")
      .test(
        'not-past',
        'Hạn xử lý không được ở trong quá khứ',
        function (value) {
          if (!value) return true;
          return dayjs(value)?.isSameOrAfter( parentStartDate ? dayjs(parentStartDate) : undefined, 'minute');
        }
      )
      .test(
        'deadline-after-start',
        'Hạn xử lý phải lớn hơn hoặc bằng ngày bắt đầu',
        function (value) {
          const { startDate } = this.parent;
          if (!value || !startDate) return true; // skip if one side is empty (other validators handle required)
          return dayjs(value)?.isSameOrAfter(dayjs(startDate));
        }
      )
      .test(
        'max-date',
        'Hạn xử lý không được vượt quá ngày kết thúc của dự án/công việc cha',
        function (value) {
          if (!value || !parentEndDate) return true;
          return dayjs(value).valueOf() <= dayjs(parentEndDate).valueOf();
        }
      ),
    assigner: yup.mixed().required("Vui lòng chọn người giao việc"),
    startDate: yup
      .date()
      .required("Vui lòng chọn ngày bắt đầu")
      .typeError("Ngày bắt đầu không hợp lệ")
      .test(
        'not-past',
        'Ngày bắt đầu không được ở trong quá khứ',
        function (value) {
          if (!value) return true;
          return dayjs(value).isSameOrAfter(parentStartDate ? dayjs(parentStartDate) : undefined, 'minute');
        }
      )
      .test(
        'max-date',
        'Ngày bắt đầu không được vượt quá ngày kết thúc của dự án/công việc cha',
        function (value) {
          if (!value || !parentEndDate) return true;
          return dayjs(value).valueOf() <= dayjs(parentEndDate).valueOf();
        }
      ),
    reminderTime: yup.string().required("Vui lòng chọn thời gian nhắc hạn"),
    month: yup.string().transform((value) => (Array.isArray(value) ? value[0] || "" : value)).when("repeatTask", {
      is: (val) => val === (optionModeOfWork.find(opt => opt.title?.toLowerCase().includes("quý"))?.value),
      then: (schema) => schema.required("Vui lòng chọn tháng lặp trong quý"),
      otherwise: (schema) => schema.nullable(),
    }),
    recurringEndDate: yup.date().when("repeatTask", {
      is: (val) => val !== (optionModeOfWork.find(opt => opt.title?.includes("Không"))?.value),
      then: (schema) => schema.required("Vui lòng chọn ngày kết thúc lặp").typeError("Ngày kết thúc lặp không hợp lệ"),
      otherwise: (schema) => schema.nullable(),
    }),
  });


  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    trigger,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      taskName: "",
      startDate: null,
      deadline: null,
      reminderTime: "1 ngày",
      priority: urgencyOptions.find(opt => opt.title === "Bình thường")?.value || "",
      mode: "",
      repeatTask: "khong",
      recurringEndDate: dayjs(),
      description: "",
      assigner: null,
      leader: null,
      coordinators: [],
      viewers: [],
      month: '',
      weekDays: null,
      isApprovalRequired: true,
    },
  });




  const [uploadedFiles, setUploadedFiles] = React.useState([]);

  const [isLoading, setIsLoading] = React.useState(false);
  const [leaderType, setLeaderType] = React.useState("person");
  const [coordinatorType, setCoordinatorType] = React.useState("person");
  const watchAssigner = watch("assigner");
  const watchLeader = watch("leader");
  const watchCoordinators = watch("coordinators");

  const getId = (val) => val?._id || val?.id || val?.processId || (typeof val === 'string' ? val : null);

  // Kiểm tra người chủ trì = người giao => ẩn phần phối hợp
  const isLeaderSameAsAssigner = useMemo(() => {
    if (!watchLeader || !watchAssigner) return false;
    const leaderId = getId(watchLeader);
    const assignerId = getId(watchAssigner);
    return leaderId && assignerId && String(leaderId) === String(assignerId);
  }, [watchLeader, watchAssigner]);

  const projectParticipants = useMemo(() => {
    const mapUser = (u) => ({
      id: u.userId || u.id || u._id,
      _id: u.userId || u.id || u._id,
      name: u.name || u.fullName,
      parentName: u.parentName || u.parent?.name || u.departmentName,
      email: u.email || "",
    });

    if (isFromProject && Array.isArray(allMembers) && allMembers.length > 0) {
      const allUnique = [];
      const seenIds = new Set();
      allMembers.forEach(m => {
        const id = m.userId || m.id || m._id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          allUnique.push(mapUser(m));
        }
      });

      return {
        manager: allMembers.filter(m => m.role === 'manager').map(mapUser),
        members: allMembers.filter(m => m.role === 'member').map(mapUser),
        viewers: allMembers.filter(m => m.role === 'viewer').map(mapUser),
        all: allUnique,
      };
    }

    if (!projectDetail) return { manager: [], members: [], viewers: [], all: [] };

    const manager = projectDetail.managerId ? [mapUser(projectDetail.managerId)] : [];
    const members = Array.isArray(projectDetail.members) ? projectDetail.members.map(mapUser) : [];
    const viewers = Array.isArray(projectDetail.viewers) ? projectDetail.viewers.map(mapUser) : [];

    const allUniqueFallback = [];
    const seenIdsFallback = new Set();
    [...manager, ...members, ...viewers].forEach(u => {
      const id = u.id || u._id;
      if (id && !seenIdsFallback.has(id)) {
        seenIdsFallback.add(id);
        allUniqueFallback.push(u);
      }
    });

    return { manager, members, viewers, all: allUniqueFallback };
  }, [projectDetail, allMembers, isFromProject]);

  const isProjectMember = useMemo(() => {
    if (!isFromProject || !authUser?.user || !projectParticipants) return false;
    const currentUserId = String(authUser.user._id || authUser.user.id);
    const isManager = projectParticipants.manager.some(m => String(m.id || m._id) === currentUserId);
    return !isManager; 
  }, [isFromProject, authUser, projectParticipants]);

  const leaderExcludeIds = useMemo(() => {
    const ids = [];
    return ids.join(",");
  }, []);

  const coordinatorExcludeIds = useMemo(() => {
    const ids = [];
    // Ẩn người giao
    const assignerId = getId(watchAssigner);
    if (assignerId) ids.push(assignerId);
    // Ẩn người chủ trì
    const leaderId = getId(watchLeader);
    if (leaderId) ids.push(leaderId);
    return ids.join(",");
  }, [watchAssigner, watchLeader]);

  const viewerExcludeIds = useMemo(() => {
    const ids = [];
    // Ẩn người giao
    const assignerId = getId(watchAssigner);
    if (assignerId) ids.push(assignerId);
    // Ẩn người chủ trì
    const leaderId = getId(watchLeader);
    if (leaderId) ids.push(leaderId);
    // Ẩn người phối hợp
    if (Array.isArray(watchCoordinators)) {
      watchCoordinators.forEach((item) => {
        const id = getId(item);
        if (id) ids.push(id);
      });
    }
    return ids.join(",");
  }, [watchAssigner, watchLeader, watchCoordinators]);

  const assignerExcludeIds = useMemo(() => {
    const ids = [];
    const leaderId = getId(watchLeader);
    if (leaderId) ids.push(leaderId);
    if (Array.isArray(watchCoordinators)) {
      watchCoordinators.forEach((item) => {
        const id = getId(item);
        if (id) ids.push(id);
      });
    }
    return ids.join(",");
  }, [watchLeader, watchCoordinators]);

  // State cho việc xử lý trùng lặp
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState([]);

  const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
  const [selectedFileId, setSelectedFileId] = React.useState(null);
  const [selectedIsFolder, setSelectedIsFolder] = React.useState(false);

  const [openPopupTemplate, setOpenPopupTemplate] = React.useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = React.useState("");
  const [pendingPayload, setPendingPayload] = React.useState(null);

  const [linkPopupOpen, setLinkPopupOpen] = React.useState(false);
  const [linkFormValues, setLinkFormValues] = React.useState({ documentName: "", documentUrl: "" });
  const [linkErrors, setLinkErrors] = React.useState({ documentName: "", documentUrl: "" });
  const [confirmResetOpen, setConfirmResetOpen] = React.useState(false);
  const [pendingSubmitData, setPendingSubmitData] = React.useState(null);

  const validateURL = useCallback((url) => {
    const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_.~+%=&]*)?$', 'i'); // fragment locator
    return !!pattern.test(url.trim());
  }, []);

  const handleOpenLinkPopup = useCallback(() => {
    setLinkPopupOpen(true);
    setLinkFormValues({ documentName: "", documentUrl: "" });
    setLinkErrors({ documentName: "", documentUrl: "" });
  }, []);

  const handleCloseLinkPopup = useCallback(() => {
    setLinkPopupOpen(false);
    setLinkErrors({ documentName: "", documentUrl: "" });
  }, []);

  const handleLinkNameChange = useCallback((e) => {
    setLinkFormValues(prev => ({ ...prev, documentName: e.target.value }));
    if (e.target.value.trim()) {
      setLinkErrors(prev => ({ ...prev, documentName: "" }));
    }
  }, []);

  const handleLinkUrlChange = useCallback((e) => {
    const url = e.target.value;
    setLinkFormValues(prev => ({ ...prev, documentUrl: url }));
    if (url.trim()) {
      if (validateURL(url)) {
        setLinkErrors(prev => ({ ...prev, documentUrl: "" }));
      } else {
        setLinkErrors(prev => ({ ...prev, documentUrl: "Đường dẫn tài liệu không hợp lệ." }));
      }
    } else {
      setLinkErrors(prev => ({ ...prev, documentUrl: "" }));
    }
  }, [validateURL]);

  const handleSaveLink = useCallback(() => {
    const errors = { documentName: "", documentUrl: "" };
    let hasError = false;

    if (!linkFormValues.documentName.trim()) {
      errors.documentName = "Vui lòng nhập tên tài liệu";
      hasError = true;
    }
    if (!linkFormValues.documentUrl.trim()) {
      errors.documentUrl = "Vui lòng nhập đường dẫn tài liệu";
      hasError = true;
    } else if (!validateURL(linkFormValues.documentUrl)) {
      errors.documentUrl = "Đường dẫn tài liệu không hợp lệ.";
      hasError = true;
    }

    if (hasError) {
      setLinkErrors(errors);
      return;
    }

    const newLink = {
      name: linkFormValues.documentName,
      link: linkFormValues.documentUrl,
      type_file: 'link',
      id: `link-${Date.now()}`
    };
    setUploadedFiles(prev => [...prev, newLink]);
    handleCloseLinkPopup();
  }, [linkFormValues, toast, handleCloseLinkPopup]);

  const checkTemplateDuration = useCallback(async (data) => {
    const processObj = data.process;
    const processId = processObj?._id || processObj?.id || (typeof processObj === 'string' ? processObj : null);

    if (!processId || !data.startDate || !data.deadline) return true;

    try {
      const res = await axiosInstance.get(`${API_TEMPLATE}/${processId}`);
      const templateData = res?.data?.data || res?.data || res || {};
      const tasks = templateData.tasks || [];

      if (tasks.length === 0) return true;

      const templateMinutes = calculateSiblingsDuration(tasks);
      const projectMinutes = dayjs(data.deadline).diff(dayjs(data.startDate), "minute");

      if (templateMinutes > projectMinutes) {
        setSelectedTemplateName(templateData.name || processObj?.name || "Quy trình mẫu");
        return false; // Cần mở popup xác nhận
      }
    } catch (error) {
      logger.error("Lỗi khi kiểm tra thời gian quy trình:", error);
      setSelectedTemplateName(processObj?.name || "Quy trình mẫu");
      return false;
    }
    return true;
  }, []);

  const handleClosePopupTemplate = useCallback(() => {
    setOpenPopupTemplate(false);
    setPendingPayload(null);
    setSelectedTemplateName("");
  }, []);

  const onSubmit = useCallback(async (data, bypassFlag = false) => {
    setIsLoading(true);
    const isBypass = typeof bypassFlag === 'boolean' ? bypassFlag : false;

    if (!isBypass && data.process) {
      const isDurationValid = await checkTemplateDuration(data);
      if (!isDurationValid) {
        setPendingPayload(data);
        setOpenPopupTemplate(true);
        setIsLoading(false);
        return;
      }
    }

    const getId = (val) => val?._id || val?.id || val?.processId || val;

    try {
      if (data.coordinators.length > 0 && !data.leader) {
        toast("Công việc chưa được thêm người chủ trì", 'error');
        setIsLoading(false);
        return;
      }
      // Mapping data to new backend structure
      const payload = {
        name: data.taskName,
        startDate: data.startDate ? dayjs(data.startDate).toISOString() : null,
        endDate: data.deadline ? dayjs(data.deadline).toISOString() : null,
        priority: data.priority,
        topic: data.mode,
        note: data.description,
        progress: "0",
        parent: parentId,
        projectId: projectId ? (isNaN(Number(projectId)) ? projectId : Number(projectId)) : null,
        processStatus: "1",
        assigners: data.assigner ? [{ processId: getId(data.assigner) }] : [],
        directors: data.leader ? [{ processId: getId(data.leader), type: leaderType === 'person' ? 1 : 2 }] : [],
        supporters: Array.isArray(data.coordinators) ? data.coordinators.map(id => ({ processId: getId(id), type: coordinatorType === 'person' ? 1 : 2 })) : [],
        viewers: Array.isArray(data.viewers) ? data.viewers.map(item => ({ processId: getId(item) })) : [],
        reminderTime: data.reminderTime,
        repetitiveTask: data.repeatTask,
        month: data.month,
        repetitiveEnd: data.recurringEndDate ? dayjs(data.recurringEndDate).toISOString() : null,
        weekDays: data.weekDays,
        templateId: data.process ? getId(data.process) : null,
        bypassTemplateTimeValidation: isBypass,
        isApprovalRequired: data.isApprovalRequired,
        isConfidential: data.isConfidential,
      };

      const checkApi = isFromProject
        ? (parentId ? `${API_ADD_COMMON_WORK}/child-from-project` : `${API_ADD_COMMON_WORK}/create-from-project`)
        : viewType === 'jobToDocument'
          ? API_JOB_TO_DOCUMENT
          : viewType === 'jobToMeeting'
            ? API_JOB_TO_MEETING
            : API_ADD_COMMON_WORK;
      // 1. Tạo công việc trước
      const response = await axiosInstance.post(checkApi, payload);
      const newTaskId = response?.data?._id || response?._id || response?.id;

      if (!newTaskId) {
        throw new Error("Không nhận được ID công việc sau khi tạo.");
      }

      // 2. Nếu không có file/link thì kết thúc
      if (uploadedFiles.length === 0) {
        toast("Thêm mới công việc thành công!", "success");
        onSuccess?.();
        onClose();
        return;
      }

      const physicalFiles = uploadedFiles.filter(f => (f instanceof File || (f.webkitRelativePath && f.webkitRelativePath.includes("/"))));
      const linksToSave = uploadedFiles.filter(f => f.type_file === 'link');

      // 3. Upload file nếu có
      if (physicalFiles.length > 0) {
        const isFolderUpload = physicalFiles.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));
        if (isFolderUpload) {
          const createdFolders = {};
          for (const file of physicalFiles) {
            const relativePath = file.webkitRelativePath;
            const pathParts = relativePath.split("/");
            const folderParts = pathParts.slice(0, -1);

            let currentParentId = null;
            let currentPath = "";

            for (const folderName of folderParts) {
              currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

              if (createdFolders[currentPath]) {
                currentParentId = createdFolders[currentPath];
              } else {
                const folderPayload = {
                  objectType: 'taskdocuments',
                  objectId: newTaskId,
                  name: folderName,
                  folderName: folderName,
                  parentId: currentParentId,
                };

                const responseFolder = await axiosInstance.post(`${APP_BASE}/api/files/folder`, folderPayload);
                const resData = responseFolder.data || responseFolder;
                const newFolderId = resData.id || resData._id;

                createdFolders[currentPath] = newFolderId;
                currentParentId = newFolderId;
              }
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("object_type", 'taskdocuments');
            formData.append("object_id", newTaskId);
            if (currentParentId) {
              formData.append("parent_id", currentParentId);
            }

            await axiosInstance.post(`${APP_BASE}/api/files/upload`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          }

        } else {
          // file bth
          for (const file of physicalFiles) {
            try {
              await apiUploadFile(file, "taskdocuments", newTaskId);
            } catch (uploadError) {
              toast(`Tải lên tệp ${file.name} thất bại.`, "warning");
            }
          }
        }
      }

      // 4. Lưu link nếu có
      if (linksToSave.length > 0) {
        for (const linkObj of linksToSave) {
          try {
            await axiosInstance.post(API_MERGE_LINK, {
              taskId: String(newTaskId),
              documentName: linkObj.name,
              documentUrl: linkObj.link,
              objectType: 'taskdocuments'
            });
          } catch (linkError) {
            logger.error("Lỗi khi lưu link:", linkError);
          }
        }
      }

      toast("Thêm mới công việc và tải tệp đính kèm thành công!", "success");
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error("error", error);
      toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
    } finally {
      setIsLoading(false);
    }
  }, [checkTemplateDuration, parentId, projectId, isFromProject, viewType, onSuccess, onClose, toast, uploadedFiles, authUser, leaderType, coordinatorType]);

  const needsConfirm = (parentProgress !== "0" && parentProgress !== 0) && hasChildren === false;

  const handleSaveClick = (data) => {
    if (needsConfirm) {
      setPendingSubmitData(data);
      setConfirmResetOpen(true);
    } else {
      onSubmit(data);
    }
  };

  const handleConfirmReset = async () => {
    setConfirmResetOpen(false);
    try {
      setIsLoading(true);
      await axiosInstance.patch(`${API_ADD_COMMON_WORK}/${parentId}`, { progress: "0" });
    } catch (error) {
      toast(error?.response?.data?.message || "Cập nhật tiến độ thất bại!", "error");
      setIsLoading(false);
      return;
    }
    if (pendingSubmitData) {
      onSubmit(pendingSubmitData);
    }
    setPendingSubmitData(null);
  };

  const handleCloseConfirmReset = () => {
    setConfirmResetOpen(false);
    setPendingSubmitData(null);
  };

  const handleConfirmBypassTemplate = useCallback(async () => {
    if (pendingPayload) {
      setOpenPopupTemplate(false);
      await onSubmit(pendingPayload, true);
    }
  }, [pendingPayload, onSubmit]);

  const handleTemplateChange = useCallback((field) => (val) => {
    field.onChange(val);
    setSelectedTemplateName(val?.name || "");
  }, []);






  const fetchAllMembers = useCallback(async () => {
    if (isFromProject && projectId) {
      try {
        const response = await axiosInstance.get(`${API_PROJECT_MANAGEMENT}/${projectId}/all-members`);
        const data = response?.data || response;
        if (Array.isArray(data)) {
          setAllMembers(data);
        }
      } catch (error) {
        logger.error("Error fetching all members:", error);
      }
    }
  }, [isFromProject, projectId]);

  const checkPermission = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`${APP_BASE}/api/tasks/check-create-permission`);
      setCheckPermision(response);
    } catch (error) {
      logger.error("Error checking permission:", error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      checkPermission();
      if (isFromProject && projectId) {
        fetchAllMembers();
      }
    }
  }, [checkPermission, open, isFromProject, projectId, fetchAllMembers]);

  // Tự động điền chủ trì khi không có phối hợp
  // useEffect(() => {
  //   const autoFillLeader = async () => {
  //     if (hasPermission?.disableSuporter && open && !watch("leader")) {
  //       try {
  //         const response = await axiosInstance.get(`${API_GET_COMMON_WORK_USER}?typeTaskUser=director`);
  //         const directorData = response?.data || response?.items || response;

  //         if (Array.isArray(directorData) && directorData.length > 0) {
  //           const director = directorData[0];
  //           setValue("leader", director, { shouldValidate: false, shouldDirty: true });
  //         }
  //       } catch (error) {
  //         logger.error("Error fetching director for auto-fill:", error);
  //       }
  //     }
  //   };

  //   autoFillLeader();
  // }, [hasPermission?.disableSuporter, open, watch, setValue]);

  // const handleDateChange = useCallback((onChange, fieldName) => {
  //   return (date) => {
  //     onChange(date);
  //     // Trigger validation for both fields when either changes
  //     setTimeout(() => {
  //       if (fieldName === 'startDate') {
  //         trigger(['startDate', 'deadline']);
  //       } else if (fieldName === 'deadline') {
  //         trigger(['deadline', 'startDate']);
  //       }
  //     }, 0);
  //   };
  // }, [trigger]);

  // Handler kiểm tra giới hạn ký tự cho Tên công việc
  const handleTaskNameChange = useCallback((field) => {
    return (e) => {
      const value = e.target.value;
      if (value.length > 500) {
        toast("Tên công việc không được vượt quá 500 ký tự", "warning");
        return;
      }
      field.onChange(e);
    };
  }, [toast]);

  // Handler kiểm tra giới hạn ký tự cho Mô tả
  const handleDescriptionChange = useCallback((field) => {
    return (e) => {
      const value = e.target.value;
      if (value.length > 3000) {
        toast("Mô tả không được vượt quá 3000 ký tự", "warning");
        return;
      }
      field.onChange(e);
    };
  }, [toast]);

  // Reset form khi mở
  useEffect(() => {
    if (open) {
      const noRepeatVal = optionModeOfWork.find(opt => opt.title?.includes("Không"))?.value;
      const currentUser = authUser?.user ? {
        _id: authUser.user._id || authUser.user.id,
        id: authUser.user._id || authUser.user.id,
        name: authUser.user.name || authUser.user.fullName || "Tôi",
      } : null;

      const normalPriority = urgencyOptions.find(opt => opt.title === "Bình thường")?.value || "";

      reset({
        taskName: "",
        startDate: null,
        deadline: null,
        reminderTime: "1 ngày",
        priority: normalPriority,
        mode: "",
        repeatTask: parentId ? (noRepeatVal || "") : (optionModeOfWork[0]?.value || "Theo quý"),
        description: "",
        assigner: currentUser,
        leader: null,
        coordinators: [],
        viewers: [],
        month: "",
        weekDays: null,
        recurringEndDate: dayjs(),
        isApprovalRequired: true,
        isConfidential: false,
      });
      setUploadedFiles([]);
      setLeaderType("person");
      setCoordinatorType("person");
      setFileMenuAnchor(null);
      setSelectedFileId(null);
      setSelectedIsFolder(false);
    }
  }, [open, reset]); // Chỉ depend vào open và reset để tránh vòng lặp

  // Xử lý riêng việc xóa members khi đóng
  useEffect(() => {
    if (!open) {
      setAllMembers([]);
    }
  }, [open]);

  // Tự động xóa người phối hợp khi người chủ trì = người giao
  useEffect(() => {
    if ((isLeaderSameAsAssigner || isProjectMember) && isFromProject) {
      const currentCoords = watch("coordinators");
      if (Array.isArray(currentCoords) && currentCoords.length > 0) {
        setValue("coordinators", [], { shouldValidate: false });
      }
    }
  }, [isLeaderSameAsAssigner, isProjectMember, isFromProject, setValue, watch]);

  const [hasSetMemberDefaults, setHasSetMemberDefaults] = React.useState(false);

  useEffect(() => {
    if (!open) {
      setHasSetMemberDefaults(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && isProjectMember && projectParticipants.all.length > 0 && !hasSetMemberDefaults) {
      const currentUser = authUser?.user ? {
        _id: authUser.user._id || authUser.user.id,
        id: authUser.user._id || authUser.user.id,
        name: authUser.user.name || authUser.user.fullName || "Tôi",
      } : null;

      if (parentId && dataDetail && dataDetail.length > 0) {
        const parentData = dataDetail[0];
        const getValidArray = (val) => Array.isArray(val) ? val : (val ? [val] : []);
        
        const parentLeaders = getValidArray(parentData.managerId || parentData.directors);
        const parentCoordinators = getValidArray(parentData.members || parentData.supporters);
        const parentViewers = getValidArray(parentData.viewers);

        setValue("leader", parentLeaders[0] || currentUser, { shouldValidate: true });
        setValue("coordinators", parentCoordinators, { shouldValidate: true });
        setValue("viewers", parentViewers, { shouldValidate: true });
      } else {
        setValue("leader", currentUser, { shouldValidate: true });
        setValue("coordinators", [], { shouldValidate: true });
      }

      setHasSetMemberDefaults(true);
    }
  }, [open, isProjectMember, projectParticipants.all, hasSetMemberDefaults, setValue, authUser, parentId, dataDetail]);

  const onError = useCallback((errors) => {
    logger.log(errors);
    toast("Vui lòng nhập đầy đủ thông tin", "error");
  }, [toast]);

  const handleFilesChange = (event) => {
    const isFolderInput = event.target.hasAttribute('webkitdirectory');
    const newFiles = Array.from(event.target.files);

    if (!newFiles.length) {
      if (isFolderInput) {
        toast("Thư mục đã chọn không có tệp tin nào để tải lên", "warning");
      }
      return;
    }

    // === VALIDATION 1: Kiểm tra số lượng file/folder theo BATCH ===
    const isFolderUpload = newFiles.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));

    if (isFolderUpload) {
      // Kiểm tra giới hạn folder/lần
      const folderCount = new Set(newFiles.map(f => f.webkitRelativePath.split('/')[0])).size;
      if (folderCount > UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS) {
        toast(`Chỉ được tải tối đa ${UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS} folder/lần`, "error");
        event.target.value = null;
        return;
      }
    } else {
      // Kiểm tra giới hạn file/lần
      if (newFiles.length > UPLOAD_LIMITS_PER_BATCH.MAX_FILES) {
        toast(`Vượt quá ${UPLOAD_LIMITS_PER_BATCH.MAX_FILES} file/lần tải lên. Hiện tại: ${newFiles.length} file`, "error");
        event.target.value = null;
        return;
      }
    }

    // === VALIDATION 2: Kiểm tra giới hạn theo CÔNG VIỆC ===
    const currentTotalCount = uploadedFiles.length;
    const newItemsCount = isFolderUpload ? 1 : newFiles.length;

    // Kiểm tra tổng số đính kèm (vì đây là form add new nên chưa có file cũ trên server)
    if (currentTotalCount + newItemsCount > UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS) {
      toast(
        `Vượt quá giới hạn ${UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS} đính kèm/công việc. ` +
        `Hiện tại: ${currentTotalCount}, Muốn thêm: ${newItemsCount}`,
        "error"
      );
      event.target.value = null;
      return;
    }

    // Tính tổng dung lượng hiện có và mới
    const currentTotalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
    const newFilesSize = newFiles.reduce((sum, file) => sum + file.size, 0);

    if (currentTotalSize + newFilesSize > UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE) {
      toast(
        `Vượt quá tổng dung lượng ${formatFileSize(UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE)}/công việc. ` +
        `Hiện tại: ${formatFileSize(currentTotalSize)}, Muốn thêm: ${formatFileSize(newFilesSize)}`,
        "error"
      );
      event.target.value = null;
      return;
    }

    // === VALIDATION 3: Kiểm tra kích thước file/folder ===
    if (isFolderUpload) {
      // Kiểm tra tổng dung lượng folder
      const totalFolderSize = newFiles.reduce((sum, file) => sum + file.size, 0);
      if (totalFolderSize > UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE) {
        toast(
          `Folder vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE)}. ` +
          `Kích thước hiện tại: ${formatFileSize(totalFolderSize)}`,
          "error"
        );
        event.target.value = null;
        return;
      }

      // Kiểm tra số lượng file trong folder
      if (newFiles.length > UPLOAD_LIMITS_PER_FOLDER.MAX_FILES) {
        toast(`Folder chứa quá nhiều file (${newFiles.length}). Giới hạn: ${UPLOAD_LIMITS_PER_FOLDER.MAX_FILES} file`, "error");
        event.target.value = null;
        return;
      }

      // Kiểm tra từng file trong folder
      for (const file of newFiles) {
        if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
          toast(
            `File "${file.name}" vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FILE.MAX_SIZE)}. ` +
            `Kích thước: ${formatFileSize(file.size)}`,
            "error"
          );
          event.target.value = null;
          return;
        }

        const nameValidation = validateFileName(file.name);
        if (!nameValidation.valid) {
          toast(`File "${file.name}": ${nameValidation.message}`, "error");
          event.target.value = null;
          return;
        }

        const extValidation = validateFileExtension(file.name);
        if (!extValidation.valid) {
          toast(`File "${file.name}": ${extValidation.message}`, "error");
          event.target.value = null;
          return;
        }
      }
    } else {
      // Upload file đơn lẻ - kiểm tra từng file
      for (const file of newFiles) {
        if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
          toast(
            `File "${file.name}" vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FILE.MAX_SIZE)}. ` +
            `Kích thước: ${formatFileSize(file.size)}`,
            "error"
          );
          event.target.value = null;
          return;
        }

        const nameValidation = validateFileName(file.name);
        if (!nameValidation.valid) {
          toast(`File "${file.name}": ${nameValidation.message}`, "error");
          event.target.value = null;
          return;
        }

        const extValidation = validateFileExtension(file.name);
        if (!extValidation.valid) {
          toast(`File "${file.name}": ${extValidation.message}`, "error");
          event.target.value = null;
          return;
        }
      }
    }

    // === VALIDATION 4: Kiểm tra trùng tên ===
    const existingFolders = new Set();
    uploadedFiles.forEach(f => {
      const path = f.path || f.webkitRelativePath || "";
      if (path.includes("/")) {
        existingFolders.add(path.split("/")[0]);
      }
    });

    const newFolders = new Set();
    newFiles.forEach(f => {
      const path = f.webkitRelativePath || "";
      if (path.includes("/")) {
        newFolders.add(path.split("/")[0]);
      }
    });

    const isDuplicate = Array.from(new Set(newFiles.map(nf => {
      const path = nf.webkitRelativePath || "";
      return path.includes("/") ? path.split("/")[0] : nf.name;
    }))).some(newItemName => {
      return uploadedFiles.some(ef => {
        const efPath = ef.path || ef.webkitRelativePath || "";
        const existingItemName = efPath.includes("/") ? efPath.split("/")[0] : (ef.name || ef.file_name);
        return newItemName === existingItemName;
      });
    });

    if (isDuplicate) {
      setPendingFiles(newFiles);
      setIsConfirmDialogOpen(true);
    } else {
      // Không trùng, thêm bình thường nhưng vẫn gán path để đồng bộ
      const processedFiles = newFiles.map(f => {
        if (f.webkitRelativePath) {
          f.path = f.webkitRelativePath;
        }
        return f;
      });
      setUploadedFiles((prev) => [...prev, ...processedFiles]);
    }

    if (event.target) {
      event.target.value = null;
    }
  };

  const handleConfirmUpload = (shouldContinue) => {
    if (shouldContinue) {
      const filesToAdd = processFilesForUpload(pendingFiles, uploadedFiles, generateDuplicateName);
      setUploadedFiles((prev) => [...prev, ...filesToAdd]);
    }
    setPendingFiles([]);
    setIsConfirmDialogOpen(false);
  };

  const handleCancelUpload = useCallback(() => {
    handleConfirmUpload(false);
  }, [handleConfirmUpload]);

  const handleConfirmUploadAction = useCallback(() => {
    handleConfirmUpload(true);
  }, [handleConfirmUpload]);

  // Convert uploadedFiles thành treeData cho FileTreeTable
  const fileTreeData = React.useMemo(() => {
    return convertFilesToTreeData(uploadedFiles);
  }, [uploadedFiles]);

  // Tìm tất cả node con (recursively) trong flattened array
  const findAllChildren = useCallback((nodes, parentId, result = []) => {
    nodes.forEach((node) => {
      if (node.parent_id === parentId) {
        result.push(node);
        // Tìm tiếp các node con của node này
        findAllChildren(nodes, node.id || node._id, result);
      }
    });
    return result;
  }, []);

  // Xử lý click menu từ FileTreeTable
  const handleFileMenuClick = useCallback((event) => {
    const fileId = event.currentTarget.getAttribute('data-file-id');
    const isFolder = event.currentTarget.getAttribute('data-is-folder') === '1';

    if (!fileId) return;

    setSelectedFileId(fileId);
    setSelectedIsFolder(isFolder);
    setFileMenuAnchor(event.currentTarget);
  }, []);

  // Đóng menu
  const handleCloseFileMenu = useCallback(() => {
    setFileMenuAnchor(null);
    setSelectedFileId(null);
    setSelectedIsFolder(false);
  }, []);

  // Xử lý xóa file
  const handleDeleteFile = useCallback(() => {
    if (!selectedFileId) {
      handleCloseFileMenu();
      return;
    }

    // Tìm node trong flattened array
    const fileNode = fileTreeData.find(
      (node) => (node.id === selectedFileId || node._id === selectedFileId)
    );

    if (!fileNode) {
      handleCloseFileMenu();
      return;
    }

    // Nếu là link, chỉ xóa link đó
    if (fileNode.type_file === 'link') {
      setUploadedFiles((prev) => prev.filter((f) => (f.id || f._id) !== selectedFileId));
      setIsDeleteDialogOpen(false);
      handleCloseFileMenu();
      return;
    }

    // Thu thập tất cả file objects cần xóa
    const filesToRemove = new Set();

    // Nếu là folder, tìm tất cả children và thu thập file objects
    if (selectedIsFolder) {
      const allChildren = findAllChildren(fileTreeData, selectedFileId);
      allChildren.forEach((child) => {
        if (child.file) {
          filesToRemove.add(child.file);
        }
      });
    } else {
      // Nếu là file, chỉ xóa file đó
      if (fileNode.file) {
        filesToRemove.add(fileNode.file);
      }
    }

    // Xóa các file khỏi uploadedFiles
    setUploadedFiles((prev) =>
      prev.filter((file) => !filesToRemove.has(file))
    );

    setIsDeleteDialogOpen(false);
    handleCloseFileMenu();
  }, [selectedFileId, selectedIsFolder, fileTreeData, findAllChildren, handleCloseFileMenu]);

  const handleOpenDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(true);
    setFileMenuAnchor(null);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
  }, []);

  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setValue("startDate", startDate, { shouldValidate: true });
    setValue("deadline", endDate, { shouldValidate: true });
    setTimeout(() => trigger(["startDate", "deadline"]), 0);
  }, [setValue, trigger]);

  return (
    <CustomSwipper
      title={title}
      breadcrumbs={breadcrumbsProp}
      open={open}
      isLoading={isLoading}
      onClose={onClose}
      onSave={handleSubmit(handleSaveClick, onError)}
      type="add"
      hideBackdrop
      footer={
       <>
        <FlexGrowBox />
          <FooterActions>
          <CustomButton
          onClick={handleSubmit(handleSaveClick, onError)}
          disabled={isLoading}
          variant="primary"
        >
          Lưu
        </CustomButton>
          </FooterActions>
       </>
      }
    >
      <JobMainContent>
        {/* THÔNG TIN CHUNG */}
        <StyledBoxContainerContent>
          <SkyFlexGap8 mt={2}>
            <StyledIconWrapper>
              <StytedDescriptionIcon />
            </StyledIconWrapper>
            <JobSectionTitle variant="h6" gutterBottom mb={0} >
              THÔNG TIN CHUNG
            </JobSectionTitle>
          </SkyFlexGap8>
          <StyleLine />
          <Grid container rowSpacing={3} columnSpacing={3} mb={4}>
            {/* Hàng 1: Tên công việc (full) | Ngày bắt đầu - Hạn xử lý (full) */}
            <Grid item xs={12} md={8}>
              <Controller
                name="taskName"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tên công việc"
                    placeholder="Nhập tên công việc"
                    {...field}
                    onChange={handleTaskNameChange(field)}
                    required
                    error={!!errors.taskName}
                    helperText={errors.taskName?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <WrappedDateTimeRangePicker
                showTime
                label="Ngày bắt đầu - Ngày dự kiến kết thúc"
                value={{
                  startDate: watch("startDate"),
                  endDate: watch("deadline"),
                }}
                onChange={handleDateRangeChange}
                minDate={parentStartDate ? dayjs(parentStartDate) : undefined}
                maxDate={parentEndDate ? dayjs(parentEndDate) : undefined}
                startLabel="Ngày bắt đầu"
                endLabel="Hạn xử lý"
                required
                error={!!(errors.startDate || errors.deadline)}
                helperText={errors.startDate?.message || errors.deadline?.message}
              />
            </Grid>

            {/* Hàng 2: Quy trình | Độ ưu tiên | Thời gian nhắc hạn */}
            <Grid item xs={12} md={4}>
              <Controller
                name="process"
                control={control}
                render={({ field }) => (
                  <WrappedAsyncAutoComplete
                    isSearchText
                    url={API_TEMPLATE}
                    label="Quy trình"
                    placeholder="Chọn quy trình mẫu..."
                    queryParam="filter[name]"
                    optionLabel="name"
                    optionValue="id"
                    {...field}
                    onChange={handleTemplateChange(field)}
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
                    placeholder="Tìm kiếm"
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

            {/* Hàng 3: Mô tả | Tên dự án + Checkbox phê duyệt */}
            <Grid item xs={12} md={8}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Mô tả"
                    multiline
                    rows={4}
                    placeholder="Nhập mô tả công việc..."
                    {...field}
                    onChange={handleDescriptionChange(field)}
                    inputProps={{ maxLength: 3001 }}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Grid container rowSpacing={2}>
                <Grid item xs={12} md={12}>
                  {!parentId ? (
                    <InputComponents
                      label="Tên dự án"
                      value={projectDetail?.name || ""}
                      disabled
                    />
                  ) : (
                    <InputComponents
                      label="Công việc cha"
                      value={parentName || ""}
                      disabled
                    />
                  )}
                </Grid>
                <Grid item xs={12} md={12}>
                  <Controller
                    name="isApprovalRequired"
                    control={control}
                    render={({ field }) => (
                      <BoldSkyFormControlLabel
                        control={
                          <SkyCheckbox
                            {...field}
                            checked={field.value}
                          />
                        }
                        label="Xác nhận hoàn thành"
                        labelPlacement="end"
                      />
                    )}
                  />
                </Grid>
                {checkPermision?.isSecret === true && (
                  <Grid item xs={12} md={12}>
                    <Controller
                      name="isConfidential"
                      control={control}
                      render={({ field }) => (
                        <BoldSkyFormControlLabel
                          control={
                            <SkyCheckbox
                              {...field}
                              checked={field.value}
                            />
                          }
                          label="Công việc mật"
                          labelPlacement="end"
                        />
                      )}
                    />
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        </StyledBoxContainerContent>

        {/* THÔNG TIN NGƯỜI THAM GIA */}
        <StyledBoxContainerContent styledMarginTop>
          <SkyFlexGap8 >
            <StyledIconWrapper>
              <StytedPeopleIcon />
            </StyledIconWrapper>
            <JobSectionTitle variant="h6" gutterBottom mb={0} >
              NGƯỜI THAM GIA
            </JobSectionTitle>
          </SkyFlexGap8>

          <Grid container rowSpacing={3} columnSpacing={3} mb={3} mt={1}>
            {/* Hàng 1: Người giao việc | Người chủ trì */}
            <Grid item xs={12} md={6}>
              <Controller
                name="assigner"
                control={control}
                render={({ field }) => (
                  <WrappedAsyncAutoComplete
                    label="Người giao việc"
                    placeholder="Tìm kiếm"
                    {...field}
                    url={isFromProject ? "" : `${API_GET_COMMON_WORK_USER}?typeTaskUser=assigner&excludeId=${assignerExcludeIds}`}
                    options={isFromProject ? projectParticipants.all : undefined}
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
                  <WrappedAsyncAutoComplete
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

                      // Bản thân (người giao) + thành viên dự án (manager + members)
                      const candidates = [...projectParticipants.manager, ...projectParticipants.members];
                      // Thêm bản thân (current user / người giao) vào nếu chưa có
                      const assignerId = getId(watchAssigner);
                      if (assignerId) {
                        const alreadyExists = candidates.some(u => String(u.id || u._id) === String(assignerId));
                        if (!alreadyExists) {
                          const assignerObj = projectParticipants.all.find(u => String(u.id || u._id) === String(assignerId));
                          if (assignerObj) candidates.push(assignerObj);
                        }
                      }
                      // Loại trùng lặp
                      const unique = candidates.reduce((acc, current) => {
                        const x = acc.find(item => String(item.id || item._id) === String(current.id || current._id));
                        if (!x) return acc.concat([current]);
                        return acc;
                      }, []);
                      // Loại những người đã chọn ở vai trò khác
                      return unique.filter(u => {
                        const id = u?._id || u?.id;
                        return !leaderExcludeIds.split(',').filter(Boolean).includes(String(id));
                      });
                    })() : undefined}
                    queryParams={["name", "email"]}
                    optionLabel="name"
                    optionValue="id"
                    optionSubLabel="parentName"
                    error={!!errors.leader}
                    helperText={errors.leader?.message}
                  />
                )}
              />
            </Grid>

            {/* Hàng 2: Người phối hợp | Người xem */}
            {/* Ẩn phần phối hợp nếu người chủ trì = người giao (khi QLDA tạo CV con) HOẶC nếu là thành viên dự án */}
            {!(isFromProject && (isLeaderSameAsAssigner || isProjectMember)) && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="coordinators"
                  control={control}
                  render={({ field }) => (
                    <WrappedAsyncAutoComplete
                      {...field}
                      label="Người phối hợp"
                      url={isFromProject ? "" : `${API_GET_COMMON_WORK_USER}?typeTaskUser=supporter&excludeId=${coordinatorExcludeIds}`}
                      options={isFromProject ? (() => {
                        // Thành viên dự án (manager + members), ẩn người giao + người chủ trì
                        const candidates = [...projectParticipants.manager, ...projectParticipants.members];
                        const unique = candidates.reduce((acc, current) => {
                          const x = acc.find(item => String(item.id || item._id) === String(current.id || current._id));
                          if (!x) return acc.concat([current]);
                          return acc;
                        }, []);
                        return unique.filter(u => {
                          const id = u?._id || u?.id;
                          return !coordinatorExcludeIds.split(',').filter(Boolean).includes(String(id));
                        });
                      })() : undefined}
                      queryParams={["name", "email"]}
                      optionLabel="name"
                      isMulti
                      limitTags={2}
                      optionValue="id"
                      optionSubLabel="parentName"
                      error={!!errors.coordinators}
                      helperText={errors.coordinators?.message}
                    />
                  )}
                />
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <Controller
                name="viewers"
                control={control}
                render={({ field }) => (
                  <WrappedAsyncAutoComplete
                    isMulti
                    label="Người xem"
                    placeholder="Tìm kiếm"
                    {...field}
                    url={isFromProject ? "" : `${API_GET_COMMON_WORK_USER}?typeTaskUser=viewer&excludeId=${viewerExcludeIds}`}
                    options={isFromProject ? (() => {
                      // Thành viên dự án + người xem dự án
                      const candidates = [...projectParticipants.manager, ...projectParticipants.members, ...projectParticipants.viewers];
                      const unique = candidates.reduce((acc, current) => {
                        const x = acc.find(item => String(item.id || item._id) === String(current.id || current._id));
                        if (!x) return acc.concat([current]);
                        return acc;
                      }, []);
                      return unique.filter(u => {
                        const id = u?._id || u?.id;
                        return !viewerExcludeIds.split(',').filter(Boolean).includes(String(id));
                      });
                    })() : undefined}
                    queryParams={["name", "email"]}
                    optionLabel="name"
                    optionValue="_id"
                    optionSubLabel="parentName"
                    limitTags={3}
                    error={!!errors.viewers}
                    helperText={errors.viewers?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </StyledBoxContainerContent>

         <SkyFlexGap8 mt={2.5} mb={2.5}>
                    <StyledIconWrapper>
                      <StytedDescriptionIcon />
                    </StyledIconWrapper>
                    <JobSectionTitle variant="h6" gutterBottom mb={0} >
                      TÀI LIỆU LIÊN QUAN
                    </JobSectionTitle>
                  </SkyFlexGap8>
        <StyledBoxContainerContent styledMarginTop>
          {/* TÀI LIỆU CÔNG VIỆC */}


          <JobButtonContainer>
            <ButtonOutline onClick={handleOpenLinkPopup} startIcon={<svg width="16" height="8" viewBox="0 0 16 8" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.13215 7.2L3.96231 7.2C2.86607 7.2 1.93176 6.84888 1.15937 6.14664C0.386986 5.4444 0.000528848 4.59552 5.40929e-07 3.6C-0.000527766 2.60448 0.385929 1.7556 1.15937 1.05336C1.93281 0.35112 2.86712 0 3.96231 0L7.13215 0V1.44L3.96231 1.44C3.30192 1.44 2.74059 1.65 2.27833 2.07C1.81606 2.49 1.58492 3 1.58492 3.6C1.58492 4.2 1.81606 4.71 2.27833 5.13C2.74059 5.55 3.30192 5.76 3.96231 5.76L7.13215 5.76V7.2ZM4.75477 4.32V2.88L11.0945 2.88L11.0945 4.32L4.75477 4.32ZM8.71707 7.2V5.76L11.8869 5.76C12.5473 5.76 13.1086 5.55 13.5709 5.13C14.0332 4.71 14.2643 4.2 14.2643 3.6C14.2643 3 14.0332 2.49 13.5709 2.07C13.1086 1.65 12.5473 1.44 11.8869 1.44L8.71707 1.44V0L11.8869 0C12.9832 0 13.9177 0.35112 14.6906 1.05336C15.4636 1.7556 15.8497 2.60448 15.8492 3.6C15.8487 4.59552 15.4622 5.44464 14.6898 6.14736C13.9175 6.85008 12.9832 7.20096 11.8869 7.2L8.71707 7.2Z" fill="#2364B0"/>
</svg>}>
              Thêm Link
            </ButtonOutline>
            <ButtonOutline component="label" startIcon={<svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.05 4.69141C10.42 4.69141 10.72 4.99137 10.72 5.36141C10.72 5.73145 10.42 6.03141 10.05 6.03141L0.67 6.03141C0.299972 6.03141 0 5.73145 0 5.36141C0 4.99137 0.299972 4.69141 0.67 4.69141L10.05 4.69141Z" fill="#2364B0"/>
<path d="M4.68945 10.05L4.68945 0.67C4.68945 0.299972 4.98941 0 5.35945 0C5.72949 0 6.02945 0.299972 6.02945 0.67L6.02945 10.05C6.02945 10.42 5.72949 10.72 5.35945 10.72C4.98941 10.72 4.68945 10.42 4.68945 10.05Z" fill="#2364B0"/>
</svg>}>
              Thêm File
              <input type="file" hidden multiple onChange={handleFilesChange} />
            </ButtonOutline>
            <ButtonOutline component="label" startIcon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clipPath="url(#clip0_7026_12675)">
<path d="M0.630859 12.0247L0.630859 3.31469C0.630859 2.7816 0.84278 2.27051 1.21973 1.89356C1.59668 1.51661 2.10777 1.30469 2.64086 1.30469L5.27375 1.30469L5.39872 1.30861C5.68824 1.32665 5.97083 1.4074 6.22706 1.54547C6.51997 1.70332 6.76967 1.93104 6.95264 2.20893L7.49119 3.00651L7.49508 3.01305L7.54546 3.08045C7.59973 3.14387 7.66566 3.19671 7.73983 3.23617C7.83865 3.2888 7.94907 3.31575 8.06103 3.31469L13.3609 3.31469L13.5598 3.3245C14.0198 3.37024 14.4522 3.57378 14.782 3.90356C15.1589 4.28051 15.3709 4.7916 15.3709 5.32469L15.3709 12.0247C15.3709 12.5578 15.1589 13.0689 14.782 13.4458C14.4051 13.8228 13.894 14.0347 13.3609 14.0347L2.64086 14.0347C2.10777 14.0347 1.59668 13.8228 1.21973 13.4458C0.84278 13.0689 0.630859 12.5577 0.630859 12.0247ZM1.97086 12.0247C1.97086 12.2024 2.0415 12.3728 2.16715 12.4984C2.2928 12.6241 2.46316 12.6947 2.64086 12.6947L13.3609 12.6947C13.5385 12.6947 13.7089 12.6241 13.8345 12.4984C13.9602 12.3728 14.0309 12.2024 14.0309 12.0247L14.0309 5.32469C14.0309 5.14699 13.9602 4.97663 13.8345 4.85098C13.7246 4.741 13.5804 4.67316 13.4269 4.65796L13.3609 4.65469L8.06759 4.65469C7.7338 4.65683 7.40443 4.57609 7.10969 4.41914C6.81523 4.2623 6.56465 4.03426 6.38016 3.75634L5.83775 2.95286L5.83318 2.94632C5.77221 2.85375 5.68929 2.77778 5.59174 2.72517C5.51859 2.68575 5.43882 2.66017 5.35685 2.64992L5.27375 2.64469L2.64086 2.64469C2.46316 2.64469 2.2928 2.71533 2.16715 2.84098C2.0415 2.96663 1.97086 3.13699 1.97086 3.31469L1.97086 12.0247Z" fill="#2364B0"/>
</g>
<defs>
<clipPath id="clip0_7026_12675">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>}>
              Thư mục
              <input type="file" hidden multiple webkitdirectory="" onChange={handleFilesChange} />
            </ButtonOutline>
          </JobButtonContainer>

          {/* Hiển thị FileTreeTable với cấu trúc cây */}
          {fileTreeData.length > 0 ? (
            <>
              <FileTreeTable
                data={fileTreeData}
                onFileMenuClick={handleFileMenuClick}
                MenuIcon={StyledMenuIcon}
                disableHeader
              />
              <Menu
                anchorEl={fileMenuAnchor}
                open={Boolean(fileMenuAnchor)}
                onClose={handleCloseFileMenu}
                id="file-menu"
              >
                <MenuItem onClick={handleOpenDeleteDialog}>
                  <StyledListItemIcon>
                    <DeleteOutline />
                  </StyledListItemIcon>
                  <ListItemText>Xóa</ListItemText>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <JobUploadPlaceholderBox>
              <JobPlaceholderText variant="body2">Chưa có tài liệu nào được tải lên.</JobPlaceholderText>
            </JobUploadPlaceholderBox>
          )}
        </StyledBoxContainerContent>
      </JobMainContent>

      <CustomDialog
        isLoading={isLoading}
        open={isConfirmDialogOpen}
        onClose={handleCancelUpload}
        onSave={handleConfirmUploadAction}
        title="Xác nhận tải lên"
        titleButton="Tiếp tục"
        cancelButtonText="Hủy"
        size="sm"
      >
        Phát hiện tệp hoặc thư mục trùng tên. Bạn có muốn tiếp tục tải lên và tự động đổi tên các tệp trùng lặp không?
      </CustomDialog>

      <CustomDialog
        isLoading={isLoading}
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onSave={handleDeleteFile}
        title="Xác nhận xóa"
        type="delete"
        size="sm"
      >
        Bạn có muốn xóa không?
      </CustomDialog>

      <LoadingDialog open={isLoading} >
        Đang tải dữ liệu, vui lòng đợi...
      </LoadingDialog>

      <CustomDialog
        open={linkPopupOpen}
        onClose={handleCloseLinkPopup}
        onSave={handleSaveLink}
        title="Gắn link tài liệu"
        titleButton="Lưu"
        disabled={!linkFormValues.documentName.trim() || !linkFormValues.documentUrl.trim() || !!linkErrors.documentUrl}
      >
        <SkyGrid container spacing={2}>
          <SkyGrid item xs={12}>
            <CustomInput
              label={<>Tên link <span style={{ color: 'red' }}>*</span></>}
              placeholder="Ví dụ: Báo cáo tháng 1"
              fullWidth
              value={linkFormValues.documentName}
              onChange={handleLinkNameChange}
              error={!!linkErrors.documentName}
              helperText={linkErrors.documentName}
            />
          </SkyGrid>
          <SkyGrid item xs={12}>
            <CustomInput
              label={<>Đường dẫn link <span style={{ color: 'red' }}>*</span></>}
              placeholder="Ví dụ: https://docs.google.com/document/d/..."
              fullWidth
              value={linkFormValues.documentUrl}
              onChange={handleLinkUrlChange}
              error={!!linkErrors.documentUrl}
              helperText={linkErrors.documentUrl}
            />
          </SkyGrid>
        </SkyGrid>
      </CustomDialog>

      <PopupTemplate
        open={openPopupTemplate}
        onClose={handleClosePopupTemplate}
        onSave={handleConfirmBypassTemplate}
        templateName={selectedTemplateName}
      />

      {confirmResetOpen && (
        <CustomDialog
          open={confirmResetOpen}
          onClose={handleCloseConfirmReset}
          onSave={handleConfirmReset}
          title={
            <DialogTitleBox>
              <ConfirmDialogIconWrapper>
                <WarningAmberIcon />
              </ConfirmDialogIconWrapper>
              <StyleSkyTypography>THÔNG BÁO</StyleSkyTypography>
            </DialogTitleBox>
          }
          titleButton="ĐỒNG Ý"
          isLoading={isLoading}
        >
          <ConfirmDialogContent>
            <ConfirmDialogText variant="body1">
              Vì công việc <strong>{parentName}</strong> đã cập nhật tiến độ trước đó, nếu bạn vẫn muốn tạo công việc con cho công việc <strong>{parentName}</strong> thì tiến độ công việc <strong>{parentName}</strong> sẽ chuyển về <RedText component="span">0%</RedText>. Khi đó hệ thống sẽ tự động tính tiến độ thực hiện công việc <strong>{parentName}</strong> dựa vào tiến độ hoàn thành các công việc con
            </ConfirmDialogText>
            <ConfirmDialogSubText variant="body2">
              Tác vụ này sẽ không thể hoàn tác
            </ConfirmDialogSubText>
          </ConfirmDialogContent>
        </CustomDialog>
      )}

    </CustomSwipper>
  );
};

export default withSharedComponents(AddNewJob);