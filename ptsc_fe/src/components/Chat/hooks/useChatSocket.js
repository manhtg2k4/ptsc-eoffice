// import { useEffect } from "react";
// import { getSocket } from "../../../socket";
// import { useUnreadMessages } from "./useUnreadMessages";

// export const useChatSocket = ({
//   addMessages,
//   mapApiMessage,
//   replacePendingMessage,
//   currentUserId,
// }) => {
  
//   const { fetchUnread } = useUnreadMessages();

//   useEffect(() => {
//     const socket = getSocket();
//     const onNewMessage = (msg) => {
//       const mapped = mapApiMessage({
//         _id: msg.id,
//         content: msg.content,
//         sender: msg.sender,
//         data: msg.data,
//         time: msg.time,
//       });

//       // 🔁 replace optimistic message của mình
//       if (msg.sender?.id === currentUserId && msg.clientTempId) {
//         replacePendingMessage(
//           msg.conversationId,
//           msg.clientTempId,
//           mapped
//         );
//         return;
//       }

//       addMessages(msg.conversationId, mapped);

//       if (msg.sender?.id !== currentUserId) {
//         fetchUnread();
//       }

//     };

//     socket.on("new_message", onNewMessage);

//     return () => {
//       socket.off("new_message", onNewMessage);
//     };
//   }, [currentUserId, addMessages, mapApiMessage, replacePendingMessage, fetchUnread]);
// };

import { useEffect } from "react";
import { getSocket } from "../../../socket";
import { useUnreadMessages } from "./useUnreadMessages";

export const useChatSocket = ({
  addMessages,
  mapApiMessage,
  replacePendingMessage,
  currentUserId,
}) => {
  const { fetchUnread } = useUnreadMessages();

  useEffect(() => {
    const socket = getSocket();

    const onNewMessage = (msg) => {
      const mapped = mapApiMessage({
        _id: msg.id,
        content: msg.content,
        sender: msg.sender,
        data: msg.data,
        time: msg.time,
      });

      // 🔴 chặn luôn tin của mình
      if (msg.sender?.id === currentUserId) {
        if (
          typeof replacePendingMessage === "function" &&
          msg.clientTempId
        ) {
          replacePendingMessage(
            msg.conversationId,
            msg.clientTempId,
            mapped
          );
        }
        return; // ✅ LUÔN return
      }


      // ➕ add message
      addMessages(msg.conversationId, mapped);

      // 🔔 chỉ fetch unread khi KHÔNG phải mình gửi
      if (msg.sender?.id !== currentUserId) {
        window.dispatchEvent(new Event("chat:refresh-unread"));
        fetchUnread();
      }
    };

    socket.on("new_message", onNewMessage);

    return () => {
      socket.off("new_message", onNewMessage);
    };
  }, [
    currentUserId,
    addMessages,
    mapApiMessage,
    replacePendingMessage,
    fetchUnread,
  ]);
};

