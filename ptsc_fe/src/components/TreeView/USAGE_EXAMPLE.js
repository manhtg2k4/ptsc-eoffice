import React, { memo, useState, useCallback } from 'react'
import TreeView from '@components/TreeView'
import { EXAMPLE_TREE_DATA } from '@components/TreeView/constants'

/**
 * Example component showing how to use TreeView
 * 
 * Features:
 * - Drag and drop to reorder items
 * - Add/Edit/Delete/Copy tasks
 * - Expand/Collapse nodes
 * - Real-time data updates
 */
const TreeViewExample = () => {
  const [treeData, setTreeData] = useState(EXAMPLE_TREE_DATA)

  const handleDataChange = useCallback((newData) => {
    logger.log('Tree data changed:', newData)
    setTreeData(newData)
  }, [])

  const handleEdit = useCallback((node) => {
    logger.log('Edit node:', node)
    // Open edit dialog
  }, [])

  const handleDelete = useCallback((node) => {
    logger.log('Delete node:', node)
    // Show confirmation and delete
  }, [])

  const handleCopy = useCallback((node) => {
    logger.log('Copy node:', node)
    // Clone the node
  }, [])

  return (
    <TreeView
      data={treeData}
      onDataChange={handleDataChange}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onCopy={handleCopy}
      readOnly={false}
    />
  )
}

export default memo(TreeViewExample)
