import {
  API_DELETE_SETTING_CLEAR_LOG,
  API_GET_DATA_SETTING_CLEAR_LOG,
  API_UPDATE_SETTING_CLEAR_LOG,
} from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const getDataSettingClearLog = createAsyncThunk(
  "settingClearLog/getDataSettingClearLog",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_DATA_SETTING_CLEAR_LOG}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const updateDraftSettingClearLog = createAsyncThunk(
  "settingClearLog/updateDraftSettingClearLog",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.put(
        `${API_UPDATE_SETTING_CLEAR_LOG}`,
        payload
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu file!"
      );
    }
  }
);

export const deleteDraftSettingClearLog = createAsyncThunk(
  "settingClearLog/deleteDraftSettingClearLog",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.delete(`${API_DELETE_SETTING_CLEAR_LOG}/${id}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Xóa bản Draft thất bại!"
      );
    }
  }
);

const SettingClearLogSlice = createSlice({
  name: "settingClearLog",
  initialState: {
    comments: [],
    file: null,
    viewFile: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getDataSettingClearLog.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataSettingClearLog.fulfilled, (state, action) => {
        state.loading = false;
        state.file = action.payload;
      })
      .addCase(getDataSettingClearLog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default SettingClearLogSlice.reducer;
