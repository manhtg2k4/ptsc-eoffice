import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import CustomBpmnTheme from "./CustomBpmnTheme"; // Import module theme mới
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
  setExternalFormTemplates,
  setOnFormTemplatesChange,
  formDataProps,
} from "bpmn-js-properties-panel-lifetex";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import "@bpmn-io/properties-panel/assets/properties-panel.css";
import "./BpmnPalette.css"; // Import file CSS cho palette
import camundaModdleDescriptor from "camunda-bpmn-moddle/resources/camunda.json";
import { mapKey, customTranslate } from "./config";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import DynamicTablePBMN from "@components/DynamicTablePBMN";
import RadioOptions from "./RadioOptions";
import { useDispatch } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { addFieldBpmn } from "@redux/slices/BPMN/BpmnSlice";
import {
  API_ADD_FIELD_BPMN,
  API_BPMN,
  API_GET_LIST_FUNCTIONMANAGEMANT,
  MODEL_INTROSPECT,
  ROLE_FEATURE,
  taskFeature,
} from "@EnvironmentFile/constants/urlConfig";
// import { useNavigate } from "react-router-dom";

import PropTypes from "prop-types";

import api, { callApi } from "@services/api";
import { styled, useTheme } from "@mui/material";

const MainContainer = styled('div')({
  display: 'flex',
  height: '100%',
  width: '100%',
});

const ModelerArea = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
});

// Toolbar buttons are rendered in EditProcess now; keep only hidden input here.

const HiddenInput = styled('input')({
  display: 'none',
});

const ModelerContainer = styled('div')(({ theme }) => ({
  flex: 1,
  border: '1px solid #000000',
  width: '100%',
  height: '100%',
  marginBottom: theme.spacing(1.25),
  backgroundColor: theme.palette.background.paper, // Thêm màu nền từ theme
  '& .djs-canvas': {
    border: '1px solid #000000 !important',
  },
}));

const PropertiesPanel = styled('div')(({ theme }) => ({
  width: '300px',
  borderLeft: `1px solid ${theme.palette.divider}`,
}));


const DesignBPMN = forwardRef(
  ({ idList, refreshTrigger }, ref) => {
    // logger.log("🚀 ~ DesignBPMN ~ idList:", idList)
    const dispatch = useDispatch();
    const toast = useToast();
    // const navigate = useNavigate();
    const theme = useTheme(); // Lấy theme hiện tại

    const modelerRef = useRef(null);
    const containerRef = useRef(null);
    const panelRef = useRef(null);
    // const [deploying, setDeploying] = useState(false);
    const [,setDeploying] = useState(false);
    const [dialogs, setDialogs] = useState({
      add: false,
      edit: false,
    });
    const fileInputRef = useRef(null);
    const refFieldDataBPMN = useRef();
    const [idForm, setIdForm] = useState(null);
    const [refreshTriggerInternal, setRefreshTriggerInternal] = useState(0);

    const handleDialogs = (type, status) => {
      setDialogs((pre) => ({ ...pre, [type]: status }));
    };

    const handleEdit = (_, data) => {
      setIdForm(data._id);
      handleDialogs("edit", true);
    };

    const handleOpenAddField = (_, data) => {
      setIdForm(data._id);
      handleDialogs("add", true);
    };
    const base64ToXml = (base64) => {
      const decoded = atob(base64); // Giải mã base64 sang chuỗi
      const xml = decodeURIComponent(
        decoded
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return xml;
    };

    // Effect để cập nhật theme cho bpmn-js
    useEffect(() => {
      const mainContainer = containerRef.current?.closest('.bpmn-container') || containerRef.current?.parentElement?.parentElement;
      if (!mainContainer) {
        return;
      }
      const isDark = theme.palette.mode === 'dark';

      // Các biến CSS cho properties-panel
      const propertiesPanelVars = {
        '--bpp-font-family': theme.typography.fontFamily,
        '--bpp-background-color': theme.palette.background.paper,
        '--bpp-text-color': theme.palette.text.primary,
        '--bpp-border-color': theme.palette.divider,
        '--bpp-hover-background-color': theme.palette.action.hover,
        '--bpp-element-background-color': isDark ? '#334155' : '#f7f7f7', // Màu nền cho input, select
        '--bpp-element-border-color': isDark ? '#475569' : '#e2e8f0',
        '--bpp-entry-title-color': theme.palette.text.secondary,
        '--bpp-link-color': theme.palette.primary.main,
        '--bpp-focus-color': theme.palette.primary.main,
        '--bpp-error-color': theme.palette.error.main,
      };

      // ✅ Thêm biến CSS cho palette 
      propertiesPanelVars['--palette-background-color'] = theme.palette.background.paper;
      propertiesPanelVars['--palette-border-color'] = theme.palette.divider;

      // ✅ Thêm biến CSS cho các phần tử BPMN trên canvas
      // Màu cho Pool/Participant
      propertiesPanelVars['--bpmn-participant-fill-color'] = isDark ? '#2C3E50' : '#ffffff';
      propertiesPanelVars['--bpmn-participant-stroke-color'] = isDark ? '#FFFFFF' : '#000000'; // Viền trắng cho Participant ở dark mode
      propertiesPanelVars['--bpmn-element-stroke-color'] = isDark ? '#FFFFFF' : '#000000'; // Viền trắng cho các element khác (bao gồm SequenceFlow) ở dark mode


      // Áp dụng các biến CSS
      for (const [key, value] of Object.entries(propertiesPanelVars)) {
        mainContainer.style.setProperty(key, value);
      }

      // Thêm class để style cho canvas (nếu cần)
      if (isDark) {
        mainContainer.classList.add('dark-mode');
        // Phát sự kiện để module theme tùy chỉnh có thể bắt được
        if (modelerRef.current) {
          modelerRef.current.get('eventBus').fire('theme.changed', { theme: 'dark' });
        }
      } else {
        mainContainer.classList.remove('dark-mode');
        if (modelerRef.current) {
          modelerRef.current.get('eventBus').fire('theme.changed', { theme: 'light' });
        }
      }
    }, [theme]); // Chạy lại mỗi khi theme thay đổi

    // Reload BPMN khi refreshTrigger từ parent thay đổi (khi đóng fullscreen)
    useEffect(() => {
      const fetchBpmnDetail = async () => {
        if (!idList || !modelerRef.current) return;
        try {
          const res = await api.get(`${API_ADD_FIELD_BPMN}/${idList}`);
          const base64File = res.data?.base64File;
          if (!base64File) {
            return;
          }

          // Nếu có dạng data:xxx;base64,... thì bỏ header đi
          const cleanBase64 = base64File.includes(",")
            ? base64File.split(",")[1]
            : base64File;

          const xml = base64ToXml(cleanBase64);

          await modelerRef.current.importXML(xml);
          logger.log("✅ Đã reload BPMN sau khi đóng fullscreen");
        } catch (err) {
          logger.error("Lỗi khi reload BPMN:", err);
        }
      };

      fetchBpmnDetail();
    }, [refreshTrigger, idList]); // Chạy lại khi refreshTrigger (prop từ parent) thay đổi

    useEffect(() => {
      const fetchApi = async () => {
        try {
          const { data: res } = await api.get(`${API_GET_LIST_FUNCTIONMANAGEMANT}/only-popup-and-form`, {
            params: {
              processID: idList
            }
          })

          const dataMap = res.map((item) => ({
            ...item, fields: item?.valueField?.fieldsOfuse?.map((itemChild, index) => ({ ...itemChild, type: mapKey[itemChild.type] || itemChild.type, id: `${item.code}_${index + 1}` })), id: item._id,
          }))
          // logger.log("🚀 ~ fetchApi ~ dataMap:", dataMap)
          setExternalFormTemplates(dataMap)
          // logger.log('res', dataMap)
        } catch (error) {
          logger.log(error)
        }

      }
      fetchApi()
    }, [refreshTriggerInternal, idList])
    useEffect(() => {
      const fetchBpmnDetail = async () => {
        if (!idList) return;
        try {
          const res = await api.get(`${API_ADD_FIELD_BPMN}/${idList}`);
          const base64File = res.data?.base64File;
          if (!base64File) {
            return;
          }

          // Nếu có dạng data:xxx;base64,... thì bỏ header đi
          const cleanBase64 = base64File.includes(",")
            ? base64File.split(",")[1]
            : base64File;

          const xml = base64ToXml(cleanBase64);

          await modelerRef.current.importXML(xml);
        } catch (err) {
          throw new Error("Lỗi khi tải BPMN từ API:", err);
        }
      };

      fetchBpmnDetail();
    }, [idList, modelerRef]);

    const handleAdd = async () => {
      try {
        if (refFieldDataBPMN?.current?.getData) {
          const { data } = await refFieldDataBPMN.current.getData();
          const dataPayload = {
            id: idForm,
            body: data,
          };
          await dispatch(addFieldBpmn(dataPayload)).unwrap();

          // Refresh templates
          const { data: newData } = await api.get(API_ADD_FIELD_BPMN);
          setExternalFormTemplates(newData.data);

          setRefreshTriggerInternal((prev) => prev + 1);
          handleDialogs("add", false);
          toast("Thêm mới thành công!", "success");
        }
      } catch (error) {
        if (error.message === "Timeout") {
          toast("Lỗi kết nối. Vui lòng thử lại sau!", "error");
        } else {
          toast(
            error?.errors
              ? error.errors.map((e) => e.message).join("\n")
              : "Đã xảy ra lỗi khi thêm mới!",
            "error"
          );
        }
      }
    };

    const initializeModeler = () => {
      if (!containerRef.current || !panelRef.current) {
        return;
      }

      const modeler = new BpmnModeler({
        container: containerRef.current,
        propertiesPanel: {
          parent: panelRef.current,
        },
        additionalModules: [
          BpmnPropertiesPanelModule,
          BpmnPropertiesProviderModule,
          CamundaPlatformPropertiesProviderModule,
          { customBpmnTheme: ['type', CustomBpmnTheme] }, // Thêm module theme vào modeler
          {
            translate: ["value", customTranslate],
          },
        ],
        moddleExtensions: {
          camunda: camundaModdleDescriptor,
        },
      });

      modelerRef.current = modeler;
     try {
        const eventBus = modeler.get('eventBus');
        const modeling = modeler.get('modeling');
        const elementRegistry = modeler.get('elementRegistry');

        const applyColorsForElement = (el) => {
          if (!el) return;

          if (el.id && el.id.includes('label')) return;

          const bo = el.businessObject || (el.waypoints ? el : null);
          let colors = null;

          try {
            // Use softer / more muted fills to match the provided picture
            if (bo && typeof bo.$instanceOf === 'function') {
              if (bo.$instanceOf('bpmn:UserTask') || bo.$instanceOf('bpmn:Task')) {
                colors = { fill: '#FFF8DB' }; // very pale yellow + black border
              } else if (
                bo.$instanceOf('bpmn:StartEvent') ||
                bo.$instanceOf('bpmn:EndEvent') ||
                bo.$instanceOf('bpmn:IntermediateThrowEvent') ||
                bo.$instanceOf('bpmn:BoundaryEvent')
              ) {
                colors = { fill: '#FFDCE6'}; // pale pink + black border
              } else if (
                bo.$instanceOf('bpmn:ExclusiveGateway') ||
                bo.$instanceOf('bpmn:ParallelGateway') ||
                bo.$instanceOf('bpmn:InclusiveGateway') ||
                bo.$instanceOf('bpmn:EventBasedGateway')
              ) {
                colors = { fill: '#E8F7D8'}; // pale green + black border
              } else if (bo.$instanceOf('bpmn:SequenceFlow')) {
                colors = { stroke: '#000000', strokeWidth: 2 }; // black for connections
              } else if (bo.$instanceOf('bpmn:Participant')) {
                // Màu của Participant giờ sẽ được điều khiển bởi CSS variables
              } else if (bo.$instanceOf('bpmn:SubProcess')) {
                colors = { fill: '#FFF7CC'}; // pale subprocess yellow + black border
              } else if (bo.$instanceOf('bpmn:DataObject') || bo.$instanceOf('bpmn:DataObjectReference')) {
                colors = { fill: '#F7F8FA'}; // light gray + black border
              } else if (bo.$instanceOf('bpmn:DataStore') || bo.$instanceOf('bpmn:DataStoreReference')) {
                colors = { fill: '#E8EEFF'}; // pale indigo + black border
              }
            } else if (el.type) {
              const type = el.type;
              if (type === 'bpmn:UserTask' || type === 'bpmn:Task') colors = { fill: '#FFF8DB'};
              else if (type.includes('Event')) colors = { fill: '#FFDCE6'};
              else if (type.includes('Gateway')) colors = { fill: '#E8F7D8'};
              else if (type === 'bpmn:SequenceFlow') colors = { stroke: '#000000', strokeWidth: 2 };
              else if (type === 'bpmn:SubProcess') colors = { fill: '#FFF7CC'};
            }
          } catch (err) {
            // ignore and fallback
          }

          if (colors && modeling && el) {
            try {
              if (colors.fill && !('stroke' in colors)) {
                colors = { ...colors, stroke: '#000000' };
              }
              if (!('strokeWidth' in colors)) {
                colors = { ...colors, strokeWidth: colors.strokeWidth || 1.4 };
              }

              modeling.setColor(el, colors);
            } catch (err) {
              // ignore
            }
            try {
              const gfx = elementRegistry && elementRegistry.getGraphics
                ? elementRegistry.getGraphics(el) || elementRegistry.getGraphics(el.id)
                : null;

              if (gfx && gfx.querySelectorAll) {
                const nodes = gfx.querySelectorAll('rect, path, ellipse, polygon, circle, g');
                nodes.forEach((node) => {
                  try {
                    if (colors.fill) {
                      node.setAttribute && node.setAttribute('fill', colors.fill);
                    }
                    if (colors.stroke) {
                      node.setAttribute && node.setAttribute('stroke', colors.stroke);
                      // Sử dụng strokeWidth từ colors nếu có, ngược lại mặc định là 1.4
                      const strokeWidth = colors.strokeWidth || 1.4;
                      node.setAttribute && node.setAttribute('stroke-width', strokeWidth);
                    }
                  } catch (e) {
                    // ignore per-node errors
                  }
                });

                // 🎨 Text styling: make activity text slightly bolder and keep it dark
                const textElements = gfx.querySelectorAll('text, tspan, textPath');

                // Determine element category for label styling
                const isTask = bo && typeof bo.$instanceOf === 'function' && (bo.$instanceOf('bpmn:UserTask') || bo.$instanceOf('bpmn:Task'));
                const isGateway = bo && typeof bo.$instanceOf === 'function' && (
                  bo.$instanceOf('bpmn:ExclusiveGateway') ||
                  bo.$instanceOf('bpmn:ParallelGateway') ||
                  bo.$instanceOf('bpmn:InclusiveGateway') ||
                  bo.$instanceOf('bpmn:EventBasedGateway')
                );

                textElements.forEach((textNode) => {
                  try {
                    // Base color for labels
                    textNode.style.setProperty('fill', '#222222', 'important');
                    // Slight letter spacing for readability
                    textNode.setAttribute('letter-spacing', '0.2px');
                    textNode.style.paintOrder = 'normal';
                    textNode.style.stroke = 'none';
                    textNode.style.strokeWidth = '0px';

                    // Make activity/task labels a bit bolder
                    if (isTask) {
                      // textNode.setAttribute('font-weight', '600');
                      textNode.setAttribute('font-size', '12px');
                    } else if (isGateway) {
                      // textNode.setAttribute('font-weight', '550');
                      textNode.setAttribute('font-size', '11px');
                    } else {
                      // textNode.setAttribute('font-weight', '500');
                    }    
                  } catch (e) {
                    // ignore
                  }
                });   
              }
            } catch (err) {
              // ignore fallback
            }
          }
        };

        const applyColorsToAll = () => {
          if (!elementRegistry) return;
          elementRegistry.forEach((el) => {
            applyColorsForElement(el);
          });
        };

        // ✅ Khi một shape mới được tạo xong (từ palette hoặc context pad), áp dụng màu
        eventBus.on('commandStack.shape.create.postExecuted', 500, (event) => {
          const { shape } = event.context;
          applyColorsForElement(shape);
        });

        // Sau khi import xong, áp màu cho tất cả phần tử
        eventBus.on('import.done', 500, () => {
          applyColorsToAll();
        });

        // Phơi hàm tiện ích để phần khác (ví dụ importFromServer) có thể gọi
        modeler.applyColorsToAll = applyColorsToAll;
      } catch (err) {
        // Nếu có gì lỗi ở đây không gây hỏng hoàn toàn; modeler vẫn dùng được
      }
      formDataProps.addCallback = handleOpenAddField;
      formDataProps.editCallback = handleEdit;

      modeler.createDiagram().catch((err) => {
        err;
      });

      return modeler;
    };

    // useEffect(() => {
    //   const fetchApi = async () => {
    //     try {
    //       const { data } = await api.get(
    //         `${API_DELETE_FUNCTIONMANAGEMANT}/dynamicForm`
    //       );
    //       setExternalFormTemplates(data.data);
    //     } catch (error) {
    //       error;
    //       // logger.error('Error fetching BPMN designs:', error);
    //     }
    //   };
    //   fetchApi();
    // }, [refreshTrigger]);

    useEffect(() => {
      // const handleTemplatesChange = () => {
      //   if (modelerRef.current) {
      //     modelerRef.current.get("propertiesPanel").refresh();
      //   }
      // };

      // setOnFormTemplatesChange(handleTemplatesChange);

      const modeler = initializeModeler();

      return () => {
        setOnFormTemplatesChange(null);
        if (modeler) {
          try {
            modeler.destroy();
          } catch (err) {
            err;
            // logger.error('Error destroying modeler:', err);
          }
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



    const getTasks = async () => {
      if (!modelerRef.current) return;

      try {
        // 1. Lấy XML từ modeler
        const { xml } = await modelerRef.current.saveXML({ format: true });

        if (!xml) {
          throw new Error("Không thể lấy được XML từ modeler.");
        }

        // 2. Parse XML để lấy danh sách userTask
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "application/xml");

        const userTaskNodes = xmlDoc.getElementsByTagName("bpmn:userTask");
        const tasks = [];

        for (let i = 0; i < userTaskNodes.length; i++) {
          const taskNode = userTaskNodes[i];
          const taskId = taskNode.getAttribute("id");
          const taskName = taskNode.getAttribute("name") || "";
          tasks.push({ taskId, taskName });
        }

        // 3. In ra kết quả
        return tasks;
        // [
        //   { id: "Activity_0s5o837", name: "" },
        //   { id: "Activity_0sshdb3", name: "" }
        // ]
      } catch (err) {
        logger.error("Lỗi khi đọc sơ đồ:", err);
      }
    };

    const saveDiagram = async () => {
      if (!modelerRef.current) return;

      try {
        // Lấy XML từ modeler
        const { xml } = await modelerRef.current.saveXML({ format: true });

        // Chuyển XML sang Base64
        const base64String = btoa(unescape(encodeURIComponent(xml)));

        // Call API với base64File dạng string
        // await fetch(`${API_ADD_FIELD_BPMN}/${idList}`, {
        //   method: "PATCH",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify({
        //     base64File: base64String,
        //   }),
        // });
        await callApi('patch', `${API_ADD_FIELD_BPMN}/${idList}`, { base64File: base64String })

        // xử lý task-feature
        // const { taskFnCodeMapping, taskRoleMappingUnqArr, taskRoleMapping } = await applyInspection()
        const { taskFnCodeMapping, taskRoleMappingUnqArr } = await applyInspection()
        // logger.log("🚀 ~ saveDiagram ~ taskRoleMappingUnqArr:", taskRoleMappingUnqArr)
        // logger.log("🚀 ~ saveDiagram ~ taskFnCodeMapping:", taskFnCodeMapping)

        const dataPayloadTaskFnCode = {
          processId: idList,
          tasks: taskFnCodeMapping
        }

        const dataPayloadRoleMapping = {
          processKey: idList,
          roles: taskRoleMappingUnqArr
        }
        logger.log("🚀 ~ saveDiagram ~ dataPayloadRoleMapping:", dataPayloadRoleMapping)

        const checkRes = await api.get(`${taskFeature}/process/${idList}`);
        if (checkRes.data) {
          await api.patch(`${taskFeature}/${checkRes.data._id}`, dataPayloadTaskFnCode);
          logger.log("✅ Đã cập nhật task features!");
        } else {
          await api.post(taskFeature, dataPayloadTaskFnCode);
          logger.log("✅ Tạo mới task features!");
        }
        // xử lý roles

        const { data: checkResRole } = await api.get(`${ROLE_FEATURE}/process/${idList}`);

        if (checkResRole) {
          // Có rồi -> Update
          await api.patch(`${ROLE_FEATURE}/roles-info/${idList}`, dataPayloadRoleMapping);
          toast("Cập nhật thành công", "success");
        } else {
          // Chưa có -> Insert
          await api.post(`${ROLE_FEATURE}`, dataPayloadRoleMapping);
          toast("Thêm mới thành công", "success");
        }

        toast("Thêm mới thành công!", "success");

      } catch (err) {
        logger.log(err, 'err')
        throw new Error("Lỗi khi lưu sơ đồ:", err);
      }
    };

    const exportXml = async () => {
      if (!modelerRef.current) {
        toast("Modeler chưa được khởi tạo.", "warning");
        return;
      }

      try {
        const { xml } = await modelerRef.current.saveXML({ format: true });

        const blob = new Blob([xml], { type: "application/bpmn+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "diagram.bpmn";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        toast("Lỗi khi xuất file XML.", "error");
      }
    };

    const saveAndDeployDiagram = async () => {
      if (!modelerRef.current) return;
      setDeploying(true);

      try {
        // 1. Lấy XML từ modeler
        const { xml } = await modelerRef.current.saveXML({ format: true });

        // 2. Lưu XML dạng base64
        const base64String = btoa(unescape(encodeURIComponent(xml)));
        await fetch(`${API_ADD_FIELD_BPMN}/${idList}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            base64File: base64String,
          }),
        });
        toast("Lưu sơ đồ thành công!", "success");

        // 3. Deploy XML lên Camunda
        const formData = new FormData();
        formData.append("deployment-source", "react-deployment");
        formData.append("deployment-name", "test111");
        formData.append("processID", idList || "default-process-id");
        formData.append("data", new Blob([xml], { type: "text/xml" }));

        const { data } = await api.post(
          `${API_BPMN}/create-process`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        const res = await api.post(`${MODEL_INTROSPECT}/build`, {
          processDefinitionId: Object.keys(data.deployedProcessDefinitions)[0],
        });

        logger.log("🚀 ~ saveAndDeployDiagram ~ response:", res);
        alert("Triển khai thành công! Deployment ID: " + data.id);

      } catch (err) {
        logger.error(err);
        alert("Lỗi khi lưu hoặc triển khai BPMN: " + err.message);
      } finally {
        setDeploying(false);
      }
    };


      useImperativeHandle(ref, () => ({
      getTasks,
      saveAndDeployDiagram,
      applyInspection,
      // expose actions so parent (EditProcess) can call them
      saveDiagram: () => saveDiagram(),
      deployToCamunda: () => deployToCamunda(),
      exportXml: () => exportXml(),
      triggerFileUpload: () => triggerFileUpload(),
      importFromServer: () => importFromServer(),
    }));

    const deployToCamunda = async () => {
      if (!modelerRef.current) return;
      setDeploying(true);
      try {
        const { xml } = await modelerRef.current.saveXML({ format: true });
        const formData = new FormData();
        formData.append("deployment-source", "react-deployment");
        formData.append("deployment-name", "test111");

        formData.append("processID", idList || "default-process-id");

        formData.append(
          "data",
          new Blob([xml], { type: "text/xml" })
        );

        const { data } = await api.post(`${API_BPMN}/create-process`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const res = await api.post(`${MODEL_INTROSPECT}/build`, {
          processDefinitionId: Object.keys(data.deployedProcessDefinitions)[0]
        })
        logger.log("🚀 ~ deployToCamunda ~ response:", res)

        alert("Triển khai thành công! Deployment ID: " + data.id);
      } catch (error) {
        alert("Lỗi khi triển khai BPMN:", error);
      } finally {
        setDeploying(false);
      }
    };

    const applyInspection = async () => {
      if (!modelerRef.current) return;
      const modeler = modelerRef.current;

      const elementRegistry = modeler.get('elementRegistry');

      function isType(el, type) {
        return el && el.businessObject && el.businessObject.$instanceOf(type);
      }


      function getLaneDefaultCandidateGroups(laneShape) {
        const bo = laneShape.businessObject;
        const ext = bo.extensionElements;
        if (!ext || !ext.values) return null;

        const props = ext.values.find(v => v.$type === 'camunda:Properties');
        if (!props || !props.values) return null;

        const p = props.values.find(p => p.name === 'candidateGroups');
        return p && p.value ? p.value : null;
      }

      function getLaneDefaultCandidateGroupsCode(laneShape) {
        const bo = laneShape.businessObject;
        const ext = bo.extensionElements;
        if (!ext || !ext.values) return null;

        const props = ext.values.find(v => v.$type === 'camunda:Properties');
        if (!props || !props.values) return null;

        const p = props.values.find(p => p.name === 'candidateGroupsCode');
        return p && p.value ? p.value : null;
      }

      // function hasExplicitAssignment(bo) {
      //   const assignee = bo.get && bo.get('camunda:assignee');
      //   const candidateUsers = bo.get && bo.get('camunda:candidateUsers');
      //   const candidateGroups = bo.get && bo.get('camunda:candidateGroups');

      //   if (assignee || candidateUsers || candidateGroups) return true;

      //   const extVals = (bo.extensionElements && bo.extensionElements.values) || [];
      //   return extVals.some(v =>
      //     v.$type === 'camunda:Assignee' ||
      //     v.$type === 'camunda:CandidateUsers' ||
      //     v.$type === 'camunda:CandidateGroups'
      //   );
      // }

      // function setCandidateGroups(userTaskShape, groups) {
      //   const bo = userTaskShape.businessObject;
      //   modelerRef.current.get('modeling')
      //     .updateModdleProperties(userTaskShape, bo, { 'camunda:candidateGroups': groups });
      // }

      // function upsertCamundaProperties(element, kv) {
      //   const modeling = modelerRef.current.get('modeling');
      //   const bpmnFactory = modelerRef.current.get('bpmnFactory');
      //   const bo = element.businessObject;

      //   // 1) ensure <bpmn:ExtensionElements>
      //   let ext = bo.get('extensionElements');
      //   if (!ext) {
      //     ext = bpmnFactory.create('bpmn:ExtensionElements', { values: [] });
      //   } else {
      //     // clone to a new instance so command stack detects a change
      //     ext = bpmnFactory.create('bpmn:ExtensionElements', {
      //       values: [...(ext.get('values') || [])]
      //     });
      //   }

      //   // 2) find or create <camunda:Properties>
      //   let values = ext.get('values') || [];
      //   let props = values.find(v => v && v.$type === 'camunda:Properties');

      //   if (!props) {
      //     props = bpmnFactory.create('camunda:Properties', { values: [] });
      //     values = values.concat([props]);
      //     ext = bpmnFactory.create('bpmn:ExtensionElements', { values });
      //   }

      //   const oldVals = props.get('values') || [];
      //   const nextVals = oldVals.slice();

      //   Object.entries(kv).forEach(([name, raw]) => {
      //     const value = (raw == null ? '' : String(raw));
      //     const idx = nextVals.findIndex(p => p.get && p.get('name') === name);
      //     const newProp = bpmnFactory.create('camunda:Property', { name, value });

      //     if (idx === -1) nextVals.push(newProp);
      //     else nextVals[idx] = newProp; // replace, don't mutate
      //   });

      //   const newProps = bpmnFactory.create('camunda:Properties', { values: nextVals });

      //   const others = (ext.get('values') || []).filter(v => !(v && v.$type === 'camunda:Properties'));
      //   const finalExt = bpmnFactory.create('bpmn:ExtensionElements', { values: [...others, newProps] });

      //   modeling.updateModdleProperties(element, bo, { extensionElements: finalExt });
      // }

      // const taskFnCodeMapping = {}
      // elementRegistry
      //   .filter(e => isType(e, "bpmn:UserTask"))
      //   .forEach(task => {
      //     const shape = elementRegistry.get(task.id);
      //     const bo = shape.businessObject
      //     const ext = bo.extensionElements && bo.extensionElements.values;
      //     if (!ext) return
      //     const formData = ext.find(v => v.$type === 'camunda:FormData');
      //     if (!formData) return
      //     taskFnCodeMapping[task.id] = formData.fields[0].id.split("_")[0]
      //   })

      const taskFnCodeMapping = elementRegistry
        .filter(e => isType(e, "bpmn:UserTask"))
        .map(task => {
          const shape = elementRegistry.get(task.id);
          const bo = shape.businessObject;
          const ext = bo.extensionElements && bo.extensionElements.values;
          if (!ext) return null;
          const formData = ext.find(v => v.$type === 'camunda:FormData');
          if (!formData) return null;
          return {
            taskId: task.id,
            taskName: bo.name || "Unknown Task",
            feature: {
              code: formData.fields[0].id.split("_")[0]
            }
          };
        })
        .filter(task => task !== null);

      const taskRoleMapping = {}
      const taskRoleMappingUnq = new Set();

      elementRegistry
        .filter(e => isType(e, 'bpmn:Lane'))
        .forEach(lane => {
          const candidateGroups = getLaneDefaultCandidateGroups(lane) || 'UNKNOWN'; // fallback
          const candidateGroupsCode = getLaneDefaultCandidateGroupsCode(lane) || 'UNKNOWN'
          const flowNodes = lane.businessObject.flowNodeRef || [];

          flowNodes.forEach(fn => {
            const shape = elementRegistry.get(fn.id);
            if (!shape ) return;
            taskRoleMapping[fn.id] = {
              name: candidateGroups,
              code: candidateGroupsCode
            }

            taskRoleMappingUnq.add(JSON.stringify({
              name: candidateGroups,
              roleCode: candidateGroupsCode
            }));
          });
        });

      const taskRoleMappingUnqArr = Array.from(taskRoleMappingUnq).map(item => JSON.parse(item));
      logger.log("Found mapping for fnCode: ", taskFnCodeMapping)
      logger.log("Found mapping for Role: ", taskRoleMapping)
      logger.log("🚀 ~ applyInspection ~ taskRoleMappingUnqArr:", taskRoleMappingUnqArr)

      return {
        taskFnCodeMapping,
        taskRoleMapping,
        taskRoleMappingUnqArr
      }
    };
    const importFromServer = async () => {
      if (!modelerRef.current || !idList) {
        alert("Không có ID sơ đồ để tải!");
        return;
      }
      try {
        const res = await api.get(`${API_ADD_FIELD_BPMN}/${idList}`);
        const base64File = res.data?.base64File;
        if (!base64File) {
          alert("Không tìm thấy dữ liệu sơ đồ trên server.");
          return;
        }

        const cleanBase64 = base64File.includes(",")
          ? base64File.split(",")[1]
          : base64File;

        const xml = base64ToXml(cleanBase64);
        await modelerRef.current.importXML(xml);
        alert("Tải sơ đồ từ server thành công!");
      } catch (error) {
        alert("Lỗi khi tải sơ đồ: " + (error.message || "Lỗi không xác định"));
      }
    };

    const handleFileUpload = async (event) => {
      if (!modelerRef.current) return;
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            await modelerRef.current.importXML(e.target.result);
            alert("Tải lên sơ đồ thành công!");
          } catch (err) {
            alert("Lỗi khi tải lên sơ đồ. Vui lòng kiểm tra định dạng file.");
          }
        };
        reader.readAsText(file);
        event.target.value = null;
      }
    };

    const triggerFileUpload = () => {
      fileInputRef.current.click();
    };

    const handleCloseAddDialog = useCallback(() => {
      handleDialogs("add", false);
    }, []);

    const handleCloseEditDialog = useCallback(() => {
      handleDialogs("edit", false);
    }, []);

    // Các hàm saveDiagram, deployToCamunda, importFromServer, handleFileUpload, triggerFileUpload
    // giữ nguyên như trong code gốc của bạn

    return (
      <MainContainer>
        <ModelerArea>
          {/* 👇 container vẽ sơ đồ */}
          <ModelerContainer
            ref={containerRef}
          />

          {/* Keep hidden file input inside DesignBPMN so parent can trigger it via ref */}
          <HiddenInput
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".bpmn, .xml, text/xml"
          />

        </ModelerArea>

        <PropertiesPanel
          ref={panelRef}
        />

        {/* Các Dialog giữ nguyên */}
        <CustomDialog
          size="lg"
          open={dialogs.add}
          title="Thêm các trường"
          // onClose={() => handleDialogs("add", false)}
          onClose={handleCloseAddDialog}
          onSave={handleAdd}
        >
          <br />
          <DynamicTablePBMN ref={refFieldDataBPMN} />
          <RadioOptions />
        </CustomDialog>

        <CustomDialog
          size="lg"
          open={dialogs.edit}
          title="Sửa các trường"
          // onClose={() => handleDialogs("edit", false)}
          onClose={handleCloseEditDialog}
        >
          <br />
          <DynamicTablePBMN />
          <RadioOptions />
        </CustomDialog>
      </MainContainer>
    );

  });
DesignBPMN.displayName
DesignBPMN.propTypes = {
  idList: PropTypes.any,
  refreshTrigger: PropTypes.number,
};


export default DesignBPMN;
