import React from "react";
// import { CODE_PERMISSION, ACCEPT } from "../EnvironmentFile/urlConfig";

// const IconSettings = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

// export const getSidebarMenu = (setIsPreview, user) => {
//   const menuItems = [];

//   // Check permission for "Cấu hình trang tin tức"
//   const hasConfigPermission = user?.roleDetail?.data?.staticPermissions?.some(
//     (p) => p.code === process.env.NEXT_PUBLIC_CODE || p.code === CODE_PERMISSION || p.code === ACCEPT || p.code === process.env.NEXT_PUBLIC_ACCEPT
//   );

//   if (true) {
//     menuItems.push({
//       label: "Cấu hình trang",
//       icon: <IconSettings />,
//       action: () => setIsPreview(false)
//     });
//   }

//   return menuItems;
// };

export function ConfigSidebar({ isOpen, onClose, menuItems }) {
  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.3)", zIndex: 9998,
            animation: "fadeIn 0.2s"
          }}
        >
          <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
      )}

      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(280px, 85vw)", background: "#fff",
        boxShadow: "-2px 0 10px rgba(0,0,0,0.1)",
        zIndex: 9999,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease-in-out",
        padding: "clamp(12px, 4vw, 20px)",
        display: "flex", flexDirection: "column"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(16px, 5vw, 30px)", borderBottom: "1px solid #eee", paddingBottom: 15 }}>
          <h3 style={{ margin: 0, color: "#333", fontSize: "clamp(16px, 5vw, 20px)" }}>Chủ đề</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#666" }}>&times;</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          {menuItems.map((item, index) => (
            <div
              key={index}
              onClick={item.action}
              style={{
                padding: "clamp(8px, 3vw, 12px) clamp(10px, 4vw, 15px)",
                background: "#f0f7ff",
                borderRadius: 8,
                cursor: "pointer",
                color: "#1976d2",
                fontWeight: 500,
                display: "flex", alignItems: "center", gap: 10,
                fontSize: "clamp(13px, 4vw, 14px)"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{item.icon}</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}