import { DASHBOARD_TIMEOUT } from "@/variable";
import { API_DASHBOARD_CONFIG, API_DASHBOARD_PAGE_MEDIUM, API_DASHBOARD_PAGE_NORMAL, API_DASHBOARD_PAGE_PREMIUM } from "@EnvironmentFile/constants/urlConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@services/api";

//Normal
export const getDataDashboardNormalStats = createAsyncThunk(
  "dashboardPage/getDataDashboardNormalStats",
  async (_, { rejectWithValue }) => {
    try {
			const res = await api.get(`${API_DASHBOARD_PAGE_NORMAL}/stats`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardNormalTaskOverview = createAsyncThunk(
  "dashboardPage/getDataDashboardNormalTaskOverview",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_NORMAL}/taskOverview`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardNormalProjects = createAsyncThunk(
  "dashboardPage/getDataDashboardNormalProjects",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_NORMAL}/projects`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardNormalQuickActions = createAsyncThunk(
  "dashboardPage/getDataDashboardNormalQuickActions",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_NORMAL}/quickActions`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardNormalMeetings = createAsyncThunk(
  "dashboardPage/getDataDashboardNormalMeetings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_NORMAL}/meetings`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardNormalEvents = createAsyncThunk(
  "dashboardPage/getDataDashboardNormalEvents",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_NORMAL}/events`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardNormalNews = createAsyncThunk(
  "dashboardPage/getDataDashboardNormalNews",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_NORMAL}/news`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

//Medium
export const getDataDashboardMediumAlerts = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumAlerts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/alerts`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardMediumStats = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumStats",
  async (_, { rejectWithValue }) => {
    try {
			const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/stats`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardMediumEmployeeStatus = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumEmployeeStatus",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/employeeStatus`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardMediumApprovals = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumApprovals",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/approvals`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);


export const getDataDashboardMediumApprovalsList = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumApprovalsList",
  async (args, { rejectWithValue }) => {
    const { page = 1, limit = 5 } = args || {};
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/approvals-list?page=${page}&limit=${limit}`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardMediumDocuments = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumDocuments",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/documents`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardMediumHeatmap = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumHeatmap",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/heatmap`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardMediumProjects = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumProjects",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/projects`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardMediumMeetings = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumMeetings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/meetings`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardMediumUpcomingEvents = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumUpcomingEvents",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/upcomingEvents`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardMediumUtilityRequests = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumUtilityRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/utilityRequests`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardMediumNews = createAsyncThunk(
  "dashboardPage/getDataDashboardMediumNews",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_MEDIUM}/news`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

//Premium
export const getDataDashboardPremiumAlerts = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumAlerts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/notificationsText`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumStats = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/stats`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumDepartmentPerformance = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumDepartmentPerformance",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/departmentPerformance`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumWorkloadProjects = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumWorkloadProjects",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/workload-projects`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumCeoApprovals = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumCeoApprovals",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/ceo-approvals`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumCeoApprovalsList = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumCeoApprovalsList",
  async (args, { rejectWithValue }) => {
    const { page = 1, limit = 10 } = args || {};
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/ceo-approvals-list?page=${page}&limit=${limit}`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumDocuments = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumDocuments",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/documents`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumDepartmentTasks = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumDepartmentTasks",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/department-tasks`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumUtilities = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumUtilities",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/utilities`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumHrStats = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumHrStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/hr-stats`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumMeetings = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumMeetings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/meetings`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumNews = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumNews",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/news`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getDataDashboardPremiumEvents = createAsyncThunk(
  "dashboardPage/getDataDashboardPremiumEvents",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_DASHBOARD_PAGE_PREMIUM}/events`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const getConfigDashboard = createAsyncThunk(
  "dashboardPage/getConfigDashboard",
  async (_, { rejectWithValue }) => {
    try {
			const res = await api.get(`${API_DASHBOARD_CONFIG}`, { timeout: DASHBOARD_TIMEOUT });
      return res?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi tải dữ liệu!"
      );
    }
  }
);

export const patchConfigDashboard = createAsyncThunk(
  "dashboardPage/patchConfigDashboard",
  async (body, { rejectWithValue }) => {
    try {
			const res = await api.patch(`${API_DASHBOARD_CONFIG}`, body, { timeout: DASHBOARD_TIMEOUT });
			logger.log('patchConfigDashboard', res)
      return res?.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi cập nhật cấu hình!"
      );
    }
  }
);

const DashboardPageSlice = createSlice({
  name: "dashboardPage",
	initialState: {
		// Dữ liệu cho Normal
    dataDashboardNormalStats: [],
    dataDashboardNormalTaskOverview: {},
    dataDashboardNormalProjects: {
      summary: {},
      list: [],
    },
    dataDashboardNormalQuickActions: [],
    dataDashboardNormalMeetings: [],
    dataDashboardNormalEvents: [],
		dataDashboardNormalNews: [],
		// Dữ liệu cho Medium
		dataDashboardMediumAlerts: [],
		dataDashboardMediumStats: {},
		dataDashboardMediumEmployeeStatus: {},
		dataDashboardMediumApprovals: {},
		dataDashboardMediumApprovalsList: [],
		approvalsMediumListPage: 1,
		approvalsMediumListLowestPage: 1,
		approvalsMediumListHighestPage: 1,
		approvalsMediumListLoadedPages: [],
		approvalsMediumListHasMore: true,
		approvalsMediumListHasMoreUp: false,
		approvalsMediumListLoading: false,

		dataDashboardMediumDocuments: {},
		dataDashboardMediumHeatmap: {},
		dataDashboardMediumProjects: [],
		dataDashboardMediumMeetings: [],
		dataDashboardMediumUpcomingEvents: [],
		dataDashboardMediumUtilityRequests: {},
		dataDashboardMediumNews: [],
		//Dữ liệu cho Premium
		dataDashboardPremiumAlerts: [],
		dataDashboardPremiumStats: [],
		dataDashboardPremiumDepartmentPerformance: {},
		dataDashboardPremiumWorkloadProjects: [],
		dataDashboardPremiumCeoApprovals: {},
		dataDashboardPremiumCeoApprovalsList: [],
		approvalsListPage: 1,
		approvalsListLowestPage: 1,
		approvalsListHighestPage: 1,
		approvalsListLoadedPages: [],
		approvalsListHasMore: true,
		approvalsListHasMoreUp: false,
		approvalsListLoading: false,
		dataDashboardPremiumDocuments: [],
		dataDashboardPremiumDepartmentTasks: [],
		dataDashboardPremiumUtilities: [],
		dataDashboardPremiumHrStats: {},
		dataDashboardPremiumMeetings: [],
		dataDashboardPremiumNews: [],
		dataDashboardPremiumEvents: [],
		dataDashboardConfig: {},
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getDataDashboardNormalStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardNormalStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardNormalStats = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardNormalStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardNormalTaskOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardNormalTaskOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardNormalTaskOverview = action?.payload?.data ?? action?.payload ?? {};
      })
      .addCase(getDataDashboardNormalTaskOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardNormalProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardNormalProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardNormalProjects = action?.payload?.data ?? action?.payload ?? {
          summary: {},
          list: [],
        };
      })
      .addCase(getDataDashboardNormalProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardNormalQuickActions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardNormalQuickActions.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardNormalQuickActions = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardNormalQuickActions.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardNormalMeetings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardNormalMeetings.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardNormalMeetings = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardNormalMeetings.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardNormalEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardNormalEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardNormalEvents = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardNormalEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardNormalNews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardNormalNews.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardNormalNews = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardNormalNews.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardMediumAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardMediumAlerts = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardMediumAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardMediumStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardMediumStats = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardMediumStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardMediumEmployeeStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumEmployeeStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardMediumEmployeeStatus = action?.payload?.data ?? action?.payload ?? {};
      })
      .addCase(getDataDashboardMediumEmployeeStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardMediumApprovals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumApprovals.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardMediumApprovals = action?.payload?.data ?? action?.payload ?? {};
      })
      .addCase(getDataDashboardMediumApprovals.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })

      .addCase(getDataDashboardMediumApprovalsList.pending, (state) => {
        state.approvalsMediumListLoading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumApprovalsList.fulfilled, (state, action) => {
        state.approvalsMediumListLoading = false;
        const payloadData = action?.payload?.data ?? action?.payload ?? {};
        const newList = payloadData.list || action.payload?.list || [];
        const page = payloadData.page || action.meta.arg?.page || 1;
        const limit = payloadData.limit || action.meta.arg?.limit || 8;
        const direction = action.meta.arg?.direction || "down";
        
        const total = payloadData.total || 0;

        if (page === 1 && direction === "down" && (!state.approvalsMediumListLowestPage || state.approvalsMediumListLowestPage === 1)) {
          state.dataDashboardMediumApprovalsList = newList;
          state.approvalsMediumListLowestPage = 1;
          state.approvalsMediumListHighestPage = 1;
          state.approvalsMediumListLoadedPages = [1];
          state.approvalsMediumListHasMore = state.dataDashboardMediumApprovalsList.length < total && newList.length > 0;
          state.approvalsMediumListHasMoreUp = false;
        } else {
          let loaded = Array.isArray(state.approvalsMediumListLoadedPages) ? [...state.approvalsMediumListLoadedPages] : [];
          if (loaded.includes(page)) {
             state.approvalsMediumListPage = page;
             return; // Already loaded
          }
          
          if (direction === "down") {
            state.dataDashboardMediumApprovalsList = [...state.dataDashboardMediumApprovalsList, ...newList];
            state.approvalsMediumListHighestPage = page;
            state.approvalsMediumListHasMore = state.dataDashboardMediumApprovalsList.length < total && newList.length > 0;
          } else {
            state.dataDashboardMediumApprovalsList = [...newList, ...state.dataDashboardMediumApprovalsList];
            state.approvalsMediumListLowestPage = page;
            state.approvalsMediumListHasMoreUp = page > 1;
          }
          
          loaded.push(page);
          loaded.sort((a, b) => a - b);
          
          // Max pages = 3 -> (1 trang trước, 1 trang sau, 1 trang hiện tại)
          const MAX_PAGES = 3;
          if (loaded.length > MAX_PAGES) {
             const maxItems = MAX_PAGES * limit;
             if (direction === "down") {
                 loaded.shift(); // remove lowest page
                 if (state.dataDashboardMediumApprovalsList.length > maxItems) {
                     state.dataDashboardMediumApprovalsList = state.dataDashboardMediumApprovalsList.slice(-maxItems);
                 }
                 state.approvalsMediumListLowestPage = loaded[0];
                 state.approvalsMediumListHasMoreUp = true;
             } else {
                 loaded.pop(); // remove highest page
                 if (state.dataDashboardMediumApprovalsList.length > maxItems) {
                     state.dataDashboardMediumApprovalsList = state.dataDashboardMediumApprovalsList.slice(0, maxItems);
                 }
                 state.approvalsMediumListHighestPage = loaded[loaded.length - 1];
                 state.approvalsMediumListHasMore = true;
             }
          }
          state.approvalsMediumListLoadedPages = loaded;
        }
        state.approvalsMediumListPage = page;
      })
      .addCase(getDataDashboardMediumApprovalsList.rejected, (state, action) => {
        state.approvalsMediumListLoading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardMediumDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardMediumDocuments = action?.payload?.data ?? action?.payload ?? {};
      })
      .addCase(getDataDashboardMediumDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardMediumHeatmap.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumHeatmap.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardMediumHeatmap = action?.payload?.data ?? action?.payload ?? {};
      })
      .addCase(getDataDashboardMediumHeatmap.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardMediumProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardMediumProjects = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardMediumProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardMediumMeetings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumMeetings.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardMediumMeetings = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardMediumMeetings.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardMediumUpcomingEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumUpcomingEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardMediumUpcomingEvents = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardMediumUpcomingEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardMediumUtilityRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumUtilityRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardMediumUtilityRequests = action?.payload?.data ?? action?.payload ?? {};
      })
      .addCase(getDataDashboardMediumUtilityRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardMediumNews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardMediumNews.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardMediumNews = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardMediumNews.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      // Premium
      .addCase(getDataDashboardPremiumAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumAlerts = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardPremiumAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumStats = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardPremiumStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumDepartmentPerformance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumDepartmentPerformance.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumDepartmentPerformance = action?.payload?.data ?? action?.payload ?? {};
      })
      .addCase(getDataDashboardPremiumDepartmentPerformance.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumWorkloadProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumWorkloadProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumWorkloadProjects = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardPremiumWorkloadProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumCeoApprovals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumCeoApprovals.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumCeoApprovals = action?.payload?.data ?? action?.payload ?? {};
      })
      .addCase(getDataDashboardPremiumCeoApprovals.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumCeoApprovalsList.pending, (state) => {
        state.approvalsListLoading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumCeoApprovalsList.fulfilled, (state, action) => {
        state.approvalsListLoading = false;
        const payloadData = action?.payload?.data ?? action?.payload ?? {};
        const newList = payloadData.list || [];
        const page = payloadData.page || action.meta.arg.page || 1;
        const limit = payloadData.limit || action.meta.arg.limit || 8;
        const direction = action.meta.arg.direction || "down";
        
        if (page === 1 && direction === "down" && (!state.approvalsListLowestPage || state.approvalsListLowestPage === 1)) {
          state.dataDashboardPremiumCeoApprovalsList = newList;
          state.approvalsListLowestPage = 1;
          state.approvalsListHighestPage = 1;
          state.approvalsListLoadedPages = [1];
          state.approvalsListHasMore = newList.length >= limit;
          state.approvalsListHasMoreUp = false;
        } else {
          let loaded = Array.isArray(state.approvalsListLoadedPages) ? [...state.approvalsListLoadedPages] : [];
          if (loaded.includes(page)) {
             state.approvalsListPage = page;
             return; // Already loaded
          }
          
          if (direction === "down") {
            state.dataDashboardPremiumCeoApprovalsList = [...state.dataDashboardPremiumCeoApprovalsList, ...newList];
            state.approvalsListHighestPage = page;
            state.approvalsListHasMore = newList.length >= limit;
          } else {
            state.dataDashboardPremiumCeoApprovalsList = [...newList, ...state.dataDashboardPremiumCeoApprovalsList];
            state.approvalsListLowestPage = page;
            state.approvalsListHasMoreUp = page > 1;
          }
          
          loaded.push(page);
          loaded.sort((a, b) => a - b);
          
          // Max pages = 3 -> (1 trang trước, 1 trang sau, 1 trang hiện tại)
          const MAX_PAGES = 3;
          if (loaded.length > MAX_PAGES) {
             const maxItems = MAX_PAGES * limit;
             if (direction === "down") {
                 loaded.shift(); // remove lowest page
                 if (state.dataDashboardPremiumCeoApprovalsList.length > maxItems) {
                     state.dataDashboardPremiumCeoApprovalsList = state.dataDashboardPremiumCeoApprovalsList.slice(-maxItems);
                 }
                 state.approvalsListLowestPage = loaded[0];
                 state.approvalsListHasMoreUp = true;
             } else {
                 loaded.pop(); // remove highest page
                 if (state.dataDashboardPremiumCeoApprovalsList.length > maxItems) {
                     state.dataDashboardPremiumCeoApprovalsList = state.dataDashboardPremiumCeoApprovalsList.slice(0, maxItems);
                 }
                 state.approvalsListHighestPage = loaded[loaded.length - 1];
                 state.approvalsListHasMore = true;
             }
          }
          state.approvalsListLoadedPages = loaded;
        }
        state.approvalsListPage = page;
      })
      .addCase(getDataDashboardPremiumCeoApprovalsList.rejected, (state, action) => {
        state.approvalsListLoading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumDocuments = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardPremiumDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumDepartmentTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumDepartmentTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumDepartmentTasks = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardPremiumDepartmentTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumUtilities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumUtilities.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumUtilities = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardPremiumUtilities.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumHrStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumHrStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumHrStats = action?.payload?.data ?? action?.payload ?? {};
      })
      .addCase(getDataDashboardPremiumHrStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumMeetings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumMeetings.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumMeetings = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardPremiumMeetings.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumNews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumNews.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumNews = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardPremiumNews.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getDataDashboardPremiumEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDataDashboardPremiumEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardPremiumEvents = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getDataDashboardPremiumEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
      .addCase(getConfigDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
			.addCase(getConfigDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dataDashboardConfig = action?.payload?.data ?? action?.payload ?? [];
      })
      .addCase(getConfigDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.data;
      })
  },
});

export default DashboardPageSlice.reducer;
