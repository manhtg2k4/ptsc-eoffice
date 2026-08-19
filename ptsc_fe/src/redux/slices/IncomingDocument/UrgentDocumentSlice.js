// UrgentDocumentSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { API_INCOMMINGDOCUMENT_PROSSING } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

export const getListUrgentDocuments = createAsyncThunk(
  "urgentDocuments/getListUrgentDocuments",
  async (params, { rejectWithValue }) => {
    try {
      // Truyền tất cả params nhận được vào API
      const data = await api.get(`${API_INCOMMINGDOCUMENT_PROSSING}`, {
        params,
      });

      return {
        data: data?.data?.items || [],
        total: data?.total || 0,
        page: data?.page || 1,
        totalPages: data?.totalPages || 1,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Lỗi khi lấy danh sách tài liệu"
      );
    }
  }
);

const urgentDocumentSlice = createSlice({
  name: "urgentDocuments",
  initialState: {
    listUrgentDocuments: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getListUrgentDocuments.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListUrgentDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.listUrgentDocuments = action.payload;
      })
      .addCase(getListUrgentDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default urgentDocumentSlice.reducer;
