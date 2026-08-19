/* eslint-disable  */
import React from "react";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  API_GET_VIEW_CONFIG,
  API_SETUP_COLUMNS,
} from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";

export const getViewConfig = createAsyncThunk(
  "viewConfig/getViewConfig",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`${API_GET_VIEW_CONFIG}?limit=500`);
      localStorage.setItem("viewConfig", JSON.stringify(res));
      return res;
    } catch (error) {
      const message =
        error?.errors?.map((e) => e.message).join("\n") ||
        "Lỗi khi gọi dữ liệu view config!";
      logger.log("error", message);
      return rejectWithValue(message);
    }
  }
);

export const settingViewConfig = createAsyncThunk(
  "viewConfig/settingViewConfig",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(
        `${API_GET_VIEW_CONFIG}/${id}`,
        payload
      );
      return res;
    } catch (error) {
      const message =
        error?.errors?.map((e) => e.message).join("\n") ||
        "Cập nhật ViewConfig thất bại!";
      logger.log("error", message);
      return rejectWithValue(message);
    }
  }
);

const viewConfigSlice = createSlice({
  name: "viewConfig",
  initialState: {
    dataViewConfig: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearViewConfig: (state) => {
      state.data = null;
      state.error = null;
      localStorage.removeItem("viewConfig");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getViewConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getViewConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.dataViewConfig = action.payload;
      })
      .addCase(getViewConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Có lỗi xảy ra";
      })
      .addCase(settingViewConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.dataViewConfig = action.payload;
        localStorage.setItem("viewConfig", JSON.stringify(action.payload));
      })
      .addCase(settingViewConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Cập nhật view config thất bại";
      });
  },
});

export default viewConfigSlice.reducer;
