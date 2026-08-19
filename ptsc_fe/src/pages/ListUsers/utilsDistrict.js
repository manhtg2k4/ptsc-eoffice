export const normalizeApiData = (data, permission) => {
  return {
    ...data,
    permissions: permission || null,
  };
};

export const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};
