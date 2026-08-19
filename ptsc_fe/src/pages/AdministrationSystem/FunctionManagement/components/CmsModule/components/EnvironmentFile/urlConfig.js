import { APP_BASE as FE_APP_BASE, APP_SOCKET_URL_BASE } from "@EnvironmentFile/constants/urlConfig";
import {
  getProxyPath as getSharedProxyPath,
  getSocket as getSharedSocket,
  getSocketPath as getSharedSocketPath,
} from "@utils/socket/socketClient";

export const APP_BASE = window.appConfig?.APP_BASE || FE_APP_BASE || "https://administrator.lifetex.vn:316";

export const getProxyPath = (base) => getSharedProxyPath(base);

export const getSocketPath = (base) => getSharedSocketPath(base);

export const SOCKET_PATH = getSocketPath(APP_SOCKET_URL_BASE || APP_BASE);

export const getSocket = (namespace = "", extraOptions = {}) =>
  getSharedSocket(namespace, {
    baseUrl: APP_SOCKET_URL_BASE || APP_BASE,
    logLabel: namespace || "cms",
    ...extraOptions,
  });

export const API_PAGE = `${APP_BASE}/api/pages`;
export const API_ME = `${APP_BASE}/api/auth/me`;
export const API_AUTH_ME = `${APP_BASE}/api/auth-keycloak/me`;
export const API_LOGOUT_KEYCLOAK = `${APP_BASE}/api/auth-keycloak/logout`;
export const API_TOPPICS = `${APP_BASE}/api/topic`;
export const API_PUBLISHED = `${APP_BASE}/api/news/public`;
export const API_FILES_VIEW = `${APP_BASE}/api/files/view`;
export const API_BANNER = `${APP_BASE}/api/banner`;
export const API_VIEW_IMAGE = `${APP_BASE}/api/files/view`;
export const API_COMMENT = `${APP_BASE}/api/news`;
export const API_LIKE_COMMENT = `${APP_BASE}/api/news/like`;
export const API_LIST_VIDEO = `${APP_BASE}/api/videos`;
export const API_LIST_ALBUM = `${APP_BASE}/api/album-images`;
export const API_ROLE_DETAIL = `${APP_BASE}/api/users/role-detail`;
export const API_EDIT_COMMENT = `${APP_BASE}/api/news/comment`;
export const API_LIKE_ALBUM = `${APP_BASE}/api/album-images/like-album`;
export const API_LIKE_VIDEO = `${APP_BASE}/api/Videos/like-video`;
export const API_USER_ROLE = `${APP_BASE}/api/news/workflow/user-role`;

export const CODE_PERMISSION = window.appConfig?.CODE || "";
export const ACCEPT = window.appConfig?.ACCEPT || "";

export const API_VIEW_NEWS = `${APP_BASE}/api/news/public/postviewnews`;
export const API_DON_VI = `${APP_BASE}/api/organization-units`;
export const API_EVENT_CALENDAR = `${APP_BASE}/api/news-calendar`;
export const API_UPLOAD_FILE = `${APP_BASE}/api/files/upload`;
export const API_USER = `${APP_BASE}/api/users`;
export const API_GROUP_USER = `${APP_BASE}/api/group-users`;
export const API_MEDIA_GALERY = `${APP_BASE}/api/media-galery`;
export const API_SEARCH_ALL = `${APP_BASE}/api/portal-search`;
export const CHANGE_DIRECTION = window.appConfig?.CHANGE_DIRECTION || "";
export const API_COMMENTS = `${APP_BASE}/api/comments`;
