import React, { useEffect, useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Controller, useForm } from "react-hook-form";
import { Grid, Button, Chip, CircularProgress, Backdrop, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  StyledBoxContainerContent,
   StyledIconWrapper,
    StyledHeaderContent,
    StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import dayjs from "dayjs";
import { useDispatch, useSelector }
from "react-redux";
import withSharedComponents from "@components/WrapperComponent";
import { defaultValueRecordManagement } from "./constantsRecordManagement";
// import {
//   SectionTitleV2,
// } from "@pages/TextAway/Tab/SigningSubmissionTab/componentStyle/AddDialog.style";
import { withFormWrapper } from "@components/common/FormWrapper";
import {
  StyledContainerTitle,
  // StyledDescriptionRoundedIcon,
  // StyledGeneralInformation,
} from "@styles/RecordManagement.styles";
import CustomTable from "@components/CustomTable/CustomTable";
import {
  getDetailDocument,
  getDetailFolder,
  archiveDocument,
  addFilesToItem,
  updateDocument,
} from "@redux/slices/RecordManagement/RecordManagementSlice";
import api from "@services/api";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import { API_VIEW_FILE, APP_BASE, API_XLSX_TO_PDF, API_COUNT_VIEW_DOWNLOAD_FILE } from "@EnvironmentFile/constants/urlConfig";
import { FileViewerDialog } from "@components/CustomDialog";
import axiosInstance from "@utils/axiosInstance";
import { useToast } from "@components/common/ToastProvider";
import SearchIcon from "@mui/icons-material/Search";
import DocumentSelectionDialog from "./DocumentSelectionDialog";
import customParseFormat from "dayjs/plugin/customParseFormat";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { SkyBox, SkyTypography } from "@styles/SkyStyles";
import EditRecordManagement from "./EditRecordManagement";
import ConfirmDestroyModal from "@components/ConfirmDestroyModal/ConfirmDestroyModal";
import PopupAddIndex from "./PopupAddIndex";
import ButtonOutline from "@components/CustomButtonOutline";
import DOMPurify from "dompurify";
import { Folder as FolderIcon } from "@mui/icons-material";

dayjs.extend(customParseFormat);

const StyledStatusChip = styled(Chip)(({ theme, recordstate }) => {
  let bgColor = '#E3F2FD'; // Default Blue (State 1)
  let textColor = theme.palette.primary.main;

  if (recordstate == 2) { // Green (State 2)
    bgColor = '#E8F5E9';
    textColor = '#2E7D32';
  } else if (recordstate == 0) { // Gray (State 0)
    bgColor = '#F5F5F5';
    textColor = '#616161';
  }

  return {
    backgroundColor: bgColor,
    color: textColor,
    fontWeight: 500,
    borderRadius: '4px',
  };
});
const YellowFolderIcon = styled(FolderIcon)({
  color: "#ffb300",
  marginRight: "10px",
  fontSize: "24px",
  verticalAlign: "middle",
});

const StyledHeaderButton = styled(Button)(() => ({
  padding: '6px 16px',
  textTransform: 'none',
  fontWeight: 600,
  borderRadius: '4px',
}));

const StyledEditButton = styled(StyledHeaderButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const StyledArchiveButton = styled(StyledHeaderButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  marginLeft: theme.spacing(1),
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const StyledDocumentAccordian = styled(SkyBox)(({ theme }) => ({
  border: '1px solid #E0E0E0',
  borderRadius: '4px',
  marginBottom: theme.spacing(2),
  marginTop: theme.spacing(2),
  overflow: 'hidden',
}));

const StyledAccordionHeader = styled(SkyBox)(({ isOpen }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '12px 16px',
  backgroundColor: '#fff',
  cursor: 'pointer',
  borderBottom: isOpen ? '1px solid #E0E0E0' : 'none',
  '&:hover': {
    backgroundColor: '#F5F5F5',
  },
}));

const StyledAccordionTitle = styled(SkyTypography)(({ theme }) => ({
  flex: 1,
  fontWeight: 600,
  fontSize: '0.875rem',
  color: '#333',
  marginLeft: theme.spacing(1.5),
}));

const StyledBoxContent = styled(StyledBoxContainerContent)(({ theme }) => ({
  marginTop: theme.spacing(3),
}));

const StyledActionWrapper = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
}));

const StyledStatusLabel = styled(SkyTypography)(({ theme }) => ({
  marginRight: theme.spacing(1),
  color: theme.palette.text.secondary,
}));

const StyledChooseDocButton = styled(Button)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  textTransform: 'none',
}));

// const StyledSectionTitle = styled(SectionTitleV2)(({ theme }) => ({
//   marginBottom: theme.spacing(2),
// }));

const StyledAccordionContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const StyledArrowUp = styled(KeyboardArrowUpIcon)(({ theme }) => ({
  color: theme.palette.action.active,
}));

const StyledArrowDown = styled(KeyboardArrowDownIcon)(({ theme }) => ({
  color: theme.palette.action.active,
}));

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

const ViewRecordManagement = ({
  open,
  onClose,
  sharedComponents,
  title,
  archiveId,
  setReloadData,
  isFolder = false,
}) => {
  const {
    BaseSwipper,
    InputComponents: BaseInput,
    DatePicker: BaseDatePicker, } =
    sharedComponents;
  const isView = true;
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput, isView]);

  const DatePicker = useMemo(() => {
    const Wrapped = withFormWrapper(BaseDatePicker, "date");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
    Component.displayName = "DatePicker";
    return Component;
  }, [BaseDatePicker, isView]);
  const dispatch = useDispatch();
  const [openSections, setOpenSections] = useState({});
  const [openEdit, setOpenEdit] = useState(false);
  const { crmSource } = useSelector((state) => state.config);
  const { dataDetail } = useSelector((state) => state.recordManagement);
  // const [organizationUnitOptions, setOrganizationUnitOptions] = useState([]);
  const [openDocumentDialog, setOpenDocumentDialog] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });
  const [isOpenAddIndex, setIsOpenAddIndex] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleRefreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    if (setReloadData) setReloadData(new Date() * 1);
  }, [setReloadData]);

  const {
    control,
    reset,
  } = useForm({
    defaultValues: defaultValueRecordManagement,
  });

  useEffect(() => {
    if (open && archiveId) {
      if (isFolder) {
        dispatch(getDetailFolder(archiveId));
      } else {
        dispatch(getDetailDocument(archiveId));
      }
    }

    // const fetchOrganizationUnits = async () => {
    //     try {
    //         const response = await axiosInstance.get(API_GET_LIST_UNIT);
    //         if (response) {
    //             setOrganizationUnitOptions(Array.isArray(response) ? response : []);
    //         }
    //     } catch (error) {
    //         logger.error("Error fetching organization units:", error);
    //     }
    // };
    // fetchOrganizationUnits();
  }, [open, archiveId, dispatch, refreshTrigger, isFolder]);

  useEffect(() => {
    if (open && archiveId && API_COUNT_VIEW_DOWNLOAD_FILE) {
      axiosInstance.post(API_COUNT_VIEW_DOWNLOAD_FILE, {
        archiveRecordId: archiveId,
        actionType: "VIEW"
      }).catch(err => logger.error("Error counting record view:", err));
    }
  }, [open, archiveId]);

  useEffect(() => {
    if (dataDetail && (dataDetail.id || dataDetail._id)) {
      reset({
        ...dataDetail,
        profileHeading: dataDetail.profileHeading?.id || dataDetail.profileHeading || "",
        archivesName: dataDetail.documentTitleOriginal || dataDetail.documentTitle || dataDetail.title || dataDetail.archivesName?.id || dataDetail.archivesName || "",
        archivesNumber: dataDetail.documentSymbol || dataDetail.fileCode || dataDetail.archivesNumber || "",
        archivesOrganizationUnit: dataDetail.relatedDepartment || dataDetail.archivesOrganizationUnit?.value || dataDetail.archivesOrganizationUnit || "",
        archivesYear: dataDetail.yearCategory?.year ? dayjs(dataDetail.yearCategory.year.toString(), 'YYYY').toISOString() : (dataDetail.formationYear ? dayjs(dataDetail.formationYear.toString(), 'YYYY').toISOString() : (dataDetail.archivesYear || "")),
        archivesDeadline: dataDetail.retentionPeriod || dataDetail.archivesDeadline?.value || dataDetail.archivesDeadline || "",
        archivesMode: dataDetail.usageMode || dataDetail.archivesMode?.value || dataDetail.archivesMode || "",
        archivesLanguage: dataDetail.language || dataDetail.archivesLanguage?.value || dataDetail.archivesLanguage || "",
        archivesStartDate: dataDetail.startDate || dataDetail.archivesStartDate || "",
        archivesEndDate: dataDetail.endDate || dataDetail.archivesEndDate || "",
        archivesNote: dataDetail.notes || dataDetail.archivesNote || "",
        archivesTotalDocuments: dataDetail.totalFiles || dataDetail.totalDocuments || dataDetail.archivesTotalDocuments || (dataDetail.items ? dataDetail.items.length : ""),
        archivesTotalPages: dataDetail.totalPages || dataDetail.archivesTotalPages || "",
        category: dataDetail.category || "",
      });

      if (dataDetail.listDocIndex || dataDetail.items) {
        const sections = dataDetail.listDocIndex || dataDetail.items;
        setOpenSections(sections.reduce((acc, _, idx) => {
          acc[idx] = idx === 0; // Open the first one by default
          return acc;
        }, {}));
      }
    }
  }, [dataDetail, reset]);

  const documentIndexList = useMemo(() => {
    return dataDetail?.listDocIndex || dataDetail?.items || [];
  }, [dataDetail]);

  // const archivesOrganizationUnitOptions = organizationUnitOptions;
  const archivesDeadlineOptions =
    crmSource.find((item) => item.code === "S96")?.data || [];
  const archivesLanguageOptions =
    crmSource.find((item) => item.code === "S95")?.data || [];
  const archivesModeOptions =
    crmSource.find((item) => item.code === "S94")?.data || [];

  const handleToggleSection = useCallback((index) => () => {
    setOpenSections(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const handleOpenSelectDoc = useCallback((sectionId) => () => {
    setSelectedSectionId(sectionId);
    setOpenDocumentDialog(true);
  }, []);

  const handleSaveSelectedDocs = useCallback(async (selectedDocs) => {
    if (selectedSectionId && selectedDocs && selectedDocs.length > 0) {
      // Prioritize fileId for saving as well to ensure physical file matches
      const fileIds = selectedDocs.map(doc => doc.fileId || doc.originalId || doc.id || doc._id || doc.documentId);
      try {
        await dispatch(addFilesToItem({ itemId: selectedSectionId, fileIds })).unwrap();
        toast("Thêm tài liệu vào hồ sơ thành công!", "success");
        handleRefreshData();
      } catch (error) {
        toast(error?.message || "Có lỗi xảy ra khi thêm tài liệu!", "error");
      }
    }
    setOpenDocumentDialog(false);
  }, [selectedSectionId, dispatch, handleRefreshData, toast]);

  const handlePreview = useCallback(
    async (rowOrId) => {
      // Handle both row object and ID (in case CustomTable passes only ID)
      let row = rowOrId;
      if (typeof rowOrId !== "object" && dataDetail?.items) {
        // Flatten all files in sections to find the one matching the ID
        // Also check subDocuments if any
        const allFiles = dataDetail.items.flatMap(item => [
          ...(item.files || []),
          ...(item.documents || []),
          ...(item.subDocuments || [])
        ]);
        row = allFiles.find(f => (f.fileId === rowOrId || f.id === rowOrId || f._id === rowOrId));
      }

      if (!row) {
        toast("Không tìm thấy thông tin tài liệu.", "warning");
        return;
      }

      const fileId = row.fileId || row.id || row._id;
      const fileName = row.name || row.fileName || "Tài liệu";
      const lower = fileName.toLowerCase();

      if (!fileId) {
        toast("File không hợp lệ hoặc không có ID.", "warning");
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
          const response = await axiosInstance.get(
            `${API_VIEW_FILE}/${fileId}?public=true`,
            { responseType: "blob" }
          );
          const blob = response;
          objectUrl = URL.createObjectURL(blob);
          
          if (fileExtension === "pdf") {
            fileType = "pdf";
          } else {
            fileType = "image";
          }
        } else {
          // Other types: attempt direct view
          const response = await axiosInstance.get(
            `${API_VIEW_FILE}/${fileId}?public=true`,
            { responseType: "blob" }
          );
          const blob = response;
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
    [toast, dataDetail?.items]
  );
  
  const handleTableAction = useCallback((action, row) => {
    if (action.id === 'view') {
      handlePreview(row);
    } else if (action.id === 'download') {
      const fileId = row.fileId || row.id || row._id;
      const fileName = row.name || row.fileName || "Tài liệu";
      if (!fileId) return;

      // Call counter API for download
      if (archiveId && API_COUNT_VIEW_DOWNLOAD_FILE) {
        axiosInstance.post(API_COUNT_VIEW_DOWNLOAD_FILE, {
          archiveRecordId: archiveId,
          actionType: "DOWNLOAD"
        }).catch(err => logger.error("Error counting download:", err));
      }
      
      axiosInstance.get(`${API_VIEW_FILE}/${fileId}?public=true`, { responseType: "blob" })
        .then(response => {
          const url = window.URL.createObjectURL(new Blob([response]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        })
        .catch(() => {
          // handled by caller context if possible, or silently fail for now
        });
    }
  }, [handlePreview, archiveId]);

  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url) {
      URL.revokeObjectURL(viewingFile.url);
    }
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);

  const handleCloseDocumentDialog = useCallback(() => {
    setOpenDocumentDialog(false);
  }, []);

  const currentSectionFiles = useMemo(() => {
    if (!selectedSectionId || !documentIndexList) return [];
    const currentSection = documentIndexList.find(item => (item.id || item._id) === selectedSectionId);
    return currentSection ? (currentSection.files || currentSection.documents || []) : [];
  }, [selectedSectionId, documentIndexList]);

  const handleOpenEdit = useCallback(() => {
    setOpenEdit(true);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setOpenEdit(false);
  }, []);

  const handleOpenConfirmArchive = useCallback(() => {
    setConfirmArchive(true);
  }, []);

  const handleCloseConfirmArchive = useCallback(() => {
    setConfirmArchive(false);
  }, []);
  const handleSaveNewCategory = async (groupName) => {
  try {
    await dispatch(updateDocument({ 
      id: archiveId, 
      body: { 
        ...dataDetail, 
        items: [...documentIndexList, { groupName, files: [] }] 
      } 
    })).unwrap();
    
    toast("Thêm danh mục thành công!", "success");
    handleRefreshData(); // Reload lại data
    setIsOpenAddIndex(false);
  } catch (error) {
    toast("Có lỗi khi thêm danh mục", "error");
  }
  };
const handleOpenPopupAddIndex = useCallback(() => {
  setIsOpenAddIndex(true);
}, []);

const handleClosePopupAddIndex = useCallback(() => {
  setIsOpenAddIndex(false);
}, []);

const handleArchive = useCallback(async () => {
  const rawStart = dataDetail?.startDate || dataDetail?.archivesStartDate;
  const startDate = dayjs(rawStart);
  const now = dayjs();

  if (startDate.isValid() && startDate.isAfter(now)) {
    toast("Ngày bắt đầu của hồ sơ không được lớn hơn ngày hiện tại!", "error");
    setConfirmArchive(false);
    return;
  }

  try {
    if (!archiveId) return;

    await dispatch(archiveDocument({ 
      id: archiveId, 
      endDate: now.toISOString() 
    })).unwrap();

    toast("Lưu trữ hồ sơ thành công!", "success");
    handleRefreshData();
    if (onClose) onClose();
  } catch (error) {
    toast(error?.message || "Có lỗi xảy ra khi lưu trữ hồ sơ!", "error");
  } finally {
    setConfirmArchive(false);
  }
}, [archiveId, dispatch, handleRefreshData, onClose, toast, dataDetail]);

  const moreActions = useMemo(() => {
    if (dataDetail?.isCollected || dataDetail?.isDestroyed) return null;
    return (
      <StyledActionWrapper>
        <StyledEditButton variant="contained" onClick={handleOpenEdit}>
          CHỈNH SỬA
        </StyledEditButton>
        <StyledArchiveButton variant="contained" onClick={handleOpenConfirmArchive}>
          LƯU TRỮ HỒ SƠ
        </StyledArchiveButton>
      </StyledActionWrapper>
    );
  }, [handleOpenEdit, handleOpenConfirmArchive, dataDetail]);

  const columns = useMemo(() => [
    { name: "Văn bản điện tử", row: "name", width: "auto" },
  ], []);

  return (
    <>
      <BaseSwipper
        title={title || "Chi tiết hồ sơ"}
        open={open}
        onClose={onClose}
        type="view"
        hideBackdrop
        moreActions={moreActions}
      >
        <StyledBoxContainerContent styledMarginTop={10}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                         <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                           <StyledIconWrapper>
                                             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                               <path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0"/>
                                               <path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0"/>
                                               <path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0"/>
                                               <path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0"/>
                                               <path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0"/>
                                             </svg>
                                           </StyledIconWrapper>
                                           <StyledHeaderContent variant="h6" noWrap>
                                             THÔNG TIN CHUNG
                                           </StyledHeaderContent>
                                         </div>
                <StyledActionWrapper>
                  <StyledStatusLabel variant="body2">
                    Trạng thái hồ sơ:
                  </StyledStatusLabel>
                  { (dataDetail?.recordStateLabel || dataDetail?.statusLabel) && ((dataDetail?.recordStateLabel && dataDetail.recordStateLabel.includes('<')) || (dataDetail?.statusLabel && dataDetail.statusLabel.includes('<'))) ? (
                    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${dataDetail.recordStateLabel || dataDetail.statusLabel}</p>`) }} />
                  ) : (
                    <StyledStatusChip 
                      label={(() => {
                        const currentState = dataDetail?.recordState ?? dataDetail?.status;
                        if (currentState == 2) return "Đã lưu trữ";
                        if (currentState == 1) return "Đang thu thập";
                        if (currentState == 0) return "Chưa mở";
                        return dataDetail?.recordStateLabel || dataDetail?.statusLabel || "Chưa mở";
                      })()}
                      recordstate={dataDetail?.recordState ?? dataDetail?.status}
                      size="small" 
                    />
                  )}
                </StyledActionWrapper>
                </div>
              <StyledDivider />
            </Grid>
                <Grid item xs={12} md={6}>
                                      <Controller
                                        name="profileHeading"
                                        control={control}
                                        render={({ field }) => (
                                          <InputComponents
                                            label="Đề mục hồ sơ"
                                            placeholder="Nhập đề mục hồ sơ"
                                            required
                                            {...field}
                   
                                          />
                                        )}
                                      />
                                    </Grid>
                                      <Grid item xs={12} md={6}>
                                                                          <Controller
                                                                            name="archivesOrganizationUnit"
                                                                            control={control}
                                                                            render={({ field }) => (
                                                                              <InputComponents
                                                                                // select
                                                                                // multiple
                                                                                label="Phòng ban/đơn vị liên quan"
                                                                                placeholder="Chọn phòng ban đơn vị con"
                                                                                // options={archivesOrganizationUnitOptions}
                                                                                // customLabel="name"
                                                                                // customValue="id"
                                                                                {...field}
                                                                                // value={Array.isArray(field.value) ? field.value : []}
                                                                                required
                                                      
                                                                                isView
                                                                              />
                                                                            )}
                                                                          />
                                                                        </Grid>

            {/* Field Grid */}
            <Grid item xs={12} md={6}>
              <Controller
                name="archivesName"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tiêu đề hồ sơ"
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="archivesNumber"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Sổ và ký hiệu hồ sơ"
                    {...field}
                  />
                )}
              />
            </Grid>

           
            <Grid item xs={12} md={6}>
              <Controller
                name="archivesYear"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Năm hình thành"
                    value={field.value ? dayjs(field.value) : null}
                    views={['year']}
                    format="YYYY"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="archivesDeadline"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Thời hạn bảo quản"
                    options={archivesDeadlineOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="archivesMode"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Chế độ sử dụng"
                    options={archivesModeOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="archivesLanguage"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Ngôn ngữ"
                    options={archivesLanguageOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="archivesStartDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Ngày bắt đầu"
                    value={field.value ? dayjs(field.value) : null}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="archivesEndDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Ngày kết thúc"
                    value={field.value ? dayjs(field.value) : null}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="archivesTotalDocuments"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tổng số tài liệu"
                    {...field}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="archivesTotalPages"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tổng số trang"
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="archivesNote"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Ghi chú"
                    multiline
                    rows={3}
                    {...field}
                  />
                )}
              />
            </Grid>
          </Grid>
        </StyledBoxContainerContent>

        {/* DANH MỤC TÀI LIỆU */}
        <StyledBoxContent>
                <StyledContainerTitle>
                   <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                           <StyledIconWrapper>
                                             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                               <path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0"/>
                                               <path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0"/>
                                               <path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0"/>
                                               <path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0"/>
                                               <path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0"/>
                                             </svg>
                                           </StyledIconWrapper>
                  <StyledHeaderContent>DANH MỤC TÀI LIỆU</StyledHeaderContent>
                  </div>
                  {
                    dataDetail?.recordState !== 2 && (
                       <ButtonOutline
                    variant="contained"
                    onClick={handleOpenPopupAddIndex}
                  >
                    THÊM DANH MỤC TÀI LIỆU
                  </ButtonOutline>
                    )
                  }
                 
                </StyledContainerTitle>

          {documentIndexList.map((section, index) => (
            <StyledDocumentAccordian key={section.id || index}>
              <StyledAccordionHeader
                isOpen={!!openSections[index]}
                onClick={handleToggleSection(index)}
              >
    <YellowFolderIcon />

                <StyledAccordionTitle>
                  {section.groupName || section.title}
                </StyledAccordionTitle>
                {openSections[index] ? (
                  <StyledArrowUp />
                ) : (
                  <StyledArrowDown />
                )}
              </StyledAccordionHeader>

              {openSections[index] && (
                <StyledAccordionContent>
                  {!dataDetail?.isCollected && !dataDetail?.isDestroyed && (
                    <StyledChooseDocButton
                      variant="contained"
                      startIcon={<SearchIcon />}
                      onClick={handleOpenSelectDoc(section.id || section._id)}
                    >
                      Chọn tài liệu
                    </StyledChooseDocButton>
                  )}

                  <CustomTable
                    columns={columns}
                    data={(section.files || section.documents || []).map((f, i) => ({ ...f, stt: i + 1 }))}
                    onlyTable
                    disableCheckbox
                    noneTitle
                    autoHeight
                    disableEdit
                    enableMoreActions
                    moreActions={[
                      { id: "view", label: "Xem chi tiết", icon: <VisibilityIcon /> },
                      { id: "download", label: "Tải xuống", icon: <DownloadIcon /> },
                    ]}
                    onMoreAction={handleTableAction}
                    onView={handlePreview}
										encodeHtml
                  />
                </StyledAccordionContent>
              )}
            </StyledDocumentAccordian>
          ))}
        </StyledBoxContent>
      </BaseSwipper>

      <FileViewerDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        fileUrl={viewingFile.url}
        fileName={viewingFile.name}
        fileType={viewingFile.type}
        title={`Xem file: ${viewingFile.name}`}
        size="xl"
        isheight="80vh"
      />

      <StyledBackdrop open={isLoading}>
        <StyledLoadingStack>
          <StyledCircularProgress />
          <Typography variant="h6">Đang xử lý file...</Typography>
        </StyledLoadingStack>
      </StyledBackdrop>

      <DocumentSelectionDialog
        open={openDocumentDialog}
        onClose={handleCloseDocumentDialog}
        onSave={handleSaveSelectedDocs}
        initialSelectedIds={currentSectionFiles}
      />

      {openEdit && (
        <EditRecordManagement
          open={openEdit}
          onClose={handleCloseEdit}
          archiveId={archiveId}
          setReloadData={handleRefreshData}
          isFolder={isFolder}
        />
      )}
      <PopupAddIndex
        open={isOpenAddIndex}
        title="Thêm danh mục tài liệu"
        onClose={handleClosePopupAddIndex}
        onSave={handleSaveNewCategory}
        existingNames={documentIndexList.map(item => item.groupName || item.title)}
      />

      <ConfirmDestroyModal
        open={confirmArchive}
        onClose={handleCloseConfirmArchive}
        onConfirm={handleArchive}
        mainMessage="Bạn có chắc chắn muốn lưu trữ hồ sơ này. Sau khi lưu trữ, các thông tin sẽ không thể chỉnh sửa"
        subMessage="Tác vụ này sẽ không thể hoàn tác"
      />
    </>
  );
};

ViewRecordManagement.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  sharedComponents: PropTypes.object.isRequired,
  title: PropTypes.string,
  archiveId: PropTypes.string,
  setReloadData: PropTypes.func,
};

export default withSharedComponents(ViewRecordManagement);
