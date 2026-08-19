/* eslint-disable react/forbid-component-props, no-restricted-syntax, no-unused-vars */
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  getListPosition,
  getListUsersPost,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import {
  defaultFormValuesDistrict,
  documentSchema,
} from "@pages/ManagerUsers/constantsDistrict";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  normalizeApiData,
  normalizeApiDataEdit,
} from "@pages/ManagerUsers/utilsDistrict";
import {
  Box,
  CardContent,
  Collapse,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  RadioGroup,
  Typography,
  styled,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ExpandMore } from "@mui/icons-material";
import CustomInput from "@components/CustomInput/CustomInput";
import CustomDatePicker from "@components/CustomInput/CustomDatePicker";
import CustomButton from "@components/CustomButton";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addUser,
  getDataDetailUser,
  getDataDetailUserByGroup,
  getListGroupUser,
  getListRole,
  updateUser,
  uploadFiles,
} from "@redux/slices/managementUsersSlice";
import {
  // API_SSO_VALIDATE,
  APP_BASE,
  API_VIEW_FILE,
  API_UPLOAD_FILESS,
  API_GET_LIST_USERS,
} from "@EnvironmentFile/constants/urlConfig";
import dayjs from "dayjs";
// import { removeVietnameseTones } from "@pages/AdministrationSystem/DetailGroupUser/utilsDistrict";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import ImageCropperDialog from "@components/ImageCropperDialog";
import { fetchListFormBpmn } from "@redux/slices/BPMN/BpmnSlice";
import * as Yup from "yup";
import api from "@services/api";
import withSharedComponents from "@components/WrapperComponent";
import PermissionDetailTab from "@pages/AdministrationSystem/DetailGroupUser/components/PermissionDetailTab";
import ActionPermissionDetailTab from "@pages/AdministrationSystem/DetailGroupUser/components/ActionPermissionDetailTab";
import { StyledPaper, StyledTabContentBox } from "@styles/DetailGroupUser.styles";

import {
  StyledCard,
  StyledHeaderGrid,
  StyledDivider,
  StyledAvatar,
  UploadButton,
  HeaderTypography,
  RotatableIconButton,
  AvatarContainer,
  BoxContainer,
  HeaderColorTypography,
  StyledGrid,
  StyledTypography,
  StyledRuleTypography,
  StyledErrorTypography,
  StyledRadioColor,
  StyledCloudUploadIcon,
	ContentUserContainer,
  SignatureWrapperBox,
  SignatureImageBox,
} from "@styles/ViewUserDetail.styles";
import { StyledRadio } from "@styles/CustomTable.styles";
import CustomInputTree from "@components/CustomInput/CustomInputTree";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import { FormFieldLayoutContext } from "@components/CustomInput/FormFieldLayoutContext";
import withFormWrapper, {
  ViewFieldBox,
  ViewFieldLabel,
  ViewFieldValue,
} from "@components/common/FormWrapper";

const GridMT = styled(Grid)(() => ({
   marginTop: "8px"
}));

const ViewOnlyField = ({ label, value, multiline = false }) => (
  <ViewFieldBox rows={multiline ? 3 : undefined}>
    <ViewFieldLabel>{label}</ViewFieldLabel>
    <ViewFieldValue noWrap={!multiline} multiline={multiline}>
      {value ?? ""}
    </ViewFieldValue>
  </ViewFieldBox>
);

const ManagerUsers = forwardRef(({ props, sharedComponents }, ref) => {
  const { CustomSwipper, CustomTabsWithBadge } = sharedComponents || {};
  const { id: propId, view: propView, onClose: propOnClose, onOpenAdminChangePass, inputLabelLayout: propInputLabelLayout } = props || {};

  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  const dispatch = useDispatch();
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const currentUserId = authUser?._id || authUser?.id;
  const {
    detailUnit,
    listPosition,
    // listUnit,
    listGroupUsers,
    // listUserByUnit,
    listRole,
  } = useSelector((state) => state.users);

  const toast = useToast();
  const [status, setStatus] = useState(1);
  const [image, setImage] = useState(null);
  const [file, setFile] = useState(null);
  // State cho ảnh chữ ký preview
  // const [signatureImage1, setSignatureImage1] = useState(null); //Ảnh chữ ký nháy có nền
  const [signatureImage2, setSignatureImage2] = useState(null); //Ảnh chữ ký nội dung có nền
  const [signatureImage3, setSignatureImage3] = useState(null); //Ảnh chữ ký nháy không nền
  const [signatureImage5, setSignatureImage5] = useState(null); //Ảnh chữ ký đóng dấu
  // Dùng ref để tránh stale closure trong useImperativeHandle
  const paraphSignImageRef = useRef(null);
  const contentSignImageRef = useRef(null);
  const paraphSignTransparentImageRef = useRef(null);
  const contentSignTransparentImageRef = useRef(null);
  const stampSignImageRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { idGroup, view: stateView } = location.state || {};
  const view = propView || stateView || (location.pathname.includes("-detail") ? "view" : (location.pathname.includes("/add") ? "add" : "update"));
  const isViewMode = view === "view";
  const onClose = useMemo(() => propOnClose || (() => navigate(-1)), [propOnClose, navigate]);
  const isStandalonePage = !propView && !!view; // Nếu không truyền prop view thì coi như là trang độc lập
  const inputLabelLayout = propInputLabelLayout || "floating";

  // Lấy id từ props khi được render trong Swipper, hoặc từ URL khi render độc lập
  const idFromProps = propId;
  const segments = location.pathname.split("/");
  const idFromUrl = segments[segments.length - 1];
  const idUpdate = idFromProps ?? (view === "add" ? "add" : idFromUrl);
  const id = idUpdate;

  useEffect(() => {
    setActiveTab(0);
  }, [idUpdate]);

  const ViewInput = useMemo(() => {
    const Wrapped = withFormWrapper(CustomInput, "input");
    const Component = (componentProps) => <Wrapped {...componentProps} isView />;
    Component.displayName = "ViewInput";
    return Component;
  }, []);

  const ViewDate = useMemo(() => {
    const Wrapped = withFormWrapper(CustomDatePicker, "date");
    const Component = (componentProps) => <Wrapped {...componentProps} isView />;
    Component.displayName = "ViewDate";
    return Component;
  }, []);

  const WrappedAsyncAutoComplete = useMemo(() => {
    const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
    const Component = (componentProps) => <Wrapped {...componentProps} isView={isViewMode} />;
    Component.displayName = "WrappedAsyncAutoComplete";
    return Component;
  }, [isViewMode]);

  const InputField = isViewMode ? ViewInput : CustomInput;
  const DateField = isViewMode ? ViewDate : CustomDatePicker;


  const params = new URLSearchParams(window.location.search);
  const hasGroupUser = params.has("groupUser");
  const [expandedInfo, setExpandedInfo] = useState(true);
  const [expandedInfoUnit, setExpandedInfoUnit] = useState(true);
  const [expandedInfoLogin, setExpandedInfoLogin] = useState(true);
  const [expandedInfoOther, setExpandedInfoOther] = useState(true);

  const [validationRules, setValidationRules] = useState(null);

  // Lấy quy tắc validation từ API
  useEffect(() => {
    // const fetchValidationRules = async () => {
    //   try {
    //     const response = await api.get(`${API_SSO_VALIDATE}`);
    //     const passwordRules = response.data.find(
    //       (field) => field.field === "password"
    //     );
    //     if (passwordRules) {
    //       const rules = {};
    //       passwordRules.rules.forEach((rule) => {
    //         const getProp = (key) =>
    //           rule.properties.find((p) => p.key === key)?.value;
    //         switch (rule.validator) {
    //           case "LengthValidator":
    //             rules.minLength = getProp("min.length");
    //             rules.maxLength = getProp("max.length");
    //             break;
    //           case "NumeralValidator":
    //             rules.minNumerals = getProp("min.length");
    //             break;
    //           case "UpperCaseValidator":
    //             rules.minUpperCase = getProp("min.length");
    //             break;
    //           case "LowerCaseValidator":
    //             rules.minLowerCase = getProp("min.length");
    //             break;
    //           case "SpecialCharacterValidator":
    //             rules.minSpecialChars = getProp("min.length");
    //             break;
    //           default:
    //             break;
    //         }
    //       });
    //       setValidationRules(rules);
    //     }
    //   } catch (error) {
    //     logger.error("Failed to fetch validation rules:", error);
    //     // toast("Không thể tải quy tắc mật khẩu từ server!", "error");
    //   }
    // };
    // fetchValidationRules();
    setValidationRules(null)
  }, [toast]);

  // Tạo schema động dựa trên quy tắc từ API
  const dynamicDocumentSchema = useMemo(() => {
    let passwordSchema = Yup.string();
    if (view === "add" && validationRules) {
      passwordSchema = passwordSchema
        .required("Mật khẩu không được để trống")
        .min(
          validationRules.minLength,
          `Mật khẩu phải có ít nhất ${validationRules.minLength} ký tự`
        )
        .max(
          validationRules.maxLength,
          `Mật khẩu không được vượt quá ${validationRules.maxLength} ký tự`
        );
      // .matches(
      //   new RegExp(`(?=(.*[A-Z]){${validationRules.minUpperCase},})`),
      //   `Mật khẩu phải có ít nhất ${validationRules.minUpperCase} chữ cái viết hoa`
      // )
      // .matches(
      //   new RegExp(`(?=(.*[a-z]){${validationRules.minLowerCase},})`),
      //   `Mật khẩu phải có ít nhất ${validationRules.minLowerCase} chữ cái viết thường`
      // )
      // .matches(
      //   new RegExp(`(?=(.*\\d){${validationRules.minNumerals},})`),
      //   `Mật khẩu phải có ít nhất ${validationRules.minNumerals} số`
      // )
      // .matches(
      //   new RegExp(`(?=(.*[!@#$%^&*]){${validationRules.minSpecialChars},})`),
      //   `Mật khẩu phải có ít nhất ${validationRules.minSpecialChars} ký tự đặc biệt!`
      // );
    }
    // Giữ lại các validation khác từ schema gốc
    return documentSchema(view, passwordSchema);
  }, [view, validationRules]);

  const {
    control,
    reset,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: defaultFormValuesDistrict,
    resolver: yupResolver(dynamicDocumentSchema),
    context: { view },
  });
  const selectedParent = watch("parent");
  const handleOrgUnitSelect = useCallback((option) => {
    setValue("code", option?.code || "");
    setValue("email", option?.email || "");
    setValue("phoneNumber", option?.phoneNumber || "");
    setValue("address", option?.address || "");
  }, [setValue]);

  const handleOrgUnitMenuItemClick = useCallback((val, option) => {
    handleOrgUnitSelect(option);
  }, [handleOrgUnitSelect]);
  // const name = watch("name");
  const [openDialogChangePass, setOpenDialogChangePass] = useState(false);
  const [listProcess, setListProcess] = useState([]);
  const [secretaryOptions, setSecretaryOptions] = useState([]);
  const isSubmittingRef = useRef(false);
  const logger = console;

  useEffect(() => {
    const fetchUsersForSecretary = async () => {
      try {
        const res = await api.get(`${API_GET_LIST_USERS}/all`);
        const list = res?.data?.data || res?.data || [];
        if (Array.isArray(list)) {
          const filteredList = list.filter((u) => {
            const uId = u._id || u.id;
            return !currentUserId || String(uId) !== String(currentUserId);
          });
          const options = filteredList.map((u) => {
            const userNameText = `${u.name || u.username}${u.codeND ? ` (${u.codeND})` : ""}`;
            return {
              label: userNameText,
              name: userNameText,
              value: u._id || u.id,
              _id: u._id || u.id,
              id: u._id || u.id,
            };
          });
          setSecretaryOptions(options);
        }
      } catch (err) {
        logger.error("Lỗi khi tải danh sách thư ký cá nhân:", err);
      }
    };
    fetchUsersForSecretary();
  }, [currentUserId]);

  useEffect(() => {
    // Gọi API lấy danh sách quy trình khi load trang
    const getProcessList = async () => {
      try {
        const res = await dispatch(fetchListFormBpmn({})).unwrap();
        setListProcess(res.data || []);
      } catch (err) {
        toast("Không lấy được danh sách quy trình", "error");
      }
    };
    getProcessList();
  }, [dispatch, toast]);
  useEffect(() => {
    dispatch(getListPosition());
    dispatch(getListGroupUser({ limit: 99999 }));
    dispatch(getListRole({ limit: 1000 })); // Lấy tất cả các vai trò
  }, [dispatch]);
  const {
    fields: processFields,
    append: appendProcess,
    remove: removeProcess,
  } = useFieldArray({
    control,
    name: "processRoles",
  });

  const [detailUserData, setDetailUserData] = useState(null);

  // 1. Gọi API lấy thông tin chi tiết người dùng ĐÚNG 1 LẦN khi idUpdate hoặc idGroup thay đổi
  useEffect(() => {
    const fetchUserApi = async () => {
      try {
        if (idUpdate && idUpdate !== "add") {
          const result = await dispatch(getDataDetailUser(idUpdate)).unwrap();
          setDetailUserData(result?.data || null);
        } else if (hasGroupUser && idGroup) {
          const result = await dispatch(getDataDetailUserByGroup(idGroup)).unwrap();
          setDetailUserData(result?.data || null);
        } else {
          setDetailUserData(null);
        }
      } catch (error) {
        toast(error.message, "error");
        setDetailUserData(null);
      }
    };
    fetchUserApi();
  }, [idUpdate, hasGroupUser, idGroup, dispatch, toast]);

  // 2. Cập nhật các trường thông tin cơ bản và tải ảnh chữ ký khi detailUserData thay đổi
  useEffect(() => {
    const processUserBasicInfo = async () => {
      if (!detailUserData) return;

      const dataFormat = normalizeApiDataEdit(detailUserData);
      reset(dataFormat);

      // Xử lý parent: có thể là object hoặc string ID
      if (detailUserData.parent) {
        if (typeof detailUserData.parent === "object") {
          setValue("code", detailUserData.parent.code);
          setValue("email", detailUserData.parent.email);
          setValue("phoneNumber", detailUserData.parent.phoneNumber);
          setValue("address", detailUserData.parent.address);
          setValue("parent", detailUserData.parent._id || detailUserData.parent.id);
        } else {
          setValue("parent", detailUserData.parent);
        }
      }

      setValue("status", Number(detailUserData.status ?? 1));
      setStatus(Number(detailUserData.status ?? 1));

      if (detailUserData.personalSecretary) {
        if (typeof detailUserData.personalSecretary === "object") {
          const sec = detailUserData.personalSecretary;
          setValue("personalSecretary", {
            id: sec._id || sec.id,
            name: sec.name || sec.username || sec.codeND || sec._id || sec.id,
          });
        } else {
          setValue("personalSecretary", detailUserData.personalSecretary);
        }
      }

      // GroupUser: xử lý cả groupUsers và GroupUser
      const groupUsersData = detailUserData.groupUsers || detailUserData.GroupUser;
      if (Array.isArray(groupUsersData)) {
        setValue(
          "GroupUser",
          groupUsersData.map((g) => (typeof g === "object" ? g._id || g.id : g))
        );
      } else if (groupUsersData) {
        const groupId = typeof groupUsersData === "object" ? groupUsersData._id || groupUsersData.id : groupUsersData;
        setValue("GroupUser", groupId ? [groupId] : []);
      } else {
        setValue("GroupUser", []);
      }

      // Avatar
      if (detailUserData.avatar && detailUserData.avatar[0]?.path) {
        const fileUrl = `${APP_BASE}/api/file/download/${detailUserData.avatar[0]._id}`;
        setImage(fileUrl);
      }

      // Load ảnh chữ ký nháy nếu có
      // if (detailUserData.paraphSignImage) {
      //   const paraphSignId =
      //     typeof detailUserData.paraphSignImage === "object"
      //       ? detailUserData.paraphSignImage._id || detailUserData.paraphSignImage.id
      //       : detailUserData.paraphSignImage;
      //   if (paraphSignId) {
      //     try {
      //       const response = await api.get(`${API_VIEW_FILE}/${paraphSignId}`, {
      //         responseType: "blob",
      //       });
      //       const blob = response.data || response;
      //       const objectUrl = URL.createObjectURL(blob);
      //       setSignatureImage1(objectUrl);
      //     } catch (err) {
      //       logger.log("Failed to load paraphSignImage:", err);
      //     }
      //   }
      // }
      if (detailUserData.paraphSignTransparentImage) {
        const paraphTransparentSignId =
          typeof detailUserData.paraphSignTransparentImage === "object"
            ? detailUserData.paraphSignTransparentImage._id || detailUserData.paraphSignTransparentImage.id
            : detailUserData.paraphSignTransparentImage;
        if (paraphTransparentSignId) {
          try {
            const response = await api.get(`${API_VIEW_FILE}/${paraphTransparentSignId}`, {
              responseType: "blob",
            });
            const blob = response.data || response;
            const objectUrl = URL.createObjectURL(blob);
            setSignatureImage3(objectUrl);
          } catch (err) {
            logger.log("Failed to load paraphSignTransparentImage:", err);
          }
        }
      }
      if (detailUserData.contentSignImage) {
        const contentSignId =
          typeof detailUserData.contentSignImage === "object"
            ? detailUserData.contentSignImage._id || detailUserData.contentSignImage.id
            : detailUserData.contentSignImage;
        if (contentSignId) {
          try {
            const response = await api.get(`${API_VIEW_FILE}/${contentSignId}`, {
              responseType: "blob",
            });
            const blob = response.data || response;
            const objectUrl = URL.createObjectURL(blob);
            setSignatureImage2(objectUrl);
          } catch (err) {
            logger.log("Failed to load contentSignImage:", err);
          }
        }
      }
      if (detailUserData.stampSignImage) {
        const stampSignId =
          typeof detailUserData.stampSignImage === "object"
            ? detailUserData.stampSignImage._id || detailUserData.stampSignImage.id
            : detailUserData.stampSignImage;
        if (stampSignId) {
          try {
            const response = await api.get(`${API_VIEW_FILE}/${stampSignId}`, {
              responseType: "blob",
            });
            const blob = response.data || response;
            const objectUrl = URL.createObjectURL(blob);
            setSignatureImage5(objectUrl);
          } catch (err) {
            logger.log("Failed to load stampSignImage:", err);
          }
        }
      }
    };

    processUserBasicInfo();
  }, [detailUserData, reset, setValue]);

  // 3. Ánh xạ processRoles khi listProcess và listRole đã tải xong
  useEffect(() => {
    if (!detailUserData) return;

    if (Array.isArray(detailUserData.rolesByProcess) && detailUserData.rolesByProcess.length > 0) {
      if (listProcess && listProcess.length > 0 && listRole?.data && listRole.data.length > 0) {
        // Clear existing processRoles entries
        processFields.forEach(() => {
          removeProcess(0);
        });

        // Populate processRoles field array with API data
        detailUserData.rolesByProcess.forEach((processRole) => {
          const process = listProcess.find((p) => p.id === processRole.processKey);

          const roleIds = processRole.roles
            .map((role) => {
              const foundRole = (listRole?.data || []).find((r) => r.code === role.roleCode);
              return foundRole ? foundRole._id : null;
            })
            .filter((id) => id !== null);

          appendProcess({
            processId: process ? process._id : "",
            roleIds: roleIds,
          });
        });
      }
    } else {
      // Clear processRoles if no rolesByProcess data
      processFields.forEach(() => {
        removeProcess(0);
      });
    }
  }, [detailUserData, listProcess, listRole?.data, appendProcess, removeProcess, processFields]);

  const parentDisplayValue = useMemo(() => {
    const parentData = detailUserData?.parent;
    if (parentData && typeof parentData === "object") {
      return parentData.name || parentData.title || parentData.code || "";
    }
    if (typeof parentData === "string") {
      return parentData;
    }
    return "";
  }, [detailUserData]);

  const groupUserDisplayValue = useMemo(() => {
    const groupUsersData = detailUserData?.groupUsers || detailUserData?.GroupUser || [];
    if (!Array.isArray(groupUsersData) || groupUsersData.length === 0) {
      return "";
    }
    return groupUsersData
      .map((groupItem) => {
        if (typeof groupItem === "object") {
          return groupItem.name || groupItem.title || groupItem.code || groupItem._id || "";
        }
        const foundGroup = (listGroupUsers || []).find(
          (groupOption) =>
            groupOption._id === groupItem ||
            groupOption.id === groupItem ||
            groupOption.value === groupItem
        );
        return foundGroup?.name || foundGroup?.title || foundGroup?.code || groupItem;
      })
      .filter(Boolean)
      .join(", ");
  }, [detailUserData, listGroupUsers]);

  const statusDisplayValue = useMemo(() => {
    return Number(status) === 1 ? "Hoạt động" : "Ngừng hoạt động";
  }, [status]);
  // const roleOptions = (() => {
  // 	const allRoles = listRole?.data || [];
  // 	const uniqueRoleCodes = new Set();
  // 	return allRoles.filter(role => {
  // 		if (uniqueRoleCodes.has(role.code)) return false;
  // 		uniqueRoleCodes.add(role.code);
  // 		return true;
  // 	}).map(role => ({
  // 		value: role._id,
  // 		label: role.name,
  // 		roleCode: role.code,
  // 		name: role.name,
  // 		_id: role._id
  // 	}));
  // })();

  useEffect(() => {
    if (detailUnit) {
      reset({
        code: detailUnit.code || "",
        parent: detailUnit._id || "",
        email: detailUnit.email || "",
        type: detailUnit.type || "",
        phoneNumber: detailUnit.phoneNumber || "",
        address: detailUnit.address || "",
      });
    }
  }, [detailUnit, reset]);


  // useEffect(() => {
  // 	if (view === 'add') {
  // 		generatedUserName()
  // 	}
  // }, [name, view, generatedUserName])

  // Tạo tên đăng nhập tự động
  // const generatedUserName = () => {
  // 	if (name) {
  // 		const nameParts = name.trim().split(/\s+/); // Chia tên theo khoảng trắng
  // 		if (nameParts.length === 0) return;

  // 		const lastName = removeVietnameseTones(nameParts[nameParts.length - 1].toLowerCase()); // Lấy từ cuối
  // 		const initials = nameParts
  // 			.slice(0, -1) // Bỏ từ cuối
  // 			.map(part => removeVietnameseTones(part[0].toLowerCase())) // Lấy chữ cái đầu
  // 			.join('');

  // 		let generatedName = `${lastName}${initials}`;

  // 		let count = 0;
  // 		let newUsername = generatedName;

  // 		// Kiểm tra danh sách người dùng
  // 		let userNameGenerated = listUserByUnit?.find(
  // 			(item) => item.username?.toLowerCase() === newUsername
  // 		);

  // 		// Nếu trùng lặp, tăng `count` và tạo tên mới
  // 		while (userNameGenerated) {
  // 			count++;
  // 			newUsername = `${generatedName}${count}`;
  // 			userNameGenerated = listUserByUnit?.find(
  // 				(item) => item.username?.toLowerCase() === newUsername
  // 			);
  // 		}

  // 		// Cập nhật giá trị username
  // 		setValue("username", newUsername);
  // 	}
  // };

  // const generatedUserName = useCallback(() => {
  //   if (!name) return;

  //   const nameParts = name.trim().split(/\s+/);
  //   const lastName = removeVietnameseTones(
  //     nameParts[nameParts.length - 1].toLowerCase()
  //   );
  //   const initials = nameParts
  //     .slice(0, -1)
  //     .map((part) => removeVietnameseTones(part[0].toLowerCase()))
  //     .join("");

  //   let generatedName = `${lastName}${initials}`;
  //   let count = 0;
  //   let newUsername = generatedName;

  //   let userNameGenerated = listUserByUnit?.find(
  //     (item) => item.username?.toLowerCase() === newUsername
  //   );

  //   while (userNameGenerated) {
  //     count++;
  //     newUsername = `${generatedName}${count}`;
  //     userNameGenerated = listUserByUnit?.find(
  //       (item) => item.username?.toLowerCase() === newUsername
  //     );
  //   }

  //   setValue("username", newUsername);
  // }, [name, listUserByUnit, setValue]);

  // useEffect(() => {
  //   if (view === "add") {
  //     generatedUserName();
  //   }
  // }, [view, generatedUserName]);

  const getErrorMessage = (
    error,
    defaultMsg = "Đã xảy ra lỗi khi cập nhật!"
  ) => {
    return (
      error?.data?.error ||
      error?.data?.message ||
      (Array.isArray(error?.errors) ? error.errors.join(", ") : null) ||
      error?.message ||
      defaultMsg
    );
  };

  // Hàm upload file với object_type và object_id
  const uploadSignatureFiles = async (userId, files) => {
    try {
      const {
        paraphSignImage: paraphFile,
        contentSignImage: contentFile,
        paraphSignTransparentImage: paraphTransparentFile,
        contentSignTransparentImage: contentTransparentFile,
        stampSignImage: stampFile,
      } = files || {};

      if (
        !paraphFile &&
        !contentFile &&
        !paraphTransparentFile &&
        !contentTransparentFile &&
        !stampFile
      ) {
        logger.warn("No signature images to upload");
        return {
          paraphSignImageId: null,
          contentSignImageId: null,
          paraphSignTransparentImageId: null,
          contentSignTransparentImageId: null,
          stampSignImageId: null,
        };
      }

      const uploadWithMeta = async (file, objectType) => {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("object_type", objectType);
          formData.append("object_id", userId);
          const response = await api.post(`${API_UPLOAD_FILESS}`, formData);
          // Trả về id của file từ response
          return (
            response?.data?.data?._id ||
            response?.data?.data?.id ||
            response?.data?._id ||
            response?.data?.id ||
            null
          );
        } catch (err) {
          logger.log("uploadWithMeta ERROR:", {
            objectType,
            error: err.message,
            status: err.response?.status,
          });
          return null;
        }
      };

      // Upload đồng thời các file chữ ký
      const [
        paraphSignImageId,
        contentSignImageId,
        paraphSignTransparentImageId,
        contentSignTransparentImageId,
        stampSignImageId,
      ] = await Promise.all([
        paraphFile
          ? uploadWithMeta(paraphFile, "paraphSignImage")
          : Promise.resolve(null),
        contentFile
          ? uploadWithMeta(contentFile, "contentSignImage")
          : Promise.resolve(null),
        paraphTransparentFile
          ? uploadWithMeta(paraphTransparentFile, "paraphSignTransparentImage")
          : Promise.resolve(null),
        contentTransparentFile
          ? uploadWithMeta(
              contentTransparentFile,
              "contentSignTransparentImage"
            )
          : Promise.resolve(null),
        stampFile
          ? uploadWithMeta(stampFile, "stampSignImage")
          : Promise.resolve(null),
      ]);

      return {
        paraphSignImageId,
        contentSignImageId,
        paraphSignTransparentImageId,
        contentSignTransparentImageId,
        stampSignImageId,
      };
    } catch (error) {
      logger.log("Error uploading signature files:", error);
      return {
        paraphSignImageId: null,
        contentSignImageId: null,
        paraphSignTransparentImageId: null,
        contentSignTransparentImageId: null,
        stampSignImageId: null,
      };
    }
  };

  const onSubmit = useCallback(async (data) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      let result;
      let uploadedFiles = [];
      if (file) {
        const uploadResult = await dispatch(uploadFiles(file)).unwrap();
        uploadedFiles = uploadResult;
      }
      if (view === "update" || view === "add") {
        data.parent = selectedParent || data.parent || "";
      }

      if (data.name) {
        data.name = data.name.trim();
      }

      const formattedData = normalizeApiData(data, status);

      // Backend chỉ nhận id dạng string cho các field chữ ký.
      const normalizeToIdString = (value) => {
        if (!value) return null;
        if (typeof value === "string") return value;
        if (typeof value === "object") return value._id || value.id || null;
        return null;
      };

      const signatureFieldNames = [
        "paraphSignImage",
        "contentSignImage",
        "paraphSignTransparentImage",
        "contentSignTransparentImage",
        "stampSignImage",
      ];

      signatureFieldNames.forEach((fieldName) => {
        const normalizedId = normalizeToIdString(formattedData[fieldName]);
        if (normalizedId) {
          formattedData[fieldName] = normalizedId;
        } else {
          delete formattedData[fieldName];
        }
      });

      // Chỉ xóa các field thừa nếu không cần thiết, giữ lại password nếu có
      if (!data.password || data.password === "") {
        delete formattedData.password;
        delete formattedData.repassword;
      }

      // Xóa các field khác không cần thiết
      delete formattedData.email;
      delete formattedData.code;
      delete formattedData.address;
      delete formattedData.phoneNumber;

      if (uploadedFiles.success) {
        formattedData.avatar = formattedData.avatar || [];
        formattedData.avatar = uploadedFiles?.data;
      }

      const processRoles = data.processRoles || [];

      // Map processRoles to rolesByProcess format
      const mappedRolesByProcess = processRoles
        .map((item) => {
          const process = listProcess.find((p) => p._id === item.processId);

          // Lấy thông tin chi tiết của các vai trò từ listRoleFeature
          const roles = (item.roleIds || [])
            .map((roleId) => {
              const role = (listRole?.data || []).find((r) => r._id === roleId);
              return role
                ? {
                    name: role.name,
                    roleCode: role.code,
                  }
                : null;
            })
            .filter((role) => role !== null);

          return {
            processKey: process?.id || "",
            name: process?.name || "",
            roles: roles,
          };
        })
        .filter((item) => item.processKey && item.processKey.trim()); // Only include entries with processKey

      // Only set rolesByProcess if there's actual data
      if (mappedRolesByProcess.length > 0) {
        formattedData.rolesByProcess = mappedRolesByProcess;
      }

      if (view === "update") {
        result = await dispatch(
          updateUser({
            id: idUpdate,
            updatedData: {
              ...formattedData,
              status: Number(status),
            },
          })
        ).unwrap();
        if (result?.success) {
          // Upload signature images nếu có - lấy từ ref
          const paraphFile = paraphSignImageRef.current;
          const contentFile = contentSignImageRef.current;
          const paraphTransparentFile = paraphSignTransparentImageRef.current;
          const contentTransparentFile = contentSignTransparentImageRef.current;
          const stampFile = stampSignImageRef.current;
          if (
            paraphFile ||
            contentFile ||
            paraphTransparentFile ||
            contentTransparentFile ||
            stampFile
          ) {
            const {
              paraphSignImageId,
              contentSignImageId,
              paraphSignTransparentImageId,
              contentSignTransparentImageId,
              stampSignImageId,
            } = await uploadSignatureFiles(idUpdate, {
              paraphSignImage: paraphFile,
              contentSignImage: contentFile,
              paraphSignTransparentImage: paraphTransparentFile,
              contentSignTransparentImage: contentTransparentFile,
              stampSignImage: stampFile,
            });

            // Cập nhật người dùng với id file chữ ký
            if (
              paraphSignImageId ||
              contentSignImageId ||
              paraphSignTransparentImageId ||
              contentSignTransparentImageId ||
              stampSignImageId
            ) {
              const signatureUpdateData = {};
              if (paraphSignImageId)
                signatureUpdateData.paraphSignImage = paraphSignImageId;
              if (contentSignImageId)
                signatureUpdateData.contentSignImage = contentSignImageId;
              if (paraphSignTransparentImageId) {
                signatureUpdateData.paraphSignTransparentImage =
                  paraphSignTransparentImageId;
              }
              if (contentSignTransparentImageId) {
                signatureUpdateData.contentSignTransparentImage =
                  contentSignTransparentImageId;
              }
              if (stampSignImageId)
                signatureUpdateData.stampSignImage = stampSignImageId;
              await dispatch(
                updateUser({
                  id: idUpdate,
                  updatedData: signatureUpdateData,
                })
              ).unwrap();
            }
          }
          toast("Cập nhật thành công!", "success");
      try {
        await dispatch(getDataDetailUser(idUpdate)).unwrap();
      } catch (reloadError) {
        // eslint-disable-next-line no-console
        console.warn("Không reload được chi tiết user sau update:", reloadError?.message);
      }
      onClose?.(true);
        } else {
          toast(result?.message || "Cập nhật thất bại!", "error");
        }
      } else {
        result = await dispatch(
          addUser({
            ...formattedData,
            status: Number(status),
          })
        ).unwrap();
        if (result?.success) {
          // Upload signature images với userId mới - lấy từ ref
          const paraphFile = paraphSignImageRef.current;
          const contentFile = contentSignImageRef.current;
          const paraphTransparentFile = paraphSignTransparentImageRef.current;
          const contentTransparentFile = contentSignTransparentImageRef.current;
          const stampFile = stampSignImageRef.current;
          const newUserId = result?.data?._id || result?.data?.id;
          if (
            newUserId &&
            (paraphFile ||
              contentFile ||
              paraphTransparentFile ||
              contentTransparentFile ||
              stampFile)
          ) {
            const {
              paraphSignImageId,
              contentSignImageId,
              paraphSignTransparentImageId,
              contentSignTransparentImageId,
              stampSignImageId,
            } = await uploadSignatureFiles(newUserId, {
              paraphSignImage: paraphFile,
              contentSignImage: contentFile,
              paraphSignTransparentImage: paraphTransparentFile,
              contentSignTransparentImage: contentTransparentFile,
              stampSignImage: stampFile,
            });
            // Cập nhật người dùng mới với id file chữ ký
            if (
              paraphSignImageId ||
              contentSignImageId ||
              paraphSignTransparentImageId ||
              contentSignTransparentImageId ||
              stampSignImageId
            ) {
              const signatureUpdateData = {};
              if (paraphSignImageId)
                signatureUpdateData.paraphSignImage = paraphSignImageId;
              if (contentSignImageId)
                signatureUpdateData.contentSignImage = contentSignImageId;
              if (paraphSignTransparentImageId) {
                signatureUpdateData.paraphSignTransparentImage =
                  paraphSignTransparentImageId;
              }
              if (contentSignTransparentImageId) {
                signatureUpdateData.contentSignTransparentImage =
                  contentSignTransparentImageId;
              }
              if (stampSignImageId)
                signatureUpdateData.stampSignImage = stampSignImageId;
              await dispatch(
                updateUser({
                  id: newUserId,
                  updatedData: signatureUpdateData,
                })
              ).unwrap();
            }
          } else {
            logger.warn("Skipped uploadSignatureFiles:", {
              newUserId,
              paraphFile,
              contentFile,
              paraphTransparentFile,
              contentTransparentFile,
              stampFile,
            });
          }
          reset(defaultFormValuesDistrict);
          toast("Thêm mới thành công!", "success");
          try {
            await dispatch(getListUsersPost({ page: 1, limit: 25 }));
          } catch (err) {
            logger.log("getListUsersPost error:", err.message);
          }
          // navigate(-1);
          onClose?.(true);
        } else {
          toast(result?.message || "Thêm mới thất bại!", "error");
        }
      }
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "Đã xảy ra lỗi khi cập nhật!"
      );
      toast(errorMessage, "error");
    } finally {
      isSubmittingRef.current = false;
    }
  }, [toast, dispatch, reset, onClose, file, idUpdate, listProcess, listRole?.data, selectedParent, status, view]);

  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        try {
          handleSubmit(onSubmit)();
        } catch (err) {
          // validation errors handled by react-hook-form
        }
      },
    }),
    [handleSubmit, onSubmit]
  );

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    // Kiểm tra định dạng
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast("Chỉ hỗ trợ các định dạng jpg, jpeg, png, gif", "error");
      return;
    }
    // Kiểm tra dung lượng (<= 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast("Ảnh không được vượt quá 2MB", "error");
      return;
    }

    setFile(file);
    const reader = new FileReader();

    reader.onload = () => {
      setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Hàm factory tạo handler upload ảnh chữ ký — tránh lặp logic giữa 5 trường
  // const createSignatureChangeHandler = useCallback(
  //   (imageRef, setImageState) => (event) => {
  //     const file = event.target.files[0];
  //     if (!file) return;
  //     const allowedTypes = [
  //       "image/jpeg",
  //       "image/png",
  //       "image/gif",
  //       "image/jpg",
  //     ];
  //     if (!allowedTypes.includes(file.type)) {
  //       toast("Chỉ hỗ trợ các định dạng jpg, jpeg, png, gif", "error");
  //       return;
  //     }
  //     const maxSize = 2 * 1024 * 1024;
  //     if (file.size > maxSize) {
  //       toast("Ảnh không được vượt quá 2MB", "error");
  //       return;
  //     }
  //     imageRef.current = file;
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       setImageState(reader.result);
  //     };
  //     reader.readAsDataURL(file);
  //   },
  //   [toast]
  // );

  // const handleSignatureImage1Change = createSignatureChangeHandler(
  //   paraphSignImageRef,
  //   setSignatureImage1
  // );
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState(null);
  const [cropperTarget, setCropperTarget] = useState(null);

  const handleImageSelectForCrop = useCallback((target) => (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast("Chỉ hỗ trợ các định dạng jpg, jpeg, png, gif", "error");
      return;
    }
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast("Ảnh không được vượt quá 2MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result);
      setCropperTarget(target);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    event.target.value = null; // cho phép chọn lại cùng 1 file
  }, [toast]);

  const handleSignatureImage3Change = handleImageSelectForCrop('signature3');
  const handleSignatureImage2Change = handleImageSelectForCrop('signature2');
  const handleSignatureImage5Change = handleImageSelectForCrop('signature5');

  const handleCropComplete = useCallback((croppedFile, objectUrl) => {
    if (cropperTarget === 'signature3') {
      paraphSignTransparentImageRef.current = croppedFile;
      setSignatureImage3(objectUrl);
    } else if (cropperTarget === 'signature2') {
      contentSignImageRef.current = croppedFile;
      setSignatureImage2(objectUrl);
    } else if (cropperTarget === 'signature5') {
      stampSignImageRef.current = croppedFile;
      setSignatureImage5(objectUrl);
    }
  }, [cropperTarget]);

  const cropperConfig = useMemo(() => {
    switch (cropperTarget) {
      case 'signature3': return { width: 80, height: 40, aspect: 80/40 };
      case 'signature2': return { width: 150, height: 100, aspect: 150/100 };
      case 'signature5': return { width: 160, height: 160, aspect: 1 };
      default: return {};
    }
  }, [cropperTarget]);

  const createBirthdayChangeHandler = useCallback(
    (onChange) => {
      return (newDate) => {
        const formattedDate = dayjs(newDate).format("DD/MM/YYYY");
        onChange(formattedDate);
      };
    },
    [] // không phụ thuộc vào gì cả
  );

  // Hàm stable để xử lý input password, loại bỏ dấu tiếng Việt
  const handleNumberChange = useCallback(
    (onChange) => (e) => {
      const value = e.target.value;
      const onlyNums = value.replace(/[^0-9]/g, "");
      onChange(onlyNums);
    },
    []
  );

  const handlePasswordChange = useCallback(
    (onChange) => (e) => {
      const value = e.target.value;
      const noVietnamese = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      onChange(noVietnamese !== value ? noVietnamese : value);
    },
    []
  );

  const handleStatusChange = useCallback(
    (e) => {
      setStatus(Number(e.target.value));
    },
    [] // không phụ thuộc vào gì, hoặc thêm setStatus nếu cần
  );

  const handleOpenChangePass = useCallback(() => {
    if (onOpenAdminChangePass && id) {
      onOpenAdminChangePass(id);
    }
  }, [onOpenAdminChangePass, id]);

  const handleCloseDialogChangePass = useCallback(() => {
    setOpenDialogChangePass(false);
  }, []);

  const handleToggleExpandedInfo = useCallback(() => {
    setExpandedInfo((prev) => !prev);
  }, []);

  const handleToggleExpandedInfoUnit = useCallback(() => {
    setExpandedInfoUnit((prev) => !prev);
  }, []);

  const handleToggleExpandedInfoLogin = useCallback(() => {
    setExpandedInfoLogin((prev) => !prev);
  }, []);

  const handleToggleExpandedInfoOther = useCallback(() => {
    setExpandedInfoOther((prev) => !prev);
  }, []);

  const Content = (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {/* Vùng nội dung có thể cuộn */}
      <ContentUserContainer isStandalonePage={isStandalonePage}>
        {/* Thông tin cơ bản */}
        <StyledCard variant="outlined">
          <CardContent>
            <StyledHeaderGrid
              container
              //  onClick={() => setExpandedInfo(!expandedInfo)}
              onClick={handleToggleExpandedInfo}
            >
              <HeaderTypography variant="h6">Thông tin cơ bản</HeaderTypography>
              <RotatableIconButton size="small">
                <ExpandMore />
              </RotatableIconButton>
            </StyledHeaderGrid>
            <StyledDivider />
            <Collapse in={expandedInfo} timeout="auto" unmountOnExit>
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={6}>
                      <Controller
                        name="codeND"
                        control={control}
                        render={({ field }) => (
                          <InputField
                            label="Mã cán bộ"
                            placeholder="Nhập dữ liệu..."
                            // required
                            error={!!errors.codeND}
                            disabled={view === "view" ? true : false}
                            helperText={errors.codeND?.message}
                            {...field}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                          <InputField
                            label="Họ và tên"
                            placeholder="Nhập dữ liệu..."
                            required
                            disabled={view === "view" ? true : false}
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            {...field}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Controller
                        name="birthday"
                        control={control}
                        defaultValue={dayjs().format("DD/MM/YYYY")}
                        render={({ field }) => {
                          const handleChange = createBirthdayChangeHandler(
                            field.onChange
                          );
                          return (
                            <DateField
                              label="Ngày sinh"
                              value={isViewMode ? detailUserData?.birthday : field.value}
                              hasMaxDate
                              onChange={handleChange} // dùng hàm stable
                              disabled={view === "view"}
                              error={!!errors.birthday}
                              helperText={errors.birthday?.message}
                            />
                          );
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Controller
                        name="gender"
                        control={control}
                        render={({ field }) => (
                          <InputField
                            select
                            options={[
                              { value: "nam", title: "Nam" },
                              { value: "nu", title: "Nữ" },
                            ]}
                            label="Giới tính"
                            placeholder="Nhập dữ liệu..."
                            disabled={view === "view" ? true : false}
                            {...field}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Controller
                        name="emailUser"
                        control={control}
                        render={({ field }) => (
                          <InputField
                            label="Email"
                            placeholder="Nhập dữ liệu..."
                            disabled={view === "view" ? true : false}
                            required
                            error={!!errors.emailUser}
                            helperText={errors.emailUser?.message}
                            {...field}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Controller
                        name="phoneNumberUser"
                        control={control}
                        render={({ field }) => (
                          <InputField
                            label="Số điện thoại"
                            placeholder="Nhập dữ liệu..."
                            disabled={view === "view" ? true : false}
                            error={!!errors.phoneNumberUser}
                            helperText={errors.phoneNumberUser?.message}
                            {...field}
                            onChange={handleNumberChange(field.onChange)}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Controller
                        name="identificationCard"
                        control={control}
                        render={({ field }) => (
                          <InputField
                            label="Căn cước"
                            placeholder="Nhập dữ liệu..."
                            disabled={view === "view" ? true : false}
                            error={!!errors.identificationCard}
                            helperText={errors.identificationCard?.message}
                            {...field}
                            onChange={handleNumberChange(field.onChange)}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Controller
                        name="addressUser"
                        control={control}
                        render={({ field }) => (
                          <InputField
                            label="Địa chỉ"
                            placeholder="Nhập dữ liệu..."
                            disabled={view === "view" ? true : false}
                            error={!!errors.addressUser}
                            helperText={errors.addressUser?.message}
                            {...field}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={4}>
                  <BoxContainer>
                    {/* Avatar */}
                    <AvatarContainer>
                      <StyledAvatar src={image} />
                      {/* Nút Upload */}
                      {view !== "view" && (
                        <UploadButton component="label">
                          <StyledCloudUploadIcon />
                          <input
                            type="file"
                            accept="image/jpeg, image/png, image/gif"
                            hidden
                            onChange={handleImageChange}
                          />
                        </UploadButton>
                      )}
                    </AvatarContainer>

                    {/* Thông tin hướng dẫn */}
                    <Typography variant="caption" mt={1}>
                      Tải ảnh đại diện
                    </Typography>
                    <HeaderColorTypography variant="caption">
                      Tối đa 2MB. Hỗ trợ <b>jpg, jpeg, png, gif</b>
                    </HeaderColorTypography>
                  </BoxContainer>
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </StyledCard>

        {/* Thông tin đơn vị */}
        <StyledCard variant="outlined">
          <CardContent>
            <StyledHeaderGrid
              // onClick={() => setExpandedInfoUnit(!expandedInfoUnit)}
              onClick={handleToggleExpandedInfoUnit}
            >
              <HeaderTypography variant="h6">Thông tin đơn vị</HeaderTypography>
              <RotatableIconButton size="small">
                <ExpandMore
                //  style={{ transform: expandedInfoUnit ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </RotatableIconButton>
            </StyledHeaderGrid>
            <StyledDivider />
            <Collapse in={expandedInfoUnit} timeout="auto" unmountOnExit>
              <Grid container spacing={2}>
                {/* <Grid item xs={4} sm={4}>
                  <Controller
                    name="parent"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        select
                        customLabel={"name"}
                        customValue={"_id"}
                        options={listUnit}
                        disabled={view === "view" ? true : false}
                        required
                        treeView
                        error={!!errors.parent}
                        helperText={errors.parent?.message}
                        label="Đơn vị"
                        placeholder="Nhập dữ liệu..."
                        {...field}
                      />
                    )}
                  />
                </Grid> */}
                <Grid item xs={4} sm={4}>
                  <Controller
                    name="parent"
                    control={control}
                    render={({ field }) => (
                      isViewMode ? (
                        <ViewOnlyField label="Đơn vị" value={parentDisplayValue} />
                      ) : (
                        <CustomInputTree
                          select
                          customLabel={"name"}
                          customValue={"_id"}
                          api="api/organization-units"
                          apiExpand="api/organization-units/children"
                          noLimit
                          disabled={view === "view"}
                          required
                          treeView
                          multiple={false}
                          error={!!errors.parent}
                          helperText={errors.parent?.message}
                          label="Đơn vị"
                          placeholder="Nhập dữ liệu..."
                          onInitialLoad={handleOrgUnitSelect}
                          onMenuItemClick={handleOrgUnitMenuItemClick}
                          {...field}
                        />
                      )
                    )}
                  />
                </Grid>
                <Grid item xs={4} sm={4}>
                  <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        label="Mã đơn vị"
                        // placeholder="Nhập dữ liệu..."
                        disabled
                        {...field}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={4} sm={4}>
                  <Controller
                    name="position"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        select
                        options={listPosition}
                        label="Chức vụ"
                        disabled={view === "view" ? true : false}
                        placeholder="Nhập dữ liệu..."
                        {...field}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={4} sm={4}>
                  <Controller
                    name="contactTime"
                    control={control}
                    defaultValue={dayjs().format("DD/MM/YYYY")}
                    render={({ field }) => {
                      const handleChange = createBirthdayChangeHandler(
                        field.onChange
                      );

                      return (
                        <DateField
                          label="Ngày bắt đầu công tác"
                          value={isViewMode ? detailUserData?.contactTime : field.value}
                          hasMaxDate
                          onChange={handleChange} // dùng hàm stable
                          disabled={view === "view"}
                          error={!!errors.contactTime}
                          helperText={errors.contactTime?.message}
                        />
                      );
                    }}
                  />
                </Grid>
                <Grid item xs={4} sm={4}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        label="Email"
                        // placeholder="Nhập dữ liệu..."
                        disabled
                        {...field}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={4} sm={4}>
                  <Controller
                    name="phoneNumber"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        label="Số điện thoại"
                        // placeholder="Nhập dữ liệu..."
                        disabled
                        {...field}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={6}>
                  <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        label="Địa chỉ"
                        // placeholder="Nhập dữ liệu..."
                        disabled
                        {...field}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={6}>
                  <Controller
                    name="personalSecretary"
                    control={control}
                    render={({ field }) => (
                      <WrappedAsyncAutoComplete
                        label="Thư ký cá nhân"
                        placeholder="Tìm kiếm"
                        {...field}
                        url={`${API_GET_LIST_USERS}/all`}
                        queryParams={["name", "codeND", "username"]}
                        optionLabel="name"
                        optionValue="id"
                        returnObject={false}
                        disabled={view === "view"}
                        error={!!errors.personalSecretary}
                        helperText={errors.personalSecretary?.message}
                        hideDropdownIcon
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </StyledCard>
        {/* Thông tin đăng nhập */}

        <StyledCard variant="outlined">
          <CardContent>
            <StyledHeaderGrid
              container
              // onClick={() => setExpandedInfoLogin(!expandedInfoLogin)}
              onClick={handleToggleExpandedInfoLogin}
            >
              <HeaderTypography variant="h6">
                Thông tin đăng nhập
              </HeaderTypography>
              <RotatableIconButton size="small">
                <ExpandMore
                // style={{ transform: expandedInfoLogin ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </RotatableIconButton>
            </StyledHeaderGrid>
            <StyledDivider />
            <Collapse in={expandedInfoLogin} timeout="auto" unmountOnExit>
              <Grid container spacing={2}>
                <StyledGrid item xs={8}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={12}>
                      <Controller
                        name="username"
                        control={control}
                        render={({ field }) => (
                          <InputField
                            label="Tên đăng nhập"
                            // placeholder=" "
                            required
                            disabled={
                              view === "view" || view === "update"
                                ? true
                                : false
                            }
                            error={!!errors.username}
                            helperText={errors.username?.message}
                            {...field}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                          isViewMode ? (
                            <ViewOnlyField label="Mật khẩu" value="**************" />
                          ) : (
                            <InputField
                              label="Mật khẩu"
                              placeholder={
                                view === "view" || view === "update"
                                  ? "**************"
                                  : "Nhập dữ liệu..."
                              }
                              required
                              disabled={
                                view === "view" || view === "update"
                                  ? true
                                  : false
                              }
                              type="password"
                              view={view}
                              error={!!errors.password}
                              helperText={errors.password?.message}
                              {...field}
                              onChange={handlePasswordChange(field.onChange)}
                            />
                          )
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Controller
                        name="repassword"
                        control={control}
                        render={({ field }) => (
                          isViewMode ? (
                            <ViewOnlyField label="Nhập lại mật khẩu" value="**************" />
                          ) : (
                            <InputField
                              label="Nhập lại mật khẩu"
                              placeholder={
                                view === "view" || view === "update"
                                  ? "**************"
                                  : "Nhập dữ liệu..."
                              }
                              required
                              disabled={
                                view === "view" || view === "update"
                                  ? true
                                  : false
                              }
                              type="password"
                              view={view}
                              error={!!errors.repassword}
                              helperText={errors.repassword?.message}
                              {...field}
                            />
                          )
                        )}
                      />
                    </Grid>
                    {view === "update" && onOpenAdminChangePass && (
                      <GridMT item xs={12}>
                        <CustomButton
                          variant="secondary"
                          onClick={handleOpenChangePass}
                        >
                          Đổi mật khẩu
                        </CustomButton>
                      </GridMT>
                    )}
                  </Grid>
                </StyledGrid>

                <Grid item xs={4}>
                  <Box>
                    {validationRules && (
                      <>
                        <StyledTypography variant="subtitle1">
                          🔺 Gợi ý đặt mật khẩu
                        </StyledTypography>
                        <StyledRuleTypography>
                          - Tối thiểu {validationRules.minLength} và tối đa{" "}
                          {validationRules.maxLength} ký tự
                        </StyledRuleTypography>
                        <StyledRuleTypography>
                          - Phải bao gồm:
                        </StyledRuleTypography>
                        <ul style={{ paddingLeft: "20px", margin: "5px 0" }}>
                          {validationRules.minUpperCase > 0 && (
                            <li>
                              <StyledRuleTypography>
                                Ít nhất {validationRules.minUpperCase} chữ hoa
                                (A-Z)
                              </StyledRuleTypography>
                            </li>
                          )}
                          {validationRules.minLowerCase > 0 && (
                            <li>
                              <StyledRuleTypography>
                                Ít nhất {validationRules.minLowerCase} chữ
                                thường (a-z)
                              </StyledRuleTypography>
                            </li>
                          )}
                          {validationRules.minNumerals > 0 && (
                            <li>
                              <StyledRuleTypography>
                                Ít nhất {validationRules.minNumerals} số (0-9)
                              </StyledRuleTypography>
                            </li>
                          )}
                          {validationRules.minSpecialChars > 0 && (
                            <li>
                              <StyledRuleTypography>
                                Ít nhất {validationRules.minSpecialChars} ký tự
                                đặc biệt (!, @, #, $, ...)
                              </StyledRuleTypography>
                            </li>
                          )}
                        </ul>
                        <StyledRuleTypography>
                          - Không nên sử dụng tên, ngày sinh hoặc từ dễ đoán.
                        </StyledRuleTypography>
                      </>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </StyledCard>

        {/* Thông tin khác */}
        <StyledCard variant="outlined">
          <CardContent>
            <StyledHeaderGrid
              container
              // onClick={() => setExpandedInfoOther(!expandedInfoOther)}
              onClick={handleToggleExpandedInfoOther}
            >
              <HeaderTypography variant="h6">Thông tin khác</HeaderTypography>
              <RotatableIconButton size="small">
                <ExpandMore
                // style={{
                // 	transform: expandedInfoOther ? "rotate(180deg)" : "rotate(0deg)",
                // }}
                />
              </RotatableIconButton>
            </StyledHeaderGrid>
            <StyledDivider />
            <Collapse in={expandedInfoOther} timeout="auto" unmountOnExit>
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  {/* Nhóm người dùng */}
                  <Controller
                    name="GroupUser"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      isViewMode ? (
                        <ViewOnlyField label="Nhóm người dùng" value={groupUserDisplayValue} multiline />
                      ) : (
                        <InputField
                          select
                          customLabel="name"
                          customValue="_id"
                          options={listGroupUsers}
                          multiple
                          disabled={view === "view"}
                          label="Nhóm người dùng"
                          placeholder="Nhập dữ liệu..."
                          menuPlacement="top"
                          {...field}
                        />
                      )
                    )}
                  />
                </Grid>

                {/* Cột trạng thái */}
                <Grid item xs={4}>
                  {isViewMode ? (
                    <ViewOnlyField label="Trạng thái" value={statusDisplayValue} />
                  ) : (
                    <FormControl component="fieldset">
                      <FormLabel component="legend">
                        <HeaderTypography>
                          Trạng thái{" "}
                          <StyledErrorTypography component="span">
                            (*)
                          </StyledErrorTypography>
                        </HeaderTypography>
                      </FormLabel>
                      <RadioGroup
                        row
                        onChange={handleStatusChange}
                      >
                        <FormControlLabel
                          value="1"
                          control={
                            <StyledRadio
                              disabled={view === "view"}
                              checked={status === 1}
                            />
                          }
                          label={<Typography>Hoạt động</Typography>}
                        />
                        <FormControlLabel
                          value="0"
                          control={
                            <StyledRadioColor
                              disabled={view === "view"}
                              checked={status !== 1}
                            />
                          }
                          label={<Typography>Ngừng hoạt động</Typography>}
                        />
                      </RadioGroup>
                    </FormControl>
                  )}
                </Grid>

                {/* Ảnh chữ ký nháy có nền */}
                {/* <Grid item xs={3}>
                  <BoxContainer>
                    <HeaderTypography variant="subtitle2" styleMarginBottom={1}>
                      Ảnh chữ ký nháy có nền
                    </HeaderTypography>
                    <AvatarContainer>
                      <StyledAvatar
                        src={signatureImage1}
                        variant="rounded"
                        // sx={{ width: 150, height: 80 }}
                      />
                      {view !== "view" && (
                        <UploadButton component="label">
                          <StyledCloudUploadIcon />
                          <input
                            type="file"
                            accept="image/jpeg, image/png, image/gif"
                            hidden
                            onChange={handleSignatureImage1Change}
                          />
                        </UploadButton>
                      )}
                    </AvatarContainer>
                    <Typography variant="caption" mt={1}>
                      Tải ảnh chữ ký
                    </Typography>
                    <HeaderColorTypography variant="caption">
                      Tối đa 2MB. Hỗ trợ <b>jpg, jpeg, png, gif</b>
                    </HeaderColorTypography>
                  </BoxContainer>
                </Grid> */}
                {/* Ảnh chữ ký nháy ko nền */}
                <Grid item xs={4}>
                  <BoxContainer>
                    <HeaderTypography variant="subtitle2" styleMarginBottom={1}>
                      Ảnh chữ ký nháy không nền
                    </HeaderTypography>
                    <SignatureWrapperBox>
                      <SignatureImageBox>
                        {signatureImage3 ? (
                          <img
                            src={signatureImage3}
                            alt="Chữ ký nháy"
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <Typography variant="caption" color="textSecondary">80x40</Typography>
                        )}
                      </SignatureImageBox>
                      {view !== "view" && (
                        <UploadButton component="label" sx={{ bottom: 0, left: 0 }}>
                          <StyledCloudUploadIcon />
                          <input
                            type="file"
                            accept="image/jpeg, image/png, image/gif"
                            hidden
                            onChange={handleSignatureImage3Change}
                          />
                        </UploadButton>
                      )}
                    </SignatureWrapperBox>
                    <Typography variant="caption" mt={1}>
                      Tải ảnh chữ ký
                    </Typography>
                    <HeaderColorTypography variant="caption">
                      Tối đa 2MB. Hỗ trợ <b>jpg, jpeg, png, gif</b>
                    </HeaderColorTypography>
                  </BoxContainer>
                </Grid>
                {/* Ảnh chữ ký phê duyệt */}
                <Grid item xs={4}>
                  <BoxContainer>
                    <HeaderTypography variant="subtitle2" styleMarginBottom={1}>
                      Ảnh chữ ký phê duyệt
                    </HeaderTypography>
                    <SignatureWrapperBox>
                      <SignatureImageBox>
                        {signatureImage2 ? (
                          <img
                            src={signatureImage2}
                            alt="Chữ ký phê duyệt"
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <Typography variant="caption" color="textSecondary">150x100</Typography>
                        )}
                      </SignatureImageBox>
                      {view !== "view" && (
                        <UploadButton component="label" sx={{ bottom: 0, left: 0 }}>
                          <StyledCloudUploadIcon />
                          <input
                            type="file"
                            accept="image/jpeg, image/png, image/gif"
                            hidden
                            onChange={handleSignatureImage2Change}
                          />
                        </UploadButton>
                      )}
                    </SignatureWrapperBox>
                    <Typography variant="caption" mt={1}>
                      Tải ảnh chữ ký
                    </Typography>
                    <HeaderColorTypography variant="caption">
                      Tối đa 2MB. Hỗ trợ <b>jpg, jpeg, png, gif</b>
                    </HeaderColorTypography>
                  </BoxContainer>
                </Grid>
                {/* Ảnh chữ ký đóng dấu */}
                <Grid item xs={4}>
                  <BoxContainer>
                    <HeaderTypography variant="subtitle2" styleMarginBottom={1}>
                      Ảnh chữ ký đóng dấu
                    </HeaderTypography>
                    <SignatureWrapperBox>
                      <SignatureImageBox>
                        {signatureImage5 ? (
                          <img
                            src={signatureImage5}
                            alt="Chữ ký đóng dấu"
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <Typography variant="caption" color="textSecondary">160x160</Typography>
                        )}
                      </SignatureImageBox>
                      {view !== "view" && (
                        <UploadButton component="label" sx={{ bottom: 0, left: 0 }}>
                          <StyledCloudUploadIcon />
                          <input
                            type="file"
                            accept="image/jpeg, image/png, image/gif"
                            hidden
                            onChange={handleSignatureImage5Change}
                          />
                        </UploadButton>
                      )}
                    </SignatureWrapperBox>
                    <Typography variant="caption" mt={1}>
                      Tải ảnh chữ ký
                    </Typography>
                    <HeaderColorTypography variant="caption">
                      Tối đa 2MB. Hỗ trợ <b>jpg, jpeg, png, gif</b>
                    </HeaderColorTypography>
                  </BoxContainer>
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </StyledCard>

        {/* Nút Lưu và Hủy được đặt ở đây, bên trong vùng cuộn */}
        {/* {view !== 'view' && (
					<ActionContainer>
						<ButtonClick onClick={handleGoBack} variant="outlined">Hủy</ButtonClick>
						<ButtonClickColor variant="contained" onClick={handleSubmit(onSubmit)}>Lưu</ButtonClickColor>
					</ActionContainer>
				)} */}
      </ContentUserContainer>

      <CustomDialog
        title="Đổi mật khẩu"
        open={openDialogChangePass}
        onClose={handleCloseDialogChangePass}
        type={"update"}
        // isLoading={isLoading}
        size="md"
        // disableSave={false}
        // onSave={handleSubmitChangePass(onSubmitChangePass)}
      >
        <Grid container spacing={2}>
          <StyledGrid item xs={7}>
            <Grid container spacing={2}>
              <Grid item xs={10} sm={10}>
                <Controller
                  name="passwordCurent"
                  control={control}
                  render={({ field }) => (
                    <InputField
                      label="Mật khẩu hiện tại"
                      placeholder={
                        view === "view" || view === "update"
                          ? ""
                          : "Nhập dữ liệu..."
                      }
                      required
                      disabled={
                        view === "view" || view === "update" ? true : false
                      }
                      type="password"
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      {...field}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={10} sm={10}>
                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field }) => (
                    <InputField
                      label="Mật khẩu mới"
                      placeholder={
                        view === "view" || view === "update"
                          ? ""
                          : "Nhập dữ liệu..."
                      }
                      required
                      disabled={
                        view === "view" || view === "update" ? true : false
                      }
                      type="password"
                      error={!!errors.repassword}
                      helperText={errors.repassword?.message}
                      {...field}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={10} sm={10}>
                <Controller
                  name="reNewPassword"
                  control={control}
                  render={({ field }) => (
                    <InputField
                      label="Nhập lại mật khẩu mới"
                      placeholder={
                        view === "view" || view === "update"
                          ? ""
                          : "Nhập dữ liệu..."
                      }
                      required
                      disabled={
                        view === "view" || view === "update" ? true : false
                      }
                      type="password"
                      error={!!errors.repassword}
                      helperText={errors.repassword?.message}
                      {...field}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </StyledGrid>

          <Grid item xs={4}>
            <Box>
              <StyledTypography variant="subtitle1">
                🔺 Gợi ý đặt mật khẩu
              </StyledTypography>
              <StyledRuleTypography>
                - Tối thiểu 8 ký tự và tối đa 20 ký tự
              </StyledRuleTypography>
              <StyledRuleTypography>
                - Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt:
              </StyledRuleTypography>
              <ul fontSize={14}>
                <li>
                  <Typography>Chữ hoa (A-Z)</Typography>
                </li>
                <li>
                  <Typography>Chữ thường (a-z)</Typography>
                </li>
                <li>
                  <Typography>Số (0-9)</Typography>
                </li>
                <li>
                  <Typography>
                    Ký tự đặc biệt (!, @, #, $, %, ^, &, *)
                  </Typography>
                </li>
              </ul>
              <StyledRuleTypography>
                - Không nên sử dụng tên, ngày sinh hoặc từ dễ đoán.
              </StyledRuleTypography>
            </Box>
          </Grid>
        </Grid>
      </CustomDialog>
      <ImageCropperDialog
        open={cropperOpen}
        onClose={() => setCropperOpen(false)}
        imageSrc={cropperImageSrc}
        onCropComplete={handleCropComplete}
        targetWidth={cropperConfig.width}
        targetHeight={cropperConfig.height}
        aspect={cropperConfig.aspect}
      />
    </LocalizationProvider>
  );

  const TABS = useMemo(() => [
    { key: "thongTinChung", label: "Thông tin chung" },
    // { key: "chiTietPhanQuyen", label: "Chi tiết phân quyền" },
    { key: "phanQuyenTheoHanhDong", label: "Phân quyền theo hành động" },
  ], []);

  const ViewContent = (
    <StyledPaper elevation={0} square style={{ height: "100%", padding: 0 }}>
      {CustomTabsWithBadge && (
        <CustomTabsWithBadge
          tabs={TABS}
          value={activeTab}
          onChange={handleTabChange}
          styledPaddingLeft={2}
        />
      )}
      <StyledTabContentBox style={{ padding: 0, height: "calc(100% - 48px)" }}>
        {activeTab === 0 && (
          <FormFieldLayoutContext.Provider value={{ inputLabelLayout }}>
            {Content}
          </FormFieldLayoutContext.Provider>
        )}
        {/* {activeTab === 1 && (
          <PermissionDetailTab
            entityType="user"
            entityId={idUpdate}
            open={activeTab === 1}
          />
        )} */}
        {activeTab === 1 && (
          <ActionPermissionDetailTab
            entityType="user"
            entityId={idUpdate}
            open={activeTab === 1}
          />
        )}
      </StyledTabContentBox>
    </StyledPaper>
  );

  if (isStandalonePage && CustomSwipper) {
    const pageTitle =
      view === "add"
        ? "Thêm mới người dùng"
        : view === "update"
        ? "Cập nhật người dùng"
        : "Chi tiết người dùng";
    return (
      <CustomSwipper
        open
        onClose={onClose}
        title={pageTitle}
        showCloseIcon
      >
        {isViewMode ? ViewContent : Content}
      </CustomSwipper>
    );
  }

  return isViewMode ? (
    ViewContent
  ) : (
    <FormFieldLayoutContext.Provider value={{ inputLabelLayout }}>
      {Content}
    </FormFieldLayoutContext.Provider>
  );
});

ManagerUsers.displayName = "ManagerUsers";

export default withSharedComponents(ManagerUsers);
