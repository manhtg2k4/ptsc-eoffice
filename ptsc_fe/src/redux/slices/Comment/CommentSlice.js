import { API_FILES_UPLOAD, API_VIEW_FILE } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";
import axios from "axios";

export const uploadFileToCmt = createAsyncThunk(
	"comment/uploadFileToCmt",
	async (file, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_FILES_UPLOAD}`, file)
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi tải file!"
			);
		}
	})

export const viewFileUpLoadToCmt = createAsyncThunk(
	"comment/viewFileUpLoadToCmt",
	async (id, { rejectWithValue }) => {
		try {
			const token = localStorage.getItem("token");

			// const res = await api.get(`${API_VIEW_FILE}/${id}`)
			const res = await axios.get(
				`${API_VIEW_FILE}/${id}`,
				{
					responseType: "blob",
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi tải dữ liệu file!"
			);
		}
})

const CommentSlice = createSlice({
	name: "comment",
	initialState: {
		comments: [],
		file: null,
		viewFile: null,
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(uploadFileToCmt.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(uploadFileToCmt.fulfilled, (state, action) => {
				state.loading = false;
				state.file = action.payload;
			})
			.addCase(uploadFileToCmt.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(viewFileUpLoadToCmt.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(viewFileUpLoadToCmt.fulfilled, (state, action) => {
				state.loading = false;
				state.viewFile = action.payload;
			})
			.addCase(viewFileUpLoadToCmt.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export default CommentSlice.reducer;
