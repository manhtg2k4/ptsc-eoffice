import React, { useEffect, useMemo } from "react";
import { Modal, Grid } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import dayjs from "dayjs";
import {
  ModalContainer,
  ModalTitle,
  FormLabel,
  ActionButtons,
  CancelButton,
  ApplyButton,
  // RadioGroupRow,
} from "@pages/MeetingCalendar/componentStyle/RecurringMeetingConfigModal.styles";

const RecurringMeetingConfigModal = ({
  open,
  onClose,
  onSave,
  type,
  initialData,
  sharedComponents,
}) => {
  const { InputComponents, DateTimePicker } = sharedComponents;

  const schema = useMemo(() => {
    const today = dayjs().startOf('day');
    return yup.object().shape({
      // form: yup.string().required("Vui lòng chọn hình thức lặp"),
      ...(type === "WEEKLY" && {
        daysOfWeek: yup.string().required("Vui lòng chọn ngày"),
        repeatDate: yup.date().nullable().when("form", {
          is: "finity",
          then: (schema) => schema.required("Vui lòng chọn ngày lặp lại").typeError("Ngày lặp lại không hợp lệ").min(today, "Ngày lặp lại không được ở quá khứ"),
          otherwise: (schema) => schema.nullable(),
        }),
      }),
       ...(type === "DAILY" && {
        repeatDates: yup.date().nullable().when("form", {
          is: "finity",
          then: (schema) => schema.required("Vui lòng chọn ngày lặp lại").typeError("Ngày lặp lại không hợp lệ").min(today, "Ngày lặp lại không được ở quá khứ"),
          otherwise: (schema) => schema.nullable(),
        }),
      }),

      ...((type === "QUARTER" || type === "QUARTERLY") && {
        monthInQuarter: yup.string().required("Vui lòng chọn tháng trong quý"),
        repeatDate: yup.date().nullable().when("form", {
          is: "finity",
          then: (schema) => schema.required("Vui lòng chọn ngày lặp lại").typeError("Ngày lặp lại không hợp lệ").min(today, "Ngày lặp lại không được ở quá khứ"),
          otherwise: (schema) => schema.nullable(),
        }),
      }),
      ...(type === "CUSTOM" && {
        interval: yup.string().required("Vui lòng nhập số ngày lặp lại"),
        repeatDate: yup.date().nullable().when("form", {
          is: "finity",
          then: (schema) => schema.required("Vui lòng chọn ngày lặp lại").typeError("Ngày lặp lại không hợp lệ").min(today, "Ngày lặp lại không được ở quá khứ"),
          otherwise: (schema) => schema.nullable(),
        }),
      }),
      ...(type === "YEARLY" && {
        // interval: yup.date().nullable().required("Vui lòng chọn năm kết thúc lặp").typeError("Năm kết thúc lặp không hợp lệ"),
      }),
      endDate: yup.date().nullable().when("form", {
        is: "finity",
        then: (schema) => type === "MONTHLY" ? schema.required("Vui lòng chọn ngày kết thúc").typeError("Ngày kết thúc không hợp lệ").min(today, "Tháng kết thúc không được ở quá khứ") : schema.nullable(),
        otherwise: (schema) => schema.nullable(),
      }),
      endYear: yup.string().nullable().when("form", {
        is: "finity",
        then: (schema) => type === "YEARLY" ? schema.required("Vui lòng chọn năm kết thúc") : schema.nullable(),
        otherwise: (schema) => schema.nullable(),
      }),
    });
  }, [type]);
  
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      interval: 1,
      form: "finity", // 'finity' | 'infinity'
      daysOfMonth: "",
      monthInQuarter: "",
      endDate: null,
      repeatDate: null, 
      endYear: null,
      repeatDates: null,
      daysOfWeek: "",
    },
  });

  const formType = watch("form");

  useEffect(() => {
    if (open) {
      reset({
        interval: initialData?.interval || 1,
        form: initialData?.form || "finity",
        daysOfMonth: initialData?.daysOfMonth?.[0] || "",
        monthInQuarter: initialData?.monthInQuarter?.[0] || "",
        endDate: initialData?.endDate ? dayjs(initialData.endDate) : null,
        repeatDate: initialData?.endDate ? dayjs(initialData.endDate) : null,
        endYear: initialData?.endYear || null,
        repeatDates: initialData?.endDate ? dayjs(initialData.endDate) : null,
        daysOfWeek: initialData?.daysOfWeek?.[0] ? Number(initialData.daysOfWeek[0]) : "",
      });
    }
  }, [open, initialData, reset]);

  const getTitle = () => {
    switch (type) {
      case "DAILY": 
        return "Cấu hình lịch họp lặp lại (Hằng ngày)";
      case "WEEKLY":
        return "Cấu hình lịch họp lặp lại (Tuần)";
      case "MONTHLY":
        return "Cấu hình lịch họp lặp lại (Tháng)";
      case "QUARTERLY": // Fallback
        return "Cấu hình lịch họp lặp lại (Quý)";
      case "YEARLY":
        return "Cấu hình lịch họp lặp lại (Năm)";
      case "CUSTOM":
        return "Cấu hình lịch họp lặp lại (Tùy chỉnh)";
      default:
        return "Cấu hình lịch họp lặp lại";
    }
  };

  const onSubmit = (data) => {
    const result = {
      ...data,
      daysOfMonth: data.daysOfMonth ? [data.daysOfMonth] : [],
      monthInQuarter: data.monthInQuarter ? [data.monthInQuarter] : [],
      daysOfWeek: data.daysOfWeek ? [data.daysOfWeek] : [],
      type: type,
    };
    // Map repeatDate back to startDate for YEARLY if needed, or handle in parent
    if (type === "YEARLY" && data.repeatDate) {
      result.startDate = data.repeatDate;
    }
    
    // Ensure endDate is null if infinity
    if (data.form === "infinity") {
      result.endDate = null;
      result.endYear = null;
    }
    
    // Map repeatDate/repeatDates to endDate if form is finity
    if (data.form === "finity") {
      if (type === "DAILY" && data.repeatDates) {
        result.endDate = data.repeatDates;
      } else if ((type === "WEEKLY" || type === "CUSTOM" || type === "QUARTER" || type === "QUARTERLY") && data.repeatDate) {
        result.endDate = data.repeatDate;
      }
    }

    onSave(result);
  };

  const handleIntervalKeyDown = (e) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
    }
  };

  // const daysOptions = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, title: `Ngày ${i + 1}` }));
  const monthInQuarterOptions = [
    { value: 1, title: "Tháng đầu quý" },
    { value: 2, title: "Tháng giữa quý" },
    { value: 3, title: "Tháng cuối quý" },
  ];
  
  const daysOfWeekOptions = [
    { value: 2, title: "Thứ 2" },
    { value: 3, title: "Thứ 3" },
    { value: 4, title: "Thứ 4" },
    { value: 5, title: "Thứ 5" },
    { value: 6, title: "Thứ 6" },
    { value: 7, title: "Thứ 7" },
    { value: 8, title: "Chủ nhật" }, // Or value 1/0 depending on backend conventions, using 8 commonly in VN contexts or 1 for CN
  ];

  // Generating Next 10 Years for End Year options
  const currentYear = dayjs().year();
  const yearOptions = Array.from({ length: 11 }, (_, i) => ({ value: currentYear + i, title: `${currentYear + i}` }));

  return (
    <Modal open={open} onClose={onClose}>
      <ModalContainer>
        <ModalTitle>{getTitle()}</ModalTitle>
        
        <Grid container spacing={2}>
          {/* CONTENT BASED ON TYPE */}
          
          {/* WEEKLY */}
          {type === "WEEKLY" && (
            <Grid item xs={12}>
              <FormLabel>Ngày <span className="required">*</span></FormLabel>
              <Controller
                name="daysOfWeek" 
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    // multiple
                    options={daysOfWeekOptions}
                    customLabel="title"
                    customValue="value"
                    placeholder="Ngày trong tuần"
                    {...field}
                    error={!!errors.daysOfWeek}
                    helperText={errors.daysOfWeek?.message}
                  />
                )}
              />
            </Grid>
          )}

          {/* MONTHLY */}
          {/* {type === "MONTHLY" && (
            <Grid item xs={12}>
              <FormLabel>Ngày <span className="required">*</span></FormLabel>
              <Controller
                name="daysOfMonth"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    options={daysOptions}
                    customLabel="title"
                    customValue="value"
                    placeholder="Ngày trong tháng"
                    {...field}
                    error={!!errors.daysOfMonth}
                    helperText={errors.daysOfMonth?.message}
                  />
                )}
              />
            </Grid>
          )} */}

          {/* QUARTERLY */}
          {(type === "QUARTER" || type === "QUARTERLY") && (
            <Grid item xs={12}>
              <FormLabel>Tháng trong quý <span className="required">*</span></FormLabel>
              <Controller
                name="monthInQuarter"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    options={monthInQuarterOptions}
                    customLabel="title"
                    customValue="value"
                    placeholder="Tháng trong quý"
                    {...field}
                    error={!!errors.monthInQuarter}
                    helperText={errors.monthInQuarter?.message}
                  />
                )}
              />
            </Grid>
          )}

          {/* CUSTOM */}
          {type === "CUSTOM" && (
            <Grid item xs={12}>
              <FormLabel>Lặp lại sau mỗi <span className="required">*</span></FormLabel>
              <Controller
                name="interval"
                control={control}
                render={({ field }) => {
                  const handleIntervalChange = (e) => {
                    const val = e.target ? e.target.value : e;
                    if (val === "") {
                      field.onChange("");
                      return;
                    }
                    const numVal = parseInt(val, 10);
                    if (!isNaN(numVal) && numVal < 1) {
                      field.onChange(1);
                    } else {
                      field.onChange(val);
                    }
                  };

                  return (
                    <InputComponents
                      type="number"
                      placeholder="Lặp lại sau ngày"
                      {...field}
                      inputProps={{ min: 1 }}
                      min={1}
                      onKeyDown={handleIntervalKeyDown}
                      onChange={handleIntervalChange}
                      error={!!errors.interval}
                      helperText={errors.interval?.message}
                    />
                  );
                }}
              />
            </Grid>
          )}

          {/* YEARLY */}
        

          {/* HÌNH THỨC LẶP (Common for all) */}
          {/* <Grid item xs={12}>
            <FormLabel>Hình thức lặp <span className="required">*</span></FormLabel>
            <Controller
              name="form"
              control={control}
              render={({ field }) => (
                <>
                  <RadioGroupRow>
                    <RadioGroup row {...field}>
                      <FormControlLabel value="finity" control={<Radio />} label="Hữu hạn" />
                      <FormControlLabel value="infinity" control={<Radio />} label="Vô hạn" />
                    </RadioGroup>
                  </RadioGroupRow>
                  {errors.form && <FormHelperText error>{errors.form.message}</FormHelperText>}
                </>
              )}
            />
          </Grid> */}

          {/* END DATE / END YEAR (Based on form type) */}
          {formType === "finity" && (
            <Grid item xs={12}>
              {type === "YEARLY" ? (
                 <>
                   <FormLabel>Năm kết thúc lặp <span className="required">*</span></FormLabel>
                   <Controller
                    name="endYear"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        select
                        options={yearOptions}
                        customLabel="title"
                        customValue="value"
                        placeholder="YYYY"
                        {...field}
                        error={!!errors.endYear}
                        helperText={errors.endYear?.message}
                      />
                    )}
                  />
                 </>
              ) : type === "MONTHLY" ? (
                  <>
                    <FormLabel>Lặp lại đến tháng <span className="required">*</span></FormLabel>
                     <Controller
                      name="endDate"
                      control={control}
                      render={({ field }) => (
                        <DateTimePicker
                          placeholder="MM - YYYY"
                          value={field.value}
                          onChange={field.onChange}
                          showTime={false}
                          views={['year', 'month']}
                          format="MM/YYYY"
                          minDate={dayjs().startOf('month')}
                          error={!!errors.endDate}
                          helperText={errors.endDate?.message}
                        />
                      )}
                    />
                  </>
              ) : type === "DAILY" ? (
                  <>
                    <FormLabel>Lặp lại đến <span className="required">*</span></FormLabel>
                     <Controller
                      name="repeatDates"
                      control={control}
                      render={({ field }) => (
                        <DateTimePicker
                          placeholder="DD - MM - YYYY"
                          value={field.value}
                          onChange={field.onChange}
                          showTime={false}
                          minDate={dayjs().startOf('day')}
                          error={!!errors.repeatDates}
                          helperText={errors.repeatDates?.message}
                        />
                      )}
                    />
                  </> ): (
                <>
                  <FormLabel>Lặp lại đến ngày <span className="required">*</span></FormLabel>
                   <Controller
                    name="repeatDate"
                    control={control}
                    render={({ field }) => (
                      <DateTimePicker
                        placeholder="DD - MM - YYYY"
                        value={field.value}
                        onChange={field.onChange}
                        showTime={false}
                        minDate={dayjs().startOf('day')}
                        error={!!errors.repeatDate}
                        helperText={errors.repeatDate?.message}
                      />
                    )}
                  />
                </>
              )}
            </Grid>
          )}
        </Grid>

        <ActionButtons>
          <CancelButton onClick={onClose}>Hủy</CancelButton>
          <ApplyButton onClick={handleSubmit(onSubmit)}>Áp dụng</ApplyButton>
        </ActionButtons>
      </ModalContainer>
    </Modal>
  );
};

export default RecurringMeetingConfigModal;
