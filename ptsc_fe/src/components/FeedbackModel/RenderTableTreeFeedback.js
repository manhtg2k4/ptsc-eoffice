/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { TableBody } from "@mui/material";
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
import {

  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";



// ===== Row component =====
const Row =  
  ({
    item,
    level,
    expandedUnits,
    onToggleExpand,
    assignments,
    handleCheckboxChange,
  }) => {
    const itemId = item?._id ?? item?.id;
    const hasChild = Array.isArray(item?.child) && item.child.length > 0;
    const expanded = expandedUnits[itemId];

    // Toggle expand
    const handleToggleExpand = useCallback(() => {
      onToggleExpand(itemId);
    }, [itemId, onToggleExpand]);

    // Checked state - calculate directly from assignments
    const checked = useMemo(() => {
      const isChecked = assignments[itemId]?.xinYkien === true;
      logger.log(`🔍 Row ${item.name} (${itemId}):`, {
        isChecked,
        assignments: assignments[itemId],
        fullAssignments: assignments,
      });
      return isChecked;
    }, [itemId, assignments, item.name]);

    const handleChange = useCallback(() => {
      logger.log(`🖱️ Checkbox clicked for ${item.name}`);
      handleCheckboxChange(item, "xinYkien");
    }, [item, handleCheckboxChange]);

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
          assignments={assignments}
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
      assignments,
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
                isUser={item.type === "user"}
              >
               
                <StyledNameText isColor={item.types === "user"}>
                  {item?.name}
                  {item?.position && ` - ${item.position}`}
                </StyledNameText>
              </StyledClickableBox>

              {hasChild && (
                <StyledExpandButton size="small" onClick={handleToggleExpand}>
                  {expanded ? <ExpandLess /> : <ExpandMore />}
                </StyledExpandButton>
              )}
            </StyledRowBox>
          </StyledTableCellLeft1>
          <StyledTableCellLeft align="center">
            {level > 0 && item.types === "user" && (
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
  }

// ===== RenderTableTree component =====
const RenderTableTree = ({ data, assignments, handleCheckboxChange, customHeight, customMinHeight }) => {
  const [expandedUnits, setExpandedUnits] = useState({});

  // Auto expand first two levels
  useEffect(() => {
    if (!(data && data.length > 0 && Object.keys(expandedUnits).length === 0)) {
      return;
    }
    const newExpanded = {};
    const expandTwoLevels = (list, level = 0) => {
      if (!list) return;
      for (const item of list) {
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
    <StyledTableContainer1
      customHeight={customHeight}
      customMinHeight={customMinHeight}
      noBorder
      lastColumnAlign="center"
    >
      <StyledTable stickyHeader>
        <StyledTableHead>
          <StyledTableRow>
            <StyledTableCellLarge>
              <StyledNameText>Tên đơn vị, cá nhân</StyledNameText>
            </StyledTableCellLarge>
            <StyledTableCellMedium>
              <StyledNameTextHeaderTH>Xin ý kiến</StyledNameTextHeaderTH>
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
              assignments={assignments}
              handleCheckboxChange={handleCheckboxChange}
            />
          ))}
        </TableBody>
      </StyledTable>
    </StyledTableContainer1>
  );
};

RenderTableTree.propTypes = {
  data: PropTypes.array,
  assignments: PropTypes.object.isRequired,
  handleCheckboxChange: PropTypes.func.isRequired,
};

RenderTableTree.displayName = "RenderTableTree";

export default React.memo(RenderTableTree);
