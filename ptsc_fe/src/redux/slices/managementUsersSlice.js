import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api, { callApi, callApis } from "@services/api";
import qs from "qs";
import {
  API_GET_COMMON_SOURCE,
  API_GET_FILE,
  API_GET_GROUP_USERS,
  API_GET_LIST_UNIT,
  API_GET_LIST_USERS,
  API_GETDETAIL_FILE,
  API_UPLOAD_FILE,
  API_GET_ROLES,
  API_ROLE,
  ROLE_FEATURE,
  API_UPLOAD_FILES,
} from "@EnvironmentFile/constants/urlConfig";

//Lấy danh sách đơn vị
export const getDataListUnit = createAsyncThunk(
  "unit/getAll",
  async (
    { page = 1, limit = 500, query, code, sort } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
      };
      // Thêm query cho từng trường trong mảng code
      // Thêm query cho từng trường (chấp nhận cả string và array)
      if (code && query) {
        if (Array.isArray(code)) {
          code.forEach((field) => {
            params[field] = query;
          });
        } else {
          params[code] = query;
        }
      }

      if (query !== "" && code && sort) {
        const { data } = await api.get(`${API_GET_LIST_UNIT}`, { params });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(`${API_GET_LIST_UNIT}`, {
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

export const getListRole = createAsyncThunk(
  "unit/getListRole",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${API_GET_ROLES}`, {
        params,
        paramsSerializer: (p) => {
          return qs.stringify(p, { arrayFormat: "repeat" });
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue("Lỗi khi lấy danh sách vai trò");
    }
  }
);
//Lấy danh sách người dùng thuộc đơn vị
export const getDataListUserByUnit = createAsyncThunk(
  "unit/getUserAllByUnit",
  async (
    { page = 1, limit = 25, query, code, sort, id, status } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = { page, limit };
      if (sort) params.sort = sort;

      if (status !== undefined) {
        params.status = status;
      }

      if (id !== "all") {
        params.parent = id;
      }

      // Hỗ trợ cả string và array cho code
      if (query && code) {
        if (Array.isArray(code)) {
          code.forEach((field) => {
            params[field] = query;
          });
        } else {
          params[code] = query;
        }
      }

      const url =
        id === "all" ? `${API_GET_LIST_USERS}/all` : `${API_GET_LIST_USERS}`;
      const { data } = await api.get(url, { params });

      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Lỗi khi lấy danh sách người dùng theo đơn vị"
      );
    }
  }
);

export const getListGroupUser = createAsyncThunk(
  "unit/getListGroupUser",
  async (
    { page = 1, limit = 25, query, code, sort } = {},
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
      const url = `${API_GET_GROUP_USERS}`;
      if (query !== "" && code && sort) {
        const { data } = await api.get(`${url}`, { params });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(`${url}`, {
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

export const getDataDetailUser = createAsyncThunk(
  "unit/getDataDetailUnit",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_LIST_USERS}/${id}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.res?.data || error.message);
    }
  }
);
export const getListRoleFeature = createAsyncThunk(
  "unit/getListRoleFeature",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${ROLE_FEATURE}`, {
        params,
        paramsSerializer: (p) => {
          return qs.stringify(p, { arrayFormat: "repeat" });
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue("Lỗi khi lấy danh sách");
    }
  }
);

export const getListRoleFeatureRelatedProcesses = createAsyncThunk(
  "unit/getListRoleFeatureRelatedProcesses",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${ROLE_FEATURE}/related-processes`, {
        params,
        paramsSerializer: (p) => {
          return qs.stringify(p, { arrayFormat: "repeat" });
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue("Lỗi khi lấy danh sách");
    }
  }
);

export const getDataDetailUserByGroup = createAsyncThunk(
  "unit/getDataDetailUserByGroup",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_GROUP_USERS}/${id}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.res?.data || error.message);
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
      return rejectWithValue(error.res?.data || error.message);
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
      return rejectWithValue(error.res?.data || error.message);
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
      return rejectWithValue(error.res?.data || error.message);
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
      return rejectWithValue(error.res?.data || error.message);
    }
  }
);

//thêm mới người dùng
export const addUser = createAsyncThunk(
  "user/add",
  async (dataUnit, { rejectWithValue }) => {
    try {
      const response = await callApis(
        "post",
        `${API_GET_LIST_USERS}`,
        dataUnit
      );
      return response;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { error: "Lỗi khi thêm đơn vị!" }
      );
    }
  }
);

//Cập nhật đơn vị
export const updateUser = createAsyncThunk(
  "user/update",
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      // const response = await api.patch(
      //   `${API_GET_LIST_USERS}/${id}`,
      //   updatedData
      // );

      const response = await callApi(
        "patch",
        `${API_GET_LIST_USERS}/${id}`,
        updatedData
      );
      logger.log("🚀 ~ response:", response);
      return response;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          message: "Lỗi không xác định khi cập nhật người dùng",
        }
      );
    }
  }
);

// upload file ảnh
export const uploadFiles = createAsyncThunk(
  "files/upload",
  async (files, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", files);

      const response = await api.post(`${API_UPLOAD_FILE}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data || {}; // API trả về danh sách file { id, name }
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi tải ảnh lên!");
    }
  }
);

export const uploadFiless = createAsyncThunk(
  "files/uploads",
  async (files, { rejectWithValue }) => {
    try {
      const formData = new FormData();

      // 👇 Nếu `files` là mảng (multi upload)
      if (Array.isArray(files)) {
        files.forEach((file) => {
          formData.append("files", file);
        });
      } else {
        // 👇 Nếu chỉ có 1 file
        formData.append("files", files);
      }

      const response = await api.post(`${API_UPLOAD_FILES}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data || {};
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi tải file lên!");
    }
  }
);

// Tải file về
export const downloadFiles = createAsyncThunk(
  "files/download",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`${API_GET_FILE}/${id}`, {
        responseType: "blob",
      });

      return response.data || {};
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi tải ảnh lên!");
    }
  }
);

// lấy chi tiết file

export const getDetailFile = createAsyncThunk(
  "files/getDetailFile",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`${API_GETDETAIL_FILE}/${id}`);
      return response.data || {}; // API trả về danh sách file { id, name }
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi tải ảnh lên!");
    }
  }
);

//Xóa user by đơn vị
export const deleteUser = createAsyncThunk(
  "unit/delete",
  async ({ idUser, idUnit }, { rejectWithValue }) => {
    try {
      await api.delete(`${API_GET_LIST_UNIT}/${idUser}/unit/${idUnit}`);
      return idUser;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);

//xóa người dùng
export const deleteUsers = createAsyncThunk(
  "users/delete",
  async ({ idUser }, { rejectWithValue }) => {
    try {
      //   await api.delete(`${API_GET_LIST_USERS}/${idUser}`);
      // return idUser;
      const response = await api.delete(`${API_GET_LIST_USERS}/${idUser}`);
      return response.data; // Trả về toàn bộ dữ liệu từ API
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);
//Khóa người dùng
export const lockUsers = createAsyncThunk(
  "users/lock",
  async ({ idUser, type }, { rejectWithValue }) => {
    try {
      const url =
        type === "lock"
          ? `${API_GET_LIST_USERS}/${idUser}/block`
          : `${API_GET_LIST_USERS}/${idUser}/unBlock`;
      await api.put(url);
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

// Thêm mới người dùng vào nhóm
export const addUsersToGroup = createAsyncThunk(
  "groupUser/addUsersToGroup",
  async ({ groupId, userIds }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `${API_GET_GROUP_USERS}/${groupId}/users`,
        { userIds }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Lỗi khi thêm người dùng vào nhóm!" }
      );
    }
  }
);

export const updateRoleFeature = createAsyncThunk(
  "roleFeature/update",
  async ({ processKey, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `${ROLE_FEATURE}/${processKey}`,
        updateData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Lỗi khi cập nhật vai trò động"
      );
    }
  }
);

// Lấy quyền user (permissions)
export const getUserPermissions = createAsyncThunk(
  "users/getUserPermissions",
  async (userId, { rejectWithValue }) => {
    try {
      // Sử dụng API_ROLE để lấy dữ liệu quyền chi tiết, đồng bộ với cấu trúc data mà component đang sử dụng
      const { data } = await api.get(`${API_ROLE}/${userId}`);
      return data?.data; // API trả về { success: true, data: {...} }
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Lỗi khi lấy quyền người dùng"
      );
    }
  }
);

// Wrapper thunk to ensure only one simultaneous fetch occurs and subsequent callers reuse the same promise
let userPermissionsPromise = null;
export const ensureUserPermissions = (userId) => (dispatch, getState) => {
  const { users } = getState();
  if (users?.userPermissions) {
    return Promise.resolve(users.userPermissions);
  }

  if (userPermissionsPromise) {
    return userPermissionsPromise;
  }

  // Dispatch the actual async thunk and store the returned promise so others can reuse it
  userPermissionsPromise = dispatch(getUserPermissions(userId));

  // Clear the stored promise once settled
  userPermissionsPromise.then(() => (userPermissionsPromise = null)).catch(() => (userPermissionsPromise = null));

  return userPermissionsPromise;
};

const managementUsersSlice = createSlice({
  name: "users",
  initialState: {
    listRole: [],
    listUnit: [],
    listRoleFeature: [],
    listRoleFeatureRelatedProcesses: [],
    listUserByUnit: [],
    listGroupUsers: [],
    detailUnitByUser: null,
    detailUserByGroup: null,
    detailUnit: null,
    searchDistrict: null,
    loading: false,
    error: null,
    listTypeUnit: [],
    listPosition: [],
    userPermissions: null,
    isSuperAdmin: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getDataListUnit.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataListUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listUnit = action.payload?.data;
      })
      .addCase(getDataListUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getListRoleFeatureRelatedProcesses.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListRoleFeatureRelatedProcesses.fulfilled, (state, action) => {
        state.loading = false;
        state.listRoleFeatureRelatedProcesses = action.payload?.data;
      })
      .addCase(getListRoleFeatureRelatedProcesses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(getListRole.fulfilled, (state, action) => {
        state.loading = false;
        state.listRole = action.payload;
      })

      .addCase(getListRoleFeature.fulfilled, (state, action) => {
        state.loading = false;
        state.listRoleFeature = action.payload;
      })

      .addCase(getDataListUserByUnit.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataListUserByUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listUserByUnit = action.payload?.data;
      })
      .addCase(getDataListUserByUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(getListGroupUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListGroupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.listGroupUsers = action.payload?.data;
      })
      .addCase(getListGroupUser.rejected, (state, action) => {
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
        state.listUnit = action.payload;
      })
      .addCase(fetchSearchUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      //Xử lý xem chi tiết quận, huyện, thị xã
      .addCase(getDataDetailUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataDetailUser.fulfilled, (state, action) => {
        state.loading = false;
        state.detailUnitByUser = action.payload.data;
      })
      .addCase(getDataDetailUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getDataDetailUserByGroup.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataDetailUserByGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.detailUserByGroup = action.payload.data;
      })
      .addCase(getDataDetailUserByGroup.rejected, (state, action) => {
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

      //thêm mới đơn vị
      .addCase(addUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(addUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Xử lý Update
.addCase(updateUser.fulfilled, (state, action) => {
  const userData = action.payload?.data || action.payload;
  const userId = userData?._id || userData?.id;
  if (userId) {
    const index = state.listUserByUnit.findIndex(
      (cat) => (cat._id || cat.id) === userId
    );
    if (index !== -1) {
      state.listUserByUnit[index] = { ...userData };
    }
  }
})

// Xử lý Delete
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.listUserByUnit = state.listUserByUnit.filter(
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
      })

      .addCase(updateRoleFeature.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateRoleFeature.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateRoleFeature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Lấy quyền của người dùng
      .addCase(getUserPermissions.pending, (state) => {
        state.loading = true;
        state.userPermissions = null;
      })
      .addCase(getUserPermissions.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload || {};

        state.userPermissions = {
          staticPermissions: data.staticPermissions || [],
          roles: data.roles || [],
          roleCodes: data.roleCodes || [],
          reportPermission: data.reportPermission || [],
        };
        state.isSuperAdmin = data.isSuperAdmin === true;
      })

      .addCase(getUserPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.userPermissions = null;
      });
  },
});

export default managementUsersSlice.reducer;
