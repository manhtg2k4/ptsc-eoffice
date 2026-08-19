import React, { useCallback, useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Controller, useForm } from "react-hook-form";
import { Grid, Button, CircularProgress, Backdrop, Stack, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Box, Chip } from "@mui/material";
import { styled } from "@mui/material/styles";
import {
 StyledBoxContainerContent,
  StyledIconWrapper,
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import withSharedComponents from "@components/WrapperComponent";
import {
  defaultValueRecordManagement,
  recordManagementSchema,
} from "./constantsRecordManagement";
import {
  // SectionTitleV2,
  UploadSection,
} from "@pages/TextAway/Tab/SigningSubmissionTab/componentStyle/AddDialog.style";
import {
  StyledContainerTitle,
  // StyledGeneralInformation,
  // StyledSupTitle,
  // StyledTitleStatus,
  // StyledDescriptionRoundedIcon,
} from "@styles/RecordManagement.styles";
import { withFormWrapper } from "@components/common/FormWrapper";
import CustomTable from "@components/CustomTable/CustomTable";
// import CustomButton from "@components/CustomButton";
import PopupAddIndex from "./PopupAddIndex";
import { 
  FlexGrowBox,
  FooterActions
} from "@styles/BaseSwiper/BaseSwiper.style";
import {
  getDetailDocument,
  getDetailFolder,
  updateDocument,
  updateFolder,
} from "@redux/slices/RecordManagement/RecordManagementSlice";
import api from "@services/api";
import { useToast } from "@components/common/ToastProvider";
import { yupResolver } from "@hookform/resolvers/yup";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import { API_VIEW_FILE, API_GET_LIST_UNIT, APP_BASE, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import { FileViewerDialog } from "@components/CustomDialog";
import axiosInstance from "@utils/axiosInstance";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DocumentSelectionDialog from "./DocumentSelectionDialog";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";
import MenuIcon from "@mui/icons-material/Menu";
import EditIcon from "@mui/icons-material/Edit";
import ConfirmDestroyModal from "@components/ConfirmDestroyModal/ConfirmDestroyModal";
import DOMPurify from "dompurify";
import { Folder as FolderIcon } from "@mui/icons-material";
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
  gap: '12px',
  borderBottom: isOpen ? '1px solid #E0E0E0' : 'none',
  '&:hover': {
    backgroundColor: '#F5F5F5',
  },
}));

const StyledAccordionTitle = styled(SkyTypography)(() => ({
  flex: 1,
  fontWeight: 700,
  fontSize: '0.875rem',
  color: '#111',
  marginLeft: 0,
}));

const StyledAccordionContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
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

const StyledArrowUp = styled(KeyboardArrowUpIcon)(() => ({
  color: '#111',
}));

const StyledArrowDown = styled(KeyboardArrowDownIcon)(() => ({
  color: '#111',
}));

const MenuIconStyle = styled(MenuIcon)(() => ({
  color: '#111',
}));

const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  color: "#fff",
  zIndex: theme.zIndex.drawer + 2000,
}));

const StyledLoadingStack = styled(Stack)(({ theme }) => ({
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(2),
}));

const StyledCircularProgress = styled(CircularProgress)(() => ({
  color: "inherit",
}));


const StyledButtonGroup = styled(Grid)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const StyledHeaderActions = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}));

const StyledDeleteMenuItem = styled(MenuItem)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const StyledSmallIcon = styled('span')(() => ({
  display: 'flex',
  '& .MuiSvgIcon-root': {
    fontSize: '1.25rem',
  }
}));

const StyledErrorSmallIcon = styled(StyledSmallIcon)(({ theme }) => ({
  '& .MuiSvgIcon-root': {
    color: theme.palette.error.main,
  }
}));
const YellowFolderIcon = styled(FolderIcon)({
  color: "#ffb300",
  marginRight: "10px",
  fontSize: "24px",
  verticalAlign: "middle",
});
const DocumentCategoryItem = ({ 
  section, 
  index, 
  isOpen, 
  onToggle, 
  onSelectDoc, 
  onEdit, 
  onDelete,
  onDeleteFile,
  columns,
  onView,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState({ open: false, row: null });
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(false);

  const handleOpenMenu = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = (event) => {
    if (event) event.stopPropagation();
    setAnchorEl(null);
  };

  const handleMenuClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handleToggle = useCallback(() => onToggle(index)(), [onToggle, index]);
  const handleSelectDoc = useCallback(() => onSelectDoc(section.id || section.tempId)(), [onSelectDoc, section.id, section.tempId]);
  
  const handleEdit = (event) => {
    handleCloseMenu(event);
    onEdit(section);
  };

  const handleDelete = (event) => {
    handleCloseMenu(event);
    setConfirmDeleteCategory(true);
  };

  const handleCloseConfirmDeleteCategory = useCallback(() => {
    setConfirmDeleteCategory(false);
  }, []);

  const handleConfirmDeleteCategory = useCallback(() => {
    onDelete(section);
    setConfirmDeleteCategory(false);
  }, [onDelete, section]);

  const handleCloseConfirmDeleteFile = useCallback(() => {
    setConfirmDeleteFile({ open: false, row: null });
  }, []);

  const handleConfirmDeleteFile = useCallback(() => {
    setConfirmDeleteFile(prev => {
      if (prev.row) {
        onDeleteFile(section, prev.row);
      }
      return { open: false, row: null };
    });
  }, [onDeleteFile, section]);

  const handleTableAction = useCallback((action, row) => {
    if (action.id === 'delete') {
      setConfirmDeleteFile({ open: true, row });
    } else if (action.id === 'view') {
      onView(row);
    } else if (action.id === 'download') {
      const fileId = row.fileId || row.id || row._id;
      const fileName = row.name || row.fileName || "Tài liệu";
      if (!fileId) return;
      
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
          // toast handled by caller context if possible, or silently fail for now
        });
    }
  }, [onView]);

  return (
    <StyledDocumentAccordian>
      <StyledAccordionHeader isOpen={isOpen} onClick={handleToggle}>
        {isOpen ? <StyledArrowUp /> : <StyledArrowDown />}
      <YellowFolderIcon />
        <StyledAccordionTitle>
          {section.groupName || section.title}
        </StyledAccordionTitle>
        <StyledHeaderActions>
          <IconButton size="small" onClick={handleOpenMenu}>
            <StyledSmallIcon>
              <MenuIconStyle />
            </StyledSmallIcon>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={openMenu}
            onClose={handleCloseMenu}
            onClick={handleMenuClick}
          >
            <MenuItem onClick={handleEdit}>
              <ListItemIcon>
                <StyledSmallIcon>
                  <EditIcon />
                </StyledSmallIcon>
              </ListItemIcon>
              <ListItemText>Đổi tên danh mục</ListItemText>
            </MenuItem>
            <StyledDeleteMenuItem onClick={handleDelete}>
              <ListItemIcon>
                <StyledErrorSmallIcon>
                  <DeleteIcon />
                </StyledErrorSmallIcon>
              </ListItemIcon>
              <ListItemText>Xóa danh mục</ListItemText>
            </StyledDeleteMenuItem>
          </Menu>
        </StyledHeaderActions>
      </StyledAccordionHeader>

      {isOpen && (
        <StyledAccordionContent>
          <StyledButtonGroup container spacing={2}>
            <Grid item>
              <StyledChooseDocButton variant="contained" startIcon={<SearchIcon />} onClick={handleSelectDoc}>
                Chọn tài liệu
              </StyledChooseDocButton>
            </Grid>
          </StyledButtonGroup>

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
              { id: "delete", label: "Xóa", icon: <DeleteIcon /> }
            ]}
            onMoreAction={handleTableAction}
            onView={onView}
						encodeHtml
          />
        </StyledAccordionContent>
      )}
      <ConfirmDestroyModal
        open={confirmDeleteFile.open}
        onClose={handleCloseConfirmDeleteFile}
        onConfirm={handleConfirmDeleteFile}
        mainMessage="Bạn có chắc chắn muốn xóa tài liệu này"
        subMessage="Tác vụ này sẽ không thể hoàn tác"
      />
      <ConfirmDestroyModal
        open={confirmDeleteCategory}
        onClose={handleCloseConfirmDeleteCategory}
        onConfirm={handleConfirmDeleteCategory}
        mainMessage="Khi xóa danh mục, các tài liệu bên trong cũng sẽ được xóa. Bạn có chắc chắn muốn xóa danh mục tài liệu này."
        subMessage="Tác vụ này sẽ không thể hoàn tác"
      />
    </StyledDocumentAccordian>
  );
};

const EditRecordManagement = ({
  open,
  onClose,
  // onSuccess,
  sharedComponents,
  // mode = "add",
  title, // Nhận title từ props
	archiveId, // Nhận id bản ghi cần sửa
	setReloadData,
  isFolder = false, // Chế độ sửa danh mục hồ sơ
}) => {
  const {
    BaseSwipper,
    InputComponents: BaseInput,
    DatePicker: BaseDatePicker,
    ButtonOutline,
  } = sharedComponents;
    const InputComponents = React.useMemo(() => {
      return withFormWrapper(BaseInput, "input");
    }, [BaseInput]);
  
    const DatePicker = React.useMemo(() => {
      return withFormWrapper(BaseDatePicker, "date");
    }, [BaseDatePicker]);
  const dispatch = useDispatch();
  const toast = useToast();
  // const [openDocumentReplyDialog, setOpenDocumentReplyDialog] = useState(false);
  const [documentIndexList, setDocumentIndexList] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { crmSource } = useSelector((state) => state.config);
  const [organizationUnitOptions, setOrganizationUnitOptions] = useState([]);
  const { dataDetail } = useSelector((state) => state.recordManagement);
  const [editingIndex, setEditingIndex] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [openDocumentDialog, setOpenDocumentDialog] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm({
    resolver: yupResolver(recordManagementSchema),
    defaultValues: defaultValueRecordManagement,
  });

  useEffect(() => {
    const fetchOrganizationUnits = async () => {
      try {
        const response = await axiosInstance.get(API_GET_LIST_UNIT);
        if (response) {
            setOrganizationUnitOptions(Array.isArray(response) ? response : []);
        }
      } catch (error) {
        logger.error("Error fetching organization units:", error);
      }
    };
    fetchOrganizationUnits();
  }, []);

  useEffect(() => {
    setValue("items", documentIndexList, { shouldValidate: true });
  }, [documentIndexList, setValue]);

  useEffect(() => {
    if (open && archiveId) {
      if (isFolder) {
        dispatch(getDetailFolder(archiveId));
      } else {
        dispatch(getDetailDocument(archiveId));
      }
    }
  }, [open, archiveId, dispatch, isFolder]);

  useEffect(() => {
    if (dataDetail && (dataDetail.id || dataDetail._id)) {
      const getOrgIds = (val) => {
        if (!val) return [];
        const items = Array.isArray(val) ? val : val.split(",").map(i => i.trim());
        return items.map(item => {
          const found = organizationUnitOptions.find(opt => String(opt.id) === String(item) || opt.name === item);
          return found ? found.id : item;
        });
      };

      const getDeadlineValue = (val) => {
        if (!val) return "";
        const options = crmSource.find((item) => item.code === "S96")?.data || [];
        const found = options.find(opt => opt.value === val || opt.title === val);
        return found ? found.value : val;
      };

      const getModeValue = (val) => {
        if (!val) return "";
        const options = crmSource.find((item) => item.code === "S94")?.data || [];
        const found = options.find(opt => opt.value === val || opt.title === val);
        return found ? found.value : val;
      };

      const getLanguageValue = (val) => {
        if (!val) return "";
        const options = crmSource.find((item) => item.code === "S95")?.data || [];
        const found = options.find(opt => opt.value === val || opt.title === val);
        return found ? found.value : val;
      };

      reset({
        ...dataDetail,
        profileHeading: dataDetail.profileHeading?.id || dataDetail.profileHeading || "",
        archivesName: dataDetail.documentTitleOriginal || dataDetail.documentTitle || dataDetail.title || dataDetail.archivesName?.id || dataDetail.archivesName || "",
        archivesNumber: dataDetail.documentSymbol || dataDetail.fileCode || dataDetail.archivesNumber || "",
        archivesOrganizationUnit: getOrgIds(dataDetail.relatedDepartment || dataDetail.archivesOrganizationUnit),
        archivesYear: dataDetail.yearCategory?.year ? dayjs(dataDetail.yearCategory.year.toString(), 'YYYY').toISOString() : (dataDetail.formationYear ? dayjs(dataDetail.formationYear.toString(), 'YYYY').toISOString() : (dataDetail.archivesYear || "")),
        archivesDeadline: getDeadlineValue(dataDetail.archivesDeadline?.value || dataDetail.retentionPeriod || dataDetail.archivesDeadline),
        archivesMode: getModeValue(dataDetail.archivesMode?.value || dataDetail.usageMode || dataDetail.archivesMode),
        archivesLanguage: getLanguageValue(dataDetail.language || dataDetail.archivesLanguage?.value || dataDetail.archivesLanguage),
        archivesStartDate: dataDetail.startDate || dataDetail.archivesStartDate || "",
        archivesEndDate: dataDetail.endDate || dataDetail.archivesEndDate || "",
        archivesNote: dataDetail.notes || dataDetail.archivesNote || "",
        archivesTotalDocuments: dataDetail.totalDocuments || dataDetail.archivesTotalDocuments || (dataDetail.items ? dataDetail.items.length : ""),
        archivesTotalPages: dataDetail.totalPages || dataDetail.archivesTotalPages || "",
        category: dataDetail.category || "",
      });
      if (dataDetail.listDocIndex || dataDetail.items) {
        const sections = dataDetail.listDocIndex || dataDetail.items;
        setDocumentIndexList(sections);
        setOpenSections(sections.reduce((acc, _, idx) => {
          acc[idx] = idx === 0; // Open the first one by default
          return acc;
        }, {}));
      }
    }
  }, [dataDetail, organizationUnitOptions, crmSource, reset]);

  // const archivesOrganizationUnitOptions = organizationUnitOptions;

  const archivesDeadlineOptions =
    crmSource.find((item) => item.code === "S96")?.data || [];

  const archivesLanguageOptions =
    crmSource.find((item) => item.code === "S95")?.data || [];

  const archivesModeOptions =
    crmSource.find((item) => item.code === "S94")?.data || [];

  const handleDateChange = useCallback(
    (field) => (newDate) => {
      field.onChange(newDate ? dayjs(newDate).toISOString() : null);
    },
    []
  );

  // const handleSaveEditRecordManagement = handleSubmit(async (data) => {
  //   logger.log("data", data);
  //   try {
  //     const res = await dispatch(
  //       updateDocument({ id: archiveId, body: data })
  //     ).unwrap();
  //     logger.log("res", res);
  //     toast("Cập nhật thành công!", "success");
  //     onClose();
	// 	} catch (error) {
	// 		logger.log("Lỗi khi cập nhật!", error);
  //     toast("Lỗi khi cập nhật!", "error");
  //   }
	// });
	
  const handleSaveEditRecordManagement = handleSubmit(async (data) => {
    logger.log("data before format", data);

    try {
      let res;
      if (isFolder) {
        const submitData = {
          documentSymbol: data.archivesNumber,
          documentTitle: data.archivesName,
          yearCategoryId: dataDetail.yearCategoryId,
          // Có thể thêm các trường khác nếu cần
        };
        res = await dispatch(
          updateFolder({ id: archiveId, body: submitData })
        ).unwrap();
      } else {
        const submitData = {
          profileHeading: data.profileHeading,
          title: data.archivesName,
          category: data.category || dataDetail?.category,
          fileCode: data.archivesNumber,
          relatedDepartment: Array.isArray(data.archivesOrganizationUnit) ? data.archivesOrganizationUnit.join(",") : data.archivesOrganizationUnit,
          formationYear: data.archivesYear ? dayjs(data.archivesYear).year().toString() : (dataDetail?.formationYear?.toString() || ""),
          retentionPeriod: data.archivesDeadline,
          usageMode: data.archivesMode,
          language: data.archivesLanguage,
          startDate: data.archivesStartDate ? dayjs(data.archivesStartDate).format("YYYY-MM-DD") : null,
          endDate: data.archivesEndDate ? dayjs(data.archivesEndDate).format("YYYY-MM-DD") : null,
          notes: data.archivesNote,
          recordState: (dataDetail?.recordState ?? 1).toString(),
          items: documentIndexList.map((itemObj) => {
            const item = { ...itemObj };
            delete item.tempId;
            delete item.stt;

            const fileIds = [
              ...(item.files || []),
              ...(item.documents || [])
            ].map(f => f.fileId || f.id).filter(Boolean);

            delete item.files;
            delete item.documents;

            return {
              ...item,
              groupName: item.groupName,
              fileIds: fileIds,
            };
          }),
        };
        res = await dispatch(
          updateDocument({ id: archiveId, body: submitData })
        ).unwrap();
      }

      logger.log("res", res);
      toast("Cập nhật thành công!", "success");
      onClose();
      if (setReloadData) setReloadData(new Date() * 1);
    } catch (error) {
      logger.log("Lỗi khi cập nhật!", error);
      toast("Lỗi khi cập nhật!", "error");
    }
  });


  const handleCloseEditPopup = () => {
    setEditingIndex(null);
  };

  // const handleToggleOpen = () => {
  //   // const key = e.currentTarget.dataset.section;

  //   // setIsOpen((prev) => ({
  //   //   ...prev,
  //   //   [key]: !prev[key],
  //   // }));
  //   setIsOpen((prev) => !prev);
  // };

  // const handleOpenReplyDialog = useCallback(() => {
  //   setOpenDocumentReplyDialog(true);
  // }, []);

  const handleOpenPopupAddIndex = () => {
    setIsOpen(true);
  };
  const handleClosePopupAddIndex = () => {
    setIsOpen(false);
  };

  const handleSaveAddIndex = (data) => {
    if (data && data.trim() !== "") {
      const newItem = {
        tempId: new Date().getTime(), // for internal UI keying
        groupName: data,
        files: [],
      };
      setDocumentIndexList((prevList) => [...prevList, newItem]);
    }
  };

  const handleToggleSection = useCallback((index) => () => {
    setOpenSections(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const handleOpenSelectDoc = useCallback((sectionId) => () => {
    setSelectedSectionId(sectionId);
    setOpenDocumentDialog(true);
  }, []);

  const handleSaveSelectedDocs = useCallback(async (selectedDocs) => {
    if (selectedSectionId && selectedDocs && selectedDocs.length > 0) {
      setDocumentIndexList(prevList => {
        return prevList.map(item => {
          const itemId = item.id || item.tempId;
          if (itemId === selectedSectionId) {
            const currentFiles = item.files || item.documents || [];
            const newFiles = [...currentFiles];
            selectedDocs.forEach(doc => {
              const docId = doc.fileId || doc.originalId || doc.id || doc._id || doc.documentId;
              if (!newFiles.find(f => (f.fileId || f.id) === docId)) {
                newFiles.push({
                  ...doc,
                  fileId: docId,
                  name: doc.name || doc.fileName || doc.title
                });
              }
            });
            return { ...item, files: newFiles };
          }
          return item;
        });
      });
      toast("Thêm tài liệu thành công!", "success");
    }
    setOpenDocumentDialog(false);
  }, [selectedSectionId, toast]);

  const handleCloseDocumentDialog = useCallback(() => {
    setOpenDocumentDialog(false);
  }, []);

  const handlePreview = useCallback(
    async (rowOrId) => {
      let row = rowOrId;
      if (typeof rowOrId !== "object" && documentIndexList) {
        const allFiles = documentIndexList.flatMap(item => [
          ...(item.files || []),
          ...(item.documents || [])
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
    [toast, documentIndexList]
  );

  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url) {
      URL.revokeObjectURL(viewingFile.url);
    }
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);

  const currentSectionFiles = useMemo(() => {
    if (!selectedSectionId || !documentIndexList) return [];
    const currentSection = documentIndexList.find(item => (item.id || item.tempId) === selectedSectionId);
    return currentSection ? (currentSection.files || currentSection.documents || []) : [];
  }, [selectedSectionId, documentIndexList]);

  const handleDeleteFile = useCallback((section, row) => {
    setDocumentIndexList(prev => prev.map(s => {
      if ((s.id || s.tempId) === (section.id || section.tempId)) {
        const currentFiles = s.files || s.documents || [];
        return {
          ...s,
          files: currentFiles.filter(f => (f.fileId || f.id) !== (row.fileId || row.id))
        };
      }
      return s;
    }));
  }, []);

  const handleEditCategory = useCallback((section) => {
    setEditingIndex({ open: true, item: section });
  }, []);

  const handleDeleteCategory = useCallback((section) => {
    setDocumentIndexList((prevList) =>
      prevList.filter((item) => {
        const idToMatch = item.id || item.tempId;
        const rowIdToMatch = section.id || section.tempId;
        return idToMatch !== rowIdToMatch;
      })
    );
  }, []);

  const handleSaveEditIndex = (editedName) => {
    if (!editingIndex || !editingIndex.item) return;
    if (editedName && editedName.trim() !== "") {
      setDocumentIndexList((prevList) =>
        prevList.map((item) => {
          const idToMatch = item.id || item.tempId;
          const editingIdToMatch = editingIndex.item.id || editingIndex.item.tempId;
          return idToMatch === editingIdToMatch
            ? { ...item, groupName: editedName }
            : item;
        })
      );
    }
    handleCloseEditPopup();
  };

  const tableColumns = useMemo(() => [
    { name: "Văn bản điện tử", row: "name", width: "auto" },
  ], []);

  const existingCategoryNames = useMemo(() => {
    return documentIndexList.map((item) => item.groupName || item.title);
  }, [documentIndexList]);

  return (
    <BaseSwipper
      title={title || "Cập nhật hồ sơ"}
      open={open}
      onClose={onClose}
      onSave={handleSaveEditRecordManagement} // Sử dụng hàm handleSaveEditRecordManagement nội bộ
      type="edit"
      hideBackdrop
       footer={
                <>
                <FlexGrowBox />
                              <FooterActions>
        <ButtonOutline
          onClick={handleSaveEditRecordManagement}
          // disabled={isLoading}
          variant="outlined"
          // color="inherit"
        >
          LƯU
        </ButtonOutline>
         </FooterActions></>
      }
      // isLoading={isLoading}
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
          

          <Grid item xs={12}>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                                        <Controller
                                          name="profileHeading"
                                          control={control}
                                          render={({ field }) => (
                                            <InputComponents
                                              label="Đề mục hồ sơ"
                                              placeholder="Nhập đề mục hồ sơ"
                                              disabled
                                              required
                                              {...field}
                                              error={!!errors.profileHeading}
                                              helperText={errors.profileHeading?.message}
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
                                                                                  error={!!errors.archivesOrganizationUnit}
                                                                                  helperText={errors.archivesOrganizationUnit?.message}
                                                                                  disabled
                                                                                />
                                                                              )}
                                                                            />
                                                                          </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="archivesName"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      label="Tiêu đề hồ sơ"
                      placeholder="Nhập tiêu đề hồ sơ..."
                      {...field}
                      required
                      disabled
                      error={!!errors.archivesName}
                      helperText={errors.archivesName?.message}
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
                      label="Số và ký hiệu hồ sơ"
                      placeholder="Nhập số và ký hiệu..."
                      {...field}
                      required
                      error={!!errors.archivesNumber}
                      helperText={errors.archivesNumber?.message}
                      disabled
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
                      onChange={handleDateChange(field)}
                      required
                      disabled
                      error={!!errors.archivesYear}
                      helperText={errors.archivesYear?.message}
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
                      placeholder="Chọn thời hạn bảo quản"
                      options={archivesDeadlineOptions}
                      customLabel="title"
                      customValue="value"
                      {...field}
                      required
                      error={!!errors.archivesDeadline}
                      helperText={errors.archivesDeadline?.message}
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
                      placeholder="Chọn chế độ sử dụng"
                      options={archivesModeOptions}
                      customLabel="title"
                      customValue="value"
                      {...field}
                      required
                      error={!!errors.archivesMode}
                      helperText={errors.archivesMode?.message}
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
                      placeholder="Chọn ngôn ngữ"
                      options={archivesLanguageOptions}
                      customLabel="title"
                      customValue="value"
                      {...field}
                      // required
                      error={!!errors.archivesLanguage}
                      helperText={errors.archivesLanguage?.message}
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
                      onChange={handleDateChange(field)}
                      error={!!errors.archivesStartDate}
                      helperText={errors.archivesStartDate?.message}
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
                      required
                      value={field.value ? dayjs(field.value) : null}
                      onChange={handleDateChange(field)}
                      error={!!errors.archivesEndDate}
                      helperText={errors.archivesEndDate?.message}
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
                      placeholder="Nhập ghi chú..."
                      {...field}
                      error={!!errors.archivesNote}
                      helperText={errors.archivesNote?.message}
                      multiline
                      rows={3}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </StyledBoxContainerContent>

      <StyledBoxContainerContent styledMarginTop>
        <UploadSection item xs={12} container noneMarginTop>
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
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
                  <ButtonOutline
                    variant="contained"
                    onClick={handleOpenPopupAddIndex}
                  >
                   THÊM DANH MỤC TÀI LIỆU
                  </ButtonOutline>
                </StyledContainerTitle>
              </Grid>
            </Grid>
          </Grid>
        </UploadSection>
        <PopupAddIndex
          open={isOpen}
          onClose={handleClosePopupAddIndex}
          onSave={handleSaveAddIndex}
          existingNames={existingCategoryNames}
        />

        {editingIndex?.open && (
          <PopupAddIndex
            open={editingIndex.open}
            onClose={handleCloseEditPopup}
            onSave={handleSaveEditIndex}
            initialValue={editingIndex.item.groupName}
            title="Đổi tên danh mục tài liệu"
            existingNames={existingCategoryNames}
          />
        )}

        {documentIndexList.length > 0 && documentIndexList.map((section, index) => (
          <DocumentCategoryItem
            key={section.id || section.tempId || index}
            section={section}
            index={index}
            isOpen={!!openSections[index]}
            onToggle={handleToggleSection}
            onSelectDoc={handleOpenSelectDoc}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            onDeleteFile={handleDeleteFile}
            onView={handlePreview}
            columns={tableColumns}
          />
        ))}
      </StyledBoxContainerContent>

      <DocumentSelectionDialog
        open={openDocumentDialog}
        onClose={handleCloseDocumentDialog}
        onSave={handleSaveSelectedDocs}
        initialSelectedIds={currentSectionFiles}
      />

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
    </BaseSwipper>
  );
};

EditRecordManagement.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  sharedComponents: PropTypes.object.isRequired,
  mode: PropTypes.string,
  title: PropTypes.string,
  archiveId: PropTypes.string,
  isFolder: PropTypes.bool,
};

export default withSharedComponents(EditRecordManagement);
