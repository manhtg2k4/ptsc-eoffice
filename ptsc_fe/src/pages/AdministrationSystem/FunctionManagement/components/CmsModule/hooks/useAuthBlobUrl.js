import { useState, useEffect } from 'react';
import { getCachedAuthBlob, setCachedAuthBlob, getInFlightPromise, setInFlightPromise } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/utils/authImageCache';

export default function useAuthBlobUrl(src) {
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

        if (finalSrc.startsWith('data:') || finalSrc.startsWith('blob:')) {
            setBlobUrl(finalSrc);
            return;
        }

        // 1. Check cache first
        const cached = getCachedAuthBlob(finalSrc);
        if (cached) {
            setBlobUrl(cached);
            return;
        }

        let isMounted = true;

        const fetchMedia = async () => {
            // 2. Check if already fetching
            const inFlight = getInFlightPromise(finalSrc);
            if (inFlight) {
                try {
                    const result = await inFlight;
                    if (isMounted) setBlobUrl(result);
                    return;
                } catch (e) {
                    // if in-flight fails, we'll try again below or fallback
                }
            }

            const fetchPromise = (async () => {
                try {
                    const token = localStorage.getItem('token');
                    const headers = {};
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }

                    const response = await fetch(finalSrc, {
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

        fetchMedia();

        return () => {
            isMounted = false;
            // Note: We no longer revokeObjectURL here because we are caching it globally
            // to avoid re-fetching on every slide change.
        };
    }, [src]);

    return blobUrl || src;
}
