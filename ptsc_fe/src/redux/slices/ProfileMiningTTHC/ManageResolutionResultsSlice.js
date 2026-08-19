import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// eslint-disable-next-line camelcase
import {
  API_GET_FILE,
  API_GET_LIST_RESOLUTION_RESULTS_CONGDAN,
  API_GET_LIST_RESOLUTION_RESULTS_DOANHNGHIEP,
  API_GET_LIST_RESOLUTION_RESULTS_ID,
  API_GETDETAIL_FILE,
  API_GET_LIST_RESOLUTION_RESULTS_TYPEPROCEDURE,
} from "@EnvironmentFile/constants/urlConfig";
import { format } from "date-fns";
import api from "@services/api";

export const fetchListManageResolutionResults = createAsyncThunk(
  "manageResolutionResults/fetchAll",
  async (
    {
      citizenCode,
      procedureResultCode,
      query,
      code,
      page = 1,
      limit = 25,
      sort,
      startDate,
      endDate,
    },
    { rejectWithValue }
  ) => {
    const startDateFormat = startDate
      ? format(new Date(startDate), "yyyy-MM-dd")
      : undefined;
    const endDateFormat = endDate
      ? format(new Date(endDate), "yyyy-MM-dd")
      : undefined;
    try {
      const params = {
        page,
        limit,
        sort,
        startDate: startDateFormat,
        endDate: endDateFormat,
        citizenCode,
        procedureResultCode,
      };

      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query;
        });
      }
      if (query !== "" && code && sort) {
        const { data } = await api.get(
          `${API_GET_LIST_RESOLUTION_RESULTS_CONGDAN}`,
          {
            params,
          }
        );
        return {
          data: data?.dataFinal || [],
          total: data?.totalItems || 0,
        };
      } else {
        const { data } = await api.get(
          `${API_GET_LIST_RESOLUTION_RESULTS_CONGDAN}`,
          {
            params: {
              citizenCode,
              page,
              limit,
              sort,
              startDate: startDateFormat,
              endDate: endDateFormat,
              procedureResultCode,
            },
          }
        );
        return {
          data: data?.dataFinal || [],
          total: data?.totalItems || 0,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Lỗi khi tìm kiếm tài liệu"
      );
    }
  }
);

export const fetchListManageBusinessResolutionResults = createAsyncThunk(
  "manageResolutionResultsBusiness/fetchAll",
  async (
    {
      enterpriseTaxCode,
      procedureResultCode,
      query,
      code,
      page = 1,
      limit = 25,
      sort,
      startDate,
      endDate,
    },
    { rejectWithValue }
  ) => {
    const startDateFormat = startDate
      ? format(new Date(startDate), "yyyy-MM-dd")
      : undefined;
    const endDateFormat = endDate
      ? format(new Date(endDate), "yyyy-MM-dd")
      : undefined;
    try {
      const params = {
        page,
        limit,
        sort,
        startDate: startDateFormat,
        endDate: endDateFormat,
        enterpriseTaxCode,
        procedureResultCode,
      };

      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query;
        });
      }
      if (query !== "" && code && sort) {
        const { data } = await api.get(
          `${API_GET_LIST_RESOLUTION_RESULTS_DOANHNGHIEP}`,
          {
            params,
          }
        );
        return {
          data: data?.dataFinal || [],
          total: data?.totalItems || 0,
        };
      } else {
        const { data } = await api.get(
          `${API_GET_LIST_RESOLUTION_RESULTS_DOANHNGHIEP}`,
          {
            params: {
              enterpriseTaxCode,
              page,
              limit,
              sort,
              startDate: startDateFormat,
              endDate: endDateFormat,
              procedureResultCode,
            },
          }
        );
        return {
          data: data?.dataFinal || [],
          total: data?.totalItems || 0,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Lỗi khi tìm kiếm tài liệu"
      );
    }
  }
);
export const getDetailManageResolutionResults = createAsyncThunk(
  "manageResolutionResults/fetchDetail",
  async ({ id }, { rejectWithValue }) => {
    try {
      if (!id) {
        throw new Error("ID không được cung cấp");
      }
      const { data } = await api.get(
        `${API_GET_LIST_RESOLUTION_RESULTS_ID}/${id}`
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Lỗi khi lấy chi tiết"
      );
    }
  }
);

export const getListTypeProcedure = createAsyncThunk(
  "manageResolutionResults/getListTypeProcedure",
  async (_, { rejectWithValue }) => {
    try {
      // eslint-disable-next-line camelcase
      const { data } = await api.get(
        `${API_GET_LIST_RESOLUTION_RESULTS_TYPEPROCEDURE}`
      ); // để im cái này nhé quy trình nó đg tạo từ api này
      return data.data || []; // API trả về danh sách loại thủ tục
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Lỗi khi lấy danh sách loại thủ tục"
      );
    }
  }
);

export const downloadFilesManage = createAsyncThunk(
  "files/download",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`${API_GET_FILE}/${id}`, {
        responseType: "blob", // API trả về blob nếu thành công
      });

      // Nếu API trả về blob (tệp), trả về blob
      return response.data; // Blob sẽ được xử lý ở phía component
    } catch (error) {
      // Nếu API trả về lỗi, parse response thành JSON và trả về thông báo lỗi
      if (error.response && error.response.data) {
        // Đọc Blob thành JSON
        const errorData = await error.response.data.text(); // Chuyển Blob thành chuỗi
        const parsedError = JSON.parse(errorData); // Parse chuỗi thành JSON
        return rejectWithValue(parsedError); // Trả về object JSON serialize được
      }
      return rejectWithValue({ success: false, message: "Unknown error" });
    }
  }
);

export const getDetailFileManage = createAsyncThunk(
  "files/getDetailFile",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`${API_GETDETAIL_FILE}/${id}`);
      return response.data || {}; // API trả về danh sách file { id, name }
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi tải ảnh lên!");
    }
  }
);

// Slice Redux
const ManageResolutionResultsSlice = createSlice({
  name: "ManageResolutionResults",
  initialState: {
    listManageResolutionResults: [],
    typeProcedures: [], // Thêm state để lưu danh sách typeProcedure
    manageResolutionResultsDetail: null,
    loadingList: false,
    loadingDetail: false,
    loadingTypeProcedures: false, // Thêm state loading cho danh sách typeProcedure
    error: null,
  },

  reducers: {},
  extraReducers: (builder) => {
    builder
      // Xử lý Fetch List
      .addCase(fetchListManageResolutionResults.pending, (state) => {
        state.loadingList = true;
        state.error = null;
      })
      .addCase(fetchListManageResolutionResults.fulfilled, (state, action) => {
        state.loadingList = false;
        state.listManageResolutionResults = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(fetchListManageResolutionResults.rejected, (state, action) => {
        state.loadingList = false;
        state.error = action.payload;
      })
      // Xử lý Fetch Detail
      .addCase(getDetailManageResolutionResults.pending, (state) => {
        state.loadingDetail = true;
        state.error = null;
      })
      .addCase(getDetailManageResolutionResults.fulfilled, (state, action) => {
        state.loadingDetail = false;
        state.manageResolutionResultsDetail = action.payload;
      })

      .addCase(getDetailManageResolutionResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Xử lý fetch danh sách typeProcedure
      .addCase(getListTypeProcedure.pending, (state) => {
        state.loadingTypeProcedures = true;
        state.error = null;
      })
      .addCase(getListTypeProcedure.fulfilled, (state, action) => {
        state.loadingTypeProcedures = false;
        state.typeProcedures = action.payload; // Lưu danh sách typeProcedure
      })
      .addCase(getListTypeProcedure.rejected, (state, action) => {
        state.loadingTypeProcedures = false;
        state.error = action.payload;
      });
  },
});

export default ManageResolutionResultsSlice.reducer;
