import { API_LIST_INDOC_BH_TO_OUTDOC, API_POST_RECALL_DOC } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const fetchDataDoc = createAsyncThunk(
	"recallText/fetchDataDoc",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_LIST_INDOC_BH_TO_OUTDOC}`, body)
			return res?.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi tải file!"
			);
		}
	})
export const postRecallDoc = createAsyncThunk(
	"recallText/postRecallDoc",
	async ({ body, params }, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_POST_RECALL_DOC}`, body, {
				params: params
			})
			return res
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi tải file!"
			);
		}
	})

const RecallTextSlice = createSlice({
	name: "recallText",
	initialState: {
		listsDoc: [],
		dataPostRecall: null,
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchDataDoc.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchDataDoc.fulfilled, (state, action) => {
				state.loading = false;
				state.listsDoc = action.payload;
			})
			.addCase(fetchDataDoc.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(postRecallDoc.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(postRecallDoc.fulfilled, (state, action) => {
				state.loading = false;
				state.dataPostRecall = action.payload;
			})
			.addCase(postRecallDoc.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export default RecallTextSlice.reducer;