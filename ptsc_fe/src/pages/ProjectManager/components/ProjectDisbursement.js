import React, { useState, useCallback, useEffect, useMemo } from "react";
import { styled } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import dayjs from "dayjs";
import { useForm, Controller } from "react-hook-form";

import {
  SkyBox,
  SkyPaper,
  SkyTypography,
  SkyButton,
  SkyIconButton,
  SkyGrid,
} from "@styles/SkyStyles";
import CustomTable from "@components/CustomTable/CustomTableStatic";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInputBase";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import LoadingDialog from "@components/LoadingDialog";
import api from "@services/api";
import CustomDateTimePicker from "@components/CustomDateTimePicker";
import CustomAutoCompleteSearch from "@components/CustomAutoCompleteSearch";


// Styled components for the cards
const CardWrapper = styled(SkyPaper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "none",
  borderRadius: "12px",
}));

const CardLabel = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: "14px",
  fontWeight: 500,
  marginBottom: theme.spacing(1),
}));

const CardValue = styled(SkyTypography)(({ theme, excess }) => ({
  color: excess ? theme.palette.error.main : theme.palette.primary.main,
  fontSize: "28px",
  fontWeight: 700,
}));

const CardSubLabel = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: "14px",
  fontWeight: 600,
  textAlign: "right",
}));

const CardSubValue = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: "28px",
  fontWeight: 700,
  textAlign: "right",
}));

const HeaderWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: theme.spacing(3),
}));

const TitleWrapper = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
}));

const TitleWrapperflex = styled(SkyBox)(({theme}) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

const ActionButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
  padding: "8px 16px",
  fontSize: "14px",
}));

const TableSectionTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "16px",
  fontWeight: 600,
  marginTop: theme.spacing(4),
}));

const CardContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: theme.spacing(2),
}));

const MainContainer = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const ActionHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));



const DialogContentWrapper = styled(SkyGrid)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const MainTitle = styled(SkyTypography)(() => ({
  fontWeight: 700,
  color: "#003366",
}));

const SubTitle = styled(SkyTypography)(({ theme, col }) => ({
  color: col ? col : theme.palette.text.secondary,
}));

const formatNumber = (val) => {
  if (!val || val === 0) return "0";
  const str = val.toString().replace(/\./g, "");
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * DisbursementDialog Component
 */
const DisbursementDialog = ({ open, onClose, onSave, data, isEdit, isView, projectData, loading }) => {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      disbursementAmount: null,
      disbursementDate: dayjs(),
      disbursedByUserId: null,
      notes: "",
    },
  });

  const handleBudgetChange = useCallback((onChange) => (e) => {
    const val = e.target.value.replace(/\./g, "");
    if (/^\d*$/.test(val)) {
      onChange(formatNumber(val));
    }
  }, []);

  useEffect(() => {
    if (open) {
      if ((isEdit || isView) && data) {
        reset({
          disbursementAmount: formatNumber(data.disbursementAmount ?? data.amount ?? null),
          disbursementDate: data.disbursementDate ? dayjs(data.disbursementDate) : dayjs(),
          disbursedByUserId: data.disbursedByUserId ?? data.userId ?? null,
          notes: data.notes ?? data.note ?? "",
        });
      } else {
        reset({
          disbursementAmount: null,
          disbursementDate: dayjs(),
          disbursedByUserId: null,
          notes: "",
        });
      }
    }
  }, [open, isEdit, isView, data, reset, projectData]);

  const onSubmit = useCallback((formData) => {
    const cleanedData = {
      ...formData,
      disbursementAmount: formData.disbursementAmount 
        ? Number(String(formData.disbursementAmount).replace(/\./g, "")) 
        : null
    };
    onSave(cleanedData);
  }, [onSave]);

  const dialogTitle = isView
    ? "Xem chi tiết đợt giải ngân"
    : isEdit
      ? "Chỉnh sửa đợt giải ngân"
      : "Thêm đợt giải ngân mới";

  const users = [
    projectData?.managerId,
    ...(projectData?.members || [])
  ].filter(Boolean).filter(
    (item, index, self) =>
      index === self.findIndex(u => u.userId === item.userId)
  );
  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title={dialogTitle}
      onSave={isView ? undefined : handleSubmit(onSubmit)}
      size="md"
      isLoading={loading}
      titleButton={isView ? null : "Lưu"}
      disableSave={isView}
    >
      <DialogContentWrapper container spacing={3}>
        <SkyGrid item xs={12} md={6}>
          <Controller
            name="disbursementAmount"
            control={control}
            rules={isView ? {} : { required: "Vui lòng nhập số tiền" }}
            render={({ field, fieldState: { error } }) => (
              <CustomInput
                {...field}
                label="Số tiền giải ngân"
                placeholder="Nhập số tiền (VND)"
                type="text"
                onChange={handleBudgetChange(field.onChange)}
                required={!isView}
                fullWidth
                disabled={isView}
                error={!!error}
                helperText={error?.message}
              />
            )}
          />
        </SkyGrid>
        <SkyGrid item xs={12} md={6}>
          <Controller
            name="disbursementDate"
            control={control}
            rules={isView ? {} : { required: "Vui lòng chọn thời gian" }}
            render={({ field, fieldState: { error } }) => (
              <CustomDateTimePicker
                {...field}
                label="Thời gian giải ngân"
                showTime
                format="DD/MM/YYYY HH:mm"
                required={!isView}
                fullWidth
                disabled={isView}
                error={!!error}
                minDate={projectData?.startDate ? dayjs(projectData.startDate) : dayjs()}
                helperText={error?.message}
                value={field.value ? dayjs(field.value) : null}
              />
            )}
          />
        </SkyGrid>
        <SkyGrid item xs={12} md={6}>
          <Controller
            name="disbursedByUserId"
            control={control}
            rules={isView ? {} : { required: "Vui lòng chọn người giải ngân" }}
            render={({ field, fieldState: { error } }) => (
              <CustomAutoCompleteSearch
                label="Người giải ngân"
                placeholder="Tìm kiếm"
                options={users|| []}
                value={field.value}
                onChange={field.onChange}
                optionLabel="name"
                optionValue="userId"
                required={!isView}
                fullWidth
                disabled={isView}
                error={!!error}
                helperText={error?.message}
              />
            )}
          />
        </SkyGrid>
        <SkyGrid item xs={12} md={6}>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <CustomInput
                {...field}
                label="Ghi chú"
                placeholder="Nhập ghi chú (tùy chọn)"
                fullWidth
                disabled={isView}
              />
            )}
          />
        </SkyGrid>
      </DialogContentWrapper>
    </CustomDialog>
  );
};

/**
 * ProjectDisbursement Component
 */
const ProjectDisbursement = (props) => {
  const { data } = props;
  const idProject = data?.id || data?._id;
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(null);
  const [disbursementsSummary, setDisbursementsSummary] = useState(null);
  const toast = useToast();

  const [dialogState, setDialogState] = useState({
    open: false,
    isEdit: false,
    data: null,
    isView: false,
    isDelete: false,
  });
  logger.log("dialogState", dialogState?.data);

  const fetchData = useCallback(async (params) => {
    if (!idProject || idProject === "undefined" || idProject === "NaN") {
      return { data: [], total: 0 };
    }
    try {
      const response = await api.get(`${APP_BASE}/api/project/${idProject}/disbursements`, {
        params: {
          ...params
        }
      })
      let data = [];
      let total = 0;

      if (Array.isArray(response)) {
        data = response;
        total = response.length;
      } else if (response?.data?.data) {
        data = response.data.data;
        total = response.data.total || data.length;
      } else if (response?.data) {
        data = response.data;
        total = response.total || data.length;
      }
      return { data, total };

    } catch (error) {
      toast(
        error?.response?.data?.message || 'Lỗi khi lấy dữ liệu',
        'error'
      )
      return { data: [], total: 0 };
    }
  }, [toast, idProject])

  const fetchSummary = useCallback(async () => {
    if (!idProject || idProject === "undefined" || idProject === "NaN") {
      return;
    }
    try {
      const response = await axiosInstance.get(`${APP_BASE}/api/project/${idProject}/disbursements/summary`);
      setDisbursementsSummary(response);
    } catch (error) {
      logger.error("Lỗi khi lấy thông tin giải ngân:", error);
      toast(
        error?.response?.data?.message || 'Lỗi khi lấy thông tin giải ngân',
        'error'
      )
    }
  }, [idProject, toast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, data?.budget]);

  const fetchDataDetail = useCallback(async (disbursementId) => {
    if (!idProject || idProject === "undefined" || idProject === "NaN" || !disbursementId) {
      return;
    }
    setLoading(true);
    try {
      logger.log("dialogState1", `${APP_BASE}/api/project/${idProject}/disbursements/${disbursementId}`);
      const response = await axiosInstance.get(`${APP_BASE}/api/project/${idProject}/disbursements/${disbursementId}`);
      const dataResponse = response;

      if (!dataResponse) {
        throw new Error("Không có dữ liệu trả về");
      }
      setDialogState((prev) => ({ ...prev, data: dataResponse }));
    } catch (error) {
      logger.error("Lỗi khi lấy thông tin đợt giải ngân:", error);
      toast(
        error?.response?.data?.message || 'Lỗi khi lấy thông tin đợt giải ngân',
        'error'
      )
    } finally {
      setLoading(false);
    }
  }, [idProject, toast]);

  const currentDisbursementId = useMemo(() => {
    const data = dialogState.data;
    return Array.isArray(data)
      ? (typeof data[0] === 'object' ? (data[0]?.id || data[0]?._id) : data[0])
      : (typeof data === 'object' ? (data?.id || data?._id) : data);
  }, [dialogState.data]);

  useEffect(() => {
    if (dialogState.open && (dialogState.isEdit || dialogState.isView) && currentDisbursementId) {
      fetchDataDetail(currentDisbursementId);
    }
  }, [dialogState.open, dialogState.isEdit, dialogState.isView, currentDisbursementId, fetchDataDetail]);

  const handleOpenAdd = useCallback(() => {
    setDialogState({ open: true, isEdit: false, data: null, isView: false, isDelete: false });
  }, []);

  const handleOpenEdit = useCallback((row) => {
    setDialogState({ open: true, isEdit: true, data: row, isView: false, isDelete: false });
  }, []);
  const handleOpenView = useCallback((row) => {
    setDialogState({ open: true, isEdit: false, data: row, isView: true, isDelete: false });
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogState({ open: false, isEdit: false, data: null, isView: false, isDelete: false });
  }, []);

  const handleOpenDelete = useCallback((row) => {
    setDialogState({ open: false, isEdit: false, data: row, isView: false, isDelete: true });
  }, []);
  const handleCloseDelete = useCallback(() => {
    setDialogState({ open: false, isEdit: false, data: null, isView: false, isDelete: false });
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleSaveDisbursement = useCallback(async (formData) => {
    const body = {
      disbursementAmount: formData.disbursementAmount ? Number(formData.disbursementAmount.toString().replace(/\./g, "")) : null,
      notes: formData.notes,
      disbursedByUserId: formData.disbursedByUserId,
      disbursementDate: formData.disbursementDate ? dayjs(formData.disbursementDate).toISOString() : null,
    };

    const isEdit = dialogState.isEdit;
    const disbursementId = dialogState?.data?.id || dialogState?.data?._id || (typeof dialogState?.data === 'string' ? dialogState?.data : null);
    const url = isEdit
      ? `${APP_BASE}/api/project/${idProject}/disbursements/${disbursementId}`
      : `${APP_BASE}/api/project/${idProject}/disbursements`;

    const successMsg = isEdit ? "Cập nhật đợt giải ngân thành công" : "Thêm đợt giải ngân thành công";
    const failMsg = isEdit ? "Cập nhật đợt giải ngân thất bại" : "Thêm đợt giải ngân thất bại";

    setLoading(true);
    try {
      const response = isEdit
        ? await axiosInstance.patch(url, body)
        : await axiosInstance.post(url, body);

      if (response) {
        toast(successMsg, "success");
        setReload(Date.now());
        handleCloseDialog();
        fetchSummary();
      }

    } catch (error) {
      logger.error("Lỗi khi lưu đợt giải ngân:", error);
      toast(error?.response?.data?.message || failMsg, "error");
    } finally {
      setLoading(false);
    }
  }, [dialogState.isEdit, dialogState?.data, handleCloseDialog, toast, idProject, fetchSummary, fetchDataDetail]);

  const handleDelete = async () => {
    setLoading(true);
    const data = dialogState?.data;
    const disbursementId = Array.isArray(data) ? (typeof data[0] === 'object' ? (data[0]?.id || data[0]?._id) : data[0]) : (typeof data === 'object' ? (data?.id || data?._id) : data);
    try {
      const response = await axiosInstance.delete(`${APP_BASE}/api/project/${idProject}/disbursements/${disbursementId}`);
      if (response) {
        toast("Xóa đợt giải ngân thành công", "success");
        setReload(Date.now());
        handleCloseDialog();
        fetchSummary();
      }
    } catch (error) {
      logger.error("Lỗi khi xóa đợt giải ngân:", error);
      toast(error?.response?.data?.message || "Xóa đợt giải ngân thất bại", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainContainer>
      <HeaderWrapper>
        <TitleWrapper>
          <TitleWrapperflex>
            <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.73597 1.66L1.73597 5.81L6.07591 5.81L6.07591 1.66L1.73597 1.66ZM7.81188 5.81C7.81188 6.72682 7.03469 7.47 6.07591 7.47L1.73597 7.47C0.777222 7.47 0 6.72682 0 5.81L0 1.66C0 0.743207 0.777222 0 1.73597 0L6.07591 0C7.03469 0 7.81188 0.743207 7.81188 1.66L7.81188 5.81Z" fill="#2364B0"/>
<path d="M11.3141 1.66L11.3141 5.81L15.654 5.81L15.654 1.66L11.3141 1.66ZM17.39 5.81C17.39 6.72682 16.6128 7.47 15.654 7.47L11.3141 7.47C10.3553 7.47 9.57812 6.72682 9.57812 5.81L9.57812 1.66C9.57812 0.743207 10.3553 0 11.3141 0L15.654 0C16.6128 0 17.39 0.743207 17.39 1.66V5.81Z" fill="#2364B0"/>
<path d="M11.3141 10.8202L11.3141 14.9702L15.654 14.9702L15.654 10.8202L11.3141 10.8202ZM17.39 14.9702C17.39 15.887 16.6128 16.6302 15.654 16.6302H11.3141C10.3553 16.6302 9.57812 15.887 9.57812 14.9702L9.57812 10.8202C9.57812 9.90334 10.3553 9.16016 11.3141 9.16016L15.654 9.16016C16.6128 9.16016 17.39 9.90334 17.39 10.8202V14.9702Z" fill="#2364B0"/>
<path d="M1.73597 10.8202L1.73597 14.9702L6.07591 14.9702L6.07591 10.8202L1.73597 10.8202ZM7.81188 14.9702C7.81188 15.887 7.03469 16.6302 6.07591 16.6302H1.73597C0.777222 16.6302 0 15.887 0 14.9702L0 10.8202C0 9.90334 0.777222 9.16016 1.73597 9.16016L6.07591 9.16016C7.03469 9.16016 7.81188 9.90334 7.81188 10.8202L7.81188 14.9702Z" fill="#2364B0"/>
</svg>
          <MainTitle variant="h6">
            THÔNG TIN GIẢI NGÂN DỰ ÁN
          </MainTitle>
          </TitleWrapperflex>
          <SubTitle variant="body3" col='#919191'>
            Quản lý các đợt giải ngân và theo dõi tổng giải ngân
          </SubTitle>
        </TitleWrapper>
        <ActionHeader>
          {data?.flags?.canPayment && <ActionButton startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Thêm đợt giải ngân
          </ActionButton>}
          <SkyIconButton onClick={toggleExpanded}>
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </SkyIconButton>
        </ActionHeader>
      </HeaderWrapper>

      {isExpanded && (
        <>
          <SkyGrid container spacing={3}>
            <SkyGrid item xs={12} md={6}>
              <CardWrapper>
                <CardLabel>Tổng mức đầu tư</CardLabel>
                <CardValue>{disbursementsSummary?.totalInvestment.toLocaleString("vi-VN") || 0}</CardValue>
              </CardWrapper>
            </SkyGrid>
            <SkyGrid item xs={12} md={6}>
              <CardWrapper>
                <CardContainer>
                  <SkyBox>
                    <CardLabel>Tổng giải ngân</CardLabel>
                    <CardValue excess={
                      (disbursementsSummary?.totalDisbursement ?? 0) >
                      (disbursementsSummary?.totalInvestment ?? 0)
                    }>{disbursementsSummary?.totalDisbursement.toLocaleString("vi-VN") || 0}</CardValue>
                  </SkyBox>
                  <SkyBox>
                    <CardSubLabel>Số đợt giải ngân</CardSubLabel>
                    <CardSubValue>{disbursementsSummary?.disbursementCount.toLocaleString("vi-VN") || 0}</CardSubValue>
                  </SkyBox>
                </CardContainer>
              </CardWrapper>
            </SkyGrid>
          </SkyGrid>

          <TableSectionTitle>Danh sách các đợt giải ngân</TableSectionTitle>

          <CustomTable
            fetchData={fetchData}
            codeModule="disbursements"
            disableSearch
            disableAdd
            disableSynchronize
            disableCheckbox
            onSelectView={handleOpenView}
            reload={reload}
            // onView={handleOpenView}
            disableDetail
            disableAct={!data?.flags?.canPayment}
            disableEdit={!data?.flags?.canPayment}
            disableDelete={!data?.flags?.canPayment}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            styledMaxHeight={600}
            noPadding
          />
        </>
      )}

      <DisbursementDialog
        open={dialogState.open}
        onClose={handleCloseDialog}
        onSave={handleSaveDisbursement}
        data={dialogState.data}
        isEdit={dialogState.isEdit}
        isView={dialogState.isView}
        loading={loading}
        projectData={data}
      />

      <CustomDialog
        // size=""
        onClose={handleCloseDelete}
        onSave={handleDelete}
        open={dialogState.isDelete}
        title={"Xác nhận xóa?"}
        type="delete"
        isLoading={loading}
      >
        Bạn có chắc chắn muốn xóa không?
      </CustomDialog>

      <LoadingDialog open={loading} >
        Đang tải dữ liệu, vui lòng đợi...
      </LoadingDialog>

    </MainContainer>
  );
};

export default ProjectDisbursement;
