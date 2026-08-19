import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  useContext,
  forwardRef
, useImperativeHandle } from "react";
import CustomTableBorder from "@components/CustomTableBorder";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
 
import {
  API_BPMN,
  API_DYNAMIC,
  API_EXPORT_TEMPLATE_URL,
  DATA_TABLE_BPMN,
  FUNCTIONMANAGEMANT,
  GET_STATUS_STARTED_CMD,
  MODEL_INTROSPECT,
  taskFeature,
  API_UPLOAD_FILE,
  API_ADD_FIELD_BPMN,
} from "@EnvironmentFile/constants/urlConfig";
import { useNavigate } from "react-router-dom";
import { defaultRegistry, Form, RegistryProvider } from "@builder-form/index";
import {
  defaultRegistryExport,
  FormExport,
  RegistryProviderFormExport,
} from "@builder-form-export/index";

import {
  Popup,
  RegistryProviderPopup,
  defaultRegistryPopup,
} from "@builder-popup/index";
import CustomDrawer from "@components/DynamicForm/CustomDrawer";
import CustomPopup from "@components/DynamicForm/CustomPopup";

import { useToast } from "@components/common/ToastProvider";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { addDataFieldTable, addDataFieldTableInForm, addFormConfig, addTableConfig, setIdTableInForm, setMultiDynamicForm } from "@redux/slices/FormDesign/formDesignSlice";
import { AuthContext } from "@AuthContext/AuthProvider";

import api, { callApi } from "@services/api";
import { ensureUserPermissions } from '@redux/slices/managementUsersSlice';

import { MenuItem, Select, styled } from "@mui/material";

const StyledForm = styled(Form)(({ effectiveDisplayType }) => ({
  overflow: effectiveDisplayType === 'swiper' ? 'auto' : 'unset',
  height: effectiveDisplayType === 'swiper' ? '90vh' : '100%',
}));

const DemoTablePage = forwardRef(
  ({ data, mode, item, onPropChange, onSelectedIds }, ref) => {

    const funcDataForm = data?.funcDataForm ?? [];
    const funcDataList = data?.funcDataList ?? [];

    const { user } = useContext(AuthContext);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const userPermissions = useSelector((state) => state.users.userPermissions);
    const [dataTable, setDataTable] = useState([]);

    useEffect(() => {
      if (!user?.user?.user) return;
      if (userPermissions) return;
      const load = async () => {
        try {
          await dispatch(ensureUserPermissions(user.user.user));
        } catch (err) {
          logger.error('Error fetching user permissions:', err);
        }
      };
      load();
    }, [user, userPermissions, dispatch]);
    const [pagination, setPagination] = useState({
      total: 0,
      page: 1,
      rowsPerPage: 25,
      totalPages: 1,
    });
    const [selectedIds, setSelectedIds] = useState([]);
    const [open, setOpen] = useState(false);
    const [code, setCode] = useState(null);
    const [defaultValues, setDefaultValues] = useState({});

    const [outgoingBtns, setOutgoingBtns] = useState([]);
    const [actionType, setActionType] = useState('add');

    const [size, setSize] = useState(null);

    const [activityInstanceId, setActivityInstanceId] = useState("");
    const [codePopup, setCodePopup] = useState(null);

    const [namePopup, setNamePopup] = useState(null);
    const [displayType, setDisplayType] = useState('swiper');


    const [openDialogExport, setOpenDialogExport] = useState(false);
    const [openDialogDlt, setOpenDialogDlt] = useState(false);
    const [openDialogDltMulti, setOpenDialogDltMulti] = useState(false);


    const [userFilters, setUserFilters] = useState({})

    const [flow, setFlow] = useState(null);
    const [popupName, setPopupName] = useState(null);
    const [codeExport, setCodeExport] = useState(null);
    const [reloadTable, setReloadTable] = useState(1);

    const formExportRef = useRef();
    const formRef = useRef();

    const toast = useToast();
    const dataFields = useSelector((state) => state.formDesign.dataFieldTableInForm);
    // const activityInstanceIdOfTable = useSelector((state) => state.formDesign.activityInstanceIdOfTable);


    const handleSearch = (search) => {
      setUserFilters(search)
    }



    const dataColumn = useMemo(
      () => (dataFields?.length ? dataFields : null),
      [dataFields]
    );
    const dataTableCheck = useMemo(
      () => (dataTable?.length ? dataTable : null),
      [dataTable]
    );


    const fetchTableData = useCallback(async (params, code, userFilters, activityInstanceIdFilter) => {

      if (!code) return;

      const bodyData = {

        processFn: code,
        ...(Object.keys(userFilters).length ? { userFilters } : {})
      }

      if (activityInstanceIdFilter) {
        bodyData.activityInstanceIdFilter = activityInstanceIdFilter
      }

      try {
        const { data: tableData } = await api.post(DATA_TABLE_BPMN, bodyData, { params }
        );

        const rows =
          tableData?.data?.map((row) => {
            const variables = row.variables || {};
            return {
              ...variables,
              activityInstanceId: row.activityInstanceId,
            };
          }) || [];

        setDataTable(rows);
        setPagination({
          total: rows.length,
          page: 1,
          rowsPerPage: 25,
          totalPages: Math.ceil(rows.length / 25),
        });
      } catch (error) {
        setDataTable([]);
      }
    }, [item.props.fnCode, dataColumn, reloadTable, userFilters, item.props.fnCodeList]);



    useEffect(() => {
      if (onPropChange) {
        if (item?.id && data?.fnCode) {
          onPropChange(item.id, "fnCode", data.fnCode);
        }
        if (item?.id && data?.idList) {
          onPropChange(item.id, "processId", data.idList);
        }
      }
    }, [onPropChange, item?.id, data?.fnCode, data?.idList]);

    // Handlers
    const handleSelectRows = useCallback((ids) => setSelectedIds(ids), []);
    const handlePageChange = useCallback(async ({ page, rowsPerPage }) => {
      await fetchTableData({ page, limit: rowsPerPage }, item.props.fnCodeList, userFilters);
      // setPagination((prev) => ({ ...prev, page, rowsPerPage }));
    }, []);

    const handleGetNextActivity = async (taskId, processId) => {
      if (taskId) {
        const { data: detailTaskFeature } = await api.get(
          `${taskFeature}/detail/by-task`,
          {
            params: {
              taskId,
              processId,
            },
          }
        );
        const code = detailTaskFeature?.feature?.code;
        if (code) {
          try {
            const { data: res } = await api.get(
              `${FUNCTIONMANAGEMANT}/find-by-code/${code}`
            );
            return res.data;
          } catch (error) {
            return {};
          }
        }
        // return detailTaskFeature?.feature?.code;
      }
    };

    const handleGetNextAction = useCallback(
      async (flow, processDefinitionId, activityId) => {
        try {
          const { data: nextActivityIds } = await api.get(
            `${MODEL_INTROSPECT}/${processDefinitionId}/next-task-after-gateway`,
            {
              params: {
                currentActivityId: activityId,
                conditionValue: flow.conditionValue,
              },
            }
          );

          const { code, name } = await handleGetNextActivity(
            nextActivityIds[0],
            item.props?.processId
          );
          setCodePopup(code || null);
          setNamePopup(name || null);


        } catch (err) {
          //
        }
      },
      [item.props?.processId]
    );

    const handleGetBtn = useCallback(
      async (
        id,
        itemForm,
        isExport = false,
        isViewOnly = false,
        multiForms,
        rowItem
      ) => {
        try {
          const { data } = await api.get(GET_STATUS_STARTED_CMD(id));
          const processDefinitionId = data.processDefinitionId;
          const activityId = data?.childActivityInstances[0]?.activityId;

          const { data: mapping } = await api.get(
            `${MODEL_INTROSPECT}/mapping?processDefinitionId=${processDefinitionId}&fromActivityId=${activityId}`
          );

          let buttons = [];

          if (isViewOnly) {
            if (isExport) {
              buttons.push({
                label: "XUẤT BIỂU MẪU",
                onClick: async () => {
                  if (multiForms && multiForms.length > 1) {
                    setOpenDialogExport(true);
                  } else {
                    try {
                      const res = await api.get(
                        API_DYNAMIC,
                        {
                          params: { processID: item.props?.processId || '' },
                        }
                      );
                      const allForms = res?.data?.data || [];

                      const filteredForms = allForms.filter(
                        (form) => multiForms.includes(form.code)
                      );


                      const formData = filteredForms[0] || {};
                      handleExport(formData, null, rowItem);
                    } catch (err) {
                      throw new err();
                    }
                  }
                },
              });
            }

            const isDecision = mapping?.isDecision ?? false;

            // Use roleCodes from redux state; dispatch getUserPermissions only if missing
            let roleCodes = userPermissions?.roleCodes || [];
            if ((!roleCodes || roleCodes.length === 0) && user?.user?.user) {
              try {
                const fetchedAction = await dispatch(ensureUserPermissions(user.user.user));
                const fetched = fetchedAction?.payload || fetchedAction;
                roleCodes = fetched?.roleCodes || roleCodes || [];
              } catch (err) {
                logger.error('Error fetching user permissions:', err);
                roleCodes = roleCodes || [];
              }
            }

            if (isDecision) {

              if (mapping?.outgoing?.length) {
                // mapping.outgoing.forEach(elem => {
                //   logger.log("Elem outgoing role: ", elem.outgoingRole)
                //   logger.log("role is in roleCodes: ", elem.outgoingRole in roleCodes)
                // })
                buttons.push(
                  ...mapping.outgoing
                    .filter(flow => !flow.outgoingRole || roleCodes.includes(flow.outgoingRole))
                    .map(flow => ({
                      label: flow.name.toUpperCase(),
                      onClick: () => {
                        setFlow(flow);
                        handleGetNextAction(flow, processDefinitionId, activityId);
                      },
                      color: "secondary",
                    })
                    )
                );

              }
            } else {
              const handleAction = async (flow) => {
                const { code, featureType, name } = await handleGetNextActivity(
                  mapping?.outgoing[0]?.targetRef,
                  item.props?.processId
                );

                if (featureType === "popup") {
                  setCodePopup(code || null);
                  setNamePopup(name || null);
                } else {
                  try {
                    const { activityInstanceId, ...rest } = itemForm;
                    const variables = Object.fromEntries(
                      Object.entries(rest).map(([k, v]) => [k, { value: v }])
                    );
                    const endpoint = `${API_BPMN}/process/${activityInstanceId}/submit-form`;
                    await api.post(endpoint, { variables });
                    toast(`${flow?.name} thành công`, "success");
                  } catch (error) {
                    // eslint-disable-next-line no-console
                    logger.log(error);
                  } finally {
                    setOpen(false);
                    setReloadTable((pre) => pre + 1);
                  }
                }
              };
              if (mapping?.outgoing?.length) {
                buttons.push(
                  ...mapping.outgoing.map((flow) => ({
                    label: flow.name.toUpperCase(),
                    onClick: () => handleAction(flow),
                    color: "secondary",
                  }))
                );
              } else {
                buttons.push({
                  label: "Lưu",
                  onClick: handleAction,
                });
              }
            }
          }


          setOutgoingBtns(buttons);
        } catch (err) {
          // eslint-disable-next-line no-console
          logger.error("Error in handleGetBtn:", err);
        }
      },
      [handleGetNextAction]
    );

    const handleAction = useCallback(
      async (action, rowItem) => {

        if (action.config) {
          setCode(action.config.fnCode);
          setPopupName(action.config.popupName);
          setCodeExport(action.config.fnCodeExport);

          setActionType(action.config.actionType);

          setDisplayType(action.config.displayType);

          if (action?.config?.multiForms) {
            dispatch(setMultiDynamicForm(action.config.multiForms));
          }
          await handleGetBtn(
            rowItem.activityInstanceId,
            rowItem,
            action.config.isExport,
            action.config.actionType === 'view',
            action.config.multiForms,
            rowItem
          );

          if (action.config.actionType === 'delete') {
            setOpenDialogDlt(true)
            setActivityInstanceId(rowItem.activityInstanceId);
            return
          } else {
            setOpen(true);
          }


          try {
            const { data: rowDetail } = await api.get(`${DATA_TABLE_BPMN}/${rowItem.activityInstanceId}`)

            const mappedObj = Object.fromEntries(
              Object.entries(rowDetail).map(([key, val]) => [key, val.value])
            );

            setDefaultValues({ ...mappedObj, activityInstanceId: rowItem.activityInstanceId });
          } catch (error) {
            // eslint-disable-next-line no-console
            logger.log("🚀 ~ DemoTablePage ~ error:", error)

          }
          // setDefaultValues(rowItem);
          setActivityInstanceId(rowItem.activityInstanceId);
        } else if (action.config?.url) {
          navigate(action.config.url);
        }
      },
      [navigate, handleGetBtn]
    );

    const handleAdd = async (data, payload) => {

      const payloadFinal = { ...payload }
      // if (activityInstanceIdOfTable) {
      //   payloadFinal.variables.activityInstanceIdFilter = { value: activityInstanceIdOfTable, type: 'String' }

      // }
      try {
        const { data: res } = await api.post(`${API_ADD_FIELD_BPMN}/start/${code}`, payloadFinal);
        toast("Thêm mới dữ liệu thành công!", "success");
        setOpen(false);
        setReloadTable((pre) => pre + 1);
        setCode(null);
        setDisplayType(null);
        setPopupName(null);
        setSize('')
        setDefaultValues({});
        setOutgoingBtns([]);

        dispatch(setIdTableInForm(res.id))
      } catch (error) {
        toast("Khởi tạo quy trình thất bại", "error");
      }
    };

    const handleUpdate = useCallback(
      async (formData) => {

        try {
          const { activityInstanceId, ...rest } = formData;

          delete rest.status;

          const entries = await Promise.all(
            Object.entries(rest).map(async ([k, v]) => {
              let value = v?.value?.value || v?.value || "";


              if (v?.type === "file" && v.value instanceof File) {
                const formDataFile = new FormData();
                logger.log("Updating form data:", v);
                formDataFile.append("file", v.value);

                const uploadRes = await api.post(API_UPLOAD_FILE, formDataFile, {
                  headers: { "Content-Type": "multipart/form-data" },
                });

                value = uploadRes.data.data._id;
              }

              if (typeof value !== "string") {
                try {
                  value = JSON.stringify(value);
                } catch {
                  value = String(value);
                }
              }

              return [k, { value }];
            })
          );

          const variables = Object.fromEntries(entries);

          await api.put(`${DATA_TABLE_BPMN}/update-variable`, {
            processInstanceId: activityInstanceId.value,
            variables,
          });

          toast("Lưu thành công", "success");
          setReloadTable((pre) => pre + 1);
          setOpen(false);
        } catch (err) {
          // eslint-disable-next-line no-console
          logger.error("Update error:", err);
        }
      },
      [fetchTableData]
    );

    const handleSubmitPopup = useCallback(
      async (data) => {
        const { activityInstanceId, ...rest } = defaultValues;
        try {
          let activityId = activityInstanceId;
          const rawData = rest;

          delete rawData.status;
          delete data.status;

          // build variables
          // const variables_1 = Object.fromEntries(
          //   Object.entries(rawData).map(([k, v]) => [k, { value: v }])
          // );

           const variables1 = Object.fromEntries(
            Object.entries(rawData).map(([k, v]) => [k, { value: v }])
          );


          // const variables_2 = Object.fromEntries(
          //   Object.entries(data).map(([k, v]) => [k, { value: v.value }])
          // );

          const variables2 = Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, { value: v.value }])
          );

          if (flow?.conditionVariable) {
            variables1[flow.conditionVariable] = { value: flow.conditionValue };
          }
          const fileUrl = Object.values(data)[0].value.file;
          if (!fileUrl) {
            // chọn API endpoint phù hợp
            const endpoint = `${API_BPMN}/process/${activityId}/submit-form`;

            await api.post(endpoint, { variables: variables1 });
            await api.post(endpoint, { variables: variables2 });
            // logic cho popup
            toast("Lưu thành công", "success");
          } else {
            const downloadFile = (
              url,
              fileName,
              body = {},
              method = "GET",
              isDownload,
              cb
            ) => {
              return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open(method, url, true);
                xhr.setRequestHeader(
                  "Authorization",
                  `Bearer ${localStorage.getItem("token")}`
                );
                xhr.setRequestHeader("Content-type", `application/json`);
                xhr.responseType = "blob";
                xhr.onload = function () {
                  if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                      const urlCreator = window.URL || window.webkitURL;
                      const imageUrl = urlCreator.createObjectURL(this.response);
                      if (isDownload) {
                        const tag = document.createElement("a");
                        tag.href = imageUrl;
                        tag.download = fileName && fileName.toLowerCase();
                        document.body.appendChild(tag);
                        tag.click();
                        document.body.removeChild(tag);
                      }
                      resolve({
                        status: true,
                        message: "Xuất biểu mẫu thành công!",
                        urlFile: imageUrl,
                      });
                      cb && cb();
                    } else {
                      reject({
                        status: false,
                        message: "Xuất biểu mẫu không thành công!",
                      });
                      cb && cb();
                    }
                  }
                };
                xhr.onerror = () => {
                  //   props.onPreviewFailed();
                  //   props.onChangeSnackbar({
                  //     variant: "error",
                  //     message: error.message || "Tải file thất bại",
                  //     status: true,
                  //   });
                  toast("tải thất bại", "success");
                };
                xhr.send(JSON.stringify(body));
              });
            };
            function transformValues(obj) {
              const result = {};
              for (const [key, value] of Object.entries(obj)) {
                if (
                  typeof value === "object" &&
                  value !== null &&
                  "value" in value
                ) {
                  result[key] = String(value.value); // ép về string
                } else {
                  result[key] = String(value); // luôn đảm bảo string
                }
              }
              return result;
            }

            const transformed = transformValues(defaultValues);
            await downloadFile(
              `${API_EXPORT_TEMPLATE_URL}?docUrl=${fileUrl}&resultType=${"docx"}`,
              `${"Biểu mẫu"}.docx`,
              {
                content: JSON.stringify(transformed),
              },

              "POST",
              true
            );
            toast("Xuất biểu mẫu thành công", "success");
          }

          setCodePopup(null);
          setOpen(false);
          setReloadTable((pre) => pre + 1);
        } catch (err) {
          // eslint-disable-next-line no-console
          logger.error("❌ handleSubmitForm error:", err);
        }
      },
      [activityInstanceId, fetchTableData, flow]
    );

    const handleExport = useCallback(
      async (data, row, item = {}) => {
        let fileUrl;
        if (data && data.file) {
          fileUrl = data.file;
        } else {
          const values = Object.values(data || {});
          fileUrl = values[values.length - 1]?.value?.file;
        }
        if (fileUrl) {
          const downloadFile = (
            url,
            fileName,
            body = {},
            method = "GET",
            isDownload,
            cb
          ) => {
            return new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open(method, url, true);
              xhr.setRequestHeader(
                "Authorization",
                `Bearer ${localStorage.getItem("token")}`
              );
              xhr.setRequestHeader("Content-type", `application/json`);
              xhr.responseType = "blob";
              xhr.onload = function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                  if (xhr.status === 200) {
                    const urlCreator = window.URL || window.webkitURL;
                    const imageUrl = urlCreator.createObjectURL(this.response);
                    if (isDownload) {
                      const tag = document.createElement("a");
                      tag.href = imageUrl;
                      tag.download = fileName && fileName.toLowerCase();
                      document.body.appendChild(tag);
                      tag.click();
                      document.body.removeChild(tag);
                    }
                    resolve({
                      status: true,
                      message: "Xuất biểu mẫu thành công!",
                      urlFile: imageUrl,
                    });
                    cb && cb();
                  } else {
                    reject({
                      status: false,
                      message: "Xuất biểu mẫu không thành công!",
                    });
                    cb && cb();
                  }
                }
              };
              xhr.onerror = () => {
                //   props.onPreviewFailed();
                //   props.onChangeSnackbar({
                //     variant: "error",
                //     message: error.message || "Tải file thất bại",
                //     status: true,
                //   });
                toast("tải thất bại", "success");
              };
              xhr.send(JSON.stringify(body));
            });
          };
          function transformValues(obj) {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
              if (
                typeof value === "object" &&
                value !== null &&
                "value" in value
              ) {
                result[key] = String(value.value); // ép về string
              } else {
                result[key] = String(value); // luôn đảm bảo string
              }
            }
            return result;
          }

          const sourceData =
            item && Object.keys(item).length > 0 ? item : defaultValues;
          const transformed = transformValues(sourceData);
          await downloadFile(
            `${API_EXPORT_TEMPLATE_URL}?docUrl=${fileUrl}&resultType=${"docx"}`,
            `${"Biểu mẫu"}.docx`,
            {
              content: JSON.stringify(transformed),
            },

            "POST",
            true
          );
          toast("Xuất biểu mẫu thành công", "success");
        }
      },
      [defaultValues]
    );

    const handleCloseDrawer = useCallback(() => {
      setOpen(false);
      setCode(null);
      setCodePopup(null);
      setOutgoingBtns([]);
      setOpenDialogExport(false);
      setCodeExport(null);
      setDefaultValues({});
    }, []);

    const handleDelete = async () => {
      try {
        await callApi('delete', `${DATA_TABLE_BPMN}/${activityInstanceId}`)
        toast("Xóa thành công", "success");
        setReloadTable((pre) => pre + 1);
        setOpenDialogDlt(false);
      } catch (error) {
        // eslint-disable-next-line no-console
        logger.log(error)
      }
    }


    const handleDeleteMulti = async () => {
      try {
        await callApi('delete', `${DATA_TABLE_BPMN}/process-instance/multiple`, {
          processInstanceIds: selectedIds
        })
        toast("Xóa thành công", "success");
        setReloadTable((pre) => pre + 1);
        setOpenDialogDltMulti(false);
      } catch (error) {
        // eslint-disable-next-line no-console
        logger.log(error)
      }
    }
    const handleOpenDeleteMulti = () => {
      setOpenDialogDltMulti(true)
    }

    const handleTabChange = async (fnCode) => {
      try {
        const { data: res } = await api.get(
          `${FUNCTIONMANAGEMANT}/find-by-code/${fnCode}`
        );

        dispatch(addDataFieldTable(res.data?.valueField?.field))
        dispatch(addFormConfig(res.data?.fields));
        dispatch(addTableConfig(res.data?.fields));

        fetchTableData({}, fnCode);
        // eslint-disable-next-line no-console
        logger.log(res, 'ádasdasdad')
        return res.data;
      } catch (error) {
        return {};
      }
    }

    const handleActionPopup = (data) => {
      setCode(data.code)
      setDisplayType(data.displayType)
      setPopupName(data.name)
      setOpen(true)
      setActionType('add')
      setSize(data.size)
    }

    useEffect(() => {
      const fetchCodeList = async () => {
        try {
          const { data: res } = await api.get(
            `${FUNCTIONMANAGEMANT}/find-by-code/${item.props?.fnCodeList}`,
          );

          dispatch(addDataFieldTableInForm(res.data?.valueField?.field))

          fetchTableData({}, item.props?.fnCodeList, userFilters);
          return res.data;
        } catch (error) {
          return {};
        }
      }
      if (item.props?.fnCodeList) {
        fetchCodeList()
      }
    }, [item.props?.fnCodeList, reloadTable, userFilters])

    useImperativeHandle(ref, () => ({
      handleSearch,
      selectedIds,
      handleOpenDeleteMulti,
      handleTabChange,
      handleActionPopup
    }))

    const effectiveDisplayType = useMemo(() => {
      const d = String(displayType || 'swiper').toLowerCase().trim();
      return d === 'swipper' ? 'swiper' : d;
    }, [displayType]);

    const Display = effectiveDisplayType === 'swiper' ? CustomDrawer : CustomPopup;
    const createFnCodeListChangeHandler = (id) => (e) => {
      onPropChange(id, "fnCodeList", e.target.value);
    };
    const handleSelect = (ids) => {
      onSelectedIds(ids);
      handleSelectRows(ids);
    };
    const handleCloseCodePopup = () => {
      setCodePopup(null);
    };
    const handleCloseDialogExport = () => {
      setOpenDialogExport();
    };

    const handleSaveDialogExport = () => {
      formExportRef.current?.submitForm();
    };
    const handleCloseDialogDlt = () => {
      setOpenDialogDlt(false);
    };

    const handleCloseDialogDltMulti = () => {
      setOpenDialogDltMulti(false);
    };

    return (
      <>
        {mode === 'builder' && <Select
          size="small"
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={item.props?.fnCodeList || ''}
          onChange={createFnCodeListChangeHandler(item.id)}
        >
          {funcDataList.map((item) => (
            <MenuItem key={item._id} value={item.code}>{item.name}</MenuItem>

          ))}

        </Select>}

        <CustomTableBorder
          dataColumn={dataColumn}
          data={dataTableCheck}
          showIndexColumn
          showCheckboxColumn
          onSelect={handleSelect}
          pagination={pagination}
          onPage={handlePageChange}
          defaultValues={selectedIds}
          mode={mode}
          item={item}
          onPropChange={onPropChange}
          onAction={handleAction}
          processId={data?.idList}
          formatId='activityInstanceId'
          funcDataForm={funcDataForm}
        />

        <Display
          size={size || 'md'}
          open={open}
          onClose={handleCloseDrawer}
          actions={{
            view: outgoingBtns,
            update: [{ label: 'Cập nhật', onClick: () => formRef.current?.submitForm() }],
            add: [{ label: 'Thêm mới', onClick: () => formRef.current?.submitForm() }]
          }[actionType]}
          title={popupName}
        >
          {code && (
            <RegistryProvider registry={defaultRegistry}>
               {/* <Form
                style={{ overflow: effectiveDisplayType === 'swiper' ? 'auto' : 'unset', height: effectiveDisplayType === 'swiper' ? '90vh' : '100%' }} */}
              <StyledForm
                effectiveDisplayType={effectiveDisplayType}
                code={code}
                defaultValues={defaultValues}
                onData={{ update: handleUpdate, add: handleAdd }[actionType]}
                isViewOnly={actionType === 'view'}
                ref={formRef}
                // dispatchFormConfig={dispatchFormConfig}
                dispatchFormField={addDataFieldTableInForm}
              />
            </RegistryProvider>
          )}

          {codePopup && (
            <RegistryProviderPopup registry={defaultRegistryPopup}>
              <Popup
                open={codePopup}
                code={codePopup}
                onData={handleSubmitPopup}
                // isViewOnly={actionType === 'view'}
               onClose={handleCloseCodePopup}
                title={namePopup}
              />
            </RegistryProviderPopup>
          )}

          <CustomDialog
            size="lg"
            onClose={handleCloseDialogExport}
            onSave={handleSaveDialogExport}
            open={openDialogExport}
            title={"Xuất biểu mẫu"}
          >
            {codeExport && (
              <RegistryProviderFormExport registry={defaultRegistryExport}>
                <FormExport
                  ref={formExportRef}
                  code={codeExport}
                  defaultValues={defaultValues}
                  onData={handleExport}
                  isViewOnly={actionType === 'view'}
                />
              </RegistryProviderFormExport>
            )}
          </CustomDialog>



        </Display>


        <CustomDialog
          // size=""
           onClose={handleCloseDialogDlt}
          onSave={handleDelete}
          open={openDialogDlt}
          title={"XÁC NHẬN XÓA?"}
          type='delete'
        >
          Bạn có chắc chắn muốn xóa không?
        </CustomDialog>

        <CustomDialog
          // size=""
          onClose={handleCloseDialogDltMulti}
          onSave={handleDeleteMulti}
          open={openDialogDltMulti}
          title={"XÁC NHẬN XÓA NHIỀU?"}
          type='delete'
        >
          Bạn có chắc chắn muốn xóa không?
        </CustomDialog>
      </>
    );
  });

DemoTablePage.displayName = 'DemoTablePage'

DemoTablePage.propTypes = {
  data: PropTypes.object,
  mode: PropTypes.string,
  item: PropTypes.object,
  onPropChange: PropTypes.func,
  onSelectedIds: PropTypes.func,
};

export default DemoTablePage;
