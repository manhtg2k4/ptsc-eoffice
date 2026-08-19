const cache = new Map();
const inFlight = new Map();

export const getCachedAuthBlob = (url) => {
    return cache.get(url);
};

export const setCachedAuthBlob = (url, blobUrl) => {
    cache.set(url, blobUrl);
};

export const getInFlightPromise = (url) => {
    return inFlight.get(url);
};

export const setInFlightPromise = (url, promise) => {
    if (promise) {
        inFlight.set(url, promise);
    } else {
        inFlight.delete(url);
    }
};
