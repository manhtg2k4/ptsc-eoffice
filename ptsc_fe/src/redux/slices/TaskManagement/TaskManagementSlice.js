import { API_UPDATE_STATUS_JOB } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const upDateStatusJob = createAsyncThunk(
  "taskManagement/upDateStatusJob",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`${API_UPDATE_STATUS_JOB}/${id}`, payload);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Lỗi khi cập nhật trạng thái công việc!"
      );
    }
  }
);

const TaskManagementSlice = createSlice({
  name: "taskManagement",
  initialState: {
    dataJob: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(upDateStatusJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(upDateStatusJob.fulfilled, (state, action) => {
        state.loading = false;
        state.dataJob = action.payload;
      })
      .addCase(upDateStatusJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default TaskManagementSlice.reducer;
