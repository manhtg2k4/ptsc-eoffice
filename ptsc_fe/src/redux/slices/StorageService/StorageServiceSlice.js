import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { API_STORAGE_SERVICE } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

// 🧩 Thunk: Gọi API lấy cấu hình storage (GET)
export const getStorageConfig = createAsyncThunk(
  "storage/getStorageConfig",
  async (params, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      };

      const response = await api.get(API_STORAGE_SERVICE, config);

      return response.data?.data || response.data;
    } catch (error) {
      logger.error("❌ Lỗi khi lấy cấu hình Storage:", error);
      return rejectWithValue(
        error.response?.data || "Lỗi khi lấy cấu hình Storage"
      );
    }
  }
);

// 🧩 Thunk: Gọi API cập nhật cấu hình storage (PUT)
export const updateStorageConfig = createAsyncThunk(
  "storage/updateStorageConfig",
  async (payload, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await api.put(API_STORAGE_SERVICE, payload, config);

      return response.data?.data || response.data;
    } catch (error) {
      logger.error("❌ Lỗi khi cập nhật Storage Config:", error);
      return rejectWithValue(
        error.response?.data || "Lỗi khi cập nhật Storage Config"
      );
    }
  }
);

const storageServiceSlice = createSlice({
  name: "storage",
  initialState: {
    config: null,
    loading: false,
    updating: false,
    error: null,
  },
  reducers: {
    resetStorageConfig: (state) => {
      state.config = null;
      state.loading = false;
      state.updating = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ===== GET Storage Config =====
      .addCase(getStorageConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStorageConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.config = action.payload;
        logger.log("✅ Storage Config loaded:", action.payload);
      })
      .addCase(getStorageConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        logger.error("❌ Error loading Storage Config:", action.payload);
      })
      // ===== UPDATE Storage Config =====
      .addCase(updateStorageConfig.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateStorageConfig.fulfilled, (state, action) => {
        state.updating = false;
        state.config = action.payload;
        logger.log("✅ Storage Config updated:", action.payload);
      })
      .addCase(updateStorageConfig.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
        logger.error("❌ Error updating Storage Config:", action.payload);
      });
  },
});

export const { resetStorageConfig } = storageServiceSlice.actions;
export default storageServiceSlice.reducer;
