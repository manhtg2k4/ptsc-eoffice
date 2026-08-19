/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { TableBody } from "@mui/material";
import {
  StyledCheckbox,
  StyledCheckboxs,
  StyledClickableBox,
  StyledExpandButton,
  StyledHeaderBox,
  StyledNameText,
  StyledNameTextHeader,
  StyledRow,
  StyledRowBox,
  StyledTable,
  StyledTableCellLarge,
  StyledTableCellLeft,
  StyledTableCellLeft1,
  StyledTableCellMedium,
  StyledTableContainer,
  StyledTableHead,
  StyledTableRow,
} from "@styles/DialogDirective";
import {
  AccountBalance,
  AccountBalanceWallet,
  AccountCircle,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";

const TakeIcon = React.memo(({ type }) => {
  const icons = {
    user: AccountCircle,
    company: AccountBalance,
    corporation: AccountBalance,
    department: AccountBalance,
    salePoint: AccountBalanceWallet,
  };

  const IconComponent = type ? icons[type] : null;
  return IconComponent ? <IconComponent /> : null;
});

TakeIcon.displayName = "TakeIcon";

const Row = React.memo(({
  item,
  level,
  expandedUnits,
  onToggleExpand,
  isChecked,
  handleCheckboxChange,
}) => {
  const itemId = item?._id ?? item?.id;
  const hasChild = Array.isArray(item?.child) && item.child.length > 0;

  const expanded = expandedUnits[itemId];

  useEffect(() => {
    if (
      hasChild &&
      !Object.prototype.hasOwnProperty.call(expandedUnits, itemId)
    ) {
      onToggleExpand(itemId);
    }
  }, [expandedUnits, hasChild, itemId, onToggleExpand]);

  const handleToggleExpand = useCallback(() => {
    onToggleExpand(itemId);
  }, [itemId, onToggleExpand]);

  // Memo hóa checked states để tránh tính toán lại không cần thiết
  const checkedStates = useMemo(() => {
    return {
      chiDao: isChecked(item, "chiDao") === true,
      phoi: isChecked(item, "phoi") === true,
      nhanDeBiet: isChecked(item, "nhanDeBiet") === true,
    };
  }, [item, isChecked]);

  // Memo hóa handlers để tránh tạo mới mỗi lần render
  const checkboxHandlers = useMemo(() => {
    return {
      chiDao: (event) => {
        if (event?.stopPropagation) {
          event.stopPropagation();
        }
        handleCheckboxChange(itemId, "chiDao", item.types, item);
      },
      phoi: (event) => {
        if (event?.stopPropagation) {
          event.stopPropagation();
        }
        handleCheckboxChange(itemId, "phoi", item.types, item);
      },
      nhanDeBiet: (event) => {
        if (event?.stopPropagation) {
          event.stopPropagation();
        }
        handleCheckboxChange(itemId, "nhanDeBiet", item.types, item);
      },
    };
  }, [itemId, item.type, item, handleCheckboxChange]);

  // Memo hóa child items để tránh re-render không cần thiết
  const childItems = useMemo(() => {
    if (!hasChild || !expanded) return null;
    return item.child.map((subItem) => (
      <Row
        key={subItem._id || subItem.id}
        item={subItem}
        level={level + 1}
        expandedUnits={expandedUnits}
        onToggleExpand={onToggleExpand}
        isChecked={isChecked}
        handleCheckboxChange={handleCheckboxChange}
      />
    ));
  }, [hasChild, expanded, item.child, level, expandedUnits, onToggleExpand, isChecked, handleCheckboxChange]);

  return (
    <>
      <StyledRow hover>
        <StyledTableCellLeft1>
          <StyledRowBox level={level}>
            <StyledClickableBox
              hasChild={hasChild}
              isUser={item.type === "user"}
              // onClick={hasChild ? () => onToggleExpand(itemId) : undefined}
            >
              <TakeIcon type={item.types} />
              <StyledNameText variant="body2">
                {item?.name}
                {item?.positions && ` - ${item.positions}`}
              </StyledNameText>
            </StyledClickableBox>

            {hasChild && (
              <StyledExpandButton size="small" onClick={handleToggleExpand}>
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </StyledExpandButton>
            )}
          </StyledRowBox>
        </StyledTableCellLeft1>

        {level !== 0 && item.types !== "unit" && (
          <>
            <StyledTableCellLeft align="center">
              <StyledCheckbox
                checked={checkedStates.chiDao}
                onChange={checkboxHandlers.chiDao}
              />
            </StyledTableCellLeft>
            <StyledTableCellLeft align="center">
              <StyledCheckbox
                checked={checkedStates.phoi}
                onChange={checkboxHandlers.phoi}
              />
            </StyledTableCellLeft>
            <StyledTableCellLeft align="center">
              <StyledCheckbox
                checked={checkedStates.nhanDeBiet}
                onChange={checkboxHandlers.nhanDeBiet}
              />
            </StyledTableCellLeft>
          </>
        )}
        {level === 0 && (
          <>
            <StyledTableCellLeft align="center" />
            <StyledTableCellLeft align="center" />
            <StyledTableCellLeft align="center" />
          </>
        )}
      </StyledRow>

      {childItems}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison để chỉ re-render khi cần thiết
  // So sánh các props cơ bản trước
  if (prevProps.item?._id !== nextProps.item?._id ||
      prevProps.item?.name !== nextProps.item?.name ||
      prevProps.level !== nextProps.level) {
    return false;
  }
  
  // So sánh expanded state
  const itemId = prevProps.item?._id ?? prevProps.item?.id;
  if (prevProps.expandedUnits[itemId] !== nextProps.expandedUnits[itemId]) {
    return false;
  }
  
  // So sánh assignments object reference - nếu cùng reference thì không cần re-render
  // isChecked sẽ được memo hóa bên trong component
  if (prevProps.isChecked === nextProps.isChecked &&
      prevProps.handleCheckboxChange === nextProps.handleCheckboxChange &&
      prevProps.onToggleExpand === nextProps.onToggleExpand) {
    // Chỉ cần check nếu item.child thay đổi
    if (prevProps.item?.child?.length !== nextProps.item?.child?.length) {
      return false;
    }
    return true;
  }
  
  return false;
});

Row.displayName = "Row";

const RenderTableTree = (props) => {
  const {
    data,
    isChecked,
    handleCheckboxChange,
    onCheckAll,
    isMobileOrTablet,
    onCancelCheckAll,
  } = props;
  const [expandedUnits, setExpandedUnits] = useState({});
  const [checkAll, setCheckAll] = useState("");

  useEffect(() => {
    if (data && data.length > 0 && Object.keys(expandedUnits).length === 0) {
      const newExpanded = {};
      const expandTwoLevels = (list, currentLevel = 0) => {
        if (!list) return;
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const id = item._id || item.id;
          if (currentLevel < 1) {
            newExpanded[id] = true;
            if (item.child && item.child.length > 0) {
              expandTwoLevels(item.child, currentLevel + 1);
            }
          }
        }
      };
      expandTwoLevels(data);
      setExpandedUnits(newExpanded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleToggleExpand = useCallback((id) => {
    setExpandedUnits((prev) => ({ ...prev, [id]: !prev[id] }));
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

  return (
    <StyledTableContainer isMobileOrTablet={isMobileOrTablet}>
      <StyledTable stickyHeader>
        <StyledTableHead>
          <StyledTableRow>
            <StyledTableCellLarge>
              <StyledNameText>Tên đơn vị, cá nhân</StyledNameText>
            </StyledTableCellLarge>

            <StyledTableCellMedium>
              <StyledNameTextHeader>Chỉ đạo/Chủ trì</StyledNameTextHeader>
            </StyledTableCellMedium>

            <StyledTableCellMedium>
              <StyledHeaderBox>
                <StyledNameTextHeader>Phối hợp</StyledNameTextHeader>
                <StyledCheckboxs
                  checked={checkAll === "phoi"}
                  onChange={handleCheckAllChange("phoi")}
                />
              </StyledHeaderBox>
            </StyledTableCellMedium>

            <StyledTableCellMedium>
              <StyledHeaderBox>
                <StyledNameTextHeader>Nhận để biết</StyledNameTextHeader>
                <StyledCheckbox
                  checked={checkAll === "nhanDeBiet"}
                  onChange={handleCheckAllChange("nhanDeBiet")}
                />
              </StyledHeaderBox>
            </StyledTableCellMedium>
          </StyledTableRow>
        </StyledTableHead>

        <TableBody>
          {data?.map((unit) => (
            <Row
              key={unit._id || unit.id}
              item={unit}
              level={0}
              expandedUnits={expandedUnits}
              onToggleExpand={handleToggleExpand}
              isChecked={isChecked}
              handleCheckboxChange={handleCheckboxChange}
            />
          ))}
        </TableBody>
      </StyledTable>
    </StyledTableContainer>
  );
};

RenderTableTree.PropTypes = {
  data: PropTypes.array,
  //   expandedUnits: PropTypes.array,
  handleToggleExpand: PropTypes.func,
  isChecked: PropTypes.bool,
  handleCheckboxChange: PropTypes.func,
  onCheckAll: PropTypes.func,
  onCancelCheckAll: PropTypes.func,
};

RenderTableTree.displayName = "RenderTableTree";
export default React.memo(RenderTableTree);
