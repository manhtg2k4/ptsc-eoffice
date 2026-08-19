export const normalizeApiData = (data, permission) => {
  return {
    ...data,
    permissions: permission || null,
    order: data?.order ? Number(data?.order) : null,
    roleGroupIds: Array.isArray(data?.roleGroupIds)
      ? data.roleGroupIds.map((item) => (typeof item === "object" ? item?.id || item?._id : item))
      : [],
  };
};
