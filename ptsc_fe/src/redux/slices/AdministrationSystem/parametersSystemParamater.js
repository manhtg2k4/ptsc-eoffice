import { API_DELETE_PARAMETER_SYSTEM_MANAGERMANT, API_UPDATE_PARAMETER_SYSTEM_MANAGERMANT, API_CREATE_PARAMETER_SYSTEM_MANAGERMANT, API_GET_LIST_PARAMETER_SYSTEM_MANAGERMANT, API_PARAMETER_SYSTEM_MANAGERMANT_BY_ID } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";
 
// import { callApi } from "../../../services/api"; // Using axios for consistency
// Async Thunk để lấy danh sách danh mục phông
export const fetchTemplateCategories = createAsyncThunk(
  "apiConfiguration/fetchAll",
  async (apiParams, { rejectWithValue }) => {
    try {
      // Component `index.js` đã chuẩn bị sẵn các tham số,
      // thunk chỉ việc thực hiện gọi API.
      const { data } = await api.get(
        `${API_GET_LIST_PARAMETER_SYSTEM_MANAGERMANT}`,
        {
          // Sử dụng trực tiếp các tham số đã được xử lý từ component
          params: apiParams,
        }
      );
      // Trả về toàn bộ đối tượng data từ api.
      // Component sẽ tự xử lý để lấy ra danh sách và tổng số bản ghi.
      // Cấu trúc trả về của API: { success: true, data: { data: [...], total: ... } }
      // `data` ở đây chính là đối tượng trên.
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy danh sách"
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
        `${API_CREATE_PARAMETER_SYSTEM_MANAGERMANT}`, // thêm dữ liệu
        newCategory
      );
      // Return the whole data object for consistency.
      // The component will unwrap the final object from response.data.data
      return response.data;
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
      // Use axios for consistency with other thunks
      const response = await api.get(
        `${API_PARAMETER_SYSTEM_MANAGERMANT_BY_ID}/${id}`
      );
      // axios automatically throws for non-2xx responses
      // The API response is in response.data
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
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
        `${API_GET_LIST_PARAMETER_SYSTEM_MANAGERMANT}?${queryString}`
      );
      // logger.log(response.data[0]);
      // The thunk should return the same structure as fetchTemplateCategories
      // to ensure consistency for any component that might use it.
      return response.data;
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
      await api.delete(`${API_DELETE_PARAMETER_SYSTEM_MANAGERMANT}/${id}`);
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
        `${API_UPDATE_PARAMETER_SYSTEM_MANAGERMANT}/${id}`,
        updatedData
      );
      // Return the whole data object for consistency.
      // The component will get the updated object from the action payload.
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error updating category");
    }
  }
);

// Slice Redux
const apiConfiguration = createSlice({
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
        // The payload is { success: true, data: { data: [...], total: ... } }
        state.categories = action.payload.data?.data || [];
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
        // The payload is { success: true, data: { ...record... } }
        state.selectedTemplate = action.payload.data ?? null;
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
        // FIX: Ensure consistency by correctly parsing the payload object
        state.categories = action.payload.data?.data || [];
      })
      .addCase(fetchSearchTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Có lỗi xảy ra";
      })

      // Xử lý Add
      .addCase(addApiConfigurationCategory.fulfilled, (state, action) => {
        if (action.payload) {
          // The actual new category is in action.payload.data
          const newCategory = action.payload.data;
          state.categories = Array.isArray(state.categories) ? state.categories : [];
          state.categories.push(newCategory);
        }
      })

      // Xử lý Delete
      .addCase(deleteConfigurationAPI.fulfilled, (state, action) => {
        if (Array.isArray(state.categories)) {
          state.categories = state.categories.filter((cat) => cat._id !== action.payload);
        }
      })

      // Xử lý Update
      .addCase(updateConfigurationAPI.fulfilled, (state, action) => {
        if (!Array.isArray(state.categories)) {
          state.categories = []; // Hoặc gán giá trị mặc định
        }

        const updatedCategory = action.payload.data;
        const index = state.categories.findIndex(
          (cat) => cat._id === updatedCategory?._id
        );

        if (index !== -1) {
          state.categories[index] = updatedCategory;
        }
      });
  },
});

export default apiConfiguration.reducer;
