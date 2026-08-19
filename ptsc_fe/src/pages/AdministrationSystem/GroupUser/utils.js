export const normalizeApiData = (data) => {
    return {
      ...data,
      organizationUnits: Array.isArray(data.organizationUnits)
      ? data.organizationUnits
      : data.organizationUnits ? [data.organizationUnits] :[]
    };
  };