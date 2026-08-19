import * as yup from "yup";

export const leadershipDutyScheduleCalendarSchema = yup.object({
  title: yup
    .string()
    .transform((value) => value.trim())
    .max(500, "Tiêu đề lịch tối đa 500 ký tự")
    .required("Vui lòng nhập tiêu đề lịch"),
  year: yup.number().required("Năm không được để trống"),
  week: yup.number().required("Tuần không được để trống"),
  scheduleDetails: yup.array().of(
  yup.object({
    leaderId: yup
      .mixed()
      .required("Vui lòng chọn lãnh đạo trực"),
  })
)});
