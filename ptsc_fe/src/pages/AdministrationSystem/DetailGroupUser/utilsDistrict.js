export const normalizeApiData = (data,status) => {
  return {
    ...data,
    status: status || null,
    birthday: data.birthday
      ? formatDateToISO(data.birthday)
      : null,
    contactTime: data.contactTime
      ? formatDateToISO(data.contactTime)
      : null,
  };
};
export const formatDateToISO = (date) => {
  if (!date) return null;

  // Nếu là số (timestamp giây)
  if (typeof date === "number") {
    return new Date(date * 1000).toISOString(); // Chuyển timestamp giây sang ISO
  }

  // Nếu là chuỗi "dd/mm/yyyy"
  if (typeof date === "string" && date.includes("/")) {
    const [day, month, year] = date.split("/").map(Number);
    return new Date(year, month - 1, day).toISOString();
  }

  // Nếu là đối tượng Date
  if (date instanceof Date) {
    return date.toISOString();
  }

  return null;
};

export const formatDate = (dateStr, unit = "seconds") => {
  if (!dateStr || dateStr === "") return null;

  let parsedDate;

  // Nếu là chuỗi ISO 8601 (2025-03-18T00:00:00.000Z)
  if (typeof dateStr === "string" && dateStr.includes("T")) {
    parsedDate = new Date(dateStr);
  }
  // Nếu là chuỗi dd/mm/yyyy
  else if (typeof dateStr === "string" && dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/").map(Number);
    parsedDate = new Date(year, month - 1, day); // month - 1 vì getMonth() tính từ 0
  }
  // Nếu là số (timestamp giây)
  else if (typeof dateStr === "number") {
    parsedDate = new Date(dateStr * 1000); // Nhân 1000 vì timestamp là giây
  } else {
    return null;
  }

  // Kiểm tra ngày hợp lệ
  if (isNaN(parsedDate.getTime())) return null;

  const timestamp = parsedDate.getTime();
  return unit === "seconds" ? Math.floor(timestamp / 1000) : timestamp;
};

export const normalizeApiDataEdit = (data) => {
  return {
    ...data,
    birthday: data.birthday ? formatDate(data.birthday) : null,
    contactTime: data.contactTime ? formatDate(data.contactTime) : null,

  };
};

export const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase();
};
