/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { TableBody, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";
import { UserInitialAvatar } from "@styles/Navbar.styles";
import {
  StyledCheckbox,
  StyledClickableBox,
  StyledExpandButton,
  StyledNameText,
  StyledRow,
  StyledRowBox,
  StyledTable,
  StyledTableCellLarge,
  StyledTableCellLeft,
  StyledTableCellLeft1,
  StyledTableCellMedium,
  StyledTableContainer1,
  StyledTableHead,
  StyledTableRow,
} from "@styles/DialogDirective";
import {
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";

const StyledUserInfo = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
}));

const StyledUserAvatar = styled(UserInitialAvatar)(({ theme }) => ({
  width: 24,
  height: 24,
  flexShrink: 0,
  fontSize: 11,
  color: theme.palette.primary.main,
  backgroundColor: theme.palette.action.selected,
}));

const StyledUserText = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  overflow: "hidden",
  flex: 1,
}));

const StyledTreeRowBox = styled(StyledRowBox)({
  minWidth: 0,
  width: "100%",
});

const StyledUnitNameText = styled(StyledNameText)({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  display: "block",
  width: "100%",
});

const StyledUserName = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

const StyledUserPosition = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: 10,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

const getAvatarSrc = (item) => {
  if (Array.isArray(item?.avatar)) return item.avatar[0];
  return item?.avatar || item?.avatarUrl || item?.image || item?.photo || "";
};

const getInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
};

const Row = ({
  item,
  level,
  expandedUnits,
  onToggleExpand,
  isChecked,
  handleCheckboxChange,
  canSetViewer,
  canSetSupporter,
  canSetProcessor,
  disableCheckbox = false,
  multiSelect = false,
}) => {
  const itemId = item?._id ?? item?.id;
  const isUser = item?.types === "user" || item?.type === "user";
  const hasChild = Array.isArray(item?.child) && item.child.length > 0;
  const expanded = expandedUnits[itemId];
  const userPosition = item?.position || item?.positions || item?.role || "";
  const avatarSrc = getAvatarSrc(item);

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

  // Memo hóa checked states
  const checkedStates = useMemo(() => {
    return {
      chiDao: isChecked(item, "chiDao") === true,
      phoi: isChecked(item, "phoi") === true,
      nhanDeBiet: isChecked(item, "nhanDeBiet") === true,
    };
  }, [item, isChecked]);

  // Handlers checkbox: chỉ chọn 1 checkbox trên hàng (hoặc nhiều nếu multiSelect)
  const checkboxHandlers = useMemo(() => {
    const handleSingleCheck = (type) => (event) => {
      event.stopPropagation();
      handleCheckboxChange(itemId, type, item.types, item, multiSelect);
    };
    return {
      chiDao: handleSingleCheck("chiDao"),
      phoi: handleSingleCheck("phoi"),
      nhanDeBiet: handleSingleCheck("nhanDeBiet"),
    };
  }, [itemId, item, handleCheckboxChange, multiSelect]);

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
        canSetViewer={canSetViewer}
        canSetSupporter={canSetSupporter}
        canSetProcessor={canSetProcessor}
        disableCheckbox={disableCheckbox}
        multiSelect={multiSelect}
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
    disableCheckbox,
    multiSelect,
  ]);
  const stopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      <StyledRow
        hover={!disableCheckbox}
      >
        <StyledTableCellLeft1>
          <StyledTreeRowBox level={level}>
            <StyledClickableBox
              hasChild={hasChild}
              isUser={isUser}
            >
              {isUser ? (
                <StyledUserInfo>
                  <StyledUserAvatar
                    username={item?.name}
                    imageUrl={avatarSrc || undefined}
                    size={24}
                  >
                    {!avatarSrc && getInitials(item?.name)}
                  </StyledUserAvatar>
                  <StyledUserText>
                    <Tooltip title={item?.name} placement="top" arrow>
                      <StyledUserName>{item?.name}</StyledUserName>
                    </Tooltip>
                    {userPosition && (
                      <Tooltip title={userPosition} placement="top" arrow>
                        <StyledUserPosition>{userPosition}</StyledUserPosition>
                      </Tooltip>
                    )}
                  </StyledUserText>
                </StyledUserInfo>
              ) : (
                <Tooltip title={item?.name} placement="top" arrow>
                  <StyledUnitNameText variant="body2">
                    {item?.name}
                  </StyledUnitNameText>
                </Tooltip>
              )}
            </StyledClickableBox>

            {hasChild && (
              <StyledExpandButton size="small" onClick={handleToggleExpand}>
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </StyledExpandButton>
            )}
          </StyledTreeRowBox>
        </StyledTableCellLeft1>

        <StyledTableCellLeft align="center">
        {level > 0 && item.types === "user" && (
            <StyledCheckbox
              checked={checkedStates.chiDao}
              onChange={checkboxHandlers.chiDao}
              onClick={stopPropagation}
              disabled={disableCheckbox}
            />
          )}
          </StyledTableCellLeft>
      </StyledRow>
      

      {childItems}
    </>
  );
};

const RenderTableTree = ({ data, isChecked, handleCheckboxChange, targetTitle, selectedTitle, disableCheckbox = false, multiSelect = false }) => {
  const [expandedUnits, setExpandedUnits] = useState({});

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
  }, [data]);

  const handleToggleExpand = useCallback((id) => {
    setExpandedUnits((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <StyledTableContainer1>
      <StyledTable stickyHeader>
        <StyledTableHead>
          <StyledTableRow>
            <StyledTableCellLarge>
              <StyledNameText>{targetTitle || "Tên đơn vị, cá nhân"}</StyledNameText>
            </StyledTableCellLarge>

            <StyledTableCellMedium>
              <StyledNameText>{selectedTitle || "Chỉ đạo/Chủ trì"}</StyledNameText>
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
              disableCheckbox={disableCheckbox}
              multiSelect={multiSelect}
            />
          ))}
        </TableBody>
      </StyledTable>
    </StyledTableContainer1>
  );
};

RenderTableTree.propTypes = {
  data: PropTypes.array.isRequired,
  isChecked: PropTypes.func.isRequired,
  handleCheckboxChange: PropTypes.func.isRequired,
  onCheckAll: PropTypes.func,
  onCancelCheckAll: PropTypes.func,
  isMobileOrTablet: PropTypes.bool,
  canSetSupporter: PropTypes.bool,
  canSetProcessor: PropTypes.bool,
  canSetViewer: PropTypes.bool,
  multiSelect: PropTypes.bool,
  targetTitle: PropTypes.string,
  selectedTitle: PropTypes.string,
  disableCheckbox: PropTypes.bool,
};

RenderTableTree.displayName = "RenderTableTree";

export default React.memo(RenderTableTree);
