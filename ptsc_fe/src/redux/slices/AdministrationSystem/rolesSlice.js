import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";
import {
  API_GET_COMMON_SOURCE,
  API_GET_ROLES,
  API_GET_LIST_UNIT,
  API_GET_LIST_USERS,
  API_ROLE_FUNCTIONS,
} from "@EnvironmentFile/constants/urlConfig";

//Lấy danh sách nhóm người dùng
export const getDataListroles = createAsyncThunk(
  "roles/getAll",
  async (
    { page = 1, limit = 25, query, code, sort } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit
      };
      if (sort) params.sort = sort;

      // Thêm query cho từng trường trong mảng code
      if (query && Array.isArray(code) && code.length > 0) {
         code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      const { data } = await api.get(`${API_GET_ROLES}`, { params });
      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);

//lấy danh sách người dùng thuộc nhóm
export const getDataListUserByGroup = createAsyncThunk(
  "roles/getUserbyGroup",
  async (
    { page = 1, limit = 25, query, code, sort,id } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
      };
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      if (query !== "" && code && sort) {
        const { data } = await api.get(`${API_GET_ROLES}/${id}/users`, { params });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(`${API_GET_ROLES}/${id}/users`, {
          params: { page, limit, sort },
        });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);
//lấy danh sách người dùng thuộc nhóm
export const getDataListGroupUnit = createAsyncThunk(
  "roles/getDataListGroupUnit",
  async (
    { page = 1, limit = 25, query, code, sort,id } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
      };
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      if (query !== "" && code && sort) {
        const { data } = await api.get(`${API_GET_ROLES}/${id}/organizationUnit`, { params });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(`${API_GET_ROLES}/${id}/organizationUnit`, {
          params: { page, limit, sort },
        });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);
//Lấy danh sách người dùng thuộc đơn vị
export const getDataListUserByUnit = createAsyncThunk(
  "unit/getUserAllByUnit",
  async (
    { page = 1, limit = 25, query, code, sort,id } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
      };
      if(id !== 'all') {
        params.parent = id;
      }
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      const url =  id === "all" ? `${API_GET_LIST_USERS}/all` : `${API_GET_LIST_USERS}`;
      if (query !== "" && code && sort) {
        const { data } = await api.get(`${url}`, { params });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(`${url}`, {
          params: id !== 'all' ? { page, limit, sort, parent: id } : { page, limit, sort },
        });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);

export const fetchSearchUnit = createAsyncThunk(
    "unit/fetchSearchUnit",
    async ({ queryParams }, { rejectWithValue }) => {
        try {
            const response = await fetch(
                `${API_GET_LIST_UNIT}/search?${queryParams}`
            );
            if (!response.ok) throw new Error("Không tìm thấy tài liệu!");
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const getDataDetailroles = createAsyncThunk(
    "roles/getDataDetailroles",
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.get(`${API_GET_ROLES}/${id}`)
            return res.data
        } catch (error) {
            return rejectWithValue(error.res?.data || error.message);
        }
    }
)
export const getDataDetailUnitUpdate = createAsyncThunk(
  "unit/getDataDetailUnitUpdate",
  async (id, { rejectWithValue }) => {
      try {
          const res = await api.get(`${API_GET_LIST_UNIT}/update/${id}`)
          return res.data
      } catch (error) {
          return rejectWithValue(error.res?.data || error.message);
      }
  }
)

export const getListTypeUnit = createAsyncThunk(
    "unit/getListTypeUnit",
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.get(`${API_GET_COMMON_SOURCE}/S001`)
            return res.data
        } catch (error) {
            return rejectWithValue(error.res?.data || error.message);
        }
    }
)

export const getListPosition = createAsyncThunk(
    "unit/getListPosition",
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.get(`${API_GET_COMMON_SOURCE}/S002`)
            return res.data
        } catch (error) {
            return rejectWithValue(error.res?.data || error.message);
        }
    }
)

export const getListUnit = createAsyncThunk(
    "unit/getListUnit",
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.get(`${API_GET_COMMON_SOURCE}/S002`)
            return res.data
        } catch (error) {
            return rejectWithValue(error.res?.data || error.message);
        }
    }
)


//thêm mới vai trò
export const addRoles = createAsyncThunk(
  "roles/add",
  async (dataUnit, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_GET_ROLES}`, dataUnit);
      return response.data; // Dữ liệu từ API
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi thêm vai trò!");
    }
  }
);

//Cập nhật đơn vị 
export const updateRoles = createAsyncThunk(
  "roles/update",
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `${API_GET_ROLES}/${id}`,
        updatedData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi cập nhật vai trò");
    }
  }
);
//Xóa nhiều vai trò
export const deleteMultipleRoles = createAsyncThunk(
  "roles/delete",
  async (ids, { rejectWithValue }) => {
    try {
      const response = await api.delete(`${API_GET_ROLES}`, {
        data: { ids }, // Truyền mảng ids trong body của request
      });
      return response.data; // API nên trả về danh sách các ID đã xóa thành công
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi xóa vai trò");
    }
  }
);

// Lấy danh sách phân hệ (chức năng)
export const getListRoleFunctions = createAsyncThunk(
  "roles/getRoleFunctions",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${API_ROLE_FUNCTIONS}`);
      return data?.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi lấy danh sách phân hệ");
    }
  }
);



const rolesSlice = createSlice({
    name: "roles",
    initialState: {
        listroles: [],
        listUserByGroup: [],
        listGroupUnit: [],
        listUserByUnit:[],
        detailroles: null,
        detailUnit: null,
        searchDistrict: null,
        loading: false,
        error: null,
        listTypeUnit: [],
        listPosition: [],
        listRoleFunctions: [],
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(getDataListroles.pending, (state) => {
                state.loading = true
            })
            .addCase(getDataListroles.fulfilled, (state, action) => {
                state.loading = false;
                state.listroles = action.payload?.data
            })
            .addCase(getDataListroles.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message
            })
            .addCase(getDataListUserByGroup.pending, (state) => {
              state.loading = true
          })
          .addCase(getDataListUserByGroup.fulfilled, (state, action) => {
              state.loading = false;
              state.listUserByGroup = action.payload?.data
          })
          .addCase(getDataListUserByGroup.rejected, (state, action) => {
              state.loading = false;
              state.error = action.error.message
          })
          .addCase(getDataListGroupUnit.pending, (state) => {
            state.loading = true
        })
        .addCase(getDataListGroupUnit.fulfilled, (state, action) => {
            state.loading = false;
            state.listGroupUnit = action.payload?.data
        })
        .addCase(getDataListGroupUnit.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message
        })
            .addCase(getDataListUserByUnit.pending, (state) => {
              state.loading = true
          })
          .addCase(getDataListUserByUnit.fulfilled, (state, action) => {
              state.loading = false;
              state.listroles = action.payload?.data
          })
          .addCase(getDataListUserByUnit.rejected, (state, action) => {
              state.loading = false;
              state.error = action.error.message
          })
            // Xử lý tìm kiếm quận, huyện, thị xã
            .addCase(fetchSearchUnit.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSearchUnit.fulfilled, (state, action) => {
                state.loading = false;
                state.listroles = action.payload;
            })
            .addCase(fetchSearchUnit.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            //Xử lý xem chi tiết quận, huyện, thị xã
            .addCase(getDataDetailroles.pending, (state) => {
                state.loading = true
            })
            .addCase(getDataDetailroles.fulfilled, (state, action) => {
                state.loading = false;
                state.detailroles = action.payload.data
            })
            .addCase(getDataDetailroles.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message
            })
            .addCase(getDataDetailUnitUpdate.pending, (state) => {
              state.loading = true
          })
          .addCase(getDataDetailUnitUpdate.fulfilled, (state, action) => {
              state.loading = false;
              state.detailUnit = action.payload.data
          })
          .addCase(getDataDetailUnitUpdate.rejected, (state, action) => {
              state.loading = false;
              state.error = action.error.message
          })

            //get danh sach loai don vi
            .addCase(getListTypeUnit.pending, (state) => {
                state.loading = true
            })
            .addCase(getListTypeUnit.fulfilled, (state, action) => {
                state.loading = false;
                state.listTypeUnit = action.payload.data
            })
            .addCase(getListTypeUnit.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message
            })
             //get danh sach chức vụ
             .addCase(getListPosition.pending, (state) => {
                state.loading = true
            })
            .addCase(getListPosition.fulfilled, (state, action) => {
                state.loading = false;
                state.listPosition = action.payload.data
            })
            .addCase(getListPosition.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message
            })

            //thêm mới nhóm người dùng
            .addCase(addRoles.pending, (state) => {
                state.loading = true
            })
            .addCase(addRoles.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(addRoles.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message
            })

            // Xử lý Update
            .addCase(updateRoles.fulfilled, (state, action) => {
              const updatedRole = action.payload.data;
              const index = state.listroles.findIndex(
                (cat) => cat._id === updatedRole?._id
              );
              if (index !== -1) {
                state.listroles[index] = { ...state.listroles[index], ...updatedRole };
              }
            })
            // Xử lý Delete
            .addCase(deleteMultipleRoles.fulfilled, (state, action) => {
              const deletedIds = action.meta.arg; // Lấy danh sách ID đã xóa từ tham số của thunk
              state.listroles = state.listroles.filter(
                (role) => !deletedIds.includes(role._id)
              );
            })
            .addCase(getListRoleFunctions.pending, (state) => {
                state.loading = true;
            })
            .addCase(getListRoleFunctions.fulfilled, (state, action) => {
                state.loading = false;
                state.listRoleFunctions = action.payload;
            })
            .addCase(getListRoleFunctions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
           
             
    }
  }
);



export default rolesSlice.reducer;
