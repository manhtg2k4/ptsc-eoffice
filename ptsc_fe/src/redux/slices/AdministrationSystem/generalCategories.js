import { API_LIST_GENERALCATEGORIES } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api, { callApi } from "@services/api";

// Async Thunk để lấy danh sách danh mục phông
export const fetchTemplateCategories = createAsyncThunk(
  "generalCategories/fetchAll",
  async (
    { page = 1, limit = 25, query, code, sort } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
      };
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      if (query !== "" && code && sort) {
        const { data } = await api.get(`${API_LIST_GENERALCATEGORIES}`, {
          params,
        });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(`${API_LIST_GENERALCATEGORIES}`, {
          params: { page, limit, sort },
        });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);

// Async Thunk để thêm danh mục phông mới
export const addApiConfigurationCategory = createAsyncThunk(
  "generalCategories/add",
  async (newCategory, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `${API_LIST_GENERALCATEGORIES}`, // thêm dữ liệu
        newCategory
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error adding category");
    }
  }
);

// Lấy thông tin template theo ID
export const fetchConfigurationAPIById = createAsyncThunk(
  "generalCategories/fetchAPIById",
  async (id, { rejectWithValue }) => {
    try {
      // const response = await fetch(`${API_LIST_GENERALCATEGORIES}/${id}`);
      const response = await callApi(
        "get",
        `${API_LIST_GENERALCATEGORIES}/${id}`
      );
      if (!response.ok) throw new Error("Không tìm thấy phông!");
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Tìm kiếm template theo query và code
export const fetchSearchTemplate = createAsyncThunk(
  "generalCategories/fetchSearchTemplate",
  async ({ query, code }, { rejectWithValue }) => {
    try {
      const queryString = code.map((c) => `${c}=${query}`).join("&");
      const response = await api.get(
        `${API_LIST_GENERALCATEGORIES}?${queryString}`
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
  "generalCategories/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`${API_LIST_GENERALCATEGORIES}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);

// Async Thunk để cập nhật danh mục phông
export const updateConfigurationAPI = createAsyncThunk(
  "generalCategories/update",
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `${API_LIST_GENERALCATEGORIES}/${id}`,
        updatedData
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error updating category");
    }
  }
);

// Slice Redux
const apiConfiguration = createSlice({
  name: "generalCategories",
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
      });
  },
});

export default apiConfiguration.reducer;
