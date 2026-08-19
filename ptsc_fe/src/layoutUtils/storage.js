const KEY = 'fb-demo-form';

export const saveForm = (data) => {
  localStorage.setItem(KEY, JSON.stringify(data));
};

export const loadForm = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
