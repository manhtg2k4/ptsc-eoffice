/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/forbid-component-props */
/* eslint-disable camelcase */

import React, { useEffect, useCallback, useMemo, lazy, useRef } from "react";
import {
  Grid,
  Menu,
  MenuItem,
  IconButton,
  styled,
  useMediaQuery,
  useTheme,
  ListItemText,
  InputAdornment,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import * as yup from "yup";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import withSharedComponents from "@components/WrapperComponent";
const ViewMeetingSchedule = lazy(() => import("@pages/MeetingCalendar/components/ViewMeetingSchedule"));

// Extend dayjs with comparison plugins
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import axiosInstance from "@utils/axiosInstance";
import { API_GET_COMMON_WORK_ORG, API_GET_COMMON_WORK_USER, API_GET_SOURCE_MEETING, API_JOB_TO_MEETING, API_TEMPLATE, APP_BASE, API_MERGE_LINK } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import LinkIcon from "@mui/icons-material/Link";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import {
  DelegatedNoteText,
  JobButtonContainer,
  JobCommentHeader,
  JobMainContent,
  JobSectionTitle,
  StyledBoxContainerContent,
  StyledListItemIcon,
  StyledMenuIcon,
  UploadDropZone,
  BoldSkyFormControlLabel,
  StytedDescriptionIcon,
  StyleLine,
  StytedPeopleIcon,
} from "./Job.styles";
import { useSelector } from "react-redux";
import FileTreeTable from "@components/FileTreeTable";
import {
  UPLOAD_LIMITS_PER_FILE,
  UPLOAD_LIMITS_PER_FOLDER,
  UPLOAD_LIMITS_PER_BATCH,
  UPLOAD_LIMITS_PER_TASK,
  FILE_NAME_LIMITS,
  validateFileName,
  validateFileExtension,
  truncateFileName,
  formatFileSize,
  generateDuplicateName,
  statusOptions,
  columnAddJobToMeeting,
  advancedFilterConfigSourceMeeting,
} from "./constants";
import { ClearableInputAdornment } from "@styles/CustomInput.styles";
import CustomInput from "@components/CustomInput/CustomInputBase";
import CustomButton from "@components/CustomButton";
import { StyleDialog, StyledTitleText } from "@styles/DialogDirective";
import api from "@services/api";
import { StyledDialogContentNoScrollbar, StyledDialogHeaderWrapper } from "@styles/RecordDestruction/RecordDestruction.styles";
import { StyledDialogActions } from "@styles/CustomDialog.styles";
import { CustomDialog } from "@components/CustomDialog";
import { convertFilesToTreeData, processFilesForUpload } from "@utils/utils";
import LoadingDialog from "@components/LoadingDialog";
import { DeleteOutlined, FolderOutlined } from "@mui/icons-material";
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import CustomDatePicker from "@components/CustomDatePicker";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import PersonOrUnitAsyncInput from "@components/PersonOrUnitAsyncInput";
import CustomTableTreeStatic from "@components/CustomTableTreeStatic";
import PopupTemplate from "./PopupTemplate";
import { SkyCheckbox, SkyFlexGap8, SkyGrid } from "@styles/SkyStyles";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import withFormWrapper from "@components/common/FormWrapper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { StyledIconWrapper } from "@pages/ProjectManager/components/AddProject.styles";


const StyledDescriptionIcon = styled(MeetingRoomIcon)(() => ({
  color: "#0062AD",
}));

export const StyledGridContainer = styled(Grid)(() => ({
  // marginBottom: theme.spacing(2),
  alignItems: "flex-end",
}));

const StyledSearchButton = styled(CustomButton)(() => ({
  height: '28px',
  borderRadius: '20px',
  border: '1px solid #DDDDDD',
  backgroundColor: '#F9FAFB',
  color: '#64748B',
  textTransform: 'none',
  fontSize: '13px',
  fontWeight: 500,
  padding: '2px 16px',
  boxShadow: 'none',
  minWidth: 'max-content',
  whiteSpace: 'nowrap',
  '&:hover': {
    backgroundColor: '#F1F5F9',
    borderColor: '#B9C2CA',
    boxShadow: 'none',
  }
}));




const AddJobToMeeting = (props) => {
  const {
    open,
    onClose,
    onSuccess,
    sharedComponents,
    title,
    parentId = null,
    meetingConclusion,
    meetingData,
    meetingId: meetingIds,
    setReloadData,
    meetingDate,
    meetingTime,

  } = props
  logger.log("Props received in AddJobToMeeting:", meetingData)
  
  const {
    InputComponents: BaseInput,
    ButtonOutline,
  } = sharedComponents;
  const { crmSource } = useSelector((state) => state.config);
  const optionModeOfWork = useMemo(() =>
    crmSource.find((item) => item.code === "CONGVIECLAPLAI")?.data || [], [crmSource]);
  const urgencyOptions = useMemo(() =>
    crmSource.find((item) => item.code === "DOUUTIEN")?.data || [], [crmSource]);
  const timeOptions = useMemo(() =>
    crmSource.find((item) => item.code === "S34")?.data || [], [crmSource]);
  const docTypeOptions = useMemo(() =>
    crmSource.find((item) => item.code === "S19")?.data || [], [crmSource]);

  // Format ngày họp về DD-MM-YYYY để hiển thị trong chuỗi "Nguồn cuộc họp"
  // (data từ meetingData/row trả về dạng YYYY-MM-DD)
  const formatMeetingDate = useCallback((dateValue) => {
    if (!dateValue) return "";
    const d = dayjs(dateValue, ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"]);
    return d.isValid() ? d.format("DD-MM-YYYY") : dateValue;
  }, []);

  const parseMeetingDateTime = useCallback((dateValue, timeValue) => {
    if (!dateValue) return null;

    let parsedDate = dayjs(dateValue, [
      "DD/MM/YYYY",
      "YYYY-MM-DD",
      "YYYY-MM-DDTHH:mm:ss",
      "YYYY-MM-DDTHH:mm:ssZ",
      "YYYY-MM-DDTHH:mm:ss.SSSZ",
    ], true);

    if (!parsedDate.isValid()) {
      parsedDate = dayjs(dateValue);
    }

    if (!parsedDate.isValid()) return null;

    if (timeValue && typeof timeValue === "string") {
      const startTimeStr = timeValue.split("-")[0]?.trim();
      if (/^\d{2}:\d{2}$/.test(startTimeStr)) {
        const [hours, minutes] = startTimeStr.split(":").map(Number);
        parsedDate = parsedDate.hour(hours).minute(minutes).second(0).millisecond(0);
      }
    }

    return parsedDate.isValid() ? parsedDate.toDate() : null;
  }, []);



  const maxDate = useMemo(() => {
    if (!meetingDate) return undefined;
    const base = dayjs(meetingDate); // "2026-04-10"
    if (meetingTime && typeof meetingTime === 'string') {
      const startTimeStr = meetingTime.split('-')[0].trim(); // "08:00"
      if (/^\d{2}:\d{2}$/.test(startTimeStr)) {
        const [hours, minutes] = startTimeStr.split(':');
        return base.hour(parseInt(hours)).minute(parseInt(minutes)).toDate();
      }
    }
    return base.toDate();
  }, [meetingDate, meetingTime]);

  const schema = useMemo(() => yup.object().shape({
    taskName: yup.string()
      .required("Vui lòng nhập tên công việc")
      .max(500, "Tên công việc không được vượt quá 500 ký tự"),
    note: yup.string()
      .max(3000, "Mô tả không được vượt quá 3000 ký tự"),
    conclusion: yup.string(),
    deadline: yup
      .date()
      .required("Vui lòng chọn hạn xử lý")
      .typeError("Hạn xử lý không hợp lệ")
      .test(
        'not-past',
        'Hạn xử lý không được ở trong quá khứ',
        function (value) {
          if (!value) return true;
          return dayjs(value).isSameOrAfter(dayjs(), 'minute');
        }
      )
      .test(
        'deadline-after-start',
        'Hạn xử lý phải lớn hơn hoặc bằng ngày bắt đầu',
        function (value) {
          const { startDate } = this.parent;
          if (!value || !startDate) return true; // skip if one side is empty (other validators handle required)
          return dayjs(value).isSameOrAfter(dayjs(startDate));
        }
      )
      .test(
        'deadline-before-meeting',
        function (value) {
          const { receiveDate, conclusion } = this.parent;
          if (conclusion) return true; // Bỏ qua nếu có kết luận
          if (!value) return true;
          const limit = maxDate || receiveDate;
          if (!limit) return true;
          const isValid = dayjs(value).isSameOrBefore(dayjs(limit));
          if (!isValid) {
            return this.createError({
              message: `Hạn xử lý không được sau thời gian bắt đầu cuộc họp (${dayjs(limit).format("HH:mm DD/MM/YYYY")})`
            });
          }
          return true;
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
          return dayjs(value).isSameOrAfter(dayjs(), 'minute');
        }
      ),
    docId: yup.string().required("Vui lòng chọn nguồn cuộc họp"),
  }), [maxDate]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset, trigger,
    getValues,
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      taskName: "",
      startDate: null,
      deadline: null,
      reminderTime: "1_day",
      priority: urgencyOptions[0]?.value || "",
      mode: "",
      repeatTask: optionModeOfWork[0]?.value || "Theo quý",
      description: "",
      assigner: null,
      leader: null,
      coordinators: [],
      viewers: [],
      files: [], // sẽ quản lý riêng
      title: "",
      docId: "",
      documentId: "", // Lưu ID thật để gửi lên backend
      meetingDate: null,
      receiveDate: null,
      note: "",
      meetingMode: "",
      templateId: null,
      conclusion: "",
      isConfidential: false,
      isApprovalRequired: true,
    },
  });
  const [openViewMeeting, setOpenViewMeeting] = React.useState(false);
  const [viewMeetingId, setViewMeetingId] = React.useState(null);
  const [uploadedFiles, setUploadedFiles] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  // State cho việc đồng bộ type
  const [leaderType, setLeaderType] = React.useState("person");
  const [coordinatorType, setCoordinatorType] = React.useState("person");
  const watchAssigner = watch("assigner");
  const watchLeader = watch("leader");
  const watchCoordinators = watch("coordinators");

  const getId = (val) => val?._id || val?.id || val?.processId || (typeof val === 'string' ? val : null);

  const watchViewers = watch("viewers");

  const leaderExcludeIds = useMemo(() => {
    const ids = [];
    if (Array.isArray(watchCoordinators)) {
      watchCoordinators.forEach((item) => {
        const id = getId(item);
        if (id) ids.push(id);
      });
    }
    if (Array.isArray(watchViewers)) {
      watchViewers.forEach((item) => {
        const id = getId(item);
        if (id) ids.push(id);
      });
    }
    return ids.join(",");
  }, [watchCoordinators, watchViewers]);

  const coordinatorExcludeIds = useMemo(() => {
    const ids = [];
    const assignerId = getId(watchAssigner);
    if (assignerId) ids.push(assignerId);
    const leaderId = getId(watchLeader);
    if (leaderId) ids.push(leaderId);
    if (Array.isArray(watchViewers)) {
      watchViewers.forEach((item) => {
        const id = getId(item);
        if (id) ids.push(id);
      });
    }
    return ids.join(",");
  }, [watchAssigner, watchLeader, watchViewers]);

  const viewerExcludeIds = useMemo(() => {
    const ids = [];
    const assignerId = getId(watchAssigner);
    if (assignerId) ids.push(assignerId);
    const leaderId = getId(watchLeader);
    if (leaderId) ids.push(leaderId);
    if (Array.isArray(watchCoordinators)) {
      watchCoordinators.forEach((item) => {
        const id = getId(item);
        if (id) ids.push(id);
      });
    }
    return ids.join(",");
  }, [watchAssigner, watchLeader, watchCoordinators]);

  const hideCoordinators = useMemo(() => {
    const getId = (val) => val?._id || val?.id || val?.processId || (typeof val === 'string' ? val : null);
    const assignerId = getId(watchAssigner);
    const leaderId = getId(watchLeader);
    return !!(assignerId && leaderId && assignerId === leaderId);
  }, [watchAssigner, watchLeader]);

  useEffect(() => {
    if (hideCoordinators) {
      setValue("coordinators", []);
    }
  }, [hideCoordinators, setValue]);
  const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
  const [selectedFileId, setSelectedFileId] = React.useState(null);
  const [selectedIsFolder, setSelectedIsFolder] = React.useState(false);
  const toast = useToast();
  const [openDialog, setOpenDialog] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [selectedRowId, setSelectedRowId] = React.useState(null); // Lưu ID của row đã chọn
  const [isLoadingTable, setIsLoadingTable] = React.useState(false);
  const theme = useTheme();
  const filesFromAPI = uploadedFiles?.filter(item => item?.isFromApi);
  const fileIds = filesFromAPI?.map(item => item?.id)
  // State cho việc xử lý trùng lặp
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
  const documentId = getValues('documentId')
  const [openPopupTemplate, setOpenPopupTemplate] = React.useState(false);
  const [pendingPayload, setPendingPayload] = React.useState(null);
  const [templateWarningInfo, setTemplateWarningInfo] = React.useState({
    templateName: "",
    requiredDays: 0,
    availableDays: 0
  });
  const [assignerDelegatedNote, setAssignerDelegatedNote] = React.useState("");

  const [linkPopupOpen, setLinkPopupOpen] = React.useState(false);
  const [linkFormValues, setLinkFormValues] = React.useState({ documentName: "", documentUrl: "" });

  const [linkErrors, setLinkErrors] = React.useState({ documentName: "", documentUrl: "" });

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
      id: `link-${Date.now()}`,
      size: 0
    };
    setUploadedFiles(prev => [...prev, newLink]);
    handleCloseLinkPopup();
  }, [linkFormValues, handleCloseLinkPopup]);


  const [checkPermision, setCheckPermision] = React.useState(false);



  const checkPermission = useCallback(async (leaderId = null) => {
    try {
      const response = await axiosInstance.get(`${APP_BASE}/api/tasks/check-create-permission-for-meeting`, {
        params: {
          leaderId: leaderId || undefined,
        }
      });
      setCheckPermision(response);
    } catch (error) {
      logger.log("Error checking permission:", error);
    }
  }, []);

  useEffect(() => {
    const getId = (val) => val?._id || val?.id || val?.processId || (typeof val === 'string' ? val : null);
    const assignerId = getId(watchAssigner);
    checkPermission(assignerId);
  }, [watchAssigner, checkPermission]);



  const handleOpenDialog = () => {
    // Restore selection từ selectedRowId nếu có trước khi mở dialog
    if (selectedRowId) {
      // Tạo một object placeholder với ID để matching với checkbox logic
      // Object này sẽ được thay thế bằng real data sau khi API load xong
      setSelectedRows([{
        id: selectedRowId,
        _id: selectedRowId,
        documentId: selectedRowId
      }]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    // Lưu ID của row đã chọn trước khi đóng (nếu có)
    if (selectedRows.length > 0) {
      const selectedId = selectedRows[0]._id || selectedRows[0].id || selectedRows[0].documentId;
      setSelectedRowId(selectedId);
    }
    // Không reset selectedRows ở đây để giữ lại selection
  };

  const handleSelectRows = useCallback((selection) => {
    // CustomTable with selectionReturns="object" will pass array of full row objects
    // Only keep the last selected item (single selection)
    if (Array.isArray(selection)) {
      // If empty selection, clear
      if (selection.length === 0) {
        setSelectedRows([]);
        return;
      }

      // Get the last selected item (most recent click)
      const lastSelected = selection[selection.length - 1];

      // Set it as the only selected row
      setSelectedRows([lastSelected]);
    }
  }, []);

  const handleSelectDocument = () => {
    if (selectedRows.length > 0) {
      const selectedDoc = selectedRows[0];

      // Auto-fill form fields with selected document data
      if (typeof selectedDoc === "object") {
        const { id, title, content, meetingDate, meetingTime, type = "conclusion", meetingName, meetingId } = selectedDoc;

        // Lưu ID của document đã chọn
        const selectedId = id || meetingId;
        setSelectedRowId(selectedId);

        // Xây dựng displayValue tùy theo type
        let displayValue = "";
        let titleValue = "";

        if (type === "conclusion") {
          // Nếu là kết luận: Kết luận - Tiêu đề cuộc họp - Ngày họp
          const conclusionParts = [];
          if (title) conclusionParts.push(title); // "Kết luận 4: ssww"
          if (meetingName) conclusionParts.push(meetingName); // "lịch hop 2"
          if (meetingDate) conclusionParts.push(formatMeetingDate(meetingDate));
          displayValue = conclusionParts.join(" - ");

          titleValue = meetingName;
        } else {
          // Nếu là cuộc họp:  - content - meetingDate
          const sourceParts = [];

          if (content) {
            const limit = 100;
            const truncatedContent =
              content.length > limit
                ? content.substring(0, limit) + "..."
                : content;
            sourceParts.push(truncatedContent);
          }
          if (meetingDate) sourceParts.push(formatMeetingDate(meetingDate));
          displayValue = sourceParts.join(" - ");
        }

        setValue("docId", displayValue);

        // Set documentId và typeTaskMeeting tùy theo type
        if (type === "conclusion") {
          // Với kết luận: documentId = meetingId, meetingConclusionId = id
          setValue("documentId", meetingId || "");
          setValue("meetingConclusionId", id || "");
          setValue("typeTaskMeeting", "conclusion");
        } else {
          // Với cuộc họp: documentId = id
          setValue("documentId", id || "");
          setValue("typeTaskMeeting", "meeting");
        }

        // Tiêu đề cuộc họp
        if (type === "conclusion") {
          setValue("title", titleValue || "");
        } else {
          setValue("title", title);
        }


        // Kết luận
        if (type === "conclusion") {
          setValue("conclusion", title || "");
        }

        // Mô tả (content)
        setValue("note", content || "");

        // Ngày họp
        if (meetingDate) {
          const parsedDate = parseMeetingDateTime(meetingDate, meetingTime);
          if (parsedDate) {
            setValue("receiveDate", parsedDate);
          }
        }
      }

      handleCloseDialog();
      trigger('docId');
    }
  };

  const handleDateChange = useCallback((onChange, fieldName) => {
    return (date) => {
      onChange(date);
      // Trigger validation on dependent fields only if they have values
      if (fieldName === 'startDate' || fieldName === 'deadline') {
        setTimeout(() => {
          const values = getValues();
          const fieldsToValidate = [];

          // Only validate fields that have values to avoid triggering required errors
          if (values.startDate) fieldsToValidate.push('startDate');
          if (values.deadline) fieldsToValidate.push('deadline');

          if (fieldsToValidate.length > 0) {
            trigger(fieldsToValidate);
          }
        }, 0);
      }
    };
  }, [trigger, getValues]);

  // Ref để chỉ reset form một lần khi form mở (open: false -> true)
  // Tránh re-reset khi openViewMeeting hoặc các dependency khác thay đổi reference
  const isFormInitializedRef = useRef(false);

  // Reset form khi mở
  useEffect(() => {
    if (open && !isFormInitializedRef.current) {
      isFormInitializedRef.current = true;
      const noRepeatVal = optionModeOfWork.find(opt => opt.title?.includes("Không"))?.value;

      // Tính sẵn các giá trị phụ thuộc meetingData/meetingConclusion để nhét THẲNG vào reset().
      // Lý do: gọi setValue() ngay sau reset() trong cùng tick sẽ bị reset ghi đè về null
      // (race condition của react-hook-form) -> ô "Ngày họp" mất giá trị.
      const docIdParts = [];
      if (meetingConclusion?.content) docIdParts.push(meetingConclusion.content);
      if (meetingData?.title) docIdParts.push(meetingData.title);
      if (meetingData?.meetingDate) docIdParts.push(formatMeetingDate(meetingData.meetingDate));

      const parsedReceiveDate = meetingData?.meetingDate
        ? parseMeetingDateTime(meetingData.meetingDate, meetingData.meetingTime)
        : null;

      reset({
        taskName: "",
        startDate: null,
        deadline: null,
        reminderTime: "1_day",
        priority: urgencyOptions[0]?.value || "",
        mode: "",
        repeatTask: parentId ? (noRepeatVal || "") : (optionModeOfWork[0]?.value || "Theo quý"),
        description: "",
        assigner: null,
        leader: null,
        coordinators: [],
        viewers: [],
        files: [],
        title: meetingData?.title || "",
        docId: docIdParts.length > 0 ? docIdParts.join(' - ') : "",
        documentId: meetingIds || "",
        meetingDate: null,
        receiveDate: parsedReceiveDate,
        note: meetingData?.title || "",
        meetingMode: "",
        templateId: null,
        content: "",
        conclusion: meetingConclusion?.content || "",
        isConfidential: false,
        isApprovalRequired: true,
      });
      setUploadedFiles([]);
      setLeaderType("person");
      setCoordinatorType("person");

      setFileMenuAnchor(null);
      setSelectedFileId(null);
      setSelectedIsFolder(false);
    }

    if (!open) {
      // Reset flag khi form đóng để lần sau mở lại sẽ khởi tạo form mới
      isFormInitializedRef.current = false;
    }
  }, [open, reset, optionModeOfWork, parentId, meetingData, meetingIds, meetingConclusion, setValue, urgencyOptions, openViewMeeting, parseMeetingDateTime]);



  const onError = (errors) => {
    logger.log("❌ Form validation errors:", errors);
    toast("Vui lòng nhập đầy đủ thông tin", "error");
  };
  // Lấy Kết luận
  const meetingConclusionId = getValues('meetingConclusionId')

  const onSubmit = async (data, bypassFlag = false) => {
    // === VALIDATION: Kiểm tra độ dài tên file ===
    const validUploadedFiles = uploadedFiles.filter(f => {
      const name = f.path || f.webkitRelativePath || f.name || f.file_name || "";
      const fileName = name.includes("/") ? name.split("/").pop() : name;
      return fileName.length <= FILE_NAME_LIMITS.MAX_LENGTH;
    });

    const invalidFiles = uploadedFiles.filter(f => {
      const name = f.path || f.webkitRelativePath || f.name || f.file_name || "";
      const fileName = name.includes("/") ? name.split("/").pop() : name;
      return fileName.length > FILE_NAME_LIMITS.MAX_LENGTH;
    });

    if (invalidFiles.length > 0) {
      const truncatedNames = invalidFiles.map(f => {
        const name = f.path || f.webkitRelativePath || f.name || f.file_name || "";
        const fileName = name.includes("/") ? name.split("/").pop() : name;
        return truncateFileName(fileName);
      }).join(", ");
      toast(`File ${truncatedNames} vượt quá giới hạn 255 ký tự`, "error");
    }

    // Cập nhật lại danh sách file hợp lệ trước khi tiến hành
    setUploadedFiles(validUploadedFiles);

    setIsLoading(true);
    const isBypass = typeof bypassFlag === 'boolean' ? bypassFlag : false;

    const getId = (val) => val?._id || val?.id || val?.processId || val;

    try {
      if (data.coordinators.length > 0 && !data.leader) {
        toast("Công việc chưa được thêm người chủ trì", 'error');
        return;
      }
      // Lấy documentId từ form data (đã được lưu khi chọn document)
      const documentId = data.documentId || meetingIds || null;
      const payload = {
        name: data.taskName,
        startDate: data.startDate ? dayjs(data.startDate).toISOString() : null,
        endDate: data.deadline ? dayjs(data.deadline).toISOString() : null,
        priority: data.priority,
        topic: data.mode,
        note: data.note,
        progress: "0",
        parent: parentId,
        fileIds,
        processStatus: "1",
        assigners: data.assigner ? [{ processId: getId(data.assigner) }] : [],
        directors: data.leader ? [{ processId: getId(data.leader), type: leaderType === 'person' ? 1 : 2 }] : [],
        supporters: Array.isArray(data.coordinators) ? data.coordinators.map(item => ({ processId: getId(item), type: coordinatorType === 'person' ? 1 : 2 })) : [],
        viewers: Array.isArray(data.viewers) ? data.viewers.map(item => ({ processId: getId(item) })) : [],
        reminderTime: data.reminderTime,
        repetitiveTask: data.repeatTask,
        meetingId: documentId, // Khi type="conclusion": documentId = meetingId của cuộc họp; Khi type="meeting": documentId = id của cuộc họp
        typeTaskMeeting: data.typeTaskMeeting || "meeting", // Lấy từ form data
        meetingConclusionId: meetingConclusionId || data?.meetingConclusionId || meetingConclusion?.id || meetingConclusion?._id, // ID của kết luận (chỉ có khi type="conclusion")
        templateId: data.templateId?.id,
        bypassTemplateTimeValidation: isBypass,
        isConfidential: data.isConfidential,
        isApprovalRequired: data.isApprovalRequired,

      };

      // 1. Tạo công việc trước
      const response = await axiosInstance.post(API_JOB_TO_MEETING, payload);
      const newTaskId = response?.data?._id || response?._id || response?.id;

      if (!newTaskId) {
        throw new Error("Không nhận được ID công việc sau khi tạo.");
      }

      // 2. Nếu không có file thì kết thúc
      if (validUploadedFiles.length === 0) {
        toast("Thêm mới công việc thành công!", "success");
        onSuccess?.();
        onClose();
        return;
      }

      // Tách file vật lý và link
      const filesFromLocal = validUploadedFiles.filter(item => !item?.isFromApi);
      const physicalFiles = filesFromLocal.filter(f => (f instanceof File || (f.webkitRelativePath && f.webkitRelativePath.includes("/"))));
      const linksToSave = validUploadedFiles.filter(f => f.type_file === 'link');

      // 3. Upload file nếu có
      if (physicalFiles.length > 0) {
        const isFolderUpload = physicalFiles.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));
        if (isFolderUpload) {
          const createdFolders = {};
          for (const file of physicalFiles) {
            const relativePath = file.webkitRelativePath;
            const pathParts = relativePath.split("/");
            const folderParts = pathParts.slice(0, -1);

            let parentId = null;
            let currentPath = "";

            for (const folderName of folderParts) {
              currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

              if (createdFolders[currentPath]) {
                parentId = createdFolders[currentPath];
              } else {
                const folderPayload = {
                  objectType: 'taskdocuments',
                  objectId: newTaskId,
                  name: folderName,
                  folderName: folderName,
                  parentId: parentId,
                };

                const response = await axiosInstance.post(`${APP_BASE}/api/files/folder`, folderPayload);
                const resData = response.data || response;
                const newFolderId = resData.id || resData._id;

                createdFolders[currentPath] = newFolderId;
                parentId = newFolderId;
              }
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("object_type", 'taskdocuments');
            formData.append("object_id", newTaskId);
            if (parentId) {
              formData.append("parent_id", parentId);
            }

            await axiosInstance.post(`${APP_BASE}/api/files/upload`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          }

        } else {

          // file bth

          const uploadedFileIds = [];
          for (const file of physicalFiles) {
            try {
              // objectType là "taskdocuments" cho công việc
              const uploadResponse = await apiUploadFile(file, "taskdocuments", newTaskId);
              const uploadedId = uploadResponse?.data?._id || uploadResponse?._id || uploadResponse?.id;
              if (uploadedId) {
                uploadedFileIds.push(uploadedId);
              }
            } catch (uploadError) {
              toast(`Tải lên tệp ${file.name} thất bại.`, "warning");
            }
          }
        }
      }

      // 4. Lưu link
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

      // 4. Cập nhật lại công việc với danh sách file (nếu backend yêu cầu cập nhật field files)
      // if (uploadedFileIds.length > 0) {
      //   const updatePayload = {
      //     ...payload,
      //     files: uploadedFileIds,
      //   };
      //   await axiosInstance.put(`${API_ADD_COMMON_WORK}/${newTaskId}`, updatePayload);
      // }

      toast("Thêm mới công việc và tải tệp đính kèm thành công!", "success");
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.log("error", error);
      const errorData = error?.response?.data;

      if (errorData?.code === "TEMPLATE_TIME_EXCEEDED") {
        setPendingPayload(data); // Lưu data gốc để submit lại khi user confirm
        setTemplateWarningInfo({
          templateName: errorData.templateName,
          requiredDays: errorData.requiredDays || 0,
          availableDays: errorData.availableDays || 0
        });
        setOpenPopupTemplate(true); // Mở popup confirm
        setIsLoading(false); // Tắt loading
        return; // Không hiển thị toast error
      }
      toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getFilesFromEntries = useCallback(async (items) => {
    const files = [];
    const readEntry = async (entry, path = "") => {
      if (entry.isFile) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        try {
          Object.defineProperty(file, "webkitRelativePath", {
            value: path ? `${path}/${file.name}` : file.name,
            writable: false,
            configurable: true,
          });
        } catch (e) {
          file.customRelativePath = path ? `${path}/${file.name}` : file.name;
        }
        files.push(file);
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entriesInDir = await new Promise((resolve, reject) => {
          let allEntries = [];
          const readMore = () => {
            dirReader.readEntries((results) => {
              if (results.length) {
                allEntries = allEntries.concat(results);
                readMore();
              } else {
                resolve(allEntries);
              }
            }, reject);
          };
          readMore();
        });
        for (const childEntry of entriesInDir) {
          await readEntry(childEntry, path ? `${path}/${entry.name}` : entry.name);
        }
      }
    };

    const entries = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) entries.push(entry);
    }

    for (const entry of entries) {
      await readEntry(entry);
    }
    return files;
  }, []);

  const processFilesUpload = useCallback(async (files) => {
    if (!files.length) return;

    // === VALIDATION 1: Kiểm tra số lượng file/folder theo BATCH ===
    const isFolderUpload = files.some((f) => (f.webkitRelativePath && f.webkitRelativePath.includes("/")) || f.customRelativePath);

    if (isFolderUpload) {
      const folderPaths = files.map(f => (f.webkitRelativePath || f.customRelativePath).split('/')[0]);
      const folderCount = new Set(folderPaths).size;
      if (folderCount > UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS) {
        toast(`Chỉ được tải tối đa ${UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS} folder/lần`, "error");
        return;
      }
    } else {
      if (files.length > UPLOAD_LIMITS_PER_BATCH.MAX_FILES) {
        toast(`Vượt quá ${UPLOAD_LIMITS_PER_BATCH.MAX_FILES} file/lần tải lên. Hiện tại: ${files.length} file`, "error");
        return;
      }
    }

    // === VALIDATION 2: Kiểm tra giới hạn theo CÔNG VIỆC ===
    const currentTotalCount = uploadedFiles.length;
    const currentTotalSize = uploadedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    const newFilesSize = files.reduce((sum, file) => sum + file.size, 0);
    const newItemsCount = isFolderUpload ? 1 : files.length;

    if (currentTotalCount + newItemsCount > UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS) {
      toast(`Vượt quá giới hạn ${UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS} đính kèm/công việc.`, "error");
      return;
    }

    if (currentTotalSize + newFilesSize > UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE) {
      toast(`Vượt quá tổng dung lượng ${formatFileSize(UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE)}/công việc.`, "error");
      return;
    }

    // === VALIDATION 3: Kiểm tra kích thước file/folder ===
    if (isFolderUpload) {
      const totalFolderSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalFolderSize > UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE) {
        toast(`Folder vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE)}.`, "error");
        return;
      }
      if (files.length > UPLOAD_LIMITS_PER_FOLDER.MAX_FILES) {
        toast(`Folder chứa quá nhiều file (${files.length}).`, "error");
        return;
      }
    }

    for (const file of files) {
      if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
        toast(`File "${truncateFileName(file.name, 20)}" vượt quá giới hạn.`, "error");
        return;
      }
      const nameValidation = validateFileName(file.name);
      if (!nameValidation.valid) {
        toast(`File "${file.name}": ${nameValidation.message}`, "error");
        return;
      }
      const extValidation = validateFileExtension(file.name);
      if (!extValidation.valid) {
        toast(`File "${file.name}": ${extValidation.message}`, "error");
        return;
      }
    }

    // === VALIDATION 4: Xử lý tự động đổi tên nếu trùng ===
    const filesToAdd = processFilesForUpload(files, uploadedFiles, generateDuplicateName);
    setUploadedFiles((prev) => [...prev, ...filesToAdd]);
  }, [uploadedFiles, toast]);

  const handleFilesChange = useCallback(async (event) => {
    const files = Array.from(event.target.files);
    await processFilesUpload(files);
    event.target.value = null;
  }, [processFilesUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items) {
      const files = await getFilesFromEntries(items);
      if (files.length > 0) {
        await processFilesUpload(files);
      }
    }
  }, [getFilesFromEntries, processFilesUpload]);

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

    // Thu thập tất cả file cần xóa (cả File objects từ local và file từ API)
    const fileObjectsToRemove = new Set(); // File objects từ local
    const fileIdsToRemove = new Set(); // IDs của file từ API
    const fileNamesToRemove = new Set(); // file_name của file từ API

    // Nếu là folder, tìm tất cả children
    if (selectedIsFolder) {
      const allChildren = findAllChildren(fileTreeData, selectedFileId);
      allChildren.forEach((child) => {
        if (child.file) {
          // File từ local
          fileObjectsToRemove.add(child.file);
        } else {
          // File từ API
          if (child.id || child._id) fileIdsToRemove.add(child.id || child._id);
          if (child.file_name) fileNamesToRemove.add(child.file_name);
        }
      });
    } else {
      // Nếu là file đơn lẻ
      if (fileNode.file) {
        // File từ local
        fileObjectsToRemove.add(fileNode.file);
      } else {
        // File từ API
        if (fileNode.id || fileNode._id) fileIdsToRemove.add(fileNode.id || fileNode._id);
        if (fileNode.file_name) fileNamesToRemove.add(fileNode.file_name);
      }
    }

    setUploadedFiles((prev) =>
      prev.filter((file) => {
        // Nếu là File object từ local
        if (file instanceof File) {
          return !fileObjectsToRemove.has(file);
        }
        // Nếu là file từ API
        const fileId = file.id || file._id;
        const fileName = file.file_name;
        return !fileIdsToRemove.has(fileId) && !fileNamesToRemove.has(fileName);
      })
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

  const handleClick = (e) => {
    e.stopPropagation();
    // Clear all document-related fields
    setValue('title', '');
    setValue('id', '');
    setValue('meetingDate', '');
    setValue('meetingDate', null);
    setValue('content', '');
    setValue('docId', '');
    setValue('note', '');
    setSelectedRows([]);
    setSelectedRowId(null); // Clear cached ID để dialog mở lại không còn tích cuộc họp cũ

    // Clear files từ API (fetchDataFileDocument), giữ lại files từ local
    setUploadedFiles(prev => prev.filter(file => !file.isFromApi));
  };

  // Memoize fetchDataTable để tránh re-creation và gây double API call
  const fetchDataTable = useCallback(async (params) => {
    setIsLoadingTable(true);
    try {
      const { sort, ...restParams } = params || {};
      let normalizedSort = sort;
      if (typeof sort === 'string') {
        try { normalizedSort = JSON.parse(sort); } catch { normalizedSort = undefined; }
      }
      const finalParams = normalizedSort
        ? { ...restParams, sort: normalizedSort }
        : restParams;
      const response = await api.get(API_GET_SOURCE_MEETING, { params: finalParams });
      let data = [];
      let total = 0;

      if (Array.isArray(response)) {
        data = response;
        total = response.length;
      } else if (response?.data?.items) {
        data = response.data.items;
        total = response.data.total || data.length;
      } else if (response?.items) {
        data = response.items;
        total = response.total || data.length;
      } else if (response?.data && Array.isArray(response.data)) {
        data = response.data;
        total = response.total || data.length;
      }
      setIsLoadingTable(false);
      return { data, total };
    } catch (error) {
      logger.log('Error fetching data:', error);
      return { data: [], total: 0 };
    } finally {
      setIsLoadingTable(false);
    }
  }, []); // Empty deps để stable function reference

  const meetingId = getValues('documentId')


  const fetchDataFileDocument = useCallback(async () => {
    try {


      const response = await axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=incommingdocument&object_id=${documentId}`)
      // Đánh dấu các file từ API với flag isFromApi
      const filesFromApi = Array.isArray(response) ? response.map(file => ({
        ...file,
        isFromApi: true
      })) : [];

      // Merge với file local (không có isFromApi) sử dụng functional update
      setUploadedFiles(prev => {
        // Lọc bỏ các file cũ từ API (nếu có) để tránh trùng lặp
        const localFiles = prev.filter(file => !file.isFromApi);
        // Kết hợp file local + file mới từ API
        return [...localFiles, ...filesFromApi];
      });

    } catch (error) {
      logger.log('Error fetching data:', error);
      setUploadedFiles(prev => {
        // Lọc bỏ các file cũ từ API (nếu có) để tránh trùng lặp
        const localFiles = prev.filter(file => !file.isFromApi);
        // Kết hợp file local + file mới từ API
        return [...localFiles];
      });

    }
  }, [documentId])


  useEffect(() => {
    if (documentId) {
      fetchDataFileDocument()
    }
  }, [fetchDataFileDocument, documentId])





  const handleCloseDialogViewMeeting = () => {
    setOpenViewMeeting(false);
    if (viewMeetingId) {
      setOpenDialog(true)
    }
  };

  const handleOpenDialogViewMeeting = () => {
    setOpenViewMeeting(true);
  };


  const handleClosePopupTemplate = useCallback(() => {
    setOpenPopupTemplate(false);
    setPendingPayload(null); // Clear pending payload khi đóng popup
    setTemplateWarningInfo({
      templateName: "",
      requiredDays: 0,
      availableDays: 0
    });
  }, []);
  const handleConfirmBypassTemplate = useCallback(async () => {
    if (pendingPayload) {
      // Gọi lại onSubmit với flag bypassTemplateWarning = true
      await onSubmit(pendingPayload, true);
    }
  }, [pendingPayload, onSubmit])

  // Tự động điền người giao việc khi không phải văn thư (chỉ có 1 option)
  useEffect(() => {
    const autoFillAssigner = async () => {
      if (checkPermision !== false && !checkPermision?.isVanThu && open && !watchAssigner) {
        try {
          const response = await axiosInstance.get(`${API_GET_COMMON_WORK_USER}?typeTaskUser=assigner`);
          const assignerData = response?.data || response?.items || response;

          if (assignerData && Array.isArray(assignerData) && assignerData.length > 0) {
            setValue("assigner", assignerData[0], { shouldValidate: true, shouldDirty: true });
          }
        } catch (error) {
          logger.log("Error fetching assigner for auto-fill:", error);
        }
      }
    };

    autoFillAssigner();
  }, [checkPermision, open, setValue, watchAssigner]);

  // Handler cho Tên công việc - validate realtime để hiện lỗi đỏ khi vượt 500 ký tự
  const handleTaskNameChange = useCallback((field) => (e) => {
    field.onChange(e);
    trigger("taskName");
  }, [trigger]);

  // Handler cho Mô tả - validate realtime để hiện lỗi đỏ khi vượt 3000 ký tự
  const handleDescriptionChange = useCallback((field) => (e) => {
    field.onChange(e);
    trigger("note");
  }, [trigger]);

  const handleViewRowDocument = (row) => {
    setViewMeetingId(row?.id);
    setOpenViewMeeting(true);
    setOpenDialog(false)
  }

  const handleAssignerChange = useCallback((field) => (val) => {
    field.onChange(val);
    setAssignerDelegatedNote(val?.delegatedByNote || "");
  }, []);

  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setValue("startDate", startDate, { shouldValidate: true });
    setValue("deadline", endDate, { shouldValidate: true });
    setTimeout(() => trigger(["startDate", "deadline"]), 0);
  }, [setValue, trigger]);


  // Wrapper component to move labels above inputs (giống GeneralInformation.js)
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

  const WrappedDate = useMemo(() => {
    const Wrapped = withFormWrapper(CustomDatePicker, "date");
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
  const WrappedPersonOrUnitAsyncInput = useMemo(() => {
    const Wrapped = withFormWrapper(PersonOrUnitAsyncInput, "asyncSelect");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedPersonOrUnitAsyncInput";
    return Component;
  }, []);

  const WrappedCustomInput = useMemo(() => {
    const Wrapped = withFormWrapper(CustomInput, "input");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedCustomInputt";
    return Component;
  }, []);



  return (
    <CustomSwipper
      title={
        <SkyFlexGap8 component="span" sx={{ display: 'inline-flex' }}>
          {title}
          {/* Thông tin người uỷ quyền */}
          {assignerDelegatedNote && (
            <DelegatedNoteText component="span">
              {assignerDelegatedNote}
            </DelegatedNoteText>
          )}
        </SkyFlexGap8>
      }
      open={open}
      onClose={onClose}
      onSave={handleSubmit(onSubmit, onError)}
      type="add"
      hideBackdrop
      isLoading={isLoading}
      footer={
        <>
          <FlexGrowBox />
          <FooterActions>
            <CustomButton
              onClick={handleSubmit(onSubmit, onError)}
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
            {/* Nguồn cuộc họp - full width */}
            <Grid item xs={12}>
              <Controller
                name="docId"
                control={control}
                render={({ field }) => (
                  <WrappedCustomInput
                    label="Nguồn cuộc họp"
                    {...field}
                    required
                    disabled={!!meetingConclusion}
                    error={!!errors.docId}
                    helperText={errors.docId?.message}
                    InputProps={{
                      readOnly: true,
                      style: (field.value && !meetingConclusion) ? { cursor: 'pointer' } : {},
                      onClick: (field.value && !meetingConclusion) ? handleOpenDialogViewMeeting : undefined,
                      startAdornment: field.value ? (
                        <InputAdornment position="start">
                          <StyledDescriptionIcon />
                        </InputAdornment>
                      ) : null,
                      endAdornment: !meetingConclusion ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '8px' }}>
                          {field.value && (
                            <ClearableInputAdornment style={{ position: 'relative', right: 'auto' }}>
                              <IconButton size="small" onClick={handleClick} edge="end">
                                ✖
                              </IconButton>
                            </ClearableInputAdornment>
                          )}
                          <StyledSearchButton
                            variant="outlined"
                            onClick={handleOpenDialog}
                            disabled={!!meetingConclusion}
                          >
                            Tìm kiếm
                          </StyledSearchButton>
                        </div>
                      ) : null,
                    }}
                    inputProps={{
                      style: {
                        color: "#0062AD",
                        fontWeight: "bold",
                      }
                    }}
                  />
                )}
              />
            </Grid>

            {/* Tiêu đề cuộc họp, Kết luận, Ngày họp - Row 2 (3 columns) */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tiêu đề cuộc họp"
                    {...field}
                    disabled
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="conclusion"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Kết luận"
                    {...field}
                    disabled
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="receiveDate"
                control={control}
                render={({ field }) => (
                  <WrappedDate
                    label="Ngày họp"
                    value={field.value}
                    onChange={handleDateChange(field.onChange, 'receiveDate')}
                    onBlur={field.onBlur}
                    showTime
                    disabled
                  />
                )}
              />
            </Grid>

            {/* Row 3: Tên công việc (xs={12} sm={8}), Ngày bắt đầu - Hạn xử lý (xs={12} sm={4}) */}
            <Grid item xs={12} sm={8}>
              <Controller
                name="taskName"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tên công việc"
                    placeholder="Nhập tên công việc"
                    {...field}
                    onChange={handleTaskNameChange(field)}
                    inputProps={{ maxLength: 501 }}
                    required
                    error={!!errors.taskName}
                    helperText={errors.taskName?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <WrappedDateTimeRangePicker
                showTime
                label="Ngày bắt đầu - Ngày dự kiến kết thúc"
                value={{
                  startDate: watch("startDate"),
                  endDate: watch("deadline"),
                }}
                onChange={handleDateRangeChange}
                minDate={dayjs()}
                startLabel="Ngày bắt đầu"
                endLabel="Hạn xử lý"
                required
                maxDate={maxDate}
                error={!!(errors.startDate || errors.deadline)}
                helperText={errors.startDate?.message || errors.deadline?.message}
              />
            </Grid>

            {/* Row 4: Quy trình (xs={12} sm={4}), Độ ưu tiên (xs={12} sm={4}), Cột trống (xs={12} sm={4}) */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="templateId"
                control={control}
                render={({ field }) => (
                  <WrappedAsyncAutoComplete
                    label="Quy trình"
                    placeholder="Tìm kiếm"
                    {...field}
                    url={`${API_TEMPLATE}`}
                    queryParam="name"
                    optionLabel="name"
                    optionValue="id"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Độ ưu tiên"
                    placeholder="Chọn độ ưu tiên"
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
            <Grid item xs={12} sm={4}>
              <Controller
                name="reminderTime"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Thời gian nhắc hạn"
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

            {/* Row 5: Mô tả (xs={12} md={8}) + Thời gian nhắc hạn, Phê duyệt, Mật (xs={12} md={4}) */}
            <Grid item xs={12} md={8}>
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Mô tả"
                    multiline
                    rows={6}
                    placeholder="Nhập mô tả công việc..."
                    {...field}
                    onChange={handleDescriptionChange(field)}
                    inputProps={{ maxLength: 3001 }}
                    error={!!errors.note}
                    helperText={errors.note?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4} mt={'15px'}>
              <Grid container spacing={3}>

                {(!checkPermision?.disableSuporter && !hideCoordinators) && (
                  <Grid item xs={12}>
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
                        />
                      )}
                    />
                  </Grid>
                )}
                {checkPermision?.isSecret === true && (
                  <Grid item xs={12}>
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
          <JobCommentHeader mt={2.5} mb={2.5}>
            <SkyFlexGap8 >
              <StyledIconWrapper noBg>
                <StytedPeopleIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} >
                THÔNG TIN NGƯỜI THAM GIA
              </JobSectionTitle>
            </SkyFlexGap8>

          </JobCommentHeader>

          <Grid container rowSpacing={3} columnSpacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="assigner"
                control={control}
                render={({ field }) => (
                  <WrappedAsyncAutoComplete
                    label="Người giao việc"
                    placeholder="Tìm kiếm"
                    {...field}
                    onChange={handleAssignerChange(field)}
                    url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=assigner`}
                    queryParams={["name", "email"]}
                    optionLabel="name"
                    optionValue="id"
                    required
                    error={!!errors.assigner}
                    helperText={errors.assigner?.message}
                    disabled={!(checkPermision?.isVanThu)}
                     optionSubLabel="parentName"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="leader"
                control={control}
                render={({ field }) => (
                  !(checkPermision?.directorSelectDepartment) ? (
                    <WrappedAsyncAutoComplete
                      label="Người chủ trì"
                      placeholder="Tìm kiếm"
                      {...field}
                      url={`${APP_BASE}/api/users/by-task-role-form-meeting?typeTaskUser=director&leaderId=${getId(watchAssigner) || ""}&excludeId=${leaderExcludeIds}`}
                      queryParams={["name", "email"]}
                      optionLabel="name"
                      optionValue="id"
                      limitTags={3}
                       optionSubLabel="parentName"
                    />
                  ) : (
                    <WrappedPersonOrUnitAsyncInput
                      {...field}
                      label="Người chủ trì"
                      personUrl={`${APP_BASE}/api/users/by-task-role-form-meeting?typeTaskUser=director&leaderId=${getId(watchAssigner) || ""}&excludeId=${leaderExcludeIds}`}
                      unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=director`}
                      personQueryParams={["name", "email"]}
                      unitQueryParams={["name"]}
                      onTypeChange={setLeaderType}
                      defaultType={leaderType}
                       optionSubLabel="parentName"
                    />
                  )
                )}
              />
            </Grid>

            {!checkPermision?.disableSuporter && !hideCoordinators && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="coordinators"
                  control={control}
                  render={({ field }) => (
                    !(checkPermision?.supporterSelectDepartment) ? (
                      <WrappedAsyncAutoComplete
                        {...field}
                        label="Người phối hợp"
                        url={`${APP_BASE}/api/users/by-task-role-form-meeting?typeTaskUser=supporter&leaderId=${getId(watchAssigner) || ""}&excludeId=${coordinatorExcludeIds}`}
                        limitTags={3}
                        queryParams={["name", "email"]}
                        placeholder="Tìm kiếm"
                        isMulti
                        optionLabel="name"
                        optionValue="id"
                         optionSubLabel="parentName"
                      />
                    ) : (
                      <WrappedPersonOrUnitAsyncInput
                        {...field}
                        label="Người phối hợp"
                        personUrl={`${APP_BASE}/api/users/by-task-role-form-meeting?typeTaskUser=supporter&leaderId=${getId(watchAssigner) || ""}&excludeId=${coordinatorExcludeIds}`}
                        unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=supporter`}
                        personQueryParams={["name", "email"]}
                        unitQueryParams={["name"]}
                        isMulti
                        onTypeChange={setCoordinatorType}
                        defaultType={coordinatorType}
                         optionSubLabel="parentName"
                      />
                    )
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
                    url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=viewer&leaderId=${getId(watchAssigner) || ""}&excludeId=${viewerExcludeIds}`}
                    queryParams={["name", "email"]}
                    optionLabel="name"
                    optionValue="id"
                    limitTags={3}
                     optionSubLabel="parentName"
                  />
                )}
              />
            </Grid>
          </Grid>
        </StyledBoxContainerContent>
        {/* TÀI LIỆU CÔNG VIỆC */}
        <SkyFlexGap8 mt={2.5} mb={2.5}>
          <StyledIconWrapper>
            <StytedDescriptionIcon />
          </StyledIconWrapper>
          <JobSectionTitle variant="h6" gutterBottom mb={0} >
            TÀI LIỆU LIÊN QUAN
          </JobSectionTitle>
        </SkyFlexGap8>

        <UploadDropZone
          styledMarginTop
          as={StyledBoxContainerContent}
          isDragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >

          <JobButtonContainer>
            <ButtonOutline onClick={handleOpenLinkPopup} startIcon={<LinkIcon />}>
              Thêm Link
            </ButtonOutline>
            <ButtonOutline component="label" startIcon={<AttachFileIcon />}>
              Tải File
              <input type="file" hidden multiple onChange={handleFilesChange} />
            </ButtonOutline>
            <ButtonOutline component="label" startIcon={<FolderOutlined />}>
              Tải Folder
              <input type="file" hidden multiple webkitdirectory="" onChange={handleFilesChange} />
            </ButtonOutline>

          </JobButtonContainer>

          {/* Hiển thị FileTreeTable với cấu trúc cây */}
          <FileTreeTable
            data={fileTreeData}
            onFileMenuClick={handleFileMenuClick}
            MenuIcon={StyledMenuIcon}
            emptyMessage="Kéo thả tệp hoặc thư mục vào đây để tải lên"
          />
          <Menu
            anchorEl={fileMenuAnchor}
            open={Boolean(fileMenuAnchor)}
            onClose={handleCloseFileMenu}
            id="file-menu"
          >
            <MenuItem onClick={handleOpenDeleteDialog}>
              <StyledListItemIcon>
                <DeleteOutlined />
              </StyledListItemIcon>
              <ListItemText>Xóa</ListItemText>
            </MenuItem>
          </Menu>
        </UploadDropZone>
      </JobMainContent>


      <StyleDialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="lg"
      >
        <StyledDialogContentNoScrollbar>
          <StyledDialogHeaderWrapper><StyledTitleText  >Chọn cuộc họp nguồn</StyledTitleText></StyledDialogHeaderWrapper>
          <CustomTableTreeStatic
            columns={columnAddJobToMeeting}
            fetchData={openDialog ? fetchDataTable : undefined}
            selection={selectedRows.map(row => row._id || row.id || row.documentId)}
            onSelectionChange={handleSelectRows}
            loading={isLoadingTable}
            disableAdd
            disableAct
            placeholder="Tìm kiếm tiêu đề cuộc họp"
            filtersAdvanced
            noneTitle
            filter={[{ name: 'tiêu đề cuộc họp', code: 'title' }]}
            disableDeletePQ
            // filter={filter}
            disableDelete
            disableSelectAll
            disableSynchronize
            advancedFilterConfig={advancedFilterConfigSourceMeeting}
            docTypeOptions={docTypeOptions}
            statusOptions={statusOptions}
            customMaxHeight={isMobileOrTablet ? 450 : 370}
            selectionReturns="object"
            onSelectView={handleViewRowDocument}
          />
        </StyledDialogContentNoScrollbar>
        <StyledDialogActions>
          <CustomButton variant="primary" onClick={handleSelectDocument}>
            CHỌN
          </CustomButton>
          <CustomButton variant="error" onClick={handleCloseDialog}>
            ĐÓNG
          </CustomButton>
        </StyledDialogActions>
      </StyleDialog>



      <CustomDialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onSave={handleDeleteFile}
        title="Xác nhận xóa"
        type="delete"
        size="sm"
        isLoading={isLoading}
      >
        Bạn có muốn xóa không?
      </CustomDialog>

      <PopupTemplate
        open={openPopupTemplate}
        onClose={handleClosePopupTemplate}
        onSave={handleConfirmBypassTemplate}
        templateWarningInfo={templateWarningInfo?.templateName}
        onCloseDialog={onClose}
        setReloadData={setReloadData}
        templateName={templateWarningInfo?.templateName}
      />

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
            <WrappedCustomInput
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
            <WrappedCustomInput
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

      <ViewMeetingSchedule
        open={openViewMeeting}
        onClose={handleCloseDialogViewMeeting}
        meetingId={meetingId || viewMeetingId}
      />

    </CustomSwipper>
  );
};

export default withSharedComponents(AddJobToMeeting);
