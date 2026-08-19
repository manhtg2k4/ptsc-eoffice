import dayjs from "dayjs";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";

const clearWidthSpace = (str) => {
  return str.replaceAll(/\s+/g, " ");
};

// Gỡ bỏ dấu tiếng Việt + ký tự đặc biệt + chuẩn hóa khoảng trắng (dùng khi so sánh, lưu DB...)
const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\w\s]/gi, "") // loại bỏ ký tự đặc biệt
    .replace(/\s+/g, " ") // loại bỏ khoảng trắng dư
    .trim()
    .toLowerCase();
};

// bỏ dấu + lowercase, GIỮ nguyên ký tự đặc biệt
const normalizeText = (str) =>
  (str ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const useModuleCode = () => {
  const location = useLocation();
  const moduleCode = useMemo(() => {
    const path = location.pathname;
    return path.split("/").filter(Boolean).pop() || "";
  }, [location.pathname]);
  return moduleCode;
};

function convertDatetime2Date(datetime) {
  const date = dayjs(datetime, "DD/MM/YYYY").format("YYYY-MM-DD");
  if (date === "Invalid date") {
    return datetime;
  }
  return date;
}

export {
  clearWidthSpace,
  removeVietnameseTones,
  normalizeText,
  useModuleCode,
  convertDatetime2Date,
};
