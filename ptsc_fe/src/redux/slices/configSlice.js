import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  // API_VIEWCONFIG_DHVB,
  // API_CRMSTATUS_DHVB,
  API_CRMSOURCE_DHVB,
  API_ADD_VANBANDEN_DHVB,
} from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";

// Async thunk để lấy tất cả cấu hình DHVB
export const fetchDhvbConfig = createAsyncThunk(
  "config/fetchDhvbConfig",
  async ({ forceRefresh = false } = {}, { rejectWithValue }) => {
    if (forceRefresh) {
      localStorage.removeItem("crmSource");
    } else {
      const cachedCrmSource = localStorage.getItem("crmSource");
      if (cachedCrmSource) {
        try {
          return { crmSource: JSON.parse(cachedCrmSource), fromCache: true };
        } catch (e) {
          logger.error("Error parsing cached crmSource:", e);
        }
      }
    }

    try {
      const [
        // viewConfigRes,
        // crmStatusRes,
        crmSourceRes,
      ] = await Promise.all([
        // axiosInstance.get(API_VIEWCONFIG_DHVB),
        // axiosInstance.get(API_CRMSTATUS_DHVB),
        axiosInstance.get(`${API_CRMSOURCE_DHVB}?limit=1000`),
      ]);

      // Lưu vào localStorage khi gọi API thành công
      // if (viewConfigRes) {
      //   localStorage.setItem('viewConfig_dhvb', JSON.stringify(viewConfigRes));
      // }
      // if (crmStatusRes) {
      //   localStorage.setItem('crmStatus', JSON.stringify(crmStatusRes));
      // }
      if (crmSourceRes) {
        localStorage.setItem("crmSource", JSON.stringify(crmSourceRes));
      }

      return {
        // viewConfig: viewConfigRes,
        // crmStatus: crmStatusRes,
        crmSource: crmSourceRes,
      };
    } catch (error) {
      logger.error("Error fetching DHVB config:", error);
      return rejectWithValue(error.message || "Failed to fetch DHVB config");
    }
  }
);

// Thêm mới văn bản đến
export const addIncomingDocument = createAsyncThunk(
  "config/addIncomingDocument",
  async (formData, { getState, rejectWithValue }) => {
    try {
      const { auth: { dataUser: authUser } } = getState();
      const userData = authUser || {};
      const assigneeUserId = userData?.user?._id;
      const body = {
        ...formData,
        // documentId: `DOC-${Date.now()}`, // Tự động sinh ID
        nodeId: "Gateway_0wb5flm", // trường fix cứng
        assigneeUserId: assigneeUserId,
        bookDocumentId: Number(formData.bookDocumentId), // Chuyển sang số
      };

      // logger.log("Adding incoming document with data:", body);
      const response = await axiosInstance.post(API_ADD_VANBANDEN_DHVB, body);
      return response;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        "Thêm văn bản thất bại";
      return rejectWithValue(message);
    }
  }
);

export const updateIncomingDocument = createAsyncThunk(
  "config/updateIncomingDocument",
  async ({ documentId, ...formData }, { rejectWithValue }) => {
    if (!documentId) {
      return rejectWithValue("Không tìm thấy ID văn bản để cập nhật.");
    }
    try {
      // Tạo payload và đảm bảo bookDocumentId là kiểu Number nếu tồn tại
      const payload = { ...formData };
      if (formData.bookDocumentId) {
        payload.bookDocumentId = Number(formData.bookDocumentId);
      }

      // API endpoint để cập nhật là /demo/docs/:id
      const url = `${API_ADD_VANBANDEN_DHVB}/${documentId}`;
      const response = await axiosInstance.put(url, payload);
      return response;
    } catch (error) {
       const message =
        error?.response?.data?.message ||
        error?.message || "Cập nhật văn bản thất bại";
     return rejectWithValue(message);
    }
  }
);
const configSlice = createSlice({
  name: "config",
  initialState: {
    loading: false,
    error: null,
    crmSource: [], // Thêm crmSource vào state
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDhvbConfig.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDhvbConfig.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.crmSource) {
          state.crmSource = action.payload.crmSource;
        }
      })
      .addCase(fetchDhvbConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Xử lý cho addIncomingDocument
      .addCase(addIncomingDocument.pending, (state) => {
        state.loading = true;
      })
      .addCase(addIncomingDocument.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addIncomingDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
    // Xử lý cho updateIncomingDocument
    builder
      .addCase(updateIncomingDocument.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateIncomingDocument.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateIncomingDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default configSlice.reducer;
