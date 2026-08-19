import { API_EXTEND_PROCESSING_TIME } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const updateProcessingTime = createAsyncThunk(
	"extendProcessingTime/updateProcessingTime",
	async ({docId, payload}, { rejectWithValue }) => {
		try {
			const res = await api.patch(`${API_EXTEND_PROCESSING_TIME}/${docId}/extend-deadline`, payload)
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.errors || error.message || "Lỗi gia hạn xử lý!"
			);
		}
	})

const ExtendProcessingTimeSlice = createSlice({
	name: "extendProcessingTime",
	initialState: {
		dataExtendProcessingTime: null,
		viewFile: null,
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(updateProcessingTime.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(updateProcessingTime.fulfilled, (state, action) => {
				state.loading = false;
				state.dataExtendProcessingTime = action.payload;
			})
			.addCase(updateProcessingTime.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export default ExtendProcessingTimeSlice.reducer;