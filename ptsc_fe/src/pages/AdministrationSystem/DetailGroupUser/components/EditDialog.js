import React, { useCallback, useEffect, useState } from "react";
import { Box, Checkbox, Divider, TextField, styled } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { ExpandMore, ChevronRight } from "@mui/icons-material";
import PropTypes from "prop-types";
import { removeVietnameseTones } from "@pages/AdministrationSystem/DetailGroupUser/utilsDistrict";

const INDENT_SIZE = 20;
const ICON_SIZE = 24;

const DialogContainer = styled(Box)({
  padding: 0,
  borderRadius: "8px",
});

const SearchContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  marginBottom: '15px',
});

const SearchTitle = styled('div')(({ theme }) => ({
  fontWeight: 500,
  fontSize: theme.typography.subtitle1.fontSize,
  color: theme.palette.text.primary,
  minWidth: 110,
}));

const SearchTextField = styled(TextField)(({ theme }) => ({
  margin: 0,
  background: theme.palette.action.hover,
  borderRadius: '6px',
  maxWidth: 350,
  '& .MuiInputBase-input': {
    fontSize: theme.typography.body2.fontSize,
    padding: '8px 12px',
  },
}));

const TreeHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 19px 0 24px',
  minHeight: 40,
});

const TreeTitle = styled('div')(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: theme.typography.subtitle1.fontSize,
  color: theme.palette.text.primary,
}));

const StyledCheckbox = styled(Checkbox)(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&.Mui-checked': {
    color: theme.palette.primary.main,
  },
}));

const TreeContainer = styled('div')({
  maxHeight: '420px',
  overflowY: 'auto',
  padding: '0 8px',
  // background: '#fff', // Xóa màu nền cố định
  borderRadius: '8px',
});

const TreeNodeContainer = styled('div')({
  position: "relative",
});

const TreeNodeRow = styled('div')(({ theme, isParent, level, isEven }) => ({
  cursor: "pointer",
  fontWeight: isParent ? 600 : 400,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 10px 8px 0",
  borderRadius: isParent ? "0" : "6px",
  position: "relative",
  marginBottom: '2px',
  fontSize: theme.typography.body2.fontSize,
  background: isParent ? theme.palette.action.hover : (isEven ? theme.palette.background.paper : theme.palette.action.hover),
  borderBottom: !isParent ? "1px solid #f0f0f0" : 'none',
  borderTop: isParent && level === 0 ? "1px solid #e0e0e0" : 'none',
  minHeight: 40,
  transition: "background 0.2s",
  '&:hover': {
    background: theme.palette.action.hover,
  },
}));

const TreeNodeContent = styled('div')(({ indent }) => ({
  display: "flex",
  alignItems: "center",
  flexGrow: 1,
  paddingLeft: `${indent}px`,
}));

const TreeNodeToggle = styled('span')(({ theme }) => ({
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: ICON_SIZE,
  height: ICON_SIZE,
  marginRight: "8px",
  zIndex: 1,
  color: theme.palette.text.secondary,
  transition: "color 0.2s",
  '&:hover': {
    color: theme.palette.primary.main,
  },
}));

const TreeNodeLabel = styled('span')(({ isParent }) => ({
  paddingLeft: "4px",
  flexGrow: 1,
  color: 'inherit', // Kế thừa màu từ TreeNodeRow
  fontWeight: isParent ? 600 : 400,
}));

const IndentSpacer = styled('span')({
  width: ICON_SIZE + 8,
});

const VerticalLine = styled('div')(({ indent }) => ({
  marginLeft: `${indent + 24}px`,
  borderLeft: '1px solid #e0e0e0',
  minHeight: 10,
}));

const SmallExpandMoreIcon = styled(ExpandMore)(({ theme }) => ({
  fontSize: theme.typography.pxToRem(20),
}));

const SmallChevronRightIcon = styled(ChevronRight)(({ theme }) => ({
  fontSize: theme.typography.pxToRem(20),
}));


const buildTree = (flatData) => {
  const map = new Map();
  flatData.forEach((item) => map.set(item._id, { ...item, children: [] }));

  const tree = [];
  flatData.forEach((item) => {
    if (item.parent) {
      const parent = map.get(item.parent);
      if (parent) {
        parent?.children.push(map.get(item._id));
      } else {
        
        tree.push(map.get(item._id)); 
       }
    } else {
      tree.push(map.get(item._id));
    }
  });

  return tree;
};

const EditDialog = ({
  open,
  onClose,
  onSave,
  isLoading,
  listUnit,
  listGroupUnit
}) => {
  const [selectAll, setSelectAll] = useState();
  const [expandedNodes, setExpandedNodes] = useState({});
  const treeData = buildTree(listUnit);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodes, setSelectedNodes] = useState({});

  // const handleCheckboxChange = (nodeId) => {
  //   const updatedSelected = { ...selectedNodes };

  //   const findNodeById = (nodes, id) => {
  //     for (let node of nodes) {
  //       if (node._id === id) return node;
  //       if (node.children) {
  //         const result = findNodeById(node.children, id);
  //         if (result) return result;
  //       }
  //     }
  //     return null;
  //   };

  //   const updateChildrenSelection = (node, checked) => {
  //     updatedSelected[node._id] = checked;
  //     node.children?.forEach((child) => updateChildrenSelection(child, checked));
  //   };

  //   const updateParentSelection = (nodeId, nodes, parentMap) => {
  //     const parentId = parentMap[nodeId];
  //     if (!parentId) return;

  //     const parentNode = findNodeById(nodes, parentId);
  //     if (!parentNode) return;

  //     const allChildrenSelected = parentNode.children.every(
  //       (child) => updatedSelected[child._id]
  //     );

  //     if (allChildrenSelected) {
  //       updatedSelected[parentNode._id] = true;
  //     } else {
  //       updatedSelected[parentNode._id] = false;
  //     }

  //     updateParentSelection(parentNode._id, nodes, parentMap); // đệ quy lên tiếp
  //   };

  //   const buildParentMap = (nodes, parent = null, map = {}) => {
  //     nodes.forEach((node) => {
  //       if (parent) {
  //         map[node._id] = parent._id;
  //       }
  //       if (node.children) {
  //         buildParentMap(node.children, node, map);
  //       }
  //     });
  //     return map;
  //   };

  //   const node = findNodeById(treeData, nodeId); // treeData là root cây
  //   if (!node) return;

  //   const isChecked = !updatedSelected[nodeId];

  //   // 1. Chọn / bỏ chọn cả con
  //   updateChildrenSelection(node, isChecked);

  //   // 2. Cập nhật cha nếu cần
  //   const parentMap = buildParentMap(treeData);
  //   updateParentSelection(node._id, treeData, parentMap);

  //   // 3. Cập nhật state
  //   setSelectedNodes(updatedSelected);
  // };

  const handleCheckboxChange = useCallback(
  (nodeId) => {
    const updatedSelected = { ...selectedNodes };

    const findNodeById = (nodes, id) => {
      for (let node of nodes) {
        if (node._id === id) return node;
        if (node.children) {
          const result = findNodeById(node.children, id);
          if (result) return result;
        }
      }
      return null;
    };

    const updateChildrenSelection = (node, checked) => {
      updatedSelected[node._id] = checked;
      node.children?.forEach((child) => updateChildrenSelection(child, checked));
    };

    const updateParentSelection = (nodeId, nodes, parentMap) => {
      const parentId = parentMap[nodeId];
      if (!parentId) return;

      const parentNode = findNodeById(nodes, parentId);
      if (!parentNode) return;

      const allChildrenSelected = parentNode.children.every(
        (child) => updatedSelected[child._id]
      );

      updatedSelected[parentNode._id] = allChildrenSelected;

      updateParentSelection(parentNode._id, nodes, parentMap);
    };

    const buildParentMap = (nodes, parent = null, map = {}) => {
      nodes.forEach((node) => {
        if (parent) map[node._id] = parent._id;
        if (node.children) buildParentMap(node.children, node, map);
      });
      return map;
    };

    const node = findNodeById(treeData, nodeId);
    if (!node) return;

    const isChecked = !updatedSelected[nodeId];
    updateChildrenSelection(node, isChecked);

    const parentMap = buildParentMap(treeData);
    updateParentSelection(node._id, treeData, parentMap);

    setSelectedNodes(updatedSelected);
  },
  [selectedNodes, treeData]
);

  useEffect(() => {
  if (open && listGroupUnit.length > 0) {
    const mapped = {};
    listGroupUnit.forEach(item => {
      mapped[item._id] = true;
    });
    setSelectedNodes(mapped);
  }
}, [open, listGroupUnit]);



  // const toggleNode = (id) => {
  //   setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  // };

  const toggleNode = useCallback((id) => {
  setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
}, [setExpandedNodes]);

  const flattenNodes = (nodes) => {
    let result = [];
    nodes.forEach(node => {
      result.push(node);
      if (node.children) {
        result = result.concat(flattenNodes(node.children));
      }
    });
    return result;
  };
  const handleSelectAll = () => {
    setSelectAll((prev) => {
      const newSelectAll = !prev;

      // Cập nhật toàn bộ selectedNodes dựa trên newSelectAll
      const newSelectedNodes = {};
      if (newSelectAll) {
        flattenNodes(treeData).forEach(node => {
          newSelectedNodes[node._id] = true;
        });
      }

      setSelectedNodes(newSelectedNodes);
      return newSelectAll;
    });
  };

  const handleToggleNode = useCallback((nodeId) => (e) => {
  e.stopPropagation();
  toggleNode(nodeId);
}, [toggleNode]);

const handleCheckboxChangeStable = useCallback(
  (id) => () => {
    handleCheckboxChange(id);
  },
  [handleCheckboxChange]
);


  const renderTree = (nodes, level = 0) => {
    return nodes.map((node, index) => {
      const indent = level * INDENT_SIZE;
      const hasChildren = node?.children?.length > 0;
      const isExpanded = expandedNodes[node._id];
      const isParent = hasChildren;
      return (
        <TreeNodeContainer key={node._id}>
          <TreeNodeRow isParent={isParent} level={level} isEven={index % 2 === 0}>
            <TreeNodeContent indent={indent}>
              {hasChildren ? (
                <TreeNodeToggle
                  // onClick={e => {
                  //   e.stopPropagation();
                  //   toggleNode(node._id);
                  // }}
                  onClick={handleToggleNode(node._id)}
                >
                  {expandedNodes[node._id] ? (
                    <SmallExpandMoreIcon />
                  ) : (
                    <SmallChevronRightIcon />
                  )}
                </TreeNodeToggle>
              ) : (
                <IndentSpacer />
              )}
              <TreeNodeLabel isParent={isParent}>
                {node.name}
              </TreeNodeLabel>
            </TreeNodeContent>
            <StyledCheckbox
              checked={!!selectedNodes[node._id]}
              // onChange={() => handleCheckboxChange(node._id)}
              onChange={handleCheckboxChangeStable(node._id)}
            />
          </TreeNodeRow>
          {isExpanded && hasChildren && (
            <VerticalLine indent={indent} />
          )}
          {isExpanded && hasChildren && renderTree(node.children, level + 1)}
        </TreeNodeContainer>
      );
    });
  };

  const filterTree = (nodes, searchTerm) => {
    if (!searchTerm) return nodes;

    const trimmedSearchTerm = searchTerm.trim();
    const lowerSearchTerm = removeVietnameseTones(
  trimmedSearchTerm.toLowerCase().replace(/\s+/g, ' ').trim()
);

const filterRecursive = (node) => {
  const nodeName = removeVietnameseTones(
    node.name.toLowerCase().replace(/\s+/g, ' ').trim()
  );

  const isMatch =
    nodeName.includes(lowerSearchTerm) ||
    lowerSearchTerm.includes(nodeName); // 👈 thêm chiều ngược lại để khớp hoàn toàn


      const filteredChildren = node.children
        ? node.children.map(filterRecursive).filter(Boolean)
        : [];

      if (isMatch || filteredChildren.length > 0) {
  // chỉ thay children, không clone toàn bộ node để giữ selectedNodes sync
  return { ...node, children: filteredChildren };
}


      return null;
    };

    return nodes.map(filterRecursive).filter(Boolean);
  };

  const filteredTree = filterTree(treeData, searchTerm);
  const handleSave = useCallback(() => {
  onSave(selectedNodes);
}, [onSave, selectedNodes]);

const handleSearchChange = useCallback((e) => {
  let value = e.target.value;
  value = value.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '');
  value = value.replace(/^\s+/, '').replace(/\s\s+/g, ' ');
  setSearchTerm(value);
}, []);


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>

      <CustomDialog
        title="Cập nhật quan hệ nhóm người dùng và đơn vị"
        open={open}
        onClose={onClose}
        // onSave={() => onSave(selectedNodes)}
        onSave={handleSave}
        type="add"
        isLoading={isLoading}
        size="md"
      >
        <DialogContainer>
          <SearchContainer>
            <SearchTitle>Từ khóa tìm kiếm</SearchTitle>
            <SearchTextField
              fullWidth
              size="small"
              placeholder="Tìm kiếm đơn vị..."
              variant="outlined"
              value={searchTerm}
              // onChange={e => {
              //   let value = e.target.value;
              //   value = value.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '');
              //   value = value.replace(/^\s+/, '').replace(/\s\s+/g, ' ');
              //   setSearchTerm(value);
              // }}
              onChange={handleSearchChange}
            />
          </SearchContainer>
          <TreeHeader>
            <TreeTitle>Danh sách đơn vị</TreeTitle>
            <StyledCheckbox checked={selectAll} onChange={handleSelectAll} />
          </TreeHeader>
          <Divider />
          <TreeContainer>
            {renderTree(filteredTree)}
          </TreeContainer>
        </DialogContainer>
      </CustomDialog>
    </LocalizationProvider>

  )
}
EditDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  listUnit: PropTypes.array,
  listGroupUnit: PropTypes.array,


};

export default EditDialog;