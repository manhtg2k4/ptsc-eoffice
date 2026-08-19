import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_DUTY_ROSTER_LEADERS, API_TRAVEL_WORK_SCHEDULES } from '@EnvironmentFile/constants/urlConfig';
import api from '@services/api';

export const fetchLeadershipSchedule = createAsyncThunk(
  'leadershipSchedule/fetchLeadershipSchedule',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get(API_DUTY_ROSTER_LEADERS, { params });
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchLeadershipScheduleNotes = createAsyncThunk(
  'leadershipSchedule/fetchLeadershipScheduleNotes',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get(`${API_TRAVEL_WORK_SCHEDULES}/list/notes`, { params });
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const leadershipScheduleSlice = createSlice({
  name: 'leadershipSchedule',
  initialState: {
    data: [],
    notes: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearLeadershipSchedule: (state) => {
      state.data = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeadershipSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeadershipSchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchLeadershipSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLeadershipScheduleNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeadershipScheduleNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.notes = action.payload?.items || [];
      })
      .addCase(fetchLeadershipScheduleNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearLeadershipSchedule } = leadershipScheduleSlice.actions;
export default leadershipScheduleSlice.reducer;
