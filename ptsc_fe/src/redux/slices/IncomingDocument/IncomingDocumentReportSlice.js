
import { API_INCOMING_STATISTICS_BY_TIME, API_INCOMING_STATISTICS_DIRECTIVE, API_INCOMING_STATISTICS_OVERDUE, API_INCOMING_STATISTICS_REPORT, API_INCOMING_STATISTICS_REPORT_SENDING_UNIT } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const fetchIncomingDocStatisticsByTime = createAsyncThunk(
	"incomingDocumentReport/fetchIncomingDocStatisticsByTime",
	async (params, { rejectWithValue }) => {
		try {
			const response = await api.get(API_INCOMING_STATISTICS_BY_TIME , { params });
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || error.message);
		}
	}
);

export const fetchIncomingDocumentStatisticsReport = createAsyncThunk(
	"incomingDocumentReport/fetchIncomingDocumentStatisticsReport",
	async (params, { rejectWithValue }) => {
		try {
			const response = await api.get(API_INCOMING_STATISTICS_REPORT , { params });
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || error.message);
		}
	}
);

export const fetchIncomingDocumentStatisticsOverdue = createAsyncThunk(
	"incomingDocumentReport/fetchIncomingDocumentStatisticsOverdue",
	async (params, { rejectWithValue }) => {
		try {
			const response = await api.get(API_INCOMING_STATISTICS_OVERDUE , { params });
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || error.message);
		}
	}
);

export const fetchIncomingDocumentsBySendingUnitStats = createAsyncThunk(
	"incomingDocumentReport/fetchIncomingDocumentsBySendingUnitStats",
	async (params, { rejectWithValue }) => {
		try {
			const response = await api.get(API_INCOMING_STATISTICS_REPORT_SENDING_UNIT , { params });
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || error.message);
		}
	}
);

export const fetchIncomingDocumentStatisticsDirective = createAsyncThunk(
	"incomingDocumentReport/fetchIncomingDocumentStatisticsDirective",
	async (params, { rejectWithValue }) => {
		try {
			const response = await api.get(API_INCOMING_STATISTICS_DIRECTIVE  , { params });
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || error.message);
		}
	}
);

const IncomingDocumentReportSlice = createSlice({
	name: "incomingDocumentReport",
	initialState: {
		data: [],
		total: 0,
		loading: false,
		error: null,
	},
	reducers: {
		resetincomingDocumentReport: (state) => {
			state.data = [];
			state.total = 0;
			state.loading = false;
			state.error = null;
		}
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchIncomingDocStatisticsByTime.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchIncomingDocStatisticsByTime.fulfilled, (state, action) => {
				state.loading = false;
				if (Array.isArray(action.payload)) {
						state.data = action.payload;
						state.total = action.payload.length;
				} else {
						state.data = action.payload?.data || [];
						state.total = action.payload?.total || 0;
				}
			})
			.addCase(fetchIncomingDocStatisticsByTime.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			// fetchIncomingDocumentStatisticsReport
			.addCase(fetchIncomingDocumentStatisticsReport.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchIncomingDocumentStatisticsReport.fulfilled, (state, action) => {
				state.loading = false;
				// API trả về mảng trực tiếp [ {}, {} ]
				if (Array.isArray(action.payload)) {
						state.data = action.payload;
						state.total = action.payload.length;
				} else {
						 state.data = [];
						 state.total = 0;
				}
			})
			.addCase(fetchIncomingDocumentStatisticsReport.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			// fetchIncomingDocumentStatisticsOverdue
			.addCase(fetchIncomingDocumentStatisticsOverdue.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchIncomingDocumentStatisticsOverdue.fulfilled, (state, action) => {
				state.loading = false;
				// API trả về mảng trực tiếp [ {}, {} ]
				if (Array.isArray(action.payload)) {
						state.data = action.payload;
						state.total = action.payload.length;
				} else {
						 state.data = [];
						 state.total = 0;
				}
			})
			.addCase(fetchIncomingDocumentStatisticsOverdue.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export const { resetincomingDocumentReport } = IncomingDocumentReportSlice.actions;
export default IncomingDocumentReportSlice.reducer;
