import { useCallback } from "react";

export function useAttachmentClick(onFileClick) {
  return useCallback(
    (event) => {
      const target = event.target.closest("a.file-attachment-link, a[href*='/api/files/view/']");
      if (target) {
        event.preventDefault();
        event.stopPropagation();
        const href = target.getAttribute("href");
        const fileName = target.textContent?.trim() || "Tài liệu";
        if (onFileClick) {
          onFileClick({ href, fileName, event });
        }
      }
    },
    [onFileClick]
  );
}
