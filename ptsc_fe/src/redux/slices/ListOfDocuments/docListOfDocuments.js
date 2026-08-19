import {
  API_CHECK_FORMAT_DOCCUMENT,
  API_CHECK_NOW,
  //   API_LIST_OF_DOCUMENT,
  API_DOCUMENT_TRANSFERS,
  API_GET_SELECT_DOCTYPE,
  API_LIST_OF_DOCUMENT,
  API_SCHEDULE_A_TEST,
  API_SCHEDULE_A_TESTS,
  API_UPDATE_HOUR_NOW,
} from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

//Danh sách
export const fetchListOfDocuments = createAsyncThunk(
  "Reusable/fetchReusable",
  async (
    { query, code, page = 1, limit = 25, sort, status },
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
        status,
      };
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query;
        });
      }
      const { data } = await api.get(`${API_LIST_OF_DOCUMENT}`, {
        params,
      }); // call API test
      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Lỗi khi tìm kiếm tài liệu"
      );
    }
  }
);

export const getDocManagement = createAsyncThunk(
  "docManagements/fetchDetailRecord",
  async ({ id }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${API_DOCUMENT_TRANSFERS}/${id}`);
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Lỗi khi lấy chi tiết"
      );
    }
  }
);
export const checkDocumentFormat = createAsyncThunk(
  "docManagements/checkDocumentFormat",
  async ({ id }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${API_CHECK_FORMAT_DOCCUMENT}/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Lỗi khi lấy chi tiết"
      );
    }
  }
);

export const configDocument = createAsyncThunk(
  "docManagements/config",
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await api.post(API_LIST_OF_DOCUMENT, body);
      return data ?? {};
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.errors.map(({ message }) => message).join(", ") ??
          "Lỗi khi cấu hình"
      );
    }
  }
);

export const sheduleDocument = createAsyncThunk(
  "docManagements/shedule",
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await api.post(API_SCHEDULE_A_TEST, body);
      return data ?? {};
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.errors.map(({ message }) => message).join(", ") ??
          "Lỗi khi cấu hình"
      );
    }
  }
);

export const sheduleDocuments = createAsyncThunk(
  "docManagements/shedules",
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await api.post(API_SCHEDULE_A_TESTS, body);
      return data ?? {};
    } catch (error) {
      const errors = error.response?.data?.errors;
      if (Array.isArray(errors)) {
        return rejectWithValue(errors.map(({ message }) => message).join(", "));
      }
      return rejectWithValue(
        error.response?.data?.message || error.message || "Lỗi khi cấu hình"
      );
    }
  }
);

export const sheduleDocumentCheckNow = createAsyncThunk(
  "docManagements/sheduleDocumentCheckNow",
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await api.post(API_CHECK_NOW, body);
      return data ?? {};
    } catch (error) {
      const errors = error.response?.data?.errors;
      if (Array.isArray(errors)) {
        return rejectWithValue(errors.map(({ message }) => message).join(", "));
      }
      return rejectWithValue(
        error.response?.data?.message || error.message || "Lỗi khi cấu hình"
      );
    }
  }
);
export const sheduleUpdateHourNow = createAsyncThunk(
  "docManagements/sheduleUpdateHourNow",
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await api.post(API_UPDATE_HOUR_NOW, body);
      return data ?? {};
    } catch (error) {
      const errors = error.response?.data?.errors;
      if (Array.isArray(errors)) {
        return rejectWithValue(errors.map(({ message }) => message).join(", "));
      }
      return rejectWithValue(
        error.response?.data?.message || error.message || "Lỗi khi cấu hình"
      );
    }
  }
);
export const getListDocumentTypeSelect = createAsyncThunk(
  "docManagements/getListDocumentTypeSelect",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_SELECT_DOCTYPE}`);
      return res.data.result.valueList;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Lỗi khi lấy danh sách nhóm loại tài liệu"
      );
    }
  }
);
const docManagements = createSlice({
  name: "docManagements",
  initialState: {
    // documentTypeSelect: [],
    listDocTypeSelect: [],
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchListOfDocuments.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchListOfDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchListOfDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(configDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(configDocument.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(configDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Loại hình tài liệu
      .addCase(getListDocumentTypeSelect.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListDocumentTypeSelect.fulfilled, (state, action) => {
        state.loading = false;
        state.listDocTypeSelect = action.payload;
      })
      .addCase(getListDocumentTypeSelect.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});
export default docManagements.reducer;
