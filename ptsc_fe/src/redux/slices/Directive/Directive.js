import { API_ORAGANI_UNIT, API_USER, API_USER_RETRUN } from "@EnvironmentFile/constants/ulrConfigNew";
import { API_GET_LIST_USERS, APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@utils/axiosInstance";



export const fetchUsersData = createAsyncThunk(
  "user/fetchUsersData",
  async ({body, params}, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(`${APP_BASE}/api/users/get-users-suggestion`, body, {params});
      return res;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
)

export const fetchUsersDataSubmitProposal = createAsyncThunk(
  "user/fetchUsersDataSubmitProposal",
  async ({body, params}, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(`${API_GET_LIST_USERS}/get-users-suggestion-handling`, body, {params});
      return res;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
)

export const fetchUsers = createAsyncThunk(
  "user/fetchUsers",
  async ({body, params}, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(API_USER, body, {params});

      return res; // trả về data
    } catch (error) {

      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchUsersReturn = createAsyncThunk(
  "user/fetchUsersReturn",
  async ({body, params}, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(API_USER_RETRUN, body, {params});
      logger.log("🚀 ~ reaaaaaaaaas:", res)

      return res;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);


export const fetchOrganizationUnits = createAsyncThunk(
  "user/fetchOrganizationUnits",
  async ({body, params}, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(API_ORAGANI_UNIT, body, {params});
      return res;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);


const userSlice = createSlice({
  name: "user",
  initialState: {
    users: [],
    usersReturn: [],
    organizationUnits: [],
    usersData: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearUserData: (state) => {
      state.users = [];
      state.organizationUnits = [];
      state.usersData = [];
    },
  },
  extraReducers: builder => {
    builder

      .addCase(fetchUsers.pending, state => {
        state.loading = true;
        state.error = null;
        state.users = [];
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.users = [];
      })


      .addCase(fetchOrganizationUnits.pending, state => {
        state.loading = true;
        state.error = null;
        state.organizationUnits = [];
      })
      .addCase(fetchOrganizationUnits.fulfilled, (state, action) => {
        state.loading = false;
        state.organizationUnits = action.payload;
      })
      .addCase(fetchOrganizationUnits.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.organizationUnits = [];
      })

      .addCase(fetchUsersReturn.pending, state => {
        state.loading = true;
        state.error = null;
        state.usersReturn = [];
      })
      .addCase(fetchUsersReturn.fulfilled, (state, action) => {
        state.loading = false;
        state.usersReturn = action.payload;
      })
      .addCase(fetchUsersReturn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.usersReturn = [];
      })

      .addCase(fetchUsersData.pending, state => {
        state.loading = true;
        state.error = null;
        state.usersData = [];
      })
      .addCase(fetchUsersData.fulfilled, (state, action) => {
        state.loading = false;
        state.usersData = action.payload;
      })
      .addCase(fetchUsersData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.usersData = [];
			})
			
      .addCase(fetchUsersDataSubmitProposal.pending, state => {
        state.loading = true;
        state.error = null;
        state.usersData = [];
      })
      .addCase(fetchUsersDataSubmitProposal.fulfilled, (state, action) => {
        state.loading = false;
        state.usersData = action.payload;
      })
      .addCase(fetchUsersDataSubmitProposal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.usersData = [];
      })

  },
});
export const { clearUserData } = userSlice.actions;
export default userSlice.reducer;