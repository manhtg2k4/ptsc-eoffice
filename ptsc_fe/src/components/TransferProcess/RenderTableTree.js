/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { TableBody } from "@mui/material";
import { Controller } from "react-hook-form";
import { styled } from "@mui/material/styles";

import {
  StyledCheckbox,
  StyledCheckboxs,
  StyledClickableBox,
  StyledExpandButton,
  StyledHeaderBox,
  StyledNameText,
  // StyledNameTextHeader,
  StyledRow,
  StyledRowBox,
  StyledTable,
  StyledTableCellLarge,
  StyledTableCellLeft1,
  StyledTableCellMedium,
  StyledTableContainer,
  StyledTableHead,
  StyledTableRow,
} from "@styles/DialogDirective";
import {
 
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";

const CompactTableCellMedium = styled(StyledTableCellMedium)({
  width: "100px",
  minWidth: "100px",
  maxWidth: "100px",
  padding: "4px 2px !important",
  "& .MuiTextField-root, & .MuiFormControl-root, & .MuiInputBase-root": {
    width: "100%",
    minWidth: 0,
  },
  "& .MuiInputBase-root": {
    fontSize: "11px",
    paddingRight: "6px !important", 
    paddingLeft: "4px !important",
    display: "flex !important",
    alignItems: "center !important",
    justifyContent: "space-between !important",
    position: "relative",
    boxSizing: "border-box",
  },
  "& .MuiInputBase-input": {
    padding: "6px 2px !important",
    textAlign: "center",
    fontSize: "11px",
    width: "calc(100% - 24px) !important",
    minWidth: 0,
    boxSizing: "border-box",
  },
  "& .MuiInputAdornment-root": {
    marginLeft: "0 !important",
    marginRight: "0 !important",
    display: "flex !important",
    alignItems: "center !important",
    justifyContent: "center !important",
    height: "auto !important",
    maxHeight: "none !important",
  },
  "& .MuiIconButton-root": {
    padding: "2px !important",
    margin: "0 !important",
    display: "flex !important",
    alignItems: "center !important",
    justifyContent: "center !important",
    "& svg": {
      fontSize: "16px !important",
    }
  }
});

const StyledDatePickerWrapper = styled("div")({
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  "& .MuiTextField-root, & .MuiFormControl-root, & .MuiInputBase-root": {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  "& .MuiInputBase-root": {
    fontSize: "11px",
    height: "28px", 
    paddingRight: "6px !important", 
    paddingLeft: "4px !important",
    display: "flex !important",
    alignItems: "center !important",
    justifyContent: "space-between !important",
    position: "relative",
    boxSizing: "border-box",
  },
  "& .MuiInputBase-input": {
    padding: "4px 2px !important",
    textAlign: "center",
    fontSize: "11px",
    width: "calc(100% - 24px) !important",
    minWidth: 0,
    boxSizing: "border-box",
  },
  "& .MuiInputAdornment-root": {
    marginLeft: "0 !important",
    marginRight: "0 !important",
    display: "flex !important",
    alignItems: "center !important",
    justifyContent: "center !important",
    height: "auto !important",
    maxHeight: "none !important",
  },
  "& .MuiIconButton-root": {
    padding: "2px !important",
    margin: "0 !important",
    display: "flex !important",
    alignItems: "center !important",
    justifyContent: "center !important",
    "& svg": {
      fontSize: "16px !important",
    }
  }
});

const ConstrainedTableCellLeft = styled(StyledTableCellLeft1)({
  minWidth: 0,
  overflow: "hidden",
});

const FixedTable = styled(StyledTable)({
  tableLayout: "fixed",
  width: "100%",
});

const TreeNameWrapper = styled(StyledRowBox)({
  minWidth: 0,
  paddingRight: "8px",
  display: "flex",
  alignItems: "center",
});

const TreeNameClickable = styled(StyledClickableBox, {
  shouldForwardProp: (prop) => prop !== "hasChild" && prop !== "isUser",
})(({ hasChild }) => ({
  minWidth: 0,
  flex: 1,
  display: "flex",
  alignItems: "center",
  overflow: "hidden",
  cursor: hasChild ? "pointer" : "default",
}));

const TreeNameText = styled(StyledNameText)({
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  display: "inline-block",
  maxWidth: "100%",
});

const hasAssignmentChangedForItem = (itemId, prevAssignments, nextAssignments) => {
  const prev = prevAssignments?.[itemId];
  const next = nextAssignments?.[itemId];
  return (
    (prev?.chiDao === true) !== (next?.chiDao === true) ||
    (prev?.phoi === true) !== (next?.phoi === true) ||
    (prev?.nhanDeBiet === true) !== (next?.nhanDeBiet === true)
  );
};

const hasAnyDescendantAssignmentChanged = (item, prevAssignments, nextAssignments, prevExpanded, nextExpanded) => {
  if (!item) return false;
  const itemId = item._id || item.id;
  if (hasAssignmentChangedForItem(itemId, prevAssignments, nextAssignments)) {
    return true;
  }
  if (!prevExpanded?.[itemId] && !nextExpanded?.[itemId]) {
    return false;
  }
  if (Array.isArray(item.child)) {
    for (let i = 0; i < item.child.length; i++) {
      if (hasAnyDescendantAssignmentChanged(item.child[i], prevAssignments, nextAssignments, prevExpanded, nextExpanded)) {
        return true;
      }
    }
  }
  return false;
};

const hasAnyDescendantExpandChanged = (item, prevExpanded, nextExpanded) => {
  if (!item) return false;
  const itemId = item._id || item.id;
  if ((prevExpanded?.[itemId] ?? false) !== (nextExpanded?.[itemId] ?? false)) {
    return true;
  }
  if (!prevExpanded?.[itemId] && !nextExpanded?.[itemId]) {
    return false;
  }
  if (Array.isArray(item.child)) {
    for (let i = 0; i < item.child.length; i++) {
      if (hasAnyDescendantExpandChanged(item.child[i], prevExpanded, nextExpanded)) {
        return true;
      }
    }
  }
  return false;
};

const Row = React.memo(
  ({
    item,
    level,
    expandedUnits,
    onToggleExpand,
    assignments,
    assignedReceiverRolesMap,
    handleCheckboxChange,
    onCheckAllChild,
    isNhanDeBiet,
    canSetViewer,
    canSetSupporter,
    canSetProcessor,
    disableProcessorColumn,
    canTransferRoom,
    isParentUnitSelected, // (unitId) => boolean
    isAnyChildUserSelected, // (unit) => boolean
    isDisabledInteraction,
    canConfirmPropose,
    lockedPhanCongIds,
    initialAssignments,
    hasUserPhanCong,
    control,
    DatePicker,
    errors,
    setDeadlineError,
    alreadySentUserIds,
    onlyUsers,
    disableBan = false,
    ancestorSelected = false,
    disabledDescendantIds,
  }) => {
    const itemId = item?._id ?? item?.id;
    const hasChild = Array.isArray(item?.child) && item.child.length > 0;
    const expanded = expandedUnits[itemId];

    const handleToggleExpand = useCallback(() => {
      onToggleExpand(itemId);
    }, [itemId, onToggleExpand]);

    // Memo hóa checked states
    const checkedStates = useMemo(() => {
      const assignment = assignments?.[itemId];
      const isReceiverType = item.types === "user" || item.types === "company" || item.types === "unit";
      const assignedRole = isReceiverType ? assignedReceiverRolesMap?.get(String(itemId)) : undefined;
      return {
        chiDao: (assignedRole && (assignedRole === "xulychinh" || assignedRole === "xu_ly_chinh" || assignedRole === "processor" || assignedRole === "chutri" || assignedRole === "chu_tri")) || assignment?.chiDao === true,
        phoi: (assignedRole && (assignedRole === "phoihop" || assignedRole === "phoi_hop" || assignedRole === "supporter" || assignedRole === "phohop" || assignedRole === "pho_hop")) || assignment?.phoi === true,
        nhanDeBiet: (assignedRole && (assignedRole === "nhandebiet" || assignedRole === "nhan_de_biet" || assignedRole === "viewer")) || assignment?.nhanDeBiet === true,
      };
    }, [itemId, assignments?.[itemId], item.types, assignedReceiverRolesMap]);

    const isAnyChecked = useMemo(() => {
      return checkedStates.chiDao || checkedStates.phoi || checkedStates.nhanDeBiet;
    }, [checkedStates]);

    const isItemSelected = checkedStates.chiDao || checkedStates.phoi || checkedStates.nhanDeBiet;
    const childAncestorSelected = ancestorSelected || (item.types !== 'user' && isItemSelected);

    // Logic để disable checkbox
    const isDisabled = useMemo(() => {
      if (disableBan && (item?.type === "Ban" || item?.type === "BanLD" || item?.type === "To")) return true;
      // if (item?.type === "Ban" || item?.type === "To") return true;
      if (isDisabledInteraction) return true;
      if (ancestorSelected) return true;
      // Disable nếu user này bị khóa từ userPhanCong (người đăng nhập là XU_LY_CHINH đã được phân công)
      if (lockedPhanCongIds?.has(itemId)) return true;
      // Disable nếu user này đã được gửi (đã nhận văn bản)
      if (alreadySentUserIds?.has(itemId)) return true;
      if ((item.types === "user" || item.types === "company" || item.types === "unit") && assignedReceiverRolesMap?.has(String(itemId))) return true;
      // Disable nếu đơn vị/cá nhân này đã được tự động chọn (auto-fill) VÀ có userPhanCong
      if (hasUserPhanCong && initialAssignments?.[itemId]) return true;

      // Kiểm tra xem bất kỳ đơn vị cha nào của đơn vị/cá nhân này đã được chọn chưa
      if (disabledDescendantIds && disabledDescendantIds.has(String(itemId))) return true;

      if (!canTransferRoom) return false;

      if (item.types === 'user') {
        // Disable user nếu phòng ban cha trực tiếp đã được chọn ở BẤT KỲ cột nào
        return isParentUnitSelected(item.parent);
      }
      return false;
    }, [canTransferRoom, item, isParentUnitSelected, isDisabledInteraction, initialAssignments, lockedPhanCongIds, itemId, hasUserPhanCong, alreadySentUserIds, disableBan, ancestorSelected, assignedReceiverRolesMap, disabledDescendantIds]);

		const checkboxHandlers = useMemo(() => {
      const handleSingleCheck = (type) => (event) => {
        event.stopPropagation();
        if (isDisabled) return;
        // Bỏ việc gọi onCheckAllChild tự động để tránh check hàng loạt con
        handleCheckboxChange(itemId, type, item.types, item, true);
      };
      return {
        chiDao: handleSingleCheck("chiDao"),
        phoi: handleSingleCheck("phoi"),
        nhanDeBiet: handleSingleCheck("nhanDeBiet"),
      };
    }, [itemId, item, handleCheckboxChange, hasChild, onCheckAllChild, isNhanDeBiet, isDisabled]);

    const childItems = useMemo(() => {
      if (!hasChild || !expanded) return null;
      return item.child.map((subItem) => (
        <Row
          key={subItem._id || subItem.id}
          item={subItem}
          level={level + 1}
          expandedUnits={expandedUnits}
          onToggleExpand={onToggleExpand}
          assignments={assignments}
          assignedReceiverRolesMap={assignedReceiverRolesMap}
          handleCheckboxChange={handleCheckboxChange}
          onCheckAllChild={onCheckAllChild}
          isNhanDeBiet={isNhanDeBiet}
          canSetViewer={canSetViewer}
          canSetSupporter={canSetSupporter}
          canSetProcessor={canSetProcessor}
          disableProcessorColumn={disableProcessorColumn}
          canTransferRoom={canTransferRoom}
          isParentUnitSelected={isParentUnitSelected}
          isAnyChildUserSelected={isAnyChildUserSelected}
          isDisabledInteraction={isDisabledInteraction}
          canConfirmPropose={canConfirmPropose}
          lockedPhanCongIds={lockedPhanCongIds}
          initialAssignments={initialAssignments}
          hasUserPhanCong={hasUserPhanCong}
          control={control}
          DatePicker={DatePicker}
          errors={errors}
          setDeadlineError={setDeadlineError}
          alreadySentUserIds={alreadySentUserIds}
          onlyUsers={onlyUsers}
          disableBan={disableBan}
          ancestorSelected={childAncestorSelected}
          disabledDescendantIds={disabledDescendantIds}
        />
      ));
    }, [
      hasChild,
      expanded,
      item.child?.length,
      level,
      expandedUnits,
      onToggleExpand,
      assignments,
      assignedReceiverRolesMap,
      handleCheckboxChange,
      onCheckAllChild,
      isNhanDeBiet,
      canSetViewer,
      canSetSupporter,
      canSetProcessor,
      disableProcessorColumn,
      canTransferRoom,
      isParentUnitSelected,
      isAnyChildUserSelected,
      isDisabledInteraction,
      canConfirmPropose,
      lockedPhanCongIds,
      initialAssignments,
      hasUserPhanCong,
      control,
      DatePicker,
      errors,
      setDeadlineError,
      alreadySentUserIds,
      disableBan,
      childAncestorSelected,
    ]);

    const stopPropagation = useCallback((e) => {
      e.stopPropagation();
    }, []);

    const isLeaf = onlyUsers
      ? item.types === "user"
      : (item.types === "user" || ((level !== 0 || item.isPhanCong) && item.types !== "unit" && !(item.types === "company" && canTransferRoom === false)));

    return (
      <>
        <StyledRow hover $isSelected={isAnyChecked}>
          <ConstrainedTableCellLeft>
            <div style={{ display: "flex", flexDirection: "column", width: "100%", minWidth: 0, overflow: "hidden" }}>
              <TreeNameWrapper level={level}>
                <TreeNameClickable
                  hasChild={hasChild}
                  isUser={item.type === "user"}
                  onClick={hasChild ? handleToggleExpand : undefined}
                >
                  <TreeNameText variant="body2" isColor={item.types === "user"} isBold={isAnyChecked}>
                    {item?.name}
                    {item?.position && ` - ${item.position}`}
                  </TreeNameText>
                </TreeNameClickable>

                {hasChild && (
                  <StyledExpandButton size="small" onClick={handleToggleExpand}>
                    {expanded ? <ExpandLess /> : <ExpandMore />}
                  </StyledExpandButton>
                )}
              </TreeNameWrapper>

              {/* Hạn xử lý hiển thị trực tiếp bên dưới tên của đơn vị/cá nhân khi được tích chọn */}
              {isAnyChecked && (
                <div
                  onClick={stopPropagation}
                  style={{
                    marginTop: "6px",
                    marginLeft: `calc(${(level || 0) * 16}px + 4px)`,
                    width: `calc(100% - calc(${(level || 0) * 16}px + 12px))`,
                    maxWidth: "180px",
                  }}
                >
                  <StyledDatePickerWrapper>
                    {checkedStates.chiDao && (
                      <Controller
                        name={`deadlineChiDao_${item.types === "user" ? "user" : "company"}_${itemId}`}
                        control={control}
                        render={({ field }) => (
                          <DatePicker
														enableTime
                            futureOnly
                            {...field}
                            error={!!errors?.[`deadlineChiDao_${item.types === "user" ? "user" : "company"}_${itemId}`]}
                            helperText={errors?.[`deadlineChiDao_${item.types === "user" ? "user" : "company"}_${itemId}`]?.message}
                            onError={setDeadlineError}
                            disabled={isDisabledInteraction || disableProcessorColumn}
                          />
                        )}
                      />
                    )}

                    {checkedStates.phoi && (
                      <Controller
                        name={`deadlinePhoi_${item.types === "user" ? "user" : "company"}_${itemId}`}
                        control={control}
                        render={({ field }) => (
                          <DatePicker
														enableTime
                            futureOnly
                            {...field}
                            error={!!errors?.[`deadlinePhoi_${item.types === "user" ? "user" : "company"}_${itemId}`]}
                            helperText={errors?.[`deadlinePhoi_${item.types === "user" ? "user" : "company"}_${itemId}`]?.message}
                            onError={setDeadlineError}
                            disabled={isDisabledInteraction}
                          />
                        )}
                      />
                    )}

                    {checkedStates.nhanDeBiet && (
                      <Controller
                        name={`deadlineNhanDeBiet_${item.types === "user" ? "user" : "company"}_${itemId}`}
                        control={control}
                        render={({ field }) => (
                          <DatePicker
														enableTime
                            futureOnly
                            {...field}
                            error={!!errors?.[`deadlineNhanDeBiet_${item.types === "user" ? "user" : "company"}_${itemId}`]}
                            helperText={errors?.[`deadlineNhanDeBiet_${item.types === "user" ? "user" : "company"}_${itemId}`]?.message}
                            onError={setDeadlineError}
                            disabled={isDisabledInteraction}
                          />
                        )}
                      />
                    )}
                  </StyledDatePickerWrapper>
                </div>
              )}
            </div>
          </ConstrainedTableCellLeft>

          {(canSetProcessor && !isNhanDeBiet) && (
            <CompactTableCellMedium align="center">
              {(isLeaf || (hasChild && onCheckAllChild && isNhanDeBiet)) && (
                <StyledCheckbox
                  checked={checkedStates.chiDao}
                  disabled={isDisabled || disableProcessorColumn || item?.isNhomXuLyKoQuaLanhDao}
                  onChange={checkboxHandlers.chiDao}
                  onClick={stopPropagation}
                />
              )}
            </CompactTableCellMedium>
          )}

          {canSetSupporter && (
            <CompactTableCellMedium align="center">
              {isLeaf && (
                <StyledCheckbox
                  checked={checkedStates.phoi}
                  disabled={isDisabled}
                  onChange={checkboxHandlers.phoi}
                  onClick={stopPropagation}
                />
              )}
            </CompactTableCellMedium>
          )}

          {(canSetViewer || isNhanDeBiet)  && (
            <CompactTableCellMedium align="center">
              {(isLeaf || (hasChild && onCheckAllChild)) && (
                <StyledCheckbox
                  checked={checkedStates.nhanDeBiet}
                  disabled={isDisabled}
                  onChange={checkboxHandlers.nhanDeBiet}
                  onClick={stopPropagation}
                />
              )}
            </CompactTableCellMedium>
          )}
        </StyledRow>

        {childItems}
      </>
    );
  },
  (prevProps, nextProps) => {
    if (
      prevProps.item !== nextProps.item ||
      prevProps.level !== nextProps.level ||
      prevProps.canSetViewer !== nextProps.canSetViewer ||
      prevProps.canSetSupporter !== nextProps.canSetSupporter ||
      prevProps.canSetProcessor !== nextProps.canSetProcessor ||
      prevProps.disableProcessorColumn !== nextProps.disableProcessorColumn
    ) {
      return false;
    }

    if (hasAnyDescendantExpandChanged(prevProps.item, prevProps.expandedUnits, nextProps.expandedUnits)) {
      return false;
    }

    if (prevProps.assignedReceiverRolesMap !== nextProps.assignedReceiverRolesMap) {
      return false;
    }

    if (hasAnyDescendantAssignmentChanged(prevProps.item, prevProps.assignments, nextProps.assignments, prevProps.expandedUnits, nextProps.expandedUnits)) {
      return false;
    }

    const prevParentSelected = prevProps.item.types === 'user' ? prevProps.isParentUnitSelected(prevProps.item.parent) : false;
    const nextParentSelected = nextProps.item.types === 'user' ? nextProps.isParentUnitSelected(nextProps.item.parent) : false;
    if (prevParentSelected !== nextParentSelected) return false;

    const prevChildUserSelected = prevProps.item.types === 'company' ? prevProps.isAnyChildUserSelected(prevProps.item) : false;
    const nextChildUserSelected = nextProps.item.types === 'company' ? nextProps.isAnyChildUserSelected(nextProps.item) : false;
    if (prevChildUserSelected !== nextChildUserSelected) return false;

    if (
      prevProps.isDisabledInteraction === nextProps.isDisabledInteraction &&
      prevProps.canConfirmPropose === nextProps.canConfirmPropose &&
      prevProps.isNhanDeBiet === nextProps.isNhanDeBiet &&
      prevProps.canTransferRoom === nextProps.canTransferRoom &&
      prevProps.handleCheckboxChange === nextProps.handleCheckboxChange &&
      prevProps.onToggleExpand === nextProps.onToggleExpand &&
      prevProps.onCheckAllChild === nextProps.onCheckAllChild &&
      prevProps.lockedPhanCongIds === nextProps.lockedPhanCongIds &&
      prevProps.initialAssignments === nextProps.initialAssignments &&
      prevProps.hasUserPhanCong === nextProps.hasUserPhanCong &&
      prevProps.control === nextProps.control &&
      prevProps.DatePicker === nextProps.DatePicker &&
      prevProps.errors === nextProps.errors &&
      prevProps.setDeadlineError === nextProps.setDeadlineError &&
      prevProps.alreadySentUserIds === nextProps.alreadySentUserIds &&
      prevProps.disabledDescendantIds === nextProps.disabledDescendantIds
    ) {
      if (prevProps.item?.child?.length !== nextProps.item?.child?.length) {
        return false;
      }
      return true;
    }

    return false;
  }
);

Row.displayName = "Row";

const RenderTableTree = ({
  data,
  assignments,
  assignedReceiverRolesMap,
  handleCheckboxChange,
  onCheckAll,
  onCancelCheckAll,
  isMobileOrTablet,
  canSetSupporter,
  canSetProcessor,
  disableProcessorColumn,
  canSetViewer,
  canTransferOption,
  canTransferRooms,
  chiDao,
  actionsBySub,
  actionCode,
  targetRole,
  onCheckAllChild,
  isNhanDeBiet,
  control,
  DatePicker,
  errors,
  setDeadlineError,
  isDisabledInteraction,
  canConfirmPropose,
  lockedPhanCongIds,
  initialAssignments,
  hasUserPhanCong,
  alreadySentUserIds,
  // maxDepthLevel,
  onlyUsers,
  isExpandLess,
  debouncedSearch,
  defaultCollapseAll,
  defaultExpandAll,
  disableBan = false,
  disabledDescendantIds,
}) => {



  const prevIsExpandLessRef = useRef(isExpandLess);
  const preSearchExpandedRef = useRef(null);
  const [expandedUnits, setExpandedUnits] = useState({});
  const [checkAll, setCheckAll] = useState("");

  useEffect(() => {
    if (!assignments || Object.keys(assignments).length === 0) {
      setCheckAll("");
    }
  }, [assignments]);

  // Auto expand logic:
  // - If there are pre-checked/selected items in assignments, expand paths to them.
  // - If no items are selected, expand only 1 level (level 0).
  useEffect(() => {
    if (!data || data.length === 0) {
      setExpandedUnits({});
      return;
    }

    const isExpandLessChanged = prevIsExpandLessRef.current !== isExpandLess;
    prevIsExpandLessRef.current = isExpandLess;

    const computePhongAncestors = (items) => {
      const expanded = {};
      const traverse = (nodes) => {
        let hasPhongDescendant = false;
        nodes.forEach((node) => {
          const nodeId = node?._id ?? node?.id;
          let nodeHasPhongDescendant = false;

          if (node.type === "Phong") {
            nodeHasPhongDescendant = true;
          }

          if (Array.isArray(node.child) && node.child.length > 0) {
            const childHasPhong = traverse(node.child);
            if (childHasPhong) {
              nodeHasPhongDescendant = true;
            }
          }

          if (nodeHasPhongDescendant && node.type !== "Phong") {
            expanded[nodeId] = true;
          }

          if (nodeHasPhongDescendant) {
            hasPhongDescendant = true;
          }
        });
        return hasPhongDescendant;
      };
      traverse(items);
      return expanded;
    };

    const computeOnlyUsersExpanded = (items) => {
      const expanded = {};
      const traverse = (nodes) => {
        nodes.forEach((node) => {
          const nodeId = node?._id ?? node?.id;
          const hasUser = Array.isArray(node.child) && node.child.some((c) => c.types === "user");
          if (hasUser) {
            expanded[nodeId] = true;
          }
          if (Array.isArray(node.child) && node.child.length > 0) {
            traverse(node.child);
          }
        });
      };
      traverse(items);
      return expanded;
    };

    setExpandedUnits((prev) => {
      const selectedIds = new Set(
        Object.values(assignments || {})
          .filter((a) => a && (a.chiDao || a.phoi || a.nhanDeBiet))
          .map((a) => a.id || a._id)
          .filter(Boolean)
      );

      const newExpanded = {};

      if (debouncedSearch && debouncedSearch.trim() !== "") {
        // Tự động expand tất cả khi có tìm kiếm
        if (preSearchExpandedRef.current === null) {
          preSearchExpandedRef.current = prev;
        }

        // Không tự động expand tất cả các cấp khi tìm kiếm
        // để các đơn vị cha có người dùng bên trong không bị xổ ra
        //  const expandAll = (items) => {
        //   items.forEach((item) => {
        //     const itemId = item?._id ?? item?.id;
        //     if (Array.isArray(item.child) && item.child.length > 0) {
        //       newExpanded[itemId] = true;
        //       expandAll(item.child);
        //     }
        //   });
        Object.assign(newExpanded, prev);
      } else {
        // Khi không có tìm kiếm
        let baseExpanded = {};

        if (onlyUsers) {
          // Trường hợp 1: Chế độ chỉ hiển thị cá nhân, quay về đúng trạng thái mặc định của onlyUsers
          baseExpanded = computeOnlyUsersExpanded(data);
          preSearchExpandedRef.current = null;
        } else if (preSearchExpandedRef.current !== null) {
          // Trường hợp 2: Có snapshot, khôi phục lại trạng thái expand/collapse gần nhất trước khi tìm kiếm
          baseExpanded = preSearchExpandedRef.current;
          preSearchExpandedRef.current = null;
        } else {
          // Logic mặc định nếu không có tìm kiếm và không có snapshot
          const isFirstRender = Object.keys(prev).length === 0;
          if (isFirstRender || isExpandLessChanged) {
            if (defaultExpandAll) {
              const expandAll = (items) => {
                items.forEach((item) => {
                  const itemId = item?._id ?? item?.id;
                  if (Array.isArray(item.child) && item.child.length > 0) {
                    baseExpanded[itemId] = true;
                    expandAll(item.child);
                  }
                });
              };
              expandAll(data);
            } else if (defaultCollapseAll) {
              baseExpanded = {};
            } else if (isExpandLess) {
              baseExpanded = {};
              if (data && data.length > 0) {
                // Mở rộng tất cả các node gốc mặc định
                data.forEach((rootNode) => {
                  const rootId = rootNode?._id ?? rootNode?.id;
                  baseExpanded[rootId] = true;
                });
                // Tiếp tục thực hiện logic tự động expand đến đơn vị "Phong"
                const phongAncestors = computePhongAncestors(data);
                Object.assign(baseExpanded, phongAncestors);
              }
            } else {
              baseExpanded = computePhongAncestors(data);
            }
          } else {
            baseExpanded = { ...prev };
          }
        }

        Object.assign(newExpanded, baseExpanded);

        if (selectedIds.size > 0 && !checkAll) {
          const findPaths = (items) => {
            let hasSelectedChild = false;
            for (const item of items) {
              const itemId = item?._id ?? item?.id;

              if (selectedIds.has(itemId)) {
                hasSelectedChild = true;
              }

              if (Array.isArray(item.child) && item.child.length > 0) {
                const childHasSelected = findPaths(item.child);
                if (childHasSelected) {
                  newExpanded[itemId] = true;
                  hasSelectedChild = true;
                }
              }
            }
            return hasSelectedChild;
          };
          findPaths(data);
        }
      }

      return newExpanded;
    });
  }, [data, assignments, debouncedSearch, isExpandLess, onlyUsers]);

  const handleToggleExpand = useCallback((id) => {
    setExpandedUnits((prev) => {
      const isExpanding = !prev[id];
      const nextState = { ...prev, [id]: isExpanding };

      if (isExpanding && isExpandLess && data) {
        // Tìm node tương ứng trong cây data
        const findNode = (nodes) => {
          for (const node of nodes) {
            const nodeId = node?._id ?? node?.id;
            if (nodeId === id) return node;
            if (Array.isArray(node.child) && node.child.length > 0) {
              const found = findNode(node.child);
              if (found) return found;
            }
          }
          return null;
        };

        const targetNode = findNode(data);
        if (targetNode && Array.isArray(targetNode.child) && targetNode.child.length > 0) {
          // Duyệt tìm các node tổ tiên của "Phong" dưới targetNode để mở rộng chúng
          const traverse = (nodes) => {
            let hasPhongDescendant = false;
            nodes.forEach((node) => {
              const nodeId = node?._id ?? node?.id;
              let nodeHasPhongDescendant = false;

              if (node.type === "Phong") {
                nodeHasPhongDescendant = true;
              }

              if (Array.isArray(node.child) && node.child.length > 0) {
                const childHasPhong = traverse(node.child);
                if (childHasPhong) {
                  nodeHasPhongDescendant = true;
                }
              }

              if (nodeHasPhongDescendant && node.type !== "Phong") {
                nextState[nodeId] = true;
              }

              if (nodeHasPhongDescendant) {
                hasPhongDescendant = true;
              }
            });
            return hasPhongDescendant;
          };
          traverse(targetNode.child);
        }
      }

      return nextState;
    });
  }, [data, isExpandLess]);

  const handleCheckAllChange = useCallback(
    (type) => (e) => {
      if (e.target.checked) {
        onCheckAll(type);
        setCheckAll(type);
      } else {
        onCancelCheckAll(type);
        setCheckAll("");
      }
    },
    [onCheckAll, onCancelCheckAll]
  );

  // Hàm kiểm tra xem một unit (phòng ban) có được chọn không
  const isUnitSelected = useCallback((unitId) => {
    if (!unitId) return false;
    // Kiểm tra trực tiếp trong assignments thay vì dùng isChecked
    // để tránh logic tự động check cha
    const assignment = assignments?.[unitId];
    const isAssigned = assignedReceiverRolesMap?.has(String(unitId));
    return assignment?.chiDao || assignment?.phoi || assignment?.nhanDeBiet || isAssigned;
  }, [assignments, assignedReceiverRolesMap]);

  // Hàm kiểm tra xem có bất kỳ user con TRỰC TIẾP nào của một unit được chọn không
  const isAnyChildUserSelected = useCallback((unit) => {
    if (!unit?.child) return false;
    // Chỉ kiểm tra các user con TRỰC TIẾP (không kiểm tra đệ quy)
    return unit.child.some(child => {
      if (child.types === 'user') {
        const childId = child._id || child.id;
        const assignment = assignments?.[childId];
        const isAssigned = assignedReceiverRolesMap?.has(String(childId));
        // User được coi là đã chọn nếu có bất kỳ loại nào được check hoặc đã được gán
        return assignment?.chiDao || assignment?.phoi || assignment?.nhanDeBiet || isAssigned;
      }
      return false;
    });
  }, [assignments, assignedReceiverRolesMap]);

  const isTrinhLanhDao = actionCode === "CHUYEN_XU_LY_PHAN_CONG" && targetRole === "LANH_DAO_TCT";

  return (
    <StyledTableContainer isMobileOrTablet={isMobileOrTablet} isHeight>
      <FixedTable stickyHeader>
        <StyledTableHead>
          <StyledTableRow>
            <StyledTableCellLarge>
              <StyledNameText>Tên đơn vị, cá nhân</StyledNameText>
            </StyledTableCellLarge>
            {(canSetProcessor &&  !isNhanDeBiet) && (
              <CompactTableCellMedium>
                <StyledHeaderBox>
                  <StyledNameText>
                    {isNhanDeBiet ? "Nhận để biết" : (chiDao === true || chiDao === "true" || (actionsBySub && actionsBySub.length > 0 && actionsBySub.some(item => (item.chiDao === true || item.chiDao === "true")))) ? "Chỉ đạo/Xử lý chính" : "Chủ trì/Xử lý chính"}
                  </StyledNameText>
                </StyledHeaderBox>
                {(canTransferRooms && !isTrinhLanhDao) && (
                  <StyledCheckboxs
                    checked={checkAll === "chiDao"}
                    onChange={handleCheckAllChange("chiDao")}
                    disabled={!canTransferOption || isDisabledInteraction || disableProcessorColumn}
                  />
                )}
              </CompactTableCellMedium>
            )}

            {canSetSupporter && (
              <CompactTableCellMedium>
                <StyledHeaderBox>
                  <StyledNameText>Phối hợp</StyledNameText>
                </StyledHeaderBox> 
                {!isTrinhLanhDao && (
                  <StyledCheckboxs
                    checked={checkAll === "phoi"}
                    onChange={handleCheckAllChange("phoi")}
                    disabled={isDisabledInteraction}
                  />
                )}
              </CompactTableCellMedium>
            )}

            {(canSetViewer || isNhanDeBiet) && (
              <CompactTableCellMedium>
                <StyledHeaderBox>
                  <StyledNameText>Nhận để biết</StyledNameText>
                </StyledHeaderBox>
                {!isTrinhLanhDao && (
                  <StyledCheckbox
                    checked={checkAll === "nhanDeBiet"}
                    onChange={handleCheckAllChange("nhanDeBiet")}
                    disabled={isDisabledInteraction}
                  />
                )}
              </CompactTableCellMedium>
            )}
          </StyledTableRow>
        </StyledTableHead>

        <TableBody>
          {data?.map((unit) => (
            <Row
              key={unit._id || unit.id}
              item={unit}
              canTransferRoom={canTransferRooms}
              level={0}
              expandedUnits={expandedUnits}
              onToggleExpand={handleToggleExpand}
              assignments={assignments}
              assignedReceiverRolesMap={assignedReceiverRolesMap}
              handleCheckboxChange={handleCheckboxChange}
              onCheckAllChild={onCheckAllChild}
              isNhanDeBiet={isNhanDeBiet}
              canSetViewer={canSetViewer}
              canSetSupporter={canSetSupporter}
              canSetProcessor={canSetProcessor}
              disableProcessorColumn={disableProcessorColumn}
              isParentUnitSelected={isUnitSelected}
              isAnyChildUserSelected={isAnyChildUserSelected}
              isDisabledInteraction={isDisabledInteraction}
              canConfirmPropose={canConfirmPropose}
              lockedPhanCongIds={lockedPhanCongIds}
              initialAssignments={initialAssignments}
              hasUserPhanCong={hasUserPhanCong}
              control={control}
              DatePicker={DatePicker}
              errors={errors}
              setDeadlineError={setDeadlineError}
              alreadySentUserIds={alreadySentUserIds}
              onlyUsers={onlyUsers}
              disableBan={disableBan}
              ancestorSelected={false}
              disabledDescendantIds={disabledDescendantIds}
            />
          ))}
        </TableBody>
      </FixedTable>
    </StyledTableContainer>
  );
};

RenderTableTree.propTypes = {
  data: PropTypes.array.isRequired,
  assignments: PropTypes.object,
  assignedReceiverRolesMap: PropTypes.object,
  handleCheckboxChange: PropTypes.func.isRequired,
  onCheckAll: PropTypes.func,
  onCancelCheckAll: PropTypes.func,
  isMobileOrTablet: PropTypes.bool,
  canSetSupporter: PropTypes.bool,
  canSetProcessor: PropTypes.bool,
  disableProcessorColumn: PropTypes.bool,
  canSetViewer: PropTypes.bool,
  canTransferRoom: PropTypes.bool,
  chiDao: PropTypes.bool,
  onCheckAllChild: PropTypes.func,
  maxDepthLevel: PropTypes.number,
  disableBan: PropTypes.bool,
};

RenderTableTree.displayName = "RenderTableTree";

export default React.memo(RenderTableTree);
