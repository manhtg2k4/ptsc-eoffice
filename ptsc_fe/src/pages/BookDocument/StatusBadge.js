import React from "react";
import { Box, styled } from "@mui/material";

// Styled component cho badge
const StatusBadgeBox = styled(Box)(({ statusText }) => {
  // Map các status khác nhau với màu sắc tương ứng
  const statusColorMap = {
    "XU_LY_CHINH": { bg: "#fef9c2", color: "#ff9800", label: "Xử lý chính" },
    "XU_LY": { bg: "#fef9c2", color: "#ff9800", label: "Xử lý" },
    "CHO_XU_LY": { bg: "#fff3cd", color: "#ff9800", label: "Chờ xử lý" },
    "HOAN_THANH": { bg: "#d4edda", color: "#155724", label: "Hoàn thành" },
    "TU_CHOI": { bg: "#f8d7da", color: "#721c24", label: "Từ chối" },
    "HOAN_TTAT": { bg: "#d4edda", color: "#155724", label: "Hoàn tất" },
  };

  const statusConfig = statusColorMap[statusText] || {
    bg: "#fef9c2",
    color: "#666",
    label: statusText,
  };

  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: "30px",
    padding: "8px 16px",
    backgroundColor: statusConfig.bg,
    color: statusConfig.color,
    fontWeight: 700,
    fontSize: "14px",
    borderRadius: "15px",
    whiteSpace: "normal",
    wordWrap: "break-word",
    overflow: "visible",
    textAlign: "center",
    lineHeight: "1.4",
  };
});

const StatusBadge = ({ value }) => {
  // Nếu value là HTML string, extract text
  let statusText = value;

  if (typeof value === "string" && value.includes("<")) {
    // Parse HTML để lấy text content
    const parser = new DOMParser();
    try {
      const doc = parser.parseFromString(value, "text/html");
      statusText = doc.body.textContent.trim();
    } catch (e) {
      // Nếu parse fail, extract bằng regex
      statusText = value.replace(/<[^>]*>/g, "").trim();
    }
  }

  // Nếu không có text, hiển thị dấu "-"
  if (!statusText) {
    return <StatusBadgeBox>–</StatusBadgeBox>;
  }

  return (
    <StatusBadgeBox statusText={statusText}>
      {statusText}
    </StatusBadgeBox>
  );
};

export default StatusBadge;
