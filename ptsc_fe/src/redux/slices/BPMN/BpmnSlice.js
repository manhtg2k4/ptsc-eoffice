import { API_ADD_FIELD_BPMN } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";
 

// Thêm mới field
export const addFieldBpmn = createAsyncThunk(
	"bpmn/addField",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const response = await api.post(`${API_ADD_FIELD_BPMN}/${id}/fields`, body);
			return response.data.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || "Lỗi khi thêm mới");
		}
	}
);


export const fetchListFormBpmn = createAsyncThunk(
	"bpmn/fetchAll",
	async ({ query, code, page = 1, limit = 999999999, sort }, { rejectWithValue }) => {
		try {
			const params = { page, limit, sort };
			if (Array.isArray(code)) {
				code.forEach((field) => {
					params[field] = query;
				});
			}
			const token = localStorage.getItem("token");
			const headers = token ? { Authorization: `Bearer ${token}` } : {};

			const { data } = await api.get(`${API_ADD_FIELD_BPMN}`, {
				params,
				headers,
			});

			return { data: data?.data || [], total: data?.total || 0 };
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message || "Lỗi khi lấy danh sách"
			);
		}
	}
);


export const addFormBpmn = createAsyncThunk(
	"bpmn/addForm",
	async (body, { rejectWithValue }) => {
		try {
			const response = await api.post(`${API_ADD_FIELD_BPMN}`, body);
			return response.data.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || "Lỗi khi thêm mới");
		}
	}
);


// // Xem chi tiết theo ID
// export const getDetailBoxManagementById = createAsyncThunk(
// 	"bpmn/getDetailBoxManagementById",
// 	async (id, { rejectWithValue }) => {
// 		try {
// 			const response = await api.get(`${API_GET_BOX_MANAGEMENT}/${id}`);
// 			return response.data; // Axios tự parse JSON
// 		} catch (error) {
// 			// return rejectWithValue(
// 			//     error.response?.data?.message || "Không tìm thấy tài liệu!"
// 			// );
// 			return rejectWithValue(error.response?.data || "Không tìm thấy tài liệu");
// 		}
// 	}
// );

// // Cập nhật tài liệu
// export const updateBoxManagement = createAsyncThunk(
// 	"bpmn/update",
// 	async ({ id, updatedData }, { rejectWithValue }) => {
// 		try {
// 			const response = await api.put(
// 				`${API_GET_BOX_MANAGEMENT}/${id}`,
// 				updatedData
// 			);
// 			return response.data.data;
// 		} catch (error) {
// 			return rejectWithValue(
// 				error?.response?.data?.errors || "Cập nhật thất bại!"
// 			);
// 		}
// 	}
// );

// Xóa tài liệu
export const deleteBpmn = createAsyncThunk(
	"bpmn/delete",
	async (ids, { rejectWithValue }) => {
		try {
			// Thay đổi để xóa bằng _id thay vì ids.ids
			const response = await api.delete(
				`${API_ADD_FIELD_BPMN}/${ids?.ids}`,
			);
			return response.data; // { success: true }
		} catch (error) {
			return rejectWithValue(error.response?.data || "Lỗi khi xóa");
		}
	}
);

const bpmnSlice = createSlice({
	name: "bpmn",
	initialState: {
		listFieldBpmn: [],
		listFormBpmn: [],
		listPostBoxInShelf: [],
		listProfiles: [],
		listFileInBoxIsNull: [],
		listFonds: [],
		loading: false,
		selectedDocumentTypeGroup: null,
		detailShelfManagementByIdAndCode: null,
		searchDocumentTypeGroup: null,
		success: null,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(addFieldBpmn.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(addFieldBpmn.fulfilled, (state, action) => {
				state.loading = false;

				if (!state.listFieldBpmn || !Array.isArray(state.listFieldBpmn)) {
					state.listFieldBpmn = [];
				}

				state.listFieldBpmn.unshift(action.payload);
			})
			.addCase(addFieldBpmn.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})

			.addCase(fetchListFormBpmn.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchListFormBpmn.fulfilled, (state, action) => {
				state.loading = false;
				state.listFormBpmn = action.payload;
			})
			.addCase(fetchListFormBpmn.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})

			.addCase(addFormBpmn.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(addFormBpmn.fulfilled, (state) => {
				state.loading = false;
				// state.listFormBpmn = action.payload;
			})
			.addCase(addFormBpmn.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export default bpmnSlice.reducer;
