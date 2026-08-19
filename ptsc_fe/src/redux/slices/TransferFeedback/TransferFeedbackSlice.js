import { API_POST_TRANSFER_FEEDBACK } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const postTransferFeedback = createAsyncThunk(
	"transferFeedback/postTransferFeedback",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_POST_TRANSFER_FEEDBACK}`, body)
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi chuyển cho ý kiến!"
			);
		}
	})


const TransferFeedbackSlice = createSlice({
	name: "transferFeedback",
	initialState: {
		dataTransferFeedback: null,
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(postTransferFeedback.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(postTransferFeedback.fulfilled, (state, action) => {
				state.loading = false;
				state.dataTransferFeedback = action.payload;
			})
			.addCase(postTransferFeedback.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export default TransferFeedbackSlice.reducer;