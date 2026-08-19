import { io } from "socket.io-client";
import { APP_SOCKET_URL_BASE } from "@EnvironmentFile/constants/urlConfig";

export const SOCKET_NAMESPACES = {
  NOTIFICATIONS: "/notifications",
  NEWS: "/news",
  ALBUM: "/album",
  VIDEOS: "/videos",
};

const socketInstances = {};

const getLogger = () => {
  if (typeof globalThis !== "undefined" && globalThis.logger) {
    return globalThis.logger;
  }
  return console;
};

export const getProxyPath = (base) => {
  try {
    if (!base) return "";
    const url = new URL(base);
    return url.pathname !== "/" ? url.pathname : "";
  } catch (error) {
    return "";
  }
};

export const getSocketPath = (base = APP_SOCKET_URL_BASE) =>
  `${getProxyPath(base)}/socket.io`;

export const getSocketToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("access_token") ||
  "";

export const buildSocketConfig = (namespace = "", base = APP_SOCKET_URL_BASE) => {
  const url = new URL(base);
  const proxyPath = getProxyPath(base);

  return {
    socketUrl: `${url.origin}${proxyPath}${namespace}`,
    socketPath: getSocketPath(base),
    proxyPath,
  };
};

export const getSocket = (namespace = SOCKET_NAMESPACES.NOTIFICATIONS, options = {}) => {
  const base = options.baseUrl || APP_SOCKET_URL_BASE;
  const cacheKey = options.cacheKey || namespace;
  const token = getSocketToken();
  const currentSocket = socketInstances[cacheKey];

  if (currentSocket) {
    if (currentSocket.auth?.token !== token) {
      currentSocket.auth = { ...(currentSocket.auth || {}), token };
      currentSocket.disconnect();
      currentSocket.connect();
    }

    return currentSocket;
  }

  const logger = getLogger();
  const { socketUrl, socketPath } = buildSocketConfig(namespace, base);
  const {
    // baseUrl,
    // cacheKey: _cacheKey,
    logLabel,
    ...socketOptions
  } = options;

  const socket = io(socketUrl, {
    path: socketPath,
    transports: ["websocket"],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    timeout: 10000,
    ...socketOptions,
    auth: (cb) => {
      cb({
        ...(socketOptions.auth || {}),
        token: getSocketToken(),
      });
    },
  });

  socket.on("connect", () => {
    logger.log?.(`[socket] connected ${logLabel || namespace}:`, socket.id);
  });

  socket.on("connect_error", (error) => {
    logger.error?.(`[socket] connection error ${logLabel || namespace}:`, error.message);
  });

  socket.on("disconnect", (reason) => {
    logger.warn?.(`[socket] disconnected ${logLabel || namespace}:`, reason);
    if (reason === "io server disconnect") {
      socket.connect();
    }
  });

  socketInstances[cacheKey] = socket;
  return socket;
};

export const disconnectSocket = (namespace = SOCKET_NAMESPACES.NOTIFICATIONS) => {
  const socket = socketInstances[namespace];
  if (!socket) return;

  socket.disconnect();
  delete socketInstances[namespace];
};

export const disconnectAllSockets = () => {
  Object.keys(socketInstances).forEach((key) => {
    try {
      socketInstances[key]?.disconnect();
    } catch (e) {}
    delete socketInstances[key];
  });
};

export default getSocket;
