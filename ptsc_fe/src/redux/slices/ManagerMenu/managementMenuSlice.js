import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  API_GET_COMMON_SOURCE,
  API_GET_LIST_FUNCTIONMANAGEMANT,
  API_GET_LIST_MENU,
  API_GET_LIST_ROLES,
  API_GET_LIST_UNIT,
  API_GET_LIST_USERS,
  API_SIDE_BAR_MENU,
  API_SIDE_BAR_MENU_COUNT,
} from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

//Lấy danh sách đơn vị
export const getDataListUnit = createAsyncThunk(
  "menu/getAll",
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
          // ✅ hỗ trợ filter field lồng như function.code
          params[field] = query;
        });
      }

      if (query !== "" && code && sort) {
        const { data } = await api.get(
          `${API_GET_LIST_MENU}/list-menu-with-feature`,
          { params }
        );
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(
          `${API_GET_LIST_MENU}/list-menu-with-feature`,
          {
            params: { page, limit, sort },
          }
        );
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách "
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
      if (id) {
        params.parent = id;
      }
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      if (query !== "" && code && sort) {
        const { data } = await api.get(`${API_GET_LIST_USERS}`, { params });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(`${API_GET_LIST_USERS}`, {
          params: id
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

export const getDataDetailMenu = createAsyncThunk(
  "menu/getDataDetailMenu",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_LIST_MENU}/${id}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.res?.data || error.message);
    }
  }
);
export const getDataDetailMenuUpdate = createAsyncThunk(
  "menu/getDataDetailMenuUpdate",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_LIST_MENU}/${id}`);
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

export const getListFunction = createAsyncThunk(
  "menu/getListFunction",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_LIST_FUNCTIONMANAGEMANT}`, {
        params: { limit: 9999, ...params },
        timeout: 100000,
      });
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

export const getListRoles = createAsyncThunk(
  "unit/getLisRoles",
  async (_id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${API_GET_LIST_ROLES}`);
      return data.roles || [];
    } catch (error) {
      return rejectWithValue(error.res?.roles || error.message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  "user/delete",
  async ({ idUser, idUnit }, { rejectWithValue }) => {
    try {
      await api.delete(`${API_GET_LIST_USERS}/${idUser}/unit/${idUnit}`);
      return idUser;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);

//thêm mới đơn vị
export const addMenu = createAsyncThunk(
  "menu/add",
  async (dataMenu, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_GET_LIST_MENU}`, dataMenu);
      return response.data; // dữ liệu từ API khi thành công
    } catch (error) {
      const message = error.response?.data?.message || "Lỗi khi thêm menu!";
      return rejectWithValue(message);
    }
  }
);

//Cập nhật menu
export const updateMenu = createAsyncThunk(
  "menu/update",
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `${API_SIDE_BAR_MENU}/${id}`,
        updatedData
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error updating menu");
    }
  }
);
//Xóa menu
export const deleteMenu = createAsyncThunk(
  "menu/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`${API_SIDE_BAR_MENU}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting menu");
    }
  }
);

const mapMenuCounts = (menuList, countMap) => {
  if (!menuList || !Array.isArray(menuList)) return [];
  if (!countMap) return menuList;

  return menuList.map((item) => {
    const code = item.function?.code;
    const countValue = code ? (countMap[code] ?? 0) : 0;

    return {
      ...item,
      function: item.function
        ? {
            ...item.function,
            count: countValue,
          }
        : undefined,
    };
  });
};

export const getSideBarMenuCount = createAsyncThunk(
  "menu/getSideBarMenuCount",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get(API_SIDE_BAR_MENU_COUNT);
      return data.countMap;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải số lượng menu"
      );
    }
  }
);

export const getSideBarMenu = createAsyncThunk(
  "menu/getSideBarMenu",
  async (arg = {}, { dispatch, getState, rejectWithValue }) => {
    const { force } = arg || {};
    const { menu } = getState();

    if (!force && menu.sideBarMenuFetched) {
      dispatch(getSideBarMenuCount());
      return menu.sideBarMenu;
    }

    try {
      const { data } = await api.get(API_SIDE_BAR_MENU);
      dispatch(getSideBarMenuCount());
      return data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải menu cho sidebar"
      );
    }
  },
  {
    condition: (arg = {}, { getState }) => {
      const { force } = arg || {};
      if (force) return true;
      const { menu } = getState();
      if (menu.sideBarMenuLoading) {
        return false;
      }
    },
  }
);

const managementMenuSlice = createSlice({
  name: "menu",
  initialState: {
    listMenu: [],
    sideBarMenu: [],
    sideBarMenuLoading: false,
    sideBarMenuFetched: false,
    sideBarMenuError: null,
    sideBarMenuCountLoading: false,
    sideBarMenuCountFetched: false,
    sideBarMenuCountError: null,
    listUserByUnit: [],
    detailUnitByUser: null,
    detailMenu: null,
    searchDistrict: null,
    loading: false,
    error: null,
    listTypeUnit: [],
    listFunction: [],
    listPosition: [],
    listRoles: [],
  },
  reducers: {
    resetSideBarMenu(state) {
      state.sideBarMenu = [];
      state.sideBarMenuFetched = false;
      state.sideBarMenuError = null;
      state.sideBarMenuCountFetched = false;
      state.sideBarMenuCountError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getDataListUnit.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataListUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listMenu = action.payload?.data;
      })
      .addCase(getDataListUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
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
      // Xử lý tìm kiếm quận, huyện, thị xã
      .addCase(fetchSearchUnit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSearchUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listMenu = action.payload;
      })
      .addCase(fetchSearchUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      //Xử lý xem chi tiết quận, huyện, thị xã
      .addCase(getDataDetailMenu.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataDetailMenu.fulfilled, (state, action) => {
        state.loading = false;
        state.detailUnitByUser = action.payload.data;
      })
      .addCase(getDataDetailMenu.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getDataDetailMenuUpdate.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataDetailMenuUpdate.fulfilled, (state, action) => {
        state.loading = false;
        state.detailMenu = action.payload.data;
      })
      .addCase(getDataDetailMenuUpdate.rejected, (state, action) => {
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
      .addCase(addMenu.pending, (state) => {
        state.loading = true;
      })
      .addCase(addMenu.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addMenu.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(getListFunction.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListFunction.fulfilled, (state, action) => {
        state.loading = false;
        state.listFunction = action.payload.data.data;
      })
      .addCase(getListFunction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Xử lý Update
      .addCase(updateMenu.fulfilled, (state, action) => {
        const index = state.listMenu.findIndex(
          (cat) => cat._id === action.payload._id
        );
        if (index !== -1) {
          state.listMenu[index] = action.payload;
        }
      })
      // Xử lý Delete
      .addCase(deleteMenu.fulfilled, (state, action) => {
        state.listMenu = state.listMenu.filter(
          (cat) => cat._id !== action.payload
        );
      })

      //xóa
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.listUserByUnit = state.listUserByUnit.filter(
          (cat) => cat._id !== action.payload
        );
      })

      //Lấy danh sách quyền
      .addCase(getListRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getListRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.listRoles = action.payload;
      })
      .addCase(getListRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Xử lý getSideBarMenu (use dedicated flags to avoid duplicate fetches)
      .addCase(getSideBarMenu.pending, (state) => {
        state.sideBarMenuLoading = true;
        state.sideBarMenuError = null;
      })
      .addCase(getSideBarMenu.fulfilled, (state, action) => {
        state.sideBarMenuLoading = false;
        state.sideBarMenuFetched = true;
        state.sideBarMenu = action.payload;
        state.sideBarMenuError = null;
      })
      .addCase(getSideBarMenu.rejected, (state, action) => {
        state.sideBarMenuLoading = false;
        state.sideBarMenuFetched = false;
        state.sideBarMenuError = action.payload || action.error.message;
      })
      // Xử lý getSideBarMenuCount
      .addCase(getSideBarMenuCount.pending, (state) => {
        state.sideBarMenuCountLoading = true;
        state.sideBarMenuCountError = null;
      })
      .addCase(getSideBarMenuCount.fulfilled, (state, action) => {
        state.sideBarMenuCountLoading = false;
        state.sideBarMenuCountFetched = true;
        const countMap = action.payload || {};
        state.sideBarMenu = mapMenuCounts(state.sideBarMenu, countMap);
        state.sideBarMenuCountError = null;
      })
      .addCase(getSideBarMenuCount.rejected, (state, action) => {
        state.sideBarMenuCountLoading = false;
        state.sideBarMenuCountFetched = false;
        state.sideBarMenuCountError = action.payload || action.error.message;
      });
  },
});

export const { resetSideBarMenu } = managementMenuSlice.actions;

export default managementMenuSlice.reducer;
