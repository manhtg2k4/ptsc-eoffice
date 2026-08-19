import {
  getSocket as getSharedSocket,
  SOCKET_NAMESPACES,
} from "@utils/socket/socketClient";

export const getSocket = () =>
  getSharedSocket(SOCKET_NAMESPACES.NOTIFICATIONS, {
    transports: ["websocket"],
    reconnectionDelay: 2000,
    timeout: 30000,
    logLabel: "notifications",
  });

export default getSocket; 
