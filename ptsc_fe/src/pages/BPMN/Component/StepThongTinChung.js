import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
// import { styled } from "@mui/material/styles";
import {
  Card,
  Box,
  // Button,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  styled,
  FormHelperText,
  Chip,
  IconButton,
  Typography,
  Grid,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import { useParams } from "react-router-dom";
import {
  API_ADD_FIELD_BPMN,
  FUNCTIONMANAGEMANT,
} from "@EnvironmentFile/constants/urlConfig";
import CustomInput from "@components/CustomInput/CustomInput";
import CustomInputTree from "@components/CustomInput/CustomInputTree";
import { FormFieldLayoutContext } from "@components/CustomInput/FormFieldLayoutContext";
import { processSchema } from "./constants";
import api, { callApi } from "@services/api";
import { useSelector } from "react-redux";
// import { getDataListUnit } from "@redux/slices/managementUsersSlice";
import ProcessSelectionDialog from "./ProcessSelectionDialog";
import { useToast } from "@components/common/ToastProvider";

const ChipBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  maxHeight: "110px", // Giới hạn chiều cao khoảng 4 dòng chip
  overflowY: "auto", // Thêm thanh cuộn dọc khi vượt quá
  width: "calc(100% - 36px)", // Trừ đi không gian cho nút xóa tất cả
  gap: theme.spacing(0.5),
}));

const ClearIcons = styled(ClearIcon)(() => ({
  fontSize: "small",
}));

const CheckboxContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  gap: theme.spacing(2),
  flexWrap: "wrap",
}));

const TreeWrapper = styled(Box)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    minHeight: 150, // Tương đương khoảng 4 dòng
    alignItems: "flex-start",
    paddingTop: theme.spacing(1),
    "& .MuiSelect-select": {
      whiteSpace: "normal", // Cho phép rớt dòng
      paddingTop: "4px",
      // Nhắm vào ChipContainer (là MuiBox-root nằm trong Select)
      "& .MuiBox-root": {
        flexWrap: "wrap !important",
        overflowX: "hidden !important",
        overflowY: "auto",
        maxHeight: "120px",
        whiteSpace: "normal !important",
      }
    }
  }
}));

const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2.5),
  paddingBottom: theme.spacing(2),
  boxShadow: "none",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
}));

const FormContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(3),
  padding: theme.spacing(1),
}));

const FormGrid = styled(Grid)(() => ({
  marginBottom: 0,
}));

const FullWidthFormControl = styled(FormControl)({
  width: "100%",
  position: "relative",
});

// const UpdateButton = styled(Button)(({ theme }) => ({
//   backgroundColor: theme.palette.primary.main,
//   color: theme.palette.primary.contrastText,
//   marginTop: theme.spacing(0.25),
//   "&:hover": {
//     backgroundColor: theme.palette.primary.dark,
//   },
// }));

// --- Styled Components for Chip Input ---
const ChipInputContainer = styled("div", {
  shouldForwardProp: (prop) => prop !== "error",
})(({ theme, error }) => ({
  position: "relative",
  padding: "8px 14px",
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${error ? theme.palette.error.main : "rgba(0, 0, 0, 0.23)"}`,
  minHeight: "48px", // Match TextField height
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  "&:hover": {
    borderColor: error ? theme.palette.error.main : theme.palette.text.primary,
  },
}));

const FloatingInputLabel = styled(InputLabel)(({ theme }) => ({
  position: "absolute",
  top: "-0.2em",
  left: "8px",
  backgroundColor: theme.palette.background.paper,
  padding: "0 4px",
  fontSize: "0.95rem",
  color: theme.palette.text.secondary,
  zIndex: 1,
}));

const PlaceholderTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  userSelect: "none",
}));

const ClearAllIconButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  right: theme.spacing(1), // 8px
  top: "50%",
  transform: "translateY(-50%)",
}));

const StyledSelect = styled(Select, {
  shouldForwardProp: (prop) => prop !== "hasValue",
})(({ hasValue }) => ({
  "& .MuiSelect-select": {
    paddingRight: hasValue ? "40px" : undefined,
  },
}));

const ClearProcessIconButton = styled(IconButton)({
  position: "absolute",
  right: 30,
  top: "50%",
  transform: "translateY(-50%)",
});

export default function StepThongTinChung() {
  const [featureList, setFeatureList] = useState([]);
  const [allBpmnProcesses, setAllBpmnProcesses] = useState([]);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  // const dispatch = useDispatch();
  const toast = useToast();
  // const { listUnit } = useSelector((state) => {
  //   const managementUnit = state.unit || {};
  //   return {
  //     listUnit: managementUnit.listUnit || [],
  //   };
  // });
  const handleMouseDown = (e) => {
    e.stopPropagation();
  };

  // ✅ Lấy dữ liệu từ Redux store
  const { crmSource } = useSelector((state) => ({
    crmSource: state.config.crmSource || [],
  }));

  // Đảm bảo destructuring useForm trước khi sử dụng getValues và các biến phụ thuộc
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm({
    defaultValues: {
      name: "",
      id: "",
      description: "",
      hasStartForm: false,
      showInPermissionDetail: false,
      unit: [],
      relatedProcesses: [],
      startFormId: "",
      documentType: "",
      processSelect: "",
    },
    resolver: yupResolver(processSchema),
  });

  // ✅ Lọc ra danh sách quy trình từ crmSource
  const processList = useMemo(() => {
    const loaiVanBanSource = crmSource.find(
      (item) => item.code === "LOAIVANBAN"
    );
    return loaiVanBanSource?.data || [];
  }, [crmSource]);

  // Lấy dữ liệu loại văn bản giống AddDialog
  const documentTypeOptions =
    crmSource.find((item) => item.code === "S19")?.data || [];

  // ✅ Thay đổi logic: Tìm process object dựa trên `value` thay vì `_id`
  const selectedProcessObjects = useMemo(() => {
    return (getValues("relatedProcesses") || [])
      .map((value) => processList.find((p) => p.value === value))
      .filter(Boolean);
  }, [getValues, processList, watch("relatedProcesses")]); // Thêm watch để re-render khi thay đổi

  // Kiểm tra nếu có chọn Văn bản đi
  const isVanBanDi = selectedProcessObjects.some(
    (p) => p?.title === "Văn bản đi"
  );
  const { id } = useParams();

  const watchHasStartForm = watch("hasStartForm");

  useEffect(() => {
    const fetchBpmnDetail = async () => {
      if (!id) return;
      try {
        const res = await api.get(`${API_ADD_FIELD_BPMN}/${id}`);
        reset({
          name: res.data?.name || "",
          id: res.data?.id || "",
          description: res.data?.description || "",
          hasStartForm: res.data?.hasStartForm || false,
          showInPermissionDetail: res.data?.showInPermissionDetail || false,
          unit: res.data?.unit || [],
          relatedProcesses: res.data?.relatedProcesses || [],
          startFormId: res.data?.startFormId || "",
          documentType: res.data?.documentType || "",
          processSelect: res.data?.processSelect || "",
        });
      } catch (err) {
        throw new Error("Lỗi khi tải BPMN từ API:", err);
      }
    };

    fetchBpmnDetail();
  }, [id, reset]);

  useEffect(() => {
    const fetchAllBpmn = async () => {
      try {
        const res = await api.get(`${API_ADD_FIELD_BPMN}?limit=9999`);
        setAllBpmnProcesses(res.data?.data || []);
      } catch (err) {
        logger.error("Lỗi khi tải danh sách tất cả BPMN:", err);
      }
    };
    fetchAllBpmn();
  }, []);

  // Reset documentType khi chuyển loại quy trình
  useEffect(() => {
    if (!isVanBanDi) {
      setValue("documentType", "", { shouldValidate: true });
    }
  }, [isVanBanDi, setValue]);

  // useEffect(() => {
  //   dispatch(getDataListUnit({ page: 1, limit: 500 }));
  // }, [dispatch]);

  useEffect(() => {
    const fetchFeature = async () => {
      try {
        const { data: feature } = await callApi(
          "get",
          `${FUNCTIONMANAGEMANT}?limit=9999&featureType=form&processID=${id}`
        );
        setFeatureList(feature.data);
      } catch (error) {
        logger.log("🚀 ~ fetchFeature ~ error:", error);
      }
    };
    fetchFeature();
  }, [id]);

  const onUpdate = async (data) => {
    try {
      // ✅ Tìm option tương ứng để lấy ID
      const selectedOption = documentTypeOptions.find(
        (option) => (option.value || option.id) === data.documentType
      );

      const payload = {
        ...data,
        unit: (data.unit || []).map((u) => (u && typeof u === "object" ? (u._id || u.id) : u)).filter(Boolean),
        documentType: selectedOption?.id || data.documentType || "", 
      };
      await api.patch(`${API_ADD_FIELD_BPMN}/${id}`, payload);
      toast("Cập nhật thành công!", "success");
    } catch (err) {
      toast("Lỗi khi cập nhật", "error");
    }
  };


  const handleOpenProcessDialog = useCallback(
    () => setIsProcessDialogOpen(true),
    []
  );
  const handleCloseProcessDialog = useCallback(
    () => setIsProcessDialogOpen(false),
    []
  );

  const handleSaveProcesses = useCallback(
    (selectedProcesses) => {
      // `selectedProcesses` bây giờ là một mảng các `value`
      setValue("relatedProcesses", selectedProcesses, { shouldValidate: true });
      handleCloseProcessDialog();
    },
    [setValue, handleCloseProcessDialog]
  );
  const handleDeleteProcess = useCallback(
    (processValueToDelete) => (event) => {
      event.stopPropagation();
      const currentProcesses = getValues("relatedProcesses") || [];
      const newProcesses = currentProcesses.filter(
        (value) => value !== processValueToDelete
      );
      setValue("relatedProcesses", newProcesses, { shouldValidate: true });
    },
    [getValues, setValue]
  );

  const handleClearAllProcesses = useCallback(
    (event) => {
      event.stopPropagation();
      setValue("relatedProcesses", [], { shouldValidate: true });
    },
    [setValue]
  );


  const handleClearProcessSelect = useCallback(
    (event) => {
      event.stopPropagation();
      setValue("processSelect", "");
    },
    [setValue]
  );


  // ✅ Tính toán các unit ID cần loại trừ
  // const excludedUnitIds = useMemo(() => {
  //   const currentProcessId = id;
  //   const currentRelatedProcesses = getValues("relatedProcesses") || [];
  //   const currentSelectedUnits = getValues("unit") || [];
  //   if (currentRelatedProcesses.length === 0) return [];

  //   const otherProcessesWithSameType = allBpmnProcesses.filter(
  //     (p) =>
  //       p._id !== currentProcessId &&
  //       p.relatedProcesses?.some((rp) => currentRelatedProcesses.includes(rp))
  //   );

  //   const usedUnitIds = otherProcessesWithSameType.flatMap((p) => p.unit || []);

  //   const usedUnitIdSet = new Set(usedUnitIds);

  //   currentSelectedUnits.forEach((unitId) => usedUnitIdSet.delete(unitId));
  //   return Array.from(usedUnitIdSet);
  // }, [id, allBpmnProcesses, watch("relatedProcesses")]);

  return (
    <StyledCard>
      <FormFieldLayoutContext.Provider value={{ inputLabelLayout: "stacked" }}>
        <FormContainer>
          <FormGrid container columnSpacing={{ xs: 2.5, md: 4 }} rowSpacing={3.5}>
            <Grid item xs={12} md={6}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <CustomInput
                        {...field}
                        label="Tên quy trình"
                        error={!!errors.name}
                        helperText={errors.name?.message}
                        required
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="id"
                    control={control}
                    render={({ field }) => (
                      <CustomInput
                        {...field}
                        label="Mã quy trình"
                        error={!!errors.id}
                        helperText={errors.id?.message}
                        required
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="relatedProcesses"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <ChipInputContainer
                          error={!!errors.relatedProcesses}
                          onClick={handleOpenProcessDialog}
                        >
                          <FloatingInputLabel shrink={selectedProcessObjects.length > 0}>
                            Loại quy trình
                          </FloatingInputLabel>
                          {selectedProcessObjects.length > 0 ? (
                            <>
                              <ChipBox>
                                {selectedProcessObjects.map((process) => (
                                  <Chip
                                    key={process.value}
                                    label={process.title}
                                    onDelete={handleDeleteProcess(process.value)}
                                    size="small"
                                    onMouseDown={handleMouseDown}
                                  />
                                ))}
                              </ChipBox>
                              <ClearAllIconButton
                                onClick={handleClearAllProcesses}
                                size="small"
                              >
                                <ClearIcons />
                              </ClearAllIconButton>
                            </>
                          ) : (
                            <PlaceholderTypography variant="body1"></PlaceholderTypography>
                          )}
                        </ChipInputContainer>
                        {errors.relatedProcesses && (
                          <FormHelperText>
                            {errors.relatedProcesses.message}
                          </FormHelperText>
                        )}
                        <input
                          type="hidden"
                          {...field}
                          value={JSON.stringify(field.value || [])}
                        />
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="processSelect"
                    control={control}
                    render={({ field }) => (
                      <FullWidthFormControl>
                        <InputLabel id="process-select-label">Chọn quy trình</InputLabel>
                        <StyledSelect
                          {...field}
                          labelId="process-select-label"
                          label="Chọn quy trình"
                          value={field.value || ""}
                          hasValue={!!field.value}
                        >
                          {allBpmnProcesses.map((process) => (
                            <MenuItem key={process.id} value={process.id}>
                              {process.name}
                            </MenuItem>
                          ))}
                        </StyledSelect>
                        {field.value && (
                          <ClearProcessIconButton
                            size="small"
                            onClick={handleClearProcessSelect}
                          >
                            <ClearIcons />
                          </ClearProcessIconButton>
                        )}
                      </FullWidthFormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <CheckboxContainer>
                    <Controller
                      name="hasStartForm"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox checked={field.value} onChange={field.onChange} />
                          }
                          label="Cấu hình chức năng bắt đầu quy trình"
                        />
                      )}
                    />
                    <Controller
                      name="showInPermissionDetail"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox checked={field.value} onChange={field.onChange} />
                          }
                          label="Hiển thị trong chi tiết phân quyền"
                        />
                      )}
                    />
                  </CheckboxContainer>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} md={6}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Controller
                    name="unit"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <TreeWrapper>
                        <CustomInputTree
                          select
                          customLabel={"name"}
                          customValue={"_id"}
                          api="api/organization-units"
                          apiExpand="api/organization-units/children"
                          required
                          treeView
                          multiple
                          error={!!errors.unit}
                          helperText={errors.unit?.message}
                          label="Phòng ban áp dụng"
                          placeholder="Chọn phòng ban áp dụng"
                          isSelectData
                          isPopup
                          {...field}
                        />
                      </TreeWrapper>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <CustomInput
                        {...field}
                        label="Mô tả"
                        error={!!errors.description}
                        helperText={errors.description?.message}
                      />
                    )}
                  />
                </Grid>

                  <button 
                    type="button" 
                    id="hidden-submit-thongtinchung" 
                    style={{ display: 'none' }} 
                    onClick={handleSubmit(onUpdate)} 
                  />
              </Grid>
            </Grid>

            {isVanBanDi && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="documentType"
                  control={control}
                  render={({ field }) => (
                    <FullWidthFormControl>
                      <InputLabel id="document-type-label">Loại văn bản</InputLabel>
                      <Select
                        {...field}
                        labelId="document-type-label"
                        label="Loại văn bản"
                        value={field.value || ""}
                        MenuProps={{
                          anchorOrigin: {
                            vertical: "top",
                            horizontal: "left",
                          },
                          transformOrigin: {
                            vertical: "bottom",
                            horizontal: "left",
                          },
                          getContentAnchorEl: null,
                        }}
                      >
                        {documentTypeOptions.map((option) => (
                          <MenuItem key={option.id} value={option.id}>
                            {option.label || option.title || option.value}
                          </MenuItem>
                        ))}
                      </Select>
                    </FullWidthFormControl>
                  )}
                />
              </Grid>
            )}

            {watchHasStartForm && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="startFormId"
                  control={control}
                  render={({ field }) => (
                    <FullWidthFormControl error={!!errors.startFormId}>
                      <InputLabel id="start-form-select-label">Chọn form</InputLabel>
                      <Select
                        {...field}
                        label="Chọn form"
                        value={field.value || ""}
                        onChange={field.onChange}
                      >
                        <MenuItem value="">-- Chọn form --</MenuItem>
                        {featureList.map((item) => (
                          <MenuItem key={item.code} value={item.code}>
                            {item.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.startFormId && (
                        <InputLabel error>{errors.startFormId.message}</InputLabel>
                      )}
                    </FullWidthFormControl>
                  )}
                />
              </Grid>
            )}
          </FormGrid>
        </FormContainer>
      </FormFieldLayoutContext.Provider>


      <ProcessSelectionDialog
        open={isProcessDialogOpen}
        onClose={handleCloseProcessDialog}
        onSave={handleSaveProcesses}
        initialSelectedIds={getValues("relatedProcesses")} // ✅ `initialSelectedIds` giờ là mảng các `value`
      />
    </StyledCard>
  );
}
