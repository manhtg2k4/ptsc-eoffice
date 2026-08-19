import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	// Checkbox,
	// FormControlLabel,
	CircularProgress,
	Grid,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { useToast } from "@components/common/ToastProvider";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import DOMPurify from "dompurify";
import { StyledBoxContainerContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
	API_PASSPORT,
	API_PASSPORT_REQUEST,
} from "@EnvironmentFile/constants/urlConfig";
import {
	getDataDetailPassportRequest,
	// dataDetailEmployeePassPortListPage,
	updatePassportRequest,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
// eslint-disable-next-line no-restricted-imports

import UploadFile from "@components/UploadFile";
import { FileViewerDialog } from "@components/CustomDialog";
import CusTomTableFreeStyle from "@components/CustomTable/CusTomTableFreeStyle";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import api from "@services/api";
import {
	defaultValueRequestListPage,
	passportMyRequestSchema,
	passportOrganizationalRequestSchema,
} from "./constantsRequestListPage";
import {
	AddMemberButton,
	DeleteMemberButton,
	MemberTableActions,
	MemberTableHeader,
	SmallDeleteIcon,
	// StyledHeaderSectionContent,
	StyledRequiredIcon,
	StyledRequiredText,
	TableWrapperPassport,
} from "@styles/PassportManagement.styles";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import {
	SecondaryTypography,
	StatusWrapper,
	TitleBox,
} from "@pages/RecommendationsPage/components/RecommendationsForm.styles";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { StyledSectionTitle, StyledTitleWithToggle } from "@styles/RecordDestruction/RecordDestruction.styles";
import { FileIconSvg } from "@assets/icons/FileIconSvg";
import withFormWrapper from "@components/common/FormWrapper";

// ============ COMPONENT ============
const EditRequest = (props) => {
	const {
		open,
		onClose,
		onSuccess,
		sharedComponents,
		title,
		id, // ID yêu cầu cần chỉnh sửa
		isActionMenu = true,
	} = props;
	const {
		BaseSwipper,
		InputComponents: BaseInput,
		DatePicker: BaseDatePicker,
		ButtonOutline,
		AsyncAutoComplete: BaseAsyncAutoComplete,
		CustomAutoCompleteSearch: BaseCustomAutoCompleteSearch,
		// DateTimeRangePicker: BaseDateTimeRangePicker,
	} = sharedComponents;

	const toast = useToast();
	const { dataDetailPassportRequest } = useSelector(
		(state) => state.passportManagement
	);
	// logger.log('dataDetailPassportRequest', dataDetailPassportRequest)
	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);
	const [isOrganizational, setIsOrganizational] = useState(false);
	const [validationTriggered, setValidationTriggered] = useState(false);
	const validationSchema =
		isOrganizational === "organizational"
			? passportOrganizationalRequestSchema
			: passportMyRequestSchema;
	const {
		control,
		handleSubmit,
		formState: { errors },
		setValue,
		setError,
		clearErrors,
		trigger,
		watch,
		reset,
	} = useForm({
		resolver: yupResolver(validationSchema),
		defaultValues: defaultValueRequestListPage,
		mode: "onChange",
	});

	const InputComponents = useMemo(() => {
		return withFormWrapper(BaseInput, "input");
	}, [BaseInput]);

	const DatePicker = useMemo(() => {
		const Wrapped = withFormWrapper(BaseDatePicker, "date");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "DatePicker";
		return Component;
	}, [BaseDatePicker]);

	const AsyncAutoComplete = useMemo(() => {
		const Wrapped = withFormWrapper(BaseAsyncAutoComplete, "asyncSelect");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "AsyncAutoComplete";
		return Component;
	}, [BaseAsyncAutoComplete]);

	const CustomAutoCompleteSearch = useMemo(() => {
		const Wrapped = withFormWrapper(BaseCustomAutoCompleteSearch, "asyncSelect");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "CustomAutoCompleteSearch";
		return Component;
	}, [BaseCustomAutoCompleteSearch]);

	// const DateTimeRangePicker = useMemo(() => {
	// 	const Wrapped = withFormWrapper(BaseDateTimeRangePicker, "date");
	// 	const Component = (props) => <Wrapped {...props} />;
	// 	Component.displayName = "DateTimeRangePicker";
	// 	return Component;
	// }, [BaseDateTimeRangePicker]);

	const departureDate = watch("departureDate");
	const destinationValue = watch("destination");

	const isDestinationOther = useMemo(() => {
		if (!destinationValue) return false;
		const checkIsOther = (item) => {
			if (!item) return false;
			return (
				item === "OTHER" ||
				item?.ivalued === "OTHER" ||
				item?.id === "OTHER" ||
				item?.value === "OTHER" ||
				item?.title === "Khác"
			);
		};
		if (Array.isArray(destinationValue)) {
			return destinationValue.some(checkIsOther);
		}
		return checkIsOther(destinationValue);
	}, [destinationValue]);

	const handleDestinationChange = useCallback(
		(val) => {
			setValue("destination", val, { shouldDirty: true, shouldValidate: true });
			const hasOther = Array.isArray(val)
				? val.some((item) =>
						typeof item === "object"
							? item?.ivalued === "OTHER" || item?.id === "OTHER" || item?.value === "OTHER"
							: item === "OTHER"
				  )
				: typeof val === "object"
				? val?.ivalued === "OTHER" || val?.id === "OTHER" || val?.value === "OTHER"
				: val === "OTHER";
			if (!hasOther) {
				setValue("destinationOther", "", { shouldValidate: true });
			}
		},
		[setValue]
	);
	// const arrivalDate = watch("arrivalDate");

	const [viewingFile, setViewingFile] = useState({
		open: false,
		url: null,
		name: "",
		type: null,
	});

	// ============ REQUESTER INFO ============
	const [requesterInfo, setRequesterInfo] = useState(null);

	// ============ MEMBER TABLE STATE (organizational) ============
	const [memberList, setMemberList] = useState([]);
	const [selectedPassportId, setSelectedPassportId] = useState(null);
	const [initialPassportId, setInitialPassportId] = useState(null);

	const getEntityId = useCallback((entity) => {
		if (!entity) return null;
		return entity.id || entity._id || entity.value || null;
	}, []);

	const deleteFilesByObject = useCallback(async (objectType, objectId) => {
		if (!objectType || !objectId) return;

		const response = await api.get(
			`/api/files/latest-by-object?object_type=${objectType}&object_id=${objectId}`,
			{ timeout: 0 }
		);

		const files = response?.data?.data || response?.data || [];
		if (!Array.isArray(files) || files.length === 0) return;

		await Promise.allSettled(
			files
				.map((file) => file?._id || file?.id)
				.filter(Boolean)
				.map((fileId) => api.delete(`/api/files/${fileId}`, { timeout: 30000 }))
		);
	}, []);
	// ============ FETCH DETAIL DATA ============
	useEffect(() => {
		if (!id || !open) return;
		const fetchDataDetail = async () => {
			try {
				setIsLoading(true);
				setSelectedPassportId(null);
				const normalizeData = (data) => {
					const isOrganizational =
						data.typeRequest?.value === "organizational" ||
						data.typeRequest === "organizational";

					const departureDate = data.departureDate || null;
					const arrivalDate = data.arrivalDate || null;

					const rawDestination = data.destination;
					const rawDestinationOther = data.destinationOther;

					let normalizedDestination = [];
					let normalizedDestinationOther = "";

					if (Array.isArray(rawDestination)) {
						normalizedDestination = [...rawDestination];
					} else if (typeof rawDestination === "string" && rawDestination.trim()) {
						normalizedDestination = rawDestination.includes(",")
							? rawDestination.split(",").map((s) => s.trim()).filter(Boolean)
							: [rawDestination.trim()];
					} else if (rawDestination && typeof rawDestination === "object") {
						normalizedDestination = [rawDestination];
					}

					const hasOtherInDestination = normalizedDestination.some(
						(item) =>
							item === "OTHER" ||
							item?.ivalued === "OTHER" ||
							item?.id === "OTHER" ||
							item?.value === "OTHER" ||
							item?.title === "Khác"
					);

					if (
						rawDestinationOther &&
						typeof rawDestinationOther === "string" &&
						rawDestinationOther.trim()
					) {
						normalizedDestinationOther = rawDestinationOther.trim();
						if (!hasOtherInDestination) {
							normalizedDestination.push({
								ivalued: "OTHER",
								title: "Khác",
								isOther: true,
							});
						}
					} else if (hasOtherInDestination) {
						normalizedDestinationOther = rawDestinationOther || "";
					}

					return {
						...defaultValueRequestListPage,
						...data,
						destination: normalizedDestination,
						destinationOther: normalizedDestinationOther,
						namePassportRequest: isOrganizational
							? data.namePassportRequest?.nameVn
							: data.namePassportRequest || "",
						passportBorrowDate: departureDate
							? dayjs(departureDate).subtract(5, "day").toISOString()
							: null,
						passportReturnDate: arrivalDate
							? dayjs(arrivalDate).add(5, "day").toISOString()
							: null,
					};
				};
				const res = await dispatch(getDataDetailPassportRequest(id)).unwrap();
				reset(normalizeData(res));
				setIsOrganizational(res.typeRequest?.value);

				if (res.typeRequest?.value !== "organizational") {
					const passportId =
						res?.passportNumber?.id ||
						res?.passportNumber?._id ||
						res?.passportId ||
						null;
					setSelectedPassportId(passportId);
					setInitialPassportId(passportId);
				}
				// Lưu thông tin người đề nghị
				if (res.requesterInfo) {
					setRequesterInfo(res.requesterInfo);
				}
				// Nếu là organizational → rebuild memberList từ listOfOrganizations
				if (
					res.typeRequest?.value === "organizational" &&
					Array.isArray(res.listOfOrganizations)
				) {
					const rebuiltMembers = res.listOfOrganizations.map((item, index) => ({
						_id: item._id || `edit_${Date.now()}_${index}`,
						employee: item.userId
							? {
								id: item.userId,
								nameVn: item.fullName,
								eofficeAccount: item.eofficeAccount || "",
							}
							: null,
						employeeEofficeAccount: item.eofficeAccount || item.userId || "",
						passport: item.passportId
							? {
								id: item.passportId,
								passportNumber: item.passportNumber,
								passportType: item.passportType || "",
							}
							: null,
						passportType: item.passportType || "",
						hoTen: item.fullName || "",
						soHoChieu: item.passportNumber || "",
						chucVu: item.position || "",
						capBac: item.rank || "",
						donVi: item.unit || "",
						loaiCB: item.cbType || "",
						ngayHetHan: item.expiryDate || "",
					}));
					setMemberList(
						rebuiltMembers.length > 0
							? rebuiltMembers
							: [
								{
									_id: `new_${Date.now()}`,
									employee: null,
									employeeEofficeAccount: "",
									passport: null,
									passportType: "",
									hoTen: "",
									soHoChieu: "",
									chucVu: "",
									capBac: "",
									donVi: "",
									loaiCB: "",
									ngayHetHan: "",
								},
							]
					);
				}
			} catch (error) {
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Lỗi khi lấy chi tiết yêu cầu hộ chiếu!";
				toast(messageError, "error");
				logger.log("Lỗi khi lấy chi tiết yêu cầu hộ chiếu:", error);
			} finally {
				setIsLoading(false);
			}
		};
		fetchDataDetail();
	}, [id, open, reset, dispatch, toast]);

	// const handleDateRangeChange = useCallback(
	// 	({ startDate, endDate }) => {
	// 		const nextDepartureDate = startDate ? dayjs(startDate).toISOString() : null;
	// 		const nextArrivalDate = endDate ? dayjs(endDate).toISOString() : null;

	// 		setValue("departureDate", nextDepartureDate, {
	// 			shouldDirty: true,
	// 			shouldValidate: true,
	// 		});
	// 		setValue("arrivalDate", nextArrivalDate, {
	// 			shouldDirty: true,
	// 			shouldValidate: true,
	// 		});

	// 		setValue(
	// 			"passportBorrowDate",
	// 			nextDepartureDate
	// 				? dayjs(nextDepartureDate).subtract(5, "day").toISOString()
	// 				: null
	// 		);

	// 		setValue(
	// 			"passportReturnDate",
	// 			nextArrivalDate
	// 				? dayjs(nextArrivalDate).add(5, "day").toISOString()
	// 				: null
	// 		);

	// 		setTimeout(() => trigger(["departureDate", "arrivalDate"]), 0);
	// 	},
	// 	[setValue, trigger]
	// );

	const handleDateChange = useCallback(
    (field, fieldName) => (newDate) => {
      field.onChange(newDate ? dayjs(newDate).toISOString() : null);
      // Revalidate dependent fields (organizational)
      if (fieldName === "departureDate") {
        setTimeout(() => trigger("arrivalDate"), 0);
      }
      if (fieldName === "arrivalDate") {
        setTimeout(() => trigger("departureDate"), 0);
      }
    },
    [trigger]
  );

	// handleDateChange đơn giản cho user type (không cần revalidate cross-field)
	const handleDateChangeSimple = useCallback(
		(field) => (newDate) => {
			field.onChange(newDate ? dayjs(newDate).toISOString() : null);
		},
		[]
	);

	// ============ CLOSE ============
	const handleClose = useCallback(() => {
		reset(defaultValueRequestListPage);
		setMemberList([]);
		setValidationTriggered(false);
		onClose();
	}, [onClose, reset]);

	const getMemberUniqueKey = useCallback((member) => {
		if (!member) return null;
		const account =
			member?.employeeEofficeAccount ||
			member?.eofficeAccount ||
			member?.employee?.eofficeAccount ||
			member?.id ||
			member?._id ||
			member?.employee?.id ||
			member?.employee?._id;
		if (account && String(account).trim()) {
			return String(account).trim().toLowerCase();
		}
		return null;
	}, []);

	// ============ SAVE (UPDATE) ============
	const handleSave = useCallback(
		async (data) => {
			setValidationTriggered(true);
			if (isOrganizational === "organizational") {
				// Kiểm tra nếu chọn người trong đoàn mà ko chọn hộ chiếu cho người đó
				const hasMissingPassport = memberList.some(
					(m) => m.employee && !m.passport
				);
				if (hasMissingPassport) {
					toast(
						"Vui lòng chọn hộ chiếu cho tất cả các thành viên trong đoàn ra!",
						"error"
					);
					return;
				}

				const selectedEmployeeKeys = memberList
					.filter((m) => m.employee || m.employeeEofficeAccount)
					.map((m) => getMemberUniqueKey(m))
					.filter(Boolean);

				if (
					selectedEmployeeKeys.length !== new Set(selectedEmployeeKeys).size
				) {
					toast(
						"Danh sách đoàn ra có thành viên trùng lặp, vui lòng kiểm tra lại!",
						"error"
					);
					return;
				}

				const filterListOfOrganizations = (
					data.listOfOrganizations || []
				).filter((item) => item?.userId && item?.fullName?.trim());

				if (filterListOfOrganizations.length === 0) {
					setError("listOfOrganizations", {
						type: "manual",
						message:
							"Danh sách đoàn ra là bắt buộc, vui lòng thêm ít nhất 1 thành viên.",
					});
					toast(
						"Danh sách đoàn ra là bắt buộc, vui lòng thêm ít nhất 1 thành viên!",
						"warning"
					);
					return;
				}

				clearErrors("listOfOrganizations");
			}

			try {
				setIsLoading(true);
				// logger.log("Form Data (Edit):", data);

				let body;
				if (isOrganizational === "organizational") {
					const filterListOfOrganizations = (
						data.listOfOrganizations || []
					).filter((item) => item?.userId && item?.fullName?.trim());

					const hasOther = Array.isArray(data.destination)
						? data.destination.some((item) =>
								typeof item === "object"
									? item?.ivalued === "OTHER" || item?.id === "OTHER" || item?.value === "OTHER"
									: item === "OTHER"
						  )
						: typeof data.destination === "object"
						? data.destination?.ivalued === "OTHER" ||
						  data.destination?.id === "OTHER" ||
						  data.destination?.value === "OTHER"
						: data.destination === "OTHER";

					const formattedDestination = Array.isArray(data.destination)
						? data.destination
								.map((item) =>
									typeof item === "object"
										? item?.ivalued || item?.value || item?.id || item?.title
										: String(item)
								)
								.filter((val) => Boolean(val) && val !== "OTHER")
						: data.destination && data.destination !== "OTHER"
						? [
								typeof data.destination === "object"
									? data.destination?.ivalued ||
									  data.destination?.value ||
									  data.destination?.id ||
									  data.destination?.title
									: String(data.destination),
						  ].filter((val) => Boolean(val) && val !== "OTHER")
						: [];

					const formattedDestinationOther = hasOther
						? data.destinationOther?.trim() || ""
						: null;

					body = {
						typeRequest: "organizational",
						namePassportRequest: data.namePassportRequest || "",
						delegationLeader: data.delegationLeader?.id || null,
						position: data.position || "",
						destination: formattedDestination,
						destinationOther: formattedDestinationOther,
						isSpecificDepartureDate: data.isSpecificDepartureDate || false,
						departureDate: data.departureDate || null,
						arrivalDate: data.arrivalDate || null,
						partner: data.partner || "",
						typeOfFunding: data.typeOfFunding || "",
						tripContent: data.tripContent || "",
						decision: data.decision || "",
						note: data.note || "",
						listOfOrganizations: filterListOfOrganizations,
					};
				} else {
					// logger.log("Edit Data (User):", data);
					const nextPassportId = getEntityId(data.passportNumber);
					body = {
						typeRequest: "user",
						namePassportRequest:
							data.namePassportRequest?.id ||
							data.namePassportRequest?.value ||
							"",
						leader: data.leader?.id,
						passportNumber: data.passportNumber?.passportNumber,
						passportId: nextPassportId,
						borrowDate: data.borrowDate,
						returnDate: data.returnDate,
						tripContent: data.tripContent,
						passportType: data.passportType?.value || "",
					};
				}

				// logger.log("Request Body (Edit):", body);
				await dispatch(updatePassportRequest({ id, payload: body })).unwrap();

				if (isOrganizational !== "organizational") {
					const nextPassportId = getEntityId(data.passportNumber);
					const isPassportChanged =
						initialPassportId &&
						nextPassportId &&
						String(initialPassportId) !== String(nextPassportId);

					if (isPassportChanged) {
						try {
							await deleteFilesByObject("scanPassport", initialPassportId);
						} catch (deleteError) {
							logger.log("Lỗi khi xóa ảnh hộ chiếu cũ:", deleteError);
							toast(
								"Đã cập nhật hộ chiếu mới nhưng không thể xóa toàn bộ ảnh của hộ chiếu cũ.",
								"warning"
							);
						}
					}

					setInitialPassportId(nextPassportId || null);
					setSelectedPassportId(nextPassportId || null);
				}

				// Upload file cho organizational
				if (isOrganizational === "organizational") {
					const extractFiles = (value) => {
						if (!value) return [];
						const filesArray = Array.isArray(value) ? value : [value];
						return filesArray
							.map((fileObj) => {
								if (fileObj?.originFileObj instanceof File)
									return fileObj.originFileObj;
								if (fileObj?.file instanceof File) return fileObj.file;
								if (fileObj?.rawFile instanceof File) return fileObj.rawFile;
								if (fileObj instanceof File) return fileObj;
								return null;
							})
							.filter((file) => file !== null);
					};

					const passportFile = extractFiles(data.passportFile);
					// if (passportFile.length > 0) {
					//   const fileIds = [];
					//   for (const file of passportFile) {
					//     const uploadResult = await apiUploadFile(
					//       file,
					//       "passportFile",
					//       id
					//     );
					//     const fileId =
					//       uploadResult?.data?._id ||
					//       uploadResult?.data?.id ||
					//       uploadResult?._id ||
					//       uploadResult?.id ||
					//       null;
					//     if (fileId) {
					//       fileIds.push(fileId);
					//     }
					//   }

					//   if (fileIds.length > 0) {
					//     await dispatch(
					//       updatePassportRequest({
					//         id,
					//         payload: { passportFile: fileIds },
					//       })
					//     ).unwrap();
					//   }
					// }
					if (passportFile.length > 0) {
						const fileIds = [];
						const BATCH_SIZE = 10;
						for (let i = 0; i < passportFile.length; i += BATCH_SIZE) {
							const batch = passportFile.slice(i, i + BATCH_SIZE);

							const uploadResults = await Promise.all(
								batch.map((file) => apiUploadFile(file, "passportFile", id))
							);

							uploadResults.forEach((uploadResult) => {
								const fileId =
									uploadResult?.data?._id ||
									uploadResult?.data?.id ||
									uploadResult?._id ||
									uploadResult?.id ||
									null;

								if (fileId) {
									fileIds.push(fileId);
								}
							});
						}

						if (fileIds.length > 0) {
							await dispatch(
								updatePassportRequest({
									id,
									payload: { passportFile: fileIds },
								})
							).unwrap();
						}
					}
				}
				toast("Cập nhật yêu cầu mượn hộ chiếu thành công!", "success");
				reset(defaultValueRequestListPage);
				setMemberList([]);
				onSuccess?.();
				onClose();
			} catch (error) {
				logger.log("Lỗi khi cập nhật yêu cầu mượn hộ chiếu:", error);
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Cập nhật yêu cầu mượn hộ chiếu thất bại!";
				toast(messageError, "error");
			} finally {
				setIsLoading(false);
			}
		},
		[
			reset,
			onClose,
			onSuccess,
			toast,
			dispatch,
			id,
			isOrganizational,
			memberList,
			getMemberUniqueKey,
			getEntityId,
			initialPassportId,
			deleteFilesByObject,
			setError,
			clearErrors,
			setValidationTriggered,
		]
	);

	// ============ HANDLERS (user) ============
	const handleChangePassportNumber = useCallback(
		(value) => {
			logger.log("Selected passport number:", value);
			setValue("passportNumber", value);
			trigger("passportNumber");
			setSelectedPassportId(value?.id || value?._id || value?.passportId || null);
			if (value) {
				setValue("passportType", value.passportType || "");
			} else {
				setValue("passportType", null);
			}
		},
		[setValue, trigger]
	);

	// ============ HANDLERS (organizational) ============
	const handleChangeDelegationLeader = useCallback(
		(value) => {
			logger.log("Selected handleChangeDelegationLeader:", value);
			setValue("delegationLeader", value);
			trigger("delegationLeader");
			if (value) {
				setValue("position", value.position || "");
			} else {
				setValue("position", null);
			}
		},
		[setValue, trigger]
	);

	const handleCloseFileViewer = useCallback(() => {
		if (viewingFile.url) {
			URL.revokeObjectURL(viewingFile.url);
		}
		setViewingFile({ open: false, url: null, name: "", type: null });
	}, [viewingFile.url]);

	// const handleChangeSpecificDepartureDate = useCallback(
	//   (event) => {
	//     const checked = event.target.checked;
	//     logger.log("handleChangeSpecificDepartureDate", checked);
	//     setValue("isSpecificDepartureDate", checked);
	//     if (!checked) {
	//       setValue("departureDate", null);
	//       setValue("arrivalDate", null);
	//     }
	//   },
	//   [setValue]
	// );

	// ============ MEMBER TABLE LOGIC (organizational) ============
	// const canAddNewMemberRow = useMemo(() => {
	//   if (!Array.isArray(memberList) || memberList.length === 0) return true;
	//   return memberList.every((member) => {
	//     const fullName = member?.hoTen;
	//     if (typeof fullName === "string") {
	//       return fullName.trim() !== "";
	//     }
	//     return Boolean(fullName);
	//   });
	// }, [memberList]);

	const handleAddMember = useCallback(() => {
		setMemberList((prev) => [
			...prev,
			{
				_id: `new_${Date.now()}`,
				employee: null,
				employeeEofficeAccount: "",
				passport: null,
				passportType: "",
				hoTen: "",
				soHoChieu: "",
				chucVu: "",
				capBac: "",
				donVi: "",
				loaiCB: "",
				ngayHetHan: "",
			},
		]);
	}, []);

	const MemberSelectCell = React.memo(({ row, onSelect }) => {
		const handleChange = useCallback(
			(val) => {
				onSelect(val, row._id);
			},
			[onSelect, row._id]
		);

		const url = useMemo(() => {
			const excludeIds = memberList
				.filter((m) => m._id !== row._id && m.employee)
				.map((m) => {
					if (m.employee && typeof m.employee === "object") {
						return m.employee.id || m.employee._id || m.employee.value;
					}
					return m.employee;
				})
				.filter(Boolean);

			if (excludeIds.length === 0) {
				return `${API_PASSPORT_REQUEST}/users`;
			}

			const params = [];
			excludeIds.forEach((id) => {
				params.push(`excludeIds=${encodeURIComponent(id)}`);
				params.push(`excludeIds[]=${encodeURIComponent(id)}`);
			});
			return `${API_PASSPORT_REQUEST}/users?${params.join("&")}`;
		}, [row._id, memberList]);

		return (
			<AsyncAutoComplete
				fullWidth
				placeholder="Nhập tên thành viên"
				// url={`${API_PASSPORT_REQUEST}/borrowers`}
				url={url}
				queryParam="nameVn"
				optionLabel="nameVn"
				optionValue="id"
				value={row.employee}
				onChange={handleChange}
				returnObject
				size="small"
				unsetFontWeight
			/>
		);
	});
	MemberSelectCell.displayName = "MemberSelectCell";

	const PassportSelectCell = React.memo(({ row, onSelect, validationTriggered }) => {
		const handleChange = useCallback(
			(val) => {
				onSelect(val, row._id);
			},
			[onSelect, row._id]
		);

		const borrowerEofficeAccount =
			row?.employeeEofficeAccount || row?.employee?.eofficeAccount || row?.employee?.id || "";
		const employeeId = getEntityId(row?.employee) || "none";
		logger.log('borrowerEofficeAccount', borrowerEofficeAccount)
		// const passportUrl = borrowerEofficeAccount
		//   ? `${API_PASSPORT_REQUEST}/passports?eofficeAccount=${encodeURIComponent(borrowerEofficeAccount)}`
		//   : `${API_PASSPORT_REQUEST}/passports`;
		const passportUrl = useMemo(() => {
			if (!borrowerEofficeAccount) {
				return `${API_PASSPORT_REQUEST}/passports`;
			}
			return `${API_PASSPORT_REQUEST}/users/${borrowerEofficeAccount}/passports`;
		}, [borrowerEofficeAccount]);

		const hasError = validationTriggered && row.employee && !row.passport;

		return (
			<AsyncAutoComplete
				key={`passport-${row._id}-${employeeId}-${borrowerEofficeAccount || "all"}`}
				fullWidth
				placeholder="--Chọn hộ chiếu--"
				url={passportUrl}
				loadOnMount
				queryParam="passportNumber"
				optionLabel="passportNumber"
				optionValue="id"
				value={row.passport}
				onChange={handleChange}
				returnObject
				size="small"
				unsetFontWeight
				disabled={!row.employee}
				error={hasError}
				helperText={hasError ? "Bắt buộc chọn hộ chiếu" : ""}
			/>
		);
	});
	PassportSelectCell.displayName = "PassportSelectCell";

	const DeleteCell = React.memo(({ rowId, onRemove }) => {
		const handleClick = useCallback(() => {
			onRemove(rowId);
		}, [onRemove, rowId]);

		return (
			<DeleteMemberButton size="small" onClick={handleClick}>
				<SmallDeleteIcon />
			</DeleteMemberButton>
		);
	});
	DeleteCell.displayName = "DeleteCell";

	const handleRemoveMember = useCallback((memberId) => {
		setMemberList((prev) => prev.filter((m) => m._id !== memberId));
	}, []);

	const handleMemberSelect = useCallback(
		async (value, memberId) => {
			if (!value) {
				setMemberList((prev) =>
					prev.map((m) => {
						if (m._id !== memberId) return m;
						return {
							...m,
							employee: null,
							employeeEofficeAccount: "",
							passport: null,
							passportType: "",
							hoTen: "",
							soHoChieu: "",
							chucVu: "",
							capBac: "",
							donVi: "",
							loaiCB: "",
							ngayHetHan: "",
						};
					})
				);
				return;
			}

			const selectedMemberKey = getMemberUniqueKey(value);

			if (selectedMemberKey) {
				const isDuplicate = memberList.some(
					(m) =>
						m._id !== memberId && getMemberUniqueKey(m) === selectedMemberKey
				);
				if (isDuplicate) {
					toast(
						"Thành viên này đã được chọn trong danh sách đoàn ra!",
						"error"
					);
					return;
				}
			}

			// Lấy eofficeAccount trực tiếp từ borrowers API (giống AddMyRequest)
			const borrowerEofficeAccount =
				value?.eofficeAccount || value?.id || value?._id || "";

			// Auto-fill passport từ dữ liệu borrowers
			const passportAutoValue = value?.passportId
				? {
					id: value.passportId,
					passportId: value.passportId,
					passportNumber: value?.passportNumber || "",
					passportType: value?.passportType || "",
					expiryDate: value?.expiryDate || null,
				}
				: null;

			// Set dữ liệu cơ bản từ borrowers response
			setMemberList((prev) =>
				prev.map((m) => {
					if (m._id !== memberId) return m;
					return {
						...m,
						employee: value,
						employeeEofficeAccount: borrowerEofficeAccount,
						passport: passportAutoValue,
						passportType: value?.passportType || "",
						hoTen: value?.nameVn || value?.name || value?.fullName || "",
						soHoChieu: value?.passportNumber || "",
						chucVu: value?.position || "",
						capBac: value?.rank || "",
						donVi: value?.unit || "",
						loaiCB: value?.workerType || "",
						ngayHetHan: value?.expiryDate || null,
					};
				})
			);

			// // Gọi thêm detail API để lấy chức vụ, cấp bậc, đơn vị, loại CB
			// const employeeId = getEntityId(value);
			// if (employeeId) {
			//   try {
			//     const res = await dispatch(
			//       dataDetailEmployeePassPortListPage(employeeId)
			//     ).unwrap();
			//     setMemberList((prev) =>
			//       prev.map((m) => {
			//         if (m._id !== memberId) return m;
			//         return {
			//           ...m,
			//           chucVu: res?.jobId?.nameVn || m.chucVu,
			//           capBac: res?.idArmyRank?.nameVn || "",
			//           donVi: res?.organization?.nameVn || "",
			//           loaiCB: res?.workerType?.nameVn || "",
			//         };
			//       })
			//     );
			//   } catch (error) {
			//     logger.log("Error fetching employee detail:", error);
			//   }
			// }
		},
		[memberList, toast, getMemberUniqueKey]
	);

	const handlePassportSelect = useCallback((value, memberId) => {
		setMemberList((prev) =>
			prev.map((m) => {
				if (m._id !== memberId) return m;
				return {
					...m,
					passportType: value?.passportType || "",
					passport: value,
					soHoChieu: value?.passportNumber || "",
					ngayHetHan: value?.expiryDate || null,
				};
			})
		);
	}, []);

	const totalMembers = memberList.filter((m) => m.hoTen).length;
	const totalPassports = memberList.filter((m) => m.soHoChieu).length;

	// Sync memberList → listOfOrganizations form field
	useEffect(() => {
		if (isOrganizational === "user") return;
		const mappedOrganizations = memberList.map((item) => {
			// logger.log("Mapping organization item:", item);
			const employee = item?.employee || {};
			return {
				userId:
					item.employeeEofficeAccount ||
					employee?.eofficeAccount ||
					employee?.id ||
					employee?._id ||
					undefined,
				fullName:
					item.hoTen ||
					employee?.nameVn ||
					employee?.name ||
					employee?.fullName ||
					"",
				passportId: getEntityId(item.passport) || undefined,
				passportNumber: item.soHoChieu || undefined,
				position: item.chucVu || undefined,
				rank: item.capBac || undefined,
				unit: item.donVi || undefined,
				cbType: item.loaiCB || undefined,
				expiryDate: item.ngayHetHan || undefined,
				passportType: item.passportType || undefined,
			};
		});

		setValue("listOfOrganizations", mappedOrganizations, {
			shouldDirty: true,
			shouldTouch: true,
		});

		const hasValidOrganizations = memberList.some(
			(item) =>
				!!item?.employee ||
				!!item?.employeeEofficeAccount ||
				(typeof item?.hoTen === "string" && item.hoTen.trim() !== "")
		);

		if (hasValidOrganizations) {
			clearErrors("listOfOrganizations");
		}
	}, [memberList, setValue, isOrganizational, getEntityId, clearErrors]);

	const memberColumns = useMemo(
		() => [
			{
				name: "hoTen",
				title: "Họ tên",
				width: "200px",
				renderCell: ({ row }) => (
					<MemberSelectCell row={row} onSelect={handleMemberSelect} />
				),
			},
			{
				name: "soHoChieu",
				title: "Số hộ chiếu",
				width: "180px",
				renderCell: ({ row }) => (
					<PassportSelectCell
						row={row}
						onSelect={handlePassportSelect}
						validationTriggered={validationTriggered}
					/>
				),
			},
			{ name: "chucVu", title: "Chức vụ", width: "150px" },
			{ name: "capBac", title: "Cấp bậc", width: "120px" },
			{ name: "donVi", title: "Đơn vị", width: "150px" },
			// { name: "loaiCB", title: "Loại CB", width: "100px" },
			{ name: "ngayHetHan", title: "Ngày hết hạn", width: "120px" },
			{
				name: "",
				title: "",
				width: "50px",
				alignCenter: true,
				renderCell: ({ row }) => (
					<DeleteCell rowId={row._id} onRemove={handleRemoveMember} />
				),
			},
		],
		[handleMemberSelect, handlePassportSelect, handleRemoveMember, validationTriggered]
	);

	// Kiểm tra người đề nghị khác người mượn
	const namePassportRequestValue = watch("namePassportRequest");
	const borrowerEofficeAccount = useMemo(() => {
		if (!namePassportRequestValue) return "";
		if (typeof namePassportRequestValue === "string") return namePassportRequestValue;
		return (
			namePassportRequestValue?.id ||
			namePassportRequestValue?._id ||
			namePassportRequestValue?.eofficeAccount ||
			namePassportRequestValue?.value ||
			""
		);
	}, [namePassportRequestValue]);

	const passportUrl = useMemo(() => {
		if (!borrowerEofficeAccount) {
			return `${API_PASSPORT_REQUEST}/passports`;
		}
		return `${API_PASSPORT_REQUEST}/users/${borrowerEofficeAccount}/passports`;
	}, [borrowerEofficeAccount]);

	const leaderUrl = useMemo(() => {
		if (!borrowerEofficeAccount) {
			return `${API_PASSPORT_REQUEST}/leaders`;
		}
		return `${API_PASSPORT_REQUEST}/leaders?borrowerId=${borrowerEofficeAccount}`;
	}, [borrowerEofficeAccount]);

	const isRequesterDifferent = useMemo(() => {
		if (!requesterInfo?.id || !namePassportRequestValue?.id) return false;
		return requesterInfo.id !== namePassportRequestValue.id;
	}, [requesterInfo, namePassportRequestValue]);

	const borrowDate = watch("borrowDate");

	// ============ RENDER: User Form ============
	const renderUserForm = () => (
		<>
			<StyledBoxContainerContent styledMarginTop>
				<TitleBox>
					<StyledTitleWithToggle>
						<FileIconSvg />
						<StyledSectionTitle variant="h6" noWrap>
							THÔNG TIN YÊU CẦU MƯỢN HỘ CHIẾU CÁ NHÂN
						</StyledSectionTitle>
					</StyledTitleWithToggle>
					<StatusWrapper>
						<SecondaryTypography variant="body2">Trạng thái:</SecondaryTypography>
						<div
							dangerouslySetInnerHTML={{
								__html: DOMPurify.sanitize(`<p>${dataDetailPassportRequest?.status?.title || ""}</p>`),
							}}
						/>
					</StatusWrapper>
				</TitleBox>
				<Grid container spacing={2} mt={2}>
					{isRequesterDifferent && (
						<>
							<Grid item xs={12} md={6} sm={6}>
								<InputComponents
									label="Người đề nghị"
									value={requesterInfo?.name || ""}
									disabled
								/>
							</Grid>
							<Grid item xs={12} md={6} sm={6}>
								<InputComponents
									label="Đơn vị"
									value={requesterInfo?.organizationName || ""}
									disabled
								/>
							</Grid>
						</>
					)}
					<Grid item xs={12} md={6} sm={6}>
						<Controller
							name="namePassportRequest"
							control={control}
							render={({ field }) => (
								<AsyncAutoComplete
									fullWidth
									label="Người mượn"
									placeholder="Tìm kiếm người mượn..."
									url={`${API_PASSPORT_REQUEST}/borrowers`}
									queryParam="nameVn"
									optionLabel="nameVn"
									optionValue="eofficeAccount"
									value={field.value}
									onChange={field.onChange}
									error={!!errors.namePassportRequest}
									helperText={errors.namePassportRequest?.message}
									size="small"
									required
									unsetFontWeight
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Controller
							name="leader"
							control={control}
							render={({ field }) => (
								<AsyncAutoComplete
									key={`leader-${borrowerEofficeAccount || "all"}`}
									fullWidth
									label="Lãnh đạo"
									placeholder="Tìm kiếm lãnh đạo..."
									url={leaderUrl}
									queryParam="nameVn"
									optionLabel="nameVn"
									optionValue="id"
									value={field.value}
									onChange={field.onChange}
									error={!!errors.leader}
									helperText={errors.leader?.message}
									size="small"
									required
									unsetFontWeight
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Controller
							name="passportNumber"
							control={control}
							render={({ field }) => (
								<AsyncAutoComplete
									fullWidth
									label="Số hộ chiếu"
									placeholder="Tìm kiếm số hộ chiếu..."
									url={passportUrl}
									queryParam="passportNumber"
									optionLabel="passportNumber"
									optionValue="id"
									value={field.value}
									onChange={handleChangePassportNumber}
									error={!!errors.passportNumber}
									helperText={errors.passportNumber?.message}
									size="small"
									required
									unsetFontWeight
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Controller
							name="passportType"
							control={control}
							render={({ field }) => (
								<CustomAutoCompleteSearch
									select
									code="passPortType"
									label="Loại hộ chiếu"
									placeholder="Nhập dữ liệu..."
									customLabel="title"
									customValue="value"
									{...field}
									error={!!errors.passportType}
									helperText={errors.passportType?.message}
									unsetFontWeight
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Controller
							name="borrowDate"
							control={control}
							render={({ field }) => (
								<DatePicker
									label="Ngày dự kiến mượn"
									value={field.value ? dayjs(field.value) : null}
									onChange={handleDateChangeSimple(field)}
									minDate={dayjs()}
									required
									error={!!errors.borrowDate}
									helperText={errors.borrowDate?.message}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Controller
							name="returnDate"
							control={control}
							render={({ field }) => (
								<DatePicker
									label="Ngày dự kiến trả"
									value={field.value ? dayjs(field.value) : null}
									onChange={handleDateChangeSimple(field)}
									required
									error={!!errors.returnDate}
									helperText={errors.returnDate?.message}
									minDate={borrowDate ? dayjs(borrowDate) : dayjs()}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12}>
						<Controller
							name="tripContent"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Lý do"
									placeholder="Nhập lý do..."
									{...field}
									error={!!errors.tripContent}
									helperText={errors.tripContent?.message}
									multiline
									rows={2}
								/>
							)}
						/>
					</Grid>
				</Grid>
			</StyledBoxContainerContent>
			<StyledBoxContainerContent styledMarginTop>
				<Grid item xs={12}>
					<UploadFile
						// label="SCAN ẢNH HỘ CHIẾU"
						// manualUpload
						objectId={selectedPassportId}
						objectType="scanPassport"
						id="scanFile-upload"
						editFile
						// required
						noneBorder
						hiddenUploadAndScan
						isActionMenu
						isView
						customLabel={
							<StyledTitleWithToggle>
								<FileIconSvg />
								<StyledSectionTitle variant="h6" noWrap>
									HÌNH ẢNH HỘ CHIẾU
								</StyledSectionTitle>
							</StyledTitleWithToggle>
						}
					/>
				</Grid>
			</StyledBoxContainerContent>
		</>
	);

	// ============ RENDER: Organizational Form ============
	const renderOrganizationalForm = () => (
		<>
			<StyledBoxContainerContent styledMarginTop>
				<TitleBox>
					<StyledTitleWithToggle>
						<FileIconSvg />
						<StyledSectionTitle variant="h6" noWrap>
							THÔNG TIN YÊU CẦU MƯỢN HỘ CHIẾU ĐOÀN RA
						</StyledSectionTitle>
					</StyledTitleWithToggle>
					<StatusWrapper>
						<SecondaryTypography variant="body2">
							Trạng thái:
						</SecondaryTypography>
						<div
							dangerouslySetInnerHTML={{
								__html: DOMPurify.sanitize(`<p>${dataDetailPassportRequest?.status?.title || ""}</p>`),
							}}
						/>
					</StatusWrapper>
				</TitleBox>
				<Grid container spacing={2} mt={2}>
					<Grid item xs={12} md={4} sm={6}>
						<Controller
							name="namePassportRequest"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Tên đoàn"
									placeholder="Nhập dữ liệu..."
									{...field}
									error={!!errors.namePassportRequest}
									helperText={errors.namePassportRequest?.message}
									required
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4}>
						<Controller
							name="delegationLeader"
							control={control}
							render={({ field }) => (
								<AsyncAutoComplete
									fullWidth
									label="Trưởng đoàn"
									placeholder="Tìm kiếm trưởng đoàn..."
									url={`${API_PASSPORT_REQUEST}/delegation-leaders`}
									queryParam="nameVn"
									optionLabel="nameVn"
									optionValue="id"
									value={field.value}
									onChange={handleChangeDelegationLeader}
									error={!!errors.delegationLeader}
									helperText={errors.delegationLeader?.message}
									size="small"
									required
									unsetFontWeight
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} md={4} sm={6}>
						<Controller
							name="position"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Chức vụ"
									placeholder="Nhập dữ liệu..."
									{...field}
									error={!!errors.position}
									helperText={errors.position?.message}
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4}>
						<Controller
							name="destination"
							control={control}
							render={({ field }) => (
								<AsyncAutoComplete
									fullWidth
									label="Nơi đến"
									placeholder="Tìm kiếm nơi đến..."
									url={`${API_PASSPORT}/countries`}
									queryParam="title"
									optionLabel="title"
									optionValue="ivalued"
									isMulti
									allowOtherOption
									value={field.value || []}
									onChange={handleDestinationChange}
									error={!!errors.destination}
									helperText={errors.destination?.message}
									size="small"
									required
									unsetFontWeight
									limitTags={4}
								/>
							)}
						/>
					</Grid>
					{isDestinationOther && (
						<Grid item xs={12} sm={6} md={4}>
							<Controller
								name="destinationOther"
								control={control}
								render={({ field }) => (
									<InputComponents
										label="Nơi đến (khác)"
										placeholder="Nhập địa chỉ Nơi đến khác..."
										{...field}
										error={!!errors.destinationOther}
										helperText={errors.destinationOther?.message}
										required
									/>
								)}
							/>
						</Grid>
					)}
					{/* <Grid item xs={12} sm={6} md={4}>
						<DateTimeRangePicker
							label="Ngày đi - Ngày về"
							value={{
								startDate: departureDate,
								endDate: arrivalDate,
							}}
							onChange={handleDateRangeChange}
							minDate={dayjs().add(5, "day")}
							error={!!(errors.departureDate || errors.arrivalDate)}
							helperText={errors.departureDate?.message || errors.arrivalDate?.message}
							required
						/>
					</Grid> */}
					<Grid item xs={12} sm={6} md={4}>
            <Controller
              name="departureDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Ngày đi"
                  value={field.value ? dayjs(field.value) : null}
                  onChange={handleDateChange(field, "departureDate")}
                  minDate={dayjs().add(5, "day")}
                  error={!!errors.departureDate}
                  helperText={errors.departureDate?.message}
                  required
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller
              name="arrivalDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Ngày về"
                  value={field.value ? dayjs(field.value) : null}
                  onChange={handleDateChange(field, "arrivalDate")}
                  error={!!errors.arrivalDate}
                  helperText={errors.arrivalDate?.message}
                  minDate={departureDate ? dayjs(departureDate) : dayjs()}
                  required
                />
              )}
            />
          </Grid>
					{/* <Grid item xs={12} sm={6} md={2}>
						<Controller
							name="passportBorrowDate"
							control={control}
							render={({ field }) => (
								<DatePicker
									label="Ngày dự kiến mượn"
									value={field.value ? dayjs(field.value) : null}
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={2}>
						<Controller
							name="passportReturnDate"
							control={control}
							render={({ field }) => (
								<DatePicker
									label="Ngày dự kiến trả"
									value={field.value ? dayjs(field.value) : null}
									disabled
								/>
							)}
						/>
					</Grid> */}
					<Grid item xs={12} sm={6} md={8}>
						<Controller
							name="partner"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Đối tác"
									placeholder="Nhập đối tác..."
									{...field}
									error={!!errors.partner}
									helperText={errors.partner?.message}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4}>
						<Controller
							name="typeOfFunding"
							control={control}
							render={({ field }) => (
								<CustomAutoCompleteSearch
									select
									code="typeOfFunding"
									label="Loại kinh phí"
									placeholder="Nhập dữ liệu..."
									customLabel="title"
									customValue="value"
									{...field}
									error={!!errors.typeOfFunding}
									helperText={errors.typeOfFunding?.message}
									unsetFontWeight
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12}>
						<Controller
							name="partnerGifts"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Quà tặng TCT"
									placeholder="Nhập quà tặng TCT..."
									{...field}
									error={!!errors.partnerGifts}
									helperText={errors.partnerGifts?.message}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12}>
						<Controller
							name="tripContent"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Nội dung chuyến đi"
									placeholder="Nhập nội dung chuyến đi..."
									{...field}
									error={!!errors.tripContent}
									helperText={errors.tripContent?.message}
									multiline
									rows={2}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12}>
						<Controller
							name="decision"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Quyết định"
									placeholder="Nhập quyết định..."
									{...field}
									error={!!errors.decision}
									helperText={errors.decision?.message}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12}>
						<Controller
							name="note"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Ghi chú"
									placeholder="Nhập ghi chú..."
									{...field}
									error={!!errors.note}
									helperText={errors.note?.message}
								/>
							)}
						/>
					</Grid>
				</Grid>
			</StyledBoxContainerContent>
			<StyledBoxContainerContent styledMarginTop>
				<Grid item xs={12}>
					<Controller
						name="passportFile"
						control={control}
						defaultValue={[]}
						render={({ field, fieldState }) => (
							<UploadFile
								{...field}
								label="TỆP ĐÍNH KÈM QUYẾT ĐỊNH ĐOÀN RA"
								customLabel={
									// <StyledHeaderContent variant="h6" noWrap isView>
									// 	TỆP ĐÍNH KÈM QUYẾT ĐỊNH ĐOÀN RA
									// </StyledHeaderContent>
									<StyledTitleWithToggle>
										<FileIconSvg />
										<StyledSectionTitle variant="h6" noWrap>
											TỆP ĐÍNH KÈM QUYẾT ĐỊNH ĐOÀN RA
										</StyledSectionTitle>
									</StyledTitleWithToggle>
								}
								// manualUpload
								objectId={id}
								objectType="passportFile"
								id="passportFile-upload"
								error={!!fieldState.error}
								helperText={fieldState.error?.message}
								noneBorder
								hiddenButtonScan
								isActionMenu={isActionMenu}
							/>
						)}
					/>
				</Grid>
			</StyledBoxContainerContent>
			<StyledBoxContainerContent styledMarginTop>
				<Grid item xs={12}>
					<Controller
						name="listOfOrganizations"
						control={control}
						defaultValue={[]}
						render={() => (
							<>
								<MemberTableHeader>
									{/* <StyledHeaderContent variant="h6" noWrap isView>
										Danh sách đoàn ra <StyledRequiredIcon>*</StyledRequiredIcon>
									</StyledHeaderContent> */}
									<StyledTitleWithToggle>
										<FileIconSvg />
										<StyledSectionTitle variant="h6" noWrap>
											DANH SÁCH ĐOÀN RA <StyledRequiredIcon>*</StyledRequiredIcon>
										</StyledSectionTitle>
									</StyledTitleWithToggle>
									<MemberTableActions>
										<Typography variant="body2">
											Tổng số thành viên: <strong>{totalMembers}</strong>
										</Typography>
										<Typography variant="body2">
											Tổng số hộ chiếu: <strong>{totalPassports}</strong>
										</Typography>
										<Tooltip title="Thêm thành viên">
											<AddMemberButton
												onClick={handleAddMember}
												size="small"
											// disabled={!canAddNewMemberRow}
											>
												<Add />
											</AddMemberButton>
										</Tooltip>
									</MemberTableActions>
								</MemberTableHeader>
								<TableWrapperPassport>
									<CusTomTableFreeStyle
										data={memberList}
										columns={memberColumns}
										onlyTable
										noneTitle
										disableAct
										disableCheckbox
										autoHeight
									/>
								</TableWrapperPassport>
								{!!errors?.listOfOrganizations?.message && (
									<StyledRequiredText>
										{errors.listOfOrganizations.message}
									</StyledRequiredText>
								)}
							</>
						)}
					/>
				</Grid>
			</StyledBoxContainerContent>
		</>
	);

	// ============ MAIN RETURN ============
	return (
		<>
			<BaseSwipper
				title={title || "Chỉnh sửa yêu cầu"}
				open={open}
				onClose={handleClose}
				onSave={handleSubmit(handleSave)}
				type="edit"
				hideBackdrop
				footer={
					<>
						<FlexGrowBox />
						<FooterActions>
							<ButtonOutline
								onClick={handleSubmit(handleSave)}
								disabled={isLoading}
								variant="outlined"
							>
								Lưu
							</ButtonOutline>
						</FooterActions>
					</>
				}
				isLoading={isLoading}
			>
				{isLoading && (
					<StyledLoadingPopupSignDigital>
						<CircularProgress />
					</StyledLoadingPopupSignDigital>
				)}
				{isOrganizational === "organizational"
					? renderOrganizationalForm()
					: renderUserForm()}
			</BaseSwipper>
			{isOrganizational === "organizational" && (
				<FileViewerDialog
					open={viewingFile.open}
					onClose={handleCloseFileViewer}
					fileUrl={viewingFile.url}
					fileName={viewingFile.name}
					fileType={viewingFile.type}
					title={`Xem file: ${viewingFile.name}`}
				/>
			)}
		</>
	);
};

EditRequest.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSuccess: PropTypes.func,
	sharedComponents: PropTypes.object.isRequired,
	title: PropTypes.string,
	id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	typeRequest: PropTypes.oneOf(["user", "organizational"]),
	isActionMenu: PropTypes.bool,
};

export default withSharedComponents(EditRequest);
