import dayjs from "dayjs";

export const toDutyPayloadDate = (dateValue) => {
  const parsed = dayjs(dateValue, "DD/MM/YYYY", true);
  if (!parsed.isValid()) {
    return {
      dutyDate: dateValue,
      dayOfWeek: 0,
    };
  }

  return {
    dutyDate: parsed.format("YYYY-MM-DD"),
    dayOfWeek: parsed.day() + 1, // 1=CN ... 7=T7
  };
};
