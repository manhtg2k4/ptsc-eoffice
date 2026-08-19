
export const saveForm = (CODE, data) => {
  const raw = localStorage.getItem('viewConfigs');
  const viewConfigs = raw ? JSON.parse(raw) : {};
  viewConfigs[CODE] = data;
  localStorage.setItem('viewConfigs', JSON.stringify(viewConfigs));
};
export const loadForm = async (CODE) => {
  try {
    const raw = localStorage.getItem('viewConfigs');
    const viewConfigs = raw ? JSON.parse(raw) : {};
    return viewConfigs[CODE] || [];
  } catch {
    return [];
  }
};
