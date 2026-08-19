import { useState, useCallback } from "react";
import { addMonths, subMonths } from "date-fns";

import CustomGantt from "./index";
import PropTypes from "prop-types";
// import axiosInstance from "@utils/axiosInstance";
import ViewJobToDocument from "@pages/WorkManagement/components/ViewJobToDocument";
import ViewJobToMeeting from "@pages/WorkManagement/components/ViewJobToMeeting";
import ViewJob from "@pages/WorkManagement/components/ViewJob";

/**
 * Component GanttExample - Wrapper cho CustomGantt
 * 
 * @param {Array} data - Danh sách công việc
 * @param {Function} onTaskClick - Callback khi click vào công việc
 * @param {boolean} enableDependencies - Cho phép tạo dependency hay không
 * @param {string} apiEndpoint - Endpoint API cho dependencies (mặc định: /api/task-dependencies)
 */
const GanttExample = ({ 
  data = [], 
  onTaskClick: externalTaskClick,
  enableDependencies = true,
  // apiEndpoint = "/api/task-dependencies",
  renderAfterSearch,
  onSearch,
  filterOptions,
  onAdd,
  onExport,
  disableAdd = false,
  onAdvancedFilterClick,
  addButtonLabel,
  onMyAssign,
  onMyDirector,
  onMySupporter,
  activeTaskView
}) => {
  // logger.log("GanttExample - data", data);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [expandedTasks, setExpandedTasks] = useState([1, 3]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [, setReloadData] = useState(false);

  // ===== API Functions cho Dependencies =====
  
  /**
   * Fetch danh sách dependencies từ API
   * @returns {Promise<Array>} - Danh sách dependencies [{id, fromId, toId, type}]
   */
  const fetchDependencies = useCallback(async () => {
   	logger.log("Lấy danh sách công việc")
  }, []);
  // const fetchDependencies = useCallback(async () => {
  //   if (!enableDependencies) {
  //     return [];
  //   }
  //   try {
  //     const response = await axiosInstance.get(apiEndpoint);
  //     // response = [{ id, fromId, toId, type }]
  //     return response.data || response || [];
  //   } catch (error) {
  //     logger.error("Failed to fetch dependencies:", error);
  //     return [];
  //   }
  // }, [apiEndpoint, enableDependencies]);

  /**
   * Tạo dependency mới qua API khi kéo nối công việc
   * @param {Object} newDep - { fromId, toId, type: "FS" }
   * @returns {Promise<Object>} - Dependency đã tạo { id, fromId, toId, type }
   */
  const createDependencyApi = useCallback(async (newDep) => {
    logger.log("Kết nối cộng việc", newDep)
  }, []);

  // const createDependencyApi = useCallback(async (newDep) => {
  //   if (!enableDependencies) {
  //     throw new Error("Dependencies are disabled");
  //   }
  //   try {
  //     const response = await axiosInstance.post(apiEndpoint, {
  //       sourceTaskId: newDep.fromId,
  //       targetTaskId: newDep.toId,
  //       type: newDep.type || "FS",
  //     });
  //     // return { id, fromId, toId, type }
  //     return response.data || response;
  //   } catch (error) {
  //     logger.error("Failed to create dependency:", error);
  //     throw error;
  //   }
  // }, [apiEndpoint, enableDependencies]);

  // ===== Event Handlers =====

  const handleMonthChange = (direction) => {
    if (direction === "today") {
      setCurrentDate(new Date());
    } else if (direction === "prev") {
      setCurrentDate((prev) => subMonths(prev, 1));
    } else {
      setCurrentDate((prev) => addMonths(prev, 1));
    }
  };

  const handleTaskSelect = (taskId, checked) => {
    if (checked) {
      setSelectedTasks((prev) => [...prev, taskId]);
    } else {
      setSelectedTasks((prev) => prev.filter((id) => id !== taskId));
    }
  };

  // Handler: Expand/Collapse task
  const handleTaskExpand = (taskId) => {
    setExpandedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Handler: Click on task row
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setOpenDetailModal(true);
    
    // Gọi callback từ bên ngoài nếu có
    if (externalTaskClick) {
      externalTaskClick(task);
    }
  };

  /**
   * Render modal chi tiết công việc dựa vào typeTask
   * - general: ViewJob (mặc định)
   * - form-doc: ViewJobToDocument
   * - form-meeting: ViewJobToMeeting
   */
  const renderDetailModal = () => {
    const handleCloseModal = () => {
      setOpenDetailModal(false);
      setSelectedTask(null);
    };

    const handleJobDetailSuccess = () => {
      setReloadData((prev) => !prev);
      handleCloseModal();
    };

    if (!selectedTask || !openDetailModal) return null;

    const commonProps = {
      open: openDetailModal,
      onClose: handleCloseModal,
      onSuccess: handleJobDetailSuccess,
      documentId: selectedTask.id,
      setReloadData,
    };

    switch (selectedTask?.typeTask) {
			case "general":
				return <ViewJob {...commonProps} />;
      case "form_doc":
        return <ViewJobToDocument {...commonProps} />;
      case "form_meeting":
        return <ViewJobToMeeting {...commonProps} />;
			default:
				return <ViewJob {...commonProps} />;
    }
  };
	
	// logger.log('tasks-111', tasks)

  // ===== Event Handlers =====

  // ... (rest of code)

  return (
    <>
      <CustomGantt
        tasks={data}
        // tasks={tasks}
        currentDate={currentDate}
        selectedTasks={selectedTasks}
        expandedTasks={expandedTasks}
        daysToShow={31}
        onMonthChange={handleMonthChange}
        onTaskSelect={handleTaskSelect}
        onTaskExpand={handleTaskExpand}
        onTaskClick={handleTaskClick}
        // Dependency props
        fetchDependencies={fetchDependencies}
        createDependencyApi={createDependencyApi}
        enableDependencies={enableDependencies}
        renderAfterSearch={renderAfterSearch}
        onSearch={onSearch} // New prop
        filterOptions={filterOptions}
        onAdd={disableAdd ? undefined : onAdd}
        onExport={onExport}
        onAdvancedFilterClick={onAdvancedFilterClick}
        addButtonLabel={addButtonLabel}
        onMyAssign={onMyAssign}
        onMyDirector={onMyDirector}
        onMySupporter={onMySupporter}
        activeTaskView={activeTaskView}
      />
      {renderDetailModal()}
    </>
  );
}

GanttExample.propTypes = {
  data: PropTypes.array,
  onTaskClick: PropTypes.func,
  enableDependencies: PropTypes.bool,
  apiEndpoint: PropTypes.string,
  disableAdd: PropTypes.bool,
  renderAfterSearch: PropTypes.func,
  onSearch: PropTypes.func,
  filterOptions: PropTypes.array,
  onAdvancedFilterClick: PropTypes.func,
};

export default GanttExample;