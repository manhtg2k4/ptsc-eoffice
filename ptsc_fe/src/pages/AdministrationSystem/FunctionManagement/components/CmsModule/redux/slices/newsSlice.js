import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";
import { API_PUBLISHED, API_LIST_VIDEO, API_LIST_ALBUM, API_TOPPICS, API_EVENT_CALENDAR, API_USER, API_MEDIA_GALERY, API_SEARCH_ALL, API_USER_ROLE } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";

// Async thunk để gọi API
export const fetchPublishedNews = createAsyncThunk(
    "news/fetchPublishedNews",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_PUBLISHED}/published`, { params });
            return response; // axiosClient trả về response.data
        } catch (error) {
            const message =
                error.response?.data?.message || "Lỗi khi tải danh sách tin tức.";
            return rejectWithValue(message);
        }
    }
);

export const fetchSpecialNews = createAsyncThunk(
    "news/fetchSpecialNews",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_PUBLISHED}/published`, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải tin tức tiêu điểm.";
            return rejectWithValue(message);
        }
    }
);


export const fetchLatestNews = createAsyncThunk(
    "news/fetchLatestNews",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_PUBLISHED}/latest`, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải tin tức mới nhất.";
            return rejectWithValue(message);
        }
    }
);

export const fetchSuggestedNews = createAsyncThunk(
    "news/fetchSuggestedNews",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_PUBLISHED}/suggested`, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải tin tức liên quan.";
            return rejectWithValue(message);
        }
    }
);

export const fetchMostViewedNews = createAsyncThunk(
    "news/fetchMostViewedNews",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_PUBLISHED}/most-viewed`, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải tin tức xem nhiều.";
            return rejectWithValue(message);
        }
    }
);

export const fetchFavoriteNews = createAsyncThunk(
    "news/fetchFavoriteNews",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_PUBLISHED}/favorites`, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải tin tức yêu thích.";
            return rejectWithValue(message);
        }
    }
);

// Async thunk để gọi chi tiết tin tức
export const fetchNewsDetail = createAsyncThunk(
    "news/fetchNewsDetail",
    async (id, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_PUBLISHED}/${id}`);
            return response; // axiosClient trả về response.data
        } catch (error) {
            const message =
                error.response?.data?.message || "Lỗi khi tải chi tiết tin tức.";
            return rejectWithValue(message);
        }
    }
);
export const fetchVideos = createAsyncThunk(
    "news/fetchVideos",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_LIST_VIDEO}/public/list`, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải danh sách video.";
            return rejectWithValue(message);
        }
    }
);

// Async thunk để gọi chi tiết video
export const fetchVideoDetail = createAsyncThunk(
    "news/fetchVideoDetail",
    async (id, { rejectWithValue }) => {
        try {
            const baseUrl = API_LIST_VIDEO.replace("/list", "");
            const response = await axiosClient.get(`${baseUrl}/${id}`);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải chi tiết video.";
            return rejectWithValue(message);
        }
    }
);

export const increaseVideoView = createAsyncThunk(
    "news/increaseVideoView",
    async (id, { rejectWithValue }) => {
        try {
            const baseUrl = API_LIST_VIDEO.replace("/list", "");
            const response = await axiosClient.post(`${baseUrl}/${id}/view`);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi cập nhật lượt xem video.";
            return rejectWithValue(message);
        }
    }
);

export const fetchRecentlyViewedVideos = createAsyncThunk(
    "news/fetchRecentlyViewedVideos",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_LIST_VIDEO}/history/recently-viewed`, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải danh sách video đã xem.";
            return rejectWithValue(message);
        }
    }
);

// Async thunk để gọi danh sách album ảnh
export const fetchAlbums = createAsyncThunk(
    "news/fetchAlbums",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(API_LIST_ALBUM, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải danh sách album.";
            return rejectWithValue(message);
        }
    }
);

export const fetchAlbumDetail = createAsyncThunk(
    "news/fetchAlbumDetail",
    async (id, { rejectWithValue }) => {
        try {
            const baseUrl = API_LIST_ALBUM.replace("/list", "");
            const response = await axiosClient.get(`${baseUrl}/${id}`);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải chi tiết album.";
            return rejectWithValue(message);
        }
    }
);

export const updateVideo = createAsyncThunk(
    "news/updateVideo",
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.patch(`${API_LIST_VIDEO}/${id}`, data);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi cập nhật video.";
            return rejectWithValue(message);
        }
    }
);

export const updateAlbum = createAsyncThunk(
    "news/updateAlbum",
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.patch(`${API_LIST_ALBUM}/${id}`, data);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi cập nhật album.";
            return rejectWithValue(message);
        }
    }
);

export const deleteVideos = createAsyncThunk(
    "news/deleteVideos",
    async (ids, { rejectWithValue }) => {
        try {
            const response = await axiosClient.delete(`${API_LIST_VIDEO}/soft-delete-many`, { data: { ids } });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi xóa video.";
            return rejectWithValue(message);
        }
    }
);

export const deleteAlbums = createAsyncThunk(
    "news/deleteAlbums",
    async (ids, { rejectWithValue }) => {
        try {
            const response = await axiosClient.delete(`${API_LIST_ALBUM}/soft-delete-many`, { data: { ids } });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi xóa album.";
            return rejectWithValue(message);
        }
    }
);

export const fetchTags = createAsyncThunk(
    "news/fetchTags",
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_PUBLISHED}/tags/all`);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải danh sách tags.";
            return rejectWithValue(message);
        }
    }
);

export const fetchTopics = createAsyncThunk(
    "news/fetchTopics",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(API_TOPPICS, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải danh sách chủ đề.";
            return rejectWithValue(message);
        }
    }
);

export const fetchSearchAll = createAsyncThunk(
    "news/fetchSearchAll",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(API_SEARCH_ALL, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tìm kiếm tổng thể.";
            return rejectWithValue(message);
        }
    }
);

export const fetchPortalNews = createAsyncThunk(
    "news/fetchPortalNews",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_PUBLISHED}/published`, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải tin tức portal.";
            return rejectWithValue(message);
        }
    }
);

export const fetchEventCalendar = createAsyncThunk(
    "news/fetchEventCalendar",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(API_EVENT_CALENDAR, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải danh sách lịch sự kiện.";
            return rejectWithValue(message);
        }
    }
);

export const createEventCalendar = createAsyncThunk(
    "news/createEventCalendar",
    async (payload, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post(API_EVENT_CALENDAR, payload);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tạo lịch sự kiện.";
            return rejectWithValue(message);
        }
    }
);

export const fetchEventCalendarDetail = createAsyncThunk(
    "news/fetchEventCalendarDetail",
    async (id, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_EVENT_CALENDAR}/${id}`);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải chi tiết sự kiện.";
            return rejectWithValue(message);
        }
    }
);

export const updateEventCalendar = createAsyncThunk(
    "news/updateEventCalendar",
    async ({ id, payload }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.patch(`${API_EVENT_CALENDAR}/${id}`, payload);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi cập nhật lịch sự kiện.";
            return rejectWithValue(message);
        }
    }
);

export const deleteEventCalendar = createAsyncThunk(
    "news/deleteEventCalendar",
    async (id, { rejectWithValue }) => {
        try {
            const response = await axiosClient.delete(`${API_EVENT_CALENDAR}/${id}`);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi xóa lịch sự kiện.";
            return rejectWithValue(message);
        }
    }
);

export const fetchUsers = createAsyncThunk(
    "news/fetchUsers",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_USER}/all`, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải danh sách người dùng.";
            return rejectWithValue(message);
        }
    }
);

export const fetchUserRoles = createAsyncThunk(
    "news/fetchUserRoles",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(API_USER_ROLE, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải danh sách vai trò.";
            return rejectWithValue(message);
        }
    }
);

export const fetchMediaGallery = createAsyncThunk(
    "news/fetchMediaGallery",
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(API_MEDIA_GALERY, { params });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải danh sách bộ sưu tập phương tiện.";
            return rejectWithValue(message);
        }
    }
);

export const fetchMediaGalleryDetail = createAsyncThunk(
    "news/fetchMediaGalleryDetail",
    async ({ id, type }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`${API_MEDIA_GALERY}/${id}`, { params: { type } });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || "Lỗi khi tải chi tiết bộ sưu tập phương tiện.";
            return rejectWithValue(message);
        }
    }
);

const initialState = {
    newsList: [],
    videoList: [],
    albumList: [],
    tagList: [],
    topicList: [],
    latestNews: [],
    suggestedNews: [],
    mostViewedNews: [],
    favoriteNews: [],
    specialNews: [],
    recentlyViewedVideos: [],
    portalNewsList: [],
    eventCalendarList: [],
    userList: [],
    userRoleList: [],
    mediaGalleryList: [],
    totalNews: 0,
    totalLatestNews: 0,
    totalMostViewedNews: 0,
    totalFavoriteNews: 0,
    totalMediaGallery: 0,
    currentNews: null,
    currentVideo: null,
    currentAlbum: null,
    currentEvent: null,
    currentMediaGalleryDetail: null,
    loading: false,
    error: null,
    searchCounts: {},
};

const newsSlice = createSlice({
    name: "news",
    initialState,
    reducers: {
        clearNews: (state) => {
            state.newsList = [];
            state.currentNews = null;
            state.error = null;
        },
        updateAlbumStats: (state, action) => {
            const { albumId, totalLikes, meLike, views } = action.payload;
            if (state.currentAlbum && state.currentAlbum.id === albumId) {
                if (totalLikes !== undefined) state.currentAlbum.totalLikes = totalLikes;
                if (meLike !== undefined) state.currentAlbum.meLike = meLike;
                if (views !== undefined) state.currentAlbum.views = views;
            }
        },
        updateVideoStats: (state, action) => {
            const { videoId, totalLikes, meLike, views } = action.payload;
            if (state.currentVideo && state.currentVideo.id === videoId) {
                if (totalLikes !== undefined) state.currentVideo.totalLikes = totalLikes;
                if (meLike !== undefined) state.currentVideo.meLike = meLike;
                if (views !== undefined) state.currentVideo.views = views;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPublishedNews.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPublishedNews.fulfilled, (state, action) => {
                state.loading = false;
                state.newsList = action.payload.items || action.payload.data || action.payload;
                state.totalNews = action.payload.total || (action.payload.data?.total) || 0;
            })
            .addCase(fetchPublishedNews.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchNewsDetail.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.currentNews = null;
            })
            .addCase(fetchNewsDetail.fulfilled, (state, action) => {
                state.loading = false;
                state.currentNews = action.payload.data; // API trả về { status: 1, data: {...} }
            })
            .addCase(fetchNewsDetail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchVideos.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchVideos.fulfilled, (state, action) => {
                state.loading = false;
                state.videoList = action.payload;
            })
            .addCase(fetchVideos.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchVideoDetail.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.currentVideo = null;
            })
            .addCase(fetchVideoDetail.fulfilled, (state, action) => {
                state.loading = false;
                state.currentVideo = action.payload.data || action.payload;
            })
            .addCase(fetchVideoDetail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(increaseVideoView.pending, () => {
                // Optional: set loading or ignore
            })
            .addCase(increaseVideoView.fulfilled, (state, action) => {
                // If API returns updated video object with new view count, update it
                if (state.currentVideo && state.currentVideo.id === action.meta.arg) {
                    // logic to update local view count if needed, or rely on re-fetch
                }
            })
            .addCase(increaseVideoView.rejected, ( ) => {
                // Handle error silently or log
            })
            .addCase(fetchRecentlyViewedVideos.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchRecentlyViewedVideos.fulfilled, (state, action) => {
                state.loading = false;
                state.recentlyViewedVideos = action.payload.data || action.payload;
            })
            .addCase(fetchRecentlyViewedVideos.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchAlbums.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAlbums.fulfilled, (state, action) => {
                state.loading = false;
                state.albumList = action.payload;
            })
            .addCase(fetchAlbums.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchAlbumDetail.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.currentAlbum = null;
            })
            .addCase(fetchAlbumDetail.fulfilled, (state, action) => {
                state.loading = false;
                state.currentAlbum = action.payload.data || action.payload;
            })
            .addCase(fetchAlbumDetail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchTags.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTags.fulfilled, (state, action) => {
                state.loading = false;
                state.tagList = action.payload.data || action.payload;
            })
            .addCase(fetchTags.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchTopics.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTopics.fulfilled, (state, action) => {
                state.loading = false;
                state.topicList = action.payload.data || action.payload;
            })
            .addCase(fetchTopics.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchLatestNews.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchLatestNews.fulfilled, (state, action) => {
                state.loading = false;
                state.latestNews = action.payload.data || action.payload;
                state.totalLatestNews = action.payload.total || (action.payload.data?.total) || 0;
            })
            .addCase(fetchLatestNews.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchSuggestedNews.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSuggestedNews.fulfilled, (state, action) => {
                state.loading = false;
                state.suggestedNews = action.payload.data || action.payload;
            })
            .addCase(fetchSuggestedNews.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchMostViewedNews.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMostViewedNews.fulfilled, (state, action) => {
                state.loading = false;
                state.mostViewedNews = action.payload.data || action.payload;
                state.totalMostViewedNews = action.payload.total || (action.payload.data?.total) || 0;
            })
            .addCase(fetchMostViewedNews.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchFavoriteNews.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchFavoriteNews.fulfilled, (state, action) => {
                state.loading = false;
                state.favoriteNews = action.payload.data || action.payload;
                state.totalFavoriteNews = action.payload.total || (action.payload.data?.total) || 0;
            })
            .addCase(fetchFavoriteNews.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchSpecialNews.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSpecialNews.fulfilled, (state, action) => {
                state.loading = false;
                state.specialNews = action.payload.data || action.payload;
            })
            .addCase(fetchSpecialNews.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchPortalNews.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPortalNews.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload.items) {
                    state.portalNewsList = action.payload.items;
                } else if (Array.isArray(action.payload)) {
                    state.portalNewsList = action.payload;
                } else {
                    state.portalNewsList = [];
                }
            })
            .addCase(fetchPortalNews.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchEventCalendar.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEventCalendar.fulfilled, (state, action) => {
                state.loading = false;
                state.eventCalendarList = action.payload.data || action.payload.items || action.payload;
            })
            .addCase(fetchEventCalendar.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(createEventCalendar.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createEventCalendar.fulfilled, (state, action) => {
                state.loading = false;
                // Add the newly created event to the list
                const newEvent = action.payload.data || action.payload;
                state.eventCalendarList = [newEvent, ...state.eventCalendarList];
            })
            .addCase(createEventCalendar.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.userList = action.payload.data || action.payload.items || action.payload;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchEventCalendarDetail.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.currentEvent = null;
            })
            .addCase(fetchEventCalendarDetail.fulfilled, (state, action) => {
                state.loading = false;
                state.currentEvent = action.payload.data || action.payload;
            })
            .addCase(fetchEventCalendarDetail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(updateEventCalendar.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateEventCalendar.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data || action.payload;
                state.eventCalendarList = state.eventCalendarList.map(item =>
                    (item.id || item._id) === (updated.id || updated._id) ? { ...item, ...updated } : item
                );
            })
            .addCase(updateEventCalendar.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(deleteEventCalendar.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteEventCalendar.fulfilled, (state, action) => {
                state.loading = false;
                const deletedId = action.meta.arg;
                state.eventCalendarList = state.eventCalendarList.filter(item => (item.id || item._id) !== deletedId);
            })
            .addCase(deleteEventCalendar.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchMediaGallery.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMediaGallery.fulfilled, (state, action) => {
                state.loading = false;
                state.mediaGalleryList = action.payload.items || action.payload.data || action.payload;
                state.totalMediaGallery = action.payload.total || (action.payload.data?.total) || 0;
            })
            .addCase(fetchMediaGallery.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchMediaGalleryDetail.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.currentMediaGalleryDetail = null;
            })
            .addCase(fetchMediaGalleryDetail.fulfilled, (state, action) => {
                state.loading = false;
                state.currentMediaGalleryDetail = action.payload.data || action.payload;
            })
            .addCase(fetchMediaGalleryDetail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(updateVideo.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateVideo.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data || action.payload;
                state.mediaGalleryList = state.mediaGalleryList.map(item =>
                    item.id === updated.id ? { ...item, ...updated } : item
                );
            })
            .addCase(updateVideo.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(updateAlbum.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateAlbum.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data || action.payload;
                state.mediaGalleryList = state.mediaGalleryList.map(item =>
                    item.id === updated.id ? { ...item, ...updated } : item
                );
            })
            .addCase(updateAlbum.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(deleteVideos.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteVideos.fulfilled, (state, action) => {
                state.loading = false;
                // mảng ids được truyền vào qua action.meta.arg
                const deletedIds = action.meta.arg;
                state.mediaGalleryList = state.mediaGalleryList.filter(item => !deletedIds.includes(item.id));
            })
            .addCase(deleteVideos.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(deleteAlbums.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteAlbums.fulfilled, (state, action) => {
                state.loading = false;
                const deletedIds = action.meta.arg;
                state.mediaGalleryList = state.mediaGalleryList.filter(item => !deletedIds.includes(item.id));
            })
            .addCase(deleteAlbums.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchSearchAll.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSearchAll.fulfilled, (state, action) => {
                state.loading = false;
                state.newsList = action.payload.items || action.payload.data || action.payload;
                state.totalNews = action.payload.total || (action.payload.data?.total) || 0;
                // Store category counts if provided by the API, otherwise calculate from current list
                state.searchCounts = action.payload.counts || action.payload.data?.counts || null;
            })
            .addCase(fetchSearchAll.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchUserRoles.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserRoles.fulfilled, (state, action) => {
                state.loading = false;
                state.userRoleList = action.payload.data || action.payload.items || action.payload;
            })
            .addCase(fetchUserRoles.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
    },
});

export const { clearNews, updateAlbumStats, updateVideoStats } = newsSlice.actions;
export default newsSlice.reducer;
