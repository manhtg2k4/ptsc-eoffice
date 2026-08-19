/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  PanelHeader,
  StyleBoxContainer,
  StyleBoxContainerRight,
  StyleContainer,
  StyledContainer,
  StyledGridContainer,
  // StyledGridItemLeft,
  StyledGridItemRight,
  StyleDialog,
  StyledInputAdornmentInput,
  StyledToggleButton,
  StyledDialogTitle,
  StyledDialogContentMobile,
  StyledTitleText,
} from "@styles/DialogDirective";

import { Search, SwapHoriz } from "@mui/icons-material";
import { Tooltip, useMediaQuery, useTheme } from "@mui/material";

import { useDispatch, useSelector } from "react-redux";
import {
  fetchOrganizationUnits,
  fetchUsers,
} from "@redux/slices/Directive/Directive";
import { removeVietnameseTones } from "@utils/Common/Common";
import { flattenUnits } from "@utils/utils";
import ListUnitsUser from "./ListUnitsUser";
import { useForm } from "react-hook-form";
import { StyledDialogContent } from "@styles/CustomDialog.styles";
import withSharedComponents from "@components/WrapperComponent";
import RenderTableTree from "./RenderTableTree";

/**
 * DialogDirective
 * Props của DialogDirective:
 * @param {boolean} [open=true] - Mở/đóng dialog
 * @param {string} [label="Chuyển xử lý"] - Tiêu đề dialog
 * @param {function} [onClose] - Callback khi đóng dialog
 * @param {function} [onCloseAppBar] - Callback khi đóng app bar (nếu có)
 * @param {function} [onCloseDialog] - Callback khi đóng dialog từ nội dung
 * @param {string} [docId] - ID của văn bản cần chuyển xử lý
 * @param {Array} [selectedFullRows] - Danh sách các row được chọn (nếu docId không có)
 * @param {Object} [dataDetail] - Thông tin chi tiết văn bản
 * @param {function} [onSubmit] - Callback khi submit form
 * @param {boolean}  [isCXL =true] Chuyển đề xuất
 * @param {boolean}  [isDXXL =true] Chuyển đề xuất
 *
 * Internal State:
 * - search, searchKDV: search text
 * - assignments: lưu trữ các phân công (chiDao, phoi, nhanDeBiet)
 * - loadingTransfer: trạng thái loading khi gửi dữ liệu
 *
 * @example
 * <DialogDirective
 *   open={true}
 *   label="Chuyển xử lý"
 *   sharedComponents={sharedComponents}
 *   docId="123456"
 *   onClose={() => setOpen(false)}
 * />
 */

const ProposedSolution = (props) => {
  const {
    open = false,
    delay = 1000,
    label = "Chuyển xử lý",
    sharedComponents,
    onClose = () => {},
    onCloseAppBar = () => {},
    onCloseDialog = () => {},
    docId,
    selectedFullRows,
    // dataDetail,
  } = props;
  const { Input, toast, DatePicker, Button, LoadingDialog } =
    sharedComponents;
  const dispatch = useDispatch();
  const {
    users = [],
    organizationUnits = [],
    loading,
  } = useSelector((state) => state.user);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, delay);
    return () => clearTimeout(handler);
  }, [search, delay]);
  // const [searchKDV, setSearchKDV] = useState("");
  const [searchKDV, ] = useState("");
  const [assignments, setAssignments] = useState({});
   const [loadingTranfer, setLoadingTransfers] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      content: "",
      deadline: "",
    },
  });
  const docIds = docId
    ? [docId]
    : Array.isArray(selectedFullRows)
      ? selectedFullRows.map((row) => row.id)
      : [];

  useEffect(() => {
    // Chỉ fetch data khi dialog mở
    if (open) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchData = async () => {
    try {
      await Promise.all([
        dispatch(fetchUsers()),
        dispatch(fetchOrganizationUnits()),
      ]);
    } catch (error) {
      logger.error("Lỗi khi load dữ liệu:", error);
      toast("Lỗi khi load dữ liệu", "error");
    }
  };

  const onSubmit = useCallback(
    (data) => {
      setLoadingTransfers(true);
      try {
        const chiDao = { users: [], organizationUnits: [] };
        const phoiHop = { users: [], organizationUnits: [] };
        const nhanDeBiet = { users: [], organizationUnits: [] };

        Object.values(assignments || {}).forEach((a) => {
          if (a.chiDao) {
            if (a.unitType === "user") chiDao.users.push(a.id);
            else if (a.unitType === "company")
              chiDao.organizationUnits.push(a.id);
          }
          if (a.phoi) {
            if (a.unitType === "user") phoiHop.users.push(a.id);
            else if (a.unitType === "company")
              phoiHop.organizationUnits.push(a.id);
          }
          if (a.nhanDeBiet) {
            if (a.unitType === "user") nhanDeBiet.users.push(a.id);
            else if (a.unitType === "company")
              nhanDeBiet.organizationUnits.push(a.id);
          }
        });

        const body = {
          docIds,
          assignments: {
            chiDao,
            phoiHop,
            nhanDeBiet,
          },
          content: data.content,
          deadline: data.deadline
            ? new Date(data.deadline).toISOString().split("T")[0]
            : null,
        };

        logger.log("📦 Dữ liệu gửi body:", body);
        reset();
        setAssignments({});
        onCloseDialog();
        onCloseAppBar();
        onClose();
        toast("Chuyển xử lý thành công", "success");
      } catch (error) {
        toast(`${error.message}` || "Có lỗi xảy ra", "error");
      } finally {
        setLoadingTransfers(false);
      }
    },
    [assignments, docIds]
  );

  const buildUnitTree = (units, parentId = null) => {
    const safeUnits = Array.isArray(units) ? units : [];

    return safeUnits
      ?.filter((u) => u.parent === parentId)
      .map((u) => ({
        ...u,
        child: buildUnitTree(safeUnits, u._id), // Truyền safeUnits thay vì units
        types: "company",
      }));
  };
  const dataMergeUserAndUnit = useMemo(() => {
    if (!users || !organizationUnits) return [];
    const organizationTree = buildUnitTree(organizationUnits);
    const searchUnits = removeVietnameseTones(debouncedSearch || "");

    const filterUnits = (units, kdvId) => {
      for (const unit of units) {
        if (unit._id === kdvId || unit.id === kdvId) return [unit];
        if (unit.child && unit.child.length > 0) {
          const found = filterUnits(unit.child, kdvId);
          if (found.length > 0) return found;
        }
      }
      return [];
    };

    const processUnits = (units, users) => {
      const safeUnits = Array.isArray(units) ? units : [];
      return safeUnits
        ?.map((unit) => {
          const matchedUsers = users.filter(
            (user) => user?.parent === (unit?._id ?? unit?.id)
          );

          let userNodes = matchedUsers.map((user) => {
            return {
              ...user,
              types: "user",
            };
          });

          if (debouncedSearch) {
            userNodes = userNodes.filter(
              (user) =>
                user.name &&
                removeVietnameseTones(user.name).includes(searchUnits)
            );
          }
          const childUnits = Array.isArray(unit.child) ? unit.child : [];
          const childProcessed = processUnits(childUnits, users);
          const unitMatched =
            unit.name && removeVietnameseTones(unit.name).includes(searchUnits);
          const hasRelevantData =
            unitMatched || userNodes.length > 0 || childProcessed.length > 0;

          if (debouncedSearch && !hasRelevantData) return null;
          return {
            ...unit,
            child: [...userNodes, ...childProcessed],
          };
        })
        .filter(Boolean);
    };

     const rootUnits = searchKDV
      ? filterUnits(organizationTree, searchKDV._id || searchKDV.id)
      : organizationTree;
    return processUnits(rootUnits, users);
  }, [organizationUnits, users, debouncedSearch, searchKDV]);

  const getAssignmentKey = (unitId) => `${unitId}`;

  const getUnitName = useCallback(
    (unitId) => {
      const unit = flattenUnits(dataMergeUserAndUnit).find(
        (u) => (u._id || u.id) === unitId
      );
      return unit ? unit.name : "";
    },
    [dataMergeUserAndUnit]
  );

  const removeAssignment = (key) => {
    setAssignments((prev) => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  };

  const getAssignmentRole = (assignment) => {
    if (assignment.chiDao) {
      // Phân biệt LĐB (user) và đơn vị khác
      return assignment.unitType === "user" ? "Chỉ đạo" : "Xử lý chính";
    }
    if (assignment.phoi) return "Phối hợp";
    if (assignment.nhanDeBiet) return "Nhận để biết";
    return "";
  };

  const rolePriority = {
    "Chỉ đạo": 1,
    "Xử lý chính": 2,
    "Phối hợp": 3,
    "Nhận để biết": 4,
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "Chỉ đạo":
        return "error";
      case "Xử lý chính":
        return "primary";
      case "Phối hợp":
        return "warning";
      case "Nhận để biết":
        return "info";
      default:
        return "default";
    }
  };

  const handleCheckboxChange = useCallback(
    (unitId, type, unitType, item) => {
      const key = getAssignmentKey(unitId);

      setAssignments((prev) => {
        const prevAssignment = prev?.[key] || {};
        const isCurrentlyChecked = prevAssignment[type] ?? false;

        // Nếu tick lại cùng loại → bỏ chọn hoàn toàn
        if (isCurrentlyChecked) {
          const { [key]: removed, ...rest } = prev;
          return rest;
        }

        // Tạo object mới để cập nhật
        const updatedAssignments = { ...prev };

        // ✅ Xử lý theo từng loại
        if (type === "chiDao") {
          // Xử lý chính: chỉ được chọn 1 item duy nhất
          // Bỏ chiDao của tất cả các item khác
          Object.keys(updatedAssignments).forEach((k) => {
            if (k !== key) {
              const a = updatedAssignments[k];
              if (a.chiDao) {
                // Nếu có phoi hoặc nhanDeBiet thì giữ lại nhưng bỏ chiDao
                if (a.phoi || a.nhanDeBiet) {
                  updatedAssignments[k] = { ...a, chiDao: false };
                } else {
                  // Nếu không có gì khác thì xóa luôn
                  delete updatedAssignments[k];
                }
              }
            }
          });

          // Gán assignment mới: chỉ có chiDao = true, các loại khác = false
          updatedAssignments[key] = {
            id: unitId,
            key,
            name: item?.name ?? prevAssignment.name ?? getUnitName(unitId),
            code: item?.code ?? prevAssignment.code,
            unitType:
              unitType ??
              prevAssignment.unitType ??
              (item?.types === "user" || item?.type === "user"
                ? "user"
                : "unit"),
            chiDao: true,
            phoi: false,
            nhanDeBiet: false,
          };
        } else if (type === "phoi") {
          // Phối hợp: có thể chọn nhiều item
          // Nếu item này đang có chiDao, thì bỏ chiDao của item này
          // (vì mỗi item chỉ có thể có 1 loại)
          updatedAssignments[key] = {
            id: unitId,
            key,
            name: item?.name ?? prevAssignment.name ?? getUnitName(unitId),
            code: item?.code ?? prevAssignment.code,
            unitType:
              unitType ??
              prevAssignment.unitType ??
              (item?.types === "user" || item?.type === "user"
                ? "user"
                : "unit"),
            chiDao: false,
            phoi: true,
            nhanDeBiet: false,
          };
        } else if (type === "nhanDeBiet") {
          // Nhận để biết: có thể chọn nhiều item
          // Nếu item này đang có chiDao, thì bỏ chiDao của item này
          // (vì mỗi item chỉ có thể có 1 loại)
          updatedAssignments[key] = {
            id: unitId,
            key,
            name: item?.name ?? prevAssignment.name ?? getUnitName(unitId),
            code: item?.code ?? prevAssignment.code,
            unitType:
              unitType ??
              prevAssignment.unitType ??
              (item?.types === "user" || item?.type === "user"
                ? "user"
                : "unit"),
            chiDao: false,
            phoi: false,
            nhanDeBiet: true,
          };
        }

        return updatedAssignments;
      });
    },
    [getUnitName]
  );

  const isChecked = useCallback(
    (item, type) => {
      const itemId = item._id || item.id;
      if (!itemId) return false;

      // Tối ưu: Check trực tiếp assignment trước
      const assignment = assignments?.[itemId];
      if (assignment?.[type]) {
        return true;
      }

      // Trường hợp có child - chỉ check khi thực sự cần
      if (item?.child && Array.isArray(item.child) && item.child.length > 0) {
        return item.child.every((child) => {
          const childId = child._id || child.id;
          return assignments?.[childId]?.[type] === true;
        });
      }

      return false;
    },
    [assignments]
  );

  const assignedList = useMemo(() => {
    const entries = Object.entries(assignments || {});

    const list = entries
      .map(([key, assignment]) => {
        const role = getAssignmentRole(assignment);
        return {
          ...assignment,
          key,
          role,
        };
      })
      .filter((item) => item.chiDao || item.phoi || item.nhanDeBiet)
      .sort((a, b) => {
        const roleA = rolePriority[a.role] ?? Number.MAX_SAFE_INTEGER;
        const roleB = rolePriority[b.role] ?? Number.MAX_SAFE_INTEGER;
        if (roleA !== roleB) return roleA - roleB;
        return (a.name || "").localeCompare(b.name || "");
      });

    return list;
  }, [assignments]);

  const handleTogglePanel = () => {
    setShowRightPanel((prev) => !prev);
  };

  const handleCheckAll = (key) => {
    const allUnits = flattenUnits(dataMergeUserAndUnit);

    // Nếu là chiDao (xử lý chính), chỉ chọn item đầu tiên
    if (key === "chiDao") {
      if (allUnits.length === 0) {
        setAssignments({});
        return;
      }
      const firstUnit = allUnits[0];
      const firstId = firstUnit._id || firstUnit.id;
      const firstKey = getAssignmentKey(firstId);

      setAssignments({
        [firstKey]: {
          id: firstId,
          key: firstKey,
          name: firstUnit.name || "",
          code: firstUnit.code || "",
          unitType: firstUnit.type === "user" ? "user" : "unit",
          chiDao: true,
          phoi: false,
          nhanDeBiet: false,
        },
      });
      return;
    }

    // Phối hợp và Nhận để biết: có thể chọn nhiều item
    const allAssignments = allUnits.map((unit) => [
      unit._id || unit.id,
      {
        id: unit._id || unit.id || "",
        key: getAssignmentKey(unit._id || unit.id),
        name: unit.name || "",
        code: unit.code || "",
        unitType: unit.type === "user" ? "user" : "unit",
        chiDao: false,
        phoi: false,
        nhanDeBiet: false,
      },
    ]);

    // Đảm bảo mỗi item chỉ có 1 loại được chọn
    const result = allAssignments.map(([id, assignment]) => [
      id,
      {
        ...assignment,
        // Chỉ set loại được chọn = true, các loại khác = false
        chiDao: key === "chiDao",
        phoi: key === "phoi",
        nhanDeBiet: key === "nhanDeBiet",
      },
    ]);

    setAssignments(Object.fromEntries(result));
  };

  const handleCancelCheckAll = useCallback((type) => {
    setAssignments((prev) => {
      if (!type) {
        return {};
      }

      // Chỉ xóa các assignment có type được chỉ định, giữ lại các assignment khác
      const updatedAssignments = {};
      Object.entries(prev || {}).forEach(([key, assignment]) => {
        // Nếu assignment có type này, kiểm tra xem có type khác không
        if (assignment[type]) {
          // Tạo assignment mới không có type này
          const newAssignment = {
            ...assignment,
            [type]: false,
          };

          // Chỉ giữ lại nếu còn ít nhất một type khác (chiDao, phoi, hoặc nhanDeBiet)
          if (
            newAssignment.chiDao ||
            (type !== "phoi" && newAssignment.phoi) ||
            (type !== "nhanDeBiet" && newAssignment.nhanDeBiet)
          ) {
            updatedAssignments[key] = newAssignment;
          }
          // Nếu không còn type nào thì không thêm vào (xóa assignment)
        } else {
          // Giữ nguyên assignment không có type này
          updatedAssignments[key] = assignment;
        }
      });

      return updatedAssignments;
    });
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

 

  return (
    <>
      <StyleDialog open={open} onClose={onClose} fullWidth>
        <StyleContainer>
          <StyleBoxContainer
            $isMobileOrTablet={isMobileOrTablet}
            $showPanel={!showRightPanel}
          >
            <StyledDialogTitle>
              <StyledTitleText component="span">{label}</StyledTitleText>
              {isMobileOrTablet && (
                <Tooltip
                  title={isMobileOrTablet && "Danh sách đơn vị/cá nhân đã chọn"}
                >
                  <StyledToggleButton onClick={handleTogglePanel} size="small">
                    <SwapHoriz />
                  </StyledToggleButton>
                </Tooltip>
              )}
            </StyledDialogTitle>
            <StyledDialogContentMobile>
              <StyledContainer>
                <PanelHeader>
                  <StyledGridContainer container spacing={2}>
                    {/* <StyledGridItemLeft item>
                      <Autocomplete
                        maxLength={1000}
                        placeholder="Tìm kiếm"
                        label="Khối đơn vị"
                        // value={searchKDV}
                        //onChange={(val) => setSearchKDV(val)}
                        // options={unitOptions}
                        // getOptionLabel={(o) => o.name || o.title || ""}
                        size="small"
                      />
                    </StyledGridItemLeft> */}

                    <StyledGridItemRight item>
                      <Input
                        size="small"
                        label="Tìm kiếm đơn vị, cá nhân..."
                        placeholder="Tìm kiếm đơn vị, cá nhân..."
                        onChange={handleSearch}
                        value={search}
                        InputProps={{
                          startAdornment: (
                            <StyledInputAdornmentInput>
                              <Search />
                            </StyledInputAdornmentInput>
                          ),
                        }}
                      />
                    </StyledGridItemRight>
                  </StyledGridContainer>
                  <RenderTableTree
                    isMobileOrTablet={isMobileOrTablet}
                    data={dataMergeUserAndUnit}
                    //   handleToggleExpand={handleToggleExpand}
                    isChecked={isChecked}
                    handleCheckboxChange={handleCheckboxChange}
                    onCheckAll={handleCheckAll}
                    onCancelCheckAll={handleCancelCheckAll}
                  />
                </PanelHeader>
              </StyledContainer>
            </StyledDialogContentMobile>
          </StyleBoxContainer>
          <StyleBoxContainerRight
            $isMobileOrTablet={isMobileOrTablet}
            $showPanel={showRightPanel}
          >
            <StyledDialogTitle>
              <StyledTitleText component="span">
                Danh sách đơn vị/cá nhân được phân xử lý
              </StyledTitleText>
              {isMobileOrTablet && (
                <Tooltip
                  title={isMobileOrTablet && `Danh sách chọn đơn vị/cá nhân `}
                >
                  <StyledToggleButton onClick={handleTogglePanel} size="small">
                    <SwapHoriz />
                    {/* Danh sách đối tượng */}
                  </StyledToggleButton>
                </Tooltip>
              )}
            </StyledDialogTitle>
            <ListUnitsUser
              assignedList={assignedList}
              removeAssignment={removeAssignment}
              Input={Input}
              DatePicker={DatePicker}
              Button={Button}
              onCloseDialog={onCloseDialog}
              getRoleColor={getRoleColor}
              handleSubmit={handleSubmit(onSubmit)}
              control={control}
            />
          </StyleBoxContainerRight>
        </StyleContainer>
      </StyleDialog>

      <LoadingDialog open={loading || loadingTranfer}>
        <StyledDialogContent>
          Đang tải dữ liệu, vui lòng chờ trong giây lát...
        </StyledDialogContent>
      </LoadingDialog>
    </>
  );
};

ProposedSolution.propTypes = {
  sharedComponents: PropTypes.object,
  open: PropTypes.bool,
  label: PropTypes.string,
  onClose: PropTypes.func,
  onCloseAppBar: PropTypes.func,
  onCloseDialog: PropTypes.func,
  docId: PropTypes.string,
  selectedFullRows: PropTypes.array,
  dataDetail: PropTypes.object,
  onSubmit: PropTypes.func,
  isCXL: PropTypes.bool,
  isDXXL: PropTypes.bool,
};

ProposedSolution.displayName = "ProposedSolution";

export default memo(withSharedComponents(ProposedSolution));
