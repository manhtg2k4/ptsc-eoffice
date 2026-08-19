import { API_DYNAMIC, API_GET_VIEW_CONFIG } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";
 

// Thêm mới field
export const addDynamicForm = createAsyncThunk(
  "dynamic/addField",
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_DYNAMIC}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi thêm mới");
    }
  }
);
export const fetchListFormDynamic = createAsyncThunk(
    "dynamic/fetchAll",
    async ({ query, code, page = 1, limit = 999999999, sort, processID }, { rejectWithValue }) => {
        try {
            const params = { page, limit, sort, processID };
            // Chỉ thêm các tham số tìm kiếm nếu có query
            if (query && Array.isArray(code) && code.length > 0) {
                code.forEach((field) => {
                    params[field] = query;
                });
            }
            const { data } = await api.get(`${API_DYNAMIC}`, { params });
            return { data: data?.data || [], total: data?.total || 0 };
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Lỗi khi lấy danh sách"
            );
        }
    }
);
export const getFormBpmnDetail = createAsyncThunk(
  "dynamic/getFormDetail",
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
  "dynamic/addForm",
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
// export const updateDynamicForm = createAsyncThunk(
//   "dynamic/updateForm",
//   async ({ id, ...body }, { rejectWithValue }) => {
//     try {
//       const response = await api.put(`${API_GET_VIEW_CONFIG}/${id}`, body);
//       return response.data.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data || "Lỗi khi cập nhật");
//     }
//   }
// );


export const updateDynamicForm = createAsyncThunk(
  "dynamic/updateForm",
	async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `${API_DYNAMIC}/${id}`,
				updatedData
      );
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi cập nhật");
    }
  }
);
//Xóa
// export const deleteDynamicForm = createAsyncThunk(
//   "dynamic/deleteForm",
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

export const deleteDynamicForm = createAsyncThunk(
	"dynamic/delete",
	async (ids, { rejectWithValue }) => {
		try {
			const response = await api.delete(
				`${API_DYNAMIC}/${ids?.ids}`,
			);
			return response.data; // { success: true }
		} catch (error) {
			return rejectWithValue(error.response?.data || "Lỗi khi xóa");
		}
	}
);
const dynamicFormSlice = createSlice({
  name: "dynamic",
  initialState: {
    listDynamic: [],
    listDynamicForm: [],
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
      .addCase(addDynamicForm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addDynamicForm.fulfilled, (state, action) => {
        state.loading = false;

        if (!state.listDynamic || !Array.isArray(state.listDynamic)) {
          state.listDynamic = [];
        }

        state.listDynamic.unshift(action.payload);
      })
      .addCase(addDynamicForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchListFormDynamic.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchListFormDynamic.fulfilled, (state, action) => {
        state.loading = false;
        state.listDynamicForm = action.payload;
      })
      .addCase(fetchListFormDynamic.rejected, (state, action) => {
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

      .addCase(updateDynamicForm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDynamicForm.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateDynamicForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Xóa
      .addCase(deleteDynamicForm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDynamicForm.fulfilled, (state, action) => {
        state.loading = false;
        // const deletedIds = action.meta.arg;
        if (action.payload.success) {
          // state.list = state.list.filter(
          //   (item) => !deletedIds.includes(item._id)
          // );
          // state.total = state.total - deletedIds.length;
        }
      });
  },
});

export default dynamicFormSlice.reducer;
