import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	// Checkbox,
	CircularProgress,
	// FormControlLabel,
	Grid,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { useToast } from "@components/common/ToastProvider";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";

import { StyledBoxContainerContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
	API_PASSPORT,
	API_PASSPORT_REQUEST,
} from "@EnvironmentFile/constants/urlConfig";
import {
	addPassportRequest,
	// dataDetailEmployeePassPortListPage,
	updatePassportRequest,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
// eslint-disable-next-line no-restricted-imports
import {
	defaultValueRequestListPage,
	passportOrganizationalRequestSchema,
} from "../constantsRequestListPage";
import UploadFile from "@components/UploadFile";
import { FileViewerDialog } from "@components/CustomDialog";
import CusTomTableFreeStyle from "@components/CustomTable/CusTomTableFreeStyle";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
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
import withFormWrapper from "@components/common/FormWrapper";
import { StyledSectionTitle, StyledTitleWithToggle } from "@styles/RecordDestruction/RecordDestruction.styles";
import { FileIconSvg } from "@assets/icons/FileIconSvg";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";

const AddOrganizationalRequest = (props) => {
	const {
		open,
		onClose,
		onSuccess,
		sharedComponents,
		// mode = "add",
		title, // Nhận title từ props
		isActionMenu = false,
	} = props;
	const {
		// CustomSwipper,
		BaseSwipper,
		InputComponents: BaseInput,
		DatePicker: BaseDatePicker,
		ButtonOutline,
		AsyncAutoComplete: BaseAsyncAutoComplete,
		CustomAutoCompleteSearch: BaseCustomAutoCompleteSearch,
		// DateTimeRangePicker: BaseDateTimeRangePicker,
	} = sharedComponents;

	const toast = useToast();
	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);
	const [validationTriggered, setValidationTriggered] = useState(false);
	// const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState(null);
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
		resolver: yupResolver(passportOrganizationalRequestSchema),
		defaultValues: defaultValueRequestListPage,
		mode: "onChange",
	});

	const clientRequestIdRef = useRef(null);

	useEffect(() => {
		if (open) {
			if (!clientRequestIdRef.current) {
				clientRequestIdRef.current = crypto.randomUUID();
			}
		} else {
			clientRequestIdRef.current = null;
		}
	}, [open]);

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

	const InputComponents = useMemo(() => {
		return withFormWrapper(BaseInput, "input");
	}, [BaseInput]);

	// const DatePicker = useMemo(() => {
	// 	return withFormWrapper(BaseDatePicker, "date");
	// }, [BaseDatePicker]);

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

	const DatePicker = useMemo(() => {
		const Wrapped = withFormWrapper(BaseDatePicker, "date");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "DatePicker";
		return Component;
	}, [BaseDatePicker]);

	// const DateTimeRangePicker = useMemo(() => {
	// 	const Wrapped = withFormWrapper(BaseDateTimeRangePicker, "date");
	// 	const Component = (props) => <Wrapped {...props} />;
	// 	Component.displayName = "DateTimeRangePicker";
	// 	return Component;
	// }, [BaseDateTimeRangePicker]);

	const [viewingFile, setViewingFile] = useState({
		open: false,
		url: null,
		name: "",
		type: null,
	});

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

	// ============ MEMBER TABLE LOGIC ============
	
	const [memberList, setMemberList] = useState([
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

	const handleClose = useCallback(async () => {
		reset(defaultValueRequestListPage);
		setValidationTriggered(false);
		// setSelectedEmployeeDetails(null);
		onClose();
	}, [onClose, reset]);

	const getEntityId = useCallback((entity) => {
		if (!entity) return null;
		return entity.id || entity._id || entity.value || null;
	}, []);

	const getMemberUniqueKey = useCallback((member) => {
		if (!member) return null;
		// Chỉ dùng eofficeAccount để xác định trùng thành viên
		const account = member?.eofficeAccount || member?.employeeEofficeAccount;
		if (account && String(account).trim()) {
			return String(account).trim().toLowerCase();
		}

		return null;
	}, []);

	const handleSave = useCallback(
		async (data) => {
			setValidationTriggered(true);

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

			// Kiểm tra trùng lặp thành viên trước khi lưu
			const selectedEmployeeIds = memberList
				.filter((m) => m.employee)
				.map((m) => getMemberUniqueKey(m.employee))
				.filter(Boolean);
			if (selectedEmployeeIds.length !== new Set(selectedEmployeeIds).size) {
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
					message: "Danh sách đoàn ra là bắt buộc, vui lòng thêm ít nhất 1 thành viên.",
				});
				toast(
					"Danh sách đoàn ra là bắt buộc, vui lòng thêm ít nhất 1 thành viên!",
					"warning"
				);
				return;
			}

			clearErrors("listOfOrganizations");

			try {
				setIsLoading(true);
				// logger.log("Form Data:", data);

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

				const body = {
					typeRequest: "organizational",
					namePassportRequest: data.namePassportRequest || "", //Tên đoàn
					delegationLeader: data.delegationLeader?.id || null, //Trưởng đoàn
					position: data.position || "", //Chức vụ
					destination: formattedDestination, //Nơi đến
					destinationOther: formattedDestinationOther, //Nơi đến khác
					isSpecificDepartureDate: data.isSpecificDepartureDate || true, //Ngày khởi hành cụ thể
					departureDate: data.departureDate || null, //Ngày đi
					arrivalDate: data.arrivalDate || null, //Ngày về
					partner: data.partner || "", //Đối tác làm việc
					typeOfFunding: data.typeOfFunding || "", //Nguồn kinh phí
					tripContent: data.tripContent || "", //Nội dung chuyến đi
					decision: data.decision || "", //Quyết định
					note: data.note || "", //Ghi chú
					listOfOrganizations: filterListOfOrganizations, //Danh sách đoàn ra
					clientRequestId: clientRequestIdRef.current,
				};
				// logger.log("Request Body:", body);
				const res = await dispatch(addPassportRequest(body)).unwrap();
				clientRequestIdRef.current = crypto.randomUUID();
				const passportRequestId =
					res?.data?._id || res?.data?.id || res?._id || res?.id || null;
				const extractFiles = (value) => {
					if (!value) return [];

					const filesArray = Array.isArray(value) ? value : [value];

					return filesArray
						.map((fileObj) => {
							// Check và return File instance thực sự
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
				if (passportFile.length > 0) {
					const fileIds = [];
					const BATCH_SIZE = 10;
					for (let i = 0; i < passportFile.length; i += BATCH_SIZE) {
						const batch = passportFile.slice(i, i + BATCH_SIZE);

						const uploadResults = await Promise.all(
							batch.map((file) =>
								apiUploadFile(file, "passportFile", passportRequestId)
							)
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
								id: passportRequestId,
								payload: { passportFile: fileIds },
							})
						).unwrap();
					}
				}
				toast("Thêm mới yêu cầu mượn hộ chiếu thành công!", "success");
				reset(defaultValueRequestListPage);
				onSuccess?.();
				onClose();
			} catch (error) {
				logger.log("Lỗi khi thêm mới yêu cầu mượn hộ chiếu:", error);
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Thêm mới yêu cầu mượn hộ chiếu thất bại!";
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
			memberList,
			getMemberUniqueKey,
			setError,
			clearErrors,
			setValidationTriggered,
		]
	);

	const handleChangeDelegationLeader = useCallback(
		(value) => {
			// logger.log("Selected handleChangeDelegationLeader:", value);
			setValue("delegationLeader", value);
			trigger("delegationLeader");
			if (value) {
				// Auto-fill các trường thông tin từ dữ liệu nhân viên
				setValue("position", value.position || "");
			} else {
				// Reset các trường khi xóa lựa chọn
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
	//     // logger.log("handleChangeSpecificDepartureDate", checked);
	//     setValue("isSpecificDepartureDate", checked);
	//     // 🔥 Logic phụ thuộc
	//     if (!checked) {
	//       // Ví dụ: reset các field liên quan
	//       setValue("departureDate", null);
	//       setValue("passportReturnDate", null);
	//     }
	//     if (checked) {
	//       // Ví dụ: bật required cho 1 field khác
	//       logger.log("Đang chọn ngày cụ thể");
	//     }
	//   },
	//   [setValue]
	// );

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
		// if (!canAddNewMemberRow) {
		//   toast("Vui lòng nhập Họ tên trước khi thêm mới hàng", "warning");
		//   return;
		// }
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

		// Scroll xuống cuối sau khi thêm dòng mới
		setTimeout(() => {
			const container = document.querySelector(".MuiTableContainer-root");
			if (container) {
				container.scrollTo({
					top: container.scrollHeight,
					behavior: "smooth",
				});
			}
		}, 100);
	}, []);

	const MemberSelectCell = React.memo(({ row, onSelect }) => {
		const handleChange = useCallback(
			(val) => {
				// logger.log("Selected member:", val);
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
		}, [row._id]);

		return (
			<AsyncAutoComplete
				fullWidth
				placeholder="Nhập tên thành viên"
				// url={`${API_PASSPORT_REQUEST}/borrowers`}
				url={url}
				queryParam="nameVn"
				optionLabel="nameVn"
				// optionValue="eofficeAccount"
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
		// logger.log('row', row)

		const borrowerEofficeAccount =
			row?.employeeEofficeAccount || row?.employee?.eofficeAccount || row?.employee?.id || "";
		// const employeeId = getEntityId(row?.employee) || "none";
		// const passportUrl = borrowerEofficeAccount
		//   ? `${API_PASSPORT_REQUEST}/passports?eofficeAccount=${encodeURIComponent(borrowerEofficeAccount)}`
		//   : `${API_PASSPORT_REQUEST}/passports`;

		const passportUrl = useMemo(() => {
			if (!borrowerEofficeAccount) {
				return `${API_PASSPORT_REQUEST}/passports`;
			}
			return `${API_PASSPORT_REQUEST}/users/${borrowerEofficeAccount}/passports`;
			// return `${API_PASSPORT_REQUEST}/passports?eofficeAccount=${encodeURIComponent(
			//   borrowerEofficeAccount
			// )}`;
		}, [borrowerEofficeAccount]);

		const hasError = validationTriggered && row.employee && !row.passport;

		return (
			<AsyncAutoComplete
				key={`passport-${row._id}-${borrowerEofficeAccount || "all"}`}
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

			// Kiểm tra thành viên đã tồn tại trong danh sách
			const selectedMemberKey = getMemberUniqueKey(value);
			if (selectedMemberKey) {
				const isDuplicate = memberList.some(
					(m) =>
						m._id !== memberId &&
						getMemberUniqueKey(m.employee) === selectedMemberKey
				);
				if (isDuplicate) {
					toast(
						"Thành viên này đã được chọn trong danh sách đoàn ra!",
						"error"
					);
					return;
				}
			}

			// API có thể trả về eofficeAccount hoặc id/_id, nên cần fallback để không mất userId khi submit
			const borrowerEofficeAccount =
				value?.eofficeAccount || value?.id || value?._id || "";

			// Auto-fill passport từ dữ liệu borrowers (giống AddMyRequest)
			const passportAutoValue = value?.passportId
				? {
					id: value.passportId,
					passportId: value.passportId,
					passportNumber: value?.passportNumber || "",
					passportType: value?.passportType || "",
					expiryDate: value?.expiryDate || null,
				}
				: null;

			// Set dữ liệu cơ bản từ borrowers response trước
			setMemberList((prev) =>
				prev.map((m) => {
					if (m._id !== memberId) return m;
					logger.log("prev", prev);
					logger.log("value", value);
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

	// const handlePassportSelect = useCallback((value, memberId) => {
	// 	setMemberList((prev) =>
	// 		prev.map((m) => {
	// 			if (m._id !== memberId) return m;
	// 			return {
	// 				...m,
	// 				passport: value,
	// 				soHoChieu: value?.passportNumber || "",
	// 				// ngayHetHan: value?.expiryDate
	// 				//   ? dayjs(value.expiryDate).format("DD/MM/YYYY")
	// 				// 	: "",
	// 				ngayHetHan: value?.expiryDate || null,
	// 			};
	// 		})
	// 	);
	// }, []);

	const handlePassportSelect = useCallback((value, memberId) => {
		setMemberList((prev) => {
			// logger.log("Prev member list:", prev);
			// logger.log("Selecting passport:", value);

			// const PASSPORT_TYPE_MAP = {
			//   ORDINARY: "Hộ chiếu phổ thông",
			//   DIPLOMATIC: "Hộ chiếu ngoại giao",
			//   OFFICIAL: "Hộ chiếu công vụ",
			// };
			// const mapNamePassportType = (type) => PASSPORT_TYPE_MAP[type] || "";

			return prev.map((m) => {
				if (m._id !== memberId) return m;

				return {
					...m,
					// passportType: mapNamePassportType(value?.passportType),
					passportType: value?.passportType || "",
					passport: value,
					soHoChieu: value?.passportNumber || "",
					ngayHetHan: value?.expiryDate || null,
				};
			});
		});
	}, []);

	const totalMembers = memberList.filter((m) => m.hoTen).length;
	const totalPassports = memberList.filter((m) => m.soHoChieu).length;

	useEffect(() => {
		const mappedOrganizations = memberList.map((item) => {
			logger.log("Mapping member item:", item);
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
	}, [memberList, setValue, getEntityId, clearErrors]);

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
			{
				name: "chucVu",
				title: "Chức vụ",
				width: "150px",
			},
			{
				name: "capBac",
				title: "Cấp bậc",
				width: "120px",
			},
			{
				name: "donVi",
				title: "Đơn vị",
				width: "150px",
			},
			// {
			//   name: "loaiCB",
			//   title: "Loại CB",
			//   width: "100px",
			// },
			{
				name: "ngayHetHan",
				title: "Ngày hết hạn",
				width: "120px",
			},
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

	const handleDateChange = useCallback(
    (field, fieldName) => (newDate) => {
      field.onChange(newDate ? dayjs(newDate).toISOString() : null);

      if (fieldName === "departureDate") {
        setValue(
          "passportBorrowDate",
          newDate ? dayjs(newDate).subtract(5, "day").toISOString() : null
        );
      }

      if (fieldName === "arrivalDate") {
        setValue(
          "passportReturnDate",
          newDate ? dayjs(newDate).add(5, "day").toISOString() : null
        );
      }

      // Revalidate dependent fields when changing dates
      if (fieldName === "departureDate") {
        setTimeout(() => trigger("arrivalDate"), 0);
      }
      if (fieldName === "arrivalDate") {
        setTimeout(() => trigger("departureDate"), 0);
      }
    },
    [trigger, setValue]
  );

	return (
		<BaseSwipper
			title={title || "Thêm mới yêu cầu"}
			open={open}
			onClose={handleClose}
			onSave={handleSubmit(handleSave)}
			type="add"
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
			<StyledBoxContainerContent styledMarginTop>
				<StyledTitleWithToggle>
					<FileIconSvg />
					<StyledSectionTitle variant="h6" noWrap>
						THÔNG TIN YÊU CẦU MƯỢN HỘ CHIẾU ĐOÀN RA
					</StyledSectionTitle>
				</StyledTitleWithToggle>
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
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={3} md={4}>
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
									// onChange={field.onChange}
									// returnObject
									error={!!errors.delegationLeader}
									helperText={errors.delegationLeader?.message}
									size="small"
									required
									unsetFontWeight
								// dataSelectedOptions={setDataSelectedEmpolyee}
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
									<StyledTitleWithToggle>
										<FileIconSvg />
										<StyledSectionTitle variant="h6" noWrap>
											TỆP ĐÍNH KÈM QUYẾT ĐỊNH ĐOÀN RA
										</StyledSectionTitle>
									</StyledTitleWithToggle>
								}
								manualUpload
								// objectId={props?.id}
								objectType="passportFile"
								id="passportFile-upload"
								// required
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
									{/* <StyledHeaderSectionContent variant="h6" noWrap>
                    DANH SÁCH ĐOÀN RA <StyledRequiredIcon>*</StyledRequiredIcon>
									</StyledHeaderSectionContent> */}
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
			{isLoading && (
				<StyledLoadingPopupSignDigital>
					<CircularProgress />
				</StyledLoadingPopupSignDigital>
			)}
			<FileViewerDialog
				open={viewingFile.open}
				onClose={handleCloseFileViewer}
				fileUrl={viewingFile.url}
				fileName={viewingFile.name}
				fileType={viewingFile.type}
				title={`Xem file: ${viewingFile.name}`}
			/>
		</BaseSwipper>
	);
};

AddOrganizationalRequest.propTypes = {
	open: PropTypes.bool.required,
	onClose: PropTypes.func.required,
	onSuccess: PropTypes.func,
	isLoading: PropTypes.bool,
	sharedComponents: PropTypes.object,
	mode: PropTypes.string,
	title: PropTypes.string,
	documentType: PropTypes.number,
	incomingCreate: PropTypes.bool,
	isActionMenu: PropTypes.bool,
};

export default withSharedComponents(AddOrganizationalRequest);
