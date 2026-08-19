/**
 * Helper functions for Album Images module
 */

/**
 * Map albumType sang tiếng Việt
 */
export const ALBUM_TYPE_LABELS: Record<string, string> = {
  featured: 'Nổi bật',
  normal: 'Album thường',
};

/**
 * Sort options cho FE dropdown
 * FE gửi sortBy + sortOrder, hiển thị label tiếng Việt
 */
export const ALBUM_SORT_OPTIONS = [
  { value: 'createdAt_DESC', label: 'Mới nhất', sortBy: 'createdAt', sortOrder: 'DESC' },
  { value: 'createdAt_ASC', label: 'Cũ nhất', sortBy: 'createdAt', sortOrder: 'ASC' },
  { value: 'views_DESC', label: 'Xem nhiều nhất', sortBy: 'views', sortOrder: 'DESC' },
  { value: 'views_ASC', label: 'Xem ít nhất', sortBy: 'views', sortOrder: 'ASC' },
  { value: 'title_ASC', label: 'Tiêu đề A-Z', sortBy: 'title', sortOrder: 'ASC' },
  { value: 'title_DESC', label: 'Tiêu đề Z-A', sortBy: 'title', sortOrder: 'DESC' },
];

export function getAlbumTypeLabel(albumType: string | null | undefined): string | null {
  if (!albumType) return null;
  return ALBUM_TYPE_LABELS[albumType] || albumType;
}

/**
 * Format date to Vietnamese format: dd/MM/yyyy HH:mm:ss
 */
export function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
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
 * Map album entity to response format with formatted dates
 */
export function mapAlbumResponse(album: any) {
  return {
    ...album,
    albumType: getAlbumTypeLabel(album.albumType),
    publishedDate: formatDateShort(album.createdAt),
  };
}

/**
 * Map album với topic info (dùng khi đã có topic info)
 * @param album - Album entity
 * @param topicInfo - Thông tin topic {id, name} hoặc null
 * @param onlyTopicName - true: chỉ trả về tên (cho danh sách), false: trả về object {id, name} (cho thêm/sửa/chi tiết)
 */
export function mapAlbumWithTopic(
  album: any, 
  topicInfo?: { id: string; name: string } | null,
  onlyTopicName: boolean = false
) {
  const response = mapAlbumResponse(album);
  
  if (topicInfo) {
    response.topic = onlyTopicName 
      ? topicInfo.name 
      : { id: topicInfo.id, name: topicInfo.name };
  } else {
    response.topic = null;
  }
  
  return response;
}
