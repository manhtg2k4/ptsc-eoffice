

/* eslint-disable */
export const APP_BASE = APP_BASE_URL; //Server Cty
export const APP_CHAT = APP_CHAT_URL;
// export const APP_BASE = "http://localhost:3156"; //Server của Thắng
// export const APP_FILE = APP_BASE_FILE;
// export const APP_CAMUNDA = APP_BASE_CAMUNDA;
// export const APP_URL = APP_BASE_295;
// export const APIM = APP_BASE_APIM;
export const DHVB = `${APP_BASE}/api`;

// api người dùng, phongf ban
export const API_USER = `${DHVB}/users/inflow`;
export const API_ORAGANI_UNIT = `${DHVB}/users/organization-units-byFlow`;
export const API_USER_RETRUN = `${DHVB}/users/return-user`;
// api chuyển xly

export const API_PROCCESS_DOCUMENT = `${DHVB}/work-items`

// api cấu hình giao diện
export const API_THEME_CONFIG = `${DHVB}/v1/theme-config`;

//api danh sách sổ
export const API_BOOK_LIST = `${DHVB}/book-documents/listv2`;


//api xin ý kiến

export const API_GIVE_FEEDBACK = `${DHVB}/outgoing-documents/request-feedback`

 
// api Lưu sổ
export const API_SAVE_BOOK = `${DHVB}/documents/assign-book`;


export const API_COMMENTS = `${DHVB}/documents`;


// api các vb chưa xlys ở thoogn kê 

export const API_DASHBOARD_STATISTICAL = `${DHVB}/documents/count`