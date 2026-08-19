import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";
import "dayjs/locale/vi";
// --- WRAPPERS ---
import withSharedComponents from "@components/WrapperComponent";
import { useToast } from "@components/common/ToastProvider";

// --- SKY STYLES ---
import { SkyGrid, SkyTypography } from "@styles/SkyStyles";

// --- API SERVICE ---
import { API_GET_LEADERS } from "@EnvironmentFile/constants/urlConfig";
import { CustomDialog } from "@components/CustomDialog";
import { useDispatch, useSelector } from "react-redux";
import UpdateTravelWorkSchedules from "./UpdateTravelWorkSchedules";
// eslint-disable-next-line no-restricted-imports
import { travelWorkSchedulesSchema } from "../constantTravelWorkSchedules";
import {
  deleteDataTravelWorkWithPayload,
  getDataDetailTravelWork,
} from "@redux/slices/TravelWork/TravelWorkSlice";
import { FormContainerGeneralInformation } from "@styles/FormList.styles";
import {
  ActionButtonGroup,
  SectionHeader,
  SectionTitle,
  SectionWrapperContainer,
  ScheduleItemBlock,
  ScheduleTypeGrid,
} from "@styles/TravelWorkSchedule.styles";
import { CancelButton } from "@styles/CustomDialog.styles";
import withFormWrapper from "@components/common/FormWrapper";

// Config dayjs
dayjs.locale("vi");

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

// --- MAIN COMPONENT ---
const ViewTravelWorkSchedules = ({
  sharedComponents,
  onClose,
  setReloadData,
  data,
}) => {
	const {
		AsyncAutoComplete: BaseAsyncAutoComplete,
		InputComponents: BaseInput,
		DatePicker: BaseDatePicker,
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

	const DatePicker = useMemo(() => {
		const Wrapped = withFormWrapper(BaseDatePicker, "date");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
		Component.displayName = "DatePicker";
		return Component;
	}, [BaseDatePicker, isView]);

  const dispatch = useDispatch();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const toast = useToast();
  const { crmSource } = useSelector((state) => ({
    crmSource: state.config.crmSource || [],
  }));

  const optionScheduleType = useMemo(() => {
    const listOptionScheduleType = crmSource.find(
      (item) => item.code === "dutyType"
    );
    return listOptionScheduleType?.data || [];
  }, [crmSource]);

  const optionCalendarFormat = useMemo(() => {
    const listOptionCalendarFormat = crmSource.find(
      (item) => item.code === "calendarFormat"
    );
    return listOptionCalendarFormat?.data || [];
  }, [crmSource]);

  const optionTravelSchedule = useMemo(() => {
    const listOptionTravelSchedule = crmSource.find(
      (item) => item.code === "LTCT"
    );
    return listOptionTravelSchedule?.data || [];
  }, [crmSource]);

  const optionNumDays = useMemo(() => {
    const listOptionNumDays = crmSource.find((item) => item.code === "SNCT");
    return listOptionNumDays?.data || [];
  }, [crmSource]);

  const { control, watch, reset } = useForm({
    resolver: yupResolver(travelWorkSchedulesSchema),
    defaultValues: {
      scheduleType: "singleDay",
      calendarFormat: "session",
      travelSchedule: "",
      workDate: null,
      fromDate: null,
      toDate: null,
      leader: null,
      morningLocation: "",
      morningContent: "",
      afternoonLocation: "",
      afternoonContent: "",
      location: "",
      content: "",
      schedules: [],
    },
  });

  const travelScheduleRaw = watch("travelSchedule");
  const travelSchedule = getOptionValue(travelScheduleRaw);

  const scheduleType = watch("scheduleType");
  const calendarFormatRaw = watch("calendarFormat");
  const calendarFormat = getOptionValue(calendarFormatRaw);
  const isSingleDay = scheduleType === "singleDay";
  const isMultiDay = scheduleType === "multiDay";
  const isSession = calendarFormat === "session";
  const isFullDay = calendarFormat === "fullDay";

  // Sửa trong ViewTravelWorkSchedules.js
  const loadData = async () => {
    if (!data?.id) return;
    try {
      const detail = await dispatch(getDataDetailTravelWork(data.id)).unwrap();
      if (detail) {
        reset({
          scheduleType: detail.scheduleType?.value || "singleDay",
          travelSchedule: detail.travelSchedule?.value || "",

          calendarFormat:
            detail.scheduleType?.value === "multiDay"
              ? "fullDay"
              : detail.calendarFormat?.value || "session",

          // SỬA Ở ĐÂY: Chỉ để định dạng DD/MM/YYYY hoặc để dayjs tự nhận diện
          workDate: detail.workDate
            ? dayjs(detail.workDate, "DD/MM/YYYY")
            : null,

          fromDate: detail.fromDate
            ? dayjs(detail.fromDate, "DD/MM/YYYY")
            : null,

          toDate: detail.toDate
            ? dayjs(detail.toDate, "DD/MM/YYYY")
            : null,

          leader: detail.leader || null,
          morningLocation: detail.morningLocation || "",
          morningContent: detail.morningContent || "",
          afternoonLocation: detail.afternoonLocation || "",
          afternoonContent: detail.afternoonContent || "",
          location: detail.location || "",
          content: detail.content || "",
          schedules: Array.isArray(detail.schedules)
            ? detail.schedules.map((s) => ({
              numDays: s.numDays?.value || "motngay",
              format: s.format?.value || "session",
              date: (s.date) ? dayjs(s.date, "DD/MM/YYYY") : null,
              fromDate: (s.fromDate || s.startDate)
                ? dayjs(s.fromDate || s.startDate, "DD/MM/YYYY")
                : null,
              toDate: (s.toDate || s.endDate)
                ? dayjs(s.toDate || s.endDate, "DD/MM/YYYY")
                : null,
              location: s.location || "",
              content: s.content || "",
              morningLocation: s.morningLocation || "",
              morningContent: s.morningContent || "",
              afternoonLocation: s.afternoonLocation || "",
              afternoonContent: s.afternoonContent || "",
            }))
            : [],
        });
      }
    } catch (error) {
      toast("Không thể tải thông tin chi tiết", "error");
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id, reset, toast]);

  const handleEdit = () => {
    setShowUpdate(true);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
  };

  const confirmDelete = async () => {
    if (!data?.id) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteDataTravelWorkWithPayload({ ids: [data.id] })).unwrap();
      toast("Xóa lịch công tác thành công", "success");
      setShowDeleteConfirm(false);
      if (setReloadData) setReloadData();
      if (onClose) onClose();
    } catch (error) {
      toast(
        error || "Có lỗi xảy ra khi xóa!",
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateSuccess = () => {
    setShowUpdate(false);
    loadData();
    if (setReloadData) setReloadData();
  };

  const handleCloseUpdate = () => {
    setShowUpdate(false);
  };

  return (
    <BaseSwipper
      title="Chi tiết lịch công tác"
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
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "ĐANG XÓA..." : "XÓA"}
          </CancelButton>
        </ActionButtonGroup>
      }
    >
      <FormContainerGeneralInformation>
        <SectionWrapperContainer>
          <SectionHeader>
            <SectionTitle>Thông tin lịch công tác</SectionTitle>
          </SectionHeader>
          <SectionWrapperContainer>
            <SkyGrid container spacing={2}>
              <SkyGrid item xs={12} md={6}>
                <SkyGrid container spacing={2}>
									<SkyGrid item xs={12} sm={6}>
                    <Controller
                      name="leader"
                      control={control}
                      render={({ field }) => (
                        <AsyncAutoComplete
                          fullWidth
                          label="Lãnh đạo công tác"
                          placeholder="Lãnh đạo chủ trì lịch công tác"
                          url={API_GET_LEADERS}
                          queryParam="name"
                          optionLabel="name"
                          optionValue="id"
                          value={field.value}
                          onChange={field.onChange}
                          returnObject
                          disabled
                          required
                        />
                      )}
                    />
                  </SkyGrid>
									<SkyGrid item xs={12} sm={6}>
                    <Controller
                      name="scheduleType"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          {...field}
                          label="Loại công tác"
                          placeholder="Loại công tác"
                          select
                          options={optionScheduleType}
                          disabled
                          fullWidth
                        />
                      )}
                    />
                  </SkyGrid>
                </SkyGrid>
              </SkyGrid>
              {/* Dates Group - Conditional based on scheduleType */}
              <SkyGrid item xs={12} md={6}>
								{scheduleType === "singleDay" ? (
									<>
                  	<Controller
                  	  name="workDate"
                  	  control={control}
                  	  render={({ field }) => (
                  	    <DatePicker
                  	      {...field}
                  	      label="Công tác ngày"
                  	      required
                  	      disabled
                  	      fullWidth
                  	    />
                  	  )}
                  	/>
									</>
                ) : scheduleType === "multiDay" ? (
                  <SkyGrid container spacing={2}>
										<SkyGrid item xs={12} sm={6}>
                      <Controller
                        name="fromDate"
                        control={control}
                        render={({ field }) => (
                          <DatePicker
                            {...field}
                            label="Công tác từ ngày"
                            required
                            disabled
                            fullWidth
                          />
                        )}
                      />
                    </SkyGrid>
										<SkyGrid item xs={12} sm={6}>
                      <Controller
                        name="toDate"
                        control={control}
                        render={({ field }) => (
                          <DatePicker
                            {...field}
                            label="Đến ngày"
                            required
                            disabled
                            fullWidth
                          />
                        )}
                      />
                    </SkyGrid>
                  </SkyGrid>
                ) : null}
              </SkyGrid>
              {isMultiDay && (
								<SkyGrid item xs={12} md={6}>
                  <Controller
                    name="travelSchedule"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        {...field}
                        label="Lịch trình công tác"
                        placeholder="Lịch trình công tác"
                        select
                        options={optionTravelSchedule}
                        fullWidth
                        disabled
                        required
                      />
                    )}
                  />
                </SkyGrid>
              )}
            </SkyGrid>
          </SectionWrapperContainer>
          <SectionHeader>
            <SectionTitle>Lịch trình công tác</SectionTitle>
          </SectionHeader>
          <SectionWrapperContainer>
            {/* HÌNH THỨC LỊCH */}
            {isSingleDay && (
              <ScheduleTypeGrid container spacing={2}>
								<SkyGrid item xs={12} sm={6}>
                  <Controller
                    name="calendarFormat"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        {...field}
                        value={calendarFormat}
                        // onChange={handleCalendarFormatChange(field)}
                        label="Hình thức lịch"
                        placeholder="Hình thức lịch"
                        select
                        options={optionCalendarFormat}
                        disabled
                        fullWidth
                        required
                      />
                    )}
                  />
                </SkyGrid>
              </ScheduleTypeGrid>
            )}

            {/* Theo buổi */}
            {isSingleDay && isSession && (
              <SkyGrid container spacing={2}>
                <SkyGrid item xs={12} md={12} container spacing={2}>
                  <SkyGrid item xs={12} md={12}>
                    <SectionTitle customColor>Buổi sáng</SectionTitle>
                  </SkyGrid>
									<SkyGrid item xs={12} md={6}>
                    <Controller
                      name="morningLocation"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          {...field}
                          label="Địa điểm công tác"
                          placeholder="Địa điểm công tác"
                          disabled
                          fullWidth
                          required
                        />
                      )}
                    />
                  </SkyGrid>

									<SkyGrid item xs={12} md={6}>
                    <Controller
                      name="morningContent"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          {...field}
                          label="Nội dung công tác"
                          placeholder="Nhập nội dung công tác"
                          disabled
                          fullWidth
                          required
                        />
                      )}
                    />
                  </SkyGrid>
                </SkyGrid>

                <SkyGrid item xs={12} md={12} container spacing={2}>
                  <SkyGrid item xs={12} md={12}>
                    <SectionTitle customColor>Buổi chiều</SectionTitle>
                  </SkyGrid>
									<SkyGrid item xs={12} md={6}>
                    <Controller
                      name="afternoonLocation"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          {...field}
                          label="Địa điểm công tác"
                          placeholder="Địa điểm công tác"
                          disabled
                          fullWidth
                        />
                      )}
                    />
                  </SkyGrid>

									<SkyGrid item xs={12} md={6}>
                    <Controller
                      name="afternoonContent"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          {...field}
                          label="Nội dung công tác"
                          placeholder="Nhập nội dung công tác"
                          disabled
                          fullWidth
                          required
                        />
                      )}
                    />
                  </SkyGrid>
                </SkyGrid>
              </SkyGrid>
            )}

            {/* Cả ngày hoặc Một lịch trình */}
            {((isSingleDay && isFullDay) || (isMultiDay && travelSchedule === "motlich")) && (
              <SkyGrid container spacing={2}>
								<SkyGrid item xs={12} md={6}>
                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        {...field}
                        label="Địa điểm công tác"
                        placeholder="Địa điểm công tác"
                        disabled
                        fullWidth
                        required
                      />
                    )}
                  />
                </SkyGrid>

								<SkyGrid item xs={12} md={6}>
                  <Controller
                    name="content"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        {...field}
                        label="Nội dung công tác"
                        placeholder="Nhập nội dung công tác"
                        disabled
                        fullWidth
                        required
                      />
                    )}
                  />
                </SkyGrid>
              </SkyGrid>
            )}

            {/* Nhiều ngày */}
            {isMultiDay &&
              watch("schedules")?.map((item, index) => (
                <ScheduleItemBlock key={index}>
                  <SkyGrid container spacing={2}>
                    {travelSchedule === "nhieulich" && (
                      <SkyGrid item xs={12} container spacing={2}>
												<SkyGrid item xs={12} sm={3}>
                          <Controller
                            name={`schedules.${index}.numDays`}
                            control={control}
                            render={({ field }) => (
                              <InputComponents
                                {...field}
                                label="Số ngày"
                                select
                                options={optionNumDays}
                                fullWidth
                                disabled
                                required
                              />
                            )}
                          />
                        </SkyGrid>

                        {watch(`schedules.${index}.numDays`) === "motngay" ? (
                          <>
														<SkyGrid item xs={12} sm={3}>
                              <Controller
                                name={`schedules.${index}.format`}
                                control={control}
                                render={({ field }) => (
                                  <InputComponents
                                    {...field}
                                    label="Hình thức"
                                    select
                                    options={optionCalendarFormat}
                                    fullWidth
                                    disabled
                                    required
                                  />
                                )}
                              />
                            </SkyGrid>
														<SkyGrid item xs={12} sm={3}>
                              <Controller
                                name={`schedules.${index}.date`}
                                control={control}
                                render={({ field }) => (
                                  <DatePicker
                                    {...field}
                                    label="Ngày"
                                    required
                                    disabled
                                    fullWidth
                                  />
                                )}
                              />
                            </SkyGrid>
                          </>
                        ) : (
                          <>
														<SkyGrid item xs={12} sm={3}>
                              <Controller
                                name={`schedules.${index}.fromDate`}
                                control={control}
                                render={({ field }) => (
                                  <DatePicker
                                    {...field}
                                    label="Từ ngày"
                                    required
                                    disabled
                                    fullWidth
                                  />
                                )}
                              />
                            </SkyGrid>
														<SkyGrid item xs={12} sm={3}>
                              <Controller
                                name={`schedules.${index}.toDate`}
                                control={control}
                                render={({ field }) => (
                                  <DatePicker
                                    {...field}
                                    label="Đến ngày"
                                    required
                                    disabled
                                    fullWidth
                                  />
                                )}
                              />
                            </SkyGrid>
                          </>
                        )}
                      </SkyGrid>
                    )}

                    {/* Fields for Session Format */}
                    {travelSchedule === "nhieulich" &&
                      watch(`schedules.${index}.numDays`) === "motngay" &&
                      watch(`schedules.${index}.format`) === "session" ? (
                      <SkyGrid item xs={12} container spacing={2}>
                        <SkyGrid item xs={12} md={12} container spacing={2}>
                          <SkyGrid item xs={12} md={12}>
                            <SectionTitle customColor>Buổi sáng</SectionTitle>
                          </SkyGrid>
													<SkyGrid item xs={12} md={6}>
                            <Controller
                              name={`schedules.${index}.morningLocation`}
                              control={control}
                              render={({ field }) => (
                                <InputComponents
                                  {...field}
                                  label="Địa điểm công tác"
                                  placeholder="Địa điểm công tác"
                                  fullWidth
                                  disabled
                                />
                              )}
                            />
                          </SkyGrid>
													<SkyGrid item xs={12} md={6}>
                            <Controller
                              name={`schedules.${index}.morningContent`}
                              control={control}
                              render={({ field }) => (
                                <InputComponents
                                  {...field}
                                  label="Nội dung công tác"
                                  placeholder="Nhập nội dung công tác"
                                  fullWidth
                                  disabled
                                />
                              )}
                            />
                          </SkyGrid>
                        </SkyGrid>
                        <SkyGrid item xs={12} md={12} container spacing={2}>
                          <SkyGrid item xs={12} md={12}>
                            <SectionTitle customColor>Buổi chiều</SectionTitle>
                          </SkyGrid>
													<SkyGrid item xs={12} md={6}>
                            <Controller
                              name={`schedules.${index}.afternoonLocation`}
                              control={control}
                              render={({ field }) => (
                                <InputComponents
                                  {...field}
                                  label="Địa điểm công tác"
                                  placeholder="Địa điểm công tác"
                                  fullWidth
                                  disabled
                                />
                              )}
                            />
                          </SkyGrid>
													<SkyGrid item xs={12} md={6}>
                            <Controller
                              name={`schedules.${index}.afternoonContent`}
                              control={control}
                              render={({ field }) => (
                                <InputComponents
                                  {...field}
                                  label="Nội dung công tác"
                                  placeholder="Nhập nội dung công tác"
                                  fullWidth
                                  disabled
                                />
                              )}
                            />
                          </SkyGrid>
                        </SkyGrid>
                      </SkyGrid>
                    ) : (
                      <>
												<SkyGrid item xs={12} md={6}>
                          <Controller
                            name={`schedules.${index}.location`}
                            control={control}
                            render={({ field }) => (
                              <InputComponents
                                {...field}
                                label="Địa điểm công tác"
                                placeholder="Địa điểm công tác"
                                fullWidth
                                disabled
                                required
                              />
                            )}
                          />
                        </SkyGrid>
												<SkyGrid item xs={12} md={6}>
                          <Controller
                            name={`schedules.${index}.content`}
                            control={control}
                            render={({ field }) => (
                              <InputComponents
                                {...field}
                                label="Nội dung công tác"
                                placeholder="Nhập nội dung công tác"
                                fullWidth
                                disabled
                                required
                              />
                            )}
                          />
                        </SkyGrid>
                      </>
                    )}
                  </SkyGrid>
                </ScheduleItemBlock>
              ))}
          </SectionWrapperContainer>
        </SectionWrapperContainer>
      </FormContainerGeneralInformation>

      {showDeleteConfirm && (
        <CustomDialog
          size="sm"
          open={showDeleteConfirm}
          onClose={handleCloseDeleteConfirm}
          onSave={confirmDelete}
          title="THÔNG BÁO"
          titleButton="Xác nhận"
          cancelButtonText="Hủy"
          isLoading={isDeleting}
        >
          <SkyTypography>
            {`Bạn có chắc chắn muốn xóa lịch công tác này không?`}
          </SkyTypography>
        </CustomDialog>
      )}
      {showUpdate && (
        <UpdateTravelWorkSchedules
          open={showUpdate}
          onClose={handleCloseUpdate}
          data={data}
          setReloadData={handleUpdateSuccess}
        />
      )}
    </BaseSwipper>
  );
};

export default withSharedComponents(ViewTravelWorkSchedules);
