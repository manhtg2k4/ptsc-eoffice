export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  NEWS_DETAIL_PREFIX: "/news/",
  TOPIC_PREFIX: "/topic/",
  TIN_TUC: "/tin-tuc",
  SEARCH: "/search",
  VIDEO: "/video",
  VIDEO_DETAIL_PREFIX: "/video/",
  ALBUM: "/album",
  ALBUM_DETAIL_PREFIX: "/album/",
  CALENDAR: "/calendar",
  newsDetail: (id) => `/news/${id}`,
  videoDetail: (id) => `/video/${id}`,
  albumDetail: (id) => `/album/${id}`,
  search: (q) => `/search?q=${encodeURIComponent(q)}`
};
