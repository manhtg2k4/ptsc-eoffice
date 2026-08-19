// src/components/GlobalDialogPortal.jsx
import React, { useState, useEffect, Suspense } from "react";
import { createPortal } from "react-dom";
import Loading from "@components/Loading/Loading";


let openGlobalDialog = () => {};

export const closeGlobalDialog = () => {
  openGlobalDialog(null);
};

export const openDetailDialog = (componentInfo, recordId, additionalProps = {}) => {
  const Component = componentInfo.component;
  openGlobalDialog({
    Component,
    props: {
      ...componentInfo.defaultProps,
      ...additionalProps,
      open: true,
			id: recordId,
      documentId: recordId,
			meetingId: recordId,
			passportRequestId: recordId,
			newsId: recordId,
      onClose: () => openGlobalDialog(null),
    },
  });
};

import { NotificationContext } from "./NotificationContext";

export default function GlobalDialogPortal() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    openGlobalDialog = setDialog; // gán hàm để bên ngoài gọi
    return () => { openGlobalDialog = () => {}; };
  }, []);

  if (!dialog) return null;

  const isFromNotif = !!dialog.props?.isFromNotification;

  return createPortal(
    <Suspense fallback={<Loading />}>
      <NotificationContext.Provider value={{ isFromNotification: isFromNotif }}>
        <dialog.Component {...dialog.props} />
      </NotificationContext.Provider>
    </Suspense>,
    document.body // quan trọng: render thẳng ra body, thoát khỏi Popover
  );
}