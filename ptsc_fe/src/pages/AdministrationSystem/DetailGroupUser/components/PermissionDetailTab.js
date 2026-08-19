import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import CustomAutoCompleteSearch from "@components/CustomAutoCompleteSearch";
import CustomTableTreeLoadmore from "@components/CustomTable/CustomTableTreeLoadmore";
import api from "@services/api";
import { API_GET_LIST_FUNCTIONMANAGEMANT, ROLE_FEATURE } from "@EnvironmentFile/constants/urlConfig";
import { getListRoleFeatureRelatedProcesses } from "@redux/slices/managementUsersSlice";
import { FlexColumnGrow } from "@styles/DetailGroupUser.styles";
import { getPermissionLabel } from "@pages/AdministrationSystem/DetailGroupUser/constantsDistrict";

const ProcessFilter = ({ context }) => {
	const handleChange = useCallback((val) => {
		context.setFilters((prev) => ({
			...prev,
			relatedProcesses: val || undefined,
		}));
	}, [context]);

	return (
		<div style={{ display: "flex", gap: "10px", width: "100%", maxWidth: "300px", marginBottom: "8px" }}>
			<CustomAutoCompleteSearch
				code="LOAIVANBAN"
				placeholder="Loại quy trình"
				value={context.filters.relatedProcesses || null}
				onChange={handleChange}
				fullWidth
				size="small"
			/>
		</div>
	);
};

ProcessFilter.propTypes = {
	context: PropTypes.object.isRequired,
};

const PermissionDetailTab = ({ entityType, entityId, open = true }) => {
	const dispatch = useDispatch();
	const toast = useToast();
	const processes = [];
	const [matrixColumns, setMatrixColumns] = useState({
		columns: [{ name: "Quy trình / Chức năng", row: "name", width: "400px", isTree: true }],
		seenCodes: new Set(),
	});

  const fetchedUserTaskRowsRef = useRef(new Set());
  const [userTasksByProcess, setUserTasksByProcess] = useState({});
  const [expandedUserTaskRows, setExpandedUserTaskRows] = useState({});
  const [loadingUserTaskRows, setLoadingUserTaskRows] = useState({});

	const updateRoleColumns = useCallback((itemsList, reset = false) => {
		if (!Array.isArray(itemsList)) return;
		setMatrixColumns((prev) => {
			const nextCols = reset
				? [{ name: "Quy trình / Chức năng", row: "name", width: "400px", isTree: true }]
				: [...prev.columns];
			const nextSeen = reset ? new Set() : new Set(prev.seenCodes);
			let changed = reset;

			itemsList.forEach((item) => {
				if (Array.isArray(item.roles)) {
					item.roles.forEach((r) => {
						const code = r.roleCode || r.name;
						if (code && !nextSeen.has(code)) {
							nextSeen.add(code);
							const displayName = getPermissionLabel(code) || r.name || r.roleCode;
							nextCols.push({
								name: displayName,
								row: code,
								isRole: true,
								width: "180px",
							});
							changed = true;
						}
					});
				}
			});

			if (changed) {
				return {
					columns: nextCols,
					seenCodes: nextSeen,
				};
			}
			return prev;
		});
	}, []);

	useEffect(() => {
		if (open) {
			setMatrixColumns({
				columns: [{ name: "Quy trình / Chức năng", row: "name", width: "400px", isTree: true }],
				seenCodes: new Set(),
			});
      fetchedUserTaskRowsRef.current = new Set();
      setUserTasksByProcess({});
      setExpandedUserTaskRows({});
      setLoadingUserTaskRows({});
		}
	}, [open, entityId, entityType]);

	const fetchProcessesLocal = useCallback(
		async (params) => {
			try {
				const apiParams = { 
					...params,
					showInPermissionDetail: true,
				};
				if (entityType === "group") {
					apiParams.groupId = entityId;
				} else if (entityType === "user") {
					apiParams.userId = entityId;
				}

				const res = await dispatch(
					getListRoleFeatureRelatedProcesses(apiParams)
				).unwrap();
				const rawData = res.data || res || [];
				const total = res.total ?? (Array.isArray(res) ? res.length : rawData.length || 0);

				const isFirstPage = !params || !params.page || Number(params.page) === 1;
				updateRoleColumns(rawData, isFirstPage);

				return {
					data: rawData,
					total: total,
				};
			} catch (err) {
				toast("Lỗi khi tải cấu hình vai trò!", "error");
				return { data: [], total: 0 };
			}
		},
		[dispatch, toast, updateRoleColumns, entityType, entityId]
	);

	const fetchFeaturesForProcess = useCallback(
		async ({ parentId, page, limit }) => {
			try {
				const params = {
					page,
					limit,
					processID: parentId,
					includePermissionActions: true,
				};

				if (entityType === "group") {
					params.groupId = entityId;
				} else if (entityType === "user") {
					params.userId = entityId;
				}

				const response = await api.get(API_GET_LIST_FUNCTIONMANAGEMANT, {
					params,
				});
				const features = response?.data?.data?.data || response?.data?.data || [];
				const total = response?.data?.data?.total || features.length;

				updateRoleColumns(features);

				return {
					data: features,
					total: total,
				};
			} catch (error) {
				toast("Lỗi khi tải danh sách chức năng!", "error");
				return { data: [], total: 0 };
			}
		},
		[toast, updateRoleColumns, entityType, entityId]
	);

  const handleToggleUserTasks = useCallback((processKey) => {
    if (!processKey) return;
    setExpandedUserTaskRows((prev) => ({
      ...prev,
      [processKey]: !prev[processKey],
    }));
  }, []);

  const handlePermissionMatrixRowClick = useCallback(async (row, meta = {}) => {
    if (meta.level !== 0) return;
    const processKey = row?.processKey || row?.processID || row?.id || row?._id;
    if (!processKey || !entityId) return;

    setExpandedUserTaskRows((prev) => ({ ...prev, [processKey]: true }));
    if (fetchedUserTaskRowsRef.current.has(processKey)) return;

    fetchedUserTaskRowsRef.current.add(processKey);
    setLoadingUserTaskRows((prev) => ({ ...prev, [processKey]: true }));

    try {
      const params = { processKey };
      if (entityType === "group") {
        params.groupId = entityId;
      } else if (entityType === "user") {
        params.userId = entityId;
      }

      const response = await api.get(`${ROLE_FEATURE}/actions-by-feature`, { params });
      const payload = response?.data?.data || response?.data || {};
      const roles = Array.isArray(payload) ? payload : payload.roles || [];

      setUserTasksByProcess((prev) => ({
        ...prev,
        [processKey]: roles,
      }));
    } catch (error) {
      fetchedUserTaskRowsRef.current.delete(processKey);
      toast("Loi khi tai UserTask cua quy trinh!", "error");
    } finally {
      setLoadingUserTaskRows((prev) => ({ ...prev, [processKey]: false }));
    }
  }, [entityId, entityType, toast]);


	const renderFilterMore = useCallback((context) => {
		return <ProcessFilter context={context} />;
	}, []);

	return (
		<FlexColumnGrow>
			<CustomTableTreeLoadmore
				key={`permission-matrix-table-${entityId}`}
				data={processes}
				fetchData={fetchProcessesLocal}
				fetchChildren={fetchFeaturesForProcess}
				columns={matrixColumns.columns}
				rowKey="processKey"
				renderMode="permissionMatrix"
				mergeColumns
				disableCheckbox
				disableAction
				disableAdd
				disableMore
				disableDetail
				disableEdit
				disableDelete
				disableSearch
				disableSynchronize
				autoHeight={false}
				mainLimits={15}
				childrenLimits={15}
				styleLeftColumnFirst={"-1px"}
				noneTitle
				initialFilters={{ relatedProcesses: "OutGoingDocument" }}
				filterMore={renderFilterMore}
				onPermissionMatrixRowClick={handlePermissionMatrixRowClick}
				permissionMatrixUserTasks={userTasksByProcess}
				permissionMatrixExpandedRows={expandedUserTaskRows}
				permissionMatrixLoadingRows={loadingUserTaskRows}
				onPermissionMatrixToggleTasks={handleToggleUserTasks}
				styledMaxHeight={230}
				stickyTreeParent
			/>
		</FlexColumnGrow>
	);
};

PermissionDetailTab.propTypes = {
	entityType: PropTypes.oneOf(["group", "user"]).isRequired,
	entityId: PropTypes.string.isRequired,
	open: PropTypes.bool,
};

export default React.memo(PermissionDetailTab);
