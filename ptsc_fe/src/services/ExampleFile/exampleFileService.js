import axiosInstance from "@utils/axiosInstance";

// GET - Lấy danh sách file mẫu
export const getExampleFiles = async (type, page = 1, limit = 10) => {
  const response = await axiosInstance.get(`/api/files/example-files`, {
    params: { type, page, limit },
  });
  
  // Ensure file_size is a number (convert from string if needed)
  if (response.data && Array.isArray(response.data)) {
    response.data = response.data.map(file => ({
      ...file,
      // eslint-disable-next-line camelcase
      file_size: typeof file.file_size === 'string' 
        // eslint-disable-next-line camelcase
        ? parseInt(file.file_size, 10) 
        // eslint-disable-next-line camelcase
        : file.file_size
    }));
  }
  
  return response;
};

// GET - Lấy thông tin file mẫu theo khóa
export const getExampleFileById = async (exampleId) => {
  const response = await axiosInstance.get(
    `/api/files/example-files/${exampleId}`
  );
  return response;
};

//GET thông tin theo key
export const getExampleFileByKey = async (key) => {
  const response = await axiosInstance.get(
    `/api/files/example-files/key/${key}`
  );
  return response;
};

// POST - Tạo file mẫu mới
export const createExampleFile = async (formData) => {
  const response = await axiosInstance.post(
    `/api/files/example-files`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response;
};

// PATCH - Cập nhật file mẫu
// isMultipart = true  → gửi FormData (có file)
// isMultipart = false → gửi JSON thuần (chỉ cập nhật metadata)
export const updateExampleFile = async (exampleKey, data, isMultipart = false) => {
  const response = await axiosInstance.patch(
    `/api/files/example-files/${exampleKey}`,
    data,
    isMultipart
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : {}
  );
  return response;
};

// DELETE - Xóa file mẫu
export const deleteExampleFile = async (exampleKey) => {
  const response = await axiosInstance.delete(
    `/api/files/example-files/${exampleKey}`
  );
  return response;
};

// Download file mẫu (public)
export const downloadExampleFile = async (id, fileName) => {
  const blob = await axiosInstance.get(
    `/api/files/download/${id}`,
    {
      responseType: 'blob'
    }
  );
  
  // Tạo blob URL và trigger download
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || id;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Lấy blob của file mẫu (dùng cho preview dialog)
export const getExampleFileBlob = async (id) => {
  const blob = await axiosInstance.get(
    `/api/files/download/${id}`,
    {
      responseType: 'blob'
    }
  );
  return blob;
};
