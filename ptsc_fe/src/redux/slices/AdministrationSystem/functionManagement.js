import {
  API_DELETE_FUNCTIONMANAGEMANT,
  API_UPDATE_FUNCTIONMANAGEMANT,
  API_CREATE_FUNCTIONMANAGEMANT,
  API_GET_LIST_FUNCTIONMANAGEMANT,
  API_FUNCTIONMANAGEMANT_BY_ID,
  API_FUNCTIONMANAGEMANT_PARENTID,
} from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api, { callApi } from "@services/api";

// Async Thunk để lấy danh sách danh mục phông
export const fetchTemplateCategories = createAsyncThunk(
  "apiConfiguration/fetchAll",
  async (
    { page = 1, limit = 25, query, code, sort, processID, featureType } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
        processID,
        featureType,
      };
      // Thêm query cho từng trường trong mảng code, chỉ khi có query
      if (query && Array.isArray(code) && code.length > 0) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }

      const { data } = await api.get(`${API_GET_LIST_FUNCTIONMANAGEMANT}`, {
        params,
      });
      return {
        data: data?.data?.data || [],
        total: data?.data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);

// Async Thunk lấy danh sách parentId
export const getParentId = createAsyncThunk(
  "apiConfiguration/getParentId",
  async (_, { rejectWithValue }) => {
    // Sửa lỗi truyền tham số
    try {
      const response = await api.get(`${API_FUNCTIONMANAGEMANT_PARENTID}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Error fetching parent ID"
      );
    }
  }
);

// Async Thunk để thêm danh mục phông mới
export const addApiConfigurationCategory = createAsyncThunk(
  "apiConfiguration/add",
  async (newCategory, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `${API_CREATE_FUNCTIONMANAGEMANT}`, // thêm dữ liệu
        newCategory
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error adding category");
    }
  }
);

export const addApiConfigurationUpdate = createAsyncThunk(
  "apiConfiguration/updated",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `${API_CREATE_FUNCTIONMANAGEMANT}/${id}`, // thêm dữ liệu
        data
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error adding category");
    }
  }
);

// Lấy thông tin template theo ID
export const fetchConfigurationAPIById = createAsyncThunk(
  "apiConfiguration/fetchAPIById",
  async (id, { rejectWithValue }) => {
    try {
      // const response = await fetch(`${API_FUNCTIONMANAGEMANT_BY_ID}/${id}`);
      const response = await callApi(
        "get",
        `${API_FUNCTIONMANAGEMANT_BY_ID}/${id}`
      );
      // logger.log(response, "response");
      if (!response.success) throw new Error("Không tìm thấy phông!");
      return await response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Tìm kiếm template theo query và code
export const fetchSearchTemplate = createAsyncThunk(
  "apiConfiguration/fetchSearchTemplate",
  async ({ query, code }, { rejectWithValue }) => {
    try {
      const queryString = code.map((c) => `${c}=${query}`).join("&");
      const response = await api.get(
        `${API_GET_LIST_FUNCTIONMANAGEMANT}?${queryString}`
      );
      // logger.log(response.data[0]);

      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không tìm thấy tài liệu!"
      );
    }
  }
);

// Async Thunk để xóa danh mục phông
export const deleteConfigurationAPI = createAsyncThunk(
  "apiConfiguration/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`${API_DELETE_FUNCTIONMANAGEMANT}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);

// Async Thunk để cập nhật danh mục phông
export const updateConfigurationAPI = createAsyncThunk(
  "apiConfiguration/update",
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `${API_UPDATE_FUNCTIONMANAGEMANT}/${id}`,
        updatedData
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error updating category");
    }
  }
);

// Slice Redux
const functionManagement = createSlice({
  name: "apiConfiguration",
  initialState: {
    categories: [],
    selectedTemplate: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Xử lý Fetch
      .addCase(fetchTemplateCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplateCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchTemplateCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Có lỗi xảy ra";
      })

      // Xử lý lấy template theo ID
      .addCase(fetchConfigurationAPIById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfigurationAPIById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedTemplate = action.payload ?? null;
      })
      .addCase(fetchConfigurationAPIById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Có lỗi xảy ra";
      })

      // Xử lý Search
      .addCase(fetchSearchTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSearchTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchSearchTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Có lỗi xảy ra";
      })

      // Xử lý Add
      .addCase(addApiConfigurationCategory.fulfilled, (state, action) => {
        if (action.payload) {
          state.categories = Array.isArray(state.categories)
            ? state.categories
            : [];
          state.categories.push(action.payload);
        }
      })
      .addCase(addApiConfigurationUpdate.fulfilled, (state, action) => {
        if (action.payload) {
          state.categories = Array.isArray(state.categories)
            ? state.categories
            : [];
          state.categories.push(action.payload);
        }
      })

      // Xử lý Delete
      .addCase(deleteConfigurationAPI.fulfilled, (state, action) => {
        if (Array.isArray(state.categories)) {
          state.categories = state.categories.filter(
            (cat) => cat._id !== action.payload
          );
        }
      })

      // Xử lý Update
      .addCase(updateConfigurationAPI.fulfilled, (state, action) => {
        if (!Array.isArray(state.categories)) {
          state.categories = []; // Hoặc gán giá trị mặc định
        }

        const index = state.categories.findIndex(
          (cat) => cat._id === action.payload._id
        );

        if (index !== -1) {
          state.categories[index] = action.payload;
        }
      })
      //xử lý get parentId
      .addCase(getParentId.pending, (state) => {
        state.loading = true;
      })
      .addCase(getParentId.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getParentId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default functionManagement.reducer;
