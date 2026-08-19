import { API_FILES_VIEW } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";
import defaultThumbnail from "@assets/imgBackground/image_thumbail.png";

/**
 * Common utility to get image URL based on size and fallback logic
 * @param {Object} item - The news item object or object containing sizes
 * @param {string} size - 'small' | 'medium' | 'big'
 * @returns {string} - The URL of the image
 */

export const DEFAULT_NEWS_THUMBNAIL = defaultThumbnail;

/**
 * Append ?public=true to a URL only if not already present.
 */
export const withPublic = (url) => {
    if (!url) return url;
    if (url.includes("public=true")) return url;
    return url.includes("?") ? `${url}&public=true` : `${url}?public=true`;
};

export const getImageUrl = (item, size = "medium") => {
    if (!item) return DEFAULT_NEWS_THUMBNAIL;

    // Type video, image or album with specific thumbnail file id
    if ((item.type === "video" || item.type === "image" || item.type === "album") && item.thumbnailFileId) {
        return withPublic(`${API_FILES_VIEW}/${item.thumbnailFileId}`);
    }

    // Priority 1: Sized images from API (sizeSmall, sizeMedium, sizeBig)
    const sizeKey = size === "small" ? "sizeSmall" : size === "big" ? "sizeBig" : "sizeMedium";
    const sizedImage = item[sizeKey];

    if (sizedImage && (sizedImage.id || sizedImage.url)) {
        // If we have an ID, we use the standard view URL
        if (sizedImage.id) {
            return withPublic(`${API_FILES_VIEW}/${sizedImage.id}`);
        }
        // If we only have URL and it's relative
        if (sizedImage.url) {
            if (sizedImage.url.startsWith("http")) return sizedImage.url;
            // Heuristic: if it's from API, it might need prefixing,
            // but usually the sizedImage.id is preferred if available.
            return withPublic(`${API_FILES_VIEW}/${sizedImage.id}`);
        }
    }

    // Priority 2: Fallback to the generic 'files' array if sizes not found
    if (item.files && item.files.length > 0) {
        return withPublic(`${API_FILES_VIEW}/${item.files[0].id}`);
    }

    // Priority 3: Fallback to nameThumbnail
    const isValidUrl = (url) => typeof url === 'string' && (url.startsWith('http') || url.startsWith('/'));
    if (isValidUrl(item.nameThumbnail)) {
        return item.nameThumbnail;
    }

    // Priority 4: Extract from content HTML
    if (item.content) {
        const imgMatch = item.content.match(/src="([^"]+)"/);
        if (imgMatch) return imgMatch[1];
    }

    // Default Fallback
    return DEFAULT_NEWS_THUMBNAIL;
};

/**
 * Returns a srcset string for responsive images
 * @param {Object} item - The news item object
 * @returns {Object} - Object containing src and srcSet
 */
export const getResponsiveImage = (item) => {
    const small = getImageUrl(item, "small");
    const medium = getImageUrl(item, "medium");
    const big = getImageUrl(item, "big");

    return {
        src: medium,
        srcSet: `${small} 400w, ${medium} 800w, ${big} 1200w`,
        sizes: "(max-width: 767px) 400px, (max-width: 1024px) 800px, 1200px"
    };
};
