import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  token: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("userData");
        localStorage.removeItem("access_token");
      }
    },

    initializeAuth: (state) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("userData");
        if (token) {
          state.token = token;
          if (user) state.user = JSON.parse(user);
        }
      }
    },
    resetStatus: (state) => {
      state.error = null;
      state.loading = false;
    },
  },
});

export const { logout, initializeAuth, resetStatus } = authSlice.actions;
export default authSlice.reducer;
