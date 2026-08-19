/* eslint-disable no-console */
import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Box,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
  SwipeableDrawer,
  Typography,
  Select,
  MenuItem,
  IconButton,
  InputLabel,
  ListSubheader,
  Checkbox,
  styled,
  Stack,
} from "@mui/material";
import {
  Controller,
  FormProvider,
  useFormContext,
  useWatch,
} from "react-hook-form";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";
import {
  defaultRegistryTable,
  RegistryProviderTable,
  TableBuilder,
} from "@builder-table/index";
import {
  FormBuilder,
  RegistryProvider,
  defaultRegistry,
} from "@builder-form/index";

import {
  CancelButton,
  SaveButton,
} from "@styles/CustomDialog.styles";
// import {
//   PopupBuilder,
//   defaultRegistryPopup,
//   RegistryProviderPopup,
// } from "../../../../builder-popup";
import { useDispatch, useSelector } from "react-redux";
import {
  addFormConfig,
  setValue,
  addTableConfig,
  addDataField,
} from "@redux/slices/FormDesign/formDesignSlice";
import { addMenu,getListFunction } from "@redux/slices/ManagerMenu/managementMenuSlice";
import { API_BPMN, API_DESIGN_FORM, API_FUNCTIONMANAGEMANT_BY_ID } from "@EnvironmentFile/constants/urlConfig";
import { callApi } from "@services/api";
import { getSelectUser } from "@redux/slices/DataManagement/WarehouseInAndOutRegister";
import { useToast } from "@components/common/ToastProvider";
// import { COMPONENT_OPTIONS } from "./ComponentOption";

const StyledSwipeableDrawer = styled(SwipeableDrawer, {
  shouldForwardProp: (prop) => prop !== 'sidebarwidth',
})(({ theme, sidebarwidth }) => ({
  '& .MuiDrawer-paper': {
    height: "100%",
    padding: 0,
    transition: 'width 225ms cubic-bezier(0, 0, 0.2, 1) 0ms',

    // Mặc định: lớn hơn 425px thì luôn trừ sidebar
    width: `calc(100% - ${sidebarwidth}px)`,

    // Dưới 425px thì full width → ẩn sidebar
    [theme.breakpoints.down(425)]: {
      width: '100%',
    },
  },
}));


const DrawerHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(1.5),
  // ✅ Sửa lỗi: Sử dụng màu nền và màu chữ từ cấu hình dialog của theme
  backgroundColor: theme.palette.dialog?.headerBackground || (theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.primary.main),
  color: theme.palette.dialog?.headerColor || theme.palette.primary.contrastText,
  marginBottom: theme.spacing(1),
}));

const DrawerTitle = styled(Typography)({
  margin: 0,
});

const DrawerContent = styled(Box)({
  flex: 1,
  overflow: "hidden", // Ngăn container này tự cuộn, để container con xử lý
  display: 'flex',
  flexDirection: 'column',
});

const DrawerFooter = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const CriteriaGridItem = styled(Grid)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));

const ValueGridItem = styled(Grid)({
  marginTop: "-10px",
});

const BoldListSubheader = styled(ListSubheader)({
  fontWeight: "bold",
});

const AddCriteriaButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const ErrorIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const DrawerContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
});

const ContentPaddingBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  overflowY: 'auto', 
}));

const HalfWidthGridItem = styled(Grid)({
  width: '100%',
  '@media (min-width:600px)': {
    width: '50%',
  },
});

const ActionGridItem = styled(Grid)(({ xs }) => {
  const width = (xs / 12) * 100;
  return {
    width: `${width}%`,
    flexBasis: `${width}%`,
    maxWidth: `${width}%`,
  };
});

const FullWidthGridItem = styled(Grid)({
  width: '100%',
});

const CriteriaContainer = styled(Grid)({
  alignItems: 'center',
});

const CriteriaTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));

const CriteriaCheckboxGridItem = styled(Grid)(({ theme }) => ({
  width: '100%',
  marginBottom: theme.spacing(1),
}));

// const FullWidthFormControl = styled(FormControl)({
//   width: '100%',
// });

const SmallFormControl = styled(FormControl)({
  width: '100%',
});

const StyledGrid = styled(Grid)({
  paddingTop: '10px',
  // maxHeight: '190px',
  // overflowY: 'auto',
});
const StyledGrids = styled(Grid)({
  padding: "12px 5px"
});

const steps = ["Thông tin cơ bản", "Chi tiết chức năng"];

export default function TemplateDialog({ ...props }) {
  const methods = props.methods;
  const { control, getValues, handleSubmit, trigger } = methods;
  const toast = useToast()

  const isSidebarOpen = useSelector((state) => state.layout.isSidebarOpen);
  // Define sidebar widths. These values should match your actual sidebar component.
  const openSidebarWidth = 240;
  const closedSidebarWidth = 60;

  const valueField = useSelector((state) => state.formDesign.value);

  const dataFieldConfigValue = useSelector(
    (state) => state.formDesign.dataFieldConfig
  );

  const fields = useSelector(state => state.formDesign.fields);

  const dataFieldValue = useSelector(
    (state) => state.formDesign.dataField
  );


  const dispatch = useDispatch();
  const featureType = useWatch({ control, name: "featureType" });
  const isFollowAssignee = useWatch({ control, name: "isFollowAssignee" });
  const isAuthorized = useWatch({ control, name: "isAuthorized" });
  const isInheritSubTab = useWatch({ control, name: "isInheritSubTab" });
  const inheritSubTabFunction = useWatch({ control, name: "inheritSubTabFunction" });
  const isParentChild = useWatch({ control, name: "isParentChild" });
	const isHideTitle = useWatch({ control, name: "isHideTitle" });
	const showOverviewStats = useWatch({ control, name: "showOverviewStats" });
  // console.log("🚀 ~ TemplateDialog ~ isFollowAssignee:", isAuthorized)
  const [featureTypeCurrent] = useState(featureType);

  const { formConfig, tableConfig, formCode } = useSelector(
    (state) => state.formDesign
  );
  // const choose = formConfig.length ? formConfig : tableConfig;

  const [activeStep, setActiveStep] = useState(0);

  // Validate current form values before moving to next step.
  // `trigger()` returns a boolean indicating whether the form is valid.
  const handleNext = async () => {
    const valid = await trigger();
    if (valid) {
      setActiveStep((prev) => prev + 1);
    } else {
      // If invalid, keep the user on the current step so errors are visible.
      // Optionally, you can focus the first error field here.
      toast('Vui lòng nhập các trường bắt buộc', 'error')
      return;
    }
  };
  const handleBack = () => setActiveStep((prev) => prev - 1);
  const handleSave = handleSubmit(async (values) => {

    const configs = {
      list: tableConfig,
      fullList: tableConfig,
      completeList: tableConfig,
      automatic: tableConfig,
      form: formConfig,
      popup: formConfig,
      custom: tableConfig,
    }

    const findSubtabConfig = (nodes) => {
      if (!Array.isArray(nodes)) return null;
      for (const node of nodes) {
        if (node?.type === "subtab") return node;
        const found = findSubtabConfig(node?.props?.children);
        if (found) return found;
      }
      return null;
    };

    let inheritedSubtabFromApi = null;
    if (values.isInheritSubTab === true && values.inheritSubTabFunction) {
      try {
        const inheritedResponse = await callApi(
          "get",
          `${API_FUNCTIONMANAGEMANT_BY_ID}/find-by-code/${values.inheritSubTabFunction}`,
          { checkSubtab: true }
        );
        const inheritedFields = inheritedResponse?.data?.fields || inheritedResponse?.fields;
        inheritedSubtabFromApi = findSubtabConfig(inheritedFields);
      } catch (err) {
        logger.error("Error fetching inherited subtab:", err);
        toast("Không lấy được cấu hình subTab kế thừa", "error");
        return;
      }
    }

    const cleanValueField = { ...valueField };
    if (featureType === "custom") {
      delete cleanValueField.funcDataListFull;
      delete cleanValueField.funcDataForm;
      delete cleanValueField.funcDataList;
    }
    const hasInheritSubTabValue = values.isInheritSubTab !== undefined;
    const inheritSubTabPayload = hasInheritSubTabValue
      ? {
        isInheritSubTab: values.isInheritSubTab === true,
        inheritSubTabFunction: values.isInheritSubTab === true ? values.inheritSubTabFunction : "",
      }
      : {};

    const payloadTypeField = {
      list: { ...cleanValueField, field: dataFieldConfigValue },
      fullList: { ...cleanValueField, field: dataFieldConfigValue },
      completeList: { ...cleanValueField, field: dataFieldConfigValue },
      automatic: { ...cleanValueField, field: dataFieldConfigValue },
      form: { ...cleanValueField, field: dataFieldValue, fieldsOfuse: fields },
      popup: { ...cleanValueField, field: dataFieldValue, fieldsOfuse: fields },
      custom: { ...cleanValueField, field: dataFieldConfigValue},
    };

    const buildInheritedSubtab = (existingSubtab) => {
      if (!inheritedSubtabFromApi) return existingSubtab;
      return {
        ...inheritedSubtabFromApi,
        id: existingSubtab?.id || inheritedSubtabFromApi.id || crypto.randomUUID(),
        props: {
          ...(inheritedSubtabFromApi.props || {}),
          ...(existingSubtab?.props || {}),
          ...inheritSubTabPayload,
          subtabs: inheritedSubtabFromApi.props?.subtabs || [],
        },
      };
    };

    const upsertInheritedSubtab = (list) => {
      if (values.isInheritSubTab !== true || !inheritedSubtabFromApi) return list;
      const hasTable = list.some(item => item.type === "table");
      const existingSubtab = list.find(item => item.type === "subtab");
      if (!hasTable && !existingSubtab) return list;

      const nextSubtab = buildInheritedSubtab(existingSubtab);
      if (existingSubtab) {
        return list.map(item => item.id === existingSubtab.id ? nextSubtab : item);
      }
      return [nextSubtab, ...list];
    };

    const formattedConfig = (list) => {
      if (!list) return [];
      const formattedList = list.map(item => {
        if (item.type === 'table') {
          return {
            ...item,
            props: {
              ...item.props,
              isHideTitle: values.isHideTitle,
              ...inheritSubTabPayload,
            },
          };
        }
        if (item.props?.children) {
          return { ...item, props: { ...item.props, children: formattedConfig(item.props.children) } };
        }
        return item;
      });
      return upsertInheritedSubtab(formattedList);
    };

    const formattedValues = {
      ...values,
      ...inheritSubTabPayload,
      fields: formattedConfig(configs[featureType]),
      featureType,
      processId: values?.processId?.id,
      valueField: {
        ...payloadTypeField[featureType],
        isHideTitle: values.isHideTitle,
        ...inheritSubTabPayload,
      },
      processID: props.idList ? props.idList : null,
      ...(formCode ? { formCode } : {}),
    };

    const res = await props.onSave(formattedValues);

    if (featureType === "form") {
      try {
        if (res && featureType === "form") {
          await addMenuFromForm(values, res);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        logger.error("Lỗi khi lưu dữ liệu:", err);
      }
    }
  });

  const addMenuFromForm = async (value, response) => {
    const formattedData = {
      name: `Thêm mới ${value.name}`,
      order: 0,
      function: response.code,
      hidden: false,
      url: value.url,
    };
    const result = await dispatch(addMenu(formattedData)).unwrap();
    if (!result.ok) {
      throw new Error("Lỗi khi gọi API thêm mới menu");
    }
    return result.json();
  };

  useEffect(() => {
    return () => {
      dispatch(addFormConfig([]));
      dispatch(addTableConfig([]));
      dispatch(addDataField([]));
      dispatch(setValue({ name: "" }));
    };
  }, [dispatch]);

  return (
    <FormProvider {...methods}>
      <StyledSwipeableDrawer
        anchor="right"
        open={props.open}
        onClose={props.onClose}
        sidebarwidth={isSidebarOpen ? openSidebarWidth : closedSidebarWidth}
      // onOpen={() => { }}
      >
        <DrawerContainer>
          {/* Header */}
          <DrawerHeader>
            <DrawerTitle variant="h6">
              {props.title}
            </DrawerTitle>
          </DrawerHeader>

          {/* Nội dung */}
          <DrawerContent>
            {activeStep === 0 && (
              <ContentPaddingBox>
                <ThongTinCoBan
                  idList={props.idList}
                  featureType={featureType}
                  isParentChild={isParentChild}
                />
              </ContentPaddingBox>
            )}
            {activeStep === 1 && (
              <ChiTietChucNang
                featureTypeCurrent={featureTypeCurrent}
                featureType={featureType}
                isFollowAssignee={isFollowAssignee}
                getValues={getValues}
                idList={props.idList}
                fnCode={methods.getValues("code")}
                url={methods.getValues("url")}
                apiUrl={methods.getValues("apiUrl")}
                apiUrlChildren={methods.getValues("apiUrlChildren")}
                authorizedFunction={methods.getValues("authorizedFunction")}
                isAuthorized={isAuthorized}
                isInheritSubTab={isInheritSubTab}
								isParentChild={isParentChild}
								showOverviewStats={showOverviewStats}
                inheritSubTabFunction={inheritSubTabFunction}
                isHideTitle={isHideTitle}
              />
            )}
          </DrawerContent>

          {/* Nút điều hướng */}
          <DrawerFooter>
            <Stack direction="row" spacing={1}>
              {activeStep > 0 && (
                <CancelButton onClick={handleBack} >
                  Quay lại
                </CancelButton>
              )}
              <CancelButton onClick={props.onClose}>Đóng</CancelButton>
            </Stack>
            <SaveButton
              onClick={
                activeStep === steps.length - 1 ? handleSave : handleNext
              }
            >
              {activeStep === steps.length - 1 ? "Hoàn tất" : "Tiếp theo"}
            </SaveButton>
          </DrawerFooter>
        </DrawerContainer>
      </StyledSwipeableDrawer>
    </FormProvider>
  );
}

const ThongTinCoBan = ({
  idList,
  featureType,
  isParentChild,
}) => {
  const {
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext();
  const currentFnCode = watch("code");
  // logger.log("🚀 ~ ThongTinCoBan ~ errors:", errors)

  // Lấy danh sách người dùng và chức năng từ Redux
  const { listUser } =
    useSelector((state) => state.warehouseInAndOutRegister) || {};
  const { listFunction } = useSelector((state) => state.menu);
  const { crmSource } = useSelector((state) => state.config) || {};
  const urgencyOptions = React.useMemo(() => {
    const rawData = crmSource?.find((item) => item.code === "ALL_COUNT")?.data || [];
    return rawData.map(item => {
      let val = item.value;
      if (typeof val === 'string' && val.startsWith("'") && val.endsWith("'")) {
        val = val.substring(1, val.length - 1);
      }
      // Chuẩn hóa JSON string để tránh lệch khoảng trắng
      try {
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          val = JSON.stringify(JSON.parse(val));
        }
      } catch (e) {
        // Không phải JSON, giữ nguyên
      }
      return { ...item, value: val };
    });
  }, [crmSource]);

  const dispatch = useDispatch();
  const isAuthorized = useWatch({ control, name: "isAuthorized" });
  const isInheritSubTab = useWatch({ control, name: "isInheritSubTab" });

  useEffect(() => {
    dispatch(getSelectUser());
    if (isAuthorized || isInheritSubTab) {
      dispatch(getListFunction({ processID: idList }));
    }
  }, [dispatch, isAuthorized, isInheritSubTab, idList]);
  const [options, setOptions] = useState([]);
  const initialCriteria = watch("criteria") || [];
  const [criteriaList, setCriteriaList] = useState(initialCriteria);
  useEffect(() => {
    setValue("criteria", criteriaList);
  }, [criteriaList, setValue]);

  const [processOptions, setProcessOptions] = useState([]);
  const [selectedProcessFields, setSelectedProcessFields] = useState({});

  const handleAddCriteria = () => {
    const newCriteria = featureType === "fullList"
      ? { processId: "", name: "", operator: "", value: "" }
      : { name: "", operator: "", value: "" };
    setCriteriaList((prev) => [...prev, newCriteria]);
  };

  // const handleRemoveCriteria = (index) => {
  //   setCriteriaList((prev) => prev.filter((_, i) => i !== index));
  // };

  const handleRemoveCriteria = useCallback(
    (index) => {
      setCriteriaList((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );


  // const handleChangeCriteria = (index, field, value) => {
  //   setCriteriaList((prev) =>
  //     prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
  //   );
  // };

  const handleChangeCriteria = useCallback(
    (index, field, value) => {
      setCriteriaList((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
      );
    },
    [setCriteriaList]
  );


  // Fetch processes for fullList
  useEffect(() => {
    if (featureType === "fullList") {
      const fetchProcesses = async () => {
        try {

          const data = await callApi("get", `${API_BPMN}?limit=9999`)
          if (data && Array.isArray(data.data)) {
            setProcessOptions(data.data);
          } else {
            logger.warn("No process data received:", data);
          }
        } catch (err) {
          logger.error("Error fetching processes:", err);
        }
      };
      fetchProcesses();
    }
  }, [featureType, setProcessOptions]);

  // Fetch fields for list featureType
  useEffect(() => {
    if (featureType === "list" || featureType === "automatic") {
      const fetchData = async () => {
        try {
          const data = await callApi(
            "get",
            `${API_DESIGN_FORM}?processID=${idList ?? null}`,
          );
          if (Array.isArray(data.data)) {
            // logger.log("Fetched options for list:", data.data);
            setOptions(data.data); // Fetch code + name for list
          } else {
            logger.warn("No options data received for list:", data);
          }
        } catch (err) {
          logger.error("Error fetching options for list:", err);
        }
      };
      fetchData();
    }
  }, [idList, featureType, setOptions]);

  // Fetch fields when processId changes for fullList
  // const fetchProcessFields = async (processId) => {
  //   if (!processId) return;
  //   const token = localStorage.getItem("token");
  //   const headers = token ? { Authorization: `Bearer ${token}` } : {};
  //   try {
  //     const data = await callApi(
  //       "get",
  //       `${API_DESIGN_FORM}?processID=${processId}`, { headers }
  //     );
  //     if (Array.isArray(data.data)) {
  //       logger.log(`Fetched fields for processId ${processId}:`, data.data);
  //       setSelectedProcessFields((prev) => ({
  //         ...prev,
  //         [processId]: data.data,
  //       }));
  //     } else {
  //       logger.warn(`No field data received for processId ${processId}:`, data);
  //     }
  //   } catch (err) {
  //     logger.error(`Error fetching process fields for processId ${processId}:`, err);
  //   }
  // };

  const fetchProcessFields = useCallback(
    async (processId) => {
      if (!processId) return;

      try {
        const data = await callApi(
          "get",
          `${API_DESIGN_FORM}?processID=${processId}`
        );

        if (Array.isArray(data.data)) {
          logger.log(`Fetched fields for processId ${processId}:`, data.data);
          setSelectedProcessFields((prev) => ({
            ...prev,
            [processId]: data.data,
          }));
        } else {
          logger.warn(`No field data received for processId ${processId}:`, data);
        }
      } catch (err) {
        logger.error(`Error fetching process fields for processId ${processId}:`, err);
      }
    },
    [setSelectedProcessFields]
  );


  useEffect(() => {
    if ((featureType === "fullList") && criteriaList.length > 0) {
      const uniqueProcessIds = [...new Set(criteriaList.map(c => c.processId).filter(Boolean))];
      uniqueProcessIds.forEach(pid => {
        if (!selectedProcessFields[pid]) {
          fetchProcessFields(pid);
        }
      });
    }
  }, [featureType, criteriaList, selectedProcessFields, fetchProcessFields]);

  const handleProcessChange = useCallback(
    (index) => (e) => {
      const val = e.target.value;

      handleChangeCriteria(index, "processId", val);
      setValue(`criteria.${index}.processId`, val);

      handleChangeCriteria(index, "name", "");
      setValue(`criteria.${index}.name`, "");

      if (val) {
        fetchProcessFields(val, index);
      }
    },
    [handleChangeCriteria, setValue, fetchProcessFields]
  );

  // chọn khóa
  const handleChangeCriteriaName = useCallback(
    (index) => (e) => {
      const val = e.target.value;
      handleChangeCriteria(index, "name", val);
      setValue(`criteria.${index}.name`, val);
    },
    [handleChangeCriteria, setValue]
  );


  // chọn toán tử

  const handleChangeCriteriaOperator = useCallback(
    (index) => (e) => {
      const val = e.target.value;
      handleChangeCriteria(index, "operator", val);
      setValue(`criteria.${index}.operator`, val);
    },
    [handleChangeCriteria, setValue]
  );

  const handleValueChangeFactory = useCallback(
    (index) => (e) => {
      const val = e.target.value;
      handleChangeCriteria(index, "value", val);
      setValue(`criteria.${index}.value`, val);
    },
    [handleChangeCriteria, setValue]
  );

  // Trong component
  const handleValueChange = useCallback(
    (index) => (e) => handleChangeCriteria(index, "value", e.target.value),
    [handleChangeCriteria]
  );

  const handleRemoveFactory = useCallback(
    (index) => () => handleRemoveCriteria(index),
    [handleRemoveCriteria]
  );

  const handleAuthorizedChange = useCallback(
    (onChange) => (e) => {
      const isChecked = e.target.checked;
      onChange(isChecked); // Cập nhật giá trị cho checkbox
      if (!isChecked) {
        setValue("authorizedFunction", ""); // Xóa giá trị của ô chức năng
      }
    },
    [setValue]
  );

  const handleInheritSubTabChange = useCallback(
    (onChange) => (e) => {
      const isChecked = e.target.checked;
      onChange(isChecked);
      if (!isChecked) {
        setValue("inheritSubTabFunction", "");
      }
    },
    [setValue]
  );



  return (
    <Grid container spacing={2}>
      <HalfWidthGridItem item>
        <Controller
          name="code"
          control={control}
          render={({ field }) => (
            <CustomInput
              label="Mã chức năng"
              {...field}
              error={!!errors.code}
              helperText={errors.code?.message}
              required
            />
          )}
        />
      </HalfWidthGridItem>

      <HalfWidthGridItem item>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <CustomInput
              label="Tên chức năng"
              {...field}
              error={!!errors.name}
              helperText={errors.name?.message}
              required
            />
          )}
        />
      </HalfWidthGridItem>

      <HalfWidthGridItem item>
        <Controller
          name="url"
          control={control}
          render={({ field }) => (
            <CustomInput
              label="URL"
              {...field}
              error={!!errors.url}
              helperText={errors.url?.message}
              required={featureType === 'custom'}
            />
          )}
        />
      </HalfWidthGridItem>
      <HalfWidthGridItem item>
        <Controller
          name="apiUrl"
          control={control}
          render={({ field }) => (
            <CustomInput
              label="API danh sách"
              {...field}
              error={!!errors.apiUrl}
              helperText={errors.apiUrl?.message}
              required={featureType === 'automatic'}
            />
          )}
        />
      </HalfWidthGridItem>
      
      <HalfWidthGridItem item>
        <Controller
          name="countList"
          control={control}
          render={({ field }) => {
            let val = field.value;

            // Nếu là object thì stringify theo chuẩn (không khoảng trắng)
            if (val && typeof val === 'object') {
              val = JSON.stringify(val);
            }

            // Nếu là chuỗi, bóc nháy đơn và chuẩn hóa JSON string
            if (typeof val === 'string') {
              if (val.startsWith("'") && val.endsWith("'")) {
                val = val.substring(1, val.length - 1);
              }
              try {
                if (val.startsWith('{') || val.startsWith('[')) {
                  val = JSON.stringify(JSON.parse(val));
                }
              } catch (e) {
                // Ignore
              }
            }

            return (
              <CustomInput
                {...field}
                value={val || ""}
                select
                label="Danh sách số đếm"
                options={urgencyOptions}
                customLabel="title"
                customValue="value"
                error={!!errors.countList}
                helperText={errors.countList?.message}
              />
            );
          }}
        />
      </HalfWidthGridItem>
{featureType === 'automatic' && isParentChild && (
       <HalfWidthGridItem item>
         <Controller
                name="apiUrlChildren"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="API danh sách con"
                    {...field}
                    error={!!errors.apiUrlChildren}
                    helperText={errors.apiUrlChildren?.message}
                    required={true}
                  />
                )}
              />
       </HalfWidthGridItem>
      )}
      <FullWidthGridItem item>
        <FormControl
          required
          error={!!errors.statusFeature}
        >
          <FormLabel component="legend" focused={false}>
            Trạng thái
          </FormLabel>
          <Controller
            name="statusFeature"
            control={control}
            render={({ field }) => (
              <RadioGroup
                {...field}
                row
                // onChange={(e) => field.onChange(e.target.value)}
                onChange={field.onChange}
              >
                <FormControlLabel
                  value="1"
                  control={<Radio />}
                  label="Hiển thị"
                />
                <FormControlLabel value="0" control={<Radio />} label="Ẩn" />
              </RadioGroup>
            )}
          />
          {errors.statusFeature && (
            <FormHelperText>{errors.statusFeature.message}</FormHelperText>
          )}
        </FormControl>
      </FullWidthGridItem>

      <FullWidthGridItem item>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <CustomInput
              label="Mô tả"
              {...field}
              rows={5}
              multiline
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          )}
        />
      </FullWidthGridItem>

      <FullWidthGridItem item>
        <FormControl component="fieldset" error={!!errors.featureType}>
          <FormLabel component="legend">Loại chức năng</FormLabel>
          <Controller
            name="featureType"
            control={control}
            render={({ field }) => (
              <RadioGroup
                {...field}
                row
                // onChange={(e) => field.onChange(e.target.value)}
                onChange={field.onChange}
              >
                <FormControlLabel
                  value="completeList"
                  control={<Radio />}
                  label="Danh sách hoàn thành"
                />
                <FormControlLabel
                  value="fullList"
                  control={<Radio />}
                  label="Danh sách đa quy trình"
                />
                <FormControlLabel
                  value="list"
                  control={<Radio />}
                  label="Danh sách đơn quy trình"
                />
                <FormControlLabel
                  value="automatic"
                  control={<Radio />}
                  label="Danh sách quy trình hệ thống"
                />
                <FormControlLabel
                  value="custom"
                  control={<Radio />}
                  label="Tùy chọn"
                />
                <FormControlLabel
                  value="form"
                  control={<Radio />}
                  label="Form"
                />
                <FormControlLabel
                  value="popup"
                  control={<Radio />}
                  label="Popup"
                />
              </RadioGroup>
            )}
          />
          {errors.featureType && (
            <FormHelperText>{errors.featureType.message}</FormHelperText>
          )}
        </FormControl>
      </FullWidthGridItem>

      {featureType === "custom" && (
        <FullWidthGridItem item>
          <FormControlLabel
            control={
              <Controller
                name="isHideTitle"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    {...field}
                    checked={!!field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            }
            label="Ẩn tiêu đề"
          />
        </FullWidthGridItem>
      )}

      {(featureType === "list" || featureType === "fullList" || featureType === "automatic") && (
        <>
          {featureType === "automatic" && (
          <FullWidthGridItem item>
            <FormControlLabel
              control={
                <Controller
                  name="isCount"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      {...field}
                      checked={!!field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              }
              label="Đếm số"
            />
            <FormControlLabel
              control={
                <Controller
                  name="isParentChild"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      {...field}
                      checked={!!field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              }
              label="Danh sách cha con"
            />
            <FormControlLabel
              control={
                <Controller
                  name="showOverviewStats"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      {...field}
                      checked={!!field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              }
              label="Thống kê tổng quan"
            />
          </FullWidthGridItem>
          
          )}
          {/* Nhóm ô "Được ủy quyền" và "Chức năng" lại với nhau */}
          {featureType === "automatic" && (
            <FullWidthGridItem item>
              <FormControlLabel
                control={
                  <Controller
                    name="isAuthorized"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        {...field}
                        checked={!!field.value}
                        onChange={handleAuthorizedChange(field.onChange)}
                      />
                    )}
                  />
                }
                label="Được ủy quyền"
              />
              {isAuthorized && (
                <StyledGrids item xs={12} sm={6} md={4}>
                  <Controller
                    name="authorizedFunction"
                    control={control}
                    render={({ field }) => (
                      <CustomInput
                        {...field}
                        select
                        label="Chức năng"
                        options={(listFunction || []).filter(fn => fn.code !== currentFnCode && !fn.isAuthorized)}
                        customLabel="name"
                        customValue="code"
                        error={!!errors.authorizedFunction}
                        helperText={errors.authorizedFunction?.message}
                        required
                      />
                    )}
                  />
                </StyledGrids>
              )}
            </FullWidthGridItem>
          )}
          {featureType === "automatic" && (
            <FullWidthGridItem item>
              <FormControlLabel
                control={
                  <Controller
                    name="isInheritSubTab"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        {...field}
                        checked={!!field.value}
                        onChange={handleInheritSubTabChange(field.onChange)}
                      />
                    )}
                  />
                }
                label="Kế thừa subTab"
              />
              {isInheritSubTab && (
                <StyledGrids item xs={12} sm={6} md={4}>
                  <Controller
                    name="inheritSubTabFunction"
                    control={control}
                    render={({ field }) => (
                      <CustomInput
                        {...field}
                        select
                        label="Chức năng"
                        options={(listFunction || []).filter(fn => fn.code !== currentFnCode && !fn.isAuthorized)}
                        customLabel="name"
                        customValue="code"
                        error={!!errors.inheritSubTabFunction}
                        helperText={errors.inheritSubTabFunction?.message}
                        required
                      />
                    )}
                  />
                </StyledGrids>
              )}
            </FullWidthGridItem>
          )}
        </>
      )}

      {(featureType === "list" || featureType === "fullList" || featureType === "automatic") && (
        <FullWidthGridItem item>
          <CriteriaTitle variant="subtitle1">
            Tiêu chí
          </CriteriaTitle>

          <CriteriaCheckboxGridItem item>
            <FormControlLabel
              control={
                <Controller
                  name="isFollowAssignee"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      {...field}
                      checked={!!field.value}
                      // onChange={(e) => field.onChange(e.target.checked)}
                      onChange={field.onChange}
                    />
                  )}
                />
              }
              label="Lọc thêm tiêu chí là người được phụ trách"
            />
          </CriteriaCheckboxGridItem>
            <StyledGrid>
              {criteriaList.map((item, index) => (
                <CriteriaContainer container spacing={2} key={index}>
                  {(featureType === "fullList") && (
                    <CriteriaGridItem item xs={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Quy trình</InputLabel>
                        <Select
                          value={item.processId || ""}
                          // onChange={(e) => {
                          //   const val = e.target.value;
                          //   handleChangeCriteria(index, "processId", val);
                          //   setValue(`criteria.${index}.processId`, val);
                          //   handleChangeCriteria(index, "name", "");
                          //   setValue(`criteria.${index}.name`, "");
                          //   if (val) {
                          //     fetchProcessFields(val, index); // Fetch fields when processId changes
                          //   }
                          // }}
                          onChange={handleProcessChange(index)}
                        >
                          {processOptions.map((proc) => (
                            <MenuItem key={proc._id} value={proc.id}>
                              {proc.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </CriteriaGridItem>)}


                  <CriteriaGridItem item xs={(featureType === "fullList") ? 3 : 4} >
                    <FormControl fullWidth size="small">
                      <InputLabel>Khóa</InputLabel>
                      <Select
                        value={item.name || ""}
                        // onChange={(e) => {
                        //   const val = e.target.value;
                        //   handleChangeCriteria(index, "name", val);
                        //   setValue(`criteria.${index}.name`, val);
                        // }}
                        onChange={handleChangeCriteriaName(index)}
                        disabled={(featureType === "fullList") && !item.processId}
                      >
                        {(featureType === "fullList") && item.processId
                          ? (selectedProcessFields[item.processId] || []).map((opt) => [
                            <BoldListSubheader
                              key={`${opt.code}-header`}
                            >
                              {opt.code}
                            </BoldListSubheader>,
                            opt.field?.map((f) => (
                              <MenuItem
                                key={`${opt.code}.${f.name}`}
                                value={`${f.name}`}
                              >
                                {f.label}
                              </MenuItem>
                            )),
                          ])
                          : featureType === "list" || featureType === "automatic"
                            ? options.map((opt) => [
                              <BoldListSubheader
                                key={`${opt.code}-header`}
                              >
                                {opt.code}
                              </BoldListSubheader>,
                              opt.field?.map((f) => (
                                <MenuItem
                                  key={`${opt.code}.${f.name}`}
                                  value={`${f.name}`}
                                >
                                  {f.label}
                                </MenuItem>
                              )),
                            ])
                            : null}
                      </Select>
                    </FormControl>
                  </CriteriaGridItem>

                  <CriteriaGridItem item xs={(featureType === "fullList") ? 3 : 3} >
                    <FormControl fullWidth size="small">
                      <InputLabel>Toán tử</InputLabel>
                      <Select
                        value={item.operator || ""}
                        // onChange={(e) => {
                        //   const val = e.target.value;
                        //   handleChangeCriteria(index, "operator", val);
                        //   setValue(`criteria.${index}.operator`, val);
                        // }}
                        onChange={handleChangeCriteriaOperator(index)}
                      >
                        <MenuItem value="eq">Bằng</MenuItem>
                        <MenuItem value="neq">Không bằng</MenuItem>
                        <MenuItem value="gt">Lớn hơn</MenuItem>
                        <MenuItem value="gteq">Lớn hơn hoặc bằng</MenuItem>
                        <MenuItem value="lt">Nhỏ hơn</MenuItem>
                        <MenuItem value="lteq">Nhỏ hơn hoặc bằng</MenuItem>
                        <MenuItem value="like">Chứa</MenuItem>
                      </Select>
                    </FormControl>
                  </CriteriaGridItem>

                  <ValueGridItem item xs={(featureType === "fullList") ? 2 : 3} >
                    {(() => {
                      const fieldDef = ((featureType === "fullList") && item.processId
                        ? (selectedProcessFields[item.processId] || []).flatMap((opt) => opt.field || [])
                        : options.flatMap((opt) => opt.field || [])
                      ).find((f) => f.name === item.name);

                      if (fieldDef?.type === "enum") {
                        return (
                          <SmallFormControl fullWidth>
                            <InputLabel>Giá trị</InputLabel>
                            <Select
                              value={item.value || ""}
                              // onChange={(e) => {
                              //   const val = e.target.value;
                              //   handleChangeCriteria(index, "value", val);
                              //   setValue(`criteria.${index}.value`, val);
                              // }}
                              onChange={handleValueChangeFactory(index)}
                            >
                              {(fieldDef.valueInput || []).map((v) => (
                                <MenuItem key={v.value} value={v.value}>
                                  {v.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </SmallFormControl>
                        );
                      } else if (fieldDef?.type === "extractUser") {
                        return (
                          <SmallFormControl fullWidth>
                            <InputLabel>Giá trị</InputLabel>
                            <Select
                              value={item.value || ""}
                              // onChange={(e) => {
                              //   const val = e.target.value;
                              //   handleChangeCriteria(index, "value", val);
                              //   setValue(`criteria.${index}.value`, val);
                              // }}
                              onChange={handleValueChangeFactory(index)}
                            >
                              {listUser?.map((u) => (
                                <MenuItem key={u._id} value={u._id}>
                                  {u.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </SmallFormControl>
                        );
                      } else {
                        return (
                          <CustomInput
                            value={item.value}
                            label="Giá trị"
                            // onChange={(e) =>
                            //   handleChangeCriteria(index, "value", e.target.value)
                            // }
                            onChange={handleValueChange(index)}
                            size="small"
                          />
                        );
                      }
                    })()}
                  </ValueGridItem>

                  <ActionGridItem item xs={(featureType === "fullList") ? 1 : 2} >
                    <ErrorIconButton
                      // onClick={() => handleRemoveCriteria(index)}
                      onClick={handleRemoveFactory(index)}
                      size="small"
                    >
                      x
                    </ErrorIconButton>
                  </ActionGridItem>
                </CriteriaContainer>
              ))}
            </StyledGrid>
          <AddCriteriaButton variant="text" onClick={handleAddCriteria}>
            + Thêm tiêu chí
          </AddCriteriaButton>
        </FullWidthGridItem>
      )}
    </Grid>
  );
};

ThongTinCoBan.propTypes = {
  categories: PropTypes.array,
  objectOptions: PropTypes.array,
  idList: PropTypes.any,
  featureType: PropTypes.string,
};

const myRegistryTable = {
  ...defaultRegistryTable,
};




const ChiTietChucNang = ({
  featureType,
  featureTypeCurrent,
  getValues,
  idList,
  fnCode,
  isFollowAssignee,
  url,
  apiUrl,
    apiUrlChildren,
  authorizedFunction,
  isAuthorized,
  inheritSubTabFunction,
  isInheritSubTab,
	isParentChild,
	showOverviewStats,
  isHideTitle,

}) => {
  const [formValues, setFormValues] = useState({});

  useEffect(() => {
    // Chỉ cập nhật khi featureType thay đổi
    if (featureTypeCurrent === featureType) {
      setFormValues(getValues());
    } else {
      setFormValues({});
    }
  }, [featureType, featureTypeCurrent, getValues]);

  return (
    <>
      {/* <h1>Cấu hình màn hình</h1> */}

			{/* Danh sách hoàn thành */}
      <RegistryProviderTable registry={myRegistryTable}>
        {featureType === "completeList" && (
          <TableBuilder
            idList={idList}
            fnCode={fnCode}
            defaultData={featureTypeCurrent === featureType ? getValues() : {}}
            featureType={featureType}
            apiUrl={apiUrl}
            apiUrlChildren={apiUrlChildren}
            authorizedFunction={authorizedFunction}
            isAuthorized={isAuthorized}
            inheritSubTabFunction={inheritSubTabFunction}
            isInheritSubTab={isInheritSubTab}
						isParentChild={isParentChild}
						showOverviewStats={showOverviewStats}
          />
        )}
			</RegistryProviderTable>
			
			{/* Danh sách đa quy trình */}
      <RegistryProviderTable registry={myRegistryTable}>
        {featureType === "fullList" && (
          <TableBuilder
            idList={idList}
            fnCode={fnCode}
            defaultData={featureTypeCurrent === featureType ? getValues() : {}}
            featureType={featureType}
            apiUrl={apiUrl}
            apiUrlChildren={apiUrlChildren}
            authorizedFunction={authorizedFunction}
            isAuthorized={isAuthorized}
            inheritSubTabFunction={inheritSubTabFunction}
            isInheritSubTab={isInheritSubTab}
						isParentChild={isParentChild}
						showOverviewStats={showOverviewStats}
          />
        )}
      </RegistryProviderTable>

			{/* Danh sách đơn quy trình */}
      <RegistryProviderTable registry={myRegistryTable}>
        {featureType === "list" && (
          <TableBuilder
            idList={idList}
            fnCode={fnCode}
            defaultData={featureTypeCurrent === featureType ? getValues() : {}}
            featureType={featureType}
            url={url}
            apiUrl={apiUrl}
            apiUrlChildren={apiUrlChildren}
            isFollowAssignee={isFollowAssignee}
            authorizedFunction={authorizedFunction}
            inheritSubTabFunction={inheritSubTabFunction}
            isInheritSubTab={isInheritSubTab}
            isAuthorized={isAuthorized}
            isParentChild={isParentChild}
            showOverviewStats={showOverviewStats}
          />
        )}
			</RegistryProviderTable>
			
			{/* Danh sách quy trình hệ thống */}
      <RegistryProviderTable registry={myRegistryTable}>
        {featureType === "automatic" && (
          <TableBuilder
            idList={idList}
            fnCode={fnCode}
            defaultData={featureTypeCurrent === featureType ? getValues() : {}}
            featureType={featureType}
            isFollowAssignee={isFollowAssignee}
            url={url}
            apiUrl={apiUrl}
            apiUrlChildren={apiUrlChildren}
            authorizedFunction={authorizedFunction}
            isAuthorized={isAuthorized}
            inheritSubTabFunction={inheritSubTabFunction}
            isInheritSubTab={isInheritSubTab}
            isParentChild={isParentChild}
            showOverviewStats={showOverviewStats}
          />
        )}
			</RegistryProviderTable>
			{/* Tùy chọn */}
      {featureType === "custom" && (
          <TableBuilder
            idList={idList}
            fnCode={fnCode}
            defaultData={featureTypeCurrent === featureType ? getValues() : {}}
            featureType={featureType}
            isFollowAssignee={isFollowAssignee}
            url={url}
            apiUrl={apiUrl}
            apiUrlChildren={apiUrlChildren}
            authorizedFunction={authorizedFunction}
            inheritSubTabFunction={inheritSubTabFunction}
            isInheritSubTab={isInheritSubTab}
            isAuthorized={isAuthorized}
            isParentChild={isParentChild}
						isHideTitle={isHideTitle}
						showOverviewStats={showOverviewStats}
          />
      )}
      {featureType === "form" && (
        <RegistryProvider registry={defaultRegistry}>
          <FormBuilder
            fnCode={fnCode}
            idList={idList}
            defaultData={featureTypeCurrent === featureType ? getValues() : {}}
          />
        </RegistryProvider>
      )}

      {featureType === "popup" && (
        <RegistryProvider registry={defaultRegistry}>
          <FormBuilder
            fnCode={fnCode}
            idList={idList}
            defaultData={formValues}
          />
        </RegistryProvider>
      )}

      {/* {featureType === "popup" && (
        <RegistryProviderPopup registry={defaultRegistryPopup}>
          <PopupBuilder
            fnCode={fnCode}
            idList={idList}
            defaultData={featureTypeCurrent === featureType ? getValues() : {}}
          />
        </RegistryProviderPopup>
      )} */}
    </>
  );
};

ChiTietChucNang.propTypes = {
  featureType: PropTypes.string,
  setDetailData: PropTypes.func,
  getValues: PropTypes.func,
  featureTypeCurrent: PropTypes.string,
  idList: PropTypes.any,
  fnCode: PropTypes.string,
  url: PropTypes.string,
  apiUrl: PropTypes.string,
  apiUrlChildren: PropTypes.string,
  isFollowAssignee: PropTypes.bool,
  authorizedFunction: PropTypes.string,
  isAuthorized: PropTypes.bool,
  inheritSubTabFunction: PropTypes.string,
  isInheritSubTab: PropTypes.bool,
	isParentChild: PropTypes.bool,
	showOverviewStats: PropTypes.bool,
  isHideTitle: PropTypes.bool,
};

TemplateDialog.propTypes = {
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  categories: PropTypes.array,
  objectOptions: PropTypes.array,
  title: PropTypes.string,
  methods: PropTypes.object,
  idList: PropTypes.any,
};
