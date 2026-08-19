import React from "react";
import CheckIcon from "@mui/icons-material/Check";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AddIcon from "@mui/icons-material/Add";
import ReplyIcon from "@mui/icons-material/Reply";
import CloseIcon from "@mui/icons-material/Close";

export const WORKFLOW_STATUS_CONFIG = {
  completed: {
    text: "Đã hoàn thành",
    color: "#54C977", // Green
    backgroundColor: "#EAF9EE",
    timelineColor: "#54C977",
    icon: <CheckIcon />,
  },
  processing: {
    text: "Đang xử lý",
    color: "#FFC85B", // Yellow/Orange
    backgroundColor: "#FFFBEB",
    timelineColor: "#FFC85B",
    icon: <ArrowForwardIcon />,
  },
  waiting: {
    text: "Chưa thực hiện",
    color: "#919191", // Grey
    backgroundColor: "#F3F4F6",
    timelineColor: "#BDBDBD",
    icon: <AddIcon />,
  },
  returned: {
    text: "Trả lại",
    color: "#D32F2F", // Red
    backgroundColor: "#FFEBEE",
    timelineColor: "#D32F2F",
    icon: <ReplyIcon />,
  },
	rejected: {
    text: "Thu hồi",
    color: "#9C27B0", // Purple
    backgroundColor: "#F3E5F5",
    timelineColor: "#9C27B0",
    icon: <CloseIcon />,
  },
};

export const parseRoleInfo = (roleGroupSource) => {
  if (!roleGroupSource) return { position: "Chuyên viên", department: "" };

  const role = roleGroupSource.toUpperCase();
  if (role.includes("VAN_THU_TCT")) {
    return { position: "Văn thư TCT", department: "Văn phòng TCT" };
  }
  if (role.includes("CHI_HUY_PHONG")) {
    return { position: "Chỉ huy phòng", department: "" };
  }
  if (role.includes("BAN_GIAM_DOC") || role.includes("GIAM_DOC")) {
    return { position: "Giám đốc", department: "" };
  }
  return { position: roleGroupSource, department: "" };
};

export const normalizeWorkflowData = (apiData) => {
  if (!apiData) return [];

  let list = apiData;
  let globalReturnReason = null;

  if (!Array.isArray(apiData)) {
    globalReturnReason = apiData.returnReason || apiData.return_reason || null;
    if (Array.isArray(apiData.steps)) {
      list = apiData.steps;
    } else if (Array.isArray(apiData.data)) {
      list = apiData.data;
    } else if (Array.isArray(apiData.history)) {
      list = [apiData];
    } else {
      return [];
    }
  }

  return list.map((step, index) => {
    const history = Array.isArray(step.history) ? step.history : [];
    
    // 1. Tính toán trạng thái tổng quát của bước (step)
    let stepStatus = "waiting";
    if (step.statusCode && WORKFLOW_STATUS_CONFIG[step.statusCode]) {
      stepStatus = step.statusCode;
    } else if (history.some(item => item.actionCode === "TRA_LAI" || item.actionCode === "TRA_LAI_DU_THAO" || item.stageStatus === "Trả lại" || item.isReturn === true)) {
      stepStatus = "returned";
    } else if (history.some(item => item.actionCode === "THU_HOI" || item.stageStatus === "Thu hồi")) {
      stepStatus = "rejected";
    } else if (step.curWorkItem) {
      stepStatus = "processing";
    } else if (history.length > 0 && history.every((item) => item.completed === true)) {
      stepStatus = "completed";
    } else if (history.some((item) => item.completed === false)) {
      stepStatus = "processing";
    }

    const stepStatusLabel = WORKFLOW_STATUS_CONFIG[stepStatus]?.text || "Chưa thực hiện";

    // 2. Map các users trong bước và tính toán trạng thái tương ứng
    const users = history.map((item, idx) => {
      const roleInfo = parseRoleInfo(item.receiver?.roleGroupSource);
      
      // Quyết định trạng thái riêng của người xử lý
      let userStatus = stepStatus;
      if (item.statusCode && WORKFLOW_STATUS_CONFIG[item.statusCode]) {
        userStatus = item.statusCode;
      } else if (item.stageStatus === "Trả lại" || item.isReturn === true) {
        userStatus = "returned";
      } else if (item.stageStatus === "Thu hồi") {
        userStatus = "rejected";
      } else if (item.stageStatus === "Đã xử lý" || item.completed === true || stepStatus === "completed") {
        userStatus = "completed";
      } else if (item.actionCode === "TRA_LAI" || item.actionCode === "TRA_LAI_DU_THAO") {
        userStatus = "returned";
      } else if (item.actionCode === "THU_HOI") {
        userStatus = "rejected";
      }

      return {
        id: item._id || `${step.stepId || index}-${idx}`,
        name: item.createdBy?.name || item.receiver?.name || "-",
        processorName: item.createdBy?.name || "-",
        receiverName: item.receiver?.name || "-",
        position: roleInfo.position,
        department: roleInfo.department,
        action: item.action || step.actionName || "-",
        processedDate: item.processedDate || null,
        deadline: item.deadline || null,
        status: userStatus,
        statusLabel: item.stageStatus || (WORKFLOW_STATUS_CONFIG[userStatus]?.text || (userStatus === "completed" ? "Đã xử lý" : "Chưa thực hiện")),
        raw: item,
      };
    });

    const returnReason = step.returnReason || step.return_reason || step.reason || (history.find(h => h.returnReason || h.return_reason)?.returnReason) || globalReturnReason || null;

    return {
      stepId: step.stepId || `step-${index}`,
      stepOrder: index + 1,
      stepName: step.stepName || "-",
      stepNote: step.stepNote || null,
      actionName: step.actionName || "-",
      status: stepStatus,
      statusLabel: stepStatusLabel,
      totalUsers: users.length,
      users: users,
      history: history,
      returnReason: returnReason,
    };
  });
};
