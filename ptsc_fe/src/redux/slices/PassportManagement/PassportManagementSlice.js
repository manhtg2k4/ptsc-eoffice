import {
	API_GET_PASSPORT_EMPLOYEES,
	API_INCOMING_DELEGATIONS,
	API_PASSPORT,
	API_PASSPORT_PERMISSION,
	API_PASSPORT_REQUEST,
	API_PASSPORT_RETURN_SLIP,
	API_PASSPORT_VOUCHERS,
} from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const addPassPortListPage = createAsyncThunk(
	"passportManagement/addPassPortListPage",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_PASSPORT}`, body);
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi thêm danh sách hộ chiếu!"
			);
		}
	}
);

export const updatePassPortListPage = createAsyncThunk(
	"passportManagement/updatePassPortListPage",
	async ({ id, payload }, { rejectWithValue }) => {
		try {
			const res = await api.put(`${API_PASSPORT}/${id}`, payload);
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi cập nhật danh sách hộ chiếu!"
			);
		}
	}
);

export const detailPassPortListPage = createAsyncThunk(
	"passportManagement/detailPassPortListPage",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_PASSPORT}/${id}`);
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi lấy chi tiết danh sách hộ chiếu!"
			);
		}
	}
);

export const deletePassPortListPage = createAsyncThunk(
	"passportManagement/deletePassPortListPage",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.delete(`${API_PASSPORT}`, { data: body });
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi xóa hộ chiếu!"
			);
		}
	}
);

export const dataDetailEmployeePassPortListPage = createAsyncThunk(
	"passportManagement/dataDetailEmployeePassPortListPage",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_GET_PASSPORT_EMPLOYEES}/${id}`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi lấy chi tiết nhân viên hộ chiếu!"
			);
		}
	}
);

export const addPassportRequest = createAsyncThunk(
	"passportManagement/addPassportRequest",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_PASSPORT_REQUEST}`, body);
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi thêm yêu cầu hộ chiếu!"
			);
		}
	}
);

export const updatePassportRequest = createAsyncThunk(
	"passportManagement/updatePassportRequest",
	async ({ id, payload }, { rejectWithValue }) => {
		try {
			const res = await api.put(`${API_PASSPORT_REQUEST}/${id}`, payload);
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Cập nhật yêu cầu mượn hộ chiếu thất bại!"
			);
		}
	}
);

export const getDataDetailPassportRequest = createAsyncThunk(
	"passportManagement/getDataDetailPassportRequest",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_PASSPORT_REQUEST}/${id}`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi lấy chi tiết yêu cầu hộ chiếu!"
			);
		}
	}
);

export const cancelPassportRequest = createAsyncThunk(
	"passportManagement/cancelPassportRequest",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.delete(`${API_PASSPORT_REQUEST}/${id}`, {
				data: body,
			});
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Hủy yêu cầu mượn hộ chiếu thất bại!"
			);
		}
	}
);

export const approvePassportRequest = createAsyncThunk(
	"passportManagement/approvePassportRequest",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.patch(
				`${API_PASSPORT_REQUEST}/${id}/approve`,
				body
			);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Phê duyệt yêu cầu mượn hộ chiếu thất bại!"
			);
		}
	}
);

export const transferPassportRequest = createAsyncThunk(
	"passportManagement/transferPassportRequest",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.patch(
				`${API_PASSPORT_REQUEST}/${id}/commander-transfer`,
				body
			);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Chuyển xử lý yêu cầu mượn hộ chiếu thất bại!"
			);
		}
	}
);

//Từ chối yêu cầu của Chỉ huy đơn vị
export const rejectPassportRequest = createAsyncThunk(
	"passportManagement/rejectPassportRequest",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.patch(
				`${API_PASSPORT_REQUEST}/${id}/reject`,
				body
			);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Từ chối yêu cầu mượn hộ chiếu thất bại!"
			);
		}
	}
);

//Từ chối yêu cầu của Chỉ huy văn phòng
export const rejectOfficeCommanderRequest = createAsyncThunk(
	"passportManagement/rejectOfficeCommanderRequest",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.patch(
				`${API_PASSPORT_REQUEST}/${id}/commander-reject`,
				body
			);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Từ chối yêu cầu mượn hộ chiếu thất bại!"
			);
		}
	}
);

//Từ chối yêu cầu của Bộ phận chuyên trách
export const rejectSpecialistRequest = createAsyncThunk(
	"passportManagement/rejectSpecialistRequest",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.patch(
				`${API_PASSPORT_REQUEST}/${id}/specialist-reject`,
				body
			);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Từ chối yêu cầu mượn hộ chiếu thất bại!"
			);
		}
	}
);

//Tiếp nhận yêu cầu của Bộ phận chuyên trách
export const receivePassportRequest = createAsyncThunk(
	"passportManagement/receivePassportRequest",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.patch(
				`${API_PASSPORT_REQUEST}/${id}/receive`,
				body
			);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Tiếp nhận yêu cầu mượn hộ chiếu thất bại!"
			);
		}
	}
);

export const getDataHistoryPassportRequest = createAsyncThunk(
	"passportManagement/getDataHistoryPassportRequest",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(
				`${API_PASSPORT_REQUEST}/${id}/history`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lấy lịch sử yêu cầu mượn hộ chiếu thất bại!"
			);
		}
	}
);

export const getDataDelegationItems = createAsyncThunk(
	"passportManagement/getDataDelegationItems",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(
				`${API_PASSPORT_REQUEST}/${id}/delegation-items`);
			return res?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lấy danh sách đoàn ra thất bại!"
			);
		}
	}
);

export const postPassportVouchers = createAsyncThunk(
	"passportManagement/postPassportVouchers",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.post(
				`${API_PASSPORT_VOUCHERS}`, body);
			return res?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Tạo biên bản bàn giao thất bại!"
			);
		}
	}
);

export const getDetailHandoverMinutes = createAsyncThunk(
	"passportManagement/getDetailHandoverMinutes",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(
				`${API_PASSPORT_VOUCHERS}/${id}`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lấy chi tiết biên bản bàn giao thất bại!"
			);
		}
	}
);

export const receiveMinutes = createAsyncThunk(
	"passportManagement/receiveMinutes",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.patch(
				`${API_PASSPORT_VOUCHERS}/${id}/sign`);
			return res?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Ký nhận biên bản bàn giao thất bại!"
			);
		}
	}
);

export const rejectMinutes = createAsyncThunk(
	"passportManagement/rejectMinutes",
	async ({id, body}, { rejectWithValue }) => {
		try {
			const res = await api.patch(
				`${API_PASSPORT_VOUCHERS}/${id}/reject`, body);
			return res?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Từ chối biên bản bàn giao thất bại!"
			);
		}
	}
);

export const getDataHistoryPassport = createAsyncThunk(
	"passportManagement/getDataHistoryPassport",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(
				`${API_PASSPORT}/${id}/borrow-history`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lấy lịch sử mượn hộ chiếu thất bại!"
			);
		}
	}
);

export const getDataPassportToUser = createAsyncThunk(
	"passportManagement/getDataPassportToUser",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(
				`${API_PASSPORT_REQUEST}/users/${id}/passports`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lấy lịch sử mượn hộ chiếu thất bại!"
			);
		}
	}
);

export const postPassportPermissionDraft = createAsyncThunk(
	"passportManagement/postPassportPermissionDraft",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_PASSPORT_PERMISSION}/draft`, body);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Tạo dự thảo quyền mượn hộ chiếu thất bại!"
			);
		}
	}
);

export const deletePassportPermission = createAsyncThunk(
	"passportManagement/deletePassportPermission",
	async ({ ids }, { rejectWithValue }) => {
		try {
			const res = await api.delete(
				`${API_PASSPORT_PERMISSION}/delete`,
				{ data: { ids } }
			);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Xóa quyền mượn hộ chiếu thất bại!"
			);
		}
	}
);

export const updatePassportPermission = createAsyncThunk(
	"passportManagement/updatePassportPermission",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.patch(`${API_PASSPORT_PERMISSION}/${id}`, body);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Cập nhật quyền mượn hộ chiếu thất bại!"
			);
		}
	}
);

export const getDetailPassportPermission = createAsyncThunk(
	"passportManagement/getDetailPassportPermission",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_PASSPORT_PERMISSION}/${id}`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lấy chi tiết quyền mượn hộ chiếu thất bại!"
			);
		}
	}
);

export const addIncomingDelegations = createAsyncThunk(
	"passportManagement/addIncomingDelegations",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_INCOMING_DELEGATIONS}`, body);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Thêm mới đoàn vào thất bại!"
			);
		}
	}
);

export const updateIncomingDelegations = createAsyncThunk(
	"passportManagement/updateIncomingDelegations",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.put(`${API_INCOMING_DELEGATIONS}/${id}`, body);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Cập nhật đoàn vào thất bại!"
			);
		}
	}
);

export const viewIncomingDelegations = createAsyncThunk(
	"passportManagement/viewIncomingDelegations",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_INCOMING_DELEGATIONS}/${id}`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Xem chi tiết đoàn vào thất bại!"
			);
		}
	}
);

export const remindExpiryPassports = createAsyncThunk(
	"passportManagement/remindExpiryPassports",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_PASSPORT}/${id}/remind-expiry`);
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi nhắc nhở hộ chiếu sắp hết hạn!"
			);
		}
	}
);

export const addPassportsReturnSlip = createAsyncThunk(
	"passportManagement/addPassportsReturnSlip",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_PASSPORT_RETURN_SLIP}`, body);
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi tạo phiếu trả hộ chiếu!"
			);
		}
	}
);

export const viewPassportsReturnSlip = createAsyncThunk(
	"passportManagement/viewPassportsReturnSlip",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_PASSPORT_RETURN_SLIP}/${id}`);
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi lấy chi tiết phiếu trả hộ chiếu!"
			);
		}
	}
);


export const updatePassportsReturnSlip = createAsyncThunk(
	"passportManagement/updatePassportsReturnSlip",
	async ({ id, payload }, { rejectWithValue }) => {
		try {
			const res = await api.put(`${API_PASSPORT_RETURN_SLIP}/${id}`, payload);
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi cập nhật phiếu trả hộ chiếu!"
			);
		}
	}
);

export const getDataListReturnPassports = createAsyncThunk(
	"passportManagement/getDataListReturnPassports",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_PASSPORT_REQUEST}/users/${id}/passports`);
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi lấy chi tiết phiếu trả hộ chiếu!"
			);
		}
	}
);

export const getDataListPassportInReturnSlip = createAsyncThunk(
	"passportManagement/getDataListPassportInReturnSlip",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_PASSPORT_RETURN_SLIP}/${id}/items`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi lấy chi tiết phiếu trả hộ chiếu!"
			);
		}
	}
);

export const signVoucherPassportReturnSlip = createAsyncThunk(
	"passportManagement/signVoucherPassportReturnSlip",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_PASSPORT_RETURN_SLIP}/${id}/sign-voucher`, body);
			return res?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi ký và lập biên bản hoàn trả hộ chiếu!"
			);
		}
	}
);

export const ownerSignPassportReturnSlip = createAsyncThunk(
	"passportManagement/ownerSignPassportReturnSlip",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_PASSPORT_RETURN_SLIP}/${id}/owner-sign`, body);
			return res?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi ký nhận hộ chiếu!"
			);
		}
	}
);

export const ownerRejectPassportReturnSlip = createAsyncThunk(
	"passportManagement/ownerRejectPassportReturnSlip",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_PASSPORT_RETURN_SLIP}/${id}/owner-reject`, body);
			return res?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi từ chối nhận hộ chiếu!"
			);
		}
	}
);

export const receiveReturnPassportSlip = createAsyncThunk(
	"passportManagement/receiveReturnPassportSlip",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_PASSPORT_RETURN_SLIP}/${id}/receive`);
			return res?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi từ chối nhận hộ chiếu!"
			);
		}
	}
);

export const cancelReturnPassportSlip = createAsyncThunk(
	"passportManagement/cancelReturnPassportSlip",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_PASSPORT_RETURN_SLIP}/${id}/cancel`);
			return res?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi hủy phiếu hoàn trả hộ chiếu!"
			);
		}
	}
);

export const rejectReturnPassportSlip = createAsyncThunk(
	"passportManagement/rejectReturnPassportSlip",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_PASSPORT_RETURN_SLIP}/${id}/owner-reject`, body);
			return res?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data ||
				error.message ||
				"Lỗi khi trả lại phiếu hoàn trả hộ chiếu!"
			);
		}
	}
);


const PassportManagementSlice = createSlice({
	name: "passportManagement",
	initialState: {
		dataPassportListPage: [],
		dataHistoryPassportRequest: [],
		dataHistoryPassport: [],
		dataDelegationItems: [],
		dataDetailHandoverMinutes: [],
		dataListPassportInReturnSlip: null,
		dataDetailPassportsReturnSlip: null,
		dataDetailPassportRequest: null,
		dataDetailPassport: null,
		file: null,
		viewFile: null,
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(addPassPortListPage.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(addPassPortListPage.fulfilled, (state, action) => {
				state.loading = false;
				state.dataPassportListPage = action.payload;
			})
			.addCase(addPassPortListPage.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(getDataHistoryPassportRequest.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getDataHistoryPassportRequest.fulfilled, (state, action) => {
				state.loading = false;
				state.dataHistoryPassportRequest = action.payload;
			})
			.addCase(getDataHistoryPassportRequest.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(getDataDelegationItems.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getDataDelegationItems.fulfilled, (state, action) => {
				state.loading = false;
				state.dataDelegationItems = action.payload;
			})
			.addCase(getDataDelegationItems.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(getDetailHandoverMinutes.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getDetailHandoverMinutes.fulfilled, (state, action) => {
				state.loading = false;
				state.dataDetailHandoverMinutes = action.payload;
			})
			.addCase(getDetailHandoverMinutes.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(getDataDetailPassportRequest.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getDataDetailPassportRequest.fulfilled, (state, action) => {
				state.loading = false;
				state.dataDetailPassportRequest = action.payload;
			})
			.addCase(getDataDetailPassportRequest.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(getDataHistoryPassport.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getDataHistoryPassport.fulfilled, (state, action) => {
				state.loading = false;
				state.dataHistoryPassport = action.payload;
			})
			.addCase(getDataHistoryPassport.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(viewPassportsReturnSlip.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(viewPassportsReturnSlip.fulfilled, (state, action) => {
				state.loading = false;
				state.dataDetailPassportsReturnSlip = action.payload;
			})
			.addCase(viewPassportsReturnSlip.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(getDataListPassportInReturnSlip.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getDataListPassportInReturnSlip.fulfilled, (state, action) => {
				state.loading = false;
				state.dataListPassportInReturnSlip = action.payload;
			})
			.addCase(getDataListPassportInReturnSlip.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(detailPassPortListPage.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(detailPassPortListPage.fulfilled, (state, action) => {
				state.loading = false;
				state.dataDetailPassport = action.payload;
			})
			.addCase(detailPassPortListPage.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export default PassportManagementSlice.reducer;
