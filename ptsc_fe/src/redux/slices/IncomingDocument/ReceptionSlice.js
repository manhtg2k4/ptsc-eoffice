// ReceptionSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { API_INCOMMINGDOCUMENT_RECEPTION } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

// Async thunk để gọi API lấy danh sách reception
export const getListReceptionDocuments = createAsyncThunk(
  "receptionDocuments/getListReceptionDocuments",
  async (params, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();

      // Thêm từng param vào query string
      Object.keys(params || {}).forEach((key) => {
        const value = params[key];

        // Bỏ qua các giá trị null/undefined
        if (value === null || value === undefined) {
          return;
        }

        // Nếu value là array, thêm từng item
        if (Array.isArray(value)) {
          value.forEach((item) => {
            queryParams.append(key, item);
          });
        } else {
          // Nếu là giá trị đơn, thêm trực tiếp
          queryParams.append(key, value);
        }
      });

      const data = await api.get(
        `${API_INCOMMINGDOCUMENT_RECEPTION}?${queryParams.toString()}`
      );

      return {
        data: data?.data?.items || [],
        total: data?.total || 0,
        page: data?.page || 1,
        totalPages: data?.totalPages || 1,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Lỗi khi lấy danh sách văn bản reception"
      );
    }
  }
);

const receptionSlice = createSlice({
  name: "receptionDocuments",
  initialState: {
    listReceptionDocuments: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getListReceptionDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getListReceptionDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.listReceptionDocuments = action.payload;
      })
      .addCase(getListReceptionDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default receptionSlice.reducer;
