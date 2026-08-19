import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { API_ROLES_DETAIL } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

// 🧩 Thunk: Gọi API lấy danh sách chi tiết Role (có token)
export const getListRoleDetail = createAsyncThunk(
  "permissions/getListRoleDetail",
  async (params, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      };

      const response = await api.get(API_ROLES_DETAIL, config);

      const phoihopRole = response.data?.data?.find(
        (role) => role?.PHOIHOP_NHANDEBIET
      );

      const phoihopTabs = phoihopRole?.PHOIHOP_NHANDEBIET || [];

      return phoihopTabs;
    } catch (error) {
      logger.error("❌ Lỗi khi gọi API Role Detail:", error);
      return rejectWithValue(
        error.response?.data || "Lỗi khi lấy danh sách Role"
      );
    }
  }
);

const permissionSlice = createSlice({
  name: "permissions",
  initialState: {
    tabPermissions: [], // ✅ Đổi tên từ phoihopTabs → tabPermissions
    loading: false,
    error: null,
  },
  reducers: {
    // ✅ Thêm action để reset permissions khi logout
    resetPermissions: (state) => {
      state.tabPermissions = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getListRoleDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getListRoleDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.tabPermissions = action.payload; // ✅ Đổi tên
        // logger.log("✅ Permissions loaded:", action.payload);
      })
      .addCase(getListRoleDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        logger.error("❌ Error loading permissions:", action.payload);
      });
  },
});

export const { resetPermissions } = permissionSlice.actions;
export default permissionSlice.reducer;
