import { API_CRMSOURCE, API_DELETE_CRMSOURCE_DHVB } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const addCrmSourcesDraft = createAsyncThunk(
	"docCategoryMgmt/addCrmSourcesDraft",
	async (_, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_CRMSOURCE}/draft`)
			return res?.data?.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi lấy dữ liệu nháp!"
			);
		}
	})

export const detailCrmSources = createAsyncThunk(
	"docCategoryMgmt/detailCrmSources",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_CRMSOURCE}/${id}`)
			return res?.data?.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi lấy chi tiết danh mục!"
			);
		}
	})

export const patchCrmSources = createAsyncThunk(
	"docCategoryMgmt/patchCrmSources",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.patch(`${API_CRMSOURCE}/${id}`, body)
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi cập nhật danh mục!"
			);
		}
	})

export const deleteCrmSourceChildData = createAsyncThunk(
	"docCategoryMgmt/deleteCrmSourceChildData",
	async ({ ids }, { rejectWithValue }) => {
		try {
			const res = await api.delete(`${API_CRMSOURCE}/data`, {
				data: { ids },
			});
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi xóa danh mục con!"
			);
		}
	}
)

export const deleteCrmSourceByIds = createAsyncThunk(
	"docCategoryMgmt/deleteCrmSourceByIds",
	async ({ ids }, { rejectWithValue }) => {
		try {
			const res = await api.delete(API_DELETE_CRMSOURCE_DHVB, {
				data: { ids },
			});
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi xóa danh mục!"
			);
		}
	}
)

const DocCategoryMgmtSlice = createSlice({
	name: "docCategoryMgmt",
	initialState: {
		dataCrmSourcesDraft: null,
		dataCrmSourcesDetail: null,
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(addCrmSourcesDraft.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(addCrmSourcesDraft.fulfilled, (state, action) => {
				state.loading = false;
				state.dataCrmSourcesDraft = action.payload;
			})
			.addCase(addCrmSourcesDraft.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(patchCrmSources.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(patchCrmSources.fulfilled, (state) => {
				state.loading = false;
			})
			.addCase(patchCrmSources.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(deleteCrmSourceChildData.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(deleteCrmSourceChildData.fulfilled, (state) => {
				state.loading = false;
			})
			.addCase(deleteCrmSourceChildData.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(deleteCrmSourceByIds.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(deleteCrmSourceByIds.fulfilled, (state) => {
				state.loading = false;
			})
			.addCase(deleteCrmSourceByIds.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export default DocCategoryMgmtSlice.reducer;