
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { 
    API_MEETING_ROOM_USAGE_FREQUENCY, 
    API_MEETING_STATISTICS_BY_DEPARTMENT,
    API_MEETING_STATISTICS_BY_TIME,
    API_MEETING_ATTENDANCE_STATISTICS,
    API_MEETING_FOLLOWUP_TASK_STATISTICS
} from "@EnvironmentFile/constants/urlConfig";
import dayjs from "dayjs";
import api from "@services/api";

/**
 * Hàm format date trong params trước khi gửi API
 */
const formatParams = (params) => {
    const newParams = { ...params };
    Object.keys(newParams).forEach(key => {
        if (dayjs.isDayjs(newParams[key])) {
            newParams[key] = newParams[key].format("YYYY-MM-DD");
        }
    });
    return newParams;
};

export const fetchMeetingRoomUsageFrequency = createAsyncThunk(
    "meetingScheduleStatistics/fetchMeetingRoomUsageFrequency",
    async (params, { rejectWithValue }) => {
        try {
            const formattedParams = formatParams(params);
            const response = await api.get(API_MEETING_ROOM_USAGE_FREQUENCY, { params: formattedParams });        
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchMeetingStatisticsByDepartment = createAsyncThunk(
    "meetingScheduleStatistics/fetchMeetingStatisticsByDepartment",
    async (params, { rejectWithValue }) => {
        try {
            const formattedParams = formatParams(params);
            const response = await api.get(API_MEETING_STATISTICS_BY_DEPARTMENT, { params: formattedParams });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchMeetingStatisticsByTime = createAsyncThunk(
    "meetingScheduleStatistics/fetchMeetingStatisticsByTime",
    async (params, { rejectWithValue }) => {
        try {
            const formattedParams = formatParams(params);
            const response = await api.get(API_MEETING_STATISTICS_BY_TIME, { params: formattedParams });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchMeetingAttendanceStatistics = createAsyncThunk(
    "meetingScheduleStatistics/fetchMeetingAttendanceStatistics",
    async (params, { rejectWithValue }) => {
        try {
            const formattedParams = formatParams(params);
            const response = await api.get(API_MEETING_ATTENDANCE_STATISTICS, { params: formattedParams });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchMeetingFollowupTaskStatistics = createAsyncThunk(
    "meetingScheduleStatistics/fetchMeetingFollowupTaskStatistics",
    async (params, { rejectWithValue }) => {
        try {
            const formattedParams = formatParams(params);
            const response = await api.get(API_MEETING_FOLLOWUP_TASK_STATISTICS, { params: formattedParams });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const meetingScheduleStatisticsSlice = createSlice({
    name: "meetingScheduleStatistics",
    initialState: {
        data: [],
        total: 0,
        loading: false,
        error: null,
    },
    reducers: {
        resetMeetingStatistics: (state) => {
            state.data = [];
            state.total = 0;
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Room Usage Frequency
            .addCase(fetchMeetingRoomUsageFrequency.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMeetingRoomUsageFrequency.fulfilled, (state, action) => {
                state.loading = false;
                const responseData = action.payload;
                if (Array.isArray(responseData)) {
                    state.data = responseData;
                    state.total = responseData.length;
                } else {
                    state.data = responseData?.data || [];
                    state.total = responseData?.total || responseData?.totalCount || state.data.length;
                }
            })
            .addCase(fetchMeetingRoomUsageFrequency.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Statistics By Department
            .addCase(fetchMeetingStatisticsByDepartment.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMeetingStatisticsByDepartment.fulfilled, (state, action) => {
                state.loading = false;
                const responseData = action.payload;
                if (Array.isArray(responseData)) {
                    state.data = responseData;
                    state.total = responseData.length;
                } else {
                    state.data = responseData?.data || [];
                    state.total = responseData?.total || responseData?.totalCount || state.data.length;
                }
            })
            .addCase(fetchMeetingStatisticsByDepartment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Statistics By Time
            .addCase(fetchMeetingStatisticsByTime.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMeetingStatisticsByTime.fulfilled, (state, action) => {
                state.loading = false;
                const responseData = action.payload;
                if (Array.isArray(responseData)) {
                    state.data = responseData;
                    state.total = responseData.length;
                } else {
                    state.data = responseData?.data || [];
                    state.total = responseData?.total || responseData?.totalCount || state.data.length;
                }
            })
            .addCase(fetchMeetingStatisticsByTime.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Attendance Statistics
            .addCase(fetchMeetingAttendanceStatistics.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMeetingAttendanceStatistics.fulfilled, (state, action) => {
                state.loading = false;
                const responseData = action.payload;
                if (Array.isArray(responseData)) {
                    state.data = responseData;
                    state.total = responseData.length;
                } else {
                    state.data = responseData?.data || [];
                    state.total = responseData?.total || responseData?.totalCount || state.data.length;
                }
            })
            .addCase(fetchMeetingAttendanceStatistics.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Followup Task Statistics
            .addCase(fetchMeetingFollowupTaskStatistics.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMeetingFollowupTaskStatistics.fulfilled, (state, action) => {
                state.loading = false;
                const responseData = action.payload;
                if (Array.isArray(responseData)) {
                    state.data = responseData;
                    state.total = responseData.length;
                } else {
                    state.data = responseData?.data || [];
                    state.total = responseData?.total || responseData?.totalCount || state.data.length;
                }
            })
            .addCase(fetchMeetingFollowupTaskStatistics.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { resetMeetingStatistics } = meetingScheduleStatisticsSlice.actions;
export default meetingScheduleStatisticsSlice.reducer;
