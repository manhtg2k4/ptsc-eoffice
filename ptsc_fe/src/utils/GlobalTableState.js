// Store global state đơn giản
let globalTableState = {};
const listeners = new Set();

// Hàm cập nhật state (merge với state cũ)
export const setGlobalTableState = (newState) => {
    globalTableState = { ...globalTableState, ...newState };
    // Notify all listeners
    listeners.forEach(listener => listener(globalTableState));
};

// Hàm lấy state hiện tại
export const getGlobalTableState = () => globalTableState;

// Hàm đăng ký nhận thông báo thay đổi (dùng cho useEffect)
export const subscribeGlobalTableState = (listener) => {
    listeners.add(listener);
    // Trả về hàm cleanup
    return () => listeners.delete(listener);
};
