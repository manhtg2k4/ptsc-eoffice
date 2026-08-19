import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "@utils/axiosInstance";
import { API_ASYNC_HRM } from "@EnvironmentFile/constants/urlConfig";




export const asyncHRM = createAsyncThunk(
    "AsyncHRM/asyncHRM",
    async () => {
        const response = await axiosInstance.get(API_ASYNC_HRM);
        return response;
    }
);

export const AsyncHRM = createSlice({
    name: "AsyncHRM",
    initialState: {
        data: [],
        loading: false,
        error: null,
    },
    reducers: {
        setAsyncHRM: (state, action) => {
            state.data = action.payload;
        },

    },
    extraReducers: (builder) => {
        builder
            .addCase(asyncHRM.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(asyncHRM.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(asyncHRM.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { setAsyncHRM } = AsyncHRM.actions;
export default AsyncHRM.reducer;
