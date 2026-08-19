import { API_CONTENT_SIGN_IMAGE, API_DOWNLOAD_FILE, API_GET_TOKEN_SIGN, API_PARAPH_SIGN_IMAGE, API_REQUEST_OTP, API_SIGN_BATCH, API_SIGN_OTP, API_UPLOAD_FILESS, API_VERIFY_FILES, API_VERIFY_OTP, API_VERIFY_PDF, API_WORK_ITEMS } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";
import axiosInstance from "@utils/axiosInstance";
import axios from "axios";
import { serviceId } from "@variable";

const parseBlobErrorPayload = async (blob) => {
	const text = await blob.text();
	if (!text) return null;

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
};

const rejectRequestError = async (error, rejectWithValue, fallbackMessage) => {
	if (error.response?.data instanceof Blob) {
		const parsedPayload = await parseBlobErrorPayload(error.response.data);
		return rejectWithValue(parsedPayload || fallbackMessage);
	}

	return rejectWithValue(
		error.response?.data || error.message || fallbackMessage
	);
};

export const requestOtp = createAsyncThunk(
	"digitalSignatureFile/requestOtp",
	async (tokenSign, { rejectWithValue }) => {
		try {
			const token = localStorage.getItem("token");
			const res = await axios.get(`${API_REQUEST_OTP}`, {
				headers: {
					Authorization: `Bearer ${token}`,
					"X-Service-Id": serviceId || "",
				},
				timeout: 60000,
			});
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi yêu cầu OTP!"
			);
		}
	}
);

export const verifyOtp = createAsyncThunk(
	"digitalSignatureFile/verifyOtp",
	async ({ body }, { rejectWithValue }) => {
		try {
			const token = localStorage.getItem("token");
			const res = await axios.post(`${API_VERIFY_OTP}`, body, {
				headers: {
					Authorization: `Bearer ${token}`,
					"X-Service-Id": serviceId || "",
				},
				timeout: 60000,
			});
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi xác thực OTP!"
			);
		}
	}
);

export const getTokenSign = createAsyncThunk(
	"digitalSignatureFile/getTokenSign",
	async (_, { rejectWithValue }) => {
		try {
			const res = await axiosInstance.get(`${API_GET_TOKEN_SIGN}`);
			return res.token;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi lấy token ký!"
			);
		}
	}
);

export const postSignDocumentInsertImagesAndKeywords = createAsyncThunk(
	"digitalSignatureFile/postSignDocumentInsertImagesAndKeywords",
	async ({ tokenSigning, body, params }, { rejectWithValue }) => {
		try {
			const token = localStorage.getItem("token");
			const res = await axios.post(`${API_SIGN_OTP}`, body, {
				params,
				headers: {
					Authorization: `Bearer ${token}`,
					"Token-signing": tokenSigning,
					"X-Service-Id": serviceId || "",
				},
				responseType: "blob",
				timeout: 300000,
			});
			return res;
		} catch (error) {
			return rejectRequestError(
				error,
				rejectWithValue,
				"Lỗi khi xác thực OTP!"
			);
		}
	}
);

// export const postSignDraftDocumentInsertImagesAndKeywords = createAsyncThunk(
// 	"digitalSignatureFile/postSignDraftDocumentInsertImagesAndKeywords",
// 	async ({tokenSigning, tokenSign, body}, { rejectWithValue }) => {
// 		try {
// 			const token = tokenSign?.token || localStorage.getItem("wso2_access_token");
// 			// const res = await axios.post(`${API_SIGN_DIGITAL_FILE}/document-initial-signature`, body, {
// 			const res = await axios.post(`${API_SIGN_DIGITAL_FILE}/document-with-image`, body, {
// 				headers: {
// 					Authorization: `Bearer ${token}`,
// 					"X-Service-Id": serviceId || "",
// 					"Token-signing": tokenSigning,
// 				},
// 				responseType: "blob",
// 				timeout: 60000,
// 			});
// 			return res;
// 		} catch (error) {
// 			return rejectWithValue(
// 				error.response?.data || error.message || "Lỗi khi xác thực OTP!"
// 			);
// 		}
// 	}
// );

export const postSignDocument = createAsyncThunk(
	"digitalSignatureFile/postSignDocument",
	async ({ tokenSigning, body, params }, { rejectWithValue }) => {
		try {
			const token = localStorage.getItem("token");
			const res = await axios.post(`${API_SIGN_OTP}`, body, {
				params,
				headers: {
					Authorization: `Bearer ${token}`,
					"X-Service-Id": serviceId || "",
					"Token-signing": tokenSigning,
				},
				responseType: "blob",
				timeout: 300000,
			});
			return res;
		} catch (error) {
			return rejectRequestError(
				error,
				rejectWithValue,
				"Lỗi khi xác thực OTP!"
			);
		}
	}
);

export const postWorkItems = createAsyncThunk(
	"digitalSignatureFile/postWorkItems",
	async ({ workItemId, body }, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_WORK_ITEMS}/${workItemId}/sign-doc`, body, {
				timeout: 60000,
			});
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi xác thực OTP!"
			);
		}
	}
);

export const uploadDigitallySignedDocument = createAsyncThunk(
	"digitalSignatureFile/uploadDigitallySignedDocument",
	async (formData, { rejectWithValue }) => {
		try {
			const res = await api.post(`${API_UPLOAD_FILESS}`, formData, {
				timeout: 60000,
			});
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi tải lên file đã ký số!"
			);
		}
	}
);

export const getDataSignaturePhoto = createAsyncThunk(
	"digitalSignatureFile/getDataSignaturePhoto",
	async (fileId, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_DOWNLOAD_FILE}/${fileId}`, {
				responseType: "blob",
				timeout: 60000,
			});
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi lấy dữ liệu ảnh chữ ký số!"
			);
		}
	}
);

export const verifyPdfSignature = createAsyncThunk(
	"digitalSignatureFile/verifyPdfSignature",
	async (fileId, { rejectWithValue }) => {
		try {
			const res = await api.get(`${API_VERIFY_PDF}/${fileId}`, {
				timeout: 60000,
			});
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi xác thực chữ ký số!"
			);
		}
	}
);

export const verifyFilesSignature = createAsyncThunk(
	"digitalSignatureFile/verifyFilesSignature",
	async (fileIds, { rejectWithValue }) => {
		try {
			const res = await api.post(API_VERIFY_FILES, { fileIds }, {
				timeout: 60000,
			});
			return res.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi kiểm tra trạng thái ký số!"
			);
		}
	}
);

// Ký USB Token - Chữ ký nháy
export const postParaphSignImage = createAsyncThunk(
	"digitalSignatureFile/postParaphSignImage",
	async ({ tokenSigning, tokenSign, body }, { rejectWithValue }) => {
		try {
			const token = tokenSign?.token || localStorage.getItem("wso2_access_token");
			const res = await axios.post(`${API_PARAPH_SIGN_IMAGE}`, body, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Token-signing": tokenSigning,
					"X-Service-Id": serviceId || "",
				},
				responseType: "blob",
				timeout: 60000,
			});
			return res;
		} catch (error) {
			return rejectRequestError(
				error,
				rejectWithValue,
				"Lỗi khi xác thực OTP!"
			);
		}
	}
);

// Ký USB Token - Chữ ký tay và con dấu
export const postContentSignImage = createAsyncThunk(
	"digitalSignatureFile/postContentSignImage",
	async ({ tokenSigning, tokenSign, body }, { rejectWithValue }) => {
		try {
			const token = tokenSign?.token || localStorage.getItem("wso2_access_token");
			const res = await axios.post(`${API_CONTENT_SIGN_IMAGE}`, body, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Token-signing": tokenSigning,
					"X-Service-Id": serviceId || "",
				},
				responseType: "blob",
				timeout: 60000,
			});
			return res;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi xác thực OTP!"
			);
		}
	}
);

// Ký số hàng loạt
export const postSignBatch = createAsyncThunk(
	"digitalSignatureFile/postSignBatch",
	async ({ tokenSigning, tokenSign, body, timeout }, { rejectWithValue }) => {
		try {
			const token = tokenSign?.token || localStorage.getItem("wso2_access_token");
			const res = await api.post(`${API_SIGN_BATCH}`, body, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Token-signing": tokenSigning,
					"X-Service-Id": serviceId || "",
					"Content-Type": "application/json",
				},
				timeout: timeout || 60000, // Timeout mặc định 30s cho ký hàng loạt
				// responseType: "blob",
			});
			return res;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || error.message || "Lỗi khi xác thực OTP!"
			);
		}
	}
);

const DigitalSignatureFileSlice = createSlice({
	name: "digitalSignatureFile",
	initialState: {
		comments: [],
		file: null,
		viewFile: null,
		loading: false,
		error: null,
		verificationResult: null,
		verificationResultsMap: {}, // Lưu kết quả verify của nhiều file theo fileId
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(requestOtp.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(requestOtp.fulfilled, (state, action) => {
				state.loading = false;
				state.file = action.payload;
			})
			.addCase(requestOtp.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(verifyPdfSignature.pending, (state) => {
				state.loading = true;
				state.verificationResult = null;
			})
			.addCase(verifyPdfSignature.fulfilled, (state, action) => {
				state.loading = false;
				state.verificationResult = action.payload;
			})
			.addCase(verifyPdfSignature.rejected, (state, action) => {
				state.error = action.payload;
				state.verificationResult = { status: "error", message: action.payload };
			})
			.addCase(verifyFilesSignature.pending, (state) => {
				state.loading = true;
			})
			.addCase(verifyFilesSignature.fulfilled, (state, action) => {
				state.loading = false;
				if (action.payload?.success && Array.isArray(action.payload.files)) {
					const newMap = { ...state.verificationResultsMap };
					action.payload.files.forEach(fileResult => {
						newMap[fileResult.fileId] = fileResult;
					});
					state.verificationResultsMap = newMap;
				}
			})
			.addCase(verifyFilesSignature.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});

	},
});

export default DigitalSignatureFileSlice.reducer;
