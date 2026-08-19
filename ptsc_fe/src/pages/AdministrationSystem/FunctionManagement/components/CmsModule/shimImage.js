import React, { useState, useEffect } from 'react';
import { checkAndRefreshToken } from '@services/tokenRefresh';
import { getCachedAuthBlob, setCachedAuthBlob, getInFlightPromise, setInFlightPromise } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/utils/authImageCache';

const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// eslint-disable-next-line no-unused-vars
const Image = ({ src, alt, width, height, customClassName, className, customStyle, style, srcSet, sizes, ...props }) => {
    const [blobUrl, setBlobUrl] = useState(null);

    useEffect(() => {
        let finalSrc = src;
        if (typeof src === 'object' && src?.src) {
            finalSrc = src.src;
        }

        if (!finalSrc) {
            setBlobUrl(null);
            return;
        }

        // Bỏ qua nếu là chuỗi base64 hoặc blob url sẵn có
        if (finalSrc.startsWith('data:') || finalSrc.startsWith('blob:')) {
            setBlobUrl(finalSrc);
            return;
        }

        // Kiểm tra xem có phải URL file nội bộ của backend cần Authorization header không
        const isInternalApiUrl = () => {
            try {
                if (finalSrc.startsWith('/api/') || finalSrc.startsWith('api/')) return true;
                if (finalSrc.startsWith('/') && !finalSrc.startsWith('//')) return false; // Static asset như /logotc.png
                const parsed = new URL(finalSrc, window.location.origin);
                if (parsed.pathname.includes('/files/view') || parsed.pathname.includes('/api/files')) return true;
                return false;
            } catch (e) {
                return false;
            }
        };

        // Nếu là ảnh ngoài (external URL như postimg, cdn...) hoặc static asset thì load trực tiếp bằng thẻ img
        if (!isInternalApiUrl()) {
            setBlobUrl(finalSrc);
            return;
        }

        // 1. Check cache
        const cached = getCachedAuthBlob(finalSrc);
        if (cached) {
            setBlobUrl(cached);
            return;
        }

        let isMounted = true;

        const fetchImage = async () => {
            // 2. Check in-flight
            const inFlight = getInFlightPromise(finalSrc);
            if (inFlight) {
                try {
                    const result = await inFlight;
                    if (isMounted) setBlobUrl(result);
                    return;
                } catch (e) {
                    // ignore and try again
                }
            }

            const fetchPromise = (async () => {
                try {
                    // Chủ động refresh token nếu sắp hết hạn
                    await checkAndRefreshToken();

                    const token = localStorage.getItem('token');
                    const headers = {};
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }

                // Tạo đối tượng URL từ finalSrc
                let urlWithParams;
                try {
                    // Check if finalSrc is a full URL
                    if (finalSrc.startsWith('http')) {
                        urlWithParams = new URL(finalSrc);
                    } else {
                        // Handle relative URL by using a base (the origin)
                        urlWithParams = new URL(finalSrc, window.location.origin);
                    }

                    // Sử dụng set thay vì append để tránh trùng lặp tham số public=true
                    urlWithParams.searchParams.set('public', 'true');
                } catch (urlError) {
                    logger.error("Invalid URL in shimImage:", finalSrc);
                }

                const response = await fetch(urlWithParams.toString(), {
                    method: 'GET',
                    headers,
                });

                    if (response.ok) {
                        const blob = await response.blob();
                        const objectUrl = URL.createObjectURL(blob);
                        setCachedAuthBlob(finalSrc, objectUrl);
                        return objectUrl;
                    }
                    return finalSrc;
                } catch (error) {
                    return finalSrc;
                }
            })();

            setInFlightPromise(finalSrc, fetchPromise);

            try {
                const result = await fetchPromise;
                if (isMounted) setBlobUrl(result);
            } finally {
                setInFlightPromise(finalSrc, null);
            }
        };

        fetchImage();

        return () => {
            isMounted = false;
        };
    }, [src]);

    return (
        <img 
            src={blobUrl || TRANSPARENT_PIXEL} 
            alt={alt} 
            width={width} 
            height={height} 
            className={className || customClassName} 
            style={style || customStyle}
            {...props} 
        />
    );
};

export default Image;
