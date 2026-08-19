import {
  API_CITIZEN_INFO,
} from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";
 

export const fetchListCitizen = createAsyncThunk(
  "citizenInfo/getAll",
  async ({ query, code, page = 1, limit = 9999999999, sort }, { rejectWithValue }) => {
    // logger.log("Query:", query, "Fields:", code);
    try {
      const params = {
        page,
        limit,
        sort
      };
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      const { data } = await api.get(`${API_CITIZEN_INFO}`, { params });
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

// export const exportCitizen = createAsyncThunk(
//   "citizenInfo/exportCitizen",
//   async ({ query, code, page = 1, limit = 25, sort }, { rejectWithValue }) => {
//     // logger.log("Query:", query, "Fields:", code);
//     try {
//       const params = {
//         page,
//         limit,
//         sort
//       };
//       // Thêm query cho từng trường trong mảng code
//       if (Array.isArray(code)) {
//         code.forEach((field) => {
//           params[field] = query; // Tạo param riêng cho từng field
//         });
//       }
//       const { data } = await api.get(`${API_CITIZEN_INFO}/export`, { params });
//       return {
//         data: data?.data || [],
//         total: data?.total || 0,
//       };
//     } catch (error) {
//       return rejectWithValue(
//         error.response?.data?.message || "Lỗi khi tìm kiếm tài liệu"
//       );
//     }
//   }
// );


export const exportCitizen = createAsyncThunk(
  "citizenInfo/exportCitizen",
  async ({ query, code, page = 1, limit = 99999999, sort }, { rejectWithValue }) => {
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
      
      const response = await api.get(`${API_CITIZEN_INFO}/export`, { 
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
export const getDetailCitizen = createAsyncThunk(
  "citizenInfo/fetchDetail",
  async ({ id }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${API_CITIZEN_INFO}/${id}`);
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Lỗi khi lấy chi tiết"
      );
    }
  }
);

// Slice Redux
const citizenInfoSlice = createSlice({
  name: "citizenInfo",
  initialState: {
    listCitizenInfo: [],
    citizenDetail: null, 
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Xử lý Fetch
      .addCase(fetchListCitizen.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchListCitizen.fulfilled, (state, action) => {

        state.loading = false;
        state.listCitizenInfo = action.payload;
      })
      .addCase(fetchListCitizen.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })


      .addCase(exportCitizen.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportCitizen.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportCitizen.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      

      // Xử lý Fetch Detail
      .addCase(getDetailCitizen.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDetailCitizen.fulfilled, (state, action) => {
        state.loading = false;
        state.citizenDetail = action.payload;
      })
      .addCase(getDetailCitizen.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default citizenInfoSlice.reducer;
