// Hàm để Gọi dispatch nhưng nuốt lỗi (ignore error) để app không bị crash
export const safeDispatch = async (dispatch, action, name = "") => {
  try {
    return await dispatch(action);
  } catch (err) {
    logger.log(`API failed: ${name}`, err);
    return null;
  }
};
