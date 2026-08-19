/**
 * Map videoType sang tiếng Việt
 */
export const VIDEO_TYPE_LABELS: Record<string, string> = {
    featured: 'Hiển thị lên trang chủ',
    normal: 'Video thường',
};

/**
 * Sort options cho FE dropdown
 * FE gửi sortBy + sortOrder, hiển thị label tiếng Việt
 */
export const VIDEO_SORT_OPTIONS = [
    { value: 'createdAt_DESC', label: 'Mới nhất', sortBy: 'createdAt', sortOrder: 'DESC' },
    { value: 'createdAt_ASC', label: 'Cũ nhất', sortBy: 'createdAt', sortOrder: 'ASC' },
    { value: 'views_DESC', label: 'Xem nhiều nhất', sortBy: 'views', sortOrder: 'DESC' },
    { value: 'views_ASC', label: 'Xem ít nhất', sortBy: 'views', sortOrder: 'ASC' },
    { value: 'likes_DESC', label: 'Thích nhiều nhất', sortBy: 'likes', sortOrder: 'DESC' },
    { value: 'title_ASC', label: 'Tiêu đề A-Z', sortBy: 'title', sortOrder: 'ASC' },
    { value: 'title_DESC', label: 'Tiêu đề Z-A', sortBy: 'title', sortOrder: 'DESC' },
];

export function getVideoTypeLabel(videoType: string | null | undefined): string | null {
    if (!videoType) return null;
    return VIDEO_TYPE_LABELS[videoType] || videoType;
}

/**
 * Format date to short format: dd/MM/yyyy
 */
export function formatDateShort(date: Date | string | null | undefined): string | null {
    if (!date) return null;

    const d = new Date(date);
    if (isNaN(d.getTime())) return null;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Map video entity với topic info để trả về response
 * @param video - Video entity
 * @param topicInfo - Thông tin topic {id, name} hoặc null
 * @param onlyTopicName - true: chỉ trả về tên (cho danh sách), false: trả về object {id, name} (cho thêm/sửa/chi tiết)
 */
export function mapVideoWithTopic(
    video: any,
    topicInfo: { id: string; name: string } | null,
    onlyTopicName: boolean = false
) {
    if (!video) return null;

    return {
        ...video,
        topic: onlyTopicName
            ? (topicInfo?.name || null)
            : (topicInfo ? { id: topicInfo.id, name: topicInfo.name } : null),
        videoType: getVideoTypeLabel(video.videoType),
        publishedDate: formatDateShort(video.createdAt) || video.publishedDate,
    };
}
