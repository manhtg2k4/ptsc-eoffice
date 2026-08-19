import {
  API_ADD_VANBANDI_DHVB,
  API_EXTEND_PROCESSING_TIME,
  API_GET_DRAFT_INCOMING_DOCUMENT,
  API_GET_OUTGOING_DOC_BY_INCOMING,
  API_IMCOMING,
  API_INCOMING_DOCUMENT_RECALLED_LIST,
  API_PATCH_ATTACHMENTS_CERT_COPY,
} from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const getListInDocRecalled = createAsyncThunk(
	"incommingDoc/getListInDocRecalled",
	async (
		{ page = 1, limit = 25, query, sort, docId, isAuthority, startDate, endDate, ...extraParams } = {},
		{ rejectWithValue }
	) => {
		try {
			const params = { page, limit, sort, ...extraParams };
			if (query !== undefined && query !== "") params.query = query;
			if (isAuthority) params.isAuthority = isAuthority;
			if (startDate) params.startDate = startDate;
			if (endDate) params.endDate = endDate;
			const res = await api.get(`${API_INCOMING_DOCUMENT_RECALLED_LIST}/${docId}`, { params });
			return { data: res?.data?.items || [], total: res?.data?.total || 0, success: res?.status === 200 || false };
		} catch (error) {
			return rejectWithValue(error.response?.data || "Lỗi khi lấy danh sách");
		}
	}
);

export const getListOutGoingByIncoming = createAsyncThunk(
	"incommingDoc/getListOutGoingByIncoming",
	async (
		{ page = 1, limit = 25, query, sort, docId, isAuthority, ...extraParams } = {},
		{ rejectWithValue }
	) => {
		try {
			const params = { page, limit, sort, ...extraParams };
			if (query !== undefined && query !== "") params.query = query;
			if (isAuthority) params.isAuthority = isAuthority;
			const res = await api.get(`${API_GET_OUTGOING_DOC_BY_INCOMING}/${docId}`, { params });
			return { data: res?.data?.items || [], total: res?.data?.total || 0, success: res?.status === 200 || false };
		} catch (error) {
			return rejectWithValue(error.response?.data || "Lỗi khi lấy danh sách");
		}
	}
);

export const patchFilesCopy = createAsyncThunk(
	"incommingDoc/patchFilesCopy",
	async (body, { rejectWithValue }) => {
		try {
			const res = await api.patch(`${API_PATCH_ATTACHMENTS_CERT_COPY}`, body)
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi tải file!"
			);
		}
	})

export const patchFileImportance = createAsyncThunk(
	"incommingDoc/patchFileImportance",
	async ({ fileId, isImportant }, { rejectWithValue }) => {
		try {
			const res = await api.patch(`/api/files/${fileId}/importance`, { isImportant })
			return res.data
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi cập nhật!"
			);
		}
	})

export const postSimpleNext = createAsyncThunk(
	"incommingDoc/postSimpleNext",
	async ({ docId, workItemId, body }, { rejectWithValue }) => {
		try {
			const res = await api.post(
				`${API_ADD_VANBANDI_DHVB}/${docId}/${workItemId}/stampDoc`,
				body,
				{
					timeout: 60000,
					responseType: "blob", // 🔥 THÊM DÒNG NÀY
				}
			);
			return res.data;
		} catch (error) {
			let errorData = error.response?.data;
			if (errorData instanceof Blob) {
				try {
					const text = await errorData.text();
					const parsed = JSON.parse(text);
					errorData = parsed;
				} catch (e) {
					try {
						const text = await errorData.text();
						errorData = text ? { message: text } : null;
					} catch (innerE) {
						errorData = null;
					}
				}
			}
			return rejectWithValue(
				errorData || error.message || "Lỗi khi tải file!"
			);
		}
	}
);

export const getDataIncomingDocumentDraft = createAsyncThunk(
	"incommingDoc/getDataIncomingDocumentDraft",
	async (_, { rejectWithValue }) => {
		try {
			const response = await api.get(API_GET_DRAFT_INCOMING_DOCUMENT);
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || error.message);
		}
	}
);

export const deleteDataIncomingDocumentDraft = createAsyncThunk(
	"incommingDoc/deleteDataIncomingDocumentDraft",
	async (docId, { rejectWithValue }) => {
		try {
			const response = await api.delete(`${API_EXTEND_PROCESSING_TIME}/${docId}/draft`);
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response?.data || error.message);
		}
	}
);

export const saveCertifiedCopyRecord = createAsyncThunk(
	"incommingDoc/saveCertifiedCopyRecord",
  async ({ docId, workItemId, body }, { rejectWithValue }) => {
    try {
      const res = await api.post(
        `${API_IMCOMING}/${docId}/${workItemId}/submit-file`,
        body
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải file!"
      );
    }
  }
);

export const searchIncomingDocuments = createAsyncThunk(
  "incommingDoc/searchIncomingDocuments",
  async (searchParams, { rejectWithValue }) => {
    try {
      const params = {
        ...(searchParams || {}),
        processFn: "TraCuuVbDen",
      };
      const response = await api.get(`${API_IMCOMING}/search`, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const IncommingDocSlice = createSlice({
	name: "incommingDoc",
	initialState: {
		dataInDocRecalled: [],
		dataDraft: [],
		dataFileCopy: {},
		dataOutGoingByIncomming: [],
		selectedTextCopy: "",
		selectedImportant: "",
		viewFile: null,
		searchResults: [],
		searchTotal: 0,
		loading: false,
		error: null,
	},
	reducers: {
		setSelectedTextCopy(state, action) {
			state.selectedTextCopy = action.payload;
		},
		clearSelectedTextCopy(state) {
			state.selectedTextCopy = "";
		},
		setSelectedImportant(state, action) {
			state.selectedImportant = action.payload;
		},
		clearSelectedImportant(state) {
			state.selectedImportant = "";
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(getListInDocRecalled.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getListInDocRecalled.fulfilled, (state, action) => {
				state.loading = false;
				state.dataInDocRecalled = action.payload;
			})
			.addCase(getListInDocRecalled.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(getListOutGoingByIncoming.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getListOutGoingByIncoming.fulfilled, (state, action) => {
				state.loading = false;
				state.dataOutGoingByIncomming = action.payload;
			})
			.addCase(getListOutGoingByIncoming.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(getDataIncomingDocumentDraft.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getDataIncomingDocumentDraft.fulfilled, (state, action) => {
				state.loading = false;
				state.dataDraft = action.payload || [];
			})
			.addCase(getDataIncomingDocumentDraft.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(postSimpleNext.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(postSimpleNext.fulfilled, (state, action) => {
				state.loading = false;
				state.dataFileCopy = action.payload || {};
			})
			.addCase(postSimpleNext.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(searchIncomingDocuments.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(searchIncomingDocuments.fulfilled, (state, action) => {
				state.loading = false;
				state.searchResults = action.payload?.items || [];
				state.searchTotal = action.payload?.total || 0;
			})
			.addCase(searchIncomingDocuments.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});

export const { setSelectedTextCopy, clearSelectedTextCopy, setSelectedImportant, clearSelectedImportant } =
	IncommingDocSlice.actions;

export default IncommingDocSlice.reducer;