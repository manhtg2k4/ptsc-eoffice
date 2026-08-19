import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { styled } from "@mui/material/styles";
import {
  SkyAlert,
  SkyBox,
  SkyButton,
  SkyCheckbox,
  SkyCircularProgress,
  SkyCollapse,
  SkyIconButton,
  SkyTable,
  SkyTableBody,
  SkyTableCell,
  SkyTableContainer,
  SkyTableHead,
  SkyTableRow,
  SkyTooltip,
  SkyTypography,
} from "@styles/SkyStyles";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import CustomAutoCompleteSearch from "@components/CustomAutoCompleteSearch";
import api from "@services/api";
import { API_GET_LIST_FUNCTIONMANAGEMANT, ROLE_FEATURE } from "@EnvironmentFile/constants/urlConfig";
import { getPermissionLabel } from "@pages/AdministrationSystem/DetailGroupUser/constantsDistrict";

const DEFAULT_RELATED_PROCESSES = "OutGoingDocument";
const PROCESS_LIMIT = 200;
const ACTION_FETCH_CONCURRENCY = 5;
const FEATURE_LIMIT = 1000;
const FEATURE_TYPES = "list,fullList,completeList,automatic,custom";
const SECTION_COLLAPSE_TIMEOUT = 180;
const TABLE_HEADER_STICKY_HEIGHT = 56;
const SECTION_STICKY_TOP = TABLE_HEADER_STICKY_HEIGHT;

const PERMISSION_TYPE = {
  ACTION: "action",
  FEATURE: "feature",
};

const UI_TEXT = {
  actionPermissionsLoadError: "Không tải được dữ liệu phân quyền theo hành động",
  actionSection: "Hành động BPMN",
  actionTypeCount: "hành động",
  featureCount: "chức năng",
  featureSection: "Chức năng",
  noPermissions: "Không có dữ liệu quyền",
  permission: "Quyền",
  processType: "Loại quy trình",
  reload: "Tải lại",
  roleCount: "vai trò",
};

const Root = styled(SkyBox)(() => ({
  width: "100%",
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
}));

const FilterBar = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1),
  flexWrap: "wrap",
}));

const ProcessTypeFilter = styled(SkyBox)(() => ({
  width: 300,
  maxWidth: "100%",
}));

const SummaryText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const ErrorAlert = styled(SkyAlert)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));

const PermissionTableContainer = styled(SkyTableContainer)(() => ({
  width: "100%",
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  position: "relative",
}));

const PermissionTable = styled(SkyTable)(() => ({
  minWidth: 620,
}));

const PermissionHeaderCell = styled(SkyTableCell)(({ theme }) => ({
  width: 360,
  minWidth: 300,
  height: TABLE_HEADER_STICKY_HEIGHT,
  fontWeight: 700,
  position: "sticky",
  top: 0,
  left: 0,
  zIndex: 7,
  backgroundColor: theme.palette.background.default,
  boxShadow: "2px 0 5px rgba(0, 0, 0, 0.08)",
}));

const RoleHeaderCell = styled(SkyTableCell)(({ theme }) => ({
  width: 160,
  minWidth: 150,
  maxWidth: 180,
  height: TABLE_HEADER_STICKY_HEIGHT,
  fontWeight: 700,
  position: "sticky",
  top: 0,
  zIndex: 6,
  textAlign: "center",
  backgroundColor: theme.palette.background.default,
}));

const CenterStateCell = styled(SkyTableCell)(({ theme }) => ({
  paddingTop: theme.spacing(5),
  paddingBottom: theme.spacing(5),
}));

const EmptyStateCell = styled(CenterStateCell)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const PermissionNameCell = styled(SkyTableCell)(({ theme }) => ({
  maxWidth: 360,
  position: "sticky",
  left: 0,
  zIndex: 2,
  backgroundColor: theme.palette.background.paper,
  boxShadow: "2px 0 5px rgba(0, 0, 0, 0.08)",
}));

const PermissionNameText = styled(SkyTypography)(() => ({
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: 600,
}));

const PermissionCodeText = styled(SkyTypography)(({ theme }) => ({
  display: "block",
  color: theme.palette.text.secondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

const RoleHeaderText = styled(SkyTypography)(() => ({
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 13,
  fontWeight: 700,
}));


const CheckCell = styled(SkyTableCell)(() => ({
  textAlign: "center",
}));

const PermissionDataRow = styled(SkyTableRow, {
  shouldForwardProp: (prop) => prop !== "expanded",
})(({ expanded, theme }) => ({
  "& > td": {
    paddingTop: expanded ? theme.spacing(1.5) : 0,
    paddingBottom: expanded ? theme.spacing(1.5) : 0,
    borderColor: expanded ? theme.palette.divider : "transparent",
    transition: theme.transitions.create(["padding-top", "padding-bottom", "border-color"], {
      duration: SECTION_COLLAPSE_TIMEOUT,
    }),
  },
}));

const PermissionCellCollapse = styled(SkyCollapse)(() => ({
  width: "100%",
}));

const SectionTableRow = styled(SkyTableRow)(({ theme }) => ({
  "& td": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const SectionNameCell = styled(SkyTableCell)(({ theme }) => ({
  position: "sticky",
  top: SECTION_STICKY_TOP,
  left: 0,
  zIndex: 5,
  backgroundColor: theme.palette.action.hover,
  boxShadow: "2px 0 5px rgba(0, 0, 0, 0.08)",
}));

const SectionFillCell = styled(SkyTableCell)(({ theme }) => ({
  position: "sticky",
  top: SECTION_STICKY_TOP,
  zIndex: 4,
  backgroundColor: theme.palette.action.hover,
}));

const SectionContent = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.75),
}));

const SectionToggleButton = styled(SkyIconButton)(({ theme }) => ({
  width: 24,
  height: 24,
  padding: theme.spacing(0.25),
  color: theme.palette.text.secondary,
}));

const SectionExpandedIcon = styled(KeyboardArrowDownIcon)(() => ({
  fontSize: 20,
}));

const SectionCollapsedIcon = styled(KeyboardArrowRightIcon)(() => ({
  fontSize: 20,
}));

const SectionText = styled(SkyTypography)(() => ({
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
}));

const SectionCountText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));
const formatActionTitle = (value) => {
  const text = String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  const lowerText = text.toLocaleLowerCase("vi-VN");
  return lowerText.charAt(0).toLocaleUpperCase("vi-VN") + lowerText.slice(1);
};

const normalizeTextKey = (value) => String(value || "")
  .normalize("NFC")
  .replace(/\s+/g, " ")
  .trim()
  .toLocaleLowerCase("vi-VN");

const getActionTitle = (action) => formatActionTitle(
  action?.type === "bpmn:SequenceFlow" && action?.groupLabel
    ? action.groupLabel
    : action?.label || action?.name || action?.code || action?.taskId || action?.id,
);

const getFeatureTitle = (feature) => feature?.name || feature?.code || feature?.id || feature?._id || "";

const getFeaturePermissionCandidates = (feature) => [feature?.code, feature?.id, feature?._id]
  .filter(Boolean)
  .map((value) => String(value).trim());

const roleHasFeaturePermission = (role, feature) => {
  const permissions = Array.isArray(role?.permissions) ? role.permissions : [];
  if (permissions.length === 0) return false;

  const candidateSet = new Set(getFeaturePermissionCandidates(feature));
  return permissions.some((permission) => candidateSet.has(String(permission).trim()));
};

const getFeaturePermittedRoles = (feature) => {
  const roles = Array.isArray(feature?.roles) ? feature.roles : [];
  return roles.filter((role) => roleHasFeaturePermission(role, feature));
};

const getProcessKey = (process) => process?.processKey || process?.processID || process?.id || process?._id;

const getActionProcessKey = (action, fallbackProcessKey) => action?.processKey
  || action?.processID
  || action?.processId
  || action?.sourceProcess?.key
  || action?.sourceProcess?.processKey
  || action?.sourceProcess?.id
  || fallbackProcessKey;

const normalizeApiList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const normalizeRolesPayload = (payload) => {
  const data = payload?.data || payload || {};
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.roles)) return data.roles;
  return [];
};

const runLimited = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }));

  return results;
};

const getRoleCode = (role) => role?.roleCode || role?.name || role?.id;

const getRoleName = (role, roleCode) => getPermissionLabel(roleCode) || role?.name || role?.roleName || roleCode;

const buildPermissionMatrix = (processPermissionResults) => {
  const roleMap = new Map();
  const rowMap = new Map();

  const addRole = (role) => {
    const roleCode = getRoleCode(role);
    if (!roleCode) return "";

    if (!roleMap.has(roleCode)) {
      roleMap.set(roleCode, {
        code: roleCode,
        name: getRoleName(role, roleCode),
      });
    }

    return roleCode;
  };

  const addMatrixRow = ({ code, processKey, role, rowType, title }) => {
    const roleCode = addRole(role);
    const titleKey = normalizeTextKey(title);
    if (!roleCode || !titleKey) return;

    const codeKey = rowType === PERMISSION_TYPE.FEATURE ? normalizeTextKey(`${code || ""}:${processKey || ""}`) : "";
    const rowKey = rowType === PERMISSION_TYPE.FEATURE
      ? `${rowType}:${titleKey}:${codeKey}`
      : `${rowType}:${titleKey}`;
    const displayCode = code && processKey ? `${code} - ${processKey}` : code;

    if (!rowMap.has(rowKey)) {
      rowMap.set(rowKey, {
        id: rowKey,
        caption: rowType === PERMISSION_TYPE.FEATURE ? displayCode : "",
        processKeys: new Set(),
        roleCodes: new Set(),
        sortOrder: rowType === PERMISSION_TYPE.FEATURE ? 1 : 2,
        title,
        type: rowType,
      });
    }

    const matrixRow = rowMap.get(rowKey);
    matrixRow.roleCodes.add(roleCode);
    if (rowType === PERMISSION_TYPE.ACTION && processKey) {
      matrixRow.processKeys.add(processKey);
    }
  };

  processPermissionResults.forEach((processPermission) => {
    const processKey = processPermission?.processKey;
    const features = processPermission?.features || [];

    features.forEach((feature) => {
      const title = getFeatureTitle(feature);
      const code = feature?.code || feature?.id || feature?._id;
      getFeaturePermittedRoles(feature).forEach((role) => {
        addMatrixRow({
          code,
          processKey,
          role,
          rowType: PERMISSION_TYPE.FEATURE,
          title,
        });
      });
    });
  });

  processPermissionResults.forEach((processPermission) => {
    const roles = processPermission?.roles || [];
    (roles || []).forEach((role) => {
      const actions = Array.isArray(role?.actions) ? role.actions : [];
      actions.forEach((action) => {
        addMatrixRow({
          processKey: getActionProcessKey(action, processPermission?.processKey),
          role,
          rowType: PERMISSION_TYPE.ACTION,
          title: getActionTitle(action),
        });
      });
    });
  });

  const rows = Array.from(rowMap.values())
    .map((row) => {
      const processKeys = Array.from(row.processKeys || []);
      return {
        ...row,
        caption: row.type === PERMISSION_TYPE.ACTION ? processKeys.join(", ") : row.caption,
        processKeys,
        roleCodes: Array.from(row.roleCodes),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "vi-VN"));

  return {
    actionTotal: rows.filter((row) => row.type === PERMISSION_TYPE.ACTION).length,
    featureTotal: rows.filter((row) => row.type === PERMISSION_TYPE.FEATURE).length,
    roles: Array.from(roleMap.values()),
    rows,
  };
};

const ActionPermissionDetailTab = ({ entityType, entityId, open = true }) => {
  const [relatedProcesses, setRelatedProcesses] = useState(DEFAULT_RELATED_PROCESSES);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [permissionRows, setPermissionRows] = useState([]);
  const [roleColumns, setRoleColumns] = useState([]);
  const [actionTotal, setActionTotal] = useState(0);
  const [featureTotal, setFeatureTotal] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    [PERMISSION_TYPE.FEATURE]: true,
    [PERMISSION_TYPE.ACTION]: true,
  });

  const actorParams = useMemo(() => {
    if (entityType === "group") return { groupId: entityId };
    if (entityType === "user") return { userId: entityId };
    return {};
  }, [entityId, entityType]);

  const handleRelatedProcessesChange = useCallback((value) => {
    setRelatedProcesses(value || "");
  }, []);

  const toggleSection = useCallback((sectionType) => {
    setExpandedSections((previous) => ({
      ...previous,
      [sectionType]: !previous[sectionType],
    }));
  }, []);

  const handleSectionToggleClick = useCallback((event) => {
    const { sectionType } = event.currentTarget.dataset;
    if (sectionType) {
      toggleSection(sectionType);
    }
  }, [toggleSection]);

  const fetchPermissions = useCallback(async () => {
    if (!entityId) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const relatedResponse = await api.get(`${ROLE_FEATURE}/related-processes`, {
        params: {
          page: 1,
          limit: PROCESS_LIMIT,
          relatedProcesses: relatedProcesses || undefined,
          showInPermissionDetail: true,
          ...actorParams,
        },
      });
      const processes = normalizeApiList(relatedResponse?.data);

      const processPermissionResults = await runLimited(processes, ACTION_FETCH_CONCURRENCY, async (process) => {
        const processKey = getProcessKey(process);
        if (!processKey) return { processKey: "", roles: [], features: [] };

        const [roles, features] = await Promise.all([
          (async () => {
            try {
              const actionResponse = await api.get(`${ROLE_FEATURE}/actions-by-feature`, {
                params: {
                  processKey,
                  ...actorParams,
                },
              });
              return normalizeRolesPayload(actionResponse?.data);
            } catch {
              return [];
            }
          })(),
          (async () => {
            try {
              const featureResponse = await api.get(API_GET_LIST_FUNCTIONMANAGEMANT, {
                params: {
                  page: 1,
                  limit: FEATURE_LIMIT,
                  processID: processKey,
                  featureType: FEATURE_TYPES,
                  includePermissionActions: true,
                  ...actorParams,
                },
              });
              return normalizeApiList(featureResponse?.data);
            } catch {
              return [];
            }
          })(),
        ]);

        return { processKey, roles, features };
      });

      const permissionResult = buildPermissionMatrix(processPermissionResults);

      setPermissionRows(permissionResult.rows);
      setRoleColumns(permissionResult.roles);
      setActionTotal(permissionResult.actionTotal);
      setFeatureTotal(permissionResult.featureTotal);
    } catch (error) {
      setPermissionRows([]);
      setRoleColumns([]);
      setActionTotal(0);
      setFeatureTotal(0);
      setErrorMessage(error?.response?.data?.message || error?.message || UI_TEXT.actionPermissionsLoadError);
    } finally {
      setLoading(false);
    }
  }, [actorParams, entityId, relatedProcesses]);

  useEffect(() => {
    if (open) {
      fetchPermissions();
    }
  }, [fetchPermissions, open]);

  const emptyColSpan = roleColumns.length + 1;
  const groupedPermissionRows = useMemo(() => {
    const featureRows = permissionRows.filter((row) => row.type === PERMISSION_TYPE.FEATURE);
    const actionRows = permissionRows.filter((row) => row.type === PERMISSION_TYPE.ACTION);
    const rows = [];

    const appendSection = ({ id, sectionType, title, children }) => {
      if (children.length === 0) return;

      const expanded = expandedSections[sectionType] !== false;
      rows.push({
        id,
        count: children.length,
        expanded,
        isSection: true,
        sectionType,
        title,
      });

      rows.push(...children.map((child) => ({
        ...child,
        sectionExpanded: expanded,
      })));
    };

    appendSection({
      id: "section-feature",
      sectionType: PERMISSION_TYPE.FEATURE,
      title: UI_TEXT.featureSection,
      children: featureRows,
    });

    appendSection({
      id: "section-action",
      sectionType: PERMISSION_TYPE.ACTION,
      title: UI_TEXT.actionSection,
      children: actionRows,
    });

    return rows;
  }, [expandedSections, permissionRows]);

  return (
    <Root>
      <FilterBar>
        <ProcessTypeFilter>
          <CustomAutoCompleteSearch
            code="LOAIVANBAN"
            placeholder={UI_TEXT.processType}
            value={relatedProcesses || null}
            onChange={handleRelatedProcessesChange}
            fullWidth
            disableClearable
            size="small"
          />
        </ProcessTypeFilter>
        <SkyButton
          variant="outlined"
          size="small"
          startIcon={loading ? <SkyCircularProgress size={14} /> : <RefreshOutlinedIcon />}
          onClick={fetchPermissions}
          disabled={loading}
        >
          {UI_TEXT.reload}
        </SkyButton>
        <SummaryText variant="body2">
          {featureTotal} {UI_TEXT.featureCount}, {actionTotal} {UI_TEXT.actionTypeCount}, {roleColumns.length} {UI_TEXT.roleCount}
        </SummaryText>
      </FilterBar>

      {errorMessage && <ErrorAlert severity="error">{errorMessage}</ErrorAlert>}

      <PermissionTableContainer>
        <PermissionTable stickyHeader size="small">
          <SkyTableHead>
            <SkyTableRow>
              <PermissionHeaderCell>{UI_TEXT.permission}</PermissionHeaderCell>
              {roleColumns.map((role) => (
                <RoleHeaderCell key={role.code} align="center">
                  <SkyTooltip title={role.name}>
                    <RoleHeaderText>{role.name}</RoleHeaderText>
                  </SkyTooltip>
                </RoleHeaderCell>
              ))}
            </SkyTableRow>
          </SkyTableHead>
          <SkyTableBody>
            {loading ? (
              <SkyTableRow>
                <CenterStateCell colSpan={emptyColSpan} align="center">
                  <SkyCircularProgress size={24} />
                </CenterStateCell>
              </SkyTableRow>
            ) : permissionRows.length === 0 ? (
              <SkyTableRow>
                <EmptyStateCell colSpan={emptyColSpan} align="center">
                  {UI_TEXT.noPermissions}
                </EmptyStateCell>
              </SkyTableRow>
            ) : groupedPermissionRows.map((row) => (
              row.isSection ? (
                <SectionTableRow key={row.id}>
                  <SectionNameCell>
                    <SectionContent>
                      <SectionToggleButton
                        size="small"
                        data-section-type={row.sectionType}
                        onClick={handleSectionToggleClick}
                        aria-label={`${row.expanded ? "Thu gọn" : "Mở rộng"} ${row.title}`}
                      >
                        {row.expanded ? <SectionExpandedIcon /> : <SectionCollapsedIcon />}
                      </SectionToggleButton>
                      <SectionText>{row.title}</SectionText>
                      <SectionCountText variant="caption">({row.count})</SectionCountText>
                    </SectionContent>
                  </SectionNameCell>
                  {roleColumns.map((role) => (
                    <SectionFillCell key={`${row.id}-${role.code}`} />
                  ))}
                </SectionTableRow>
              ) : (
                <PermissionDataRow key={row.id} hover expanded={row.sectionExpanded !== false}>
                  <PermissionNameCell>
                    <PermissionCellCollapse in={row.sectionExpanded !== false} timeout={SECTION_COLLAPSE_TIMEOUT} unmountOnExit>
                      <SkyTooltip title={row.title}>
                        <PermissionNameText>{row.title}</PermissionNameText>
                      </SkyTooltip>
                      {row.caption && (
                        <PermissionCodeText variant="caption">
                          {row.caption}
                        </PermissionCodeText>
                      )}
                    </PermissionCellCollapse>
                  </PermissionNameCell>
                  {roleColumns.map((role) => (
                    <CheckCell key={`${row.id}-${role.code}`} align="center">
                      <PermissionCellCollapse in={row.sectionExpanded !== false} timeout={SECTION_COLLAPSE_TIMEOUT} unmountOnExit>
                        <SkyCheckbox checked={row.roleCodes.includes(role.code)} disabled size="small" />
                      </PermissionCellCollapse>
                    </CheckCell>
                  ))}
                </PermissionDataRow>
              )
            ))}
          </SkyTableBody>
        </PermissionTable>
      </PermissionTableContainer>
    </Root>
  );
};

ActionPermissionDetailTab.propTypes = {
  entityType: PropTypes.oneOf(["group", "user"]).isRequired,
  entityId: PropTypes.string.isRequired,
  open: PropTypes.bool,
};

export default React.memo(ActionPermissionDetailTab);
