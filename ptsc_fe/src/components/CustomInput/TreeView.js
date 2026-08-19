import React from "react";
import Tree from "rc-tree";
import "rc-tree/assets/index.css"; // Import CSS mặc định
import PropTypes from "prop-types";
import { TreeViewWrapper } from "@styles/TreeView.styles";

const TreeView = ({ treeData }) => {
  return (
    <TreeViewWrapper>
      <Tree
        treeData={treeData}
        showLine // Bật đường nối
        defaultExpandAll={false}
        showIcon={false} // Tắt icon mặc định
      />
    </TreeViewWrapper>
  );
};

TreeView.propTypes = {
  treeData: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      children: PropTypes.array,
    })
  ).isRequired,
};

export default TreeView;
