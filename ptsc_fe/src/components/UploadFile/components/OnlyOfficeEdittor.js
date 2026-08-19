import React, { useEffect, useRef, useState } from "react";
import api from "@services/api";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";

function loadOnlyOfficeApi(documentServerUrl) {
  return new Promise((resolve, reject) => {
    const src = `${documentServerUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;

    if (window?.DocsAPI?.DocEditor) return resolve(true);

    const existed = document.querySelector(`script[data-oo-api="1"]`);
    if (existed) {
      // nếu script đã tồn tại nhưng chưa load xong
      existed.addEventListener("load", () => resolve(true), { once: true });
      existed.addEventListener("error", reject, { once: true });
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.setAttribute("data-oo-api", "1");

    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error(`Load api.js failed: ${src}`));

    document.head.appendChild(s);
  });
}

export default function OnlyOfficeEditor({
  fileId,
  fileName,
  objectType,
  objectId,
}) {
  const [cfg, setCfg] = useState(null); // { documentServerUrl, config }
  const editorRef = useRef(null);
  const creatingRef = useRef(false);

  // wrapper chứa nhiều holder div (mỗi lần rebuild tạo div mới)
  const wrapRef = useRef(null);

  // id holder hiện tại
  const holderIdRef = useRef(null);

  const makeHolder = () => {
    if (!wrapRef.current) return null;
    const id = `oo-holder-${Math.random().toString(16).slice(2)}`;

    const div = document.createElement("div");
    div.id = id;

    // ✅ bắt buộc set size cho holder
    div.style.width = "100%";
    div.style.height = "100%"; // ✅ không dùng 100vh
    div.style.margin = "0";
    div.style.padding = "0";
    div.style.border = "0";
    div.style.flex = "1 1 auto";
    div.style.overflow = "hidden";

    wrapRef.current.appendChild(div);

    wrapRef.current.appendChild(div);
    holderIdRef.current = id;
    return id;
  };

  const destroyEditor = () => {
    try {
      // tuỳ bản: destroy hoặc destroyEditor
      editorRef.current?.destroy?.();
      editorRef.current?.destroyEditor?.();
    } catch {
      alert("Lỗi khi huỷ OnlyOffice editor");
    }
    editorRef.current = null;
  };

  const buildConfigWithEvents = (baseConfig) => {
    return {
      ...baseConfig,
      events: {
        ...(baseConfig.events || {}),

        onRequestHistory: async () => {
          const res = await api.get(`${APP_BASE}/api/files/${fileId}/history`);
          editorRef.current?.refreshHistory?.(res.data);
        },

        onRequestHistoryData: async (event) => {
          const version = event?.data;
          const res = await api.get(
            `${APP_BASE}/api/files/${fileId}/history/${version}`
          );
          editorRef.current?.setHistoryData?.(res.data);
        },

        // ✅ cách chắc chắn để thoát history: tạo holder mới + tạo editor mới
        onRequestHistoryClose: () => {
          // tránh gọi liên tiếp
          if (creatingRef.current) return;

          creatingRef.current = true;

          const oldHolderId = holderIdRef.current;

          // delay nhẹ để OO kịp đóng UI bên trong iframe
          setTimeout(() => {
            try {
              // 1) tạo holder mới
              const newHolderId = makeHolder();
              if (!newHolderId) {
                creatingRef.current = false;
                return;
              }

              // 2) destroy editor cũ
              destroyEditor();

              // 3) tạo editor mới trên holder mới (same config -> edit mode)
              editorRef.current = new window.DocsAPI.DocEditor(
                newHolderId,
                buildConfigWithEvents(baseConfig)
              );

              // 4) xóa holder cũ sau khi editor mới đã lên ổn
              if (oldHolderId) {
                setTimeout(() => {
                  const oldDiv = document.getElementById(oldHolderId);
                  oldDiv?.remove();
                }, 1500);
              }
            } finally {
              creatingRef.current = false;
            }
          }, 300);
        },
      },
    };
  };

  // 1) load config
  useEffect(() => {
    if (!fileId) return;
    api
      .get(
        `${APP_BASE}/api/files/config/${fileId}?fileName=${encodeURIComponent(fileName || "")}` +
          `&object_type=${encodeURIComponent(objectType || "")}&object_id=${encodeURIComponent(objectId || "")}`
      )
      .then((res) => setCfg(res.data))
      .catch(() => {
        alert("Không tải được cấu hình OnlyOffice");
      });
  }, [fileId, fileName, objectType, objectId]);

  // 2) init editor lần đầu / khi đổi fileId
  useEffect(() => {
    if (!cfg?.documentServerUrl || !cfg?.config) return;
    if (!wrapRef.current) return;
    if (creatingRef.current) return;
    creatingRef.current = true;

    (async () => {
      try {
        await loadOnlyOfficeApi(cfg.documentServerUrl);

        // clear wrap + reset
        wrapRef.current.innerHTML = "";
        holderIdRef.current = null;

        // tạo holder đầu tiên
        const holderId = makeHolder();
        if (!holderId) return;

        // destroy editor cũ (nếu có)
        destroyEditor();

        // build config + events
        const finalConfig = buildConfigWithEvents(cfg.config);

        // create editor
        editorRef.current = new window.DocsAPI.DocEditor(holderId, finalConfig);
      } catch (e) {
          alert(e?.message || "OnlyOffice api.js không load được");
      } finally {
        creatingRef.current = false;
      }
    })();

    return () => {
      try {
        destroyEditor();
      } catch {
        alert("Lỗi khi huỷ OnlyOffice editor");
      }
      creatingRef.current = false;
      // không cần xoá wrapRef ở đây
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg?.documentServerUrl, fileId]); // đổi fileId thì init lại

  // ✅ wrapRef là “vùng chứa” để mình tạo div holder động
  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        height: "100%", // ✅ không dùng 100vh
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    />
  );
}
