import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { API_NETWORK_ADMINISTRATION } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

//Lấy danh sách Danh mục quận, huyện, thị xã
export const getDataNetworkAdministration = createAsyncThunk(
	"getDataNetworkAdministration/getAll",
	async ({ page = 1, limit = 25, query, code, sort } = {}, { rejectWithValue }) => {
		try {
			// Bắt đầu với các tham số cơ bản
			const params = {
				page,
				limit,
			};

			// Thêm tham số sắp xếp nếu có
			if (sort) {
				params.sort = sort;
			}

			// Thêm tham số tìm kiếm nếu có
			if (query && Array.isArray(code) && code.length > 0) {
				code.forEach((field) => {
					params[field] = query;
				});
			}

			const { data } = await api.get(`${API_NETWORK_ADMINISTRATION}`, { params });
			return { data: data?.data || [], total: data?.total || 0 };
		} catch (error) {
			return rejectWithValue(error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành");
		}
	}
);

export const addNetworkAdministration = createAsyncThunk(
  "addNetworkAdministration/add",
  async (dataUnit, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_NETWORK_ADMINISTRATION}`, dataUnit);
      return response.data; // Dữ liệu từ API
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi thêm mói quản trị mạng");
    }
  }
);

export const updateNetworkAdministration = createAsyncThunk(
  "updateNetworkAdministration/update",
  async ({ updatedData }, { rejectWithValue }) => {
    try {
	 const response = await api.patch(
	   `${API_NETWORK_ADMINISTRATION}`,
	   updatedData
	 );
	 return response.data;
    } catch (error) {
	 return rejectWithValue(error.response?.data || "Lỗi khi cập nhật vai trò");
    }
  }
);
export const deleteNetworkAdministration = createAsyncThunk(
  "deleteNetworkAdministration/delete",
  async (ids, { rejectWithValue }) => {
    try {
      const response = await api.delete(`${API_NETWORK_ADMINISTRATION}`, {
        data: { ids },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi xóa vai trò");
    }
  }
);

export const getDetailNetworkAdministration = createAsyncThunk(
	"getDetailNetworkAdministration/getById",
	async (id, { rejectWithValue }) => {
		try {
			const { data } = await api.get(`${API_NETWORK_ADMINISTRATION}/${id}`);
			return data; // Giả sử API trả về { success: true, data: {...} }
		} catch (error) {
			return rejectWithValue(error.response?.data || error.message || "Lỗi khi lấy chi tiết");
		}
	}
)

const listNetworkAdministrationSlice = createSlice({
	name: "listNetworkAdministration",
	initialState: {
		listNetwork: [],
		detailNetwork: null,
		loading: false,
		error: null
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(getDataNetworkAdministration.pending, (state) => {
				state.loading = true
			})
			.addCase(getDataNetworkAdministration.fulfilled, (state, action) => {
				state.loading = false;
				state.listNetwork = action.payload
			})
			.addCase(getDataNetworkAdministration.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message
			})

			.addCase(addNetworkAdministration.pending, (state) => {
				state.loading = true
			})
			.addCase(addNetworkAdministration.fulfilled, (state) => {
				state.loading = false;
			})
			.addCase(addNetworkAdministration.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message
			})

			.addCase(updateNetworkAdministration.pending, (state) => {
				state.loading = true
			})
			.addCase(updateNetworkAdministration.fulfilled, (state) => {
				state.loading = false;
			})
			.addCase(updateNetworkAdministration.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message
			})
			// Xử lý lấy chi tiết
			.addCase(getDetailNetworkAdministration.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getDetailNetworkAdministration.fulfilled, (state, action) => {
				state.loading = false;
				state.detailNetwork = action.payload;
			})
			.addCase(getDetailNetworkAdministration.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	}
})

export default listNetworkAdministrationSlice.reducer
