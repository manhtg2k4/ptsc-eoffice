import {
  APP_BASE,
  API_GET_DOCUMENT_CATEGOEY,
  API_GET_EXPLOITATION_UNIT,
  API_GET_FORMDESIGN,
  API_DELETE_FORMDESIGN,
  API_CREATE_UPDATE_FORMDESIGN,
  API_UPLOAD_FILE,
} from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";
 
// Import or define APP_BASE_URL

// ✅ Hàm upload ảnh base64 lên server và trả về URL
async function uploadImage(base64) {
  const blob = await (await fetch(base64)).blob();
  const formData = new FormData();
  formData.append("file", blob, "image.png");

  const { data } = await api.post(API_UPLOAD_FILE, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return APP_BASE + "/" + data?.data?.fullPath;
}

// ✅ Hàm thay ảnh base64 trong markdown bằng URL
async function replaceBase64ImagesInMarkdown(markdown) {
  // Regex cho ![alt](data:image/...)
  const markdownImageRegex =
    /!\[([^\]]*)\]\((data:image\/[a-zA-Z]+;base64,[^)]*)\)/g;

  // Regex cho <img src="data:image/...">
  const htmlImageRegex =
    /<img\s+[^>]*src=["'](data:image\/[a-zA-Z]+;base64,[^"']+)["'][^>]*>/g;

  const cache = new Map();
  let updatedMarkdown = markdown;

  // Replace Markdown image syntax
  const markdownMatches = [...markdown.matchAll(markdownImageRegex)];
  for (const match of markdownMatches) {
    const fullMatch = match[0];
    const altText = match[1];
    const base64 = match[2];

    if (!cache.has(base64)) {
      try {
        const url = await uploadImage(base64);
        cache.set(base64, url);
      } catch (error) {
        continue;
      }
    }

    const url = cache.get(base64);
    const newImg = `![${altText}](${url})`;
    updatedMarkdown = updatedMarkdown.replaceAll(fullMatch, newImg);
  }

  // Replace HTML <img> syntax
  const htmlMatches = [...updatedMarkdown.matchAll(htmlImageRegex)];
  for (const match of htmlMatches) {
    const fullMatch = match[0];
    const base64 = match[1];

    if (!cache.has(base64)) {
      try {
        const url = await uploadImage(base64);
        cache.set(base64, url);
      } catch (error) {
        continue;
      }
    }

    const url = cache.get(base64);
    // Replace entire tag with updated src
    const updatedImg = fullMatch.replace(base64, url);
    updatedMarkdown = updatedMarkdown.replaceAll(fullMatch, updatedImg);
  }

  return updatedMarkdown;
}

export const getListFormDesign = createAsyncThunk(
  "formDesign/getAll",
  async (
    { page = 1, limit = 25, query, code, sort } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = { page, limit, sort };
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query;
        });
      }

      const { data } = await api.get(`${API_GET_FORMDESIGN}`, { params });
      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Lỗi khi lấy danh sách biểu mẫu tài liệu";
      return rejectWithValue(message);
    }
  }
);

export const fetchFormDesignDetail = createAsyncThunk(
  "formDesign/fetchDetail",
  async (code, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${API_GET_FORMDESIGN}/${code}`);
      return data?.data || {};
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Lỗi biểu mẫu động";
      return rejectWithValue(message);
    }
  }
);

export const getListDocumentType = createAsyncThunk(
  "formDesign/getListDocumentType",
  async ({ page = 1, limit = 999, sort }, { rejectWithValue }) => {
    try {
      const params = { page, limit, sort };
      const { data } = await api.get(`${API_GET_DOCUMENT_CATEGOEY}`, {
        params,
      });
      return data?.data || [];
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Lỗi loại tài liệu";
      return rejectWithValue(message);
    }
  }
);

export const getListApplicableUnit = createAsyncThunk(
  "formDesign/getListApplicableUnit",
  async ({ page = 1, limit = 999, sort }, { rejectWithValue }) => {
    try {
      const params = { page, limit, sort };
      const { data } = await api.get(`${API_GET_EXPLOITATION_UNIT}`, {
        params,
      });
      return data?.data || [];
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Lỗi đơn vị áp dụng";
      return rejectWithValue(message);
    }
  }
);

export const deleteFormDesign = createAsyncThunk(
  "FormDesign/delete",
  async (ids, { rejectWithValue }) => {
    try {
      await api.post(`${API_DELETE_FORMDESIGN}`, { ids: ids });
      return ids;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);

export const createFormDesign = createAsyncThunk(
  "FormDesign/create",
  async (data, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("code", data.code);
      formData.append("documentType", data.documentType);
      formData.append("unitName", data.applicableUnit);
      // Xử lý markdown chứa ảnh base64
      const replacedMarkdown = await replaceBase64ImagesInMarkdown(
        data.textEditor
      );
      formData.append("fileEdited", replacedMarkdown);

      if (data.file) {
        formData.append("file", data.file);
      }
      const response = await api.post(
        API_CREATE_UPDATE_FORMDESIGN,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Lỗi khi thêm mới biển mẫu"
      );
    }
  }
);

export const updateFormDesign = createAsyncThunk(
  "FormDesign/update",
  async (data, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("code", data.code);
      formData.append("documentType", data.documentType);
      formData.append("unitName", data.applicableUnit);
      // Xử lý markdown chứa ảnh base64
      const replacedMarkdown = await replaceBase64ImagesInMarkdown(
        data.textEditor
      );
      formData.append("fileEdited", replacedMarkdown);

      if (data.file) {
        formData.append("file", data.file);
      }
      const response = await api.put(
        API_CREATE_UPDATE_FORMDESIGN + `/${data.id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Lỗi khi thêm mới biển mẫu"
      );
    }
  }
);

const formDesignSlice = createSlice({
  name: "formDesign",
  initialState: {
    getListFormDesign: [],
    listDocType: [],
    listApplicableUnit: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getListFormDesign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getListFormDesign.fulfilled, (state, action) => {
        state.loading = false;
        state.getListFormDesign = action.payload;
      })
      .addCase(getListFormDesign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      });

    builder
      .addCase(getListDocumentType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getListDocumentType.fulfilled, (state, action) => {
        state.loading = false;
        state.listDocType = action.payload;
      })
      .addCase(getListDocumentType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      });

    builder
      .addCase(getListApplicableUnit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getListApplicableUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listApplicableUnit = action.payload;
      })
      .addCase(getListApplicableUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      });
    //xoa
    builder
      .addCase(deleteFormDesign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFormDesign.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteFormDesign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
    builder
      .addCase(createFormDesign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFormDesign.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createFormDesign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
    builder
      .addCase(updateFormDesign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFormDesign.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateFormDesign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default formDesignSlice.reducer;
