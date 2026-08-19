/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/forbid-component-props */

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  useContext,
  forwardRef,
  useImperativeHandle,
  Suspense,
} from "react";
import CustomTableBorder from "@components/CustomTableBorder";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";

import {
  API_BPMN,
  API_DYNAMIC,
  DATA_TABLE_BPMN,
  FUNCTIONMANAGEMANT,
  GET_STATUS_STARTED_CMD,
  MODEL_INTROSPECT,
  taskFeature,
  API_UPLOAD_FILE,
  API_ADD_FIELD_BPMN,
  API_IMPORT_EXCEL,
  // API_VIEW_FILE,
  APP_DHVB_BASE,
  APP_BASE,
  API_EXPORT_BODY,
  API_EXPORT_TEMPLATE_URL_EXCEL,
  API_EXPORT_TEMPLATE_URL_WORD,
  API_XLSX_TO_PDF,
} from "@EnvironmentFile/constants/urlConfig";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Tooltip,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  InputLabel,

  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  // Box,
  Typography
} from "@mui/material";
import { defaultRegistry, Form, RegistryProvider } from "@builder-form/index";
import {
  defaultRegistryExport,
  FormExport,
  RegistryProviderFormExport,
} from "@builder-form-export/index";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import CustomDrawer from "@components/DynamicForm/CustomDrawer";
import CustomPopup from "@components/DynamicForm/CustomPopup";
import TaskDetailPanel from "@components/TaskDetailPanel/TaskDetailPanel";

import { useToast } from "@components/common/ToastProvider";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import LoadingDialog from "@components/LoadingDialog";
import { StyledDialogContent } from "@styles/CustomDialog.styles";
import FileViewerDialog from "@components/CustomDialog/FileViewerDialog";
import {
  addRecordDataTable,
  addUserFlow,
  setCodeGlobal,
  setMultiDynamicForm,
  setPagination,
} from "@redux/slices/FormDesign/formDesignSlice";
import { AuthContext } from "@AuthContext/AuthProvider";
import api, { callApi } from "@services/api";
import { ensureUserPermissions } from "@redux/slices/managementUsersSlice";
import { generateUniqueId, getDefaultDatePresetSourceField, getDefaultTimeRangeFromPreset } from "@helper/helper";

import BpmnDiagramViewer from "@components/DynamicForm/BpmnDiagramViewer";

import ProcessHistory from "@components/DynamicForm/ProcessHistory";
import {
  DeleteIconST,
  IconButtonST,
  STTableCell,
  TableCellAction,
  TableCellBold,
  TableCellST,
  TableContainerST,
  // DemoTablePageWrapper,
  TabPanelContainer,
  TabPanelContent,
  TabsWrapper,
  SpecificComponentWrapper,
  BoxTitle,
} from "./DemoTablePage.styles";



import { getComponentByKey } from "./componentRegistry";
import { getTableComponentByKey, setGlobalTableState, getGlobalTableState, subscribeGlobalTableState } from "./tableComponentRegistry";
import { COMPONENT_OPTIONS } from "@pages/AdministrationSystem/FunctionManagement/components/ComponentOption";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";
import { DISPLAY_TYPE_OPTIONS } from "./DisplayOption";

import RouteLoading from "@components/Loading/RouteLoading";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <TabPanelContainer
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <TabPanelContent>{children}</TabPanelContent>
    </TabPanelContainer>
  );
}

const DemoTablePage = forwardRef(
  (
    {
      data,
      mode,
      item,
      onPropChange,
      onSelectedIds,
      url,
      reloadData = null,
      setReloadData,
      hasSubmenu,
      uiVariant,
      // onShowStarFilter,
    },
    ref
  ) => {
    const [overrideTableProps, setOverrideTableProps] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedRowsData, setSelectedRowsData] = useState([]);

    // Kiểm tra xem tất cả các bản ghi được chọn có cùng bpmnVersion hay không
    const isSameBpmnVersion = useMemo(() => {
      if (!selectedRowsData || selectedRowsData.length <= 1) return true;
      const firstVersion = selectedRowsData[0]?.bpmnVersion || selectedRowsData[0]?.document?.bpmnVersion;
      return selectedRowsData.every(row => {
        const currentVersion = row?.bpmnVersion || row?.document?.bpmnVersion;
        return currentVersion === firstVersion;
      });
    }, [selectedRowsData]);

    const funcDataFormMerged = useMemo(() => {
      // Nếu chọn nhiều bản ghi nhưng không cùng bpmnVersion thì ẩn các hành động
      if (selectedIds.length > 1 && !isSameBpmnVersion) {
        return [];
      }

      const sourceActions = overrideTableProps?.configs || data?.funcDataForm || [];
      return sourceActions.map(action => {
        if (action.config) {
          const compKey = action.config.componentKey;
          const compInfo = compKey ? getComponentByKey(compKey) : null;

          return {
            ...action,
            ...action.config,
            displayName: action.config.displayName || action.config.name || compInfo?.title || action.displayName || action.name,
            label: action.config.displayName || action.config.name || compInfo?.title || action.displayName || action.name,
            icon: action.config.icon || compInfo?.icon || action.icon,
            actionType: action.config.actionType || compInfo?.dialogKey || action.actionType,
          };
        }
        return action;
      });
    }, [overrideTableProps, data?.funcDataForm, selectedIds.length, isSameBpmnVersion]);

    const { user } = useContext(AuthContext);
    const dispatch = useDispatch();
    const userPermissions = useSelector((state) => state.users.userPermissions);
    const fnCodeCusstomTable = useSelector((state) => state.customTable.fnCode);
    const navigate = useNavigate();
    const location = useLocation();
    const { dataViewConfig } = useSelector((state) => state.viewConfig);
    const formConfig = useSelector((state) => state.formDesign.formConfig);
    // Tìm _id của view config hiện tại dựa trên fnCode
    const currentViewConfigId = useMemo(() => {
      return dataViewConfig?.find((config) => config.code === item.props.fnCode)
        ?._id;
    }, [dataViewConfig, item.props.fnCode]);

    const [tableType, setTableType] = useState(
      item.props?.isParentChild ? "tree" : "list"
    );

    useEffect(() => {
      setTableType(item.props?.isParentChild ? "tree" : "list");
    }, [item.props?.isParentChild]);

    const TableComponent = useMemo(() => {
      const selectedOption = DISPLAY_TYPE_OPTIONS.find(
        (option) => option.value === tableType
      );
      return selectedOption?.component || CustomTableBorder;
    }, [tableType]);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const dataFields = useSelector((state) => state.formDesign.dataFieldTable);
    const pagination = useSelector((state) => state.formDesign.pagination);

    const [activeTab, setActiveTab] = useState(0);

    // Ref để theo dõi pathname, giúp phát hiện khi nào URL thực sự thay đổi
    const previousPathname = useRef(location.pathname);

    useEffect(() => {
      const initialColumns = data?.field || dataFields;
      if (initialColumns?.length) {
        setColumns(
          initialColumns.map((c) => ({
            ...c,
            isShow: c.isShow !== undefined ? c.isShow : (c.showInList !== undefined ? c.showInList : true),
          }))
        );
      }
    }, [data?.field, dataFields]);



    const [dataTable, setDataTable] = useState([]);
    const [columns, setColumns] = useState([]);
    const [open, setOpen] = useState(false);
    const [code, setCode] = useState(null);
    const [size, setSize] = useState(null);
    const [defaultValues, setDefaultValues] = useState({});
    const [outgoingBtns, setOutgoingBtns] = useState([]);
    const [actionType, setActionType] = useState("");

    const [activityInstanceId, setActivityInstanceId] = useState("");
    const [codePopup, setCodePopup] = useState(null);

    const [namePopup, setNamePopup] = useState(null);
    const [displayType, setDisplayType] = useState("swiper");

    const [openDialogExport, setOpenDialogExport] = useState(false);
    const [openBpmnDiagramViewer, setOpenBpmnDiagramViewer] = useState(false);

    const [multiFormOptions, setMultiFormOptions] = useState([]);
    const [selectedFormCodes, setSelectedFormCodes] = useState([]);
    const [exportFormat, setExportFormat] = useState("docx");

    const [openDialogDlt, setOpenDialogDlt] = useState(false);
    const [openDialogDltMulti, setOpenDialogDltMulti] = useState(false);

    const [userFilters, setUserFilters] = useState(() => {
      const initFilters = {};
      const sourceColumns = data?.field || dataFields || [];
      
      sourceColumns.forEach(field => {
        if (field.type === "date") {
          const presetSourceField = getDefaultDatePresetSourceField(field, sourceColumns);
          if (presetSourceField?.defaultTimePreset) {
            const range = getDefaultTimeRangeFromPreset(presetSourceField.defaultTimePreset);
            if (range) {
               const filterKey = field.key || field.name;
               const advancedKey = field.name || field.key;
               if (field.filter && filterKey) initFilters[filterKey] = range;
               if (field.advancedSearch && advancedKey) initFilters[advancedKey] = range;
               if (!field.filter && !field.advancedSearch) {
                 const fallbackKey = filterKey || advancedKey;
                 if (fallbackKey) initFilters[fallbackKey] = range;
               }
            }
          }
        }
      });
      return initFilters;
    });
    const [sort, setSort] = useState({});
    const [loading, setLoading] = useState(false);
    const [previewFile, setPreviewFile] = useState({
      open: false,
      url: "",
      name: "",
      type: null,
    });

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingExport, setLoadingExport] = useState(false);

    // Báo cho component cha biết có nên hiển thị nút lọc sao hay không
    const [flow, setFlow] = useState(null);
    const [popupName, setPopupName] = useState(null);
    const [codeExport, setCodeExport] = useState(null);
    const [deleteApiUrl, setDeleteApiUrl] = useState("");
    const [deleteTitle, setDeleteTitle] = useState("");
    const [reloadTable, setReloadTable] = useState(1);

    // Ref flags cho việc quản lý cấu hình tab
    const isSwitchingTabRef = useRef(false);
    const isFetchingConfigRef = useRef(false);

    // Lưu lại pagination cuối cùng nhận được từ server để so khớp.
    // Nếu useEffect được kích hoạt mà pagination trùng với cái vừa nhận -> Bỏ qua call API thừa.
    const lastResultPaginationRef = useRef({ page: 1, rowsPerPage: 25 });

    // Luôn giữ filter mới nhất trong ref để handleSearch truy cập mà không cần dependency
    const userFiltersRef = useRef(userFilters);
    useEffect(() => { userFiltersRef.current = userFilters; }, [userFilters]);

    const [SpecificComponent, setSpecificComponent] = useState(null);
    const [specificComponentProps, setSpecificComponentProps] = useState({});
    const [isSignBtn, setIsSignBtn] = useState(false);
    const [specificTableComponent, setSpecificTableComponent] = useState(null);
    const [specificTableComponentProps, setSpecificTableComponentProps] = useState({});
    const [expandTree, setExpandTree] = useState(false);

    // Global State for layout adjustments
    const [globalState, setGlobalState] = useState(getGlobalTableState());
    useEffect(() => {
      const unsubscribe = subscribeGlobalTableState((newState) => {
        setGlobalState(newState);
      });
      return () => unsubscribe();
    }, []);

    const formExportRef = useRef();
    const formRef = useRef();
    const popupformRef = useRef();

    const toast = useToast();

    const keyCD = "dshsbiennhan";
    const templateApiUrl = useMemo(
      () => overrideTableProps?.apiUrl || data?.apiUrl || item?.props?.apiUrl || null,
      [overrideTableProps?.apiUrl, data?.apiUrl, item?.props?.apiUrl]
    );
    // Hàm tìm tất cả action trong layout (để truyền vào lịch)
    const getAllActions = (configs) => {
      let actions = [];
      configs.forEach(cfg => {
        if (cfg.type === 'action') actions.push(cfg);
        if (cfg.props?.children) actions = [...actions, ...getAllActions(cfg.props.children)];
      });
      return actions;
    };

    const handleCellClick = useCallback(
      async (row, columnKey, file) => {
        if (!file) return;
        // Logic mới được tích hợp từ UploadFile/index.js
        const fileName = file?.fileName || file?.name || "file";
        const lower = fileName.toLowerCase();

        const isDoc = /\.(doc|docx)$/i.test(lower);
        const isExcel = /\.(xls|xlsx)$/i.test(lower);
        const isPpt = /\.(ppt|pptx)$/i.test(lower); // Giữ lại để tương thích, dù chưa xử lý
        const isOtherOffice = isPpt;
        const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

        const fileId = file?.fileId || file?.id || file?._id;

        if (!fileId) {
          toast("File không có mã định danh hợp lệ để xem trước.", "error");
          return;
        }

        setLoading(true);

        try {
          let blob;
          let previewName = fileName;
          let previewType = null;

          if (isDoc) {
            const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
            const res = await api.get(conversionApi, {
              responseType: "blob",
              timeout: 0,
            });
            blob = new Blob([res.data], { type: "application/pdf" });
            previewType = "pdf";
          } else if (isBrowserFile) {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const res = await api.get(viewUrl, {
              responseType: "blob",
              timeout: 0,
            });
            blob = new Blob([res.data], {
              type: res.headers["content-type"] || res.data.type,
            });
            const ext = fileName.split(".").pop().toLowerCase();
            previewType = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
              ? "image"
              : "pdf";
          } else if (isExcel) {
            // Excel: Download -> Convert to PDF via NEW API
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

            blob = new Blob([res.data], { type: "application/pdf" });
            previewType = "pdf";
          } else if (isOtherOffice) {
            // Cụ thể là PPT (vì Excel đã tách ra)
            const viewUrl = `${APP_BASE}/api/files/download/${fileId}`; // Dùng download để lấy file gốc
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
            previewType = "html"; // Sẽ được render trong iframe
          } else {
            throw new Error("Định dạng file không được hỗ trợ xem trước.");
          }

          if (blob) {
            const url = URL.createObjectURL(blob);
            setPreviewFile({
              open: true,
              url: url,
              name: previewName,
              type: previewType,
            });
          }
        } catch (error) {
          const message = error.message || "Không thể xem trước tài liệu.";
          toast(message, "error");
        } finally {
          setLoading(false);
        }
      },
      [toast]
    );

    const handleClosePreview = () => {
      if (previewFile.url) {
        URL.revokeObjectURL(previewFile.url); // Dọn dẹp blob URL để tránh rò rỉ bộ nhớ
      }
      setPreviewFile({ open: false, url: "", name: "", type: null });
    };

    const hasFollowAssignee = useMemo(() => {
      return item.props?.isFollowAssignee;
    }, [item.props?.isFollowAssignee]);

    const handleSearch = useCallback(async (search) => {
      let combinedFilters = { ...search };

      
      // MoreAction chỉ truyền type và processFn. Giữ lại giá trị ngày hiện có
      // từ ô Search để không làm mất khoảng ngày mặc định khi đổi chức năng.
      if (search?.processFn) {
        const searchFields = data?.field || dataFields || [];
        searchFields.forEach((field) => {
          if (field.type !== "date") return;

          [field.key, field.name].filter(Boolean).forEach((dateKey) => {
            if (
              combinedFilters[dateKey] === undefined &&
              userFiltersRef.current?.[dateKey] !== undefined
            ) {
              combinedFilters[dateKey] = userFiltersRef.current[dateKey];
            }
          });
        });
      }

      for (const key in combinedFilters) {
        if (combinedFilters[key] === "" || combinedFilters[key] === null || combinedFilters[key] === undefined) {
          delete combinedFilters[key];
        }
      }

      // QUAN TRỌNG: Giữ lại processFn hiện tại nếu trong search mới không truyền vào
      // Tránh việc bị mất context tab khi user thực hiện Search/Filter bên trong một Tab.
      const currentProcessFn = combinedFilters.processFn || userFiltersRef.current?.processFn;
      if (currentProcessFn) {
        combinedFilters.processFn = currentProcessFn;
      }

      const processFn = combinedFilters.processFn;

      if (processFn && processFn !== item.props.fnCode) {
        if (isFetchingConfigRef.current) return;
        isFetchingConfigRef.current = true;
        isSwitchingTabRef.current = true;

        try {
          const { data: res } = await api.get(`${FUNCTIONMANAGEMANT}/find-by-code/${processFn}`);
          if (res.success && res.data) {
            const findTableComp = (fields) => {
              const list = Array.isArray(fields) ? fields : [fields];
              for (const field of list) {
                if (!field) continue;
                if (field.type === "table") return field;
                if (field.props?.children) {
                  const found = findTableComp(field.props.children);
                  if (found) return found;
                }
              }
              return null;
            };
            const tableComp = findTableComp(res.data.fields || []);
            if (tableComp) {
              if (res.data.valueField?.field) {
                setColumns(res.data.valueField.field.map((c) => ({
                  ...c,
                  isShow: c.isShow !== undefined ? c.isShow : (c.showInList !== undefined ? c.showInList : true),
                })));
              }
              setOverrideTableProps(tableComp.props);
            }
          }
        } catch (error) {
          logger.error("Error fetching tab config override:", error);
        } finally {
          isFetchingConfigRef.current = false;
          isSwitchingTabRef.current = false;
          // Chỉ set userFilters — 1 lần duy nhất, object mới trigger useEffect đúng 1 lần.
          setUserFilters({ ...combinedFilters });
          setReloadTable((prev) => prev + 1);
        }
      } else {
        setOverrideTableProps(null);
        
        // Kiểm tra xem filter mới có thực sự khác filter cũ không
        const isFiltersChanged = JSON.stringify(combinedFilters) !== JSON.stringify(userFiltersRef.current);
        
        if (isFiltersChanged) {
          // Chỉ set userFilters khi có sự thay đổi
          setUserFilters({ ...combinedFilters });
          setReloadTable((prev) => prev + 1);
        }
      }
    }, [item.props.fnCode]); // Không phụ thuộc userFilters để tránh re-create liên tục

    // Removed the separate useEffect for fetchTabConfig

    // const dataColumn = useMemo(
    //   () => (dataFields?.length ? dataFields : null),
    //   [dataFields]
    // );
    // const dataColumn = useMemo(() => {
    //   const fields = data?.field || dataFields;
    //   return fields?.length ? fields : null;
    // }, [dataFields, data?.field]);
    const dataColumn = useMemo(() => columns, [columns]);
    const dataTableCheck = useMemo(
      // Khi đang loading, trả về undefined để CustomTableBorder hiển thị skeleton
      // thay vì "Không có dữ liệu". Chỉ trả null (empty state) khi API đã xong
      // và thực sự không có dữ liệu.
      () => (loading ? undefined : (dataTable?.length ? dataTable : null)),
      [dataTable, loading]
    );

    async function updateAssigneeByActivityInstanceId(
      activityInstanceId,
      assigneeUserId
    ) {
      try {
        // Lấy taskId theo activityInstanceId
        const { data: res } = await api.get(
          `${API_BPMN}/tasks?processInstanceId=${activityInstanceId}`
        );
        const taskId = res.data[0].id;

        if (assigneeUserId) {
          await api.put(`${MODEL_INTROSPECT}/${taskId}/assignee`, {
            userId: assigneeUserId,
          });
        }
      } catch (err) {
        logger.error("❌ Error update assignee:", err);
      }
    }

    const getProcessID = async (codeAnotherProcess) => {
      let processID;

      if (codeAnotherProcess) {
        try {
          const { data: res } = await api.get(
            `${FUNCTIONMANAGEMANT}/find-by-code/${codeAnotherProcess}`
          );
          processID = res.data.processID;
        } catch (error) {
          logger.error(
            "Error fetching processID by codeAnotherProcess:",
            error
          );
          processID = null;
        }
      } else {
        processID = item.props?.processId;
      }

      return processID;
    };

    const fetchTableData = useCallback(
      async (params, code, sort, search, signal) => {
        const sourceColumns = data?.field || dataFields || [];

        if (
          (!code && item?.props?.featureType !== "fullList") ||
          !sourceColumns?.length && columns.length === 0
        )
          return;

        // loading được quản lý tập trung tại fetchApi (useEffect), không set ở đây.
        let wasCanceled = false;

        try {
          let tableData;
          let rows;

          if (code === keyCD) {
            const apiUrl = `${DATA_TABLE_BPMN}/list-process-variables`;
            const body = {
              processFnList: ["danhsachhoso", "dshosodoanhnghiep"],
              ...(sort && Object.keys(sort).length && sort),
              ...(search &&
                Object.keys(search).length && { userFilters: search }),
            };
            tableData = await callApi("post", apiUrl, body, {
              params: {
                page: params?.page || 1,
                limit: params?.limit || 25,
                ...(tableType === 'kanban' ? { viewMode: 'kanban' } : {}),
              },
              signal,
            });
            const rawKeyCDData = tableData?.items || tableData?.data?.items || (Array.isArray(tableData?.data) ? tableData.data : []);
            rows = rawKeyCDData;
          } else {
            let URL_VARIBLES = `${DATA_TABLE_BPMN}/list-variables`;
            if (hasFollowAssignee)
              URL_VARIBLES = `${DATA_TABLE_BPMN}/tasks-by-assignee/task`;
            if (item?.props?.featureType === "fullList")
              URL_VARIBLES = `${DATA_TABLE_BPMN}/all/tasks`;
            if (item?.props?.featureType === "completeList")
              URL_VARIBLES = `${API_BPMN}/tasks/get-completed-tasks-for-current-user`;
            const { type, processFn, ...restSearch } = search || {};
            const calendarKeys = sourceColumns?.filter(c => c.showFilterCalendar).map(c => c.key || c.name) || [];

            const urlParams = new URLSearchParams(location.search);
            const scope = urlParams.get("scope");

            const queryParams = {
              page: params?.page || 1,
              limit: params?.limit || 25,
              ...(sort && Object.keys(sort).length && sort),
              ...(scope ? { scope } : {}),
            };

            const effectiveType = type || (calendarKeys.length > 0 ? calendarKeys[0] : null);

            if (effectiveType) {
              if (calendarKeys.includes(effectiveType)) {
                queryParams.substate = effectiveType;
              } else {
                queryParams.type = effectiveType;
              }
            }

            if (Object.keys(restSearch).length > 0) {
              queryParams.filter = restSearch;
            }

            // Ưu tiên sử dụng processFn truyền vào từ MoreAction nếu có (để lọc theo fnCode mà không đổi màn hình)
            const effectiveCode = processFn || (
              item?.props?.isAuthorized === true && item?.props?.authorizedFunction
                ? item.props.authorizedFunction
                : code
            );

            queryParams.processFn = effectiveCode;

            if (item?.props?.featureType === "automatic") {
              const urlToSplit = templateApiUrl || "";
              const [basePath, searchStr] = urlToSplit.split('?');
              URL_VARIBLES = `${APP_DHVB_BASE}${basePath}`;

              // Trích xuất các tham số hiện có từ apiUrl để gộp vào queryParams
              if (searchStr) {
                const existingParams = new URLSearchParams(searchStr);
                existingParams.forEach((val, key) => {
                  if (queryParams[key] === undefined) {
                    queryParams[key] = val;
                  }
                });
              }
            }
            // }

            if (tableType === 'kanban') {
              queryParams.viewMode = 'kanban';
            }

            tableData = await callApi("get", URL_VARIBLES, null, {
              params: queryParams,
              signal,
            });

            setExpandTree(
              tableData?.expandTree ||
              tableData?.data?.expandTree ||
              false
            );

            // BPMN data extracting logic
            const rawBPMNData = tableData?.items || tableData?.data?.items || (Array.isArray(tableData?.data) ? tableData.data : []);

            rows = rawBPMNData.map((row) => {
              if (row && typeof row === 'object' && row.variables) {
                return {
                  ...row.variables,
                  activityInstanceId: row.activityInstanceId,
                };
              }
              return row;
            });
          }

          if (item?.props?.featureType === "automatic") {
            const automaticData = tableData?.items || tableData?.data?.items || (Array.isArray(tableData?.data) ? tableData.data : []);
            setDataTable(automaticData);
          } else {
            setDataTable(rows || []);
          }
          return tableData;
        } catch (error) {
          if (error.name === 'CanceledError' || error.message === 'canceled') {
            // Request bị cancel: đánh dấu để finally không làm gì thêm.
            // loading giữ nguyên true, fetchApi sẽ tắt khi request mới xong.
            wasCanceled = true;
            return null;
          }
          setDataTable([]);
          return null;
        } finally {
          if (!wasCanceled) {
            setIsRefreshing(false);
            // loading KHÔNG được tắt ở đây — tắt tập trung tại finally của fetchApi.
          }
        }
      },
      [
        data,
        dataFields,
        pagination,
        item.props.fnCode,
        reloadTable,
        hasFollowAssignee,
        url,
        reloadData,
        location.search,
        tableType,
      ]
    );

    useEffect(() => {
      if (onPropChange) {
        if (item?.id && data?.fnCode) {
          onPropChange(item.id, "fnCode", data.fnCode);
        }
        if (item?.id && data?.idList) {
          onPropChange(item.id, "processId", data.idList);
        }

        if (item?.id && data?.featureType) {
          onPropChange(item.id, "featureType", data.featureType);
        }
        if (item?.id && String(data?.isFollowAssignee)) {
          onPropChange(item.id, "isFollowAssignee", data.isFollowAssignee);
        }
        if (item?.id && data?.url) {
          onPropChange(item.id, "url", data.url);
        }
        if (item?.id && data?.apiUrl) {
          onPropChange(item.id, "apiUrl", data.apiUrl);
        }
        if (item?.id && data?.authorizedFunction) {
          onPropChange(item.id, "authorizedFunction", data.authorizedFunction);
        }
        if (item?.id && String(data?.isAuthorized)) {
          onPropChange(item.id, "isAuthorized", data.isAuthorized);
        }
        if (item?.id && data?.isInheritSubTab !== undefined) {
          onPropChange(item.id, "isInheritSubTab", data.isInheritSubTab);
        }
        if (item?.id && data?.inheritSubTabFunction !== undefined) {
          onPropChange(item.id, "inheritSubTabFunction", data.inheritSubTabFunction);
        }
        if (item?.id && String(data?.isParentChild)) {
          onPropChange(item.id, "isParentChild", data.isParentChild);
        }
        if (item?.id && String(data?.customComponent)) {
          onPropChange(item.id, "customComponent", data.customComponent);
        }
      }
    }, [
      onPropChange,
      item?.id,
      data?.fnCode,
      data?.idList,
      data?.featureType,
      data?.isFollowAssignee,
      data?.url,
      data?.apiUrl,
      data?.authorizedFunction,
      data?.isAuthorized,
      data?.isInheritSubTab,
      data?.inheritSubTabFunction,
      data?.isParentChild,
      data?.customComponent,
    ]);

    // logger.log("[DemoTablePage] apiUrl from TemplateDialog:", templateApiUrl);

    const handleSelectRows = useCallback((ids, rows) => {
      setSelectedIds(ids);
      setSelectedRowsData(rows || []);
    }, []);

    const handleGetNextActivity = async (taskId, processId) => {
      if (!taskId) return;

      try {
        const { data: detailTaskFeature } = await api.get(
          `${taskFeature}/detail/by-task`,
          { params: { taskId, processId } }
        );

        const code = detailTaskFeature?.feature?.code;
        if (!code) return;

        const { data: res } = await api.get(
          `${FUNCTIONMANAGEMANT}/find-by-code/${code}`
        );

        return res.data;
      } catch (error) {
        logger.error("Error in handleGetNextActivity:", error);
        return {};
      }
    };

    const handleGetNextAction = useCallback(
      async (
        flow,
        processDefinitionId,
        activityId,
        itemForm,
        codeAnotherProcess
      ) => {
        try {
          const nextActivityIdsPromise = api.get(
            `${MODEL_INTROSPECT}/${processDefinitionId}/next-task-after-gateway`,
            {
              params: {
                currentActivityId: activityId,
                conditionValue: flow.conditionValue,
              },
            }
          );

          const processIDPromise = getProcessID(codeAnotherProcess);

          const [{ data: nextActivityIds }, processID] = await Promise.all([
            nextActivityIdsPromise,
            processIDPromise,
          ]);

          if (!nextActivityIds?.length) {
            throw new Error("No next activities found");
          }

          const { code, name, featureType } = await handleGetNextActivity(
            nextActivityIds[0],
            processID
          );

          const { data: dataNextNode } = await api.get(
            `${MODEL_INTROSPECT}/roles-and-users`,
            {
              params: {
                processDefinitionId,
                activityId: nextActivityIds[0],
              },
            }
          );

          dispatch(
            addUserFlow(dataNextNode?.targets?.[0]?.roles?.[0]?.users || [])
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

              variables[flow.conditionVariable] = {
                value: flow.conditionValue,
              };

              const endpoint = `${API_BPMN}/process/${activityInstanceId}/submit-form`;
              await api.post(endpoint, { variables });

              if (hasFollowAssignee)
                await updateAssigneeByActivityInstanceId(
                  activityInstanceId,
                  user.user.user
                );

              toast(`${flow?.name} thành công`, "success");
            } catch (error) {
              logger.log(error);
            } finally {
              setOpen(false);
              setReloadTable((pre) => pre + 1);
            }
          }
        } catch (err) {
          logger.error("handleGetNextAction error:", err);
        }
      },
      [item.props?.processId, hasFollowAssignee]
    );

    const handleGetBtn = useCallback(
      async (
        id,
        itemForm,
        isExport = false,
        isViewOnly = false,
        multiForms,
        codeAnotherProcess
      ) => {
        try {
          const { data } = await api.get(GET_STATUS_STARTED_CMD(id));
          const processDefinitionId = data.processDefinitionId;
          const activityId = data?.childActivityInstances[0]?.activityId;
          const featureCodeInTask = data.featureCode;

          setCode(featureCodeInTask || codeAnotherProcess);

          const { data: mapping } = await api.get(
            `${MODEL_INTROSPECT}/mapping`,
            {
              params: { processDefinitionId, fromActivityId: activityId },
            }
          );

          // Use roleCodes from redux state; dispatch getUserPermissions only if missing
          let roleCodes = userPermissions?.roleCodes || [];
          if ((!roleCodes || roleCodes.length === 0) && user?.user?.user) {
            try {
              const fetchedAction = await dispatch(
                ensureUserPermissions(user.user.user)
              );
              const fetched = fetchedAction?.payload || fetchedAction;
              roleCodes = fetched?.roleCodes || roleCodes || [];
            } catch (err) {
              logger.error("Error fetching user permissions:", err);
              roleCodes = roleCodes || [];
            }
          }

          // Lấy dataNextNode phụ thuộc mapping
          const { data: dataNextNode } = await api.get(
            `${MODEL_INTROSPECT}/roles-and-users`,
            {
              params: {
                processDefinitionId,
                activityId: mapping.outgoing[0].targetRef,
              },
            }
          );

          dispatch(
            addUserFlow(dataNextNode?.targets?.[0]?.roles?.[0]?.users || [])
          );

          let buttons = [];

          if (isViewOnly && mapping) {
            if (isExport) {
              buttons.push({
                label: "XUẤT BIỂU MẪU",
                onClick: async () => {
                  if (multiForms && multiForms.length > 1) {
                    setExportFormat("docx");
                    setOpenDialogExport(true);
                  } else {
                    try {
                      const res = await api.get(API_DYNAMIC, {
                        params: { 
                          processID: item.props?.processId || "",
                          codes: multiForms.join(',')
                        },
                      });
                      const allForms = res?.data?.data || [];
                      const filteredForms = allForms.filter((form) =>
                        multiForms.includes(form.code)
                      );
                      const formData = filteredForms[0] || {};
                      handleExport(formData, null, itemForm);
                    } catch (err) {
                      logger.error(err);
                    }
                  }
                },
              });
            }

            const isDecision = mapping?.isDecision ?? false;

            if (isDecision) {
              buttons.push(
                ...mapping.outgoing
                  .filter(
                    (flow) =>
                      !flow.outgoingRole ||
                      roleCodes.includes(flow.outgoingRole)
                  )
                  .map((flow) => ({
                    label: flow.name.toUpperCase(),
                    onClick: () => {
                      setFlow(flow);
                      setIsSignBtn(flow?.isSignBtn || false);

                      handleGetNextAction(
                        flow,
                        processDefinitionId,
                        activityId,
                        itemForm,
                        codeAnotherProcess,
                        roleCodes.includes(flow.outgoingRole)
                      );
                    },
                    color: "secondary",
                  }))
              );
            } else {
              const handleAction = async (flow) => {
                const processID = await getProcessID(codeAnotherProcess);
                const { code, featureType, name } = await handleGetNextActivity(
                  mapping?.outgoing[0]?.targetRef,
                  processID
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
                    logger.log(error);
                  } finally {
                    setOpen(false);
                    setReloadTable((pre) => pre + 1);
                  }
                }
              };

              if (mapping?.outgoing?.length) {
                if (mapping.outgoing.some((flow) => flow.outgoingRole)) {
                  buttons.push(
                    ...mapping.outgoing
                      .filter((flow) => roleCodes.includes(flow.outgoingRole))
                      .map((flow) => ({
                        label: flow.name.toUpperCase(),
                        onClick: () => handleAction(flow),
                        color: "secondary",
                      }))
                  );
                } else {
                  buttons.push(
                    ...mapping.outgoing.map((flow) => ({
                      label: flow.name.toUpperCase(),
                      onClick: () => handleAction(flow),
                      color: "secondary",
                    }))
                  );
                }
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
          logger.error("Error in handleGetBtn:", err);
        }
      },
      [handleGetNextAction]
    );

    const handleAction = useCallback(
      async (action, rowItem) => {
        // Xử lý cho component cụ thể được cấu hình từ ActionSection
        if (action.config?.componentKey || action.config?.component) {
          let componentInfo;
          if (action.config.displayType === 'table') {
            componentInfo = getTableComponentByKey(action.config.componentKey);
          } else if (action.config.component) {
            componentInfo = {
              component: action.config.component,
              title: action.config.popupName || action.label,
              dialogKey: action.config.actionType || "add",
              defaultProps: action.config.defaultProps || {}
            };
          } else {
            componentInfo = getComponentByKey(action.config.componentKey);
          }
          setCode(null); // Reset code của form động để tránh render chồng chéo
          if (componentInfo) {
            if (action.config.displayType === 'table' && !action.config.component) {
              setSpecificTableComponent(() => componentInfo.component);
              setGlobalTableState(componentInfo.defaultProps || { hideSearch: false });
              setSpecificTableComponentProps({
                ...(componentInfo.defaultProps || {}),
                documentId: rowItem?.documentId || rowItem?._id || rowItem?.id,
                archiveId: rowItem?.archiveId || rowItem?._id || rowItem?.id,
                docIds: (selectedIds && selectedIds.length > 0) ? selectedIds : (rowItem?.documentId || rowItem?._id || rowItem?.id),
                isAuthority: rowItem?.isAuthority || false,
                bpmnVersion: rowItem?.bpmn_version || false,
                ishandlermeeting: rowItem?.ishandlermeeting || false,
                isparticipant: rowItem?.isparticipant || false,
                listparammeeting: rowItem?.listparammeeting || "",
                setReloadData,
                bookDocumentId: rowItem?.bookDocumentId,
                dialogKey: componentInfo.dialogKey,
                allowSignDigital: action.config?.allowSignDigital || false,
                documentData: rowItem || {},
                fnCode: item.props.fnCode, // Truyền fnCode xuống component con
                title: componentInfo.title,
                dataDetail: rowItem || {},
                type: componentInfo?.defaultProps?.type || "participants",
                id: rowItem?._id || rowItem?.id,
                vehicleRegistrationId: rowItem?.vehicleRegistrationId || rowItem?._id || rowItem?.id,
                isNotEdit: rowItem?.isNotEdit || true,
                workItem: rowItem?.workItem || {},
                availableActions: rowItem?.availableActions || [],
                flowConfig: rowItem?.flowConfig || {},
              });

              return;
            }
            setSpecificComponent(() => componentInfo.component);
            setPopupName(action.config.popupName || componentInfo.title);
            setDisplayType(action.config.displayType || "swiper");
            setSize(action.config.size || "md");
            setActionType(
              action.config.actionType || componentInfo.dialogKey || "add"
            );
            setDefaultValues(rowItem || {});
            setActivityInstanceId(rowItem?.activityInstanceId || rowItem?.id);
            setOpen(true);
            // Tìm mã hành động thực tế từ availableActions của bản ghi (đặc biệt cho Hủy lịch họp lặp)
            const dynamicActionCode = rowItem.availableActions?.find(
              (act) => act.type === "cancel_meeting" || act.type === "cancel_recurring_meeting" || act.code === "HUY_LICH_LAP" || act.code === "HUY_LICH" || act.type === "agree_vehicle_registrant"
            )?.code;

            // Gán các props mặc định từ registry và truyền cả rowItem vào
            setSpecificComponentProps({
              ...(componentInfo.defaultProps || {}),
              ...(action.config || {}), // Truyền tất cả cấu hình từ action config (bao gồm cả data chuyển xử lý)
              actionCode: dynamicActionCode || action.config?.actionCode, // Truyền mã hành động động nếu có
              documentId: rowItem?.documentId || rowItem?._id || rowItem?.id, // Truyền documentId vào props
              archiveId: rowItem?.archiveId || rowItem?._id || rowItem?.id,
              newsId: rowItem?.newsId || rowItem?._id || rowItem?.id,
              docIds: (selectedIds && selectedIds.length > 0) ? selectedIds : (rowItem?.documentId || rowItem?._id || rowItem?.id), // Thêm cho RecallIncomingTextDialog
              isAuthority: rowItem?.isAuthority || false,
              bpmnVersion: rowItem?.bpmn_version || false,
              ishandlermeeting: rowItem?.ishandlermeeting || false,
              isparticipant: rowItem?.isparticipant || false,
              listparammeeting: rowItem?.listparammeeting || "",
              setReloadData: setReloadTable,
              bookDocumentId: rowItem?.bookDocumentId,
              dialogKey: componentInfo.dialogKey,
              allowSignDigital: action.config?.allowSignDigital || false,
              documentData: rowItem || {},
              meetingId: rowItem?.meetingId || rowItem?.id || rowItem?._id,
              title: componentInfo.title,
              dataDetail: rowItem || {},
              type: componentInfo?.defaultProps?.type || "participants",
              id: rowItem?._id || rowItem?.id,
              vehicleRegistrationId: rowItem?.vehicleRegistrationId || rowItem?._id || rowItem?.id,
              isNotEdit: rowItem?.isNotEdit || true,
              passportRequestId: rowItem?.passportRequestId || rowItem?._id || rowItem?.id,
              workItem: rowItem?.workItem || {},
              availableActions: rowItem?.availableActions || [],
              flowConfig: rowItem?.flowConfig || {},
            });
          }
          return;
        }

        // Logic xử lý action cũ
        if (!action?.config) {
          if (action?.config?.url) {
            navigate(action.config.url);
          }
          return;
        }

        // Set trạng thái popup / form
        setSize(action.config.size);
        setPopupName(action.config.popupName);
        setCodeExport(action.config.fnCodeExport);
        setActionType(action.config.actionType);
        setDisplayType(action.config.displayType);

        if (action.config.multiForms) {
          dispatch(setMultiDynamicForm(action.config.multiForms));
        }

        if (action.config.actionType === "delete") {
          setActivityInstanceId(
            rowItem.documentId || rowItem.activityInstanceId || rowItem.id
          );
          setDeleteApiUrl(action.config.deleteApiUrl || "");
          setDeleteTitle(action.config.deleteTitle || "");
          setOpenDialogDlt(true);
          return;
        }

        // Xử lý cho hành động export trực tiếp
        if (action.config.actionType === "export") {
          const multiForms = action.config.multiForms || [];
          if (multiForms.length > 0) {
            // Lấy thông tin chi tiết của các biểu mẫu đã chọn
            const res = await api.get(API_DYNAMIC, { 
              params: { 
                limit: 9999,
                codes: multiForms.join(',')
              } 
            });
            const allForms = res?.data?.data || [];
            const filteredForms = allForms.filter((form) =>
              multiForms.includes(form.code)
            );
            setMultiFormOptions(filteredForms);

            // Chọn sẵn biểu mẫu đầu tiên
            if (filteredForms.length > 0) {
              setSelectedFormCodes([filteredForms[0].code]);
            }

            setExportFormat("docx");
            setOpenDialogExport(true); // ← MỞ DIALOG
            setDefaultValues(rowItem);
          }
          return;
        }

        // Mở popup loading sớm
        setOpen(true);

        try {
          setLoading(true);
          if (!rowItem.activityInstanceId) {
            throw new Error("Invalid activityInstanceId");
          }

          const { data: rowDetail } = await api.get(
            `${DATA_TABLE_BPMN}/${rowItem.activityInstanceId}`
          );

          const mappedObj = Object.fromEntries(
            Object.entries(rowDetail).map(([key, val]) => [key, val.value])
          );

          setDefaultValues({
            ...mappedObj,
            activityInstanceId: rowItem.activityInstanceId,
          });

          // Gọi handleGetBtn để lấy các nút bấm
          await handleGetBtn(
            rowItem.activityInstanceId,
            rowItem,
            action.config.isExport,
            action.config.actionType === "view",
            action.config.multiForms,
            mappedObj.$fnCode
          );

          dispatch(addRecordDataTable(mappedObj));
          setActivityInstanceId(rowItem.activityInstanceId || rowItem.id);
          // dispatch(setActivityInstanceIdOfTable(rowItem.activityInstanceId));
        } catch (error) {
          logger.error("Error in handleAction:", error);
          // Có thể show toast báo lỗi ở đây
        } finally {
          setLoading(false);
        }
      },
      [navigate, handleGetBtn, dispatch, setReloadData]
    );

    const uploadDocumentFromExcel = async (
      data,
      importId,
      processInstanceId
    ) => {
      if (!data || !data.rows) return;

      const fnCode = item.props.fnCode;
      const processKey =
        fnCode === "listImportExCz" ? "danhsachqltailieucd" : "dstailieudn";
      const type = fnCode === "listImportExCz" ? "congdan" : "doanhNghiep";

      const res = await api.post(`${API_IMPORT_EXCEL}/insert-documents`, {
        processKey: processKey,
        processInstanceId: processInstanceId,
        type: type,
        rows: convertData(data.rows), // data.rows,
        importId,
      });
      toast(res.data.message || "Thêm tài liệu thành công", "success");
      return res.data;
    };

    function convertData(arr) {
      if (!Array.isArray(arr)) return [];
      return arr.map((item) => ({
        code: String(item["Mã hồ sơ"]).replace(/^'/, ""),
        documentName: item["Tên tài liệu"],
        documentDate: item["Ngày văn bản"].replace(/\//g, "-"),
        documentType: item["Loại tài liệu"].replace(/^'/, ""),
        idCard: item["Mã công dân"] || "",
        documentNumber: String(item["Số tài liệu"]),
      }));
    }

    const handleAdd = async (data, payload, dataExImport, codeAdd) => {
      let newPayload = payload;
      try {
        setIsRefreshing(true);
        setLoading(true);
        if (dataExImport && Object.keys(dataExImport).length > 0) {
          const res = await uploadDocumentFromExcel(
            dataExImport,
            dataExImport._id
          );
          const { variables, localVariables } = newPayload;
          if (res.success) {
            const importId = generateUniqueId();

            const resData = res.data.data;

            const requests = resData.map((item) => {
              const variables = {};
              const localVariables = {};

              Object.entries(item).forEach(([key, value]) => {
                variables[key] = { value: String(value), type: "String" };
                variables["codeImport"] = {
                  value: String(importId),
                  type: "String",
                };
                localVariables[key] = { value: String(value), type: "String" };
                localVariables["codeImport"] = {
                  value: String(importId),
                  type: "String",
                };
              });

              const newPayloadDetail = { variables, localVariables };

              return api.post(
                `${API_ADD_FIELD_BPMN}/start/formthemmoiimport`,
                newPayloadDetail
              );
            });

            try {
              const responses = await Promise.all(requests);
              logger.log("Kết quả tất cả:", responses);
            } catch (err) {
              logger.error("Có lỗi khi gọi API:", err);
            }

            newPayload = {
              ...newPayload,
              variables: {
                ...variables,
                // dataRow: {
                //   value: JSON.stringify({ ...res.data, message: res.message }),
                //   type: "String",
                // },
                codeImport: {
                  value: importId,
                  type: "String",
                },
              },
              localVariables: {
                ...localVariables,
                // dataRow: {
                //   value: JSON.stringify({ ...res.data, message: res.message }),
                //   type: "String",
                // },
                code: {
                  value: importId,
                  type: "String",
                },
              },
            };
          }
        }
        const { data: res } = await api.post(
          `${API_ADD_FIELD_BPMN}/start/${codeAdd || code}`,
          newPayload
        );

        if (hasFollowAssignee)
          await updateAssigneeByActivityInstanceId(res.id, user.user.user);

        // Nếu có dữ liệu từ excel, gọi hàm upload
        // await api.post(`${API_ADD_FIELD_BPMN}/start/${code}`, payload);
        toast("Thêm mới dữ liệu thành công!", "success");
        setOpen(false);
        setCode(null);

        // Fetch lại dữ liệu và cập nhật pagination
        const tableData = await fetchTableData(
          { page: 1, limit: pagination.rowsPerPage },
          item.props.fnCode,
          sort,
          userFilters
        );
        // console.log("🚀 ~ tableData:", tableData)
        if (item?.props?.featureType === "automatic") {
          dispatch(
            setPagination({
              total: tableData?.total ?? 0,
              page: tableData?.page ?? 1,
              rowsPerPage: tableData?.limit ?? 25,
              totalPages: tableData?.totalPages ?? 1,
            })
          );
        } else {
          dispatch(
            setPagination({
              total: tableData?.totalItems ?? 0,
              page: 1,
              rowsPerPage: tableData?.limit ?? pagination.rowsPerPage,
              totalPages: tableData?.totalPages ?? 1,
            })
          );
        }

        setDisplayType(null);
        setPopupName(null);
        setSize("");
        setDefaultValues({});
        dispatch(addRecordDataTable({}));

        setOutgoingBtns([]);
      } catch (error) {
        toast("Khởi tạo quy trình thất bại", "error");
      } finally {
        setLoadingExport(false);
      }
    };

    const handleUpdate = useCallback(
      async (formData) => {
        try {
          setLoading(true);

          const { activityInstanceId, ...rest } = formData;

          delete rest.status;

          const entries = await Promise.all(
            Object.entries(rest).map(async ([k, v]) => {
              let value = v?.value?.value || v?.value || "";

              if (v?.type === "file" && v.value instanceof File) {
                const formDataFile = new FormData();
                formDataFile.append("file", v.value);

                const uploadRes = await api.post(
                  API_UPLOAD_FILE,
                  formDataFile,
                  {
                    headers: { "Content-Type": "multipart/form-data" },
                  }
                );

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
          setIsRefreshing(true);
          setReloadTable((pre) => pre + 1);
          setOpen(false);
        } catch (err) {
          // eslint-disable-next-line no-console
          logger.error("Update error:", err);
        } finally {
          setLoading(false);
        }
      },
      [fetchTableData]
    );
    const handleOpenAdvancedSearch = () => {
      // No-op here: advanced search is handled inside `CustomTableBorder`.
      // Kept for API compatibility (passed as `onAdvancedSearch`).
      return;
    };

    const handleSubmitPopup = useCallback(
      async (data) => {
        // const valid = await formRef.current.validate();
        if (isSignBtn) {
          const errors = await formRef.current.getErrors();
          const hasError = Object.keys(errors).length > 0;
          if (hasError) return;
        }
        const { activityInstanceId, ...rest } = defaultValues;
        try {
          let activityId = activityInstanceId;
          const rawData = rest;

          delete rawData.status;
          delete data.status;

          const variables1 = Object.fromEntries(
            Object.entries(rawData).map(([k, v]) => [k, { value: v }])
          );

          const variables2 = Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, { value: v.value }])
          );

          if (flow?.conditionVariable) {
            variables1[flow.conditionVariable] = {
              value: flow.conditionValue,
            };
          }
          const fileUrl = Object.values(data)[0].value.file;
          if (!fileUrl) {
            const endpoint = `${API_BPMN}/process/${activityId}/submit-form`;

            await api.post(endpoint, { variables: variables1 });
            await api.post(endpoint, { variables: variables2 });

            toast("Lưu thành công", "success");
          }
          if (hasFollowAssignee && variables2?.$assignee?.value)
            await updateAssigneeByActivityInstanceId(
              activityId,
              variables2.$assignee?.value
            );

          setCodePopup(null);
          setOpen(false);
          setReloadTable((pre) => pre + 1);
        } catch (err) {
          // eslint-disable-next-line no-console
          logger.error("❌ handleSubmitForm error:", err);
        }
      },
      [activityInstanceId, fetchTableData, flow, hasFollowAssignee]
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

        if (!fileUrl) {
          toast("Không tìm thấy file template để xuất", "error");
          return;
        }

        try {
          setLoadingExport(true);

          const sourceData = item && Object.keys(item).length > 0 ? item : defaultValues;
          const isIncomming = sourceData?.isIncomming === true;
          const typeDocument = isIncomming ? "IncommingDocument" : "OutGoingDocument";
          const documentId =
            sourceData?.documentId ||
            sourceData?._id ||
            sourceData?.id ||
            item?.documentId ||
            item?._id ||
            item?.id;

          if (!documentId) {
            toast("Không tìm thấy documentId để xuất file", "error");
            return;
          }
          const isAuthority = sourceData?.isAuthority;
          const params =
            typeof isAuthority === "boolean"
              ? { isAuthority }
              : undefined;
          const { data: bodyData } = await api.post(API_EXPORT_BODY, {
            documentId,
            typeDocument,
          }, { params });

          const backendHost = new URL(APP_BASE).origin;
          const correctedFileUrl = fileUrl.replace(
            /http:\/\/localhost(:\d+)?/,
            backendHost
          );
          const authenticatedFileUrl = correctedFileUrl;

          if (exportFormat === "excel") {
            const response = await api.post(
              `${API_EXPORT_TEMPLATE_URL_EXCEL}?excelUrl=${encodeURIComponent(authenticatedFileUrl)}&resultType=${exportFormat}`,

              bodyData,
              {
                headers: { "Content-Type": "application/json" },
                responseType: "blob",
              }
            );

            const blob = new Blob([response.data], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${data.name || "Biểu mẫu"}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast("Xuất biểu mẫu Excel thành công", "success");
            return;
          }

          if (exportFormat === "docx" || exportFormat === "pdf" || exportFormat === "doc") {
            const response = await api.post(
              `${API_EXPORT_TEMPLATE_URL_WORD}?docUrl=${encodeURIComponent(authenticatedFileUrl)}&resultType=${exportFormat}`,

              bodyData,
              {
                headers: { "Content-Type": "application/json" },
                responseType: "blob",
              }
            );

            const blob = new Blob([response.data], {
              type: exportFormat === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${data.name || "Biểu mẫu"}.${exportFormat}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast(`Xuất biểu mẫu ${exportFormat.toUpperCase()} thành công`, "success");
            return;
          }
        } catch (error) {
          logger.error("Error exporting file:", error);

          if (error?.response?.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const errorData = JSON.parse(reader.result);
                toast(errorData?.message || "Xuất biểu mẫu thất bại!", "error");
              } catch (e) {
                toast("Xuất biểu mẫu thất bại!", "error");
              }
            };
            reader.readAsText(error.response.data);
          } else {
            toast(error.response?.data?.message || "Xuất biểu mẫu thất bại!", "error");
          }
        } finally {
          setLoadingExport(false);
        }
      },
      [defaultValues, exportFormat]
    );

    const handleCloseDrawer = useCallback(() => {
      setOpen(false);
      setCode(null);
      setCodePopup(null);
      setOutgoingBtns([]);
      setOpenDialogExport(false);
      setCodeExport(null);
      setDefaultValues({});
      setSpecificComponent(null);
      setSpecificComponentProps({});
      dispatch(addRecordDataTable({}));
      setActivityInstanceId(null);
      setActiveTab(0);
    }, []);

    useEffect(() => {
      // Nếu pathname thay đổi, reset lại pagination về trang 1 và đóng các drawer/dialog đang mở
      if (previousPathname.current !== location.pathname) {
        dispatch(setPagination({ ...pagination, page: 1 }));
        handleCloseDrawer();
        setSpecificTableComponent(null);
        setSpecificTableComponentProps({});
        previousPathname.current = location.pathname;
      }
    }, [location.pathname, dispatch, pagination, handleCloseDrawer]);

    const handleDelete = async () => {
      try {
        let res = null;
        if (deleteApiUrl) {
          // Gọi API xóa với _id trên URL
          res = await callApi("delete", deleteApiUrl, null, {
            data: { ids: [activityInstanceId] },
          });
        } else {
          // Quay lại logic xóa mặc định nếu không có URL API được cấu hình.
          res = await callApi("delete", `${DATA_TABLE_BPMN}/${activityInstanceId}`);
        }

        const { success, message, deletedCount, failedCount, failedItems } = res || {};
        const failed = Number(failedCount || 0);
        const deleted = Number(deletedCount || 0);
        const displayMessage = message || "Xóa đơn vị gửi thất bại";

        if (failed > 0 || success === false) {
          const summary = failed > 0
            ? `${displayMessage} (${deleted} thành công, ${failed} thất bại)`
            : displayMessage;
          toast(summary, failed > 0 && deleted > 0 ? "warning" : "error");

          if (Array.isArray(failedItems) && failedItems.length > 0) {
            const failedReasons = failedItems
              .map((item) => item.reason)
              .filter(Boolean)
              .join("\n");
            if (failedReasons) {
              // Removed console.log for ESLint compliance
            }
          }
        } else {
          toast(displayMessage || "Xóa thành công", "success");
        }

        setIsRefreshing(true);
        setReloadTable((pre) => pre + 1);
        setOpenDialogDlt(false);
        setDeleteApiUrl(""); // Đặt lại URL sau khi xóa
      } catch (error) {
        logger.log(error);
        const errorData = error?.response?.data || {};
        const failed = Number(errorData.failedCount || 0);
        const deleted = Number(errorData.deletedCount || 0);
        const failedReasons = Array.isArray(errorData.failedItems)
          ? errorData.failedItems.map((item) => item.reason).filter(Boolean)
          : [];
        const failedReasonText = failedReasons.length > 0 ? `Chi tiết: ${failedReasons.join(" | ")}` : "";
        const errorMessage = `${errorData.message || "Xóa thất bại"}${failedReasonText}`;

        if (failed > 0) {
          const summary = deleted > 0
            ? `${errorMessage} (${deleted} thành công, ${failed} thất bại)`
            : errorMessage;
          toast(summary, deleted > 0 ? "warning" : "error");

          if (failedReasons.length > 0) {
            // Removed console.log for ESLint compliance
          }
        } else {
          toast(errorMessage, "error");
        }
      }
    };

    const handleDeleteMulti = async () => {
      try {
        let res = null;
        const effectiveMultiDeleteApiUrl = overrideTableProps?.multiDeleteApiUrl || item?.props?.multiDeleteApiUrl;
        const apiUrlBase = item?.props?.apiUrl;
        if (effectiveMultiDeleteApiUrl) {
          // Gọi API xóa nhiều với mảng ID trong body theo định dạng { "ids": [...] }
          res = await callApi("delete", effectiveMultiDeleteApiUrl, null, {
            data: { ids: selectedIds },
          });
        } else if (apiUrlBase) {
          // Auto-derive từ apiUrl: POST {apiUrl}/delete-multiple
          res = await callApi("post", `${APP_DHVB_BASE}${apiUrlBase}/delete-multiple`, { ids: selectedIds });
        } else {
          // Quay lại logic xóa nhiều mặc định nếu không có URL API được cấu hình.
          res = await callApi(
            "delete",
            `${DATA_TABLE_BPMN}/process-instance/multiple`,
            { processInstanceIds: selectedIds }
          );
        }
        dispatch(getSideBarMenu());
        const { message, deletedCount, failedCount, failedItems } = res || {};
        const totalDeleted = Number(deletedCount || 0);
        const totalFailed = Number(failedCount || 0);

        if (totalFailed > 0) {
          const summary = `${message || "Xóa đơn vị gửi có vấn đề"} (${totalDeleted} thành công, ${totalFailed} thất bại)`;
          toast(summary, "warning");

          if (Array.isArray(failedItems) && failedItems.length > 0) {
            const failedReasons = failedItems
              .map((item) => item.reason)
              .filter(Boolean)
              .join("\n");
            if (failedReasons) {
              // Removed console.log for ESLint compliance
            }
          }
        } else {
          toast(message || "Xóa thành công", "success");
        }

        setIsRefreshing(true);
        setReloadTable((pre) => pre + 1);
        setOpenDialogDltMulti(false);
      } catch (error) {
        // eslint-disable-next-line no-console
        logger.log(error);
        const errorData = error?.response?.data || {};
        const failed = Number(errorData.failedCount || 0);
        const deleted = Number(errorData.deletedCount || 0);
        const failedReasons = Array.isArray(errorData.failedItems)
          ? errorData.failedItems.map((item) => item.reason).filter(Boolean)
          : [];
        const failedReasonText = failedReasons.length > 0 ? `: ${failedReasons.join(" | ")}` : "";
        const errorMessage = `${errorData.message || "Xóa thất bại"}${failedReasonText}`;
        const isWarning = errorData?.isWarning === true;

        if (failed > 0) {
          const summary = deleted > 0
            ? `${errorMessage} (${deleted} thành công, ${failed} thất bại)`
            : errorMessage;
          toast(summary, deleted > 0 ? "warning" : "error");

          if (failedReasons.length > 0) {
            // Removed console.log for ESLint compliance
          }
        } else if (isWarning) {
          toast(errorMessage, "warning");
        } else {
          toast(errorMessage, "error");
        }
      }
    };
    const handleOpenDeleteMulti = () => {
      setOpenDialogDltMulti(true);
    };

    const handleTabChange = async (fnCode) => {
      dispatch(setCodeGlobal(fnCode));
      // Không set loading ở đây — useEffect (fetchApi) sẽ quản lý loading tập trung.
      // Việc set loading(true) tại đây gây ra skeleton nhấp nháy 2 lần khi chuyển tab.
    };

    const handleTabChangeProperties = (data) => {
      setTableType(data);
    };

    const handleActionPopup = useCallback(
      (config) => {
        if (config.action === 'reset_view') {
          setSpecificTableComponent(null);
          setSpecificTableComponentProps({});
          setGlobalTableState({ hideSearch: false });
          return;
        }
        // console.log("handleActionPopup called with config:", config); // Debug 1: Kiểm tra xem hàm có được gọi không
        // Xử lý cho component tĩnh từ componentRegistry
        if (config.componentKey) {
          // console.log("Config has componentKey:", config.componentKey); // Debug 2: Kiểm tra componentKey
          let componentInfo;
          if (config.displayType === 'table') {
            componentInfo = getTableComponentByKey(config.componentKey);
          } else {
            componentInfo = getComponentByKey(config.componentKey);
          }
          // console.log("Component Info from registry:", componentInfo); // Debug 3: Kiểm tra thông tin component từ registry
          if (componentInfo) {
            if (config.displayType === 'table') {
              setSpecificTableComponent(() => componentInfo.component);
              setGlobalTableState(componentInfo.defaultProps || { hideSearch: false });
              const toolbarActions = getAllActions(formConfig);
              setSpecificTableComponentProps({
                ...(componentInfo.defaultProps || {}),
                setReloadData: setReloadTable,
                dialogKey: componentInfo.dialogKey,
                allowSignDigital: config?.allowSignDigital || false,
                events: dataTable,
                fnCode: item.props.fnCode, // Truyền fnCode xuống component con
                title: componentInfo.title,
                ishandlermeeting: defaultValues?.ishandlermeeting || false,
                isparticipant: defaultValues?.isparticipant || false,
                listparammeeting: defaultValues?.listparammeeting || "",
                dataDetail: defaultValues || {},
                documentId: defaultValues?.documentId || defaultValues?._id || defaultValues?.id,
                archiveId: defaultValues?.archiveId || defaultValues?._id || defaultValues?.id,
                newsId: defaultValues?.newsId || defaultValues?._id || defaultValues?.id,
                docIds: defaultValues?.documentId || defaultValues?._id || defaultValues?.id, // Thêm cho RecallIncomingTextDialog
                isAuthority: defaultValues?.isAuthority || false,
                bpmnVersion: defaultValues?.bpmn_version || false,
                bookDocumentId: defaultValues?.bookDocumentId,
                documentData: defaultValues || {},
                type: componentInfo?.defaultProps?.type || "participants",
                toolbarActions: toolbarActions,
                meetingId: defaultValues?.meetingId || defaultValues?.id || defaultValues?._id,
                vehicleRegistrationId: defaultValues?.vehicleRegistrationId || defaultValues?._id || defaultValues?.id,
                handleAction: handleAction,
                isNotEdit: defaultValues?.isNotEdit || true,
                workItem: defaultValues || {},
                availableActions: defaultValues?.availableActions || [],
                flowConfig: defaultValues?.flowConfig || {},
              });

              return;
            }
            // Đảm bảo các state này được cập nhật đúng
            setSpecificComponent(() => componentInfo.component);
            setPopupName(config.popupName || componentInfo.title);
            setDisplayType(config.displayType || "swiper");
            setSize(config.size || "md");
            setActionType(
              config.actionType || componentInfo.dialogKey || "add"
            );
            setDefaultValues({});
            setOpen(true); // <--- Đảm bảo state này được set thành TRUE
            setSpecificComponentProps({
              ...(componentInfo.defaultProps || {}),
              setReloadData: setReloadTable,
              dialogKey: componentInfo.dialogKey,
              allowSignDigital: config?.allowSignDigital || false,
              title: componentInfo.title,
              ishandlermeeting: defaultValues?.ishandlermeeting || false,
              isparticipant: defaultValues?.isparticipant || false,
              listparammeeting: defaultValues?.listparammeeting || "",
              dataDetail: defaultValues || {},
              type: componentInfo?.defaultProps?.type || "participants",
            });
            // console.log("State updated for specific component. open:", true, "SpecificComponent:", componentInfo.component.name, "popupName:", config.popupName || componentInfo.title); // Debug 4: Kiểm tra trạng thái sau khi cập nhật
          } else {
            logger.error(
              "Component not found in registry for key:",
              config.componentKey
            ); // Debug: Nếu componentKey không tìm thấy
          }
        }
        // Xử lý cho form động như cũ
        else if (config.code) {
          setCode(config.code);
          setDisplayType(config.displayType);
          setPopupName(config.name);
          setOpen(true);
          setActionType("add");
          setSize(config.size);
        }
      },
      [dispatch, setReloadData]
    );
    // Thêm dispatch vào dependencies của useCallback

    //  const handleActionPopup = (data) => {
    //   setCode(data.code);
    //   setDisplayType(data.displayType);
    //   setPopupName(data.name);
    //   setOpen(true);
    //   setActionType("add");
    //   setSize(data.size);
    //   // dispatch(setActivityInstanceIdOfTable(""));
    // };

    const handleExportTableData = async (config) => {
      if (loadingExport) return;
      const exportType = config?.exportType || "excel";
      const customExportApi = config?.exportApi || item?.props?.exportApi;
      try {
        setLoadingExport(true);
        logger.log('handleExportTableData', item, pagination, userFilters);
        const effectiveProcessFn = userFilters.processFn || item.props.fnCode;
        const exportFilters = { ...userFilters };
        delete exportFilters.type;
        delete exportFilters.processFn;

        const queryParams = {
          page: pagination.page,
          limit: pagination.rowsPerPage,
          processFn: effectiveProcessFn,
          exportType: exportType,
        };

        // Trích xuất các tham số hiện có từ apiUrl (templateApiUrl) để gộp vào queryParams
        if (item?.props?.featureType === "automatic" && typeof templateApiUrl === "string") {
          const urlToSplit = templateApiUrl || "";
          const [, searchStr] = urlToSplit.split('?');
          if (searchStr) {
            const existingParams = new URLSearchParams(searchStr);
            existingParams.forEach((val, key) => {
              if (queryParams[key] === undefined) {
                queryParams[key] = val;
              }
            });
          }
        }

        const exportUrl = customExportApi ? customExportApi : `${DATA_TABLE_BPMN}`;

        const res = await api.get(
          exportUrl,
          {
            params: {
              ...queryParams,
              ...(Object.keys(exportFilters).length ? { userFilters: exportFilters } : {}),
            },
            responseType: "blob",
            timeout: 60000,
          }
        );

        const blob = new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        const fileExtension = exportType === "excel" ? "xlsx" : exportType;
        const fileName = config?.name || item.props.fnCode || "export";
        link.setAttribute("download", `${fileName}.${fileExtension}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);
      } catch (error) {
        // eslint-disable-next-line no-console
        logger.log("🚀 ~ handleExportTableData hihi ~ error:", error);
        if (error?.response?.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorData = JSON.parse(reader.result);
              const errMsg = errorData?.errors?.[0] || errorData?.message || "Xuất dữ liệu thất bại";
              const severity = errorData?.isWarning ? "warning" : "error";
              toast(errMsg, severity);
            } catch (e) {
              toast("Xuất dữ liệu thất bại", "error");
            }
          };
          reader.readAsText(error.response.data);
        } else {
          toast("Xuất dữ liệu thất bại", "error");
        }
      } finally {
        setLoadingExport(false);
      }
    };

    const handleSort = async (sort) => {
      setSort(sort);
      // useEffect sẽ tự động gọi lại khi sort thay đổi
    };

    const handlePageChange = async (pa) => {
      dispatch(
        setPagination({
          ...pagination,
          page: Number(pa.page),
          rowsPerPage: pa.rowsPerPage,
        })
      );
      // useEffect sẽ tự động gọi lại khi pagination (page/rowsPerPage) thay đổi nếu ta thêm vào dependency
    };

    useEffect(() => {
      if (reloadData != null) {
        setReloadTable((prev) => prev + 1);
      }
    }, [reloadData]);

    const prevDepsRef = useRef({
      fnCode: item.props.fnCode,
      reloadTable,
      sort,
      tableType,
    });

    useEffect(() => {
      // Lưu lại trạng thái cũ từ ref trước khi so sánh/cập nhật
      const prevTableType = prevDepsRef.current.tableType;
      const prevFnCode = prevDepsRef.current.fnCode;
      const prevReloadTable = prevDepsRef.current.reloadTable;
      const prevUserFilters = prevDepsRef.current.userFilters;
      const prevSort = prevDepsRef.current.sort;
      const prevPage = prevDepsRef.current.paginationPage;
      const prevRowsPerPage = prevDepsRef.current.paginationRowsPerPage;

      // Xác định xem nguyên nhân thay đổi là gì
      const isReloadTableChanged = prevReloadTable !== reloadTable;
      const isFiltersChanged = prevUserFilters !== userFilters;
      const isSortChanged = prevSort !== sort;
      const isFnCodeChanged = prevFnCode !== item.props.fnCode;
      const isTableTypeChanged = prevTableType !== tableType;
      const isPaginationChanged = prevPage !== pagination.page ||
        prevRowsPerPage !== pagination.rowsPerPage;

      // Kiểm tra xem pagination mới có trùng khớp với dữ liệu vừa fetch từ server không
      // Nếu trùng -> Đây là update nội bộ sau khi fetch -> Không được gọi API lần nữa.
      const isPaginationInternalUpdate = isPaginationChanged &&
        pagination.page === lastResultPaginationRef.current.page &&
        pagination.rowsPerPage === lastResultPaginationRef.current.rowsPerPage;

      const isKanbanTransition = isTableTypeChanged && (tableType === 'kanban' || prevTableType === 'kanban');

      // Cập nhật ref cho render tiếp theo
      prevDepsRef.current = {
        fnCode: item.props.fnCode,
        reloadTable,
        sort,
        userFilters,
        paginationPage: pagination.page,
        paginationRowsPerPage: pagination.rowsPerPage,
        tableType,
      };

      // QUYẾT ĐỊNH FETCH:
      // Luôn fetch nếu Reload, Filter, Sort hoặc FnCode thay đổi.
      // Chỉ fetch do Pagination nếu đó là user tương tác (không phải internal update).
      const shouldFetch = isReloadTableChanged || isFiltersChanged || isSortChanged || isFnCodeChanged ||
        isKanbanTransition ||
        (isPaginationChanged && !isPaginationInternalUpdate);

      if (!shouldFetch) return;

      const changes = [];
      if (prevFnCode !== item.props.fnCode) {
        changes.push(`fnCode: ${prevFnCode} -> ${item.props.fnCode}`);
        // setSpecificTableComponent(null);
        // setSpecificTableComponentProps({});
      }
      if (prevReloadTable !== reloadTable) changes.push(`reloadTable: ${prevReloadTable} -> ${reloadTable}`);
      if (prevSort !== sort) changes.push('sort');
      if (prevUserFilters !== userFilters) changes.push('userFilters');
      if (prevPage !== pagination.page) changes.push(`pagination.page: ${prevPage} -> ${pagination.page}`);
      if (prevRowsPerPage !== pagination.rowsPerPage) changes.push(`pagination.rowsPerPage: ${prevRowsPerPage} -> ${pagination.rowsPerPage}`);


      // const sourceColumns = data?.field || dataFields || dataColumn || [];
      // const calendarKeys = sourceColumns?.filter(c => c.showFilterCalendar).map(c => c.key || c.name) || [];

      // const { type, } = userFilters || {};

      // const effectiveType = type || (calendarKeys.length > 0 ? calendarKeys[0] : null);

      // guard clause bị comment theo yêu cầu debug của user
      // if (effectiveType && calendarKeys.includes(effectiveType)) {
      //   setIsRefreshing(false);
      //   return;
      // }

      let isCancelled = false;
      const controller = new AbortController(); // Tạo AbortController mới cho mỗi lần effect chạy

      const fetchApi = async () => {
        // Nếu userFilters vừa thay đổi, luôn dùng page=1
        const effectivePage = isFiltersChanged ? 1 : pagination.page;

        setLoading(true);
        try {
          const tableData = await fetchTableData(
            { page: effectivePage, limit: pagination.rowsPerPage },
            item.props.fnCode,
            sort,
            userFilters,
            controller.signal
          );

          // check call chặn call
          if (isCancelled || controller.signal.aborted) return;

          if (tableData) {
            // Lưu lại thông tin pagination từ server để đối soát trong render tiếp theo
            lastResultPaginationRef.current = {
              page: Number(tableData?.page ?? tableData?.currentPage ?? effectivePage),
              rowsPerPage: tableData?.limit ?? tableData?.rowsPerPage ?? pagination.rowsPerPage,
            };

            if (item?.props?.featureType === "automatic") {
              dispatch(
                setPagination({
                  total: tableData?.total ?? 0,
                  page: Number(tableData?.page ?? 1),
                  rowsPerPage: tableData?.limit ?? 25,
                  totalPages: tableData?.totalPages ?? 1,
                })
              );
            } else {
              dispatch(
                setPagination({
                  total: tableData?.totalItems ?? 0,
                  page: Number(effectivePage),
                  rowsPerPage: tableData?.limit ?? pagination.rowsPerPage,
                  totalPages: tableData?.totalPages ?? 1,
                })
              );
            }
          }
        } catch (error) {
          if (isCancelled || controller.signal.aborted) return;
          logger.log("🚀 ~ fetchApi ~ error:", error);
        } finally {
          if (!isCancelled && !controller.signal.aborted) {
            setIsRefreshing(false);
            setLoading(false);
          }
        }
      };

      if (item.props.fnCode || item.props.featureType === "automatic") {
        // Nếu đang trong quá trình switching tab config, dạt sang một bên
        // handleSearch sẽ trigger re-run sau khi config đã xong.
        if (!isSwitchingTabRef.current) {
          fetchApi();
        }
      } else {
        setDataTable([]);
        setLoading(false);
        setIsRefreshing(false);
      }

      return () => {
        isCancelled = true;
        controller.abort(); // Cancel request cũ khi effect chạy lại hoặc unmount
      };
    }, [
      reloadTable,
      item.props.fnCode,
      item.props.featureType,
      sort,
      userFilters,
      pagination.page,
      pagination.rowsPerPage,
      location.search,
      tableType,
    ]);

    useImperativeHandle(ref, () => ({
      handleSearch,
      selectedIds,
      handleOpenDeleteMulti,
      handleTabChange,
      handleTabChangeProperties,
      handleActionPopup,
      handleExportTableData,
      handleOpenAdvancedSearch,
      handleToggleColumn,
      handlePageChange,
      handleToggleAllColumns, // Thêm dòng này
      columns,
      onColumnToggle,
      handleSetColumnConfig, // ← THÊM DÒNG NÀY
    }));
    const effectiveDisplayType = useMemo(() => {
      // Thêm console.log để theo dõi giá trị

      const d = String(displayType || "swiper")
        .toLowerCase()
        .trim();
      return d === "swipper" ? "swiper" : d;
    }, [displayType]);

    const displayActions = useMemo(
      () => ({
        view: outgoingBtns,
        update: [
          {
            label: "Cập nhật",
            onClick: () => formRef.current?.submitForm(),
          },
        ],
        add: [
          {
            label: "Thêm mới",
            onClick: () => {
              // console.log("Nút 'Thêm mới' trong swiper/popup được click, gọi submitForm");
              formRef.current?.submitForm();
            },
          },
        ],
      }),
      [outgoingBtns]
    );
    // console.log("effectiveDisplayType:", effectiveDisplayType); // Debug: Kiểm tra giá trị của effectiveDisplayType
    // console.log("displayActions:", displayActions); // Debug: Kiểm tra giá trị của displayActions

    const Display = useMemo(
      () => (effectiveDisplayType === "swiper" ? CustomDrawer : CustomPopup),
      [effectiveDisplayType]
    );

    const RenderForm = useCallback(() => {
      if (!code) return null;

      return (
        <RegistryProvider registry={defaultRegistry}>
          <Form
            styles={{
              overflow: effectiveDisplayType === "swiper" ? "auto" : "unset",
              height: effectiveDisplayType === "swiper" ? "87.5vh" : "100%",
            }}
            code={code}
            defaultValues={defaultValues}
            onData={{ update: handleUpdate, add: handleAdd }[actionType]}
            isViewOnly={actionType === "view"}
            ref={formRef}
            type="form"
          />
        </RegistryProvider>
      );
    }, [
      code,
      defaultValues,
      actionType,
      effectiveDisplayType,
      // handleUpdate,
      // handleAdd,
    ]);

    // const RenderPopup = useCallback(() => {
    //   if (!codePopup) return null;

    //   return (
    //     <RegistryProviderPopup registry={defaultRegistryPopup}>
    //       <Popup
    //         open={codePopup}
    //         code={codePopup}
    //         onData={handleSubmitPopup}
    //         onClose={() => setCodePopup(null)}
    //         title={namePopup}
    //       />
    //     </RegistryProviderPopup>
    //   );
    // }, [
    //   codePopup,
    //   namePopup,
    //   // handleSubmitPopup,
    // ]);

    const handleSelect = useCallback(
      (ids, rows) => {
        onSelectedIds?.(ids, rows); // optional chaining an toàn
        handleSelectRows(ids, rows); // đảm bảo handleSelectRows không gọi setState trực tiếp trong render
      },
      [onSelectedIds, handleSelectRows]
    );

    const handleOnSuccess = useCallback(() => {
      setIsRefreshing(true);
      setReloadTable((prev) => prev + 1);
      handleCloseDrawer();
    }, [handleCloseDrawer]);

    const handleOnChangeTab = useCallback((newValue) => {
      setActiveTab(newValue);
    }, []);

    const handleOnClose = useCallback(() => {
      setCodePopup(null);
    }, []);

    const handleOnSave = useCallback(() => {
      popupformRef.current?.submitForm();
    }, []);

    const handleCloseExportRef = useCallback(() => {
      setOpenDialogExport(false);
    }, []);

    const handleOnSaveExportRef = useCallback(async () => {
      // Lặp qua các biểu mẫu đã chọn và xuất file cho từng cái
      const formsToExport = multiFormOptions.filter((form) =>
        selectedFormCodes.includes(form.code)
      );

      for (const form of formsToExport) {
        await handleExport(form, null, defaultValues);
      }

      setOpenDialogExport(false); // Đóng dialog sau khi xuất
    }, [multiFormOptions, selectedFormCodes, defaultValues, handleExport]);

    const handleFormSelectionChange = useCallback((event) => {
      const code = event.target.value;
      setSelectedFormCodes([code]);
      const form = multiFormOptions.find(f => f.code === code);
      if (form && form.fileName) {
        const lowerName = form.fileName.toLowerCase();
        if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
          setExportFormat('excel');
        } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
          setExportFormat(prev => (prev === 'docx' || prev === 'pdf' ? prev : 'pdf'));
        }
      }
    }, [multiFormOptions]);

    const handleExportFormatChange = useCallback((event) => {
      const format = event.target.value;
      setExportFormat(format);
      if (format === 'excel') {
        const excelForm = multiFormOptions.find(f => f.fileName && (f.fileName.toLowerCase().endsWith('.xlsx') || f.fileName.toLowerCase().endsWith('.xls')));
        if (excelForm) setSelectedFormCodes([excelForm.code]);
      } else if (format === 'docx' || format === 'pdf') {
        const docForm = multiFormOptions.find(f => f.fileName && (f.fileName.toLowerCase().endsWith('.docx') || f.fileName.toLowerCase().endsWith('.doc')));
        if (docForm) setSelectedFormCodes([docForm.code]);
      }
    }, [multiFormOptions]);

    const handleCloseBPMNViewer = useCallback(() => {
      setOpenBpmnDiagramViewer(false);
    }, []);

    const handleCloseDialogDlt = useCallback(() => {
      setOpenDialogDlt(false);
      setDeleteApiUrl(""); // Đặt lại URL khi đóng dialog
      setDeleteTitle(""); // Đặt lại deleteTitle khi đóng dialog
    }, []);
    const handleCloseDialogDltMulti = useCallback(() => {
      setOpenDialogDltMulti(false);
    }, []);

    const handleRemoveFromSelection = useCallback((id) => {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setSelectedRowsData((prev) => prev.filter((row) => (row.documentId || row._id || row.id || row.activityInstanceId) !== id));
    }, []);

    const handleRemoveClick = useCallback((rowId) => {
      return () => {
        handleRemoveFromSelection(rowId);
      };
    }, [handleRemoveFromSelection]);


    const handleToggleColumn = useCallback((columnKey) => {
      setColumns((prevColumns) => {
        const visibleColumnsCount = prevColumns.filter((c) => c.isShow).length;
        const targetColumn = prevColumns.find((c) => c.key === columnKey);

        if (visibleColumnsCount <= 1 && targetColumn?.isShow) {
          return prevColumns;
        }

        return prevColumns.map((c) =>
          c.key === columnKey ? { ...c, isShow: !(c.isShow ?? true) } : c
        );
      });
    }, []);
    const handleToggleAllColumns = useCallback((checked) => {
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({ ...col, isShow: checked }))
      );
    }, []);
    const handleSetColumnConfig = useCallback((newColumns) => {
      setColumns(newColumns);
    }, []);

    const onColumnToggle = useCallback((columnKey) => {
      setColumns((prevColumns) => {
        const visibleColumnsCount = prevColumns.filter((c) => c.isShow).length;
        const targetColumn = prevColumns.find((c) => c.key === columnKey);
        if (visibleColumnsCount <= 1 && targetColumn?.isShow) {
          return prevColumns;
        }
        return prevColumns.map((c) =>
          c.key === columnKey ? { ...c, isShow: !c.isShow } : c
        );
      });
    }, []);


    const queryParams = useMemo(() => {
      const params = {};

      if (userFilters && Object.keys(userFilters).length > 0) {
        const { type, ...restFilters } = userFilters;
        const calendarKeys =
          dataColumn
            ?.filter((c) => c.showFilterCalendar)
            .map((c) => c.key || c.name) || [];

        const effectiveType = type || (calendarKeys.length > 0 ? calendarKeys[0] : null);

        if (effectiveType && calendarKeys.includes(effectiveType)) {
          params.substate = effectiveType;
        }

        if (Object.keys(restFilters).length > 0) {
          params.filter = restFilters;
        }
      }

      if (
        item?.props?.isAuthorized === true &&
        item?.props?.authorizedFunction
      ) {
        params.processFn = item?.props?.authorizedFunction;
      } else {
        params.processFn = item?.props?.fnCode;
      }
      if (
        item?.props?.isInheritSubTab === true &&
        item?.props?.inheritSubTabFunction
      ) {
        params.processFn = item?.props?.inheritSubTabFunction;
      } else {
        params.processFn = item?.props?.fnCode;
      }
      return params;
    }, [dataColumn, userFilters, item?.props]);

    const paramsChild = useMemo(() => {
      const p = {};
      if (userFilters && Object.keys(userFilters).length > 0) {
        const restFilters = { ...userFilters };
        delete restFilters.type;
        delete restFilters.processFn;

        Object.entries(restFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            p[`filter[${key}]`] = value;
          }
        });
      }
      return p;
    }, [userFilters]);

    const customComponentKey =
      item?.props?.customComponent || data?.customComponent;
    const customCfg = COMPONENT_OPTIONS?.[customComponentKey];


    return (
      <>
        {customCfg && customCfg.component ? (
          <Suspense fallback={<RouteLoading />}>
            {(() => {
              const SelectedCustom = customCfg.component;
              return (
                <SelectedCustom
                  {...(customCfg.defaultProps || {})}
                  data={data}
                  item={item}
                  isHideTitle={item?.props?.isHideTitle}
                  fnCode={fnCodeCusstomTable} // Truyền fnCode từ queryParams (đã xử lý logic authorizedFunction)
                />
              );
            })()}
          </Suspense>
        ) : specificTableComponent ? (
          <SpecificComponentWrapper hasSubmenu={hasSubmenu || specificTableComponentProps?.hasSubmenu} globalState={globalState}>
            <Suspense fallback={<RouteLoading />}>
              {(() => {
                const Comp = specificTableComponent;
                return <Comp
                  {...specificTableComponent}
                  {...specificTableComponentProps}
                  queryParams={queryParams}
                  templateApiUrl={templateApiUrl}
                  reloadData={reloadTable}
                />;
              })()}
            </Suspense>
          </SpecificComponentWrapper>
        ) : (
          <TableComponent
            dataColumn={dataColumn}
            expandTree={expandTree}
            data={dataTableCheck}
            showIndexColumn={false}
            showCheckboxColumn
            // onSelect={(ids) => {
            //   onSelectedIds && onSelectedIds(ids);
            //   handleSelectRows(ids);
            // }}
            apiUrl={data?.apiUrl}
            apiUrlChildren={data?.apiUrlChildren}
            paramsChild={paramsChild}
            paramChildren={paramsChild}
            reload={reloadTable}
            onSelect={handleSelect}
            defaultValues={selectedIds}
            mode={mode}
            item={item}
            onPropChange={onPropChange}
            onAction={handleAction}
            processId={overrideTableProps?.processId || item?.props?.processId || data?.idList}
            handleSetColumnConfig={handleSetColumnConfig}
            fields={dataColumn}
            columns={dataColumn}
            onToggleColumn={handleToggleColumn}
            formatId="activityInstanceId"
            funcDataForm={funcDataFormMerged}
            overrideConfigs={overrideTableProps?.configs || null}
            onOrder={handleSort}
            onAdvancedSearch={handleOpenAdvancedSearch}
            onPaginationChange={handlePageChange}
            onCellClick={handleCellClick}
            pagination={pagination}
            isMobile={isMobile} // ✅ Truyền prop isMobile
            viewConfigId={currentViewConfigId}
            setReloadData={setReloadData} // ✅ Truyền hàm setReloadData xuống
            allowColumnDrag={mode !== "builder"}
            isAuthorized={item?.props?.isAuthorized}
            authorizedFunction={item?.props?.authorizedFunction}
            isInheritSubTab={item?.props?.isInheritSubTab}
            inheritSubTabFunction={item?.props?.inheritSubTabFunction}
            isHideTitle={item?.props?.isHideTitle || data?.isHideTitle}
            fnCode={item.props.fnCode}
            loading={loading}
            uiVariant={uiVariant}

          />
        )}

        {SpecificComponent === TaskDetailPanel && (
          <TaskDetailPanel
            open={open}
            onClose={handleCloseDrawer}
            dataDetail={defaultValues}
            setReloadData={setReloadTable}
            handleAction={handleAction}
            handleActionPopup={handleActionPopup}
            processFn={item?.props?.fnCode || item?.props?.authorizedFunction || defaultValues?.processFn}
          />
        )}

        {item?.props?.featureType === "automatic" && SpecificComponent && SpecificComponent !== TaskDetailPanel ? (
          <Suspense fallback={<div>Đang tải form...</div>}>
            <SpecificComponent
              open={open}
              onClose={handleCloseDrawer}
              onCloseDialog={handleCloseDrawer}
              onSuccess={handleOnSuccess}
              data={defaultValues} // Truyền dữ liệu của dòng được chọn
              {...specificComponentProps}
              handleAction={handleAction}
              handleActionPopup={handleActionPopup}
            />
          </Suspense>
        ) : (
          SpecificComponent !== TaskDetailPanel && (
            <Display
              size={size || "md"}
              open={open}
              onClose={handleCloseDrawer}
              actions={displayActions[actionType]}
              disabled={loading}
              title={popupName}
            >
              {/* {console.log("Rendering Display component. SpecificComponent:", SpecificComponent, "open:", open, "actionType:", actionType)} Debug 7: Kiểm tra điều kiện render của Display */}
              {SpecificComponent ? (
                <Suspense fallback={<div>Đang tải dữ liệu...</div>}>
                  <SpecificComponent
                    open={open}
                    onClose={handleCloseDrawer}
                    onCloseDialog={handleCloseDrawer}
                    onSuccess={handleOnSuccess}
                    data={defaultValues} // Truyền dữ liệu của dòng được chọn
                    {...specificComponentProps}
                    handleAction={handleAction}
                    handleActionPopup={handleActionPopup}
                  />
                </Suspense>
              ) : item?.props?.hasTabs && actionType === "view" ? (
                <TabsWrapper effectiveDisplayType={effectiveDisplayType}>
                  <Tabs value={activeTab} onChange={handleOnChangeTab}>
                    <Tab label="Biểu mẫu" />
                    <Tab label="Biểu đồ trạng thái văn bản" />
                    <Tab label="Lịch sử quy trình" />
                  </Tabs>
                  <TabPanel value={activeTab} index={0}>
                    <RenderForm />
                  </TabPanel>
                  <TabPanel value={activeTab} index={1}>
                    <BpmnDiagramViewer processInstanceId={activityInstanceId} />
                  </TabPanel>
                  <TabPanel value={activeTab} index={2}>
                    <ProcessHistory processInstanceId={activityInstanceId} />
                  </TabPanel>
                </TabsWrapper>
              ) : (
                <>
                  <RenderForm />
                </>
              )}
            </Display>
          )
        )}
        {/* <RenderPopup /> */}

        <CustomDialog
          size="lg"
          onClose={handleOnClose}
          onSave={handleOnSave}
          open={codePopup}
          title={namePopup}
        >
          <RegistryProvider registry={defaultRegistry}>
            <Form
              ref={popupformRef}
              code={codePopup}
              onData={handleSubmitPopup}
              type="form-popup"
            />
          </RegistryProvider>
        </CustomDialog>

        <CustomDialog
          size="sm"
          onClose={handleCloseExportRef}
          onSave={handleOnSaveExportRef}
          open={openDialogExport}
          title={"XUẤT BIỂU MẪU"}
          titleButton="In biểu mẫu"
        >
          {multiFormOptions.length > 0 ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <FormControl fullWidth>
                <InputLabel id="select-form-export-label">Biểu mẫu</InputLabel>
                <Select
                  labelId="select-form-export-label"
                  id="select-form-export"
                  value={selectedFormCodes[0] || ""}
                  label="Biểu mẫu"
                  onChange={handleFormSelectionChange}
                >
                  {multiFormOptions.map((form) => (
                    <MenuItem key={form.code} value={form.code}>
                      {form.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="select-format-export-label">
                  Định dạng file
                </InputLabel>
                <Select
                  labelId="select-format-export-label"
                  id="select-format-export"
                  value={exportFormat}
                  label="Định dạng file"
                  onChange={handleExportFormatChange}
                >
                  <MenuItem value="docx">DOCX</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="excel">EXCEL</MenuItem>
                </Select>
              </FormControl>
            </div>
          ) : codeExport ? (
            <RegistryProviderFormExport registry={defaultRegistryExport}>
              <FormExport
                ref={formExportRef}
                code={codeExport}
                defaultValues={defaultValues}
                onData={handleExport}
                isViewOnly={actionType === "view"}
              />
            </RegistryProviderFormExport>
          ) : (
            <p>Không có biểu mẫu nào được cấu hình để xuất.</p>
          )}
        </CustomDialog>

        <CustomDialog
          size="lg"
          onClose={handleCloseBPMNViewer}
          open={openBpmnDiagramViewer}
          title={"LUỒNG BIỂU ĐỒ"}
        >
          <BpmnDiagramViewer processInstanceId={activityInstanceId} />
        </CustomDialog>

        <CustomDialog
          // size=""
          onClose={handleCloseDialogDlt}
          onSave={handleDelete}
          open={openDialogDlt}
          title={"THÔNG BÁO"}
          type="delete"
        >
          {deleteTitle || item?.props?.multiDeleteTitle || "Bạn có chắc chắn muốn xóa văn bản?"}
        </CustomDialog>

        <CustomDialog
          size={isMobile ? "xs" : "sm"}
          onClose={handleCloseDialogDltMulti}
          onSave={handleDeleteMulti}
          open={openDialogDltMulti}
          title={"THÔNG BÁO"}
          type="delete"
        >
          {item?.props?.multiDeleteFields?.length > 0 ? (
            <>
              <BoxTitle>
                <Typography variant="h6">
                  {`Đồng chí có đồng ý ${item?.props?.multiDeleteTitle?.toLowerCase()} ?`}
                </Typography>
              </BoxTitle>
              <TableContainerST component={Paper} >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCellST >STT</TableCellST>
                      {item.props.multiDeleteFields.map((fieldKey) => {
                        const col = columns.find(
                          (c) => c.key === fieldKey || c.name === fieldKey
                        );
                        return (
                          <TableCellBold key={fieldKey}>
                            {col ? col.label : fieldKey}
                          </TableCellBold>
                        );
                      })}
                      <TableCellAction align="center">
                        Hành động
                      </TableCellAction>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataTable
                      .filter((row) =>
                        selectedIds.includes(
                          row.activityInstanceId || row._id || row.id || row.documentId
                        )
                      )
                      .map((row, index) => {
                        const rowId =
                          row.activityInstanceId || row._id || row.id || row.documentId;
                        return (
                          <TableRow key={rowId || index}>
                            <TableCell>{index + 1}</TableCell>
                            {item.props.multiDeleteFields.map((field) => {
                              const val = row[field];
                              const displayVal =
                                val && typeof val === "object" && "value" in val
                                  ? val.value
                                  : val;
                              return (
                                <STTableCell
                                  key={field}
                                  title={displayVal}
                                >
                                  {displayVal}
                                </STTableCell>
                              );
                            })}
                            <TableCell align="center">
                              <IconButtonST
                                size="small"
                                onClick={handleRemoveClick(rowId)}
                              >
                                <DeleteIconST />
                              </IconButtonST>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainerST>
            </>
          ) : (
            <Tooltip title="Xóa các bản ghi đã chọn">
              <span>{item?.props?.multiDeleteTitle || "Bạn có chắc chắn muốn xóa văn bản?"}</span>
            </Tooltip>
          )}
        </CustomDialog>

        <FileViewerDialog
          open={previewFile.open}
          onClose={handleClosePreview}
          fileUrl={`${previewFile.url}#toolbar=0`}
          fileName={previewFile.name}
          fileType={previewFile.type}
          title={`${previewFile.name}`}
          size="lg"
          showDownloadButton
        />

        <LoadingDialog open={isRefreshing || loadingExport}>
          <StyledDialogContent>
            {loadingExport ? "Đang xuất dữ liệu, vui lòng chờ trong giây lát..." : "Đang cập nhật danh sách, vui lòng chờ trong giây lát..."}
          </StyledDialogContent>
        </LoadingDialog>
      </>
    );
  }
);

DemoTablePage.displayName = "DemoTablePage";

DemoTablePage.propTypes = {
  data: PropTypes.object,
  mode: PropTypes.string,
  item: PropTypes.object,
  onPropChange: PropTypes.func,
  onSelectedIds: PropTypes.func,
  url: PropTypes.string,
  reloadData: PropTypes.any,
  setReloadData: PropTypes.func,
  hasSubmenu: PropTypes.bool,
  uiVariant: PropTypes.oneOf(["leadershipDutySchedule"]),
  onSearch: PropTypes.func,
  // onShowStarFilter: PropTypes.func,
};

export default DemoTablePage;
