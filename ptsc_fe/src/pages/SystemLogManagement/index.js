import React, { useCallback, useEffect, useState } from "react";
import CustomTable from "@components/CustomTable/CustomTable";
import { format } from "date-fns";
import { useToast } from "@components/common/ToastProvider";
import {
  columns,
  defaultValuePopupSetting,
  filters,
  validatePopupSettingSchema,
} from "./constant";
import { useDispatch, useSelector } from "react-redux"; // useDispatch vẫn được giữ lại để lấy danh sách người dùng
import { getDataListUserByUnit } from "@redux/slices/managementUsersSlice";
// import { Box, Grid, styled } from "@mui/material";
// import CustomInput from "@components/CustomInput/CustomInput";
import { API_LOG_DHVBTC } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import PopupSetting from "./components/PopupSetting";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  getDataSettingClearLog,
  updateDraftSettingClearLog,
} from "@redux/slices/SettingClearLog/SettingClearLogSlice";
import { Tooltip } from "@mui/material";
import { StyledLogSettingButton } from "@styles/CustomTable.styles";
import TuneIcon from "@mui/icons-material/Tune";

function SystemLogManagement() {
  const toast = useToast();
  const dispatch = useDispatch();
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const profileUser = authUser || {};
  const [, setUsers] = useState([]);
  const [searchParams, setSearchParams] = useState({
    userName: "",
    method: "",
    ip: "",
    startDate: null,
    endDate: null,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validatePopupSettingSchema),
    defaultValues: defaultValuePopupSetting,
    mode: 'onChange',
  });
  const [openPopupSetting, setOpenPopupSetting] = useState(false);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await dispatch(
          getDataListUserByUnit({ id: "all", limit: 9999 })
        ).unwrap();
        const userOptions = response.data.map((user) => ({
          name: user.username,
          value: user.username,
        }));
        setUsers(userOptions);
      } catch (error) {
        toast("Không thể tải danh sách người dùng!", "error");
      }
    };

    fetchUsers();
  }, [dispatch, toast]);

  // Sử dụng useCallback để ổn định tham chiếu của fetchDataFromApi
  const fetchDataFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      if (!page || !limit) {
        return { data: [], total: 0 };
      }
      try {
        const { userName, ip, ...restSearchParams } = searchParams;

        const apiParams = {
          ...restSearchParams,
          // type: "DHVBTC",
          // status: "success",
          page,
          limit,
          ...(sort && { sort }),
        };

        if (query && Array.isArray(code) && code.length > 0) {
          code.forEach((field) => {
            apiParams[field] = query;
          });
        }

        if (userName) {
          apiParams["userName"] = userName;
        }

        if (ip) {
          apiParams["ipAddress"] = ip;
        }

        Object.keys(apiParams).forEach(
          (key) =>
            (apiParams[key] === null ||
              apiParams[key] === undefined ||
              apiParams[key] === "") &&
            delete apiParams[key]
        );

        const response = await api.get(API_LOG_DHVBTC, { params: apiParams });
        const rawData = response.data?.data || [];
        const formattedData = rawData.map((item) => ({
          ...item,
          createdAt: item.createdAt
            ? format(new Date(item.createdAt), "dd/MM/yyyy HH:mm:ss")
            : "",
        }));

        return {
          data: formattedData,
          total: response.data?.total || 0,
        };
      } catch (error) {
        toast("Có lỗi xảy ra khi tải dữ liệu!", "error");
        return { data: [], total: 0 };
      }
    },
    [toast, searchParams] // Bỏ dispatch khỏi dependency của hàm này
  );

  const handleSearchChange = (field, value) => {
    if (field === "dateRange") {
      setSearchParams((prev) => ({
        ...prev,
        startDate: value.startDate,
        endDate: value.endDate,
      }));
    } else {
      setSearchParams((prev) => ({ ...prev, [field]: value }));
    }
  };
  const onDateRangeChange = ([startDate, endDate]) => {
    handleSearchChange("dateRange", { startDate, endDate });
  };

  const handleOpenPopupSetting = useCallback(async () => {
    try {
      const res = await dispatch(getDataSettingClearLog()).unwrap();
      reset({
        ...res,
        updater: profileUser?.user?.username || res.updater,
      });
      setOpenPopupSetting(true);
    } catch (error) {
      logger.log("Lỗi khi tải dữ liệu cấu hình!", error);
      setOpenPopupSetting(true);
      toast("Không thể tải dữ liệu cấu hình!", "error");
    }
  }, [dispatch, profileUser, reset, toast]);

  const handleClosePopupSetting = () => {
    setOpenPopupSetting(false);
    reset();
  };

  const handleSave = async (data) => {
    try {
      await dispatch(updateDraftSettingClearLog(data)).unwrap();
      toast("Cập nhật thông tin thành công!", "success");
      handleClosePopupSetting(true);
    } catch (error) {
      logger.log("Lỗi handleSave", error);
      toast("Không thể cập nhật thông tin!", "error");
    }
  };

  const renderPopupSettingAction = useCallback(
    () => (
      <StyledLogSettingButton onClick={handleOpenPopupSetting}>
        <Tooltip title="Cấu hình lưu trữ log">
          <TuneIcon />
        </Tooltip>
      </StyledLogSettingButton>
    ),
    [handleOpenPopupSetting]
  );

  return (
    <>
      <CustomTable
        codeModule={"System_Access_Log_Management"}
        fetchData={fetchDataFromApi}
        columns={columns}
        filter={filters}
        disableSynchronize
        isSetting
        renderCustomActions={renderPopupSettingAction}
        // anableDateRangePicker
        enableTimePicker
        disableAdd
        disableDelete
        disableAct
        disableCheckbox
        onDateRangeChange={onDateRangeChange}
        // dateRange={{ startDate: searchParams.startDate, endDate: searchParams.endDate }}
        disableExport
        titleExport="Nhật ký truy cập hệ thống"
        isCheckTitle
        uiPreset="unitModern"
        actionIconSize="medium"
        useModernActionColors
        rowsPerPageOptions={[25, 50, 100, 500]}
				lockRowsPerPageOptions
				filterPopupAlignLeft
				encodeHtml
      >
        <PopupSetting
          open={openPopupSetting}
          onClose={handleClosePopupSetting}
          handleSubmit={handleSubmit}
          onSubmit={handleSave}
          onSave={handleSubmit(handleSave)}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          // isLoading={isLoading}
        />
      </CustomTable>
    </>
  );
}

export default SystemLogManagement;
