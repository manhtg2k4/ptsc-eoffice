import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box } from "@mui/material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import isoWeek from "dayjs/plugin/isoWeek";
import weekOfYear from "dayjs/plugin/weekOfYear";
import customParseFormat from "dayjs/plugin/customParseFormat";

// --- MOCK WRAPPERS ---
import withSharedComponents from "@components/WrapperComponent";
import { SkyGrid } from "@styles/SkyStyles";
import { useToast } from "@components/common/ToastProvider";

// --- API SERVICE ---
import { deleteLeadershipDutySchedule } from "@services/leadershipDutyScheduleService";
import { API_GET_LEADERS } from "@EnvironmentFile/constants/urlConfig";

// --- COMPONENTS ---
// --- COMPONENTS ---
import PopupWarningDelete from "@pages/LeadershipDutyScheduleCalendar/components/PopupWarningDelete";
import UpdateLeaderDutySchedule from "./UpdateLeaderDutySchedule";
import { CancelButton } from "@styles/CustomDialog.styles";
// eslint-disable-next-line no-restricted-imports
import { leadershipDutyScheduleCalendarSchema } from "../constantsLeadershipDutyScheduleCalendar";
import {
  ActionButtonGroup,
  DayCardItem,
  DayHeader,
} from "@styles/LeadershipDutyScheduleCalendar.styles";
import { formatDataDate } from "@pages/IncomingDocumentManagement/components/constantsInDoc";
import { useDispatch } from "react-redux";
import { getDataDetailLeadershipDutyRoster } from "@redux/slices/LeadershipDutyRoster/LeadershipDutyRosterSlice";
import { FormContainerGeneralInformation } from "@styles/FormList.styles";
import { SectionWrapperContainer } from "@styles/TravelWorkSchedule.styles";
import { SectionHeader, SectionHeaderIcon } from "@styles/ThemeConfig.styles";
import withFormWrapper from "@components/common/FormWrapper";
import { StyledHeaderContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";

// Config dayjs
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(customParseFormat);
dayjs.locale("vi");

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

// --- MAIN COMPONENT: UPDATE ---
const ViewLeaderDutySchedule = ({
  sharedComponents,
  onClose,
  data,
  setReloadData,
}) => {
  const scheduleId = data?.id || data?._id;
  const dispatch = useDispatch();
  const {
    AsyncAutoComplete: BaseAsyncAutoComplete,
    InputComponents: BaseInput,
    BaseSwipper,
    ButtonOutline
  } = sharedComponents || {};

  const isView = true;
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput, isView]);

  const AsyncAutoComplete = useMemo(() => {
    const Wrapped = withFormWrapper(BaseAsyncAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
    Component.displayName = "AsyncAutoComplete";
    return Component;
  }, [BaseAsyncAutoComplete, isView]);

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, setLeaderMap] = useState({});
  const toast = useToast();

  const handleOpenDeletePopup = useCallback(() => {
    setShowDeletePopup(true);
  }, []);

  const handleCloseDeletePopup = useCallback(() => {
    setShowDeletePopup(false);
  }, []);

  // Form với data giả định (Simulation)
  const {
    control,
    watch,
    formState: { errors },
    getValues,
    reset,
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

  const { fields } = useFieldArray({ control, name: "scheduleDetails" });
  const selectedYear = watch("year");
  const weekOptions = useMemo(
    () => getWeeksInYear(selectedYear),
    [selectedYear]
  );

  // Load data from API
  const loadData = useCallback(async () => {
    if (!scheduleId) return;
    try {
      const responseData = await dispatch(
        getDataDetailLeadershipDutyRoster(scheduleId)
      ).unwrap();
      logger.log("Data", responseData);
      if (responseData && responseData.details) {
        const newLeaderMap = {};
        const mappedDetails = responseData.details.map((d) => {
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

        // Derive fromDate and toDate from details (renamed mapping constant to avoid ambiguity)
        const dutyDatesList = mappedDetails
          .map((d) => d.dateValue)
          .filter(Boolean)
          .map((s) => dayjs(s, "DD/MM/YYYY"));

        let minDate = null;
        let maxDate = null;
        if (dutyDatesList.length > 0) {
          minDate = dutyDatesList.reduce((min, date) =>
            date.isBefore(min) ? date : min
          );
          maxDate = dutyDatesList.reduce((max, date) =>
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

        const validFromDate = getSafeDateStr(responseData.fromDate);
        const validToDate = getSafeDateStr(responseData.toDate);

        reset({
          title: responseData.title,
          year: responseData.year,
          week: responseData.week,
          fromDate: validFromDate || (minDate ? formatDataDate(minDate) : null),
          toDate: validToDate || (maxDate ? formatDataDate(maxDate) : null),
          scheduleDetails: mappedDetails,
        });
      }
    } catch (error) {
      // console.error('Error loading schedule:', error);

      toast(error?.message || "Không thể tải thông tin lịch trực", "error");
    }
  }, [scheduleId, dispatch, reset, toast]);

  // Track if we should load data based on props
  useEffect(() => {
    if (data && data.details && data.details.length > 0) {
      // If props data already has details, we process and fill the form directly
      const newLeaderMap = {};
      const mappedDetails = data.details.map((d) => {
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
          id: d.id,
          dayName: d.dayOfWeek?.name || "",
          dateValue: d.dutyDate
            ? dayjs(d.dutyDate, "DD/MM/YYYY", true).isValid()
              ? d.dutyDate
              : dayjs(d.dutyDate).format("DD/MM/YYYY")
            : "",
          leaderId: leaderObj,
          note: d.notes,
        };
      });

      setLeaderMap((prev) => ({ ...prev, ...newLeaderMap }));

      const dutyDatesList = mappedDetails
        .map((d) => d.dateValue)
        .filter(Boolean)
        .map((s) => dayjs(s, "DD/MM/YYYY"));

      let minDate = null;
      let maxDate = null;
      if (dutyDatesList.length > 0) {
        minDate = dutyDatesList.reduce((min, date) => (date.isBefore(min) ? date : min));
        maxDate = dutyDatesList.reduce((max, date) => (date.isAfter(max) ? date : max));
      }

      const getSafeDateStr = (val) => {
        if (!val) return null;
        if (dayjs(val, "DD/MM/YYYY", true).isValid()) return val;
        const d = dayjs(val);
        if (d.isValid()) return d.format("DD/MM/YYYY");
        return null;
      };

      reset({
        title: data.title,
        year: data.year,
        week: data.week,
        fromDate: getSafeDateStr(data.fromDate) || (minDate ? formatDataDate(minDate) : null),
        toDate: getSafeDateStr(data.toDate) || (maxDate ? formatDataDate(maxDate) : null),
        scheduleDetails: mappedDetails,
      });
    } else {
      loadData();
    }
  }, [scheduleId, data, loadData, reset]); // Simplified effect dependency to avoid double trigger if data object changes

  const handleReload = useCallback(() => {
    if (setReloadData) setReloadData();
    // loadData();
  }, [setReloadData]);

  const handleCloseUpdatePopup = useCallback(() => {
    setShowUpdatePopup(false);
  }, []);

  const handleEdit = () => {
    setShowUpdatePopup(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const deleteId = scheduleId || "LDS_1737370000000_ABCD1234";
      await deleteLeadershipDutySchedule(deleteId);

      toast("Xóa kế hoạch trực thành công!", "success");
      if (setReloadData) setReloadData();
      setShowDeletePopup(false);
      if (onClose) onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error deleting schedule:", error);
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
      title="Xem kế hoạch trực chỉ huy"
      open
      onClose={onClose}
      type="view"
      moreActions={
        <ActionButtonGroup>
          <ButtonOutline variant="outlined" onClick={handleEdit}>
            CHỈNH SỬA
          </ButtonOutline>

          <CancelButton
            variant="contained"
            onClick={handleOpenDeletePopup}
            disabled={isDeleting}
          >
            XÓA
          </CancelButton>
        </ActionButtonGroup>
      }
    >
      <FormContainerGeneralInformation>
        <SectionWrapperContainer>
          <SectionHeader>
            <SectionHeaderIcon />
            <StyledHeaderContent variant="h6" noWrap>Thông tin chung</StyledHeaderContent>
          </SectionHeader>
          <SectionWrapperContainer>
            <SkyGrid container spacing={3}>
              <SkyGrid item xs={12} md={6}>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      {...field}
                      label="Tiêu đề lịch"
                      required
                      fullWidth
                      error={!!errors.title}
                      disabled
                    />
                  )}
                />
              </SkyGrid>
              <SkyGrid item xs={6} md={3}>
                <Controller
                  name="year"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      {...field}
                      select
                      label="Năm"
                      required
                      options={YEARS}
                      fullWidth
                      disabled
                    />
                  )}
                />
              </SkyGrid>
              <SkyGrid item xs={6} md={3}>
                <Controller
                  name="week"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      {...field}
                      select
                      label="Tuần"
                      required
                      options={weekOptions}
                      fullWidth
                      disabled
                    />
                  )}
                />
              </SkyGrid>
              <SkyGrid item xs={12} md={6}>
                <Controller
                  name="fromDate"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      {...field}
                      label="Từ ngày"
                      fullWidth
                      disabled
                    />
                  )}
                />
              </SkyGrid>
              <SkyGrid item xs={12} md={6}>
                <Controller
                  name="toDate"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      {...field}
                      label="Đến ngày"
                      fullWidth
                      disabled
                    />
                  )}
                />
              </SkyGrid>
            </SkyGrid>
          </SectionWrapperContainer>
          <SectionHeader>
            <SectionHeaderIcon />
            <StyledHeaderContent variant="h6" noWrap>Thông tin lịch chi tiết</StyledHeaderContent>
          </SectionHeader>
          <Box>
            {fields.map((item, index) => (
              <DayCardItem key={item.id}>
                <DayHeader>
                  {item.dayName}, {item.dateValue}
                </DayHeader>
                <SkyGrid container spacing={3}>
                  <SkyGrid item xs={12} md={5}>
                    {/* <FormLabel>Lãnh đạo trực<IconRequied component="span">*</IconRequied></FormLabel> */}
                    <Controller
                      name={`scheduleDetails.${index}.leaderId`}
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <AsyncAutoComplete
                          {...field}
                          label="Lãnh đạo trực"
                          placeholder="Tìm kiếm lãnh đạo"
                          url={API_GET_LEADERS}
                          queryParam="name"
                          optionLabel="name"
                          optionValue="id"
                          required
                          error={!!error}
                          helperText={error?.message}
                          size="small"
                          fullWidth
                          limit={20}
                          returnObject
                          disabled
                        />
                      )}
                    />
                  </SkyGrid>
                  <SkyGrid item xs={12} md={7}>
                    <Controller
                      name={`scheduleDetails.${index}.note`}
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          {...field}
                          label="Ghi chú"
                          fullWidth
                          size="small"
                          disabled
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
      <PopupWarningDelete
        open={showDeletePopup}
        onClose={handleCloseDeletePopup}
        onConfirm={handleDelete}
        title={getValues("title")}
        isLoading={isDeleting}
      />
      {showUpdatePopup && (
        <UpdateLeaderDutySchedule
          sharedComponents={sharedComponents}
          onClose={handleCloseUpdatePopup}
          data={data}
          setReloadData={handleReload}
        />
      )}
    </BaseSwipper>
  );
};

export default withSharedComponents(ViewLeaderDutySchedule);
