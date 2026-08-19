import * as yup from "yup";
import dayjs from "dayjs";

// Helper to normalize option value from various shapes
const getOptionValue = (option) => {
  if (option && typeof option === "object") {
    return (
      option.value ??
      option.code ??
      option.key ??
      option.id ??
      option.name ??
      option.label ??
      ""
    );
  }
  return option ?? "";
};

export const travelWorkSchedulesSchema = yup.object({
  // Luôn required
  scheduleType: yup.mixed().required("Vui lòng chọn loại công tác"),
  leader: yup.object().nullable().required("Vui lòng chọn lãnh đạo công tác"),

  // SingleDay fields
  workDate: yup
    .date()
    .nullable()
    .when("scheduleType", {
      is: (val) => getOptionValue(val) === "singleDay",
      then: (schema) =>
        schema
          .required("Vui lòng chọn ngày công tác")
          .typeError("Ngày không hợp lệ"),
      otherwise: (schema) => schema.notRequired(),
    }),

  // calendarFormat - required khi singleDay
  calendarFormat: yup.string().when("scheduleType", {
    is: (val) => getOptionValue(val) === "singleDay",
    then: (schema) =>
      schema.required("Vui lòng chọn hình thức lịch"),
    otherwise: (schema) => schema.notRequired(),
  }),

  // Morning fields - non-mandatory
  morningLocation: yup.string().notRequired(),

  morningContent: yup.string().notRequired(),

  // Afternoon fields - non-mandatory
  afternoonLocation: yup.string().notRequired(),

  afternoonContent: yup.string().notRequired(),

  // Location & Content - required khi singleDay + fullDay
  location: yup.string().when(["scheduleType", "calendarFormat"], {
    is: (st, cf) =>
      getOptionValue(st) === "singleDay" && getOptionValue(cf) === "fullDay",
    then: (schema) =>
      schema
        .required("Vui lòng nhập địa điểm công tác")
        .trim()
        .min(1, "Địa điểm công tác không được để trống"),
    otherwise: (schema) => schema.notRequired(),
  }),

  content: yup.string().when(["scheduleType", "calendarFormat"], {
    is: (st, cf) =>
      getOptionValue(st) === "singleDay" && getOptionValue(cf) === "fullDay",
    then: (schema) =>
      schema
        .required("Vui lòng nhập nội dung công tác")
        .trim()
        .min(1, "Nội dung công tác không được để trống"),
    otherwise: (schema) => schema.notRequired(),
  }),

  // MultiDay fields
  fromDate: yup
    .date()
    .nullable()
    .when("scheduleType", {
      is: (val) => getOptionValue(val) === "multiDay",
      then: (schema) =>
        schema
          .required("Vui lòng chọn ngày bắt đầu")
          .typeError("Ngày không hợp lệ"),
      otherwise: (schema) => schema.notRequired(),
    }),

  toDate: yup
    .date()
    .nullable()
    .when("scheduleType", {
      is: (val) => getOptionValue(val) === "multiDay",
      then: (schema) =>
        schema
          .required("Vui lòng chọn ngày kết thúc")
          .typeError("Ngày không hợp lệ")
          .min(
            yup.ref("fromDate"),
            "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu"
          ),
      otherwise: (schema) => schema.notRequired(),
    }),

  travelSchedule: yup.string().when("scheduleType", {
    is: (val) => getOptionValue(val) === "multiDay",
    then: (schema) => schema.required("Vui lòng chọn lịch trình công tác"),
    otherwise: (schema) => schema.notRequired(),
  }),

  // Schedules array for multiDay
  schedules: yup
    .array()
    .when(["scheduleType", "travelSchedule"], ([st, ts], schema) => {
      const scheduleTypeValue = getOptionValue(st);
      const travelScheduleValue = getOptionValue(ts);

      if (scheduleTypeValue !== "multiDay") return schema.notRequired();

      return schema
        .of(
          yup.object({
            numDays:
              travelScheduleValue === "nhieulich"
                ? yup.string().required("Vui lòng chọn số ngày")
                : yup.string().notRequired(),
            format:
              travelScheduleValue === "nhieulich"
                ? yup.string().when("numDays", {
                    is: "motngay",
                    then: (s) => s.required("Vui lòng chọn hình thức"),
                    otherwise: (s) => s.notRequired(),
                  })
                : yup.string().notRequired(),
            date:
              travelScheduleValue === "nhieulich"
                ? yup
                    .date()
                    .nullable()
                    .when("numDays", {
                      is: "motngay",
                      then: (s) =>
                        s
                          .required("Vui lòng chọn ngày")
                          .typeError("Ngày không hợp lệ"),
                      otherwise: (s) => s.notRequired(),
                    })
                : yup.date().nullable().notRequired(),
            fromDate:
              travelScheduleValue === "nhieulich" ||
              travelScheduleValue === "motlich"
                ? yup
                    .date()
                    .nullable()
                    .when("numDays", {
                      is: (nd) =>
                        (travelScheduleValue === "nhieulich" &&
                          nd === "nhieungay") ||
                        travelScheduleValue === "motlich",
                      then: (s) =>
                        s
                          .required("Vui lòng chọn ngày bắt đầu")
                          .typeError("Ngày không hợp lệ"),
                      otherwise: (s) => s.notRequired(),
                    })
                : yup.date().nullable().notRequired(),
            toDate:
              travelScheduleValue === "nhieulich" ||
              travelScheduleValue === "motlich"
                ? yup
                    .date()
                    .nullable()
                    .when("numDays", {
                      is: (nd) =>
                        (travelScheduleValue === "nhieulich" &&
                          nd === "nhieungay") ||
                        travelScheduleValue === "motlich",
                      then: (s) =>
                        s
                          .required("Vui lòng chọn ngày kết thúc")
                          .typeError("Ngày không hợp lệ")
                          .min(
                            yup.ref("fromDate"),
                            "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu"
                          ),
                      otherwise: (s) => s.notRequired(),
                    })
                : yup.date().nullable().notRequired(),
            location: yup.string().when(["numDays", "format"], {
              is: (nd, f) =>
                (travelScheduleValue === "nhieulich" && nd === "nhieungay") ||
                (travelScheduleValue === "nhieulich" &&
                  nd === "motngay" &&
                  f === "fullDay") ||
                travelScheduleValue === "motlich",
              then: (s) =>
                s
                  .required("Vui lòng nhập địa điểm")
                  .trim()
                  .min(1, "Vui lòng nhập địa điểm"),
              otherwise: (s) => s.notRequired(),
            }),
            content: yup.string().when(["numDays", "format"], {
              is: (nd, f) =>
                (travelScheduleValue === "nhieulich" && nd === "nhieungay") ||
                (travelScheduleValue === "nhieulich" &&
                  nd === "motngay" &&
                  f === "fullDay") ||
                travelScheduleValue === "motlich",
              then: (s) =>
                s
                  .required("Vui lòng nhập nội dung")
                  .trim()
                  .min(1, "Vui lòng nhập nội dung"),
              otherwise: (s) => s.notRequired(),
            }),
            morningLocation: yup.string().notRequired(),
            morningContent: yup.string().notRequired(),
            afternoonLocation: yup.string().notRequired(),
            afternoonContent: yup.string().notRequired(),
          })
        )
        .min(1, "Vui lòng thêm ít nhất một lịch trình")
        .test(
          "no-overlaps",
          "Vui lòng kiểm tra lịch trình công tác các lịch trình đang bị trùng ngày",
          (schedules) => {
            if (!schedules || schedules.length <= 1) return true;

            const ranges = schedules
              .map((s) => {
                let start, end;
                if (s.numDays === "motngay") {
                  if (!s.date) return null;
                  start = dayjs(s.date).startOf("day");
                  end = dayjs(s.date).endOf("day");
                } else {
                  if (!s.fromDate || !s.toDate) return null;
                  start = dayjs(s.fromDate).startOf("day");
                  end = dayjs(s.toDate).endOf("day");
                }
                return { start, end };
              })
              .filter((r) => r && r.start.isValid() && r.end.isValid());

            for (let i = 0; i < ranges.length; i++) {
              for (let j = i + 1; j < ranges.length; j++) {
                const r1 = ranges[i];
                const r2 = ranges[j];
                if (!r1 || !r2) continue;
                // Overlap if (start1 <= end2) && (start2 <= end1)
                if (!r1.start.isAfter(r2.end) && !r2.start.isAfter(r1.end)) {
                  return false;
                }
              }
            }
            return true;
          }
        );
    }),
});
