import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  Typography,
  // IconButton,
  DialogActions,
  styled,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import StepThongTinChung from "./StepThongTinChung";
import CustomStepper from "@components/CustomStepper/CustomStepper";
import ListForm from "@pages/ListForm";
import FunctionManagement from "@pages/AdministrationSystem/FunctionManagement";
import DesignBPMN from "@pages/BPMN/DesignBPMN/index";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Roles from "./Roles";
import DynamicForm from "@pages/DynamicForm";
// import CloseIcon from "@mui/icons-material/Close";
import withSharedComponents from "@components/WrapperComponent";
import api from "@services/api";
import { API_ADD_FIELD_BPMN } from "@EnvironmentFile/constants/urlConfig";

const PageContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  padding: theme.spacing(2, 2, 1),
  minHeight: "calc(100vh - 80px)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
}));

const ContentBox = styled(Box)(({ theme, isActiveStep, enableInnerScroll }) => ({
  flex: 1,
  minHeight: 0,
  marginTop: theme.spacing(2),
  overflowY: enableInnerScroll ? "auto" : "visible",
  overflowX: "hidden",
  ...(isActiveStep && {
    marginLeft: theme.spacing(-2),
    marginRight: theme.spacing(-2),
  }),
}));

const WorkflowCard = styled(Box)(({ theme }) => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3, 2, 2),
}));

const BreadcrumbBar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(0.75),
  marginBottom: theme.spacing(1.25),
  textTransform: "uppercase",
  fontSize: "0.95rem",
  fontWeight: 500,
}));

const BreadcrumbLink = styled("button")(() => ({
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  font: "inherit",
  textTransform: "inherit",
  color: "rgba(35, 100, 176, 0.7)",
}));

const BreadcrumbCurrent = styled("span")(() => ({
  color: "#2364B0",
  fontWeight: 600,
}));

const BreadcrumbSeparator = styled("span")(() => ({
  color: "rgba(35, 100, 176, 0.7)",
}));

const DesignBPMNContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'visible',
})(({ theme, visible, darkMode }) => ({
  display: visible ? 'block' : 'none',
  width: '100%',
  height: 'calc(70vh - 100px)',
  marginTop: theme.spacing(2),

  ...(darkMode && {
    '& .djs-context-pad .entry': {
      backgroundColor: '#334155',
      borderColor: '#475569',
      filter: 'invert(1) brightness(1.5)',
    },
    '& .djs-context-pad .entry:hover': {
      backgroundColor: '#475569',
      borderColor: '#90caf9',
    },
  }),
}));


const NavigationContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  boxSizing: "border-box",
  zIndex: 1200,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(2),
  marginTop: "auto",
  padding: theme.spacing(1.5, 3),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  boxShadow: "none",
  overflow: "visible",
  [theme.breakpoints.down("md")]: {
    padding: theme.spacing(1.25, 2),
    flexWrap: "wrap",
    rowGap: theme.spacing(1.25),
    justifyContent: "flex-end",
  },
}));

const ButtonGroup = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  alignItems: "center",
  flexWrap: "wrap",
}));

const RightButtonGroup = styled(ButtonGroup)(({ theme }) => ({
  marginLeft: "auto",
  justifyContent: "flex-end",
  [theme.breakpoints.down("md")]: {
    width: "100%",
  },
}));

const OutlinedButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '&.Mui-disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    color: `${theme.palette.action.disabled} !important`,
  },
}));

const ContainedButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  
}));

const FullScreenDialog = styled(Dialog)({
  '& .MuiDialog-paper': {
    display: 'flex',
    flexDirection: 'column',
  },
});

const RelativeAppBar = styled(AppBar)({
  position: 'relative',
});

const DialogTitleTypography = styled(Typography)(({ theme }) => ({
  marginLeft: theme.spacing(2),
  flex: 1,
}));

const FullScreenDialogContent = styled(DialogContent)({
  padding: 0,
  margin: 0,
  flex: 1,
  display: 'flex',
});

const FullScreenBpmnWrapper = styled(Box)(({ darkMode }) => ({
  flex: 1,
  display: 'flex',

  ...(darkMode && {
    '& .djs-context-pad .entry': {
      backgroundColor: '#334155',
      borderColor: '#475569',
      filter: 'invert(1) brightness(1.5)',
    },
    '& .djs-context-pad .entry:hover': {
      backgroundColor: '#475569',
      borderColor: '#90caf9',
    },
  }),
}));


const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2),
}));

// const HiddenBox = styled(Box)({
//   display: 'none',
// });

const DisabledOverlay = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  minHeight: '50vh', // Đảm bảo overlay có chiều cao tối thiểu
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  //css nền
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    fontWeight: 'bold',
    boxShadow: theme.shadows[3],
    backgroundColor: theme.palette.mode === 'light' ? '#ffffff' : theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    zIndex: 1,
  },
  //css chữ
  '& > *': {
    position: 'relative',
    zIndex: 2,
    color: theme.palette.mode === 'light' ? theme.palette.primary.main : theme.palette.text.secondary,
    fontWeight: 'bold',
    padding: theme.spacing(2),
  },

}));

const BpmnButtonGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'center',
  marginLeft: theme.spacing(2),
  flexWrap: "wrap",
}));

const CloseButton = styled(Button)(() => ({
  backgroundColor: '#d32f2f',
  color: '#fff',
  '&:hover': {
    backgroundColor: '#c62828',
  },
}));

const steps = [
  "Thông tin chung",
  "Bộ Thuộc Tính",
  "Quản lý Chức năng",
  "Thiết kế luồng quy trình",
  "Cấu hình biểu mẫu động",
  "Vai trò",
];

// function EditProcess(props) {
const EditProcess = () => {
  // const {sharedComponents} = props;
  // const { Button } = sharedComponents;
  const [activeStep, setActiveStep] = useState(0);
  const [processDetail, setProcessDetail] = useState(null);
  const [fullProcessData, setFullProcessData] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down(768));
  const { id } = useParams();
  const refDesignBPMN = useRef();
  const navigate = useNavigate();
  const currentPageBreadcrumb = useSelector((state) => state.layout.currentPageBreadcrumb || []);

  const fetchProcessDetail = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(`${API_ADD_FIELD_BPMN}/${id}`);
      setFullProcessData(response.data);
      setProcessDetail(response.data?.processSelect);
    } catch (error) {
      logger.error("Error fetching process detail:", error);
    }
  }, [id]);

  useEffect(() => {
    fetchProcessDetail();
  }, [fetchProcessDetail]);

  useEffect(() => {
    if (activeStep === 5) {
      fetchProcessDetail();
    }
  }, [activeStep, fetchProcessDetail]);

  // Handlers to call actions exposed by DesignBPMN via ref
  const handleSaveDiagramBpmn = useCallback(() => {
    if (refDesignBPMN.current && refDesignBPMN.current.saveDiagram) {
      refDesignBPMN.current.saveDiagram();
    }
  }, []);

  const handleDeployBpmn = useCallback(() => {
    if (refDesignBPMN.current && refDesignBPMN.current.deployToCamunda) refDesignBPMN.current.deployToCamunda();
  }, []);

  const handleExportXmlBpmn = useCallback(() => {
    if (refDesignBPMN.current && refDesignBPMN.current.exportXml) refDesignBPMN.current.exportXml();
  }, []);

  const handleTriggerUpload = useCallback(() => {
    if (refDesignBPMN.current && refDesignBPMN.current.triggerFileUpload) refDesignBPMN.current.triggerFileUpload();
  }, []);

  const handleImportFromServer = useCallback(() => {
    if (refDesignBPMN.current && refDesignBPMN.current.importFromServer) refDesignBPMN.current.importFromServer();
  }, []);

  const handleUpdateThongTinChung = useCallback(() => {
    document.getElementById('hidden-submit-thongtinchung')?.click();
  }, []);

  const handleNext = async () => {
    const nextStep = activeStep + 1;
    if (activeStep < steps.length - 1) setActiveStep(nextStep);
  };

  const handleBack = () => {
    if (activeStep > 0) setActiveStep((prev) => prev - 1);
  };

  const handleToggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    // Khi đóng fullscreen, trigger refresh dữ liệu trên giao diện chính
    if (isFullScreen) {
      setRefreshTrigger((prev) => prev + 1);
    }
  };
  
  const handleStepClick = useCallback((index) => {
    setActiveStep(index);
  }, []);

  const handleClose = () => {
  navigate(-1); // Quay lại trang trước
  // Hoặc: navigate('/danh-sach-quy-trinh'); // Đến trang cụ thể
};

  const createBreadcrumbClickHandler = useCallback(
    (path) => () => {
      if (path) {
        navigate(path);
      }
    },
    [navigate]
  );

  const breadcrumbItems = useMemo(() => {
    if (Array.isArray(currentPageBreadcrumb) && currentPageBreadcrumb.length > 0) {
      const normalized = currentPageBreadcrumb
        .filter((crumb) => crumb?.title)
        .map((crumb) => ({ title: crumb.title, path: crumb.path || null }));

      const hasCurrentStep = normalized.some(
        (crumb) => crumb.title?.toLowerCase() === "chỉnh sửa quy trình"
      );

      if (!hasCurrentStep) {
        normalized.push({ title: "Chỉnh sửa quy trình", path: null });
      }

      return normalized;
    }

    return [
      { title: "Danh sách quy trình", path: "/list-bpmn" },
      { title: "Chỉnh sửa quy trình", path: null },
    ];
  }, [currentPageBreadcrumb]);

  return (
    <PageContainer>
      <BreadcrumbBar>
        {breadcrumbItems.map((crumb, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const key = `${crumb.title}-${index}`;
          return (
            <React.Fragment key={key}>
              {isLast || !crumb.path ? (
                <BreadcrumbCurrent>{crumb.title}</BreadcrumbCurrent>
              ) : (
                <BreadcrumbLink type="button" onClick={createBreadcrumbClickHandler(crumb.path)}>
                  {crumb.title}
                </BreadcrumbLink>
              )}
              {!isLast && <BreadcrumbSeparator>&gt;</BreadcrumbSeparator>}
            </React.Fragment>
          );
        })}
      </BreadcrumbBar>

      <WorkflowCard>
        <CustomStepper
          steps={steps}
          activeStep={activeStep}
          onStepClick={handleStepClick}
          visualVariant="bpmnEdit"
        />

			<ContentBox
        isActiveStep={activeStep === 3 && !isSmallScreen}
        enableInnerScroll={false}
      >
          {/* Chỉ render DesignBPMN khi đã có dữ liệu ban đầu để tránh việc component tự fetch lại lần nữa */}
          {fullProcessData && (
            <DesignBPMNContainer visible={activeStep === 3}>
              <DesignBPMN 
                ref={refDesignBPMN} 
                idList={id} 
                isFullScreen={isFullScreen} 
                refreshTrigger={refreshTrigger} 
                initialData={fullProcessData}
              />
            </DesignBPMNContainer>
          )}

          {(() => {
            const restrictedSteps = [1, 2, 3, 4];
            const isRestricted = isSmallScreen && restrictedSteps.includes(activeStep);

            const renderStepContent = (index) => {
              if (activeStep !== index) return null; // Chỉ render step đang active

              if (isRestricted) {
                return (
                  <DisabledOverlay>
                    <Typography>Sử dụng thiết bị có độ phân giải lớn hơn 768px để sử dụng tính năng này</Typography>
                  </DisabledOverlay>
                );
              }

              switch (index) {
                case 0: return <StepThongTinChung />;
                case 1: return <ListForm idList={id} tableMaxHeightOffset={480} />;
                case 2: return <FunctionManagement idList={id} tableMaxHeightOffset={480} />;
                case 3: return null; // Đã render ở trên với display: activeStep === 3 ? 'block' : 'none'
                case 4: return <DynamicForm idList={id} />;
                case 5: return <Roles key={activeStep} applyInspection={refDesignBPMN.current?.applyInspection} processId={id} processSelect={processDetail} />;
                default: return null;
              }
            };

            return steps.map((label, index) => (
              <div key={label} style={{ display: activeStep === index ? 'block' : 'none' }}>
                {renderStepContent(index)}
              </div>
            ));
          })()}
			</ContentBox>
      </WorkflowCard>


      {(!isSmallScreen || ![1, 2, 3, 4].includes(activeStep)) && (
        <NavigationContainer>
          {activeStep === 3 && (
            <BpmnButtonGroup>
              <OutlinedButton onClick={handleSaveDiagramBpmn}>✨ Lưu BPMN</OutlinedButton>
              <OutlinedButton onClick={handleDeployBpmn}>🚀 Triển khai BPMN</OutlinedButton>
              <OutlinedButton onClick={handleExportXmlBpmn}>📄 Xuất file XML</OutlinedButton>
              <OutlinedButton onClick={handleTriggerUpload}>🌐 Tải lên BPMN</OutlinedButton>
              <OutlinedButton onClick={handleImportFromServer}>📥 Tải sơ đồ từ server</OutlinedButton>
            </BpmnButtonGroup>
          )}

          <RightButtonGroup>
            <OutlinedButton disabled={activeStep === 0} onClick={handleBack}>
              Quay lại
            </OutlinedButton>
            {activeStep === 0 && (
              <CloseButton onClick={handleClose}>
                Đóng
              </CloseButton>
            )}
            {activeStep === 3 && (
              <OutlinedButton onClick={handleToggleFullScreen}>
                Toàn màn hình
              </OutlinedButton>
            )}
            {activeStep === 0 && (
              <ContainedButton onClick={handleUpdateThongTinChung}>
                Cập nhật
              </ContainedButton>
            )}
            {activeStep < steps.length - 1 && (
              <ContainedButton onClick={handleNext}>Tiếp tục</ContainedButton>
            )}
          </RightButtonGroup>
        </NavigationContainer>
      )}

      <FullScreenDialog
        fullScreen
        open={isFullScreen}
        onClose={handleToggleFullScreen}
      >
        <RelativeAppBar>
          <Toolbar>
            <DialogTitleTypography variant="h6" component="div">
              Thiết kế luồng quy trình
            </DialogTitleTypography>
          </Toolbar>
        </RelativeAppBar>
        <FullScreenBpmnWrapper>
          <FullScreenDialogContent>
            <DesignBPMN ref={refDesignBPMN} idList={id} isFullScreen={isFullScreen} refreshTrigger={refreshTrigger} />
          </FullScreenDialogContent>
        </FullScreenBpmnWrapper>
        <StyledDialogActions>
          <OutlinedButton onClick={handleSaveDiagramBpmn}>✨ Lưu BPMN</OutlinedButton>
          <OutlinedButton onClick={handleToggleFullScreen}>
            Đóng
          </OutlinedButton>
        </StyledDialogActions>
      </FullScreenDialog>
    </PageContainer>
  );
}

export default withSharedComponents(EditProcess)


