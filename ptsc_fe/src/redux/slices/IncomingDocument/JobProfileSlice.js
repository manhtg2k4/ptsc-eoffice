import { API_ADD_COMMON_WORK, API_JOB_TO_DOCUMENT } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const fetchDataJobProfile = createAsyncThunk(
	"jobProfile/fetchDataJobProfile",
	async (
		{ page = 1, limit = 25, query, sort, docId, isAuthority, ...rest } = {},
		{ rejectWithValue }
	) => {
		try {
			const params = { page, limit, sort, ...rest };
			if (query !== undefined && query !== "") params.query = query;
			if (isAuthority) params.isAuthority = isAuthority;
			const res = await api.get(`${API_ADD_COMMON_WORK}/select-form-doc/${docId}`, { params });
			return { data: res?.data?.data || [], total: res?.data?.total || 0, success: res?.status === 200 || false };
		} catch (error) {
			return rejectWithValue(error.response?.data || "Lỗi khi lấy danh sách");
		}
	}
);

export const getLishDataJobProfile = createAsyncThunk(
	"jobProfile/getLishDataJobProfile",
	async ( { params }, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_JOB_TO_DOCUMENT}`, { params })
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
			);
		}
	})

export const updateDataJobProfile = createAsyncThunk(
	"jobProfile/updateDataJobProfile",
	async ( body, { rejectWithValue }) => {
		try {
			const res = await api.patch(`${API_ADD_COMMON_WORK}/select-form-doc`, body)
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi chọn hồ sơ công việc!"
			);
		}
	})

const JobProfileSlice = createSlice({
	name: "jobProfile",
	initialState: {
		dataJobProfile: [],
		viewFile: null,
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(getLishDataJobProfile.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getLishDataJobProfile.fulfilled, (state, action) => {
				state.loading = false;
				state.dataJobProfile = action.payload;
			})
			.addCase(getLishDataJobProfile.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export default JobProfileSlice.reducer;