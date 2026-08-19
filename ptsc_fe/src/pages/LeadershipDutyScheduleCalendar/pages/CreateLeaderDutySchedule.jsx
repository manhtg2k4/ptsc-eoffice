import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box } from "@mui/material";
// import { styled } from "@mui/material/styles";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import isoWeek from "dayjs/plugin/isoWeek";
import weekOfYear from "dayjs/plugin/weekOfYear";
import customParseFormat from "dayjs/plugin/customParseFormat";

// --- MOCK WRAPPERS ---
import withSharedComponents from "@components/WrapperComponent";
// import Swipper from "@components/Swipper";
import Button from "@components/CustomButton";
import {
  SkyGrid,
  SkyDialogContent,
  SkyDialogActions,
  // SkyBox,
  // SkyTypography,
} from "@styles/SkyStyles";
import { useToast } from "@components/common/ToastProvider";
import { API_GET_LEADERS } from "@EnvironmentFile/constants/urlConfig";
import {
  // CancelButton,
  SaveButton,
} from "@styles/CustomDialog.styles";
import { CustomDialog } from "@components/CustomDialog";
import { formatDataDate } from "@pages/IncomingDocumentManagement/components/constantsInDoc";
// eslint-disable-next-line no-restricted-imports
import { leadershipDutyScheduleCalendarSchema } from "../constantsLeadershipDutyScheduleCalendar";
import {
  ActionButtonGroup,
  // Container,
  DayCardItem,
  DayHeader,
  EmptyLeaderText,
  EmptyStateBox,
  PreviewLeaderInfo,
  PreviewLeaderName,
  PreviewLeaderPosition,
  PreviewNoteCell,
  PreviewTable,
  PreviewTableCell,
  PreviewTableContainer,
  PreviewTableHead,
  PreviewTableRow,
  PreviewTh150,
  PreviewTh30Pct,
  PreviewThAuto,
  // SectionHeader,
  SectionTitle,
} from "@styles/LeadershipDutyScheduleCalendar.styles";
import { useDispatch } from "react-redux";
import { postDataLeadershipDutyRoster } from "@redux/slices/LeadershipDutyRoster/LeadershipDutyRosterSlice";
import { FormContainerGeneralInformation } from "@styles/FormList.styles";
import {
  SectionWrapperContainer,
} from "@styles/TravelWorkSchedule.styles";
import { FormLabel } from "@styles/BaseSwiper/BaseSwiper.style";
import { IconRequied } from "@styles/UploadFile/UploadFile.style";
import { StyledHeaderContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import { SectionHeader } from "@styles/ThemeConfig.styles";
import { toDutyPayloadDate } from "@pages/LeadershipDutyScheduleCalendar/utils/dutyDate";

// Config dayjs
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(customParseFormat);
dayjs.locale("vi");

// --- DATA & HELPERS ---
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: currentYear - 1 + i,
  label: `Năm ${currentYear - 1 + i}`,
}));
// const MONTHS = Array.from({ length: 12 }, (_, i) => ({
//   value: i + 1,
//   label: `Tháng ${i + 1}`,
// }));

const getWeeksInYear = (year) => {
  if (!year) return [];
  const weeks = [];
  let date = dayjs(`${year}-01-01`).startOf("isoWeek");
  const endYear = dayjs(`${year}-12-31`).endOf("isoWeek");

  while (date.isBefore(endYear) || date.isSame(endYear, "day")) {
    const weekNum = date.isoWeek();
    const startOfWeek = date.startOf("isoWeek");
    const endOfWeek = date.endOf("isoWeek");

    // Only include weeks that belong to the selected year
    if (startOfWeek.year() === year || endOfWeek.year() === year) {
      const label = `Tuần ${weekNum} (${startOfWeek.format("DD/MM/YYYY")} - ${endOfWeek.format("DD/MM/YYYY")})`;
      if (!weeks.some((w) => w.value === weekNum)) {
        weeks.push({
          value: weekNum,
          label: label,
          startDate: startOfWeek,
          endDate: endOfWeek,
        });
      }
    }
    date = date.add(1, "week");
  }
  return weeks;
};

// --- SUB-COMPONENT: PREVIEW MODAL ---
const PreviewModal = ({ open, onClose, data, leaderMap }) => {
  // Helper check today
  const isToday = (dateStr) =>
    dayjs(dateStr, "DD/MM/YYYY").isSame(dayjs(), "day");

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title="Xem trước kế hoạch trực chỉ huy"
      disableSave
      disabledClose
      type="add"
      size="md"
      customButtons={<SaveButton onClick={onClose}>Đóng</SaveButton>}
    >
      <SkyDialogContent>
        <PreviewTableContainer>
          <PreviewTable>
            <PreviewTableHead>
              <tr>
                <PreviewTh150>THỨ</PreviewTh150>
                <PreviewTh150>NGÀY</PreviewTh150>
                <PreviewTh30Pct>LÃNH ĐẠO TRỰC</PreviewTh30Pct>
                <PreviewThAuto>GHI CHÚ</PreviewThAuto>
              </tr>
            </PreviewTableHead>
            <tbody>
              {data &&
                data.map((row, idx) => {
                  const active = isToday(row.dateValue);
                  const leaderInfo = leaderMap?.[row.leaderId] || {};
                  const name = leaderInfo.name || "--";
                  const position = leaderInfo.position || "";

                  return (
                    <PreviewTableRow key={idx} isToday={active}>
                      <PreviewTableCell bold active={active ? 1 : 0}>
                        {row.dayName}
                      </PreviewTableCell>
                      <PreviewTableCell bold active={active ? 1 : 0}>
                        {row.dateValue}
                      </PreviewTableCell>
                      <PreviewTableCell>
                        {row.leaderId ? (
                          <PreviewLeaderInfo>
                            {position && (
                              <PreviewLeaderPosition>
                                {position}
                              </PreviewLeaderPosition>
                            )}
                            <PreviewLeaderName>{name}</PreviewLeaderName>
                          </PreviewLeaderInfo>
                        ) : (
                          <EmptyLeaderText>--</EmptyLeaderText>
                        )}
                      </PreviewTableCell>
                      <PreviewNoteCell>
                        {row.note || "Không có ghi chú..."}
                      </PreviewNoteCell>
                    </PreviewTableRow>
                  );
                })}
            </tbody>
          </PreviewTable>
        </PreviewTableContainer>
      </SkyDialogContent>
      <SkyDialogActions>
        <Button variant="primary" onClick={onClose}>
          Đóng
        </Button>
      </SkyDialogActions>
    </CustomDialog>
  );
};

// --- MAIN COMPONENT: CREATE ---
const CreateLeaderDutySchedule = ({
  sharedComponents,
  onClose,
  setReloadData,
}) => {
  const {
    InputComponents,
    // AsyncAutoCompleted,
    AsyncAutoComplete,
    BaseSwipper,
  } = sharedComponents || {};
  const dispatch = useDispatch();
  const [openPreview, setOpenPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderMap, setLeaderMap] = useState({});
  const toast = useToast();

  // Callback to update leader map when selected
  const handleLeaderSelect = (option) => {
    if (option && option.id) {
      setLeaderMap((prev) => ({ ...prev, [option.id]: option }));
    }
  };

  // const handleOpenPreview = useCallback(() => {
  //   setOpenPreview(true);
  // }, []);

  const handleClosePreview = useCallback(() => {
    setOpenPreview(false);
  }, []);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    getValues,
  } = useForm({
    resolver: yupResolver(leadershipDutyScheduleCalendarSchema),
    defaultValues: {
      title: "",
      year: currentYear,
      week: null,
      fromDate: null,
      toDate: null,
      scheduleDetails: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "scheduleDetails",
  });
  const selectedYear = watch("year");
  const selectedWeekId = watch("week");

  const weekOptions = useMemo(
    () => getWeeksInYear(selectedYear),
    [selectedYear]
  );

  useEffect(() => {
    if (
      selectedWeekId &&
      !weekOptions.find((w) => w.value === selectedWeekId)
    ) {
      setValue("week", null);
      setValue("fromDate", null);
      setValue("toDate", null);
      replace([]);
    }
  }, [selectedYear, weekOptions, selectedWeekId, setValue, replace]);

  useEffect(() => {
    if (selectedWeekId && weekOptions.length > 0) {
      const selectedWeekData = weekOptions.find(
        (w) => w.value === selectedWeekId
      );
      if (selectedWeekData) {
        const currentTitle = watch("title");
        if (!currentTitle)
          setValue(
            "title",
            `Lịch trực chỉ huy tuần ${selectedWeekId} năm ${selectedYear}`
          );

        // Set fromDate and toDate
        setValue("fromDate", formatDataDate(selectedWeekData.startDate));
        setValue("toDate", formatDataDate(selectedWeekData.endDate));
        // setValue("fromDate", selectedWeekData.startDate.format("YYYY-MM-DD"));
        // setValue("toDate", selectedWeekData.endDate.format("YYYY-MM-DD"));

        const days = [];
        let currentDay = selectedWeekData.startDate;
        for (let i = 0; i < 7; i++) {
          const dayName = currentDay.format("dddd");
          const capitalizedDay =
            dayName.charAt(0).toUpperCase() + dayName.slice(1);
          days.push({
            dayName: capitalizedDay,
            dateValue: formatDataDate(currentDay),
            leaderId: null,
            note: "",
          });
          currentDay = currentDay.add(1, "day");
        }
        replace(days);
      }
    } else {
      replace([]);
    }
  }, [selectedWeekId, weekOptions, replace, selectedYear, setValue, watch]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: data.title,
        week: data.week,
        year: data.year,
        fromDate: data.fromDate
          ? dayjs(data.fromDate, "DD/MM/YYYY").format("YYYY-MM-DD HH:mm:ss")
          : null,
        toDate: data.toDate
          ? dayjs(data.toDate, "DD/MM/YYYY").format("YYYY-MM-DD HH:mm:ss")
          : null,
        scheduleDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        scheduleTime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        // weekContent: weekContent,
        details: data.scheduleDetails.map((detail) => {
          const { dutyDate, dayOfWeek } = toDutyPayloadDate(detail.dateValue);

          return {
            dutyDate: dutyDate,
            dayOfWeek: dayOfWeek,
            leaderId: detail.leaderId || null,
            notes: detail.note || "",
          };
        }),
      };
      // logger.log("Payload tạo lịch trực ban lãnh đạo:", payload);
      await dispatch(postDataLeadershipDutyRoster(payload)).unwrap();
      toast("Tạo kế hoạch trực thành công!", "success");
      setReloadData(new Date() * 1);
      if (onClose) onClose();
    } catch (error) {
      // logger.log("Lỗi khi thêm mới lịch trực:", error);
      toast(error?.response?.data?.message || error?.response?.message || error?.message || "Có lỗi xảy ra khi tạo kế hoạch trực!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseSwipper
      title="Tạo kế hoạch trực chỉ huy"
      open
      onClose={onClose}
      onSave={handleSubmit(onSubmit)}
      type="add"
      moreActions={
        <ActionButtonGroup>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "ĐANG XỬ LÝ..." : "Lưu"}
          </Button>
          {/* <CancelButton
            variant="outlined"
            onClick={onClose}
            disabled={isSubmitting}
          >
            HỦY
          </CancelButton> */}
        </ActionButtonGroup>
      }
    >
      <FormContainerGeneralInformation>
        <SectionWrapperContainer>
          {/* <SectionHeader>
            <SectionTitle>Thông tin chung</SectionTitle>
					</SectionHeader> */}
          <SectionHeader>
            {/* <SectionHeaderIcon /> */}
            <StyledHeaderContent variant="h6" noWrap>Thông tin chung</StyledHeaderContent>
          </SectionHeader>
          <SectionWrapperContainer>
            <SkyGrid container spacing={3}>
              <SkyGrid item xs={12} md={6}>
                <FormLabel>Tiêu đề lịch<IconRequied component="span">*</IconRequied></FormLabel>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      {...field}
                      // label="Tiêu đề lịch"
                      required
                      fullWidth
                      error={!!errors.title}
                      helperText={errors.title?.message}
                    />
                  )}
                />
              </SkyGrid>
              <SkyGrid item xs={6} md={3}>
                <FormLabel>Năm<IconRequied component="span">*</IconRequied></FormLabel>
                <Controller
                  name="year"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      {...field}
                      select
                      // label="Năm"
                      required
                      options={YEARS}
                      fullWidth
                      disabled
                    />
                  )}
                />
              </SkyGrid>

              {/* Tuần */}
              <SkyGrid item xs={6} md={3}>
                <FormLabel>Tuần<IconRequied component="span">*</IconRequied></FormLabel>
                <Controller
                  name="week"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      {...field}
                      select
                      // label="Tuần"
                      required
                      options={weekOptions}
                      disabled={weekOptions.length === 0}
                      fullWidth
                      error={!!errors.week}
                      helperText={errors.week?.message}
                    />
                  )}
                />
              </SkyGrid>

              <SkyGrid item xs={12} md={6}>
                <FormLabel>Từ ngày</FormLabel>
                <Controller
                  name="fromDate"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      {...field}
                      // label="Từ ngày"
                      fullWidth
                      disabled
                    />
                  )}
                />
              </SkyGrid>

              <SkyGrid item xs={12} md={6}>
                <FormLabel>Đến ngày</FormLabel>
                <Controller
                  name="toDate"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      {...field}
                      // label="Đến ngày"
                      fullWidth
                      disabled
                    />
                  )}
                />
              </SkyGrid>
            </SkyGrid>
          </SectionWrapperContainer>
          <SectionHeader>
            <SectionTitle>Thông tin lịch chi tiết</SectionTitle>
            {/* {selectedWeekId && (
              <Button variant="primary" onClick={handleOpenPreview}>
                XEM TRƯỚC
              </Button>
            )} */}
          </SectionHeader>
          <React.Fragment>
            {!selectedWeekId ? (
              <EmptyStateBox>
                Vui lòng chọn tuần để thực hiện lập kế hoạch trực chỉ huy.
              </EmptyStateBox>
            ) : (
              <Box>
                {fields.map((item, index) => (
                  <DayCardItem key={item.id}>
                    <DayHeader>
                      {item.dayName}, {item.dateValue}
                    </DayHeader>
                    <SkyGrid container spacing={3}>
                      <SkyGrid item xs={12} md={5}>
                        <FormLabel>Lãnh đạo trực<IconRequied component="span">*</IconRequied></FormLabel>
                        <Controller
                          name={`scheduleDetails.${index}.leaderId`}
                          control={control}
                          render={({ field, fieldState: { error } }) => {
                            // logger.log("Field leaderId:", field, error);
                            return (
                              <AsyncAutoComplete
                                {...field}
                                // label="Lãnh đạo trực"
                                placeholder="Tìm kiếm lãnh đạo"
                                url={API_GET_LEADERS}
                                queryParam="name"
                                optionLabel="name"
                                optionValue="id"
                                selectedOptions={handleLeaderSelect}
                                required
                                error={!!error}
                                heplText={error?.message}
                                size="small"
                                fullWidth
                                limit={20}
                                returnObject={false}
                                isSearchText
                              />
                            );
                          }}
                        />
                      </SkyGrid>
                      <SkyGrid item xs={12} md={7}>
                        <FormLabel>Ghi chú</FormLabel>
                        <Controller
                          name={`scheduleDetails.${index}.note`}
                          control={control}
                          render={({ field }) => (
                            <InputComponents
                              {...field}
                              // label="Ghi chú"
                              placeholder="Nhập ghi chú..."
                              fullWidth
                              size="small"
                            />
                          )}
                        />
                      </SkyGrid>
                    </SkyGrid>
                  </DayCardItem>
                ))}
              </Box>
            )}
          </React.Fragment>
        </SectionWrapperContainer>
      </FormContainerGeneralInformation>
      <PreviewModal
        open={openPreview}
        onClose={handleClosePreview}
        data={getValues("scheduleDetails")}
        leaderMap={leaderMap}
      />
    </BaseSwipper>
  );
};

export default withSharedComponents(CreateLeaderDutySchedule);
