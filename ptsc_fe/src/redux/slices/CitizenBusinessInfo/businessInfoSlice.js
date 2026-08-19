import { API_BUSINESS_INFO } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";
 

// Fetch danh sách business
export const fetchListBusiness = createAsyncThunk(
  "businessInfo/fetchAll",
  async (
    { query, code, page = 1, limit = 999999999, sort, statusEnterprise },
    { rejectWithValue }
  ) => {
    try {
      const params = { page, limit, sort, statusEnterprise };

      // Xóa các tham số rỗng hoặc null để không gửi lên server
      Object.keys(params).forEach(
        (key) => (params[key] === null || params[key] === undefined || params[key] === "") && delete params[key]
      );

      // Xử lý tham số tìm kiếm chính (tên, mst, email)
      if (query && code) {
        // Nếu `code` là một mảng các trường, áp dụng query cho mỗi trường
        if (Array.isArray(code)) {
          code.forEach((field) => {
            params[field] = query;
          });
        } else {
          // Nếu `code` là một chuỗi cho một trường duy nhất
          params[code] = query;
        }
      }

      const { data } = await api.get(`${API_BUSINESS_INFO}`, { params });
      return { data: data?.data || [], total: data?.total || 0 };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Lỗi khi lấy danh sách"
      );
    }
  }
);

export const exportBusiness = createAsyncThunk(
  "citizenInfo/exportBusiness",
  async ({ query, code, page = 1, limit = 999999999, sort }, { rejectWithValue }) => {
    try {
      const params = {
        page,
        limit,
        sort
      };
      
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query;
        });
      }
      
      const response = await api.get(`${API_BUSINESS_INFO}/export`, { 
        params,
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Lỗi khi xuất dữ liệu"
      );
    }
  }
);

// Fetch chi tiết business
export const getDetailBusiness = createAsyncThunk(
  "businessInfo/fetchDetail",
  async ({ id }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${API_BUSINESS_INFO}/${id}`);
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Lỗi khi lấy chi tiết"
      );
    }
  }
);
// Slice Redux
const businessInfoSlice = createSlice({
  name: "businessInfo",
  initialState: {
    listBusinessInfo: [], // Danh sách business
    businessDetail: null, // Chi tiết của một business
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Xử lý Fetch List
      .addCase(fetchListBusiness.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchListBusiness.fulfilled, (state, action) => {
        state.loading = false;
        state.listBusinessInfo = action.payload;
      })
      .addCase(fetchListBusiness.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(exportBusiness.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportBusiness.fulfilled, (state) => {
        state.loading = false;

      })
      .addCase(exportBusiness.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Xử lý Fetch Detail
      .addCase(getDetailBusiness.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDetailBusiness.fulfilled, (state, action) => {
        state.loading = false;
        state.businessDetail = action.payload; // Lưu vào businessDetail
      })
      .addCase(getDetailBusiness.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default businessInfoSlice.reducer;
