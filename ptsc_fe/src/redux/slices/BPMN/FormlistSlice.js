import { API_DELETE_CONFIG, API_GET_VIEW_CONFIG } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";
 

// Thêm mới field
export const addFieldBpmn = createAsyncThunk(
  "bpmn/addField",
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `${API_GET_VIEW_CONFIG}/${id}/fields`,
        body
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi thêm mới");
    }
  }
);

export const fetchListFormBpmn = createAsyncThunk(
    "bpmn/fetchAll",
    async ({ query, code, page = 1, limit = 999999999, sort, processID }, { rejectWithValue }) => {
        try {
            const params = { page, limit, sort, type: 'attribute', processID };
            // Logic này tạo ra một query với điều kiện AND cho tất cả các trường được chọn.
            // Ví dụ: ?code=abc&name=abc
            if (query && Array.isArray(code) && code.length > 0) {
                code.forEach((field) => {
                    params[field] = query;
                });
            }
            const { data } = await api.get(`${API_GET_VIEW_CONFIG}`, { params });
            return { data: data?.data || [], total: data?.total || 0 };
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Lỗi khi lấy danh sách"
            );
        }
    }
);
export const getFormBpmnDetail = createAsyncThunk(
  "bpmn/getFormDetail",
  async (id, { rejectWithValue }) => {
    try {
			const response = await api.get(`${API_GET_VIEW_CONFIG}/${id}`);

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Lỗi khi lấy dữ liệu chi tiết"
      );
    }
  }
);

//Thêm mới form
export const addFormBpmn = createAsyncThunk(
  "bpmn/addForm",
  async (body, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_GET_VIEW_CONFIG}`, body);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi thêm mới");
    }
  }
);
//Cập nhật
// export const updateFormBpmn = createAsyncThunk(
//   "bpmn/updateForm",
//   async ({ id, ...body }, { rejectWithValue }) => {
//     try {
//       const response = await api.put(`${API_GET_VIEW_CONFIG}/${id}`, body);
//       return response.data.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data || "Lỗi khi cập nhật");
//     }
//   }
// );


export const updateFormBpmn = createAsyncThunk(
  "bpmn/updateForm",
	async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `${API_GET_VIEW_CONFIG}/${id}`,
				updatedData
      );
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi cập nhật");
    }
  }
);
//Xóa
// export const deleteFormBpmn = createAsyncThunk(
//   "bpmn/deleteForm",
//   async (ids, { rejectWithValue }) => {
//     try {
//       const response = await api.request({
//         method: "DELETE",
//         url: `${API_GET_VIEW_CONFIG}`,
//         data: {
//           ids: Array.isArray(ids) ? ids : [ids], // Đảm bảo ids là mảng
//         },
//       });
//       return response.data; // { success: true }
//     } catch (error) {
//       return rejectWithValue(error.response?.data || "Lỗi khi xóa");
//     }
//   }
// );

export const deleteFormBpmn = createAsyncThunk(
  "bpmn/deleteForm",
  async (codes, { rejectWithValue }) => {
		try {
			const codeArray = Array.isArray(codes) ? codes : [codes];

			// Tạo mảng transformedCodes từ từng code
			const transformedCodes = codeArray.flatMap(code =>
				code ? [`table_${code}`, `form_${code}`, `attribute_${code}`, code] : []
			);
      const response = await api.request({
        method: "DELETE",
        // url: `${API_GET_VIEW_CONFIG}`,
				url: `${API_DELETE_CONFIG}`,
        data: {
          codes: Array.isArray(transformedCodes) ? transformedCodes : [transformedCodes], // Đảm bảo ids là mảng
        },
      });
      return response.data; // { success: true }
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi xóa");
    }
  }
);
const formListSlice = createSlice({
  name: "formList",
  initialState: {
    listFieldBpmn: [],
    listFormBpmn: [],
    listPostBoxInShelf: [],
    listProfiles: [],
    listFileInBoxIsNull: [],
    listFonds: [],
    loading: false,
    selectedDocumentTypeGroup: null,
    detailShelfManagementByIdAndCode: null,
    searchDocumentTypeGroup: null,
    success: null,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(addFieldBpmn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addFieldBpmn.fulfilled, (state, action) => {
        state.loading = false;

        if (!state.listFieldBpmn || !Array.isArray(state.listFieldBpmn)) {
          state.listFieldBpmn = [];
        }

        state.listFieldBpmn.unshift(action.payload);
      })
      .addCase(addFieldBpmn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchListFormBpmn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchListFormBpmn.fulfilled, (state, action) => {
        state.loading = false;
        state.listFormBpmn = action.payload;
      })
      .addCase(fetchListFormBpmn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(addFormBpmn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addFormBpmn.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addFormBpmn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(updateFormBpmn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFormBpmn.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateFormBpmn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Xóa
      .addCase(deleteFormBpmn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFormBpmn.fulfilled, (state, action) => {
        state.loading = false;
        const deletedIds = action.meta.arg;
        if (action.payload.success) {
          state.list = state.list.filter(
            (item) => !deletedIds.includes(item._id)
          );
          state.total = state.total - deletedIds.length;
        }
      });
  },
});

export default formListSlice.reducer;
