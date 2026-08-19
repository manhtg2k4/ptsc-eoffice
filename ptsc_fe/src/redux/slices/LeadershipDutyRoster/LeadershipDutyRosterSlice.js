import { API_LEADERSHIP_DUTY_SCHEDULE } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const postDataLeadershipDutyRoster = createAsyncThunk(
	"leadershipDutyRoster/postDataLeadershipDutyRoster",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.post(
				`${API_LEADERSHIP_DUTY_SCHEDULE}`, body);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi thêm mới dữ liệu!"
			);
		}
	})
export const getDataDetailLeadershipDutyRoster = createAsyncThunk(
	"leadershipDutyRoster/getDataDetailLeadershipDutyRoster",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.get(
				`${API_LEADERSHIP_DUTY_SCHEDULE}/${id}`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
			);
		}
	})

export const updateDataLeadershipDutyRoster = createAsyncThunk(
	"leadershipDutyRoster/updateDataLeadershipDutyRoster",
	async ({data, id}, { rejectWithValue }) => {
		try {
			const res = await api.put(
				`${API_LEADERSHIP_DUTY_SCHEDULE}/${id}`, data);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi cập nhật dữ liệu!"
			);
		}
	})

export const deleteLeadershipDutyRoster = createAsyncThunk(
	"leadershipDutyRoster/deleteLeadershipDutyRoster",
	async (id, { rejectWithValue }) => {
		try {
			const res = await api.delete(
				`${API_LEADERSHIP_DUTY_SCHEDULE}/${id}`);
			return res?.data?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi xóa dữ liệu!"
			);
		}
	})


const LeadershipDutyRosterSlice = createSlice({
	name: "leadershipDutyRoster",
	initialState: {
		dataLeadershipDutyRoster: [],
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(getDataDetailLeadershipDutyRoster.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getDataDetailLeadershipDutyRoster.fulfilled, (state, action) => {
				state.loading = false;
				state.dataLeadershipDutyRoster = action.payload;
			})
			.addCase(getDataDetailLeadershipDutyRoster.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export default LeadershipDutyRosterSlice.reducer;