import {
  getSocket,
  SOCKET_NAMESPACES,
} from "@utils/socket/socketClient";

export const getSocketGetFile = () =>
  getSocket(SOCKET_NAMESPACES.NOTIFICATIONS, {
    transports: ["websocket"],
    reconnectionDelay: 2000,
    timeout: 30000,
    logLabel: "fileUpdateSuccess",
  });

export default getSocketGetFile;
