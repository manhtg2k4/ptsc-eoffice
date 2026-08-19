import { API_TRAVEL_WORK_SCHEDULES } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const postTravelWork = createAsyncThunk(
	"travelWork/postTravelWork",
	async (payload, { rejectWithValue }) => {
		try {
			const res = await api.post(
				`${API_TRAVEL_WORK_SCHEDULES}`, payload);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi thêm mới dữ liệu!"
			);
		}
	})

export const getDataDetailTravelWork = createAsyncThunk(
	"travelWork/getDataDetailTravelWork",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(
				`${API_TRAVEL_WORK_SCHEDULES}/${id}`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
			);
		}
	})

export const updateDataTravelWork = createAsyncThunk(
	"travelWork/updateDataTravelWork",
	async ({data, id}, { rejectWithValue }) => {
		try {
			const res = await api.put(
				`${API_TRAVEL_WORK_SCHEDULES}/${id}`, data);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi cập nhật dữ liệu!"
			);
		}
	})

export const deleteDataTravelWork = createAsyncThunk(
	"travelWork/deleteDataTravelWork",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.delete(
				`${API_TRAVEL_WORK_SCHEDULES}/${id}`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi xóa dữ liệu!"
			);
		}
	})

export const deleteDataTravelWorkWithPayload = createAsyncThunk(
	"travelWork/deleteDataTravelWorkWithPayload",
	async (payload, { rejectWithValue }) => {
		try {
			const res = await api.delete(
				`${API_TRAVEL_WORK_SCHEDULES}`, { data: payload });
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message || error.message || "Lỗi khi xóa dữ liệu!"
			);
		}
	}
)

const TravelWorkSlice = createSlice({
	name: "travelWork",
	initialState: {
		dataTravelWork: [],
		dataPostTravelWork: [],
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(postTravelWork.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(postTravelWork.fulfilled, (state, action) => {
				state.loading = false;
				state.dataPostTravelWork = action.payload;
			})
			.addCase(postTravelWork.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(getDataDetailTravelWork.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getDataDetailTravelWork.fulfilled, (state, action) => {
				state.loading = false;
				state.dataTravelWork = action.payload;
			})
			.addCase(getDataDetailTravelWork.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export default TravelWorkSlice.reducer;