/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState, useMemo } from "react";
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

const TreeNameClickable = styled(StyledClickableBox)({
  minWidth: 0,
  flex: 1,
  display: "flex",
  alignItems: "center",
  overflow: "hidden",
});

const TreeNameText = styled(StyledNameText)({
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  display: "inline-block",
  maxWidth: "100%",
});

const Row = React.memo(
  ({
    item,
    level,
    expandedUnits,
    onToggleExpand,
    isChecked, // (item, type) => boolean
    handleCheckboxChange,
    canSetViewer,
    canSetSupporter,
    canSetProcessor,
    canTransferRoom,
    isParentUnitSelected, // (unitId) => boolean
    isAnyChildUserSelected, // (unit) => boolean
    control,
    DatePicker,
    errors,
    setDeadlineError,
    disabledUserIds,
    onlyUsers,
  }) => {
    const itemId = item?._id ?? item?.id;
    const hasChild = Array.isArray(item?.child) && item.child.length > 0;
    const expanded = expandedUnits[itemId];

    const handleToggleExpand = useCallback(() => {
      onToggleExpand(itemId);
    }, [itemId, onToggleExpand]);

    // Memo hóa checked states
    const checkedStates = useMemo(() => {
      return {
        chiDao: isChecked(item, "chiDao") === true,
        phoi: isChecked(item, "phoi") === true,
        nhanDeBiet: isChecked(item, "nhanDeBiet") === true,
      };
    }, [item, isChecked]);



    const isAnyChecked = useMemo(() => {
      return checkedStates.chiDao || checkedStates.phoi || checkedStates.nhanDeBiet;
    }, [checkedStates]);

    // Handlers checkbox: chỉ chọn 1 checkbox trên hàng
    const checkboxHandlers = useMemo(() => {
      const handleSingleCheck = (type) => (event) => {
        event.stopPropagation();
        handleCheckboxChange(itemId, type, item.types, item, true);
      };
      return {
        chiDao: handleSingleCheck("chiDao"),
        phoi: handleSingleCheck("phoi"),
        nhanDeBiet: handleSingleCheck("nhanDeBiet"),
      };
    }, [itemId, item, handleCheckboxChange]);

    // Logic để disable checkbox
    const isDisabled = useMemo(() => {
      const itemId = item?._id ?? item?.id;
      if (itemId && disabledUserIds?.has(itemId)) {
        return true;
      }

      if (!canTransferRoom) return false;

      if (item.types === 'user') {
        // Disable user nếu phòng ban cha trực tiếp đã được chọn ở BẤT KỲ cột nào
        return isParentUnitSelected(item.parent);
      } else if (item.types === 'company' && hasChild) {
        // Disable phòng ban nếu có BẤT KỲ user con TRỰC TIẾP nào đã được chọn ở BẤT KỲ cột nào
        return isAnyChildUserSelected(item);
      }
      return false;
    }, [canTransferRoom, item, isParentUnitSelected, isAnyChildUserSelected, hasChild, disabledUserIds]);

    const childItems = useMemo(() => {
      if (!hasChild || !expanded) return null;
      return item.child.map((subItem) => (
        <Row
          key={subItem._id || subItem.id}
          item={subItem}
          level={level + 1}
          expandedUnits={expandedUnits}
          onToggleExpand={onToggleExpand}
          isChecked={isChecked} // (item, type) => boolean
          handleCheckboxChange={handleCheckboxChange}
          canSetViewer={canSetViewer}
          canSetSupporter={canSetSupporter}
          canSetProcessor={canSetProcessor}
          canTransferRoom={canTransferRoom}
          isParentUnitSelected={isParentUnitSelected}
          isAnyChildUserSelected={isAnyChildUserSelected}
          control={control}
          DatePicker={DatePicker}
          errors={errors}
          setDeadlineError={setDeadlineError}
          disabledUserIds={disabledUserIds}
          onlyUsers={onlyUsers}
        />
      ));
    }, [
      hasChild,
      expanded,
      item.child?.length,
      level,
      expandedUnits,
      onToggleExpand,
      isChecked,
      handleCheckboxChange,
      canSetViewer,
      canSetSupporter,
      canSetProcessor,
      canTransferRoom,
      isParentUnitSelected,
      isAnyChildUserSelected,
      control,
      DatePicker,
      errors,
      setDeadlineError,
      disabledUserIds,
    ]);

    const stopPropagation = useCallback((e) => {
      e.stopPropagation();
    }, []);

    const isLeaf = onlyUsers
      ? item.types === "user"
      : (item.types === "user" || (level !== 0 && item.types !== "unit" && !(item.types === "company" && canTransferRoom === false)));

    return (
      <>
        <StyledRow hover $isSelected={isAnyChecked}>
          <ConstrainedTableCellLeft>
            <div style={{ display: "flex", flexDirection: "column", width: "100%", minWidth: 0, overflow: "hidden" }}>
              <TreeNameWrapper level={level}>
                <TreeNameClickable
                  hasChild={hasChild}
                  isUser={item.type === "user"}
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
                          />
                        )}
                      />
                    )}
                  </StyledDatePickerWrapper>
                </div>
              )}
            </div>
          </ConstrainedTableCellLeft>

          {canSetProcessor && (
            <CompactTableCellMedium align="center">
              {isLeaf && (
                <StyledCheckbox
                  checked={checkedStates.chiDao}
                  disabled={isDisabled}
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

          {canSetViewer && (
            <CompactTableCellMedium align="center">
              {isLeaf && (
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
      prevProps.item?._id !== nextProps.item?._id ||
      prevProps.item?.name !== nextProps.item?.name ||
      prevProps.level !== nextProps.level ||
      prevProps.canSetViewer !== nextProps.canSetViewer ||
      prevProps.canSetSupporter !== nextProps.canSetSupporter ||
      prevProps.canSetProcessor !== nextProps.canSetProcessor
    ) {
      return false;
    }

    // Check nếu expandedUnits object reference thay đổi
    if (prevProps.expandedUnits !== nextProps.expandedUnits) {
      return false;
    }

    if (
      prevProps.isChecked === nextProps.isChecked &&
      prevProps.isCheckboxDisabled === nextProps.isCheckboxDisabled &&
      prevProps.handleCheckboxChange === nextProps.handleCheckboxChange &&
      prevProps.onToggleExpand === nextProps.onToggleExpand &&
      prevProps.control === nextProps.control &&
      prevProps.DatePicker === nextProps.DatePicker &&
      prevProps.errors === nextProps.errors &&
      prevProps.setDeadlineError === nextProps.setDeadlineError &&
      prevProps.disabledUserIds === nextProps.disabledUserIds
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
  isChecked,
  assignments,
  handleCheckboxChange,
  onCheckAll,
  onCancelCheckAll,
  isMobileOrTablet,
  canSetSupporter,
  canSetProcessor,
  canSetViewer,
  canTransferOption,
  canTransferRooms,
  checkTransfer,
  customMaxHeight,
  control,
  DatePicker,
  errors,
  setDeadlineError,
  // hideCheckboxes
  disabledUserIds,
  onlyUsers,
  profileButton,
  open,
}) => {
  const [expandedUnits, setExpandedUnits] = useState({});
  const [checkAll, setCheckAll] = useState("");

  // Auto expand logic:
  // - If there are pre-checked/selected items in assignments, expand paths to them.
  // - If no items are selected, expand only 1 level (level 0).
  useEffect(() => {
    if (open === false) {
      setExpandedUnits({});
      return;
    }

    if (!data || data.length === 0) {
      setExpandedUnits({});
      return;
    }

    setExpandedUnits((prev) => {
      const selectedIds = new Set(
        Object.values(assignments || {})
          .filter((a) => a && (a.chiDao || a.phoi || a.nhanDeBiet))
          .map((a) => a.id || a._id)
          .filter(Boolean)
      );

      const newExpanded = { ...prev };

      // if (Object.keys(prev).length === 0) {
      //   // Expand all nodes initially if nothing is selected or it's the first render
      //   const expandAll = (items) => {
      //     items.forEach((item) => {
      //       const itemId = item?._id ?? item?.id;
      //       if (Array.isArray(item?.child) && item.child.length > 0) {
      //         newExpanded[itemId] = true;
      //         expandAll(item.child);
      //       }
      //     });
      //   };
      //   expandAll(data);
      // }

      if (selectedIds.size > 0 && !checkAll) {
        // Expand path to selected items
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

      return newExpanded;
    });
  }, [data, assignments, open]);

  const handleToggleExpand = useCallback((id) => {
    setExpandedUnits((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

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
    return assignment?.chiDao || assignment?.phoi || assignment?.nhanDeBiet;
  }, [assignments]);

  // Hàm kiểm tra xem có bất kỳ user con TRỰC TIẾP nào của một unit được chọn không
  const isAnyChildUserSelected = useCallback((unit) => {
    if (!unit?.child) return false;
    // Chỉ kiểm tra các user con TRỰC TIẾP (không kiểm tra đệ quy)
    return unit.child.some(child => {
      if (child.types === 'user') {
        const childId = child._id || child.id;
        const assignment = assignments?.[childId];
        // User được coi là đã chọn nếu có bất kỳ loại nào được check
        return assignment?.chiDao || assignment?.phoi || assignment?.nhanDeBiet;
      }
      return false;
    });
  }, [assignments]);

  return (
    <StyledTableContainer isMobileOrTablet={isMobileOrTablet}  checkTransfer={checkTransfer} customMaxHeight={customMaxHeight}>
      <FixedTable stickyHeader>
        <StyledTableHead>
          <StyledTableRow>
            <StyledTableCellLarge>
              <StyledNameText>Tên đơn vị, cá nhân</StyledNameText>
            </StyledTableCellLarge>

            {canSetProcessor && (
              <CompactTableCellMedium>
                <StyledHeaderBox>
                  <StyledNameText>
                    {profileButton?.isDirect === false ? "Xử lý" : "Chỉ đạo"}
                  </StyledNameText>
                </StyledHeaderBox>
                {canTransferRooms && (
                  <StyledCheckboxs
                    checked={checkAll === "chiDao"}
                    onChange={handleCheckAllChange("chiDao")}
                    disabled={!canTransferOption}
                  />
                )}
              </CompactTableCellMedium>
            )}

            {canSetSupporter && (
              <CompactTableCellMedium>
                <StyledHeaderBox>
                  <StyledNameText>Phối hợp</StyledNameText>
                </StyledHeaderBox> <StyledCheckboxs
                  checked={checkAll === "phoi"}
                  onChange={handleCheckAllChange("phoi")}
                />
              </CompactTableCellMedium>
            )}

            {canSetViewer && (
              <CompactTableCellMedium>
                <StyledHeaderBox>
                  <StyledNameText>Nhận để biết</StyledNameText>

                </StyledHeaderBox><StyledCheckbox
                  checked={checkAll === "nhanDeBiet"}
                  onChange={handleCheckAllChange("nhanDeBiet")}
                />
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
              isChecked={isChecked} // (item, type) => boolean
              handleCheckboxChange={handleCheckboxChange}
              canSetViewer={canSetViewer}
              canSetSupporter={canSetSupporter}
              canSetProcessor={canSetProcessor}
              isParentUnitSelected={isUnitSelected}
              isAnyChildUserSelected={isAnyChildUserSelected}
              control={control}
              DatePicker={DatePicker}
              errors={errors}
              setDeadlineError={setDeadlineError}
              disabledUserIds={disabledUserIds}
              onlyUsers={onlyUsers}
            />
          ))}
        </TableBody>
      </FixedTable>
    </StyledTableContainer>
  );
};

RenderTableTree.propTypes = {
  data: PropTypes.array.isRequired,
  isChecked: PropTypes.func.isRequired,
  assignments: PropTypes.object,
  handleCheckboxChange: PropTypes.func.isRequired,
  onCheckAll: PropTypes.func,
  onCancelCheckAll: PropTypes.func,
  isMobileOrTablet: PropTypes.bool,
  canSetSupporter: PropTypes.bool,
  canSetProcessor: PropTypes.bool,
  canSetViewer: PropTypes.bool,
  canTransferRoom: PropTypes.bool,
  control: PropTypes.object,
  DatePicker: PropTypes.elementType,
  errors: PropTypes.object,
  setDeadlineError: PropTypes.func,
  disabledUserIds: PropTypes.object,
  profileButton: PropTypes.object,
  open: PropTypes.bool,
};

RenderTableTree.displayName = "RenderTableTree";

export default React.memo(RenderTableTree);
