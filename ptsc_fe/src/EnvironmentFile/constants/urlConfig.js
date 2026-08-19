/* eslint-disable */
export const APP_BASE = APP_BASE_URL; //Server Cty
// export const APP_FILE = APP_BASE_FILE;
export const APP_BASE_SIGN_USB_TOKEN = APP_BASE_URL_SIGN_USB_TOKEN
// export const CHANGE_DIRECTION_URL = DIRECTION_NEWS
// export const APP_CAMUNDA = APP_BASE_CAMUNDA;
// export const APP_SIGN_DIGITAL = APP_BASE_SIGN_DIGITAL;
export const CHECK_ROLE = ROLE_ADMIN;
// export const APP_URL = APP_BASE_295;
// export const APIM = APP_BASE_APIM;
export const APP_DHVB_BASE = `${APP_BASE}/api`;
// export const APP_SOCKET_URL = APP_WEB_SOCKET_URL
export const APP_SOCKET_URL_BASE = APP_WEB_SOCKET_BASE_URL
// export const URL_DOWLOAD_EDIT_WORD = URL_DOWLOAD_TOOL_EDIT_WORD
// export const URL_DOWLOAD_EDIT_WORD_MAC = URL_DOWLOAD_TOOL_EDIT_WORD_MAC
export const API_EXPORT_TEMPLATE_URL = `${APP_BASE}/api/replace-hashkey-in-doc-url`;
export const API_EXPORT_TEMPLATE_URL_EXCEL = `${APP_BASE}/api/replace-text-in-excel`;
export const API_EXPORT_TEMPLATE_URL_WORD = `${APP_BASE}/api/replace-text-in-word`;
export const API_EXPORT_BODY = `${APP_BASE}/api/documents/export-body`;
// export const API_EXPORT_TEMPLATE_URL = `https://administrator.lifetex.vn:295/replace-hashkey-in-doc-url`;
export const API_LOGIN = `${APP_BASE}/api/auth/login`;
export const API_LOGOUT = `${APP_BASE}/api/auth/logout`;
export const API_BASIC = `${APP_BASE}/api/auth-sso/logout`;

export const API_ME = `${APP_BASE}/api/auth/me`;
export const API_SSO_VALIDATE = `${APP_BASE}/api/passwordvalidate`;

//  api file
export const API_DOC_TO_PDF = `${APP_BASE}/api/file-to-pdf`;
export const API_XLSX_TO_PDF = `${APP_BASE}/api/documents/excel-to-pdf-v2`;
export const API_AUDIT_LOGS = `https://administrator.lifetex.vn:5002/api/logs`;
export const APP_LOG = "https://administrator.lifetex.vn:5002";

// API dữ liệu
export const API_DOCUMENT_TYPE = `${APP_BASE}/api/document-type`;
export const API_TYPE_RESOLUTION_RESULT = `${APP_BASE}/api/administrative-procedure-result-category`;
export const API_TEMPLATE_CATEGORY = `${APP_BASE}/api/fonds-catalog`;
export const API_PROCEDURAL_FIELD = `${APP_BASE}/api/administrative-procedure-field-category`;
export const API_TYPE_PAPERWORK = `${APP_BASE}/api/administrative-procedure-document-category`;
export const API_ADMINISTRATIVE_PROCEDURES = `${APP_BASE}/api/administrative-procedure-category`;
export const API_PROFILE_MANAGEMENT = `${APP_BASE}/api/profile-management`;
export const API_DOCUMENT_MANAGEMENT = `${APP_BASE}/api/document-management`;
export const API_DOCUMENT_MANAGEMENT_NO_SIGN = `${APP_BASE}/api/document-management-no-sign`;

export const API_GET_PROVINCES_OR_CITIES = `${APP_BASE}/api/city-category`;
export const API_DETAIL_PROVINCES = `${APP_BASE}/api/city-category/detail-city`;
export const API_GET_LIST_DISTRICT = `${APP_BASE}/api/district-category`;
export const API_DETAIL_DISTRICT = `${APP_BASE}/api/district-category/detail-district`;
export const API_GET_LIST_COMMUNE = `${APP_BASE}/api/commune-categorie`;
export const API_DETAIL_COMMUNE = `${APP_BASE}/api/commune-categorie/detail-commune`;

export const API_URL_CREATE_DELIVERY = `${APP_BASE}/api/document-duplication-method`;
export const API_LIST_DELIVERY = `${APP_BASE}/api/document-duplication-method`;
export const API_EDIT_DELIVERY = `${APP_BASE}/api/document-duplication-method`;
export const API_DELETE_DELIVERY = `${APP_BASE}/api/document-duplication-method`;
export const API_GET_DELIVERY = `${APP_BASE}/api/document-duplication-method`;
export const API_FILTER_DELIVERY = `${APP_BASE}/api/document-duplication-method`;
export const API_DELETE_LIST_DELIVERY = `${APP_BASE}/api/document-duplication-method/delete-multiple`;

export const API_GET_LIST_UNIT = `${APP_BASE}/api/organization-units`;
export const API_GET_CHILD_ORGANIZATIONS = `${APP_BASE}/api/organization-units/children`;
export const API_GET_TREE_ORGANIZATIONS = `${APP_BASE}/api/organization-units/tree`;

export const API_GET_LIST_MENU = `${APP_BASE}/api/menu-manager`;

export const API_GET_LIST_USERS = `${APP_BASE}/api/users`;

export const API_GET_GROUP_USERS = `${APP_BASE}/api/group-users`;
export const API_GET_ROLES = `${APP_BASE}/api/list-role`;

export const API_GET_COMMON_SOURCE = `${APP_BASE}/api/common-source`;

export const API_GET_LIST_API = `${APP_BASE}/api/api-config`;
export const API_CREATE_API = `${APP_BASE}/api/api-config`;

export const API_DELETE_PARAMETER_SYSTEM_MANAGERMANT = `${APP_BASE}/api/parameter-system-management`;

export const API_BUSINESS_INFO = `${APP_BASE}/api/info-enterprise`;
export const API_CITIZEN_INFO = `${APP_BASE}/api/info-citizen`;
export const API_PROVIDER_MANAGEMENT = `${APP_BASE}/api/collection-management`;
export const API_LIST_DOCUMENT_VALIDATION = `${APP_BASE}/api/document-validations`;
export const API_LIST_DOCUMENT_VALIDATION_ALL = `${APP_BASE}/api/document-validations/all`;

export const API_INTEGRATION_MANAGEMENT = `${APP_BASE}/api/integration-management`;

export const API_UPDATE_PARAMETER_SYSTEM_MANAGERMANT = `${APP_BASE}/api/parameter-system-management`;
export const API_CREATE_PARAMETER_SYSTEM_MANAGERMANT = `${APP_BASE}/api/parameter-system-management`;
export const API_GET_LIST_PARAMETER_SYSTEM_MANAGERMANT = `${APP_BASE}/api/parameter-system-management`;
export const API_PARAMETER_SYSTEM_MANAGERMANT_BY_ID = `${APP_BASE}/api/parameter-system-management`;

export const API_DELETE_FUNCTIONMANAGEMANT = `${APP_BASE}/api/feature-management`;
export const API_UPDATE_FUNCTIONMANAGEMANT = `${APP_BASE}/api/feature-management`;
export const API_CREATE_FUNCTIONMANAGEMANT = `${APP_BASE}/api/feature-management`;
export const API_GET_LIST_FUNCTIONMANAGEMANT = `${APP_BASE}/api/feature-management`;
export const FUNCTIONMANAGEMANT = `${APP_BASE}/api/feature-management`;

export const API_FUNCTIONMANAGEMANT_BY_ID = `${APP_BASE}/api/feature-management`;
export const API_FUNCTIONMANAGEMANT_PARENTID = `${APP_BASE}/api/feature-management/listParent`;

// export const API_BUSINESS_INFO = `${APP_BASE}/api/info-enterprise`;
// export const API_CITIZEN_INFO = `${APP_BASE}/api/info-citizen`;
export const API_GET_LIST_DOCUMENT_TYPE_GROUP = `${APP_BASE}/api/document-category-group`;
export const API_GET_LIST_DOC_PRESERVE = `${APP_BASE}/api/document-category`;
export const API_GET_LIST_DOC_TYPE_GROUP_SELECT = `${APP_BASE}/api/document-category-group/select`;

export const API_GET_LIST_DOC_INPUT_STANDARDS_SELECT_STANDARD_TYPE = `${APP_BASE}/api/common-source/SDD004`;
export const API_GET_LIST_DOC_INPUT_STANDARDS_SELECT_DOC_TYPE = `${APP_BASE}/api/common-source/SDD001`;
export const API_GET_LIST_DOC_INPUT_STANDARDS_SELECT_STATUS_TYPE = `${APP_BASE}/api/common-source/SDD002`;
export const API_GET_LIST_DOC_INPUT_STANDARDS = `${APP_BASE}/api/doc-input-standard-manager`;

export const API_GET_LIST_AUTHENTICATION_HISTORY_MANAGER_BY_DOANH_NGHIEP = `${APP_BASE}/api/authentication-history?entityType=DOANH_NGHIEP`;
export const API_GET_LIST_AUTHENTICATION_HISTORY_MANAGER_BY_DOANH_NGHIEP_ID = `${APP_BASE}/api/authentication-history`;
export const API_DELETE_AUTHENTICATION_HISTORY_MANAGER_BY_DOANH_NGHIEP = `${APP_BASE}/api/authentication-history`;
export const API_UPDATE_AUTHENTICATION_HISTORY_MANAGER_BY_DOANH_NGHIEP = `${APP_BASE}/api/authentication-history`;
export const API_CREATE_AUTHENTICATION_HISTORY_MANAGER_BY_DOANH_NGHIEP = `${APP_BASE}/api/authentication-history`;

export const API_GET_LIST_AUTHENTICATION_HISTORY_MANAGER_BY_CONG_DAN = `${APP_BASE}/api/authentication-history?entityType=CONG_DAN`;
export const API_GET_LIST_AUTHENTICATION_HISTORY_MANAGER_BY_CONG_DAN_ID = `${APP_BASE}/api/authentication-history`;
export const API_DELETE_LIST_AUTHENTICATION_HISTORY_MANAGER_BY_CONG_DAN_ID = `${APP_BASE}/api/authentication-history/delete-many`;
export const API_DELETE_AUTHENTICATION_HISTORY_MANAGER_BY_CONG_DAN = `${APP_BASE}/api/authentication-history`;
export const API_UPDATE_AUTHENTICATION_HISTORY_MANAGER_BY_CONG_DAN = `${APP_BASE}/api/authentication-history`;
export const API_CREATE_AUTHENTICATION_HISTORY_MANAGER_BY_CONG_DAN = `${APP_BASE}/api/authentication-history`;
export const API_GET_LIST_DOC_TYPE_DYNAMIC_METADATA = `${APP_BASE}/api/dynamic-metadata`;
export const API_GET_LIST_COMMON_SOURCE = `${APP_BASE}/api/common-source/SDLD001`;
export const API_GET_LIST_META_DATA_TYPE_SELECT = `${APP_BASE}/api/common-categories/findByCode/LSDLD`;

export const API_PHYSICAL_INVENTORY = `${APP_BASE}/api/warehouse`;
export const API_GET_LIST_WAREHOUSE_ROOM = `${APP_BASE}/api/room-in-warehouse`;

// export const API_GET_LIST_WAREHOUSE = `${APP_BASE}/api/warehouse`;

export const API_GET_LIST_WAREHOUSE_SELECT = `${APP_BASE}/api/organization-units`;

export const API_GET_LIST_SELECT_DOC_TYPE_DYNAMIC_METADATA = `${APP_BASE}/api/common-source/SDLD001`;
export const API_DELETE_DOC_TYPE_DYNAMIC_METADATA = `${APP_BASE}/api/dynamic-metadata/delete-multiple`;
export const API_EXPLOITATION_UNIT = `${APP_BASE}/api/exploitation-unit`;
export const API_UPLOAD_FILE = `${APP_BASE}/api/file/upload`;
export const API_UPLOAD_FILESS = `${APP_BASE}/api/files/upload`;
export const API_GETDETAIL_FILE = `${APP_BASE}/api/file`;
export const API_GET_FILE = `${APP_BASE}/api/file/download`;

export const API_LIST_GENERALCATEGORIES = `${APP_BASE}/api/common-categories`;

export const API_DOCUMENT_TRANSFERS = `${APP_BASE}/api/document-transfers`;
export const API_COMMON_SOURCE = `${APP_BASE}/api/common-source/F001`;
export const API_DOCUMENT_TRANSFERS_GENERATE = `${APP_BASE}/api/document-transfers/generate`;
export const API_SHELF_MANAGEMENT = `${APP_BASE}/api/shelf-management/by-code`;

//Api phần Siêu dữ liệu động của Loại hình tài liệu
export const API_GET_LIST_DYNAMIC_METADATA_OF_DOCTYPE = `${APP_BASE}/api/dynamic-metadata/document-type`;
export const API_SELECT_DOCTYPE = `${APP_BASE}/api/common-source/SDLD001`;
export const API_GET_SELECT_DOCTYPE = `${APP_BASE}/api/common-categories/findByCode/LTL001`;
export const API_GET_SELECT_DOCTYPES = `${APP_BASE}/api/common-categories/findByCode/THBQ001`;

//Api phần Quản lý Giá/kệ
export const API_GET_SHELF_MANAGEMENT = `${APP_BASE}/api/shelf-management`;

// api Cơ quan chứng thực ( Quản lý lịch sử chứng thực )

export const API_CERTIFICATION_AGENCY = `${APP_BASE}/api/common-categories/findByCode`;

export const API_GET_BOX_MANAGEMENT = `${APP_BASE}/api/box-management`;
export const API_GET_BOX_MANAGEMENT_MOVE_PROFILE = `${APP_BASE}/api/box-management/move-profiles`;
export const API_POST_BOX_IN_SHELF = `${APP_BASE}/api/box-management/assign`;
// export const API_GET_FILE_IN_BOX_IS_NULL = `${APP_BASE}/api/profile-management?box=null`;
export const API_GET_FILE_IN_BOX_IS_NULL = `${APP_BASE}/api/profile-management/list-by-query?box=null`;

// api Quản lý lịch sử thu thập hồ sơ Công dân
export const API_GET_LIST_COLLECTION_HISTORY_CONG_DAN = `${APP_BASE}/api/profile-histories?entityType=CONG_DAN`;
// api Quản lý lịch sử thu thập hồ sơ Doanh nghiệp
export const API_GET_LIST_COLLECTION_HISTORY_DOANH_NGHIEP = `${APP_BASE}/api/profile-histories?entityType=DOANH_NGHIEP`;
// api Xem chi tiết quản lý lịch sử thu thập hồ sơ Doanh nghiệp || Công dân
export const API_GET_LIST_COLLECTION_HISTORY_ID = `${APP_BASE}/api/profile-histories`;

// api Quản lý lịch sử sao y tài liệu
export const API_GET_DOCUMENT_COPY_HISTORY = `${APP_BASE}/api/history-copy-document`;
export const API_GET_DETAIL_DOCUMENT_COPY_HISTORY = `${APP_BASE}/api/history-copy-document`;
export const API_POST_DOCUMENT_COPY_HISTORY = `${APP_BASE}/api/history-copy-document`;
export const API_PUT_DOCUMENT_COPY_HISTORY = `${APP_BASE}/api/history-copy-document`;
export const API_DELETE_DOCUMENT_COPY_HISTORY = `${APP_BASE}/api/history-copy-document`;

// api Quản lý kết quả giải quyết TTHC Công dân
export const API_GET_LIST_RESOLUTION_RESULTS_CONGDAN = `${APP_BASE}/api/settlement-results?type=citizen`;
// api Quản lý kết quả giải quyết TTHC Doanh nghiệp
export const API_GET_LIST_RESOLUTION_RESULTS_DOANHNGHIEP = `${APP_BASE}/api/settlement-results?type=enterprise`;
// api Xem chi tiết quản lý kết quả giải quyết TTHC Doanh nghiệp || Công dân
export const API_GET_LIST_RESOLUTION_RESULTS_ID = `${APP_BASE}/api/settlement-results`;
export const API_GET_LIST_RESOLUTION_RESULTS_TYPEPROCEDURE = `${APP_BASE}/api/settlement-results/typeProcedure`;
//Api Quản lý sổ đăng ký kho
export const API_GET_LIST_WAREHOUSE_IN_AND_OUT_REGISTER = `${APP_BASE}/api/register-in-out-warehouse`;
export const API_GET_SELECT_POSITION = `${APP_BASE}/api/common-categories/findByCode/CV001`;
export const API_UPLOAD_FILE_MULTIPLE = `${APP_BASE}/api/file/upload-multiple`;
export const API_DELETE_REGISTER_FILE = `${APP_BASE}/api/register-in-out-warehouse/delete`;
export const API_AUTO_GEN_CODE_WAREHOUSE = `${APP_BASE}/api/register-in-out-warehouse/generate-code`;

//Api sổ theo dõi nhiệt độ, độ ẩm
export const API_ENVIROMONITOR = `${APP_BASE}/api/temperature-humidity-tracking`;
export const API_SELECT_MEASURING_EQUIPMENT = `${APP_BASE}/api/common-categories/findByCode/TBD001`;
export const API_AUTO_GEN_CODE_ENVIROMONITOR = `${APP_BASE}/api/temperature-humidity-tracking/create-code`;
export const API_STATISTICS_BY_DAY = `${APP_BASE}/api/temperature-humidity-tracking/statistics`;
export const API_DOCUMENT_REUSE = `${APP_BASE}/api/document-reuse`;

// api Bao cáo hồ sơ lưu trữ
export const API_GET_ARCHIVE_REPORT = `${APP_BASE}/api/report-management/report-profile`;
export const API_GET_REPORT_PROFILE_CANCEL = `${APP_BASE}/api/report-management/report-profile-cancel`;

// api Báo cáo dữ liệu khai thác, chia sẻ KQGQ TTHC
export const API_DATA_REPORT_AND_SHARE = `${APP_BASE}/api/report-management/shared-procedure-results-reports`;
export const API_DATA_REPORT_AND_SHARES = `${APP_BASE}/api/report-management/exploitation-history-report`;

export const API_DATA_REPORT = `${APP_BASE}/api/report-management/exploitation-history-report`;

// api Báo cáo DL khai thác, chia sẻ giấy tờ TSD của CD - DN
export const API_REPORT_DATA_AND_SHARE_DOCUMENTS_CITIZENS = `${APP_BASE}/api/report-management/shared-reused-report-document?type=citizen`;
export const API_REPORT_DATA_AND_SHARE_DOCUMENTS_BUSINESS = `${APP_BASE}/api/report-management/shared-reused-report-document?type=enterprise`;

// api Báo cáo giấy tờ TSD của CD - DN
export const API_GET_RECYCLING_REPORT_CONG_DAN = `${APP_BASE}/api/report-management/report-document-reuse?tab=citizen`;
export const API_GET_RECYCLING_REPORT_DOANH_NGHIEP = `${APP_BASE}/api/report-management/report-document-reuse?tab=enterprise`;

// api Bieu mau dong
export const API_GET_FORMDESIGN = `${APP_BASE}/api/data-entry-form`;
export const API_GET_DOCUMENT_CATEGOEY = `${APP_BASE}/api/document-category`;
export const API_GET_EXPLOITATION_UNIT = `${APP_BASE}/api/exploitation-unit`;
export const API_DELETE_FORMDESIGN = `${APP_BASE}/api/data-entry-form/delete-multiple`;
export const API_CREATE_UPDATE_FORMDESIGN = `${APP_BASE}/api/data-entry-form`;
//Api tra cứu vị trí hồ sơ
export const API_DOCUMENT_LOCATION_LOOKUP = `${APP_BASE}/api/shelf-management/find-position-profile`;
// api roles
export const API_GET_LIST_ROLES = `${APP_BASE}/api/roles?code=UNIT_ADMIN`;
// api rolesGroup
export const API_GET_LIST_ROLES_GROUP = `${APP_BASE}/api/roles?code=ADMIN`;

//Thêm mới field ở BPMN
export const API_ADD_FIELD_BPMN = `${APP_BASE}/api/bpmn-designs`;
export const API_BPMN = `${APP_BASE}/api/bpmn-designs`;

export const API_GET_VIEW_CONFIG = `${APP_BASE}/api/configuration`;
export const API_DELETE_CONFIG = `${APP_BASE}/api/configuration/remove-by-code`;

export const API_DESIGN_FORM = `${APP_BASE}/api/configuration`;
//Thêm mới form
export const API_SIDE_BAR_MENU = `${APP_BASE}/api/menu-manager/list-menu`;
export const API_SIDE_BAR_MENU_COUNT = `${APP_BASE}/api/menu-manager/menu-count`;
export const taskFeature = `${APP_BASE}/api/task-feature`;
export const DATA_TABLE_BPMN = `${APP_BASE}/api/documents/get-list-export-excel`;
export const DATA_TABLE_BPMN_LIST_DOCUMENT = `${APP_BASE}/api/variables/list-variables-document`;

export const API_DYNAMIC = `${APP_BASE}/api/dynamic-form`;

// API camunda
export const GET_STATUS_STARTED_CMD = (id) =>
  `${APP_BASE}/api/bpmn-designs/engine-rest/${id}/activity-instances`;

export const MODEL_INTROSPECT = `${APP_BASE}/api/model-introspect`;
export const ROLE_FEATURE = `${APP_BASE}/api/role-feature`;

//role
export const API_ROLE = `${APP_BASE}/api/users/role-detail`;
// Import Excel
export const API_IMPORT_EXCEL = `${APP_BASE}/api/import-file`;
export const API_IMPORT_EXCEL_CITIZEN = `${APP_BASE}/api/import-file?tab=0`;
export const API_IMPORT_EXCEL_BUSINESS = `${APP_BASE}/api/import-file?tab=1`;
export const API_UPLOAD_FILE_EXCEL = `${APP_BASE}/api/import-file/upload-excel`;
export const API_DOWNLOAD_FILE_EXCEL = `${APP_BASE}/api/import-file/download`;
export const API_LIST_OF_DOCUMENT = `${APP_BASE}/api/list-of-document`;

// chức năng phân quyền
export const API_FUNCTION_DECENTRALIZATION = `${APP_BASE}/api/decentralization`;
// nhật ký lỗi phát sinh
export const API_ERROR_LOG = `${APP_BASE}/api/system-error-log`;
//Quản lý nhật ký hệ thống
export const API_USER_LOGS = `${APP_BASE}/api/user-logs`;
// doasboard
export const API_DASHBOARD = `${APP_BASE}/api/dashboard/summary`;
export const API_DASHBOARD_ENTERPRISE = `${APP_BASE}/api/dashboard/header`;
export const API_DASHBOARD_TTHC = `${APP_BASE}/api/dashboard/tthc`;
// ký số
export const API_GET_CERTIFICATE = `${APP_BASE}/api/pdf/cert-info`;
export const API_SINGED = `${APP_BASE}/api/pdf/sign`;
export const API_SIGN_BY_ID = `${APP_BASE}/api/pdf/sign-existing`;
export const API_GET_ALLCERT = `${APP_BASE}/api/pdf/all-cert-info`;
export const API_SELECT_CERT = `${APP_BASE}/api/pdf/select-credential`;

export const API_DOCUMENT_MANAGEMENTS = `${APP_BASE}/api/document-management/file`;
export const API_SCHEDULE_A_TEST = `${APP_BASE}/api/document-management/schedule-validity-check-multiple`;
export const API_CHECK_FORMAT_DOCCUMENT = `${APP_BASE}/api/document-management/check-format`;
export const API_GET_DETAIL = `${APP_BASE}/api/variables/detail`;
export const API_SCHEDULE_A_TESTS = `${APP_BASE}/api/variables/schedule-signature-check`;
export const API_UPDATE_CHARATERS = `${APP_BASE}/api/variables/set-characters`;
export const API_UPDATE_DOCUMENT_VALUE = `${APP_BASE}/api/variables/bulk-update-document-value`;
export const API_CHECK_NOW = `${APP_BASE}/api/variables/check-signature-now`;
export const API_UPDATE_HOUR_NOW = `${APP_BASE}/api/variables/update-test-date`;
export const API_UPDATE_CANCELTIME = `${APP_BASE}/api/variables/updateCancelTime`;
export const API_USER_SIGN = `${APP_BASE}/api/pdf/users`;
export const API_LOGIN_SIGN = `${APP_BASE}/api/pdf/login`;
//dich vu
export const SERVICES_LIST = `${APP_BASE}/api/services-log`;
export const API_CONFIG_ENDPOINTS = `${APP_BASE}/api/config_endpoints`;
// export const API_CONFIG_ENDPOINTS_SWAGER = `${APP_BASE}/api/apim/swagger`;
// export const API_UPDATE_SWAGER = `${APP_BASE}/api/apim/update`;
// api cho test
// export const SERVICES_LIST_TEST  = `${APIM}/api_lgsp_proxy_tthc_test/version1/tthc/thuthapgiaytotaithanhkyso`;

// dông bộ dữ liệu
// const URL_ASYNC = `http://192.168.0.137:8290`;

export const URL_ASYNC_CITY = `${APP_BASE}/api/city-category/async-city-category`; // danh mục tỉnh thành
export const URL_ASYNC_DISTRICT = `${APP_BASE}/api/district-category/async-category`; //danh mục quận huyện
export const URL_ASYNC_COMMUNE = `${APP_BASE}/api/commune-categorie/async-category`; //danh mục xã phường

// Quản lý danh mục loại kết quả giải quyết TTHC
export const URL_ASYNC_TYPE_RESOLUTION_RESULT = `${APP_BASE}/api/administrative-procedure-result-category/async-category`;

// Quản lý danh mục TTHC
export const URL_ASYNC_ADMINISTRATIVE_PROCEDURES = `${APP_BASE}/api/administrative-procedure-category/async-category`;

// Quản lý danh mục lĩnh vực TTHC
export const URL_ASYNC_PROCEDURAL_FIELD = `${APP_BASE}/api/administrative-procedure-field-category/async-category`;

// Quản lý thông tin doanh nghiệp
export const URL_ASYNC_BUSINESS_INFO = `${APP_BASE}/api/info-enterprise/async-category`;

// Quản lý thông tin công dân
export const URL_ASYNC_CITIZEN_INFO = `${APP_BASE}/api/info-citizen/async-category`;
export const LIST_INVALIDATION_SEARCH_KQGQ_TTHC = `${APP_BASE}/api/variables/clone`;
export const LIST_INVALIDATION_SEARCH_KQGQ_TTHCS = `${APP_BASE}/api/variables/list-clone`;
export const LIST_INVALIDATION_SEARCH_KQGQ_DOCUMENTS = `${APP_BASE}/api/variables/list-document`;
export const LIST_INVALIDATION_SEARCH_KQGQ_TTHC_DN = `${APP_BASE}/api/variables/clone-dn`;
export const LIST_INVALIDATION_GET_KQGQ_DOCUMENTS = `${APP_BASE}/api/variables/get-documents`;
export const LIST_INVALIDATION_GET_KQGQ_DASHBOARD = `${APP_BASE}/api/variables/list-dashboards`;

export const SCHEDULE_CANCELLATION = `${APP_BASE}/api/variables/schedule-expire-multiple`;
export const TIME_CONFIGGURATION = `${APP_BASE}/api/variables/schedule-status-multiple`;

//Cơ quan ban hành
export const API_ISSUING_AGENCY = `${APP_BASE}/api/issuing-agencies`;
//Công cụ tra cứu
export const API_LOOKUP_TOOL = `${APP_BASE}/api/lookup-tool`;

export const LIST_INVALIDATION_SEARCH_TCKQGQ = `${APP_BASE}/api/variables/clone-kqgq`;

export const API_UPLOAD_FILES = `${APP_BASE}/api/file/upload-files`;
export const API_GET_NETWORK_ADMINISTRATION = `${APP_BASE}/api/address-log?type=tthc`;
export const API_GET_NETWORK = `${APP_BASE}/api/address-log`;
export const API_TIME_CONFIG = `${APP_BASE}/api/user-logs/cleanup`;
export const API_GET_CLEANUP_LOG = `${APP_BASE}/api/user-logs/cleanup/configuration`;

export const API_SETUP_COLUMNS = `${APP_BASE}/api/list-role/config/columns`;
// callback
export const API_WSO2_CALLBACK = `${APP_BASE}/api/auth/callback`;

// api quản lý văn bản điều hành
export const API_VIEWCONFIG_DHVB = `${APP_BASE}/admin-api/view-configs/myconfig`;
export const API_CRMSTATUS_DHVB = `${APP_BASE}/admin-api/crm-status`;
export const API_CRMSOURCE_DHVB = `${APP_BASE}/api/crm-sources/get-all`;
//api thêm mới crmsoure
export const API_ADD_CRMSOURCE_DHVB = `${APP_BASE}/api/crm-sources`;
//api xoá crmsoure
export const API_DELETE_CRMSOURCE_DHVB = `${APP_BASE}/api/crm-sources/delete-many`;
//api sửa crmsoure
export const API_CRMSOURCE_DETAIL_DHVB = (id) => `${APP_BASE}/api/crm-sources/${id}`;

// api văn bản điều hành
export const API_DS_VANBANDEN_DHVB = `${APP_BASE}/admin-api/incommingdocument`;
export const API_INCOMMINGDOCUMENT_PROCESSORS = `${APP_BASE}/admin-api/incommingdocument/processors`;
export const API_INCOMMINGDOCUMENT_SUPPORTERS = `${APP_BASE}/admin-api/incommingdocument/supporters`;
export const API_DS_VANBANDI_DHVB = `${APP_BASE}/admin-api/outgoingdocument`;
export const API_INCOMMINGDOCUMENT_PROSSING = `${APP_DHVB_BASE}/documents/list/main-process`;
export const API_INCOMMINGDOCUMENT_RECEPTION = `${APP_DHVB_BASE}/documents/list/receive`;
export const API_INCOMMINGDOCUMENT_IMPLEMENTATION_COORDINATION = `${APP_DHVB_BASE}/documents/list/implementation-coordination`;
export const API_INCOMMINGDOCUMENT_RECIPIENT_TO_KNOW = `${APP_DHVB_BASE}/documents/list/recipient-to-know`;
export const API_OUTGOING_DOCUMENT = `${APP_BASE}/api/outgoing-documents`;
// export const API_INCOMMINGDOCUMENT_PROSSING = `http://192.168.0.35:1111/documents/list/main-process`;
// export const API_INCOMMINGDOCUMENT_RECEPTION = `http://192.168.0.35:1111/documents/list/receive`;
// export const API_INCOMMINGDOCUMENT_IMPLEMENTATION_COORDINATION =`http://192.168.0.35:1111/documents/list/implementation-coordination`;
// export const API_INCOMMINGDOCUMENT_RECIPIENT_TO_KNOW = `http://192.168.0.35:1111/documents/list/recipient-to-know`;

// api roles detail
export const API_ROLES_DETAIL = `${APP_DHVB_BASE}/role-2/get-detail`;

// api đồng bộ user
export const API_SYNC_USERS_WSO2 = `${APP_BASE}/admin-api/employees/sync-wso2`;

//keycloak
export const API_AUTH_ME = `${APP_BASE}/api/auth-keycloak/me`;
export const API_LOGOUT_KEYCLOAK = `${APP_BASE}/api/auth-keycloak/logout`;

// đồng bộ wso2
export const API_SYNC_WSO2 = `${APP_BASE}/api/wso2-user-sync/start`;
export const API_SYNC_PROGRESS = `${APP_BASE}/api/wso2-user-sync/progress`;

// đồng bộ keycloak
export const API_SYNC_KEYCLOAK = `${APP_BASE}/api/user-sync/from-keycloak-async`;
export const API_SYNC_TO_KEYCLOAK = `${APP_BASE}/api/user-sync/to-keycloak-async`;
export const API_SYNC_KEYCLOAK_PROGRESS = `${APP_BASE}/api/user-sync/progress`;
export const API_CANCEL_SYNC = `${APP_BASE}/api/user-sync/cancel-sync`;

// đồng bộ hrm
export const API_SYNC_HRM_MANUAL = `${APP_BASE}/api/hrm-sync/sync`;
export const API_SYNC_HRM_PROGRESS = `${APP_BASE}/api/hrm-sync/progress`;
export const API_GET_HRM_JOBS = `${APP_BASE}/api/hrm-sync/jobs`;
export const API_HRM_JOB_MAPPING = `${APP_BASE}/api/hrm-job-mapping`;
export const API_HRM_JOB_MAPPING_BATCH = `${APP_BASE}/api/hrm-job-mapping/batch`;
// export const API_SYNC_KEYCLOAK_PROGRESS = 'http://localhost:3156/api/user-sync/progress';
// export const API_SYNC_KEYCLOAK = 'http://localhost:3156/api/user-sync/from-keycloak-async';

// api thêm mới văn bản đến
export const API_ADD_VANBANDEN_DHVB = `${APP_DHVB_BASE}/demo/docs`;

// api lấy chi tiết văn bản đến
export const API_DETAIL_VANBANDEN_DHVB = (docId) =>
  `${APP_DHVB_BASE}/documents/${docId}/details`;

// api lấy danh sách user theo luồng
export const API_DETAIL_USER = (docId) =>
  `${APP_DHVB_BASE}/users/${docId}/document-users`;
// api comment
export const API_COMMENTS = `${APP_DHVB_BASE}/documents`;
// api documents-history
export const API_DOCUMENT_HISTORY = `${APP_BASE}/api/documents/documents-history/list`;
// api số văn bản đến
export const API_SO_VANBANDEN_DHVB = `${APP_DHVB_BASE}/book-documents/list`;
export const API_SO_VANBANDEN_V2 = `${APP_BASE}/api/book-documents/listv2`;


export const API_URL_LIST = `${APP_BASE}/api/system-info/api-endpoints`;

export const API_FILES_UPLOAD = `${APP_BASE}/api/files/upload`;
export const API_VIEW_FILE = `${APP_BASE}/api/files/view`;
export const API_FILE_INFO = `${APP_BASE}/api/files`;

// api thêm mới văn bản đi
export const API_ADD_VANBANDI_DHVB = `${APP_BASE}/api/outgoing-documents`;
// api TÌM KIẾM PHÚC ĐÁP VĂN BẢN
export const API_SEARCH_DOCUMENT_REPLY = `${APP_BASE}/api/incoming/list/reply`;
export const API_BOOK_DOCUMENTS = `${APP_BASE}/api/book-documents/list`;
// api chi tiết sổ văn bản
export const API_BOOK_DOCUMENT_DETAIL = (id) =>
  `${APP_BASE}/api/book-documents/${id}`;
//api thêm mới sổ vb
export const API_ADD_DOCUMENT_BOOK = `${APP_BASE}/api/book-documents`;
export const API_POST_GIVE_NUMBER = `${APP_BASE}/api/outgoing-documents/set-number`;
export const API_USER_VT = `${APP_BASE}/api/users/by-process-role?processKey=PHOIHOP_NHANDEBIET&roleCode=VAN_THU`;

// api người ký dự thảo
export const API_DRAFT_SIGNER = `${APP_BASE}/api/users/draft-signers`;
// api người tờ trình
export const API_APPROVE_SIGNER = `${APP_BASE}/api/users/report-signers`;
// api người nhận xử lý
export const API_PROCESSING_RECEIVER = `${APP_BASE}/api/users/assignedReceiver`;
//api nơi nhận để biết
export const API_RECEIVE_TO_KNOW = `${APP_BASE}/api/users/incomingRecipient`;
// api thu hồi , thay thế văn bản
export const API_REPLACE_INCOMING_DOCUMENT = `${APP_BASE}/api/outgoing-documents/list-evict`;
export const API_INSERT_TEXT_TO_PDF = `${APP_BASE}/api/files/insert-texts-to-pdf-file`;
export const API_CONVERT_FILE_TO_PDF = `${APP_BASE}/api/files/convert-docx-to-pdf`;
export const API_LOG_DHVBTC = `${APP_BASE}/api/system-logs-sql`;
export const API_NETWORK_ADMINISTRATION = `${APP_BASE}/api/network-administration`;
export const API_CONFIG_TABLE = `${APP_BASE}/api/table-config`;

// api dịch vụ lưu trữ
export const API_STORAGE_SERVICE = `${APP_BASE}/api/storage-config`;


//api only office
// export const API_ONLYOFFICE_UPLOAD = `${URL_ONLYOFFICE}`;
// api thay đổi sao 
export const API_STAR_CHANGE = `${APP_BASE}/api/documents/star-change`
// api màn uỷ quyền
export const API_DELEGATION_MANAGEMENT = `${APP_BASE}/api/authority`;
// api người được uỷ quyền
export const API_AUTHORIZED_USER = `${APP_BASE}/api/users/users-in-same-org`;
export const API_INTRA_INDUSTRY_UNIT = `${APP_BASE}/api/agencies?industryType=1`
export const API_EXTRA_INDUSTRY_UNIT = `${APP_BASE}/api/agencies?industryType=0`
// api thông báo
export const API_NOTIFICATION = `${APP_BASE}/api/notifications`;
export const API_NOTIFICATION_CONFIG = `${APP_BASE}/api/notification-config`;
export const API_LIST_INDOC_BH_TO_OUTDOC = `${APP_BASE}/api/documents/outgoing/list/incomming-document-internal`;

//tool chinh sua office
// export const URL_TOOL_EDIT = URL_TOOL_EDIT_OFFICE
export const API_POST_RECALL_DOC = `${APP_BASE}/api/documents/outgoing/recall-doc`;

export const API_FILE_PREVIEW = `${APP_BASE}/api/files/preview-text-to-pdf-file`;

// api quản lý mẫu ký số
export const API_SIGN_DIGITAL = `${APP_BASE}/api/files/sign-pdf`;

export const API_POST_TRANSFER_FEEDBACK = `${APP_BASE}/api/outgoing-documents/transfer-opinion`
// api thong ke 
export const API_INCOMMING_TEXT_STATISTICS = `${APP_BASE}/api/incoming/statistics`;
export const API_OUTGOING_TEXT_STATISTICS = `${APP_BASE}/api/outgoing-documents/draft-count`;
export const API_WORK_PROFILE = `${APP_BASE}/api/task-feature/count/task`;
// uy quyen
export const API_AUTHORITY = `${APP_BASE}/api/users/authorized-permissions`;

// api xác nhận thu hồi văn bản đến 
export const API_CONFIRM_RECALL_INCOMING = `${APP_BASE}/api/documents/incoming/recall`;
export const API_CONFIRM_REJECT_INCOMING = `${APP_BASE}/api/incoming/reject`;
export const API_RELATED_COUNTS = `${APP_BASE}/api/incoming/related-counts`;



// api danh sách người dùng dasboard
export const API_DASHBOARD_USER_LIST = `${APP_BASE}/api/documents/statistics`;
// export const API_DASHBOARD_USER_LIST = `http://192.168.0.84:3156/api/documents/statistics`;

export const API_GET_DATA_SETTING_CLEAR_LOG = `${APP_BASE}/api/setting-clear-log/detail-config`
export const API_GET_SETTING_CLEAR_LOG = `${APP_BASE}/api/setting-clear-log/detail-config`
export const API_UPDATE_SETTING_CLEAR_LOG = `${APP_BASE}/api/setting-clear-log/update`
export const API_DELETE_SETTING_CLEAR_LOG = `${APP_BASE}/api/setting-clear-log`

// api search 
export const API_SEARCH_HEADER_ALL = `${APP_BASE}/api/documents/getAllByText`
// export const API_SEARCH_HEADER_ALL = `http://192.168.0.137:3156/api/documents/getAllByText`


export const API_GET_LIST_USER_BY_ORGANIZATION_UNIT = `${APP_BASE}/api/users/users-by-org-unit`
//api đơn vị xử lý
export const API_GET_LIST_USER_BY_ORGANIZATION_UNIT_PENDING = `${APP_BASE}/api/users/users-by-org-unit_pending`
// api thêm mới công việc chung
export const API_ADD_COMMON_WORK = `${APP_BASE}/api/tasks`;
// api gửi phê duyệt công việc chung
export const API_SEND_APPROVAL_COMMON_WORK = `${APP_BASE}/api/tasks/send-approval`;
// api danh sách phê duyệt công việc chung
export const API_GET_LIST_APPROVAL_COMMON_WORK = `${APP_BASE}/api/tasks/approve`;

// api lấy danh sách lịch sử công việc chung
export const API_GET_LIST_COMMON_WORK_HISTORY = `${APP_BASE}/api/system-logs-sql/log-form-task`
// api lấy người trong công việc chung
export const API_GET_COMMON_WORK_USER = `${APP_BASE}/api/users/by-task-role`
// api lấy phòng ban trong công việc chung
export const API_GET_COMMON_WORK_ORG = `${APP_BASE}/api/organization-units/by-task-role`
// api lấy danh sách lịch sử
export const API_GET_COMMON_WORK_DETAIL = `${APP_BASE}/api/tasks/all-log-task`
// api danh sách công việc con
export const API_GET_SUBTASKS = `${APP_BASE}/api/tasks/child`
// api quản lý đợt lưu trữ
export const API_STORAGE_DOT_MANAGEMENT = `${APP_BASE}/api/profile-storage`;
// api bình luận công việc chung
export const API_COMMON_WORK_COMMENTS = `${APP_BASE}/api/task`




// api danh mục foder
export const API_MANAGEMENT_FODER = `${APP_BASE}/api/document-library`;
export const API_ARCHIVES = `${APP_BASE}/api/archive-records`;
export const API_GET_RECORD_ARCHIVES = `${APP_BASE}/api/archives/source-storages`;
// export const API_GET_RECORD_ARCHIVES = `${APP_BASE}/api/archives/storage-batches`;
// api quản lý phiếu yêu cầu khai thác hồ sơ
export const API_RECORD_ACCESS = `${APP_BASE}/api/record-access`;
// api danh sách tin tức
export const API_NEWS_MANAGEMENT = `${APP_BASE}/api/news`;
// api danh sách lịch sử yêu cầu phê duyệt tab từ chối
export const API_GET_LIST_RECORD_ACCESS_HISTORY = `${APP_BASE}/api/tasks/historyrejected`;
// api danh sách lịch sử yêu cầu phê duyệt tab phê duyệt
export const API_GET_LIST_RECORD_ACCESS_HISTORY_APPROVED = `${APP_BASE}/api/tasks/historyaccepted`;
// api lấy danh sách cá nhân tham gia cuộc họp
export const API_GET_LIST_INDIVIDUAL_PARTICIPANTS = `${APP_BASE}/api/meeting-schedule/users`;
// api lấy danh sách đơn vị tham gia cuộc họp
export const API_GET_LIST_UNITS_INDIVIDUAL_PARTICIPANTS = `${APP_BASE}/api/meeting-schedule/organization-units`;
// api lấy danh sách cá nhân trong phòng với tk văn thư
export const API_GET_LIST_ROOM_WITH_A_USER = `${APP_BASE}/api/meeting-schedule/organization-units-room`;
// api danh sách  phòng họp
export const API_GET_ROOM_MEETING = `${APP_BASE}/api/meeting-rooms/list`;
// Meeting Room API
export const API_MEETING_ROOM = `${APP_BASE}/api/meeting-rooms`;
export const API_AMENITIES = `${APP_BASE}/api/amenities`;

export const API_UPDATE_STATUS_JOB = `${APP_BASE}/api/tasks/update-status-job`;
// api tạo lịch họp
export const API_ADD_MEETING_SCHEDULE = `${APP_BASE}/api/meetings`;

// api lấy lịch theo cá nhân 
export const API_GET_MEETING_INDIVIDUAL = `${APP_BASE}/api/meetings/user`;
// api lấy lịch theo đơn vị
export const API_GET_MEETING_UNITS = `${APP_BASE}/api/meetings/unit`;
// api lấy lịch theo công ty
export const API_GET_MEETING_COMPANY = `${APP_BASE}/api/meetings/company`;

// export const API_SIGN_DIGITAL_FILE = `${APP_SIGN_DIGITAL}/api/sign`;

export const BASE_URL_DOCUMENT = DOCUMENT_APP;
export const BASE_URL_DOCUMENT_LOCAL = DOCUMENT_APP_LOCAL;
export const API_WORK_ITEMS = `${APP_BASE}/api/work-items`;


export const API_JOB_TO_DOCUMENT = `${APP_BASE}/api/tasks/form-doc`;

// Nguồn Vb
export const API_GET_SOURCE_DOCUMENT = `${APP_BASE}/api/incoming/list/for-task?type=waiting`;

// API download file
export const API_DOWNLOAD_FILE_ALL_ZIP = `${APP_BASE}/api/files/download-multi`;

export const API_FAKE_ORG = `${APP_BASE}/api/organization-units/org-fake`;

//Get token sign digital
export const API_GET_TOKEN_SIGN = `${APP_BASE}/api/users/get-token/sign`;
// api banner
export const API_BANNER_MANAGEMENT = `${APP_BASE}/api/banner`;
export const API_NEWS_SUBMIT = `${APP_BASE}/api/news/submit`;
// // api xác nhận tham gia 
// export const API_CONFIRM_JOIN = `${APP_BASE}/api/meetingId/room-confirm-join`;
export const API_GET_USER_IN_FLOW = `${APP_BASE}/api/incoming/get-user-in-flow`;
export const API_EXTEND_PROCESSING_TIME = `${APP_BASE}/api/incoming`;
// api upload thông số
export const API_UPLOAD_SETTING = `${APP_BASE}/api/setting-clear-log`;

// api ý kiến trong tài liệu lịch họp
export const API_COMMENT_MEETING = `${APP_BASE}/api/meeting-task`;
//api ảnh 
export const API_MEDIA_ALBUMS = `${APP_BASE}/api/album-images`;
export const API_ADD_MEDIA_ALBUMS = `${APP_BASE}/api/album-images/create-with-upload`;
export const API_TOPIC = `${APP_BASE}/api/topic`;
export const API_MEDIA_VIDEO = `${APP_BASE}/api/videos`;
export const API_MEDIA_VIDEO_CREATE = `${APP_BASE}/api/videos/create-with-upload`;

export const API_JOB_TO_MEETING = `${APP_BASE}/api/tasks/form-meeting`;

export const API_GET_SOURCE_MEETING = `${APP_BASE}/api/meetings/list-for-task`;
// api check trùng phòng họp 
export const API_CHECK_DUPLICATE_MEETING_ROOM = `${APP_BASE}/api/meetings/room/check`;
// api check trùng người tham gia 
export const API_CHECK_DUPLICATE_PARTICIPANT = `${APP_BASE}/api/meetings/user/check-conflict`;
// api ghi âm 
export const API_MEETING_RECORDING = `${APP_BASE}/api/meetings/audio-transcripts`;
// api gán người do văn thư gán
export const API_ASSIGN_USER_BY_SECRETARY = `${APP_BASE}/api/meeting-schedule/organization-units-room`;

export const API_GET_PROCESS_OUTGOING_DOCUMENT = `${APP_BASE}/api/bpmn-designs/process/OutGoingDocument`;
export const API_GET_USER_INFLOW = `${APP_BASE}/api/users/get-signers-by-type`;
// api leadership duty schedule
export const API_LEADERSHIP_DUTY_SCHEDULE = `${APP_BASE}/api/leadership-duty-schedules`;
export const API_TRAVEL_WORK_SCHEDULES = `${APP_BASE}/api/travel-work-schedules`;
export const API_DUTY_ROSTER_LEADERS = `${APP_BASE}/api/meetings/duty-roster-leaders`;
export const API_GET_LEADERS = `${APP_BASE}/api/users/leaders`;
// api cập nhật trạng thái lịch họp những việc cần xử lý 
export const API_UPDATE_MEETING_STATUS = `${APP_BASE}/api/meetings/processing-state`;
export const API_INCOMING_DOCUMENT_RECALLED_LIST = `${APP_BASE}/api/incoming/list/replaced-by-incoming`;
// api đánh giấu tài liệu quan trọng
export const API_MARK_IMPORTANT_DOCUMENT = `${APP_BASE}/api/files`;
// api uỷ quyền người tham gia 
export const API_DELEGATE_PARTICIPANT = `${APP_BASE}/api/meetings/delegate`;
//api thống kê tin tức
export const API_NEWS_STATISTICS = `${APP_BASE}/api/news-statistics`;
export const API_NEWS_STATISTICS_TOP = `${APP_BASE}/api/news-statistics/summary-by-topic`;
export const API_NEWS_STATISTICS_DEPARTMENT = `${APP_BASE}/api/news-statistics/summary-by-department`;
export const API_GET_OUTGOING_DOC_BY_INCOMING = `${APP_BASE}/api/outgoing-documents/by-incoming`;
export const API_PATCH_ATTACHMENTS_CERT_COPY = `${APP_BASE}/api/files/attachments-cert-copy`;
export const API_DRAFT_CREATE = `${APP_BASE}/api/outgoing-documents/draft-create`;
export const API_DRAFT_DELETE = `${APP_BASE}/api/outgoing-documents/draft`;
export const API_OUTGOING_DRAFT_SIGNERS = (id) =>
  `${APP_BASE}/api/outgoing-documents/draft/${id}/signers`;

// api quản lý dự án
export const API_PROJECT_MANAGEMENT = `${APP_BASE}/api/project`;
export const API_INCOMING_STATISTICS_BY_TIME = `${APP_BASE}/api/incoming/statistics/by-time`;
export const API_INCOMING_STATISTICS_REPORT = `${APP_BASE}/api/incoming/list/statistic-report`;
export const API_INCOMING_STATISTICS_OVERDUE = `${APP_BASE}/api/incoming/list/overdue`;
export const API_INCOMING_STATISTICS_REPORT_SENDING_UNIT = `${APP_BASE}/api/incoming/statistic-report-sender-unit`;
export const API_INCOMING_STATISTICS_DIRECTIVE = `${APP_BASE}/api/incoming/list/directive`;
// api hiển thị nút 
export const API_DISPLAY_BUTTON_CONFIG = `${APP_BASE}/api/meetings/get-action`;

export const API_OUTGOING_DOC_STATISTICS_BY_TIME = `${APP_BASE}/api/outgoing-documents/list/report-outgoing-by-time`;
export const API_OUTGOING_DOC_STATISTICS_PROCESS_SIGN = `${APP_BASE}/api/outgoing-documents/list/statistic-process-sign`;
export const API_OUTGOING_DOC_STATISTICS_BY_SIGNER = `${APP_BASE}/api/outgoing-documents/statistics/by-signer`;

// api thống kê phần lịch họp
// api thống kê tần xuất sử dụng phòng họp
export const API_MEETING_ROOM_USAGE_FREQUENCY = `${APP_BASE}/api/meetings/list/meeting-rooms-stats`;
// api thông kê cuộc họp theo phòng ban
export const API_MEETING_STATISTICS_BY_DEPARTMENT = `${APP_BASE}/api/meetings/list/meeting-in-meeting-rooms-stats`;
// api thống kê cuộ họp theo thời gian
export const API_MEETING_STATISTICS_BY_TIME = `${APP_BASE}/api/meetings/list/meeting-by-time`;
// api thống kê tham dự cuộc họp
export const API_MEETING_ATTENDANCE_STATISTICS = `${APP_BASE}/api/meetings/list/meeting-attendance-report`;
// api thống kê theo dõi công việc tạo từ kết luận cuộc họp
export const API_MEETING_FOLLOWUP_TASK_STATISTICS = `${APP_BASE}/api/meetings/list/conclusions-from-meeting`;
// api lấy danh sách các cuộc họp
export const API_GET_LIST_MEETINGS = `${APP_BASE}/api/meetings/find-all`;
export const API_EXPORT_FILE_EXCEL_REPORT_DOCUMENTS = `${APP_BASE}/api/documents/get-list-export-excel`;

// api cập nhật kết luận cuộc họp
export const API_UPDATE_MEETING_CONCLUSION = `${APP_BASE}/api/meetings/conclusions`;
// api cập nhật xử lý lịch họp cá nhân 
export const API_UPDATE_MEETING_PERSONAL_PROCESSING = `${APP_BASE}/api/meetings/check-prepare-user`;
export const API_GET_DRAFT_INCOMING_DOCUMENT = `${APP_BASE}/api/demo/draft-create`;
export const API_IMCOMING = `${APP_BASE}/api/incoming`;
//api yêu sau khi xin ý kiến phát hành
export const API_OUTGOING_DOCUMENTS_REQUEST_FEEDBACK = `${APP_BASE}/api/outgoing-documents/request-feedback`;
// api quản lý danh mục năm
export const API_YEAR_CATEGORY = `${APP_BASE}/api/record-catalog/year`;
// api quản lý hồ sơ (thư mục)
export const API_FOLDER_MANAGEMENT = `${APP_BASE}/api/record-catalog/document`;
//api export dự án
export const API_EXPORT_FILE_EXCEL_PROJECT = `${APP_BASE}/api/tasks/export/dynamic`;
// api quy trình mẫu
export const API_TEMPLATE_SAMPLE = `${APP_BASE}/api/process-template`;
export const API_DOWNLOAD_FILE = `${APP_BASE}/api/files/download`;
export const API_PARAPH_SIGN_IMAGE = `${APP_BASE_SIGN_USB_TOKEN}/api/desktop/document-initial-signature`; //Ký USB TOKEN - Ký nháy
export const API_CONTENT_SIGN_IMAGE = `${APP_BASE_SIGN_USB_TOKEN}/api/desktop/document-with-image`; //Ký USB TOKEN - Ký tay và con dấu
//api thêm mới hồ sơ
export const API_PROFILE = `${APP_BASE}/api/archive-records`;
export const API_SELECT_DOCUMENTS_PROFILE = `${APP_BASE}/api/archive-records/select-documents`;
// api phần yêu cầu đặt xe
export const API_VEHICLE_REQUEST = `${APP_BASE}/api/vehicle-registration`;
//api lấy danh sách người dùng trong flow
export const API_GET_USERS_IN_FLOW = `${APP_BASE}/api/destroy-records/get-users-in-flow`;
// api thư mục hồ sơ lưu trữ
export const API_ARCHIVE_FOLDER = `${APP_BASE}/api/document-library`;
//api check quyền trong màn danh sách thư mục cấp 1
export const API_CHECK_PERMISSION_FOLDER = `${APP_BASE}/api/document-library/check-permission`;
// api danh sách chức năng vai trò
export const API_ROLE_FUNCTIONS = `${APP_BASE}/api/menu-manager/list-menu-with-feature`;
export const API_LIST_ACHIVE_RECORDS = `${APP_BASE}/api/archive-records/list-parents-archive-record`;
export const API_LIST_ACHIVE_RECORDS_CHILDREN = `${APP_BASE}/api/archive-records/parent`;
// api đổi vị trí thư mục
export const API_CHANGE_FOLDER_POSITION = `${APP_BASE}/api/document-library/update-order`;

export const API_TEMPLATE = `${APP_BASE}/api/process-template/no-filter`;

export const API_LIST_ACHIVE_RECORDS_FOLDER_CHILDREN = `${APP_BASE}/api/archive-records/folder-children`;
export const API_GET_ACTION_DESTROY_RECORDS = `${APP_BASE}/api/destroy-records/get-action`;

// api danh sách xe
export const API_LIST_CARS = `${APP_BASE}/api/list-car`;
// api danh sách tài xế
export const API_LIST_DRIVERS = `${APP_BASE}/api/list-driver`;
export const API_PATCH_MARK_ALL_NOTIFICATIONS_READ = `${APP_BASE}/api/notifications/mark-all-read`;

export const API_PASSPORT = `${APP_BASE}/api/passports`; //Hộ chiếu
export const API_GET_PASSPORT_EMPLOYEES = `${APP_BASE}/api/passports/employees`; //Tài khoản
export const API_GET_PASSPORT_ORGANIZATTIONS = `${APP_BASE}/api/passports/organization-units`; //Đơn vị
export const API_GET_PASSPORT_WORKER_TYPES = `${APP_BASE}/api/passports/worker-types`; //Loại nhân viên
export const API_GET_PASSPORT_POSITIONS = `${APP_BASE}/api/passports/positions`; //Chức danh
export const API_GET_PASSPORT_JOBS = `${APP_BASE}/api/passports/jobs`; //Công việc
export const API_GET_PASSPORT_ARMY_RANKS = `${APP_BASE}/api/passports/army-ranks`; //Cấp bậc quân đội

// api phản ánh kiến nghị
export const API_REFLECT_SUGGESTIONS = `${APP_BASE}/api/feedback-suggestions`;

export const API_SIGN_BATCH = `${APP_BASE}/api/files/sign-batch`; //Ký số hàng loạt
export const API_PASSPORT_REQUEST = `${APP_BASE}/api/passport-requests`; //Ký số hộ chiếu
export const API_PASSPORT_VOUCHERS = `${APP_BASE}/api/passport-vouchers`; //Danh sách phiếu hộ chiếu	
// đồng bộ hrm
export const API_ASYNC_HRM = `${APP_BASE}/api/async-hrm`;
// khám sức khoẻ tài xế
export const API_DRIVER_HEALTH_CHECK = `${APP_BASE}/api/driver-health-check`;
// api hiển thị nút ở màn thêm mới yêu cầu 
export const API_ACTIONS_ADD_REQUEST = `${APP_BASE}/api/vehicle-registration/get-action`;
// api lịch trực ban lãnh đạo
export const API_LEADERSHIP_SCHEDULE = `${APP_BASE}/api/leadership-duty-schedules/list`;
// api lấy danh sách xe điều phối 
export const API_DRIVER_LIST = `${APP_BASE}/api/vehicle-registration/driver-list`;
// api lấy danh sách tài xế điều phối
export const API_CARS_LIST = `${APP_BASE}/api/vehicle-registration/car-list`;
// api từ chối yêu cầu
export const API_REJECT_REQUEST = `${APP_BASE}/api/vehicle-registration/reject`;
// api huỷ yêu cầu
export const API_CANCEL_REQUEST = `${APP_BASE}/api/vehicle-registration/cancel`;
// api hoàn thành yêu cầu
export const API_COMPLETED_REQUEST = `${APP_BASE}/api/vehicle-registration/complete`;
// api xác nhận của tài xế
export const API_CONFIRM_DRIVER = `${APP_BASE}/api/vehicle-registration/comfirm`;
// api lấy danh sách tài xế từ nhóm tài xế
export const API_GET_LIST_DRIVER_ABOURT_GROUP_DRIVER = `${APP_BASE}/api/group-users/code/TAIXEXE/users`;
// api xóa lịch trực ban lãnh đạo
export const API_DELETE_LEADERSHIP_SCHEDULE = `${APP_BASE}/api/leadership-duty-schedules/delete-many`;
// api lấy tuần
export const API_GET_WEEK = `${APP_BASE}/api/leadership-duty-schedules/weeks`;
// api vb thay thế
export const API_REPLACE_VB = `${APP_BASE}/api/incoming/list/replaced-by-incoming`;
// api báo cáo mượn trả hồ sơ
export const API_REPORT_BORROW_RETURN_RECORD = `${APP_BASE}/api/record-access/report-borrow-return-record`;
// api Danh sách hồ sơ sắp hết hạn bảo quản
export const API_LIST_ARCHIVE_RECORDS_EXPIRING = `${APP_BASE}/api/record-access/report-archive-records-expiring`;
// api Báo cáo danh mục hồ sơ lưu trữ theo phòng ban/ đơn vị
export const API_REPORT_ARCHIVE_RECORDS_BY_DEPARTMENT = `${APP_BASE}/api/record-access/report-archive-records-department`;
// api THỐNG KÊ HỒ SƠ THEO THỜI HẠN BẢO QUẢN
export const API_REPORT_ARCHIVE_RECORDS_BY_RETENTION_PERIOD = `${APP_BASE}/api/record-access/report-statistics-retention-reriod`;
// api THỐNG KÊ LƯỢT TRUY CẬP HỒ SƠ
export const API_REPORT_ARCHIVE_RECORDS_BY_ACCESS_COUNT = `${APP_BASE}/api/record-access/report-archive-access-statistics`;
// api báo cáo thống kê tin tức
export const API_REPORT_NEWS = `${APP_BASE}/api/news-statistics`;
// api báo cáo thống kê hộ chiếu
export const API_REPORT_PASSPORT = `${APP_BASE}/api/passport-statistics`;
// api báo cáo thống kê phản ánh kiến nghị
export const API_REPORT_REFLECT = `${APP_BASE}/api/feedback-suggestions/reports`;
// api xuất báo cáo
export const API_EXPORT_REPORT = `${APP_BASE}/api/data-export/list`;

// api xuất file BÁO CÁO
export const API_EXPORT_FILE_REPORT = `${APP_BASE}/api/data-export/list`;
// api số đếm subTab
export const API_COUNT_SUB_TAB = `${APP_BASE}/api/menu-manager/menu-counts`;

// api danh sách mapping quyền
export const API_LIST_MAPPING_PERMISSION = `${APP_BASE}/api/user-sync/group-mapping`;
// api thêm mới mapping quyền
export const API_MAPPING_PERMISSION = `${APP_BASE}/api/user-sync/group-mapping/save-batch`;
// api đếm số lượng xem file và tải file
export const API_COUNT_VIEW_DOWNLOAD_FILE = `${APP_BASE}/api/archive-records/archive-access-logs`;
export const API_VERIFY_PDF = `${APP_BASE}/api/sign-otp/verify-pdf`;
export const API_VERIFY_FILES = `${APP_BASE}/api/sign-otp/check-files-signatures`;


export const API_DASHBOARD_PAGE_NORMAL = `${APP_BASE}/api/dashboard/normal`;
export const API_DASHBOARD_PAGE_MEDIUM = `${APP_BASE}/api/dashboard/medium`;
export const API_DASHBOARD_PAGE_PREMIUM = `${APP_BASE}/api/dashboard/premium`;
export const API_DASHBOARD_CONFIG = `${APP_BASE}/api/dashboard-config`;
export const API_MOBILE_APP_VERSION_CONFIG = `${APP_BASE}/api/mobile-config/app-version`;
export const API_MOBILE_APP_VERSION_CONFIG_ALL = `${APP_BASE}/api/mobile-config/app-version/all`;

// api ký số otp
export const API_SIGN_OTP = `${APP_BASE}/api/files/sign-otp`;
export const API_REQUEST_OTP = `${APP_BASE}/api/sign-otp/request-otp`;
export const API_VERIFY_OTP = `${APP_BASE}/api/sign-otp/verify-otp`;

// api ghép link
export const API_MERGE_LINK = `${APP_BASE}/api/task-document-links`;
// api xoá thông báo 
export const API_DELETE_NOTIFICATION = `${APP_BASE}/api/notifications/bulk`;


// api tạo mới uỷ quyền
export const API_CREATE_PERSONAL_TASK_DELEGATION = `${APP_BASE}/api/task-delegations`;
export const API_TASK_ASSIGNMENT_CONFIGS = `${APP_BASE}/api/task-assignment-configs`;

export const API_PASSPORT_PERMISSION = `${APP_BASE}/api/passport-requests/permissions`;
//api check quyen hien thi download
export const API_CHECK_PERMISSION_DOWNLOAD = `${APP_BASE}/api/users/hide-download-file`;
// api download file new
export const API_DOWNLOAD_FILE_NEW = `${APP_BASE}/api/files/download-new`;
// api đồng bộ gg calendar
export const API_SYNC_GG_CALENDAR = `${APP_BASE}/api/google-calendar/auth-url`;
export const API_USERS_ALL = `${APP_BASE}/api/users/all`
export const API_GROUP_USERS_IN_DOCUMENT = `${APP_BASE}/api/group-users-in-document`
// api chọn phòng ban và người dùng có quyền xem và chỉnh sửa của module thư viện
export const API_GET_LIST_UNITS_INDIVIDUAL_LIBRARY = `${APP_BASE}/api/document-library/organization-units`;
// api danh sách tiêu đề mục hồ sơ
export const API_LIST_CATEGORY_DOCUMENT = `${APP_BASE}/api/record-catalog/folder-detail`;
// api danh sách danh mục phòng hồ sơ
export const API_LIST_CATEGORY_DOCUMENT_BY_DEPARTMENT = `${APP_BASE}/api/record-catalog/file`;
// api danh sách danh mục văn bản
export const API_LIST_CATEGORY_DOCUMENT_BY_DOCUMENT = `${APP_BASE}/api/record-catalog/document`;
// api lấy dữ liệu fill và màn mở hồ sơ
export const API_GET_DATA_FILE = `${APP_BASE}/api/record-catalog/document/tree`;
// api lấy danh sách chọn hồ sơ chưa mở
export const API_GET_LIST_DOCUMENT_NOT_OPEN = `${APP_BASE}/api/record-catalog/unopened-document-profiles`;

// api xuất file danh sách đề mục hồ sơ
export const API_EXPORT_FOLDER_DETAIL = `${APP_BASE}/api/record-catalog/folder-detail/exports`;
// api xuất file danh sách hồ sơ phòng
export const API_EXPORT_DEPARTMENT_RECORD = `${APP_BASE}/api/record-catalog/file/exports`;
// api xuất file danh sách tiêu đề hồ sơ
export const API_EXPORT_RECORD_LIST = `${APP_BASE}/api/record-catalog/document/exports`;
export const API_CRMSOURCE = `${APP_BASE}/api/crm-sources`;
export const API_INCOMING_DELEGATIONS = `${APP_BASE}/api/passport-incoming-delegations`;
// api check hiển thị nút đóng dấu 
export const API_CHECK_STAMP_BUTTON = `${APP_BASE}/api/outgoing-documents/check-bpmn-stamp-option`;

// api đơn vị gửi tùy chỉnh
export const API_CUSTOM_SENDER_UNITS = `${APP_BASE}/api/custom-sender-units`;


// url file mẫu import Dự án
export const API_IMPORT_FILE_TEMPLE = IMPORT_FILE_TEMPLE;

export const API_PASSPORT_RETURN_SLIP = `${APP_BASE}/api/passport-return-requests`