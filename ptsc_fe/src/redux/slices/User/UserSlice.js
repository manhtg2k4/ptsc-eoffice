import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import authService from "@services/AuthService";
import apis from "@services/api";
import { API_AUTH_ME } from "@EnvironmentFile/constants/urlConfig";
import {
  keycloakIssuer,
  keycloakClientId,
  keycloakRedirectUri,
  keycloakScope
} from "@variable";

// Async thunk để lấy auth config
export const fetchAuthConfig = createAsyncThunk(
	"user/fetchAuthConfig",
	async (_, { rejectWithValue }) => {
		try {
			// Luôn dùng keycloak config từ env
			logger.log("🚀 [Auth] Using Keycloak config from appConfig.js");
			const mockActiveConfig = {
				authType: 'keycloak',
				isActive: true,
				config: {
					issuer: keycloakIssuer,
					clientId: keycloakClientId,
					redirectUri: keycloakRedirectUri,
					scope: keycloakScope
				}
			};
			authService.setStrategy('keycloak');
			return mockActiveConfig;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi lấy cấu hình xác thực!"
			);
		}
	}
);

// Async thunk để validate user
export const revalidateUser = createAsyncThunk(
	"user/revalidateUser",
	async (authType, { getState, rejectWithValue }) => {
		try {
			const type = authType || getState().auth.authConfig?.authType || "local";
			authService.setStrategy(type);
			
			const user = await authService.revalidate();
			return user;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi xác thực người dùng!"
			);
		}
	}
);

// Async thunk để lấy thông tin user từ API /me
export const fetchCurrentUserMe = createAsyncThunk(
	"user/fetchCurrentUserMe",
	async (_, { rejectWithValue }) => {
		try {
			const response = await apis.get(API_AUTH_ME);
			return response?.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi lấy thông tin người dùng!"
			);
		}
	}
);

// Async thunk để logout
export const logoutUser = createAsyncThunk(
	"user/logoutUser",
	async (authConfig, { rejectWithValue }) => {
		try {
			const type = authConfig?.authType || "local";
			authService.setStrategy(type);
			return await authService.logout(authConfig);
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi đăng xuất!"
			);
		}
	}
);

// Async thunk để login (dành cho local login hoặc sau khi có token)
export const loginUser = createAsyncThunk(
	"user/loginUser",
	async ({ accessToken, authType = "local" }, { rejectWithValue }) => {
		try {
			authService.setStrategy(authType);
			// LocalStrategy.login sẽ lưu token và gọi revalidateUser
			const result = await authService.login({ accessToken });
			return result;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi đăng nhập!"
			);
		}
	}
);

// Helper function để lưu WSO2 auth data
export const setWso2AuthData = (data) => {
	for (const key in data) {
		if (Object.prototype.hasOwnProperty.call(data, key)) {
			if (key === "access_token") {
				localStorage.setItem("wso2_access_token", data[key]);
			} else {
				localStorage.setItem(key, data[key]);
			}
		}
	}
};

// Duy trì helper function xóa token để dùng ở nơi khác nếu cần
export const clearAllTokens = () => {
	authService.clearTokens();
};

const UserSlice = createSlice({
	name: "user",
	initialState: {
		currentUser: null,
		authConfig: null,
		dataUser: {},
		file: null,
		viewFile: null,
		loading: false,
		authLoading: true, // Loading state cho việc khởi tạo auth
		error: null,
	},
	reducers: {
		// Action để set user trực tiếp (nếu cần)
		setCurrentUser: (state, action) => {
			state.currentUser = action.payload;
		},
		// Action để set auth config trực tiếp
		setAuthConfig: (state, action) => {
			state.authConfig = action.payload;
		},
		// Action để clear user state
		clearUserState: (state) => {
			state.currentUser = null;
			state.error = null;
		},
		// Action để set auth loading
		setAuthLoading: (state, action) => {
			state.authLoading = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch auth config
			.addCase(fetchAuthConfig.pending, (state) => {
				state.authLoading = true;
				state.error = null;
			})
			.addCase(fetchAuthConfig.fulfilled, (state, action) => {
				state.authConfig = action.payload;
			})
			.addCase(fetchAuthConfig.rejected, (state, action) => {
				state.error = action.payload;
			})

			// Revalidate user
			.addCase(revalidateUser.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(revalidateUser.fulfilled, (state, action) => {
				state.loading = false;
				state.authLoading = false;
				state.currentUser = action.payload;
				state.dataUser = action?.payload?.user;
			})
			.addCase(revalidateUser.rejected, (state, action) => {
				state.loading = false;
				state.authLoading = false;
				state.currentUser = null;
				state.error = action.payload;
			})

			// Fetch current user by /me
			.addCase(fetchCurrentUserMe.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchCurrentUserMe.fulfilled, (state, action) => {
				state.loading = false;
				state.authLoading = false;
				state.currentUser = action.payload;
				state.dataUser = action?.payload?.user || {};
			})
			.addCase(fetchCurrentUserMe.rejected, (state, action) => {
				state.loading = false;
				state.authLoading = false;
				state.currentUser = null;
				state.dataUser = {};
				state.error = action.payload;
			})

			// Login user
			.addCase(loginUser.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(loginUser.fulfilled, (state, action) => {
				state.loading = false;
				state.currentUser = action.payload;
				state.dataUser = action?.payload?.user;
			})
			.addCase(loginUser.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})

			// Logout user
			.addCase(logoutUser.pending, (state) => {
				state.loading = true;
			})
			.addCase(logoutUser.fulfilled, (state) => {
				state.loading = false;
				state.currentUser = null;
				state.error = null;
			})
			.addCase(logoutUser.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export const { setCurrentUser, setAuthConfig, clearUserState, setAuthLoading } =
	UserSlice.actions;

export default UserSlice.reducer;