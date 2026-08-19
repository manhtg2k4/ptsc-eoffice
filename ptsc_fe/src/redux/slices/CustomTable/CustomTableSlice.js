import { API_CONFIG_TABLE,  } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

export const upDateColumnTable = createAsyncThunk(
	"customTable/upDateColumnTable",
	async (payload, { rejectWithValue }) => {
		try {
			const res = await api.put(`${API_CONFIG_TABLE}`, payload);
			
			// Chỉ xóa cache của đúng tab/module hiện tại trong Session Storage
			const moduleCode = payload?.module;
			if (moduleCode) {
				Object.keys(sessionStorage).forEach((key) => {
					if (key.startsWith("FORM_CONFIG_") && key.endsWith(`_${moduleCode}`)) {
						sessionStorage.removeItem(key);
					}
				});
			}
			
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message || error.message || "Lỗi khi cấu hình bảng!"
			);
		}
	})

const CustomTableSlice = createSlice({
	name: "customTable",
	initialState: {
		dataConfig: [],
		loading: false,
		error: null,
		fnCode: null,
	},
	reducers: {
		setFnCode: (state, action) => {
			state.fnCode = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(upDateColumnTable.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(upDateColumnTable.fulfilled, (state, action) => {
				state.loading = false;
				state.dataConfig = action.payload;
			})
			.addCase(upDateColumnTable.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
});
export const { setFnCode } = CustomTableSlice.actions;
export default CustomTableSlice.reducer;