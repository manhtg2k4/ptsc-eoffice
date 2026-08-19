/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { styled } from "@mui/material/styles";
import {
  StyledCheckbox,
  StyledClickableBox,
  StyledExpandButton,
  StyledRowBox,
  StyledNameText,
  // StyledNameTextHeader,
  StyledRow,
  StyledTableCellLarge,
  StyledTableCellMedium,
  StyledTableContainer1,
  StyledTable,
  StyledTableHead,
  StyledTableRow,
  StyledTableCellLeft1,
  StyledTableCellLeft,
  StyledNameTextHeaderTH,
} from "@styles/DialogDirective";
import { SkyBox, SkyTableBody, SkyTypography } from "@styles/SkyStyles";
import {
 
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";

const UserInfoBox = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
}));

const UserAvatar = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "src" && prop !== "$hasImage",
})(({ theme, src, $hasImage }) => ({
  width: 28,
  height: 28,
  flexShrink: 0,
  fontSize: 12,
  color: $hasImage ? "transparent" : theme.palette.primary.main,
  backgroundColor: theme.palette.action.selected,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundImage: $hasImage ? `url("${src}")` : "none",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
}));

const UserTextBox = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
}));

const UserName = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.25,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

const UserPosition = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: 14,
  lineHeight: 1.25,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

const UnitNameText = styled(StyledNameText)(() => ({
  fontSize: 15,
}));

const HeaderTableHead = styled(StyledTableHead)(({ theme }) => ({
  "&&&": {
    boxShadow: `inset 0 -1px 0 ${theme.palette.divider}`,
  },
  "&&& th": {
    border: "none !important",
    backgroundColor: `${theme.palette.background.paper} !important`,
  },
}));

const HeaderRow = styled(StyledTableRow)(() => ({}));

const HeaderCellLarge = styled(StyledTableCellLarge)(() => ({
  "&&&": {
    padding: "16px !important",
    border: "none",
  },
}));

const HeaderCellMedium = styled(StyledTableCellMedium)(() => ({
  "&&&": {
    padding: "16px !important",
    width: "fit-content !important",
    minWidth: "fit-content !important",
    maxWidth: "fit-content !important",
    textAlign: "right",
    border: "none",
  },
}));

const HeaderTitleText = styled(StyledNameText)(() => ({
  marginLeft: 0,
  fontSize: 13,
  fontWeight: 600,
}));

const HeaderActionText = styled(StyledNameTextHeaderTH)(() => ({
  marginLeft: 0,
  textAlign: "right",
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

// ===== Row component =====
const Row = ({
  item,
  level,
  expandedUnits,
  onToggleExpand,
  isChecked,
  handleCheckboxChange,
}) => {
  const itemId = item?._id ?? item?.id;
  const isUser = item?.type === "user" || item?.types === "user";
  const hasChild = Array.isArray(item?.child) && item.child.length > 0;
  const expanded = expandedUnits[itemId];
  const userPosition = item?.position || item?.positions || item?.role || "";
  const avatarSrc = getAvatarSrc(item);
  const hasAvatar = Boolean(avatarSrc);

  // Toggle expand
  const handleToggleExpand = useCallback(() => {
    onToggleExpand(itemId);
  }, [itemId, onToggleExpand]);

  // Checked state
  const checked = isChecked(item, "traLai");

  const handleChange = useCallback(
    (e) => {
      handleCheckboxChange(item, "traLai", e.target.checked);
    },
    [item, handleCheckboxChange]
  );

  // Child items
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
  }, [
    hasChild,
    expanded,
    item.child,
    level,
    expandedUnits,
    onToggleExpand,
    isChecked,
    handleCheckboxChange,
  ]);

  const stopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      <StyledRow hover>
        <StyledTableCellLeft1>
          <StyledRowBox level={level}>
            <StyledClickableBox
              hasChild={hasChild}
              isUser={isUser}
            >
              {isUser ? (
                <UserInfoBox>
                  <UserAvatar src={avatarSrc} $hasImage={hasAvatar}>
                    {!hasAvatar && getInitials(item?.name)}
                  </UserAvatar>
                  <UserTextBox>
                    <UserName>{item?.name}</UserName>
                    {userPosition && <UserPosition>{userPosition}</UserPosition>}
                  </UserTextBox>
                </UserInfoBox>
              ) : (
                <UnitNameText>{item?.name}</UnitNameText>
              )}
            </StyledClickableBox>

            {hasChild && (
              <StyledExpandButton size="small" onClick={handleToggleExpand}>
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </StyledExpandButton>
            )}
          </StyledRowBox>
        </StyledTableCellLeft1>

        <StyledTableCellLeft align="center">
          {level > 0 && isUser && (
            <StyledCheckbox
              checked={checked}
              onChange={handleChange}
              onClick={stopPropagation}
            />
          )}
        </StyledTableCellLeft>
      </StyledRow>
      {/* {item?.types !== "company" && <StyledTableCellLeft align="center" />} */}
      {childItems}
    </>
  );
};

// ===== RenderTableTree component =====
const RenderTableTree = ({ data, isChecked, handleCheckboxChange, customHeight, customMinHeight, textHeadCheckbox }) => {
  const [expandedUnits, setExpandedUnits] = useState({});

  // Auto expand first two levels
  useEffect(() => {
    if (!(data && data.length > 0 && Object.keys(expandedUnits).length === 0)) {
      return;
    }
    const newExpanded = {};
    const expandTwoLevels = (list, level = 0) => {
      if (!list) return;
      for (let item of list) {
        const id = item._id || item.id;
        if (level < 2) {
          newExpanded[id] = true;
          if (item.child) expandTwoLevels(item.child, level + 1);
        }
      }
    };
    expandTwoLevels(data);
    setExpandedUnits(newExpanded);
  }, [data]);

  const handleToggleExpand = useCallback((id) => {
    setExpandedUnits((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <StyledTableContainer1 customHeight={customHeight} customMinHeight={customMinHeight} noBorder>
      <StyledTable stickyHeader>
        <HeaderTableHead>
          <HeaderRow>
            <HeaderCellLarge>
              <HeaderTitleText>Cá nhân</HeaderTitleText>
            </HeaderCellLarge>
            <HeaderCellMedium>
              <HeaderActionText>{textHeadCheckbox || "Thu hồi"}</HeaderActionText>
            </HeaderCellMedium>
          </HeaderRow>
        </HeaderTableHead>

        <SkyTableBody>
          {data?.map((unit) => (
            <Row
              key={unit._id || unit.id}
              item={unit}
              level={0}
              expandedUnits={expandedUnits}
              onToggleExpand={handleToggleExpand}
              isChecked={isChecked}
              handleCheckboxChange={handleCheckboxChange}
							textHeadCheckbox={textHeadCheckbox}
            />
          ))}
        </SkyTableBody>
      </StyledTable>
    </StyledTableContainer1>
  );
};

RenderTableTree.propTypes = {
  data: PropTypes.array,
  isChecked: PropTypes.func.isRequired,
  handleCheckboxChange: PropTypes.func.isRequired,
  customHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  customMinHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

RenderTableTree.displayName = "RenderTableTree";

export default React.memo(RenderTableTree);
