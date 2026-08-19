
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";
import { API_NEWS_STATISTICS, API_NEWS_STATISTICS_DEPARTMENT, API_NEWS_STATISTICS_TOP } from "@EnvironmentFile/constants/urlConfig";

export const fetchNewsStatistics = createAsyncThunk(
  "newsStatistics/fetchNewsStatistics",
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get(API_NEWS_STATISTICS, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchNewsStatisticsTop = createAsyncThunk(
  "newsStatistics/fetchNewsStatisticsTop",
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get(API_NEWS_STATISTICS_TOP, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchNewsStatisticsDepartment = createAsyncThunk(
  "newsStatistics/fetchNewsStatisticsDepartment",
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get(API_NEWS_STATISTICS_DEPARTMENT, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const newsStatisticsSlice = createSlice({
  name: "newsStatistics",
  initialState: {
    data: [],
    total: 0,
    loading: false,
    error: null,
  },
  reducers: {
    resetNewsStatistics: (state) => {
      state.data = [];
      state.total = 0;
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNewsStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNewsStatistics.fulfilled, (state, action) => {
        state.loading = false;
        if (Array.isArray(action.payload)) {
            state.data = action.payload;
            state.total = action.payload.length;
        } else {
            state.data = action.payload?.data || [];
            state.total = action.payload?.total || 0;
        }
      })
      .addCase(fetchNewsStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchNewsStatisticsTop
      .addCase(fetchNewsStatisticsTop.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNewsStatisticsTop.fulfilled, (state, action) => {
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
      .addCase(fetchNewsStatisticsTop.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchNewsStatisticsDepartment
      .addCase(fetchNewsStatisticsDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNewsStatisticsDepartment.fulfilled, (state, action) => {
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
      .addCase(fetchNewsStatisticsDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetNewsStatistics } = newsStatisticsSlice.actions;
export default newsStatisticsSlice.reducer;
