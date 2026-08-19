import { globalComponentRegistry, getComponentByKey } from "@builder-table/components/componentRegistry";
import { openDetailDialog } from "@components/GlobalDialogPortal";

/**
 * Tìm kiếm động Component Key phù hợp nhất từ key do BE trả về
 * @param {string} beKey - Key do Backend hoặc URL truyền vào
 * @returns {string|null} - Component Key khớp trong registry hoặc null
 */
export const findComponentKeyDynamically = (beKey) => {
  if (!beKey) return null;

  // Lấy danh sách các key được đăng ký thực tế
  const registryKeys = Object.keys(globalComponentRegistry);

  // 1. Chuẩn hóa để so sánh chính xác trước (loại bỏ hoa thường và dấu gạch)
  const cleanKey = (str) => str.toLowerCase().replace(/[-_]/g, "");
  const normalizedBe = cleanKey(beKey);

  for (const regKey of registryKeys) {
    if (cleanKey(regKey) === normalizedBe) {
      return regKey;
    }
  }

  // 2. So sánh từ vựng tương đồng (Fuzzy Word Overlap)
  const normalizeWords = (str) => {
    return str
      .toLowerCase()
      .replace(/[-_]/g, " ")
      .replace(/\bdocs?\b/g, "document")
      .replace(/\bincomming\b/g, "incoming")
      .replace(/\bincoming-documents\b/g, "incoming document")
      .replace(/\bprocess\b/g, "processing")
      .split(/\s+/)
      .filter(Boolean);
  };

  const beWords = normalizeWords(beKey);
  let bestKey = null;
  let highestScore = 0;

  for (const regKey of registryKeys) {
    const regWords = normalizeWords(regKey);
    
    // Tính toán số lượng từ trùng lặp
    let matchCount = 0;
    beWords.forEach(beW => {
      if (regWords.some(regW => regW.includes(beW) || beW.includes(regW))) {
        matchCount++;
      }
    });

    if (matchCount > 0) {
      // Tính điểm theo tỉ lệ từ trùng khớp
      let score = (matchCount / Math.max(beWords.length, regWords.length)) * 100;
      
      // Ưu tiên màn hình VIEW (xem chi tiết) khi điều hướng từ Deep Link
      if (regKey.startsWith("VIEW_")) {
        score += 10;
      }

      if (score > highestScore) {
        highestScore = score;
        bestKey = regKey;
      }
    }
  }

  // Chấp nhận khớp nếu điểm tương đồng >= 30%
  return highestScore >= 30 ? bestKey : null;
};

/**
 * Xử lý điều hướng thông báo và deep link chung
 * @param {object} notification - Đối tượng thông báo chứa {key, recordId, link, type, content, isVanThuCuc}
 * @param {function} navigate - Hàm navigate của react-router-dom
 * @returns {boolean} - Kết quả xử lý thành công hay không
 */
export const navigateNotification = (notification, navigate) => {
  if (!notification) return false;
  const logger = console;

  const { key, recordId, link, type, content, isVanThuCuc } = notification;

  // Tìm kiếm động key phù hợp
  const mappedKey = findComponentKeyDynamically(key);

  if (mappedKey === "CHAT" && recordId) {
    window.dispatchEvent(
      new CustomEvent("open-chat-conversation", {
        detail: { conversationId: recordId },
      })
    );
    return true;
  }

  if ((mappedKey === "VIEW_NEWS_COMMENT" || mappedKey === "NEWS_DETAIL_VIEW") && link) {
    if (navigate) {
      navigate(link);
      return true;
    }
  }

  const normalizedContent = content?.toLowerCase() || "";
  let handled = false;

  const additionalProps = {
    isFromNotification: true,
  };
  
  if (link && link.includes('?')) {
    try {
      const queryString = link.split('?')[1];
      const searchParams = new URLSearchParams(queryString);
      for (const [key, value] of searchParams.entries()) {
        additionalProps[key] = value;
      }
    } catch (e) {
      logger.error("Error parsing link query params", e);
    }
  }

  if (isVanThuCuc !== undefined) {
    additionalProps.isVanThuCuc = isVanThuCuc;
  }

  if (key === "STAT_CARD_DETAIL_DIALOG" || mappedKey === "STAT_CARD_DETAIL_DIALOG") {
    additionalProps.statBlock = {
      code: "delay",
      label: "Danh sách công việc chậm tiến độ",
    };
  }

  if (mappedKey && recordId) {
    const componentInfo = getComponentByKey(mappedKey);
    if (componentInfo) {
      openDetailDialog(componentInfo, recordId, additionalProps);
      handled = true;
    }
  }

  // Fallback cho tin tức
  if (!handled && (type === "news" || normalizedContent.includes("tin tức")) && recordId) {
    const componentInfo = getComponentByKey("VIEW_NEWS");
    if (componentInfo) {
      openDetailDialog(componentInfo, recordId, additionalProps);
      handled = true;
    }
  }

  return handled;
};
