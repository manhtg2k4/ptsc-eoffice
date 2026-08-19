import * as yup from "yup";

// constants/meetingStatus.js
export const MEETING_STATUS = {
  DRAFT: {
    label: "Dự kiến",
    bg: "#E3F2FD",
    border: "#1E88E5",
  },
  PREPARE: {
    label: "Chuẩn bị",
    bg: "#E8F5E9",
    border: "#43A047",
  },
  MEETING: {
    label: "Đang họp",
    bg: "#FFFDE7",
    border: "#FBC02D",
  },
  ADJUST: {
    label: "Bổ sung",
    bg: "#E1F5FE",
    border: "#039BE5",
  },
  CANCEL: {
    label: "Hủy",
    bg: "#FDECEA",
    border: "#E53935",
  },
};

export const MAX_CONTENT_LENGTH = 5000;
export const MAX_TITLE_LENGTH = 500;

export const CONTENT_MAX_ERROR_MSG = `Nội dung cuộc họp không được vượt quá ${MAX_CONTENT_LENGTH} ký tự`;
export const TITLE_MAX_ERROR_MSG = `Tiêu đề cuộc họp không được vượt quá ${MAX_TITLE_LENGTH} ký tự`;

export const meetingContentSchema = yup
  .string()
  .trim()
  .max(MAX_CONTENT_LENGTH, CONTENT_MAX_ERROR_MSG);

export const meetingTitleSchema = yup
  .string()
  .trim()
  .required("Vui lòng nhập tiêu đề cuộc họp")
  .max(MAX_TITLE_LENGTH, TITLE_MAX_ERROR_MSG);

export const getAllErrorMessages = (errors) => {
  const messages = [];
  const traverse = (obj) => {
    if (!obj || typeof obj !== "object") return;
    if (obj.message) {
      messages.push(obj.message);
      return;
    }
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === "object") {
        traverse(obj[key]);
      }
    }
  };
  traverse(errors);
  return Array.from(new Set(messages));
};