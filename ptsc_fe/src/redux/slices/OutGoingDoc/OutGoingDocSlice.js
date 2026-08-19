import {
  API_DRAFT_SIGNER,
  API_GET_USER_INFLOW,
  API_OUTGOING_DOC_STATISTICS_BY_SIGNER,
  API_OUTGOING_DOC_STATISTICS_BY_TIME,
  API_OUTGOING_DOC_STATISTICS_PROCESS_SIGN,
  API_WORK_ITEMS,
  API_OUTGOING_DOCUMENTS_REQUEST_FEEDBACK,
	API_OUTGOING_DOCUMENT,
} from "@EnvironmentFile/constants/urlConfig";
import { API_PROCCESS_DOCUMENT } from "@EnvironmentFile/constants/ulrConfigNew";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const getDataReportSigner = createAsyncThunk(
  "outGoingDoc/getDataReportSigner",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DRAFT_SIGNER}`);
      return res.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const getKanbanProcessProgress = createAsyncThunk(
  "outGoingDoc/getKanbanProcessProgress",
  async (
    { processCode, workItemId, docId, isAuthority, isStamp } = {},
    { rejectWithValue }
  ) => {
    try {
      const queryParams = {
        workItemId,
        docId,
        ...(isAuthority === true && { isAuthority: true }),
        ...(isStamp !== undefined && { isStamp: !!isStamp }),
      };

      const res = await api.get(
        `${API_WORK_ITEMS}/${processCode}/process-progress`,
        { params: queryParams }
      );

      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const getUserInflow = createAsyncThunk(
  "outGoingDoc/getUserInflow",
  async (params, { rejectWithValue }) => {
    try {
      const {
        timeout = 60_000, // mặc định 1 phút
        ...restParams
      } = params || {};

      const queryParams = {
        limit: 1000,
        ...restParams,
      };

      const res = await api.get(`${API_GET_USER_INFLOW}`, {
        params: queryParams,
        timeout,
      });

      return res.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const fetchOutGoingDocumentStatisticsByTime = createAsyncThunk(
	"outGoingDoc/fetchOutGoingDocumentStatisticsByTime",
	async (params, { rejectWithValue }) => {
		try {
			const response = await api.get(API_OUTGOING_DOC_STATISTICS_BY_TIME  , { params });
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || error.message);
		}
	}
);

export const fetchOutGoingDocumentStatisticsProcessSign = createAsyncThunk(
	"outGoingDoc/fetchOutGoingDocumentStatisticsProcessSign",
	async (params, { rejectWithValue }) => {
		try {
			const response = await api.get(API_OUTGOING_DOC_STATISTICS_PROCESS_SIGN  , { params });
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || error.message);
		}
	}
);

export const fetchOutGoingDocumentStatisticsBySigner = createAsyncThunk(
	"outGoingDoc/fetchOutGoingDocumentStatisticsBySigner",
	async (params, { rejectWithValue }) => {
		try {
			const response = await api.get(API_OUTGOING_DOC_STATISTICS_BY_SIGNER  , { params });
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || error.message);
		}
	}
);

// Action Ban hành
export const promulgateDoc = createAsyncThunk(
  "outGoingDoc/promulgateDoc",
  async ({ workItem, body }, { rejectWithValue }) => {
    try {
      const res = await api.post(
        `${API_PROCCESS_DOCUMENT}/${workItem}/promulgate-doc`,
        body
      );
      return res.data;
    } catch (error) {
       return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Action Xin ý kiến (Request Feedback)
export const requestFeedback = createAsyncThunk(
  "outGoingDoc/requestFeedback",
  async ({ workItem, body }, { rejectWithValue }) => {
    try {
      const res = await api.post(
        `${API_OUTGOING_DOCUMENTS_REQUEST_FEEDBACK}/${workItem}`,
        body
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Action tìm kiếm văn bản đi
export const searchOutGoingDocuments = createAsyncThunk(
  "outGoingDoc/searchOutGoingDocuments",
  async (searchParams, { rejectWithValue }) => {
    try {
      const params = {
        ...(searchParams || {}),
        processFn: "TraCuuVbDi",
      };

      const response = await api.get(`${API_OUTGOING_DOCUMENT}/search`, {
        params,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const savePHBS = createAsyncThunk(
  "outGoingDoc/savePHBS",
  async ({ body, params } = {}, { rejectWithValue }) => {
    try {
      const res = await api.post(
        `${API_OUTGOING_DOCUMENT}/additional-release`,
        body,
        params ? { params } : undefined
      );
      return res.data;
    } catch (error) {
       return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const OutGoingDocSlice = createSlice({
  name: "outGoingDoc",
  initialState: {
    dataReportSigner: [],
    dataKanbanProcessProgress: [],
    users: [],
    searchResults: [],
    searchTotal: 0,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getDataReportSigner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataReportSigner.fulfilled, (state, action) => {
        state.loading = false;
        state.dataReportSigner = action.payload;
      })
      .addCase(getDataReportSigner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getKanbanProcessProgress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getKanbanProcessProgress.fulfilled, (state, action) => {
        state.loading = false;
        state.dataKanbanProcessProgress = action.payload;
      })
      .addCase(getKanbanProcessProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getUserInflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserInflow.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(getUserInflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(searchOutGoingDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchOutGoingDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload?.data || [];
        state.searchTotal = action.payload?.total || 0;
      })
      .addCase(searchOutGoingDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.searchResults = [];
        state.searchTotal = 0;
      });
  },
});


export default OutGoingDocSlice.reducer;
