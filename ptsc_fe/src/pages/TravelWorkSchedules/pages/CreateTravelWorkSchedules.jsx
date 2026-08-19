import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";
import "dayjs/locale/vi";
// --- WRAPPERS ---
import withSharedComponents from "@components/WrapperComponent";
import { useToast } from "@components/common/ToastProvider";

// --- SKY STYLES ---
import { SkyGrid, SkyTypography } from "@styles/SkyStyles";

// --- API SERVICE ---
import {
	API_GET_LEADERS,
	// API_GET_LIST_USERS,
} from "@EnvironmentFile/constants/urlConfig";
import { CustomDialog } from "@components/CustomDialog";
// import { SectionWrapperContainer } from "@styles/LeadershipDutyScheduleCalendar.styles";
import { useDispatch, useSelector } from "react-redux";
// eslint-disable-next-line no-restricted-imports
import { travelWorkSchedulesSchema } from "../constantTravelWorkSchedules";
import { postTravelWork } from "@redux/slices/TravelWork/TravelWorkSlice";
import { FormContainerGeneralInformation } from "@styles/FormList.styles";
import {
	ActionButtonGroup,
	CustomSkyButton,
	SectionHeader,
	SectionTitle,
	SectionWrapperContainer,
	ScheduleItemBlock,
	DeleteIconButton,
	ScheduleTypeGrid,
} from "@styles/TravelWorkSchedule.styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { FormLabel } from "@styles/BaseSwiper/BaseSwiper.style";
import { IconRequied } from "@styles/UploadFile/UploadFile.style";
// import { IconButton } from "@mui/material";

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

const checkDateOverlaps = (schedules) => {
	if (!schedules || schedules.length < 2) return false;

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
			// Overlap if (start1 <= end2) && (start2 <= end1)
			if (!r1.start.isAfter(r2.end) && !r2.start.isAfter(r1.end)) {
				return true;
			}
		}
	}
	return false;
};

// --- MAIN COMPONENT ---
const CreateTravelWorkSchedule = ({
	sharedComponents,
	onClose,
	setReloadData,
}) => {
	const {
		InputComponents,
		AsyncAutoComplete,
		DatePicker,
		Dialog,
		BaseSwipper,
	} = sharedComponents || {};
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [pendingData, setPendingData] = useState(null);
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

	const optionCalendarFormat = useMemo(() => {
		const listOptionCalendarFormat = crmSource.find(
			(item) => item.code === "calendarFormat"
		);
		return listOptionCalendarFormat?.data || [];
	}, [crmSource]);

	const {
		control,
		handleSubmit,
		watch,
		getValues,
		setValue,
		formState: { errors },
	} = useForm({
		resolver: (values, context, options) => {
			const travelScheduleValue = getOptionValue(values.travelSchedule);
			return yupResolver(travelWorkSchedulesSchema)(
				values,
				{ ...context, travelSchedule: travelScheduleValue },
				options
			);
		},
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

	const { fields, append, remove } = useFieldArray({
		control,
		name: "schedules",
	});
	const dispatch = useDispatch();

	const handleRemove = useCallback(
		(index) => () => remove(index),
		[remove]
	);

	const handleAppend = useCallback(() => {
		const schedules = getValues("schedules") || [];
		const isAnyScheduleIncomplete = schedules.some((s) => {
			if (s.numDays === "motngay") {
				if (!s.date) return true;
				if (s.format === "fullDay") {
					return (
						!s.location ||
						(typeof s.location === "string" && !s.location.trim()) ||
						!s.content ||
						(typeof s.content === "string" && !s.content.trim())
					);
				}
				// For format === "session", we don't strictly require locations/contents in this check
				return false;
			} else {
				// nhieungay or legacy
				const isDatesMissing = !s.fromDate || !s.toDate;
				const isLocationMissing =
					!s.location ||
					(typeof s.location === "string" && !s.location.trim());
				const isContentMissing =
					!s.content || (typeof s.content === "string" && !s.content.trim());
				return isDatesMissing || isLocationMissing || isContentMissing;
			}
		});

		if (isAnyScheduleIncomplete) {
			toast("Vui lòng nhập đủ dữ liệu của các lịch trình trước đó", "error");
			return;
		}

		append({
			numDays: getOptionValue(optionNumDays[0]) || "motngay",
			format: "session",
			date: null,
			fromDate: null,
			toDate: null,
			location: "",
			content: "",
			morningLocation: "",
			morningContent: "",
			afternoonLocation: "",
			afternoonContent: "",
		});
	}, [append, getValues, toast, optionNumDays]);
	const scheduleType = watch("scheduleType"); // singleDay | multiDay
	const calendarFormatRaw = watch("calendarFormat"); // could be value or object
	const calendarFormat = getOptionValue(calendarFormatRaw);

	const fromDate = watch("fromDate");
	const toDate = watch("toDate");

	const isSingleDay = scheduleType === "singleDay";
	const isMultiDay = scheduleType === "multiDay";
	const isSession = calendarFormat === "session";
	const isFullDay = calendarFormat === "fullDay";

	const onInvalid = useCallback(
		(errors) => {
			const scheduleError = errors.schedules?.message || errors.schedules?.root?.message;
			if (scheduleError) {
				toast(scheduleError, "error");
			}
		},
		[toast]
	);

	// useEffect(() => {
	//   if (errors && Object.keys(errors).length > 0) {
	//     console.log("TravelWork Create Errors:", errors);
	//   }
	// }, [errors]);

	useEffect(() => {
		const opts = optionCalendarFormat || [];
		const desired = isSingleDay ? "session" : "fullDay";
		const desiredExists = opts.some((opt) => getOptionValue(opt) === desired);
		const currentIsValid = opts.some(
			(opt) => getOptionValue(opt) === calendarFormat
		);

		if (isSingleDay) {
			// Chỉ đặt mặc định khi chưa có giá trị hoặc giá trị hiện tại không hợp lệ
			if (!calendarFormat || !currentIsValid) {
				if (desiredExists) {
					setValue("calendarFormat", desired, { shouldDirty: true });
				} else if (opts.length > 0) {
					setValue("calendarFormat", getOptionValue(opts[0]), {
						shouldDirty: true,
					});
				}
			}
		}

		if (isMultiDay) {
			if (calendarFormat !== "fullDay") {
				setValue("calendarFormat", "fullDay", { shouldDirty: true });
			}

			// Auto-set travelSchedule to first option if not set
			if (!travelSchedule && optionTravelSchedule.length > 0) {
				setValue("travelSchedule", getOptionValue(optionTravelSchedule[0]), { shouldDirty: true });
			}

			if (fields.length === 0) {
				append({
					numDays: getOptionValue(optionNumDays[0]) || "motngay",
					format: "session",
					date: null,
					fromDate: null,
					toDate: null,
					location: "",
					content: "",
					morningLocation: "",
					morningContent: "",
					afternoonLocation: "",
					afternoonContent: "",
				});
			}

			// If 'Nhiều lịch trình', ensure existing items have defaults for numDays/format
			if (travelSchedule === "nhieulich") {
				const currentSchedules = getValues("schedules") || [];
				currentSchedules.forEach((s, idx) => {
					if (!s.numDays) {
						setValue(`schedules.${idx}.numDays`, getOptionValue(optionNumDays[0]) || "motngay", { shouldDirty: false });
					}
					if (!s.format) {
						setValue(`schedules.${idx}.format`, "session", { shouldDirty: false });
					}
				});
			}

			// If 'Một lịch trình', sync dates and limit to 1 item
			if (travelSchedule === "motlich") {
				const fromD = fromDate;
				const toD = toDate;

				const currentSchedules = getValues("schedules") || [];

				// Sync first item dates
				if (currentSchedules.length > 0) {
					if (currentSchedules[0].fromDate !== fromD) setValue(`schedules.0.fromDate`, fromD);
					if (currentSchedules[0].toDate !== toD) setValue(`schedules.0.toDate`, toD);
				}

				// Limit to 1 item
				if (currentSchedules.length > 1) {
					for (let i = currentSchedules.length - 1; i >= 1; i--) {
						remove(i);
					}
				}
			}
		}
	}, [isSingleDay, isMultiDay, travelSchedule, optionTravelSchedule, optionNumDays, calendarFormat, optionCalendarFormat, fromDate, toDate, setValue, fields.length, append, remove, getValues]);

	const onSubmit = (data) => {
		if (
			data.scheduleType === "singleDay" &&
			getOptionValue(data.calendarFormat) === "session"
		) {
			const isMorningEmpty =
				!data.morningLocation?.trim() && !data.morningContent?.trim();
			const isAfternoonEmpty =
				!data.afternoonLocation?.trim() && !data.afternoonContent?.trim();

			if (isMorningEmpty && isAfternoonEmpty) {
				toast("Bắt buộc phải nhập 1 buổi", "error");
				return;
			}
		}

		if (isMultiDay && checkDateOverlaps(data.schedules)) {
			toast(
				"Vui lòng kiểm tra lịch trình công tác các lịch trình đang bị trùng ngày",
				"error"
			);
			return;
		}

		setPendingData(data);
		setShowConfirmDialog(true);
	};

	const handleConfirmSave = async () => {
		if (!pendingData) return;
		setIsSubmitting(true);
		// logger.log('pendingData', pendingData)
		try {
			const payload = {
				leader: pendingData.leader?.id,
				scheduleType: pendingData.scheduleType,

				...(pendingData.scheduleType === "singleDay" && {
					workDate: pendingData.workDate
						? dayjs(pendingData.workDate).format("YYYY-MM-DD HH:mm:ss")
						: null,
					calendarFormat: pendingData.calendarFormat,

					...(pendingData.calendarFormat === "session" && {
						morningLocation: pendingData.morningLocation,
						morningContent: pendingData.morningContent,
						afternoonLocation: pendingData.afternoonLocation,
						afternoonContent: pendingData.afternoonContent,
					}),

					...(pendingData.calendarFormat === "fullDay" && {
						location: pendingData.location,
						content: pendingData.content,
					}),
				}),

				...(pendingData.scheduleType === "multiDay" && {
					fromDate: pendingData.fromDate
						? dayjs(pendingData.fromDate).format("YYYY-MM-DD HH:mm:ss")
						: null,
					toDate: pendingData.toDate
						? dayjs(pendingData.toDate).format("YYYY-MM-DD HH:mm:ss")
						: null,
					travelSchedule: pendingData.travelSchedule,
					schedules: pendingData.schedules?.map((s) => ({
						numDays: s.numDays,
						format: s.format,
						date: s.date ? dayjs(s.date).format("YYYY-MM-DD HH:mm:ss") : null,
						startDate: s.fromDate
							? dayjs(s.fromDate).format("YYYY-MM-DD HH:mm:ss")
							: null,
						endDate: s.toDate
							? dayjs(s.toDate).format("YYYY-MM-DD HH:mm:ss")
							: null,
						location: s.location,
						content: s.content,
						morningLocation: s.morningLocation,
						morningContent: s.morningContent,
						afternoonLocation: s.afternoonLocation,
						afternoonContent: s.afternoonContent,
					})),
				}),
			};
			// logger.log('Payload:', payload);
			await dispatch(postTravelWork(payload)).unwrap();
			toast("Tạo lịch công tác thành công!", "success");
			setShowConfirmDialog(false);
			setReloadData(new Date() * 1);
			if (onClose) onClose();
		} catch (error) {
			toast(
				error?.response?.data?.message || error?.response?.message || error?.message ||
				"Có lỗi xảy ra khi tạo lịch công tác!",
				"error"
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCloseDialog = () => {
		setShowConfirmDialog(false);
	};

	const handleCalendarFormatChange = useCallback(
		(field) => (e) => {
			const nextVal = getOptionValue(e?.target?.value ?? e);
			field.onChange(nextVal);
		},
		[]
	);

	return (
		<BaseSwipper
			title="Đăng ký lịch công tác"
			open
			onClose={onClose}
			onSave={handleSubmit(onSubmit, onInvalid)}
			type="add"
			moreActions={
				<ActionButtonGroup>
					<CustomSkyButton
						variant="contained"
						onClick={handleSubmit(onSubmit, onInvalid)}
						disabled={isSubmitting}
					>
						{isSubmitting ? "ĐANG XỬ LÝ..." : "LƯU"}
					</CustomSkyButton>
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
										<FormLabel>Lãnh đạo công tác<IconRequied component="span">*</IconRequied></FormLabel>
										<Controller
											name="leader"
											control={control}
											render={({ field }) => (
												<AsyncAutoComplete
													{...field}
													fullWidth
													// label="Lãnh đạo công tác"
													placeholder="Lãnh đạo chủ trì lịch công tác"
													url={API_GET_LEADERS}
													queryParam="name"
													optionLabel="name"
													optionValue="id"
													value={field.value}
													onChange={field.onChange}
													returnObject
													error={!!errors.leader}
													helperText={errors.leader?.message}
													// disabled={!isDateSelected}
													required
												/>
											)}
										/>
									</SkyGrid>
									<SkyGrid item xs={12} sm={6}>
										<FormLabel>Loại công tác<IconRequied component="span">*</IconRequied></FormLabel>
										<Controller
											name="scheduleType"
											control={control}
											render={({ field }) => (
												<InputComponents
													{...field}
													// label="Loại công tác"
													placeholder="Loại công tác"
													select
													options={optionScheduleType}
													error={!!errors.scheduleType}
													helperText={errors.scheduleType?.message}
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
										<FormLabel>Công tác ngày<IconRequied component="span">*</IconRequied></FormLabel>
										<Controller
											name="workDate"
											control={control}
											render={({ field }) => (
												<DatePicker
													{...field}
													// label="Công tác ngày"
													required
													error={!!errors.workDate}
													helperText={errors.workDate?.message}
													fullWidth
													minDate={dayjs()}
												/>
											)}
										/>
									</>
								) : scheduleType === "multiDay" ? (
									<SkyGrid container spacing={2}>
										<SkyGrid item xs={12} sm={6}>
											<FormLabel>Công tác từ ngày<IconRequied component="span">*</IconRequied></FormLabel>
											<Controller
												name="fromDate"
												control={control}
												render={({ field }) => (
													<DatePicker
														{...field}
														// label="Công tác từ ngày"
														required
														error={!!errors.fromDate}
														helperText={errors.fromDate?.message}
														fullWidth
														minDate={dayjs()}
													/>
												)}
											/>
										</SkyGrid>
										<SkyGrid item xs={12} sm={6}>
											<FormLabel>Đến ngày<IconRequied component="span">*</IconRequied></FormLabel>
											<Controller
												name="toDate"
												control={control}
												render={({ field }) => (
													<DatePicker
														{...field}
														// label="Đến ngày"
														required
														error={!!errors.toDate}
														helperText={errors.toDate?.message}
														fullWidth
														minDate={watch("fromDate") || dayjs()}
													/>
												)}
											/>
										</SkyGrid>
									</SkyGrid>
								) : null}
							</SkyGrid>
							{isMultiDay && (
								<SkyGrid item xs={12} md={6}>
									<FormLabel>Lịch trình công tác<IconRequied component="span">*</IconRequied></FormLabel>
									<Controller
										name="travelSchedule"
										control={control}
										render={({ field }) => (
											<InputComponents
												{...field}
												// label="Lịch trình công tác"
												placeholder="Lịch trình công tác"
												select
												options={optionTravelSchedule}
												error={!!errors.travelSchedule}
												helperText={errors.travelSchedule?.message}
												fullWidth
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
						{isMultiDay && travelSchedule === "nhieulich" && (
							<CustomSkyButton
								variant="text"
								startIcon={<AddIcon />}
								onClick={handleAppend}
							>
								Thêm lịch trình
							</CustomSkyButton>
						)}
					</SectionHeader>

					{/* HÌNH THỨC LỊCH */}
					{isSingleDay && (
						<ScheduleTypeGrid container spacing={2}>
							<SkyGrid item xs={12} sm={6}>
								<FormLabel>Hình thức lịch<IconRequied component="span">*</IconRequied></FormLabel>
								<Controller
									name="calendarFormat"
									control={control}
									render={({ field }) => (
										<InputComponents
											{...field}
											value={calendarFormat}
											onChange={handleCalendarFormatChange(field)}
											// label="Hình thức lịch"
											placeholder="Hình thức lịch"
											select
											options={optionCalendarFormat}
											error={!!errors.calendarFormat}
											helperText={errors.calendarFormat?.message}
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
									<FormLabel>Địa điểm công tác</FormLabel>
									<Controller
										name="morningLocation"
										control={control}
										render={({ field }) => (
											<InputComponents
												{...field}
												// label="Địa điểm công tác"
												placeholder="Địa điểm công tác"
												error={!!errors.morningLocation}
												helperText={errors.morningLocation?.message}
												fullWidth
											/>
										)}
									/>
								</SkyGrid>
								<SkyGrid item xs={12} md={6}>
									<FormLabel>Nội dung công tác</FormLabel>
									<Controller
										name="morningContent"
										control={control}
										render={({ field }) => (
											<InputComponents
												{...field}
												// label="Nội dung công tác"
												placeholder="Nhập nội dung công tác"
												error={!!errors.morningContent}
												helperText={errors.morningContent?.message}
												fullWidth
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
									<FormLabel>Địa điểm công tác</FormLabel>
									<Controller
										name="afternoonLocation"
										control={control}
										render={({ field }) => (
											<InputComponents
												{...field}
												// label="Địa điểm công tác"
												placeholder="Địa điểm công tác"
												error={!!errors.afternoonLocation}
												helperText={errors.afternoonLocation?.message}
												fullWidth
											/>
										)}
									/>
								</SkyGrid>
								<SkyGrid item xs={12} md={6}>
									<FormLabel>Nội dung công tác</FormLabel>
									<Controller
										name="afternoonContent"
										control={control}
										render={({ field }) => (
											<InputComponents
												{...field}
												// label="Nội dung công tác"
												placeholder="Nhập nội dung công tác"
												error={!!errors.afternoonContent}
												helperText={errors.afternoonContent?.message}
												fullWidth
											/>
										)}
									/>
								</SkyGrid>
							</SkyGrid>
						</SkyGrid>
					)}

					{/* Cả ngày */}
					{isSingleDay && isFullDay && (
						<SkyGrid container spacing={2}>
							<SkyGrid item xs={12} md={6}>
								<FormLabel>Địa điểm công tác<IconRequied component="span">*</IconRequied></FormLabel>
								<Controller
									name="location"
									control={control}
									render={({ field }) => (
										<InputComponents
											{...field}
											// label="Địa điểm công tác"
											placeholder="Địa điểm công tác"
											error={!!errors.location}
											helperText={errors.location?.message}
											fullWidth
											required
										/>
									)}
								/>
							</SkyGrid>
							<SkyGrid item xs={12} md={6}>
								<FormLabel>Nội dung công tác<IconRequied component="span">*</IconRequied></FormLabel>
								<Controller
									name="content"
									control={control}
									render={({ field }) => (
										<InputComponents
											{...field}
											// label="Nội dung công tác"
											placeholder="Nhập nội dung công tác"
											error={!!errors.content}
											helperText={errors.content?.message}
											fullWidth
											required
										/>
									)}
								/>
							</SkyGrid>
						</SkyGrid>
					)}

					{/* Nhiều ngày – mỗi lịch trình là 1 khối riêng */}
					{isMultiDay &&
						fields.map((item, index) => (
							<ScheduleItemBlock key={item.id}>
								{travelSchedule === "nhieulich" && (
									<DeleteIconButton
										aria-label="delete"
										onClick={handleRemove(index)}
									>
										<DeleteOutlineIcon />
									</DeleteIconButton>
								)}

								<SkyGrid container spacing={2}>
									{travelSchedule === "nhieulich" && (
										<SkyGrid item xs={12} container spacing={2}>
											<SkyGrid item xs={12} sm={3}>
												<FormLabel>Số ngày<IconRequied component="span">*</IconRequied></FormLabel>
												<Controller
													name={`schedules.${index}.numDays`}
													control={control}
													render={({ field }) => (
														<InputComponents
															{...field}
															// label="Số ngày"
															select
															options={optionNumDays}
															error={!!errors.schedules?.[index]?.numDays}
															helperText={
																errors.schedules?.[index]?.numDays?.message
															}
															fullWidth
															required
														/>
													)}
												/>
											</SkyGrid>

											{watch(`schedules.${index}.numDays`) === "motngay" ? (
												<>
													<SkyGrid item xs={12} sm={3}>
														<FormLabel>Hình thức<IconRequied component="span">*</IconRequied></FormLabel>
														<Controller
															name={`schedules.${index}.format`}
															control={control}
															render={({ field }) => (
																<InputComponents
																	{...field}
																	// label="Hình thức"
																	select
																	options={optionCalendarFormat}
																	error={!!errors.schedules?.[index]?.format}
																	helperText={
																		errors.schedules?.[index]?.format?.message
																	}
																	fullWidth
																	required
																/>
															)}
														/>
													</SkyGrid>
													<SkyGrid item xs={12} sm={3}>
														<FormLabel>Ngày<IconRequied component="span">*</IconRequied></FormLabel>
														<Controller
															name={`schedules.${index}.date`}
															control={control}
															render={({ field }) => (
																<DatePicker
																	{...field}
																	// label="Ngày"
																	required
																	error={!!errors.schedules?.[index]?.date}
																	helperText={
																		errors.schedules?.[index]?.date?.message
																	}
																	fullWidth
																	minDate={watch("fromDate") || dayjs()}
																	maxDate={watch("toDate")}
																/>
															)}
														/>
													</SkyGrid>
												</>
											) : (
												<>
													<SkyGrid item xs={12} sm={3}>
														<FormLabel>Từ ngày<IconRequied component="span">*</IconRequied></FormLabel>
														<Controller
															name={`schedules.${index}.fromDate`}
															control={control}
															render={({ field }) => (
																<DatePicker
																	{...field}
																	// label="Từ ngày"
																	required
																	error={!!errors.schedules?.[index]?.fromDate}
																	helperText={
																		errors.schedules?.[index]?.fromDate?.message
																	}
																	fullWidth
																	minDate={watch("fromDate") || dayjs()}
																	maxDate={watch("toDate")}
																/>
															)}
														/>
													</SkyGrid>
													<SkyGrid item xs={12} sm={3}>
														<FormLabel>Đến ngày<IconRequied component="span">*</IconRequied></FormLabel>
														<Controller
															name={`schedules.${index}.toDate`}
															control={control}
															render={({ field }) => (
																<DatePicker
																	{...field}
																	// label="Đến ngày"
																	required
																	error={!!errors.schedules?.[index]?.toDate}
																	helperText={
																		errors.schedules?.[index]?.toDate?.message
																	}
																	fullWidth
																	minDate={
																		watch(`schedules.${index}.fromDate`) ||
																		watch("fromDate") ||
																		dayjs()
																	}
																	maxDate={watch("toDate")}
																/>
															)}
														/>
													</SkyGrid>
												</>
											)}
										</SkyGrid>
									)}

									{/* Dates logic for 'Nhiều lịch trình' handled above */}
									{/* For 'Một lịch trình', we hide dates and just show location/content */}

									{/* Fields for Session Format if nhieulich */}

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
													<FormLabel>Địa điểm công tác</FormLabel>
													<Controller
														name={`schedules.${index}.morningLocation`}
														control={control}
														render={({ field }) => (
															<InputComponents
																{...field}
																// label="Địa điểm công tác"
																placeholder="Địa điểm công tác"
																fullWidth
															/>
														)}
													/>
												</SkyGrid>
												<SkyGrid item xs={12} md={6}>
													<FormLabel>Nội dung công tác</FormLabel>
													<Controller
														name={`schedules.${index}.morningContent`}
														control={control}
														render={({ field }) => (
															<InputComponents
																{...field}
																// label="Nội dung công tác"
																placeholder="Nhập nội dung công tác"
																fullWidth
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
													<FormLabel>Địa điểm công tác</FormLabel>
													<Controller
														name={`schedules.${index}.afternoonLocation`}
														control={control}
														render={({ field }) => (
															<InputComponents
																{...field}
																// label="Địa điểm công tác"
																placeholder="Địa điểm công tác"
																fullWidth
															/>
														)}
													/>
												</SkyGrid>
												<SkyGrid item xs={12} md={6}>
													<FormLabel>Nội dung công tác</FormLabel>
													<Controller
														name={`schedules.${index}.afternoonContent`}
														control={control}
														render={({ field }) => (
															<InputComponents
																{...field}
																// label="Nội dung công tác"
																placeholder="Nhập nội dung công tác"
																fullWidth
															/>
														)}
													/>
												</SkyGrid>
											</SkyGrid>
										</SkyGrid>
									) : (
										<>
											<SkyGrid item xs={12} md={6}>
												<FormLabel>Địa điểm công tác<IconRequied component="span">*</IconRequied></FormLabel>
												<Controller
													name={`schedules.${index}.location`}
													control={control}
													render={({ field }) => (
														<InputComponents
															{...field}
															// label="Địa điểm công tác"
															placeholder="Địa điểm công tác"
															error={!!errors.schedules?.[index]?.location}
															helperText={
																errors.schedules?.[index]?.location?.message
															}
															fullWidth
															required
														/>
													)}
												/>
											</SkyGrid>
											<SkyGrid item xs={12} md={6}>
												<FormLabel>Nội dung công tác<IconRequied component="span">*</IconRequied></FormLabel>
												<Controller
													name={`schedules.${index}.content`}
													control={control}
													render={({ field }) => (
														<InputComponents
															{...field}
															// label="Nội dung công tác"
															placeholder="Nhập nội dung công tác"
															error={!!errors.schedules?.[index]?.content}
															helperText={
																errors.schedules?.[index]?.content?.message
															}
															fullWidth
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
			</FormContainerGeneralInformation>

			{Dialog && (
				<CustomDialog
					size="sm"
					open={showConfirmDialog}
					onClose={handleCloseDialog}
					onSave={handleConfirmSave}
					title="Xác nhận lưu lịch công tác"
					titleButton="Xác nhận"
					cancelButtonText="Hủy"
					isLoading={isSubmitting}
				>
					<SkyTypography>
						Xác nhận lưu lịch công tác. Sau khi lưu thông
						tin sẽ được gửi đến người tham gia
					</SkyTypography>
				</CustomDialog>
			)}
		</BaseSwipper >
	);
};

export default withSharedComponents(CreateTravelWorkSchedule);
