import { API_VIEW_FILE } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const viewFile = createAsyncThunk(
  "uploadFile/viewFile",
  async (file, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `${API_VIEW_FILE}/${file.fileId || file.id}`,
        { responseType: "blob" }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
); 

export const viewBase64FileWithId = createAsyncThunk(
  "uploadFile/viewBase64FileWithId",
  async (idFile, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `${API_VIEW_FILE}/${idFile}?public=true`,
        { responseType: "blob", timeout: 100000}
			);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
); 

export const patchFileRecall = createAsyncThunk(
  "uploadFile/patchFileRecall",
  async ({ fileId, isRecall }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/files/${fileId}/recall`, { isRecall });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi cập nhật trạng thái thu hồi!"
      );
    }
  }
);

const UploadFileSlice = createSlice({
  name: "uploadFile",
  initialState: {
    comments: [],
		file: null,
		base64File: null,
    viewFile: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(viewFile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(viewFile.fulfilled, (state, action) => {
        state.loading = false;
        state.viewFile = action.payload;
      })
      .addCase(viewFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(viewBase64FileWithId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(viewBase64FileWithId.fulfilled, (state, action) => {
        state.loading = false;
        state.base64File = action.payload;
      })
      .addCase(viewBase64FileWithId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(patchFileRecall.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(patchFileRecall.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(patchFileRecall.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
  },
});

export default UploadFileSlice.reducer;
