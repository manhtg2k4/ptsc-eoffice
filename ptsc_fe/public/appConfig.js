(function () {
  var globalObj = typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this);
  var loggerObj = {
    log: function () {
      if (typeof console !== "undefined" && console.log) {
        console.log.apply(console, arguments);
      }
    },
    warn: function () {
      if (typeof console !== "undefined" && console.warn) {
        console.warn.apply(console, arguments);
      }
    },
    error: function () {
      if (typeof console !== "undefined" && console.error) {
        console.error.apply(console, arguments);
      }
    },
    info: function () {
      if (typeof console !== "undefined" && console.info) {
        console.info.apply(console, arguments);
      }
    },
    debug: function () {
      if (typeof console !== "undefined" && console.debug) {
        console.debug.apply(console, arguments);
      }
    },
  };

  var defaults = {
    APP_BASE_URL: "http://localhost:3156",
    APP_BASE_URL_SIGN_USB_TOKEN: "http://127.0.0.1:8088",
    DIRECTION_NEWS: "",
    APP_BASE_CAMUNDA: "",
    APP_BASE_SIGN_DIGITAL: "",
    ROLE_ADMIN: "ADMIN",
    APP_DHVB: "",
    APP_WEB_SOCKET_URL: "http://localhost:3156/doffice-be",
    APP_WEB_SOCKET_BASE_URL: "http://localhost:3156/doffice-be",
    URL_DOWLOAD_TOOL_EDIT_WORD: "",
    URL_DOWLOAD_TOOL_EDIT_WORD_MAC: "",
    URL_ONLYOFFICE: "https://vpstc-document.lifetex.vn",
    URL_TOOL_EDIT_OFFICE: "",
    DOCUMENT_APP: "",
    DOCUMENT_APP_LOCAL: "",
    APP_BASE_FILE: "",
    APP_BASE_295: "",
    APP_BASE_APIM: "",
    APP_CHAT_URL: "",
    TITLE_APP: "TCSG",
    SERVICE_ID: "",
    URL_FILE_EXAMPLE: "",
  };

  var configObj = {
    apiUrl: "http://localhost:3156/api",
    logger: loggerObj,
  };

  if (globalObj) {
    globalObj.logger = globalObj.logger || loggerObj;
    globalObj.appConfig = globalObj.appConfig || configObj;

    for (var key in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, key)) {
        if (globalObj[key] === undefined) {
          globalObj[key] = defaults[key];
        }
      }
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = configObj;
    module.exports.logger = loggerObj;
    module.exports.appConfig = configObj;
    module.exports.default = configObj;
  }
})();
