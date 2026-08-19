import { API_CUSTOM_SENDER_UNITS } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

// Lấy danh sách đơn vị gửi tùy chỉnh của user hiện tại
export const getCustomSenderUnits = createAsyncThunk(
  "customSenderUnit/getAll",
  async (
    { page = 1, limit = 500, name } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = { page, limit };
      if (name) params.name = name;
      const { data } = await api.get(API_CUSTOM_SENDER_UNITS, { params });
      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy danh sách đơn vị gửi"
      );
    }
  }
);

// Lấy tất cả đơn vị gửi tùy chỉnh (dành cho văn thư/admin)
export const getAllCustomSenderUnits = createAsyncThunk(
  "customSenderUnit/getAllAdmin",
  async (
    { page = 1, limit = 500, name } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = { page, limit };
      if (name) params.name = name;
      const { data } = await api.get(`${API_CUSTOM_SENDER_UNITS}/all`, { params });
      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy danh sách đơn vị gửi"
      );
    }
  }
);

// Lấy chi tiết đơn vị gửi
export const getCustomSenderUnitDetail = createAsyncThunk(
  "customSenderUnit/getDetail",
  async ({ id, source }, { rejectWithValue }) => {
    try {
      const params = {};
      if (source) params.source = source;
      const res = await api.get(`${API_CUSTOM_SENDER_UNITS}/${id}`, { params });
      return res.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy chi tiết đơn vị gửi"
      );
    }
  }
);

// Thêm mới đơn vị gửi tùy chỉnh
export const addCustomSenderUnit = createAsyncThunk(
  "customSenderUnit/add",
  async (dataUnit, { rejectWithValue }) => {
    try {
      const response = await api.post(API_CUSTOM_SENDER_UNITS, dataUnit);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.response?.data || "Lỗi khi thêm đơn vị gửi!"
      );
    }
  }
);

// Cập nhật đơn vị gửi
export const updateCustomSenderUnit = createAsyncThunk(
  "customSenderUnit/update",
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `${API_CUSTOM_SENDER_UNITS}/${id}`,
        updatedData
      );
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Lỗi khi cập nhật đơn vị gửi"
      );
    }
  }
);

// Xóa đơn vị gửi
export const deleteCustomSenderUnit = createAsyncThunk(
  "customSenderUnit/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`${API_CUSTOM_SENDER_UNITS}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Lỗi khi xóa đơn vị gửi"
      );
    }
  }
);

// Xóa nhiều đơn vị gửi
export const deleteMultipleCustomSenderUnits = createAsyncThunk(
  "customSenderUnit/deleteMultiple",
  async (ids, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_CUSTOM_SENDER_UNITS}/delete-multiple`, { ids });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Lỗi khi xóa đơn vị gửi"
      );
    }
  }
);

const customSenderUnitSlice = createSlice({
  name: "customSenderUnit",
  initialState: {
    listCustomSenderUnits: [],
    detailCustomSenderUnit: null,
    loading: false,
    error: null,
    total: 0,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // getCustomSenderUnits
      .addCase(getCustomSenderUnits.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomSenderUnits.fulfilled, (state, action) => {
        state.loading = false;
        state.listCustomSenderUnits = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(getCustomSenderUnits.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // getAllCustomSenderUnits
      .addCase(getAllCustomSenderUnits.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllCustomSenderUnits.fulfilled, (state, action) => {
        state.loading = false;
        state.listCustomSenderUnits = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(getAllCustomSenderUnits.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // getCustomSenderUnitDetail
      .addCase(getCustomSenderUnitDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomSenderUnitDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.detailCustomSenderUnit = action.payload;
      })
      .addCase(getCustomSenderUnitDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // addCustomSenderUnit
      .addCase(addCustomSenderUnit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCustomSenderUnit.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addCustomSenderUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updateCustomSenderUnit
      .addCase(updateCustomSenderUnit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomSenderUnit.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateCustomSenderUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // deleteCustomSenderUnit
      .addCase(deleteCustomSenderUnit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomSenderUnit.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteCustomSenderUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default customSenderUnitSlice.reducer;
