export const normalizeApiData = (data, status) => {
  let secretary = data.personalSecretary;
  if (secretary && typeof secretary === "object") {
    secretary = secretary.id || secretary._id || null;
  } else if (!secretary || typeof secretary !== "string" || !secretary.trim()) {
    secretary = null;
  }

  return {
    ...data,
    personalSecretary: secretary,
    order: data.order ? Number(data.order) : 0,
    status: status || null,
    birthday: data.birthday ? formatDateToISO(data.birthday) : null,
    contactTime: data.contactTime ? formatDateToISO(data.contactTime) : null,
    paraphSignImage: data.paraphSignImage || null,
    contentSignImage: data.contentSignImage || null,
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

const formatDateToDDMMYYYY = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const normalizeApiDataEdit = (data) => {
  return {
    ...data,
    //  birthday: data.birthday ? formatDate(data.birthday) : null,
    // contactTime: data.contactTime ? formatDate(data.contactTime) : null,
    birthday: data.birthday ? formatDateToDDMMYYYY(data.birthday) : null,
    contactTime: data.contactTime
      ? formatDateToDDMMYYYY(data.contactTime)
      : null,
  };
};
