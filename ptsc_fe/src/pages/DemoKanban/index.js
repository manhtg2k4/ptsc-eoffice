import React, { useState, useEffect } from "react";
import {
  styled,
} from "@mui/material";
import KanbanBoard from "@components/BaseKanbanBoard";
import PropTypes from "prop-types";
import { statusMapColumns, statusOrder } from "./constantKanban";
import { useDispatch } from "react-redux";
import { upDateStatusJob } from "@redux/slices/TaskManagement/TaskManagementSlice";
import { useToast } from "@components/common/ToastProvider";

// ✅ Styled components để tránh lint errors
const KanbanContainer = styled("div")(({ theme }) => ({
  padding: theme.spacing(2.5),
  maxHeight: "calc(90vh - 180px)",
  background: '#fff',
  paddingTop: '0',
  borderRadius: '8px 0 8px 8px',
  width: '100%',
  boxSizing: 'border-box',
  overflowY: 'auto',  // Cho phép scroll dọc nếu card quá dài
  overflowX: 'hidden', // Ngăn container này tạo thêm thanh scroll ngang thừa (Stack bên trong lo việc scroll ngang)
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1.5),
  },
}));

const KanbanPage = ({ 
  data = [], 
  onSearch, 
  renderAfterSearch, 
  filterOptions,
  onAdd,
  onExport,
  setReloadData,
  disableAdd = false,
  onAdvancedFilterClick,
  addButtonLabel,
  onMyAssign,
  onMyDirector,
  onMySupporter,
  activeTaskView,
  mt=0
}) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const [columns, setColumns] = useState([]);
  useEffect(() => {
    if (!Array.isArray(data)) return;
    
    const statusMapClone = Object.keys(statusMapColumns).reduce((acc, key) => {
      acc[key] = {
        ...statusMapColumns[key],
        items: [], // Reset items mỗi lần re-render
      };
      return acc;
    }, {});

    data.forEach((task) => {
     
      const taskItem = {
        id: `task-${task.id}`,
        sourceId: task.id,
				title: task.name,
				progress: task.progress,
        processStatus: task.processStatus,
        manager: task.director, //Người chủ trì
        assigner: task.assigner,
				startDate: task.startDate,
				endDate: task.endDate,
				endDateNotHTML: task.endDateNotHTML,
        flagColor: task?.flag,
				typeTask: task.typeTask,
        flag: task?.flag,
        priority: task?.priority,
      };

      const statusKey = String(task.processStatus || "");
      if (statusMapClone[statusKey]) {
        statusMapClone[statusKey].items.push(taskItem);
      }
    });

    const columnsArray = statusOrder.map((key) => ({
      id: String(key),
      ...statusMapClone[key],
    }));
    setColumns(columnsArray);
  }, [data]);

  const handleColumnsChange = (newCols) => {
    setColumns(newCols);
  }; 

  const handleItemStatusChange = async ({ item, destStatus }) => {
    if (!setReloadData) return;
    try {
      const payload = {
        processStatus: destStatus,
      };
      await dispatch(
        upDateStatusJob({
          id: item.sourceId,
          payload,
        })
      ).unwrap();
      toast("Cập nhật trạng thái công việc thành công!", "success");
      setReloadData(new Date())
    } catch (error) {
      logger.log("Lỗi khi cập nhật trạng thái công việc:", error);
      toast( error?.response?.data?.message ||"Cập nhật trạng thái công việc thất bại!", "error");
    }
  };

  const isEmpty = !data || data.length === 0;

  return (
    <KanbanContainer>
      <KanbanBoard
        mt={mt}
        initialColumns={columns}
        onColumnsChange={handleColumnsChange}
        onItemStatusChange={handleItemStatusChange}
        onSearch={onSearch}
        renderAfterSearch={renderAfterSearch}
        filterOptions={filterOptions}
        isEmpty={isEmpty}
        onAdd={disableAdd ? undefined : onAdd}
        onExport={onExport}
        setReloadData={setReloadData}
        disableDrag={!setReloadData}
        onAdvancedFilterClick={onAdvancedFilterClick}
        addButtonLabel={addButtonLabel}
        onMyAssign={onMyAssign}
        onMyDirector={onMyDirector}
        onMySupporter={onMySupporter}
        activeTaskView={activeTaskView}
      />
    </KanbanContainer>
  );
};

KanbanPage.propTypes = {
  data: PropTypes.array,
  onSearch: PropTypes.func,
  renderAfterSearch: PropTypes.func,
  filterOptions: PropTypes.array,
  disableAdd: PropTypes.bool,
  onAdvancedFilterClick: PropTypes.func,
  addButtonLabel: PropTypes.string,      // 👈 thêm
};

export default KanbanPage;