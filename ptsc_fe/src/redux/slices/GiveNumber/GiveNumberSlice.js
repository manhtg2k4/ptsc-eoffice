import {
  API_ADD_VANBANDI_DHVB,
  API_BOOK_DOCUMENTS,
  API_CONVERT_FILE_TO_PDF,
  API_FILE_PREVIEW,
  API_FILES_UPLOAD,
  API_INSERT_TEXT_TO_PDF,
  API_POST_GIVE_NUMBER,
} from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const uploadFileToCmt = createAsyncThunk(
  "giveNumber/uploadFileToCmt",
  async (file, { rejectWithValue }) => {
    try {
      const res = await api.post(`${API_FILES_UPLOAD}`, file);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const getListBookDocuments = createAsyncThunk(
  "giveNumber/getListBookDocuments",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(
        `${API_BOOK_DOCUMENTS}?type_document=OutGoingDocument&active=true`
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu file!"
      );
    }
  }
);

export const postGiveNumber = createAsyncThunk(
  "giveNumber/postGiveNumber",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post(`${API_POST_GIVE_NUMBER}`, data);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const putGiveNumber = createAsyncThunk(
  "giveNumber/putGiveNumber",
  async ({ fileId, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(
        `${API_ADD_VANBANDI_DHVB}/${fileId}/sign-number`,
        data
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const postInsertTextToPdf = createAsyncThunk(
  "giveNumber/postInsertTextToPdf",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post(`${API_INSERT_TEXT_TO_PDF}`, data , {
				timeout: 600000,
			});
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const convertFileToPdf = createAsyncThunk(
  "giveNumber/convertFileToPdf",
  async (idFile, { rejectWithValue }) => {
    try {
      const res = await api.post(`${API_CONVERT_FILE_TO_PDF}`, idFile);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const previewFileToPdf = createAsyncThunk(
  "giveNumber/previewFileToPdf",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post(`${API_FILE_PREVIEW}`, payload);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

const GiveNumberSlice = createSlice({
  name: "giveNumber",
  initialState: {
    listBookDocuments: [],
		filedConvertToPdf: null,
		previewFileToPdf: null,
    loading: false,
    error: null,
    optionsSoVbDi: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getListBookDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getListBookDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.listBookDocuments = action.payload?.items;
        state.optionsSoVbDi = action.payload?.items?.map((item) => ({
          value: item.bookDocumentId,
          label: item.name,
        }));
      })
      .addCase(getListBookDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(convertFileToPdf.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(convertFileToPdf.fulfilled, (state, action) => {
        logger.log("action.payload", action.payload);
        state.loading = false;
        state.filedConvertToPdf = action.payload;
      })
      .addCase(convertFileToPdf.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(previewFileToPdf.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(previewFileToPdf.fulfilled, (state, action) => {
        logger.log("action.payload", action.payload);
        state.loading = false;
        state.previewFileToPdf = action.payload;
      })
      .addCase(previewFileToPdf.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
  },
});

export default GiveNumberSlice.reducer;
