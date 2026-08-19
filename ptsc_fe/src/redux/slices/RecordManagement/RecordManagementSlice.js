import {
  API_ARCHIVES,
  API_FOLDER_MANAGEMENT,
  API_LIST_ACHIVE_RECORDS,
  API_LIST_ACHIVE_RECORDS_CHILDREN,
  API_PROFILE,
} from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const postDocumentDraft = createAsyncThunk(
  "recordManagement/postDocumentDraft",
  async (body, { rejectWithValue }) => {
    try {
      const res = await api.post(`${API_ARCHIVES}/draft`, body);
      return res.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const postDocument = createAsyncThunk(
  "recordManagement/postDocument",
  async (body, { rejectWithValue }) => {
    try {
      const res = await api.post(`${API_ARCHIVES}`, body);
      logger.log("res", res, body);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const updateDocument = createAsyncThunk(
  "recordManagement/updateDocument",
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const res = await api.put(`${API_ARCHIVES}/${id}`, body);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi cập nhật!"
      );
    }
  }
);

export const getDetailDocument = createAsyncThunk(
  "recordManagement/getDetailDocument",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_ARCHIVES}/${id}`);
      return res.data?.data || res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy chi tiết!"
      );
    }
  }
);

export const getDetailFolder = createAsyncThunk(
  "recordManagement/getDetailFolder",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_FOLDER_MANAGEMENT}/${id}`);
      return res.data?.data || res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy chi tiết danh mục!"
      );
    }
  }
);

export const updateFolder = createAsyncThunk(
  "recordManagement/updateFolder",
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const res = await api.put(`${API_FOLDER_MANAGEMENT}/${id}`, body);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi cập nhật danh mục!"
      );
    }
  }
);

export const archiveDocument = createAsyncThunk(
  "recordManagement/archiveDocument",
  async ({ id, endDate }, { rejectWithValue }) => { 
    try {
      const res = await api.patch(`${API_ARCHIVES}/${id}/state`, { 
        recordState: 2, 
        endDate: endDate 
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lưu trữ hồ sơ!"
      );
    }
  }
);

export const deleteDocument = createAsyncThunk(
  "recordManagement/deleteDocument",
  async (ids, { rejectWithValue }) => {
    logger.log("ids to delete", ids);
    try {
      const res = await api.delete(`${API_ARCHIVES}/permanent`, {
        data: { ids },
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi xóa hồ sơ!"
      );
    }
  }
);

export const getListParentsAchiveRecord = createAsyncThunk(
  "recordManagement/getListParentsAchiveRecord",
  async ({ page = 1, limit = 20, query, code, ...filterParams }, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_LIST_ACHIVE_RECORDS}?type=all&processFn=qlhs`, {
        params: {
          page,
          limit,
          ...(query && { query }),
          ...(code && { code }),
          ...filterParams,
        },
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy dữ liệu folder!"
      );
    }
  }
);

export const getListChildParentsAchiveRecord = createAsyncThunk(
  "recordManagement/getListChildParentsAchiveRecord",
  async ({ parentId, page = 1, limit = 10, query, code, ...filterParams }, { rejectWithValue }) => {
    try {
      const res = await api.get(
        `${API_LIST_ACHIVE_RECORDS_CHILDREN}/${parentId}`,
        {
          params: {
            page,
            limit,
            ...(query && { query }),
            ...(code && { code }),
            ...filterParams,
          },
        }
      );

      return res.data?.data || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy dữ liệu folder!"
      );
    }
  }
);

export const addFilesToItem = createAsyncThunk(
  "recordManagement/addFilesToItem",
  async ({ itemId, fileIds }, { rejectWithValue }) => {
    try {
      const res = await api.put(`${API_PROFILE}/items/${itemId}/files`, {
        fileIds,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi thêm tài liệu vào hồ sơ!"
      );
    }
  }
);

const RecordManagementSlice = createSlice({
  name: "recordManagement",
  initialState: {
    dataPost: [],
    dataDocDraft: {},
    dataSelectFolder: [],
    dataSelectFileInFolder: [],
    dataDetail: {},
    dataUpdate: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(postDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(postDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.dataPost = action.payload;
      })
      .addCase(postDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.dataUpdate = action.payload;
      })
      .addCase(updateDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getDetailDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDetail = action.payload;
      })
      .addCase(getDetailFolder.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDetail = action.payload;
      })
      .addCase(updateFolder.fulfilled, (state, action) => {
        state.loading = false;
        state.dataUpdate = action.payload;
      })
      //Data fake select folder
      .addCase(getListParentsAchiveRecord.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getListParentsAchiveRecord.fulfilled, (state, action) => {
        state.loading = false;
        state.dataSelectFolder = action.payload;
      })
      .addCase(getListParentsAchiveRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      //Data fake select file in folder
      .addCase(getListChildParentsAchiveRecord.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getListChildParentsAchiveRecord.fulfilled, (state, action) => {
        state.loading = false;
        state.dataSelectFileInFolder = action.payload;
      })
      .addCase(getListChildParentsAchiveRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(postDocumentDraft.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(postDocumentDraft.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDocDraft = action.payload;
      })
      .addCase(postDocumentDraft.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addFilesToItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addFilesToItem.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addFilesToItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default RecordManagementSlice.reducer;
