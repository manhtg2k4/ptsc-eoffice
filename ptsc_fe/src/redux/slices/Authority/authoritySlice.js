import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { API_AUTHORITY } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

export const fetchAuthority = createAsyncThunk(
  "authority/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get(API_AUTHORITY);
      // API trả về { success: true, data: {...} }
      return data?.data || data;
    } catch (error) {
      logger.error("❌ Error fetching authority:", error);
      return rejectWithValue(
        error.response?.data || "Lỗi khi lấy dữ liệu authority"
      );
    }
  }
);

// Wrapper to dedupe concurrent authority fetches
let authorityPromise = null;
export const ensureAuthority = () => (dispatch, getState) => {
  const { authority } = getState();
  if (authority?.data) {
    return Promise.resolve(authority.data);
  }

  if (authorityPromise) {
    return authorityPromise;
  }

  authorityPromise = dispatch(fetchAuthority());
  authorityPromise.then(() => (authorityPromise = null)).catch(() => (authorityPromise = null));
  return authorityPromise;
};

const authoritySlice = createSlice({
  name: "authority",
  initialState: {
    data: null,
    loading: false,
    error: null,
  },
  reducers: {
    resetAuthority: (state) => {
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuthority.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuthority.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAuthority.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      });
  },
});

export const { resetAuthority } = authoritySlice.actions;
export default authoritySlice.reducer;
