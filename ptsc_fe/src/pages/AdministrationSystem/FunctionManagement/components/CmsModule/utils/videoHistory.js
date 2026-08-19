const STORAGE_KEY = 'recently_viewed_videos';
const MAX_ITEMS = 4;
const EXPIRE_DAYS = 7;

export function saveToRecentlyViewed(video) {
    try {
        // 1. Lấy dữ liệu cũ
        let list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

        const now = new Date().getTime();

        // 2. TẠO ITEM MỚI
        // Chúng ta lưu các trường cần thiết để hiển thị lại ở VideoPage
        const newItem = {
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            duration: video.duration || "0:00",
            category: video.category || "Tin tức",
            views: video.views || "0",
            time: video.time, // Lưu string hiển thị hiện tại
            description: video.description,
            channel: video.channel,
            viewedAt: now
        };

        // 3. LỌC DỮ LIỆU
        const expireTime = EXPIRE_DAYS * 24 * 60 * 60 * 1000;

        list = list.filter(item => {
            const isDuplicate = item.id === newItem.id;
            const isExpired = (now - item.viewedAt) > expireTime;
            return !isDuplicate && !isExpired;
        });

        // 4. THÊM MỚI VÀO ĐẦU
        list.unshift(newItem);

        // 5. CẮT ĐUÔI
        if (list.length > MAX_ITEMS) {
            list = list.slice(0, MAX_ITEMS);
        }

        // 6. Lưu lại
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (error) {
        logger.error("Lỗi khi lưu lịch sử xem:", error);
    }
}

export function getRecentlyViewed() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
        logger.error("Lỗi khi lấy lịch sử xem:", error);
        return [];
    }
}
