export const normalizeApiData = (data, permission) => {
  return {
    ...data,
    order: data.order ? Number(data.order) : 0,
    permissions: permission || null,
  };
};
