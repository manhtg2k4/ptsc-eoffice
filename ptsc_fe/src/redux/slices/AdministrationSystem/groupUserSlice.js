import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  API_GET_COMMON_SOURCE,
  API_GET_GROUP_USERS,
  API_GET_LIST_UNIT,
  API_GET_LIST_USERS,
} from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

//Lấy danh sách nhóm người dùng
export const getDataListGroupUsers = createAsyncThunk(
  "group/getAll",
  async (
    { page = 1, limit = 25, query, code, sort } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
      };

      // Chỉ thêm sort vào params khi nó thực sự có giá trị
      if (sort) {
        params.sort = sort;
      }

      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code) && query) {
        code.forEach((field) => {
          params[field] = query;
        });
      }

      const { data } = await api.get(`${API_GET_GROUP_USERS}`, { params });
      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Lỗi khi lấy danh sách nhóm người dùng"
      );
    }
  }
);

//lấy danh sách người dùng thuộc nhóm
//lấy danh sách người dùng thuộc nhóm
export const getDataListUserByGroup = createAsyncThunk(
  "group/getUserbyGroup",
  async (
    { page = 1, limit = 25, query, code, sort, id } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = { page, limit };

      if (sort) {
        params.sort = sort;
      }

      // ✅ Hỗ trợ cả khi code là string hoặc array
      if (query && code) {
        if (Array.isArray(code)) {
          code.forEach((field) => {
            params[field] = query;
          });
        } else {
          params[code] = query;
        }
      }

      const { data } = await api.get(`${API_GET_GROUP_USERS}/${id}/users`, {
        params,
      });

      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy danh sách người dùng theo nhóm"
      );
    }
  }
);

//lấy danh sách người dùng thuộc nhóm
export const getDataListGroupUnit = createAsyncThunk(
  "group/getDataListGroupUnit",
  async (
    { page = 1, limit = 25, query, code, sort, id } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
      };
      if (sort) {
        params.sort = sort;
      }
      if (Array.isArray(code) && query) {
        code.forEach((field) => {
          params[field] = query; 
        });
      }
      const { data } = await api.get(
        `${API_GET_GROUP_USERS}/${id}/organizationUnit`,
        { params }
      );
      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);
//Lấy danh sách người dùng thuộc đơn vị
export const getDataListUserByUnit = createAsyncThunk(
  "unit/getUserAllByUnit",
  async (
    { page = 1, limit = 25, query, code, sort, id } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
      };
      if (id !== "all") {
        params.parent = id;
      }
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      const url =
        id === "all" ? `${API_GET_LIST_USERS}/all` : `${API_GET_LIST_USERS}`;
      if (query !== "" && code && sort) {
        const { data } = await api.get(`${url}`, { params });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(`${url}`, {
          params:
            id !== "all"
              ? { page, limit, sort, parent: id }
              : { page, limit, sort },
        });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
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

export const getDataDetailGroupUsers = createAsyncThunk(
  "group/getDataDetailGroupUsers",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_GROUP_USERS}/${id}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
export const getDataDetailUnitUpdate = createAsyncThunk(
  "unit/getDataDetailUnitUpdate",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_LIST_UNIT}/update/${id}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getListTypeUnit = createAsyncThunk(
  "unit/getListTypeUnit",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_COMMON_SOURCE}/S001`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getListPosition = createAsyncThunk(
  "unit/getListPosition",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_COMMON_SOURCE}/S002`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getListUnit = createAsyncThunk(
  "unit/getListUnit",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_COMMON_SOURCE}/S002`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

//thêm mới nhóm người dùng
export const addGroupUser = createAsyncThunk(
  "group/add",
  async (dataUnit, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_GET_GROUP_USERS}`, dataUnit);
      return response.data; // Dữ liệu từ API
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Lỗi khi thêm đơn vị!"
      );
    }
  }
);

//Cập nhật đơn vị
export const updateGroupUser = createAsyncThunk(
  "group/update",
  async (params, { rejectWithValue }) => {
    try {
      const id = params.id || params.groupId;
      const updatedData = params.updatedData || params.payload;

      const response = await api.patch(
        `${API_GET_GROUP_USERS}/${id}`,
        updatedData
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error updating category");
    }
  }
);
//Xóa user by đơn vị
export const deleteGroupUser = createAsyncThunk(
  "group/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`${API_GET_GROUP_USERS}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);

//xóa người dùng khỏi nhóm
export const deleteUserbyGroup = createAsyncThunk(
  "group/deleteUserbyGroup",
  async ({ idGroup, idUser, typeDelete }, { rejectWithValue }) => {
    try {
      const url =
        typeDelete === "groupUser"
          ? `${API_GET_GROUP_USERS}/${idGroup}/users/${idUser}`
          : `${API_GET_GROUP_USERS}/${idGroup}/organizationUnit/${idUser}`; // This seems to be a bug, should be group id, not user id
      await api.delete(url);
      return idGroup;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);

// Thêm mới một đơn vị vào nhóm người dùng
export const addOrganizationUnitToGroup = createAsyncThunk(
  "groupUser/addOrganizationUnitToGroup",
  async ({ groupId, orgId }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `${API_GET_GROUP_USERS}/${groupId}/organizationUnit`,
        { orgId }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateGroupUserOrganizationUnit = createAsyncThunk(
  "groupUser/updateOrganizationUnit",
  async ({ groupId, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `${API_GET_GROUP_USERS}/${groupId}/organizationUnit`,
        payload
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

//xóa nhóm người dùng
export const deleteUsers = createAsyncThunk(
  "users/delete",
  async ({ idUser }, { rejectWithValue }) => {
    try {
      await api.delete(`${API_GET_LIST_USERS}/${idUser}`);
      return idUser;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);
//Khóa người dùng
export const lockUsers = createAsyncThunk(
  "users/lock",
  async ({ idUser }, { rejectWithValue }) => {
    try {
      await api.put(`${API_GET_LIST_USERS}/${idUser}/block`);
      return idUser;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);
//thay đổi password
export const ChangePassUsers = createAsyncThunk(
  "users/changepass",
  async ({ idUser, changePassData }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `${API_GET_LIST_USERS}/${idUser}/password`,
        changePassData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);

const groupUserSlice = createSlice({
  name: "groupUsers",
  initialState: {
    listGroupUsers: [],
    listUserByGroup: [],
    listGroupUnit: [],
    listUserByUnit: [],
    detailGroupUsers: null,
    detailUnit: null,
    searchDistrict: null,
    loading: false,
    error: null,
    listTypeUnit: [],
    listPosition: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getDataListGroupUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataListGroupUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.listGroupUsers = action.payload?.data;
      })
      .addCase(getDataListGroupUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getDataListUserByGroup.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataListUserByGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.listUserByGroup = action.payload?.data;
      })
      .addCase(getDataListUserByGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getDataListGroupUnit.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataListGroupUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listGroupUnit = action.payload?.data;
      })
      .addCase(getDataListGroupUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getDataListUserByUnit.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataListUserByUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listGroupUsers = action.payload?.data;
      })
      .addCase(getDataListUserByUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Xử lý tìm kiếm quận, huyện, thị xã
      .addCase(fetchSearchUnit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSearchUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listGroupUsers = action.payload;
      })
      .addCase(fetchSearchUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      //Xử lý xem chi tiết quận, huyện, thị xã
      .addCase(getDataDetailGroupUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataDetailGroupUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.detailGroupUsers = action.payload.data;
      })
      .addCase(getDataDetailGroupUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getDataDetailUnitUpdate.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataDetailUnitUpdate.fulfilled, (state, action) => {
        state.loading = false;
        state.detailUnit = action.payload.data;
      })
      .addCase(getDataDetailUnitUpdate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      //get danh sach loai don vi
      .addCase(getListTypeUnit.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListTypeUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listTypeUnit = action.payload.data;
      })
      .addCase(getListTypeUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      //get danh sach chức vụ
      .addCase(getListPosition.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListPosition.fulfilled, (state, action) => {
        state.loading = false;
        state.listPosition = action.payload.data;
      })
      .addCase(getListPosition.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      //thêm mới nhóm người dùng
      .addCase(addGroupUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(addGroupUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addGroupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Xử lý Update
      .addCase(updateGroupUser.fulfilled, (state, action) => {
        const index = state.listGroupUsers.findIndex(
          (cat) => cat._id === action.payload._id
        );
        if (index !== -1) {
          state.listGroupUsers[index] = action.payload;
        }
      })
      // Xử lý Delete
      .addCase(deleteGroupUser.fulfilled, (state, action) => {
        state.listGroupUsers = state.listGroupUsers.filter(
          (cat) => cat._id !== action.payload
        );
      })
      .addCase(deleteUserbyGroup.fulfilled, (state, action) => {
        state.listGroupUsers = state.listGroupUsers.filter(
          (cat) => cat._id !== action.payload
        );
      })

      .addCase(deleteUsers.fulfilled, (state, action) => {
        state.listUserByUnit = state.listUserByUnit.filter(
          (cat) => cat._id !== action.payload
        );
      })

      .addCase(lockUsers.fulfilled, (state, action) => {
        state.listUserByUnit = state.listUserByUnit.filter(
          (cat) => cat._id !== action.payload
        );
      })

      .addCase(ChangePassUsers.fulfilled, (state) => {
        state.loading = false;
      });
  },
});

export default groupUserSlice.reducer;
