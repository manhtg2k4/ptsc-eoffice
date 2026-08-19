import { API_NOTIFICATION, API_PATCH_MARK_ALL_NOTIFICATIONS_READ } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const patchMarkAllAsRead = createAsyncThunk(
	"notification/patchMarkAllAsRead",
	async (_, { rejectWithValue }) => {
		try {
			const res = await api.patch(`${API_PATCH_MARK_ALL_NOTIFICATIONS_READ}`)
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi đánh dấu tất cả thông báo là đã đọc!"
			);
		}
	})

export const patchMarkOneAsRead = createAsyncThunk(
	"notification/patchMarkOneAsRead",
	async ({id, body}, { rejectWithValue }) => {
		try {
			const res = await api.patch(`${API_NOTIFICATION}/${id}`, body)
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi đánh dấu thông báo là đã đọc!"
			);
		}
	})

const notificationSlice = createSlice({
	name: "notification",
	initialState: {
		dataMarkAllAsRead: null,
		dataMarkOneAsRead: null,
		viewFile: null,
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(patchMarkAllAsRead.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(patchMarkAllAsRead.fulfilled, (state, action) => {
				state.loading = false;
				state.dataMarkAllAsRead = action.payload;
			})
			.addCase(patchMarkAllAsRead.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(patchMarkOneAsRead.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(patchMarkOneAsRead.fulfilled, (state, action) => {
				state.loading = false;
				state.dataMarkOneAsRead = action.payload;
			})
			.addCase(patchMarkOneAsRead.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export default notificationSlice.reducer;