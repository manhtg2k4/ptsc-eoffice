/* eslint-disable camelcase */
import React, { useEffect, useState, useCallback } from "react";
import { SkyBox, SkyFlexGap8, SkyGrid, SkyListItemText, SkyMenu, SkyMenuItem, SkyTypography } from "@styles/SkyStyles";
import { styled } from "@mui/material/styles";
import { useForm } from "react-hook-form";
import DescriptionIcon from "@mui/icons-material/Description";
import PersonIcon from "@mui/icons-material/Person";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import { Visibility, Download, PriorityHigh } from "@mui/icons-material";
import {
  JobMainContent,
  JobSectionTitle,
  StyledBoxContainerContent,
  JobSectionHeader,
  JobStatusText,
  StyledMenuIcon,
  StyledListItemIcon,
  StytedDescriptionIcon,
  StyleLine,
} from "@pages/WorkManagement/components/Job.styles";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_COMMON_WORK, APP_BASE, API_VIEW_FILE, API_XLSX_TO_PDF, API_MERGE_LINK } from "@EnvironmentFile/constants/urlConfig";
import * as XLSX from "xlsx";
import { useDispatch, useSelector } from "react-redux";
import { getCommentsByTask } from "@redux/slices/SharedCategory/managementUnitSlice";
import InfoItem from "./InfoItem";
import ViewJob from "@pages/WorkManagement/components/ViewJob";
import FormButton from "@components/FormButton";
import FileTreeTable from "@components/FileTreeTable";
import LoadingDialog from "@components/LoadingDialog";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import api from "@services/api";
import ViewJobToDocument from "@pages/WorkManagement/components/ViewJobToDocument";
import ViewJobToMeeting from "@pages/WorkManagement/components/ViewJobToMeeting";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import DOMPurify from "dompurify";
import { StyledIconWrapper } from "@pages/ProjectManager/components/AddProject.styles";
 

const StyledDescriptionIcon = styled(DescriptionIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const StyledPersonIcon = styled(PersonIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const StyledFolderOpenIcon = styled(FolderOpenIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const StyledCalendarTodayIcon = styled(CalendarTodayIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const StyledWarningBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: "#FFF4E5",
  border: "1px solid #FFB01F",
  borderRadius: "12px",
  padding: theme.spacing(2),
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

const WarningIconWrapper = styled(SkyBox)(() => ({
  backgroundColor: "#FFB01F",
  borderRadius: "50%",
  width: "24px",
  height: "24px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexShrink: 0,
  marginTop: "2px",
  "& svg": {
    color: "#fff",
    fontSize: "16px",
  },
}));

const WarningText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "15px",
  lineHeight: 1.6,
  color: theme.palette.text.primary,
}));

const DescriptionLabel = styled(SkyTypography)(() => ({
  color: "#2F3841",
  fontSize: '0.8125rem',
  fontWeight: '600',
  marginBottom: "6px",
  display: "block",
}));

const ApprovalDetails = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Chi tiết yêu cầu phê duyệt",
  data, // Giả sử bạn truyền data công việc vào để hiển thị (mode view/edit)
  setReloadData,
  documentId
}) => {
  const {

    InputComponents,
    toast,
  } = sharedComponents;
  const dispatch = useDispatch();
  const {
    watch,
    reset,
  } = useForm({
    defaultValues: {
      taskName: data?.taskName || "",
      repeatTask: data?.repeatTask || "",
      progress: data?.progress !== undefined ? parseFloat(data.progress) : 0, // Tiến độ
      status: data?.status || "", // Trạng thái
      typeTask: data?.typeTask || "",
      dateSent: data?.dateSent || null,
      sender: data?.sender || "",
      parentName: data?.parentName || "",

    },
  });


  const [displayData, setDisplayData] = useState(data);
  const [isUpdated, setIsUpdated] = useState(false);
  // State cho dialog cập nhật
  const [isViewJobOpen, setIsViewJobOpen] = useState(false);
  const [viewJobData, setViewJobData] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [finalDocuments, setFinalDocuments] = useState([]);
  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { dataUser: authUser } = useSelector((state) => state.auth || {});

  const fetchJobDetail = useCallback(async () => {
    if ((open && data) || (open && documentId)) {
      const id = data?.id || data?._id || documentId;
      if (!id) {
        reset(data);
        setDisplayData(data);
        return;
      }
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(`${API_ADD_COMMON_WORK}/approve/${id}`);
        const jobDetail = response.data || response;

        setDisplayData(jobDetail);
        // Ánh xạ dữ liệu từ API (backend) sang Form (frontend)
        const formData = {
          taskName: jobDetail.name,
          repeatTask: jobDetail.repetitiveTask,
          dateSent: jobDetail.dateSent ? dayjs(jobDetail.dateSent) : null,
          description: jobDetail.note,
          sender: jobDetail.sender,
          progress: parseFloat(jobDetail.progress) || 0,
          status: jobDetail.processStatus,
          typeRequest: jobDetail.typeRequest,
          code: jobDetail.code,
          parentName: jobDetail.parentName,
        };
        reset(formData);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        toast(error?.response?.data?.message || "Có lỗi xảy ra!", "error");
        // console.error("Lỗi lấy chi tiết công việc:", error);
      }
    }
  }, [open, data, reset, toast, documentId]);


  useEffect(() => {
    if (open) {
      setIsUpdated(false);
    }
  }, [open]);

  const handleCloseInternal = () => {
    if (isUpdated) {
      onSuccess?.();
    }
    onClose();
  };
  const handleViewTask = useCallback((task) => {
    if (!task || (!task._id && !task.id)) {
      toast("Không có thông tin công việc để xem.", "warning");
      return;
    }
    // ViewJob mong đợi một đối tượng `data` có `id` hoặc `_id` để fetch chi tiết
    setViewJobData(task);
    setIsViewJobOpen(true);
  }, [toast]);

  const handleViewMainTask = useCallback(() => {
    handleViewTask(displayData);
  }, [displayData, handleViewTask]);

  const handleViewParentTask = useCallback(() => {
    // The check `watch("parentName")` already ensures parent exists.
    if (displayData?.parent) {
      handleViewTask({ _id: displayData.parent });
    }
  }, [displayData, handleViewTask]);

  const handleCloseViewJob = () => {
    setIsViewJobOpen(false);
    setViewJobData(null);
  };


  const handleMenuClick = useCallback((event, file) => {
    setAnchorEl(event.currentTarget);
    setSelectedFile(file);
  }, []);



  const handleDynamicFileMenuClick = useCallback((event) => {
    const fileId = event.currentTarget.dataset.fileId;
    const allFiles = [...finalDocuments];
    const file = allFiles.find(f => (f.id || f._id).toString() === fileId);
    if (file) {
      handleMenuClick(event, { ...file, name: file.file_name || file.name });
    }
  }, [handleMenuClick, finalDocuments]);

  // const handleMenuClose = () => {
  //   setAnchorEl(null);
  //   setSelectedFile(null);
  // };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFile(null);
  };


  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url) URL.revokeObjectURL(viewingFile.url);
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);

  const refetchFiles = useCallback(async () => {
    const currentUserName = authUser?.name || authUser?.fullName || "Người dùng";

    try {
      const id = data?.id || data?._id || documentId;
      if (!id) return;
      const [finalDoc, linksRes] = await Promise.all([
        axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=finaldocuments&object_id=${id}`),
        axiosInstance.get(`${API_MERGE_LINK}?taskId=${id}`)
      ]);

      const finalDocsData = finalDoc?.data?.data || finalDoc?.data || finalDoc || [];
      const linksDataRaw = linksRes?.data?.data || linksRes?.data || linksRes || [];
      const linksDataArray = Array.isArray(linksDataRaw) ? linksDataRaw : (linksDataRaw && typeof linksDataRaw === 'object' && Object.keys(linksDataRaw).length > 0 ? [linksDataRaw] : []);

      const linksData = linksDataArray.map(l => ({
        ...l,
        name: l.documentName,
        file_name: l.documentName,
        type_file: 'link',
        id: l._id || l.id,
        is_uploader: !!l.isCreator,
        from_source: l.createdByName || l.userName || l.created_by_name || l.fullName || (l.isCreator ? currentUserName : ""),
        source_type: 'link',
        hideMenu: true
      }));

      setFinalDocuments(Array.isArray(finalDocsData) ? [...finalDocsData, ...linksData.filter(l => l.objectType === 'finaldocuments')] : linksData.filter(l => l.objectType === 'finaldocuments'));

    } catch (error) {
      logger.error("Không thể tải danh sách tệp đính kèm.", error);
    }
  }, [data, documentId, authUser]);

  const handleViewFile = async () => {
    handleMenuClose();
    if (!selectedFile) return;
    const fileId = selectedFile.id || selectedFile._id;
    if (!fileId) {
      toast("File không hợp lệ.", "warning");
      return;
    }
    setIsLoading(true);
    try {

      const fileName = selectedFile.file_name || selectedFile.name;
      const lower = fileName.toLowerCase();

      const isDoc = /\.(doc|docx)$/i.test(lower);
      const isExcel = /\.(xls|xlsx)$/i.test(lower);
      const isPpt = /\.(ppt|pptx)$/i.test(lower);
      const isOtherOffice = isPpt;
      const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

      if (selectedFile?.id || selectedFile?._id) {

        const fileId = selectedFile._id || selectedFile.id;

        let blob;
        let previewName = fileName;

        if (isDoc) {
          const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
          const res = await api.get(conversionApi, {
            responseType: "blob",
            timeout: 0,
          });
          blob = new Blob([res.data], { type: "application/pdf" });
          previewName = fileName;
        } else if (isExcel) {
          // Download file first
          const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
          const fileRes = await api.get(downloadUrl, {
            responseType: "blob",
            timeout: 0,
          });

          // Convert to PDF
          const formData = new FormData();
          formData.append("file", new File([fileRes.data], fileName));

          const res = await api.post(API_XLSX_TO_PDF, formData, {
            responseType: "blob",
            timeout: 0,
          });

          blob = new Blob([res.data], { type: "application/pdf" });
          previewName = fileName;
        } else if (isBrowserFile) {
          const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
          const res = await api.get(viewUrl, {
            responseType: "blob",
            timeout: 0,
          });
          blob = new Blob([res.data], {
            type: res.headers["content-type"] || res.data.type,
          });
        } else if (isOtherOffice) {
          const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
          const res = await api.get(viewUrl, {
            responseType: "blob",
            timeout: 0,
          });
          const arrayBuffer = await res.data.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const html = XLSX.utils.sheet_to_html(
            workbook.Sheets[workbook.SheetNames[0]]
          );
          blob = new Blob([html], { type: "text/html" });
          previewName = fileName;
        } else {
          throw new Error("Định dạng file không được hỗ trợ xem trước.");
        }

        const url = URL.createObjectURL(blob);
        setViewingFile({
          open: true,
          url: url,
          name: previewName,

        });

      }


      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast("Không thể tải file để xem trước.", "error");
    }
  };

  const handleDownloadFile = async () => {
    handleMenuClose();
    if (!selectedFile) return;
    const fileId = selectedFile.id || selectedFile._id;
    if (!fileId) return;

    try {
      const response = await axiosInstance.get(`${API_VIEW_FILE}/${fileId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', selectedFile.file_name || selectedFile.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      toast("Tải xuống thất bại!", "error");
    }
  };


  ;


  // Reset khi mở và load data
  useEffect(() => {
    fetchJobDetail();
    if (open && (data || documentId)) {
      refetchFiles();
    }
  }, [open, data, documentId, refetchFiles, fetchJobDetail]);


  useEffect(() => {
    const id = data?.id || data?._id || documentId;
    if (id) {
      dispatch(getCommentsByTask({ documentId: id }));
    }
  }, [dispatch, data, documentId]);

  const handleSetReloadData = useCallback((val) => {
    setIsUpdated(true);
    setReloadData?.(val);
  }, [setReloadData]);

  const handleFormButtonClose = useCallback(async () => {
    const id = displayData?.id || displayData?._id || documentId;
    await fetchJobDetail();
    await refetchFiles();
    if (id) {
      dispatch(getCommentsByTask({ documentId: id }));
    }
    handleSetReloadData(new Date() * 1);
  }, [fetchJobDetail, refetchFiles, displayData, documentId, dispatch, handleSetReloadData]);

  return (
    <CustomSwipper
      title={title}
      open={open}
      onClose={handleCloseInternal}
      type="view" // hoặc "edit" tùy mode
      hideBackdrop
      moreActions={
        <FormButton
          dataDetail={displayData}
          setReloadData={handleSetReloadData}
          viewMode='meeting'
          onClose={handleFormButtonClose}
        />
      }
    >
      <JobMainContent>
        {/* HEADER: Tiến độ + Trạng thái */}

        <SkyGrid container mb={2}>

          <SkyGrid item xs={12} >

            <SkyBox>
              <JobStatusText
                variant="h6"
              >
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayData?.typeRequest) }} />
              </JobStatusText>
            </SkyBox>

          </SkyGrid>
        </SkyGrid>


        <StyledBoxContainerContent>
          <JobSectionHeader mt={2}>
            <SkyFlexGap8>
              <StyledIconWrapper>
                <StytedDescriptionIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} >
                THÔNG TIN CHUNG
              </JobSectionTitle>
            </SkyFlexGap8>
          </JobSectionHeader>
           <StyleLine />
          <SkyGrid container spacing={3}>
            {/* Row 1 */}
            <SkyGrid item xs={12} md={6}>
              <InfoItem
                icon={<StyledDescriptionIcon />}
                label="Tên công việc"
                value={watch("taskName")}
                showView
                onValueClick={handleViewMainTask}
              />
            </SkyGrid>
            <SkyGrid item xs={12} md={6}>
              <InfoItem
                icon={<StyledFolderOpenIcon />}
                label="Nguồn công việc"
                value={
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayData?.typeTask) }} />
                }
              />
            </SkyGrid>

            {/* Row 2 */}
            <SkyGrid item xs={12} md={6}>
              <InfoItem
                icon={<StyledPersonIcon />}
                label="Người gửi"
                value={displayData?.sender || ""}
              />
            </SkyGrid>
            <SkyGrid item xs={12} md={6}>
              <InfoItem
                icon={<StyledCalendarTodayIcon />}
                label="Ngày gửi"
                value={
                  displayData?.dateSent
                    ? dayjs(displayData.dateSent).format("DD/MM/YYYY")
                    : "--"
                }
              />
            </SkyGrid>

            {/* Row 3 */}
            <SkyGrid item xs={12} md={6}>
              <InfoItem
                icon={<StyledDescriptionIcon />}
                label="Tên công việc cha"
                value={watch("parentName") ? `${watch("parentName")}/${watch("taskName")}` : ''}
                showView
                onValueClick={handleViewParentTask}
              />
            </SkyGrid>
            <SkyGrid item xs={12} md={6}>
              <InfoItem
                icon={<StyledFolderOpenIcon />}
                label="Trạng thái công việc"
                value={
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayData?.processStatus) }} />
                }
              />
            </SkyGrid>
          </SkyGrid>
          <SkyGrid mt={'20px'}>
            <DescriptionLabel>Mô tả</DescriptionLabel>
            <InputComponents
              multiline
              rows={2}
              value={displayData?.noteSent || data?.noteSent || ""}
              disabled
            />
          </SkyGrid>
        </StyledBoxContainerContent>

        {
          displayData?.typeRequestText === "GUI_PHE_DUYET" &&
          <>
            <SkyFlexGap8 mt={'30px'} >
              <StyledIconWrapper noBg>
                <StytedDescriptionIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} mt={0}>
                TÀI LIỆU KẾT QUẢ
              </JobSectionTitle>
            </SkyFlexGap8>

            <StyledBoxContainerContent styledMarginTop>
              <FileTreeTable
                data={finalDocuments}
                onFileMenuClick={handleDynamicFileMenuClick}
                MenuIcon={StyledMenuIcon}
                isView
                fileName={displayData?.name || data?.taskName}
                sourceAsync
              />
            </StyledBoxContainerContent>
          </>
        }



        <SkyGrid item xs={12} mt={2}>
          {

            displayData?.typeRequestText === "GUI_PHE_DUYET" && <StyledWarningBox>
              <WarningIconWrapper>
                <PriorityHigh />
              </WarningIconWrapper>
              <SkyBox>
                <WarningText variant="body2">
                  Nếu <b>phê duyệt</b>, công việc sẽ chuyển sang trạng thái <b style={{ color: "#2E7D32" }}>Hoàn thành</b>.
                </WarningText>
                <WarningText variant="body2">
                  Nếu <b>từ chối</b>, công việc sẽ chuyển về trạng thái <b style={{ color: "#0072BC" }}>Đang thực hiện</b>.
                </WarningText>
              </SkyBox>
            </StyledWarningBox>}
        </SkyGrid>
      </JobMainContent>
      {selectedFile && selectedFile.type_file !== 'link' && (<SkyMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <SkyMenuItem onClick={handleViewFile}>
          <StyledListItemIcon>
            <Visibility />
          </StyledListItemIcon>
          <SkyListItemText>Xem</SkyListItemText>
        </SkyMenuItem>
        <SkyMenuItem onClick={handleDownloadFile}>
          <StyledListItemIcon>
            <Download />
          </StyledListItemIcon>
          <SkyListItemText>Tải xuống</SkyListItemText>
        </SkyMenuItem>
      </SkyMenu>
      )}
      <FilePreviewDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        url={viewingFile.url}
        fileName={viewingFile.name}
        fileType={viewingFile.type}
        title={`Xem file: ${viewingFile.name}`}
      />
      {isViewJobOpen && (
        <>
          {/* Công việc chung */}
          {displayData?.typeTaskText === "general" && (
            <ViewJob
              open={isViewJobOpen}
              onClose={handleCloseViewJob}
              data={viewJobData}
            />
          )}
          {/* Công viêc từ vb */}
          {displayData?.typeTaskText === "form_doc" && (
            <ViewJobToDocument
              open={isViewJobOpen}
              onClose={handleCloseViewJob}
              data={viewJobData}
            />
          )}
          {/* Công viêc từ Cuộc họp */}
          {displayData?.typeTaskText === "form_meeting" && (
            <ViewJobToMeeting
              open={isViewJobOpen}
              onClose={handleCloseViewJob}
              data={viewJobData}
            />
          )}
        </>
      )}

      <LoadingDialog open={isLoading} >
        Đang tải dữ liệu, vui lòng đợi...
      </LoadingDialog>

    </CustomSwipper>
  );
};

export default withSharedComponents(ApprovalDetails);