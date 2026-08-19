import { API_GROUP_USERS_IN_DOCUMENT } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const addUserGroup = createAsyncThunk(
	"docUserGroupMgmt/addUserGroup",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_GROUP_USERS_IN_DOCUMENT}`, body)
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi thêm nhóm người dùng!"
			);
		}
	})

export const detailUserGroup = createAsyncThunk(
	"docUserGroupMgmt/detailUserGroup",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_GROUP_USERS_IN_DOCUMENT}/${id}`)
			return res.data?.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi lấy chi tiết nhóm người dùng!"
			);
		}
	})

export const updateUserGroup = createAsyncThunk(
	"docUserGroupMgmt/updateUserGroup",
	async ({ id, body }, { rejectWithValue }) => {
		try {
			const res = await api.patch(`${API_GROUP_USERS_IN_DOCUMENT}/${id}`, body)
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi cập nhật nhóm người dùng!"
			);
		}
	})

const DocUserGroupMgmtSlice = createSlice({
	name: "docUserGroupMgmt",
	initialState: {
		dataUserGroup: [],
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(detailUserGroup.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(detailUserGroup.fulfilled, (state, action) => {
				state.loading = false;
				state.dataUserGroup = action.payload;
			})
			.addCase(detailUserGroup.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export default DocUserGroupMgmtSlice.reducer;