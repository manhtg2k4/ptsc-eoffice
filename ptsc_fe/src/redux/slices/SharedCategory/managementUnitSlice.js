import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  API_GET_COMMON_SOURCE,
  API_GET_LIST_ROLES,
  API_GET_LIST_UNIT,
  API_GET_LIST_USERS,
  API_DOCUMENT_HISTORY,
  API_COMMENTS,
	API_GET_LIST_USER_BY_ORGANIZATION_UNIT,
  API_COMMON_WORK_COMMENTS,
  API_GET_LIST_UNITS_INDIVIDUAL_PARTICIPANTS,
  API_ASSIGN_USER_BY_SECRETARY,
  API_COMMENT_MEETING,
  API_DISPLAY_BUTTON_CONFIG,
  API_GET_LIST_UNITS_INDIVIDUAL_LIBRARY,
} from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import { escapeHtml } from "@utils/securityUtils";

const escapeCommentPayload = (payload) => {
  if (!payload || typeof payload !== "object" || typeof payload.content !== "string") {
    return payload;
  }
  return {
    ...payload,
    content: escapeHtml(payload.content),
  };
};

//Lấy danh sách đơn vị
export const getDataListUnit = createAsyncThunk(
  "unit/getAll",
  async (
    { page = 1, limit = 500, noLimit = true, query, code, sort, apiUrl = API_GET_LIST_UNIT, extraParams } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
        noLimit,
        ...extraParams,
      };
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      if (query !== "" && code && sort && noLimit) {
        const { data } = await api.get(`${apiUrl}`, { params });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(`${apiUrl}`, {
          params: { page, limit, sort, noLimit, ...extraParams },
        });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);


export const getDataListUserAllByUnitExclude = createAsyncThunk(
  "unit/getUserAllByUnitExclude",
  async (
    { page = 1, limit = 25, query, code, sort, id, excludeId, email } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
      };
      if (id) {
        params.parent = id;
      }
      if (excludeId) {
        params.excludeId = excludeId;
      }
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query;
        });
      }
      if (email) {
        params.email = email;
      }
      const { data } = await api.get(`${API_GET_LIST_USERS}/all`, { params });
      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách người dùng"
      );
    }
  }
);

//Lấy danh sách người dùng thuộc đơn vị
export const getDataListUserByUnit = createAsyncThunk(
  "unit/getUserAllByUnit",
  async (
    { page = 1, limit = 25, query, code, sort, id } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
      };
      if (id) {
        params.parent = id;
      }
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      // ✅ Luôn gửi params (có query, code, sort, parent)
      const { data } = await api.get(`${API_GET_LIST_USERS}`, { params });
      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);
// lấy danh sách đơn bị trong lịch họp 
export const getListUnitMeeting = createAsyncThunk(
  "unit/getListUnitMeeting",
  async (
    { page = 1, limit = 500, query, code, sort } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
      };
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      if (query !== "" && code && sort) {
        const { data } = await api.get(`${API_GET_LIST_UNITS_INDIVIDUAL_PARTICIPANTS}`, { params });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(`${API_GET_LIST_UNITS_INDIVIDUAL_PARTICIPANTS}`, {
          params: { page, limit, sort },
        });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);

// lấy danh sách đơn bị trong thư viện dùng chung
export const getListUnitLibrary = createAsyncThunk(
  "unit/getListUnitLibrary",
  async (
    { page = 1, limit = 500, query, code, sort, extraParams } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
        ...extraParams,
      };
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      const { data } = await api.get(`${API_GET_LIST_UNITS_INDIVIDUAL_LIBRARY}`, { params });
      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);
// lấy danh sách người trong chính đơn vị của từng văn thư trong lịch họp 
export const getListUserUnitMeeting = createAsyncThunk(
  "unit/getListUserUnitMeeting",
  async (
    { page = 1, limit = 500, query, code, sort } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = {
        page,
        limit,
        sort,
      };
      // Thêm query cho từng trường trong mảng code
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query; // Tạo param riêng cho từng field
        });
      }
      if (query !== "" && code && sort) {
        const { data } = await api.get(`${API_ASSIGN_USER_BY_SECRETARY}`, { params });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      } else {
        const { data } = await api.get(`${API_ASSIGN_USER_BY_SECRETARY}`, {
          params: { page, limit, sort },
        });
        return {
          data: data?.data || [],
          total: data?.total || 0,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error.res?.data || error.message || "Lỗi khi lấy danh sách tỉnh thành"
      );
    }
  }
);

export const getListUsersByOrganizationUnit = createAsyncThunk(
  "unit/getListUsersByOrganizationUnit",
  async (id, { rejectWithValue }) => {
    try {
			const res = await api.get(`${API_GET_LIST_USER_BY_ORGANIZATION_UNIT}?organizationUnit=${id}`);
			logger.log('res-1', res)
      return res?.data?.data
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Lỗi khi lấy danh sách người dùng"
      );
    }
  }
);
export const getListUsersPost = createAsyncThunk(
  "unit/getListUsersPost",
  async (body = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.post(API_GET_LIST_USERS, body);
      return {
        data: data?.data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Lỗi khi lấy danh sách người dùng"
      );
    }
  }
);

export const fetchSearchUnit = createAsyncThunk(
  "unit/fetchSearchUnit",
  async ({ queryParams }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${API_GET_LIST_UNIT}/search?${queryParams}`
      );
      if (!response.ok) throw new Error("Không tìm thấy tài liệu!");
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getDataDetailUnit = createAsyncThunk(
  "unit/getDataDetailUnit",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_LIST_UNIT}/${id}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.res?.data || error.message);
    }
  }
);
export const getDataDetailUnitUpdate = createAsyncThunk(
  "unit/getDataDetailUnitUpdate",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_LIST_UNIT}/update/${id}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.res?.data || error.message);
    }
  }
);

export const getListTypeUnit = createAsyncThunk(
  "unit/getListTypeUnit",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_COMMON_SOURCE}/S001`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.res?.data || error.message);
    }
  }
);

export const getListPosition = createAsyncThunk(
  "unit/getListPosition",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_COMMON_SOURCE}/S002`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.res?.data || error.message);
    }
  }
);

export const getListUnit = createAsyncThunk(
  "unit/getListUnit",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`${API_GET_COMMON_SOURCE}/S002`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.res?.data || error.message);
    }
  }
);

export const getListRoles = createAsyncThunk(
  "unit/getLisRoles",
  async (_id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${API_GET_LIST_ROLES}`);
      return data.roles || [];
    } catch (error) {
      return rejectWithValue(error.res?.roles || error.message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  "user/delete",
  async ({ idUser, idUnit }, { rejectWithValue }) => {
    try {
      await api.delete(`${API_GET_LIST_USERS}/${idUser}/unit/${idUnit}`);
      return idUser;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);

//thêm mới đơn vị
export const addUnit = createAsyncThunk(
  "unit/add",
  async (dataUnit, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_GET_LIST_UNIT}`, dataUnit);
      return response.data; // Dữ liệu từ API
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.errors || "Lỗi khi thêm đơn vị!"
      );
    }
  }
);

//Cập nhật đơn vị
export const updateUnit = createAsyncThunk(
  "unit/update",
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `${API_GET_LIST_UNIT}/${id}`,
        updatedData
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error updating category");
    }
  }
);
//Xóa đơn vị
export const deleteUnit = createAsyncThunk(
  "unit/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`${API_GET_LIST_UNIT}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error deleting category");
    }
  }
);

// Lấy danh sách bình luận theo documentId
export const getCommentsByDocument = createAsyncThunk(
  "unit/getCommentsByDocument",
  async ({ documentId, type }, { rejectWithValue }) => {
    try {
      const params = type ? { type } : {};
      const { data } = await api.get(`${API_COMMENTS}/${documentId}/comments`, { params });
      return data?.data || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Lỗi khi lấy danh sách bình luận"
      );
    }
  }
);
// lấy danh sách bình luận theo documentId trong công việc chung
export const getCommentsByTask = createAsyncThunk(
  "unit/getCommentsByTask",
  async ({ documentId }, { rejectWithValue }) => {
    try {
      const params = {
        filter: {
          type: ["comment", "reply", "suggestion"],
        },
      };
      const { data } = await api.get(`${API_COMMON_WORK_COMMENTS}/${documentId}/comments`, { params });
      return data?.data || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Lỗi khi lấy danh sách bình luận"
      );
    }
  }
);
//lấy danh sách bình luận theo tài liệu cho lịch họp

export const getCommentsByMeeting = createAsyncThunk(
  "unit/getCommentsByMeeting",
  async ({ documentId, type }, { rejectWithValue }) => {
    try {
      const params = type ? { type } : {};
      const { data } = await api.get(`${API_COMMENT_MEETING}/${documentId}/comments`, { params });
      return data?.data || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Lỗi khi lấy danh sách bình luận"
      );
    }
  }
);

// Lấy danh sách nút bấm cho lịch họp
export const getMeetingActions = createAsyncThunk(
  "unit/getMeetingActions",
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await api.get(API_DISPLAY_BUTTON_CONFIG, { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Lỗi khi lấy danh sách nút bấm"
      );
    }
  }
);
// api like trong công việc chung
export const toggleCommentLike = createAsyncThunk(
  "unit/toggleCommentLike",
  async ({ commentId, taskId, isLiked }, { rejectWithValue }) => {
    try {
      const url = isLiked
        ? `${API_COMMON_WORK_COMMENTS}/${commentId}/like`  // unlike: không query
        : `${API_COMMON_WORK_COMMENTS}/${commentId}/like?type=like&taskId=${taskId}`;  // like

      const { data } = await api.put(url);
      // Trả về dữ liệu mới để cập nhật comment cụ thể
      return { commentId, length: data.length || 0, isLiked: !isLiked };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi thích/bỏ thích bình luận");
    }
  }
);

// api like trong lịch họp
export const toggleCommentLikeMeeting = createAsyncThunk(
  "unit/toggleCommentLikeMeeting",
  async ({ commentId, taskId, isLiked }, { rejectWithValue }) => {
    try {
      const url = isLiked
        ? `${API_COMMENT_MEETING}/${commentId}/like`  // unlike: không query
        : `${API_COMMENT_MEETING}/${commentId}/like?type=like&taskId=${taskId}`;  // like

      const { data } = await api.put(url);
      // Trả về dữ liệu mới để cập nhật comment cụ thể
      return { commentId, length: data.length || 0, isLiked: !isLiked };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Lỗi khi thích/bỏ thích bình luận");
    }
  }
);

// Thêm mới bình luận
export const addCommentToDocument = createAsyncThunk(
  "unit/addCommentToDocument",
  async ({ documentId, commentData, type }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `${API_COMMENTS}/${documentId}/comments`,
        escapeCommentPayload(commentData)
      );
      // Sau khi thêm thành công, gọi lại API để lấy danh sách bình luận mới nhất
      dispatch(getCommentsByDocument({ documentId, type }));
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi gửi bình luận"
      );
    }
  }
);
// thêm mới bình luận trong công việc chung
export const addCommentToJob = createAsyncThunk(
  "unit/addCommentToJob",
  async ({ documentId, commentData, type }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `${API_COMMON_WORK_COMMENTS}/${documentId}/comments`,
        escapeCommentPayload(commentData)
      );
      // Sau khi thêm thành công, gọi lại API để lấy danh sách bình luận mới nhất
      dispatch(getCommentsByTask({ documentId, type }));
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi gửi bình luận"
      );
    }
  }
);

// thêm mới bình luận trong lịch họp
export const addCommentToMeeting = createAsyncThunk(
  "unit/addCommentToMeeting",
  async ({ documentId, commentData, type }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `${API_COMMENT_MEETING}/${documentId}/comments`,
        escapeCommentPayload(commentData)
      );
      // Sau khi thêm thành công, gọi lại API để lấy danh sách bình luận mới nhất
      dispatch(getCommentsByMeeting({ documentId, type }));
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi gửi bình luận"
      );
    }
  }
);

// Cập nhật bình luận trong công việc chung
export const updateCommentInJob = createAsyncThunk(
  "unit/updateCommentInJob",
  async ({ documentId, commentId, content }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `${API_COMMON_WORK_COMMENTS}/${commentId}?id=${documentId}`,
        { content: escapeHtml(content) }
      );
      // Sau khi cập nhật thành công, gọi lại API để lấy danh sách bình luận mới nhất
      dispatch(getCommentsByTask({ documentId }));
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi cập nhật bình luận"
      );
    }
  }
);
// Cập nhật bình luận trong công việc chung
export const updateCommentInMeeting = createAsyncThunk(
  "unit/updateCommentInMeeting",
  async ({ documentId, commentId, content }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `${API_COMMENT_MEETING}/${commentId}?id=${documentId}`,
        { content: escapeHtml(content) }
      );
      // Sau khi cập nhật thành công, gọi lại API để lấy danh sách bình luận mới nhất
      dispatch(getCommentsByMeeting({ documentId }));
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi cập nhật bình luận"
      );
    }
  }
);

// Xóa bình luận trong công việc chung
export const deleteCommentInJob = createAsyncThunk(
  "unit/deleteCommentInJob",
  async ({ documentId, commentId }, { dispatch, rejectWithValue }) => {
    try {
      await api.delete(`${API_COMMON_WORK_COMMENTS}/${commentId}`);
      // Sau khi xóa thành công, gọi lại API để lấy danh sách bình luận mới nhất
      dispatch(getCommentsByTask({ documentId }));
      return commentId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi xóa bình luận"
      );
    }
  }
);
// Xóa bình luận trong lịch họp
export const deleteCommentInMeeting = createAsyncThunk(
  "unit/deleteCommentInMeeting",
  async ({ documentId, commentId }, { dispatch, rejectWithValue }) => {
    try {
      await api.delete(`${API_COMMENT_MEETING}/${commentId}`);
      // Sau khi xóa thành công, gọi lại API để lấy danh sách bình luận mới nhất
      dispatch(getCommentsByMeeting({ documentId }));
      return commentId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi xóa bình luận"
      );
    }
  }
);

// Trả lời bình luận trong công việc chung
export const replyToCommentInJob = createAsyncThunk(
  "unit/replyToCommentInJob",
  async (
    { documentId, commentId, replyData },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const { data } = await api.post(
        `${API_COMMON_WORK_COMMENTS}/${documentId}/comments/${commentId}/reply`,
        escapeCommentPayload(replyData)
      );
      // Sau khi trả lời thành công, gọi lại API để lấy danh sách bình luận mới nhất
      dispatch(getCommentsByTask({ documentId }));
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi trả lời bình luận"
      );
    }
  }
);
// Trả lời bình luận trong lịch họp
export const replyToCommentInMeeting = createAsyncThunk(
  "unit/replyToCommentInMeeting",
  async (
    { documentId, commentId, replyData },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const { data } = await api.post(
        `${API_COMMENT_MEETING}/${documentId}/comments/${commentId}/reply`,
        escapeCommentPayload(replyData)
      );
      // Sau khi trả lời thành công, gọi lại API để lấy danh sách bình luận mới nhất
      dispatch(getCommentsByMeeting({ documentId }));
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi trả lời bình luận"
      );
    }
  }
);

// Trả lời bình luận (comment con)
export const replyToCommentInDocument = createAsyncThunk(
  "unit/replyToCommentInDocument",
  async (
    {
      documentId,
      commentId, // id của comment gốc (cấp 1)
      parentId, // id của comment cha trực tiếp (cấp n-1)
      replyData, // { userId, userName, content }
      type, // "incoming" hoặc "outgoing"
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const { data } = await api.post(
        `${API_COMMENTS}/${documentId}/comments/${commentId}/reply`,
        {
          documentId,
          parentId, // chỉ rõ cha trực tiếp để backend gắn đúng vị trí
          ...escapeCommentPayload(replyData),
        }
      );
      dispatch(getCommentsByDocument({ documentId, type }));
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi gửi trả lời bình luận"
      );
    }
  }
);

// Lấy lịch sử xử lý văn bản
export const getDocumentHistory = createAsyncThunk(
  "unit/getDocumentHistory",
  async (documentId, { rejectWithValue }) => {
    try {
      const res = await api.get(
        `${API_DOCUMENT_HISTORY}?documentId=${documentId}`
      );
      // API trả về trực tiếp một mảng, không có thuộc tính 'items'
      return res.data || {};
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy lịch sử văn bản"
      );
    }
  }
);

export const getFullUsers = createAsyncThunk(
  "unit/getFullUsers",
  async ({ page, limit, query, code }, { rejectWithValue }) => {
    try {
      const params = {
        page,
        limit,
      };
      if (Array.isArray(code)) {
        code.forEach((field) => {
          params[field] = query;
        });
      }
      const res = await api.get(`${API_GET_LIST_USERS}/all`, { params });
      return res?.data?.data || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Lỗi khi lấy lịch sử văn bản"
      );
    }
  }
);

const managementUnitSlice = createSlice({
  name: "unit",
  initialState: {
    listUnit: [],
    listUserByUnit: [],
    listUserByOrganizationUnit: [],
    detailUnitByUser: null,
    detailUnit: null,
    searchDistrict: null,
    loading: false,
    error: null,
    listTypeUnit: [],
    listPosition: [],
    listRoles: [],
    listCrmSource: [],
    commentsList: [],
    meetingCommentsList: [],
		documentHistory: {},
		dataFullListUsers: [],
    availableActions: [],
    meetingFlowConfig: null,
    meetingWorkItem: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getDataListUnit.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataListUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listUnit = action.payload?.data;
      })
      .addCase(getDataListUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
       .addCase(getListUnitMeeting.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListUnitMeeting.fulfilled, (state, action) => {
        state.loading = false;
        state.listUnit = action.payload?.data;
      })
      .addCase(getListUnitMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

         .addCase(getListUnitLibrary.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListUnitLibrary.fulfilled, (state, action) => {
        state.loading = false;
        state.listUnit = action.payload?.data;
      })
      .addCase(getListUnitLibrary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
          .addCase(getListUserUnitMeeting.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListUserUnitMeeting.fulfilled, (state, action) => {
        state.loading = false;
        state.listUnit = action.payload?.data;
      })
      .addCase(getListUserUnitMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getDataListUserByUnit.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataListUserByUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listUserByUnit = action.payload?.data;
      })
      .addCase(getDataListUserByUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getListUsersByOrganizationUnit.pending, (state) => {
        state.loading = true;
      })
			.addCase(getListUsersByOrganizationUnit.fulfilled, (state, action) => {
				logger.log('action', action)
        state.loading = false;
        state.listUserByOrganizationUnit = action.payload;
      })
      .addCase(getListUsersByOrganizationUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Xử lý tìm kiếm quận, huyện, thị xã
      .addCase(fetchSearchUnit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSearchUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listUnit = action.payload;
      })
      .addCase(fetchSearchUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      //Xử lý xem chi tiết quận, huyện, thị xã
      .addCase(getDataDetailUnit.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataDetailUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.detailUnitByUser = action.payload.data;
      })
      .addCase(getDataDetailUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getDataDetailUnitUpdate.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDataDetailUnitUpdate.fulfilled, (state, action) => {
        state.loading = false;
        state.detailUnit = action.payload.data;
      })
      .addCase(getDataDetailUnitUpdate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      //get danh sach loai don vi
      .addCase(getListTypeUnit.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListTypeUnit.fulfilled, (state, action) => {
        state.loading = false;
        state.listTypeUnit = action.payload.data;
      })
      .addCase(getListTypeUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      //get danh sach chức vụ
      .addCase(getListPosition.pending, (state) => {
        state.loading = true;
      })
      .addCase(getListPosition.fulfilled, (state, action) => {
        state.loading = false;
        state.listPosition = action.payload.data;
      })
      .addCase(getListPosition.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      //thêm mới đơn vị
      .addCase(addUnit.pending, (state) => {
        state.loading = true;
      })
      .addCase(addUnit.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addUnit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Xử lý Update
      // Xử lý Update
      .addCase(updateUnit.fulfilled, (state, action) => {
        const index = state.listUnit.findIndex(
          (cat) => cat._id === action.payload._id
        );
        if (index !== -1) {
          state.listUnit[index] = action.payload;
        }
        state.detailUnit = action.payload;
        state.detailUnitByUser = action.payload;
      })

      // Xử lý Delete
      .addCase(deleteUnit.fulfilled, (state, action) => {
        state.listUnit = state.listUnit.filter(
          (cat) => cat._id !== action.payload
        );
      })

      //xóa
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.listUserByUnit = state.listUserByUnit.filter(
          (cat) => cat._id !== action.payload
        );
      })

      //Lấy danh sách quyền
      .addCase(getListRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getListRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.listRoles = action.payload;
      })
      .addCase(getListRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      // Lấy danh sách bình luận
      .addCase(getCommentsByDocument.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCommentsByDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.commentsList = Array.isArray(action.payload)
          ? action.payload
          : [];
      })
      .addCase(getCommentsByDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
        // Lấy danh sách bình luận công việc chung
      .addCase(getCommentsByTask.pending, (state) => {
        state.loading = true;
      })
      // .addCase(getCommentsByTask.fulfilled, (state, action) => {
      //   state.loading = false;
      //   state.commentsList = Array.isArray(action.payload)
      //     ? action.payload
      //     : [];
      // })
           .addCase(getCommentsByTask.fulfilled, (state, action) => {
  state.loading = false;
  // const currentUser  = JSON.parse(localStorage.getItem("userData") || "{}")?.user?._id || "";
  const currentUser =
          JSON.parse(localStorage.getItem("userData") || "{}")?.user || {};
        const currentUserName = currentUser.name || "";


  // const processedComments = (action.payload || []).map(cmt => ({
  //   ...cmt,
  //   likeCount: cmt.likeNumber !== undefined ? cmt.likeNumber : (cmt.likes?.length || 0),
  //   userLiked: cmt.status !== undefined ? cmt.status === 1 : (cmt.likes?.some(userId => userId === currentUserId) || false),
  // }));
          const processedComments = (action.payload || []).map((cmt) => {
          let likes = [];
          if (typeof cmt.likeUsers === "string") {
            try {
              const parsedLikes = JSON.parse(cmt.likeUsers);
              if (Array.isArray(parsedLikes)) {
                likes = parsedLikes;
              }
            } catch (e) {
              // console.error("Failed to parse likeUsers", e);
            }
          }
          return { ...cmt, likes: likes, likeCount: cmt.likeNumber !== undefined ? cmt.likeNumber : likes.length, userLiked: cmt.status !== undefined ? cmt.status === 1 : likes.includes(currentUserName) };
        });


  state.commentsList = Array.isArray(processedComments) ? processedComments : [];
})
      .addCase(getCommentsByTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
 // Lấy danh sách bình luận lịch họp
      .addCase(getCommentsByMeeting.pending, (state) => {
        state.loading = true;
      })
      // .addCase(getCommentsByTask.fulfilled, (state, action) => {
      //   state.loading = false;
      //   state.commentsList = Array.isArray(action.payload)
      //     ? action.payload
      //     : [];
      // })
           .addCase(getCommentsByMeeting.fulfilled, (state, action) => {
  state.loading = false;
  // const currentUser  = JSON.parse(localStorage.getItem("userData") || "{}")?.user?._id || "";
  const currentUser =
          JSON.parse(localStorage.getItem("userData") || "{}")?.user || {};
        const currentUserName = currentUser.name || "";


  // const processedComments = (action.payload || []).map(cmt => ({
  //   ...cmt,
  //   likeCount: cmt.likeNumber !== undefined ? cmt.likeNumber : (cmt.likes?.length || 0),
  //   userLiked: cmt.status !== undefined ? cmt.status === 1 : (cmt.likes?.some(userId => userId === currentUserId) || false),
  // }));
          const processedComments = (action.payload || []).map((cmt) => {
          let likes = [];
          if (typeof cmt.likeUsers === "string") {
            try {
              const parsedLikes = JSON.parse(cmt.likeUsers);
              if (Array.isArray(parsedLikes)) {
                likes = parsedLikes;
              }
            } catch (e) {
              // console.error("Failed to parse likeUsers", e);
            }
          }
          return { ...cmt, likes: likes, likeCount: cmt.likeNumber !== undefined ? cmt.likeNumber : likes.length, userLiked: cmt.status !== undefined ? cmt.status === 1 : likes.includes(currentUserName) };
        });


  state.meetingCommentsList = Array.isArray(processedComments) ? processedComments : [];
})
      .addCase(getCommentsByMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Thêm mới bình luận
      .addCase(addCommentToDocument.pending, (state) => {
        state.loading = true; // Có thể thêm loading riêng cho comment
      })
      .addCase(addCommentToDocument.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addCommentToDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(toggleCommentLike.fulfilled, (state, action) => {
  const { commentId, length, isLiked } = action.payload;
  const updateComment = (comments) => {
    return comments.map(cmt => {
      if ((cmt.id || cmt._id) === commentId) {
        return { ...cmt, likeCount: length, userLiked: isLiked };
      }
      if (cmt.children?.length) {
        return { ...cmt, children: updateComment(cmt.children) };
      }
      return cmt;
    });
  };
  state.commentsList = updateComment(state.commentsList);
})
// api like bình luận lịch họp
  .addCase(toggleCommentLikeMeeting.fulfilled, (state, action) => {
  const { commentId, length, isLiked } = action.payload;
  const updateComment = (comments) => {
    return comments.map(cmt => {
      if ((cmt.id || cmt._id) === commentId) {
        return { ...cmt, likeCount: length, userLiked: isLiked };
      }
      if (cmt.children?.length) {
        return { ...cmt, children: updateComment(cmt.children) };
      }
      return cmt;
    });
  };
  state.meetingCommentsList = updateComment(state.meetingCommentsList);
})
      //` thêm mới bình luận trong công việc chung  
       .addCase(addCommentToJob.pending, (state) => {
        state.loading = true; // Có thể thêm loading riêng cho comment
      })
      .addCase(addCommentToJob.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addCommentToJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
         //` thêm mới bình luận trong lịch họp 
       .addCase(addCommentToMeeting.pending, (state) => {
        state.loading = true; // Có thể thêm loading riêng cho comment
      })
      .addCase(addCommentToMeeting.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addCommentToMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Cập nhật bình luận trong công việc chung
      .addCase(updateCommentInJob.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCommentInJob.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateCommentInJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

       // Cập nhật bình luận trong lịch họp
      .addCase(updateCommentInMeeting.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCommentInMeeting.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateCommentInMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Xóa bình luận trong công việc chung
      .addCase(deleteCommentInJob.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteCommentInJob.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteCommentInJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

         // Xóa bình luận trong lịch họp
      .addCase(deleteCommentInMeeting.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteCommentInMeeting.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteCommentInMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Trả lời bình luận trong công việc chung
      .addCase(replyToCommentInJob.pending, (state) => {
        state.loading = true;
      })
      .addCase(replyToCommentInJob.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(replyToCommentInJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

        // Trả lời bình luận trong lịch họp
      .addCase(replyToCommentInMeeting.pending, (state) => {
        state.loading = true;
      })
      .addCase(replyToCommentInMeeting.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(replyToCommentInMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Thêm mới phần trả lời
      .addCase(replyToCommentInDocument.pending, (state) => {
        state.loading = true;
      })
      .addCase(replyToCommentInDocument.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(replyToCommentInDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Lấy lịch sử văn bản
      .addCase(getDocumentHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDocumentHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.documentHistory = action?.payload || {}
      })
      .addCase(getDocumentHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
			})
			
      .addCase(getFullUsers.pending, (state) => {
        state.loading = true;
      })
			.addCase(getFullUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.dataFullListUsers = action.payload?.data
      })
      .addCase(getFullUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getMeetingActions.pending, (state) => {
        state.loading = true;
      })
      .addCase(getMeetingActions.fulfilled, (state, action) => {
        state.loading = false;
        state.availableActions = action.payload?.availableActions || [];
        state.meetingFlowConfig = action.payload?.flowConfig.id || null;
        state.meetingWorkItem = action.payload?.workItem || null;
      })
      .addCase(getMeetingActions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default managementUnitSlice.reducer;
