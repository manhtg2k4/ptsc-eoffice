import {
	API_AUTO_GEN_CODE_WAREHOUSE,
	API_DELETE_REGISTER_FILE,
	API_GET_LIST_UNIT,
	API_GET_LIST_USERS,
	API_GET_LIST_WAREHOUSE_IN_AND_OUT_REGISTER,
	API_GET_SELECT_POSITION,
	API_SHELF_MANAGEMENT,
	API_UPLOAD_FILE_MULTIPLE,
} from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const getLishWarehouseInAndOutRegister = createAsyncThunk(
	"warehouseInAndOutRegister/getLishWarehouseInAndOutRegister",
	async (
		{ page = 1, limit = 25, query, code, sort } = {},
		{ rejectWithValue }
	) => {
		try {
			const params = {
				page,
				limit,
			};
			if (sort) {
				params.sort = sort;
			}
			// Thêm query cho từng trường trong mảng code
			if (query && Array.isArray(code)) {
				code.forEach((field) => {
					params[field] = query; // Tạo param riêng cho từng field
				});
			}
			const { data } = await api.get(
				`${API_GET_LIST_WAREHOUSE_IN_AND_OUT_REGISTER}`,
				{
					params,
				}
			);
			return {
				data: data?.data || [],
				total: data?.total || 0,
			};
		} catch (error) {
			return rejectWithValue(
				error.res?.data || error.message || "Lỗi khi lấy danh sách "
			);
		}
	}
);

// Thêm mới
export const addWarehouseInAndOutRegister = createAsyncThunk(
	"warehouseInAndOutRegister/add",
	async (data, { rejectWithValue }) => {
		try {
			const response = await api.post(
				`${API_GET_LIST_WAREHOUSE_IN_AND_OUT_REGISTER}`,
				data
			);
			return response.data.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || "Lỗi khi thêm mới");
		}
	}
);

// Xem chi tiết theo ID
export const getDetailWarehouseInAndOutRegister = createAsyncThunk(
	"warehouseInAndOutRegister/getDetailWarehouseInAndOutRegister",
	async (id, { rejectWithValue }) => {
		try {
			const response = await api.get(
				`${API_GET_LIST_WAREHOUSE_IN_AND_OUT_REGISTER}/${id}`
			);
			return response.data; // api tự parse JSON
		} catch (error) {
			// return rejectWithValue(
			//     error.response?.data?.message || "Không tìm thấy tài liệu!"
			// );
			return rejectWithValue(error.response?.data || "Không tìm thấy tài liệu");
		}
	}
);

// Tìm kiếm theo query và code
export const fetchSearchBoxManagement = createAsyncThunk(
	"warehouseInAndOutRegister/fetchSearch",
	async ({ query, code, page = 1, limit = 25 }, { rejectWithValue }) => {
		// logger.log("Query:", query, "Fields:", code);
		try {
			const params = {
				page,
				limit,
			};
			// Thêm query cho từng trường trong mảng code
			if (Array.isArray(code)) {
				code.forEach((field) => {
					params[field] = query; // Tạo param riêng cho từng field
				});
			}
			const { data } = await api.get(`${API_GET_LIST_WAREHOUSE_IN_AND_OUT_REGISTER}`, {
				params,
			});
			return {
				data: data?.data || [],
				total: data?.total || 0,
			};
		} catch (error) {
			// return rejectWithValue(
			//     error.response?.data?.message || "Lỗi khi tìm kiếm tài liệu"
			// );
			return rejectWithValue(
				error.response?.data || "Lỗi khi tìm kiếm tài liệu"
			);
		}
	}
);

// Cập nhật tài liệu
export const updateWarehouseInAndOutRegister = createAsyncThunk(
	"warehouseInAndOutRegister/update",
	async ({ id, updatedData }, { rejectWithValue }) => {
		try {
			const response = await api.put(
				`${API_GET_LIST_WAREHOUSE_IN_AND_OUT_REGISTER}/${id}`,
				updatedData
			);
			return response.data.data;
		} catch (error) {
			return rejectWithValue(
				error?.response?.data?.errors || "Cập nhật thất bại!"
			);
		}
	}
);

// upload file ảnh 
export const uploadFilesMultiple = createAsyncThunk(
	"warehouseInAndOutRegister/upload",
	async (files, { rejectWithValue }) => {

		try {
			const formData = new FormData();
			for (let i = 0; i < files.length; i++) {
				formData.append("files", files[i]);  // 👈 key là "files", giống như trong Postman
			}
			const response = await api.post(`${API_UPLOAD_FILE_MULTIPLE}`, formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			return response?.data?.data || {}; // API trả về danh sách file { id, name }
		} catch (error) {
			return rejectWithValue(error.response?.data || "Lỗi khi tải ảnh lên!");
		}
	}
);

// Xóa tài liệu
export const deleteWarehouseInAndOutRegister = createAsyncThunk(
	"warehouseInAndOutRegister/delete",
	async (ids, { rejectWithValue }) => {
		try {
			const response = await api.post(
				`${API_GET_LIST_WAREHOUSE_IN_AND_OUT_REGISTER}/delete-multiple`,
				{
					ids: Array.isArray(ids) ? ids : [ids], // Đảm bảo ids là mảng
				}
			);
			return response.data; // { success: true }
		} catch (error) {
			return rejectWithValue(error.response?.data || "Lỗi khi xóa");
		}
	}
);

//Lấy danh sách select chức vụ
export const getSelectPosition = createAsyncThunk(
	"warehouseInAndOutRegister/getSelectPosition",
	async (_, { rejectWithValue }) => {
		try {
			const response = await api.get(`${API_GET_SELECT_POSITION}`);
			return response.data.result.valueList;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || "Lỗi khi lấy danh sách chức vụ"
			);
		}
	}
);

//Lấy danh sách select kho
export const getSelectWarehouse = createAsyncThunk(
	"warehouseInAndOutRegister/getSelectWarehouse",
	async ({ id, code }, { rejectWithValue }) => {
		try {
			const { data } = await api.get(`${API_SHELF_MANAGEMENT}`, {
				params: { id, code },
			});
			return data?.data || {};
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message || "Lỗi khi lấy danh sách kho"
			);
		}
	}
);

//Lấy danh sách select người thực hiện
export const getSelectUser = createAsyncThunk(
	"warehouseInAndOutRegister/getSelectUer",
	async (_, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_GET_LIST_USERS}`);
			return res?.data || {};
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message || "Lỗi khi lấy danh sách người dùng"
			);
		}
	}
);

export const getSelectUserAll = createAsyncThunk(
	"warehouseInAndOutRegister/getSelectUserAll",
	async (_, { rejectWithValue }) => {
		try {
               const res = await api.get(`${API_GET_LIST_USERS}/all`);
			
			// ✅ Kiểm tra cấu trúc response
			const userData = res?.data?.data || res?.data || [];
			
			return Array.isArray(userData) ? userData : [];
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message || "Lỗi khi lấy danh sách người dùng"
			);
		}
	}
);

//Lấy danh sách select phòng ban
export const getSelectOrganizationUnit = createAsyncThunk(
	"warehouseInAndOutRegister/getSelectOrganizationUnit",
	async (_, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_GET_LIST_UNIT}`);
			return res?.data || {};
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message || "Lỗi khi lấy danh sách phòng ban"
			);
		}
	}
);

//Xóa file đã tải lên
export const deleteRegisterFile = createAsyncThunk(
	"warehouseInAndOutRegister/deleteRegisterFile",
	async ({ id, idRegister }, { rejectWithValue }) => {
		try {
			const { data } = await api.delete(`${API_DELETE_REGISTER_FILE}/${id}`, {
				params: { idRegister },
			})
			return data?.data || {};
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message || "Lỗi khi lấy danh sách kho"
			);
		}
	}
);

//Tự sinh mã số
export const autoGenCodeWareHouse = createAsyncThunk(
	"warehouseInAndOutRegister/autoGenCodeWareHouse",
	async (_, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_AUTO_GEN_CODE_WAREHOUSE}`);
			return res?.data.code || {};
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message || "Lỗi khi lấy mã tự sinh"
			);
		}
	}
);

const warehouseInAndOutRegisterSlice = createSlice({
	name: "warehouseInAndOutRegister",
	initialState: {
		listWarehouseInAndOutRegister: [],
		listUser: [],
		listUserAll: [],
		listDetail: [],
		listSelectWarehouse: [],
		listSelectPosition: [],
		listSelectOrganizationUnit: [],
		listFile: [],
		dataUploadFile: [],
		codeWareHouseIO: "",
		deleteRegisterFile: null,
		loading: false,
		success: null,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			//Lấy danh sách tổng của Nhóm tài liệu
			.addCase(getLishWarehouseInAndOutRegister.pending, (state) => {
				state.loading = true;
			})
			.addCase(getLishWarehouseInAndOutRegister.fulfilled, (state, action) => {
				state.loading = false;
				state.listWarehouseInAndOutRegister = action.payload;
			})
			.addCase(getLishWarehouseInAndOutRegister.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message;
			})

			.addCase(addWarehouseInAndOutRegister.fulfilled, (state, action) => {
				if (
					!state.listWarehouseInAndOutRegister ||
					!Array.isArray(state.listWarehouseInAndOutRegister.data)
				) {
					state.listWarehouseInAndOutRegister = { data: [], total: 0 }; // Khởi tạo nếu chưa có
				}
				state.listWarehouseInAndOutRegister.data.unshift(action.payload); // Thêm vào đầu mảng data
				state.listWarehouseInAndOutRegister.total += 1; // Tăng total lên 1
			})
			.addCase(getDetailWarehouseInAndOutRegister.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(
				getDetailWarehouseInAndOutRegister.fulfilled,
				(state, action) => {
					state.loading = false;
					state.listDetail = action.payload.data;
				}
			)
			.addCase(getDetailWarehouseInAndOutRegister.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(fetchSearchBoxManagement.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchSearchBoxManagement.fulfilled, (state, action) => {
				state.loading = false;
				state.listWarehouseInAndOutRegister = action.payload;
			})
			.addCase(fetchSearchBoxManagement.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})

			//Upload file
			.addCase(uploadFilesMultiple.pending, (state) => {
				state.loadingUpload = true;
				state.errorUpload = null;
			})
			.addCase(uploadFilesMultiple.fulfilled, (state, action) => {
				state.loadingUpload = false;
				state.dataUploadFile = action.payload;
			})

			.addCase(uploadFilesMultiple.rejected, (state, action) => {
				state.loadingUpload = false;
				state.errorUpload = action.payload || "Lỗi khi tải file lên!";
			})
			.addCase(updateWarehouseInAndOutRegister.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(updateWarehouseInAndOutRegister.fulfilled, (state) => {
				state.loading = false;
			})
			.addCase(updateWarehouseInAndOutRegister.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			//Xử lý xóa
			.addCase(deleteWarehouseInAndOutRegister.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(deleteWarehouseInAndOutRegister.fulfilled, (state, action) => {
				state.loading = false;
				const deletedIds = action.meta.arg; // Mảng ids từ tham số đầu vào
				if (action.payload.success) {
					if (
						!state.listWarehouseInAndOutRegister ||
						!Array.isArray(state.listWarehouseInAndOutRegister.data)
					) {
						state.listWarehouseInAndOutRegister = { data: [], total: 0 };
					}
					state.listWarehouseInAndOutRegister.data =
						state.listWarehouseInAndOutRegister.data.filter(
							(item) => !deletedIds.includes(item._id)
						);
					state.listWarehouseInAndOutRegister.total =
						state.listWarehouseInAndOutRegister.total - deletedIds.length; // Cập nhật tổng
				}
			})
			.addCase(deleteWarehouseInAndOutRegister.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			//Lấy danh sách select chức vụ
			.addCase(getSelectPosition.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getSelectPosition.fulfilled, (state, action) => {
				state.loading = false;
				state.listSelectPosition = action.payload;
			})
			.addCase(getSelectPosition.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			//Lấy danh sách select kho
			.addCase(getSelectWarehouse.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getSelectWarehouse.fulfilled, (state, action) => {
				state.loading = false;
				state.listSelectWarehouse = action.payload;
			})
			.addCase(getSelectWarehouse.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			//Lấy danh sách người thực hiện
			.addCase(getSelectUser.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getSelectUser.fulfilled, (state, action) => {
				state.loading = false;
				state.listUser = action.payload.data;
			})
			.addCase(getSelectUser.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(getSelectUserAll.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getSelectUserAll.fulfilled, (state, action) => {
				state.loading = false;
				state.listUserAll = action.payload;
			})
			.addCase(getSelectUserAll.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			//Lấy danh sách phòng ban
			.addCase(getSelectOrganizationUnit.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getSelectOrganizationUnit.fulfilled, (state, action) => {
				state.loading = false;
				state.listSelectOrganizationUnit = action.payload.data;
			})
			.addCase(getSelectOrganizationUnit.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			//Xóa file đã tải lên
			.addCase(deleteRegisterFile.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(deleteRegisterFile.fulfilled, (state, action) => {
				state.loading = false;
				state.deleteRegisterFile = action.payload;
			})
			.addCase(deleteRegisterFile.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			//Lấy mã tự sinh
			.addCase(autoGenCodeWareHouse.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(autoGenCodeWareHouse.fulfilled, (state, action) => {
				state.loading = false;
				state.codeWareHouseIO = action.payload;
			})
			.addCase(autoGenCodeWareHouse.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export default warehouseInAndOutRegisterSlice.reducer;
