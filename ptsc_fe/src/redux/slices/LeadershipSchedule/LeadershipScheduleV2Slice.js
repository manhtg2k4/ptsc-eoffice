import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_LEADERSHIP_SCHEDULE } from '@EnvironmentFile/constants/urlConfig';
import api from '@services/api';

export const fetchLeadershipScheduleV2 = createAsyncThunk(
  'leadershipScheduleV2/fetchLeadershipScheduleV2',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get(API_LEADERSHIP_SCHEDULE, { params });
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const leadershipScheduleV2Slice = createSlice({
  name: 'leadershipScheduleV2',
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearLeadershipScheduleV2: (state) => {
      state.data = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeadershipScheduleV2.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeadershipScheduleV2.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchLeadershipScheduleV2.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearLeadershipScheduleV2 } = leadershipScheduleV2Slice.actions;
export default leadershipScheduleV2Slice.reducer;
