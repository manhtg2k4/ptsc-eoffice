import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Switch } from "@mui/material";
import { styled } from "@mui/material/styles";
import AndroidIcon from "@mui/icons-material/Android";
import AppleIcon from "@mui/icons-material/Apple";
// import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import api from "@services/api";
import { useToast } from "@components/common/ToastProvider";
import {
  SkyAlert,
  SkyBox,
  SkyButton,
  SkyChip,
  SkyCircularProgress,
  SkyDivider,
  SkyFormControlLabel,
  SkyGrid,
  SkyPaper,
  SkyStack,
  SkyTextField,
  SkyTypography,
} from "@styles/SkyStyles";
import {
  API_MOBILE_APP_VERSION_CONFIG,
  API_MOBILE_APP_VERSION_CONFIG_ALL,
} from "@EnvironmentFile/constants/urlConfig";

const AndroidPlatformIcon = styled(AndroidIcon)(() => ({
  fontSize: 20,
}));

const IosPlatformIcon = styled(AppleIcon)(() => ({
  fontSize: 20,
}));

const OpenLinkIcon = styled(OpenInNewIcon)(() => ({
  fontSize: 18,
}));

const PLATFORMS = [
  { value: "android", label: "Android", icon: <AndroidPlatformIcon /> },
  { value: "ios", label: "iOS", icon: <IosPlatformIcon /> },
];

const PageContainer = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor:
    theme.palette.mode === "dark"
      ? theme.palette.background.default
      : "#f4f7fa",
  minHeight: "100%",
}));

const HeaderStack = styled(SkyStack)(({ theme }) => ({
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
  [theme.breakpoints.up("md")]: {
    flexDirection: "row",
    alignItems: "center",
  },
}));

const PageTitle = styled(SkyTypography)(() => ({
  fontWeight: 700,
}));

const PageDescription = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
}));

const ErrorAlert = styled(SkyAlert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const PlatformCard = styled(SkyPaper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(1),
  boxShadow:
    theme.palette.mode === "dark"
      ? theme.shadows[2]
      : "0 8px 24px rgba(15, 23, 42, 0.08)",
}));

const PlatformCardHeader = styled(SkyStack)(({ theme }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

const PlatformChipStack = styled(SkyStack)(({ theme }) => ({
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(1),
}));

const PlatformChip = styled(SkyChip)(({ theme }) => ({
  color: theme.palette.primary.main,
  borderColor: theme.palette.primary.main,
  "& .MuiChip-icon": {
    color: theme.palette.primary.main,
  },
}));

const ForceUpdateChip = styled(SkyChip)(({ theme }) => ({
  color: theme.palette.error.contrastText,
  backgroundColor: theme.palette.error.main,
}));

const PlatformDivider = styled(SkyDivider)(({ theme }) => ({
  margin: theme.spacing(0, 0, 2.5),
}));

const PlatformField = styled(SkyTextField)(() => ({
  marginTop: 0,
  marginBottom: 0,
}));

const FormActionBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  paddingTop: theme.spacing(1),
}));

const InheritCircularProgress = styled(SkyCircularProgress)(() => ({
  color: "inherit",
}));

const createEmptyConfig = (platform) => ({
  platform,
  version: "",
  buildNumber: "",
  updateUrl: "",
  forceUpdate: false,
});

const normalizeConfig = (platform, config = {}) => ({
  id: config.id,
  platform,
  version: config.version || "",
  buildNumber:
    config.buildNumber === null || config.buildNumber === undefined
      ? ""
      : String(config.buildNumber),
  updateUrl: config.updateUrl || "",
  forceUpdate: Boolean(config.forceUpdate),
});

const buildConfigMap = (items = []) => {
  const byPlatform = PLATFORMS.reduce((acc, item) => {
    acc[item.value] = createEmptyConfig(item.value);
    return acc;
  }, {});

  items.forEach((item) => {
    if (!item?.platform || !byPlatform[item.platform]) return;
    byPlatform[item.platform] = normalizeConfig(item.platform, item);
  });

  return byPlatform;
};

const toPayload = (config) => ({
  version: config.version?.trim() || null,
  buildNumber:
    config.buildNumber === "" || config.buildNumber === null
      ? null
      : Number(config.buildNumber),
  updateUrl: config.updateUrl?.trim() || null,
  forceUpdate: Boolean(config.forceUpdate),
});

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Có lỗi xảy ra";

function PlatformConfigCard({
  value,
  label,
  icon,
  config,
  loading,
  savingPlatform = null,
  onFieldChange,
  onSave,
}) {
  const handleVersionChange = useCallback(
    (event) => onFieldChange(value, "version", event.target.value),
    [onFieldChange, value]
  );

  const handleBuildNumberChange = useCallback(
    (event) => onFieldChange(value, "buildNumber", event.target.value),
    [onFieldChange, value]
  );

  const handleUpdateUrlChange = useCallback(
    (event) => onFieldChange(value, "updateUrl", event.target.value),
    [onFieldChange, value]
  );

  const handleForceUpdateChange = useCallback(
    (event) => onFieldChange(value, "forceUpdate", event.target.checked),
    [onFieldChange, value]
  );

  const handleOpenLink = useCallback(() => {
    window.open(config.updateUrl, "_blank", "noopener,noreferrer");
  }, [config.updateUrl]);

  const handleSaveClick = useCallback(() => {
    onSave(value);
  }, [onSave, value]);

  return (
    <PlatformCard>
      <PlatformCardHeader>
        <PlatformChipStack>
          <PlatformChip icon={icon} label={label} variant="outlined" />
          {config.forceUpdate ? (
            <ForceUpdateChip label="Bắt buộc" size="small" />
          ) : null}
        </PlatformChipStack>

        {config.updateUrl ? (
          <SkyButton
            size="small"
            variant="text"
            endIcon={<OpenLinkIcon />}
            onClick={handleOpenLink}
          >
            Mở link
          </SkyButton>
        ) : null}
      </PlatformCardHeader>

      <PlatformDivider />

      <SkyStack spacing={2}>
        <PlatformField
          label="Version"
          size="small"
          value={config.version}
          onChange={handleVersionChange}
          placeholder="1.3.2"
          fullWidth
        />

        <PlatformField
          label="Build number"
          size="small"
          type="number"
          value={config.buildNumber}
          onChange={handleBuildNumberChange}
          placeholder="21"
          fullWidth
          inputProps={{ min: 0 }}
        />

        <PlatformField
          label="Update URL"
          size="small"
          value={config.updateUrl}
          onChange={handleUpdateUrlChange}
          placeholder="https://play.google.com/store/apps/details?id=..."
          fullWidth
        />

        <SkyFormControlLabel
          control={
            <Switch
              checked={config.forceUpdate}
              onChange={handleForceUpdateChange}
            />
          }
          label="Bắt buộc cập nhật"
        />

        <FormActionBox>
          <SkyButton
            variant="contained"
            startIcon={
              savingPlatform === value ? (
                <InheritCircularProgress size={16} />
              ) : (
                <SaveIcon />
              )
            }
            disabled={loading || Boolean(savingPlatform)}
            onClick={handleSaveClick}
          >
            Lưu {label}
          </SkyButton>
        </FormActionBox>
      </SkyStack>
    </PlatformCard>
  );
}

PlatformConfigCard.propTypes = {
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  config: PropTypes.shape({
    version: PropTypes.string,
    buildNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    updateUrl: PropTypes.string,
    forceUpdate: PropTypes.bool,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  savingPlatform: PropTypes.string,
  onFieldChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

function MobileAppVersionConfig() {
  const toast = useToast();
  const [configs, setConfigs] = useState(() => buildConfigMap());
  const [loading, setLoading] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const platformConfigs = useMemo(
    () =>
      PLATFORMS.map((platform) => ({
        ...platform,
        config: configs[platform.value],
      })),
    [configs]
  );

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get(API_MOBILE_APP_VERSION_CONFIG_ALL);
      const data = response?.data?.data || response?.data || [];
      setConfigs(buildConfigMap(Array.isArray(data) ? data : []));
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);
      toast("Không thể tải cấu hình phiên bản app mobile", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const updateConfigField = useCallback((platform, field, value) => {
    setConfigs((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  }, []);

  const handleSave = useCallback(
    async (platform) => {
      const config = configs[platform];
      const payload = toPayload(config);

      if (
        payload.buildNumber !== null &&
        !Number.isFinite(payload.buildNumber)
      ) {
        toast("Build number không hợp lệ", "warning");
        return;
      }

      setSavingPlatform(platform);
      setErrorMessage("");

      try {
        const response = await api.patch(
          `${API_MOBILE_APP_VERSION_CONFIG}/${platform}`,
          payload
        );
        const updated = response?.data?.data || response?.data;
        setConfigs((prev) => ({
          ...prev,
          [platform]: normalizeConfig(
            platform,
            updated || { ...payload, platform }
          ),
        }));
        toast("Đã lưu cấu hình phiên bản app mobile", "success");
      } catch (error) {
        const message = getErrorMessage(error);
        setErrorMessage(message);
        toast("Không thể lưu cấu hình phiên bản app mobile", "error");
      } finally {
        setSavingPlatform(null);
      }
    },
    [configs, toast]
  );

  return (
    <PageContainer>
      <HeaderStack>
        <SkyBox>
          <PageTitle variant="h5">Quản lý phiên bản app mobile</PageTitle>
          <PageDescription variant="body2">
            Cấu hình phiên bản, build number, link cập nhật và trạng thái bắt
            buộc cập nhật.
          </PageDescription>
        </SkyBox>

        {/* <SkyButton
          variant="outlined"
          startIcon={
            loading ? <SkyCircularProgress size={16} /> : <RefreshIcon />
          }
          onClick={fetchConfigs}
          disabled={loading || Boolean(savingPlatform)}
        >
          Tải lại
        </SkyButton> */}
      </HeaderStack>

      {errorMessage ? (
        <ErrorAlert severity="error">{errorMessage}</ErrorAlert>
      ) : null}

      <SkyGrid container spacing={2.5}>
        {platformConfigs.map(({ value, label, icon, config }) => (
          <SkyGrid item xs={12} lg={6} key={value}>
            <PlatformConfigCard
              value={value}
              label={label}
              icon={icon}
              config={config}
              loading={loading}
              savingPlatform={savingPlatform}
              onFieldChange={updateConfigField}
              onSave={handleSave}
            />
          </SkyGrid>
        ))}
      </SkyGrid>
    </PageContainer>
  );
}

export default MobileAppVersionConfig;
