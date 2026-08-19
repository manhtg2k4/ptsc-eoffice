import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Box } from "@mui/material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import isoWeek from "dayjs/plugin/isoWeek";
import weekOfYear from "dayjs/plugin/weekOfYear";
import customParseFormat from "dayjs/plugin/customParseFormat";
import withSharedComponents from "@components/WrapperComponent";
import Button from "@components/CustomButton";
import { SkyGrid, SkyDialogContent } from "@styles/SkyStyles";
import { useToast } from "@components/common/ToastProvider";
import { API_GET_LEADERS } from "@EnvironmentFile/constants/urlConfig";
import PopupWarningDelete from "@pages/LeadershipDutyScheduleCalendar/components/PopupWarningDelete";
import { CustomDialog } from "@components/CustomDialog";
import { SaveButton } from "@styles/CustomDialog.styles";
import {
  ActionButtonGroup,
  DayCardItem,
  DayHeader,
  EmptyLeaderText,
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
// eslint-disable-next-line no-restricted-imports
import { leadershipDutyScheduleCalendarSchema } from "../constantsLeadershipDutyScheduleCalendar";
import { formatDataDate } from "@pages/IncomingDocumentManagement/components/constantsInDoc";
import { useDispatch } from "react-redux";
import {
  deleteLeadershipDutyRoster,
  getDataDetailLeadershipDutyRoster,
  updateDataLeadershipDutyRoster,
} from "@redux/slices/LeadershipDutyRoster/LeadershipDutyRosterSlice";
import { FormContainerGeneralInformation } from "@styles/FormList.styles";
import { SectionWrapperContainer } from "@styles/TravelWorkSchedule.styles";
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
const getWeeksInYear = (year) => {
  if (!year) return [];
  const weeks = [];
  let date = dayjs(`${year}-01-01`).startOf("isoWeek");
  const endYear = dayjs(`${year}-12-31`).endOf("isoWeek");

  while (date.isBefore(endYear) || date.isSame(endYear, "day")) {
    const weekNum = date.isoWeek();
    const startOfWeek = date.startOf("isoWeek");
    const endOfWeek = date.endOf("isoWeek");
    const label = `Tuần ${weekNum} (${startOfWeek.format("DD/MM/YYYY")} - ${endOfWeek.format("DD/MM/YYYY")})`;
    if (!weeks.some((w) => w.value === weekNum)) {
      weeks.push({
        value: weekNum,
        label: label,
        startDate: startOfWeek,
        endDate: endOfWeek,
      });
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
                  // Handle if leaderId is object or string ID
                  let leaderInfo = {};
                  if (row.leaderId && typeof row.leaderId === "object") {
                    leaderInfo = row.leaderId;
                  } else if (leaderMap && row.leaderId) {
                    leaderInfo = leaderMap[row.leaderId] || {};
                  }

                  const name = leaderInfo.name || "--";
                  const position = leaderInfo.position || "";

                  return (
                    <PreviewTableRow
                      key={row.dateValue || idx}
                      isToday={active}
                    >
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
    </CustomDialog>
  );
};

// --- MAIN COMPONENT: UPDATE ---
const UpdateLeaderDutySchedule = ({
  sharedComponents,
  onClose,
  data,
  setReloadData,
}) => {
  const scheduleId = data?.id || data?._id;
  const dispatch = useDispatch();
  const { InputComponents, AsyncAutoComplete, BaseSwipper } =
    sharedComponents || {};
  const [openPreview, setOpenPreview] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [leaderMap, setLeaderMap] = useState({});
  const previousWeekRef = useRef(null);
  const toast = useToast();

  // const handleOpenPreview = useCallback(() => {
  //   setOpenPreview(true);
  // }, []);

  const handleClosePreview = useCallback(() => {
    setOpenPreview(false);
  }, []);

  const handleCloseDeletePopup = useCallback(() => {
    setShowDeletePopup(false);
  }, []);

  // Callback to update leader map when selected
  const handleLeaderSelect = (option) => {
    if (option && option.id) {
      setLeaderMap((prev) => ({ ...prev, [option.id]: option }));
    }
  };

  // Fetch leaders list removed as AsyncAutoComplete handles it

  // Form với data giả định (Simulation)
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    getValues,
    reset,
  } = useForm({
    resolver: yupResolver(leadershipDutyScheduleCalendarSchema),
    defaultValues: {
      title: "",
      year: 2026,
      week: null,
      fromDate: null,
      toDate: null,
      scheduleDetails: [],
    },
  });
  const isEditable = useCallback(() => {
    // Lấy ngày từ fromDate (string "DD/MM/YYYY")
    const fromDateStr = getValues("fromDate");
    if (!fromDateStr) return false;

    const fromDate = dayjs(fromDateStr, "DD/MM/YYYY");
    const today = dayjs().startOf("day");

    // Chỉ cho phép chỉnh sửa nếu ngày bắt đầu của tuần >= hôm nay
    return fromDate.isSameOrAfter(today);
  }, [getValues]);

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

  // Update from/to dates and regenerate schedule details when changing week selection
  useEffect(() => {
    // Only regenerate if week actually changed (not on initial load)
    if (previousWeekRef.current === null) {
      // First time setting week, just track it
      previousWeekRef.current = selectedWeekId;
      return;
    }

    // Check if week actually changed
    if (previousWeekRef.current === selectedWeekId) {
      return;
    }

    // Update previous week reference
    previousWeekRef.current = selectedWeekId;

    if (selectedWeekId && weekOptions.length > 0) {
      const selectedWeekData = weekOptions.find(
        (w) => w.value === selectedWeekId
      );
      if (selectedWeekData) {
        // Update dates
        setValue("fromDate", formatDataDate(selectedWeekData.startDate));
        setValue("toDate", formatDataDate(selectedWeekData.endDate));

        // Regenerate schedule details for the new week
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
    }
  }, [selectedWeekId, weekOptions, setValue, replace]);

  // Logic giả lập load data khi vào trang Edit
  // Load data from API
  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      if (!scheduleId) return;
      try {
        const data = await dispatch(
          getDataDetailLeadershipDutyRoster(scheduleId)
        ).unwrap();
        logger.log("Data", data);
        if (data && data.details) {
          const newLeaderMap = {};
          const mappedDetails = data.details.map((d) => {
            // Populate leader map for Preview
            const leaderObj =
              d.leader && d.leader.id
                ? {
                  id: d.leader.id,
                  name: d.leader.name,
                  position: d.leader.position || "",
                }
                : null;

            if (leaderObj) {
              newLeaderMap[leaderObj.id] = leaderObj;
            }

            return {
              id: d.id, // API returns "id" in details
              dayName: d.dayOfWeek?.name || "",
              dateValue: d.dutyDate
                ? dayjs(d.dutyDate, "DD/MM/YYYY", true).isValid()
                  ? d.dutyDate
                  : dayjs(d.dutyDate).format("DD/MM/YYYY")
                : "",
              leaderId: leaderObj, // Store full object instead of just ID
              note: d.notes,
            };
          });

          setLeaderMap((prev) => ({ ...prev, ...newLeaderMap }));

          // Derive fromDate and toDate from details
          const dutyDates = mappedDetails
            .map((d) => d.dateValue)
            .filter(Boolean)
            .map((s) => dayjs(s, "DD/MM/YYYY"));

          let minDate = null;
          let maxDate = null;
          if (dutyDates.length > 0) {
            minDate = dutyDates.reduce((min, date) =>
              date.isBefore(min) ? date : min
            );
            maxDate = dutyDates.reduce((max, date) =>
              date.isAfter(max) ? date : max
            );
          }

          // Helper to get safe date string
          const getSafeDateStr = (val) => {
            if (!val) return null;
            if (dayjs(val, "DD/MM/YYYY", true).isValid()) return val; // Already formatted
            const d = dayjs(val);
            if (d.isValid()) return d.format("DD/MM/YYYY"); // ISO or other parseable
            return null;
          };

          const validFromDate = getSafeDateStr(data.fromDate);
          const validToDate = getSafeDateStr(data.toDate);

          reset({
            title: data.title,
            year: data.year,
            week: data.week,
            fromDate: validFromDate || (minDate ? formatDataDate(minDate) : null),
            toDate: validToDate || (maxDate ? formatDataDate(maxDate) : null),
            scheduleDetails: mappedDetails,
          });
        }
      } catch (error) {
        // console.error('Error loading schedule:', error);

        toast(error?.message || "Không thể tải thông tin kế hoạch trực", "error");
      }
    };
    loadData();
  }, [scheduleId, reset, toast, dispatch]);

  const handleUpdate = async (data) => {
    if (!isEditable()) {
      toast("Không cho phép chỉnh sửa kế hoạch trực trong quá khứ!", "error");
      return;
    }
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
        // fromDate: data.fromDate,
        // toDate: data.toDate,
        scheduleDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        scheduleTime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        details: data.scheduleDetails.map((detail) => {
          const { dutyDate, dayOfWeek } = toDutyPayloadDate(detail.dateValue);

          // Extract leader ID from object or string
          const leaderIdVal =
            detail.leaderId && detail.leaderId.id
              ? detail.leaderId.id
              : detail.leaderId;

          return {
            dutyDate: dutyDate,
            dayOfWeek: dayOfWeek,
            leaderId: leaderIdVal || null,
            notes: detail.note || "",
          };
        }),
      };

      // Call API (using mock ID for now, should come from props/route)
      const updateId = scheduleId || "LDS_1737370000000_ABCD1234";
      // await updateLeadershipDutySchedule(updateId, payload);
      await dispatch(
        updateDataLeadershipDutyRoster({ data: payload, id: updateId })
      ).unwrap();

      toast("Cập nhật kế hoạch trực thành công!", "success");
      if (setReloadData) setReloadData();
      if (onClose) onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error updating schedule:", error);
      toast(error?.response?.data?.message || error?.response?.message || error?.message || "Có lỗi xảy ra khi cập nhật kế hoạch trực!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const deleteId = scheduleId || "LDS_1737370000000_ABCD1234";
      // await deleteLeadershipDutySchedule(deleteId);
      await dispatch(deleteLeadershipDutyRoster(deleteId)).unwrap();

      toast("Xóa kế hoạch trực thành công!", "success");
      if (setReloadData) setReloadData();
      setShowDeletePopup(false);
      if (onClose) onClose();
    } catch (error) {
      logger.log("Error deleting schedule:", error);
      toast(
        error?.response?.data?.message || "Có lỗi xảy ra khi xóa kế hoạch trực!",
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <BaseSwipper
      title="Chỉnh sửa kế hoạch trực chỉ huy"
      open
      onClose={onClose}
      onSave={handleSubmit(handleUpdate)}
      type="edit"
      moreActions={
        <ActionButtonGroup>
          <Button
            variant="primary"
            onClick={handleSubmit(handleUpdate)}
            disabled={isSubmitting || isDeleting}
          >
            {isSubmitting ? "ĐANG XỬ LÝ..." : "LƯU"}
          </Button>
        </ActionButtonGroup>
      }
    >
      <FormContainerGeneralInformation>
        <SectionWrapperContainer>
          <SectionHeader>
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
              {/* Year and Week */}
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
                      fullWidth
                    />
                  )}
                />
              </SkyGrid>

              {/* From/To dates */}
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
            {/* <Button variant="primary" onClick={handleOpenPreview}>
            XEM TRƯỚC
          </Button> */}
          </SectionHeader>
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
                      render={({ field, fieldState: { error } }) => (
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
                          helperText={error?.message}
                          size="small"
                          fullWidth
                          limit={20}
                          returnObject
                          isSearchText
                        />
                      )}
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
        </SectionWrapperContainer>
      </FormContainerGeneralInformation>
      <PreviewModal
        open={openPreview}
        onClose={handleClosePreview}
        data={getValues("scheduleDetails")}
        leaderMap={leaderMap}
      />
      <PopupWarningDelete
        open={showDeletePopup}
        onClose={handleCloseDeletePopup}
        onConfirm={handleDelete}
        title={getValues("title")}
        isLoading={isDeleting}
      />
    </BaseSwipper>
  );
};

export default withSharedComponents(UpdateLeaderDutySchedule);
