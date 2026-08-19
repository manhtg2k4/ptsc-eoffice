import React, { memo, useCallback, useMemo } from 'react'
import { Tooltip } from '@mui/material'

import {
    SortableTree,
    changeNodeAtPath,
    removeNodeAtPath,
    addNodeUnderParent,
} from '@peteranderss0n/react-sortable-tree'
import {
    TreeContainer,
    TreeNodeWrapper,
    TreeNodeTitleInput,
    TreeNodeActionsWrapper,
    TreeNodeIconButton,
    GlobalTreeStyles,
    StyleBoxNode,
    TreeNodeDuration,
    TreeNodeContentContainer,
    StyledTreeNodeContentColumn,
    StyledTreeNodeDependencyText
} from '@styles/TreeView/TreeView.styles'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit';
import { calculateOwnNodeDuration, formatMinutesToText, flattenTree, syncAllDurations } from '../../pages/TemplateSample/utils';

// Component đại diện cho nội dung của từng node
const TreeNodeContent = memo(({ node, path, onTitleChange, onCopy, onRemove, onEdit, allTasksMap }) => {

    const handleChange = useCallback((e) => {
        onTitleChange(path, e.target.value)
    }, [onTitleChange, path])

    const handleDuplicate = useCallback(() => {
        onCopy(node, path)
    }, [onCopy, node, path])

    const handleDelete = useCallback(() => {
        onRemove(path)
    }, [onRemove, path])

    const handleOpenEdit = useCallback(() => {
        if (onEdit) {
            onEdit(node, path);
        }
    }, [onEdit, node, path])

    return (
        <TreeNodeContentContainer>
            <TreeNodeWrapper>
                <StyleBoxNode>
                    <StyledTreeNodeContentColumn>
                        <Tooltip title={node.title || ''} placement="top" arrow>
                            <TreeNodeTitleInput
                                value={node.title || ''}
                                onChange={handleChange}
                            />
                        </Tooltip>
                        {node.dependency && allTasksMap[node.dependency] && (
                            <Tooltip title={allTasksMap[node.dependency]} placement="bottom" arrow>
                                <StyledTreeNodeDependencyText variant="caption">
                                    Phụ thuộc: {allTasksMap[node.dependency]}
                                </StyledTreeNodeDependencyText>
                            </Tooltip>
                        )}
                    </StyledTreeNodeContentColumn>
                </StyleBoxNode>

                <TreeNodeActionsWrapper>
                    <TreeNodeIconButton
                        size="small"
                        onClick={handleOpenEdit}
                        title="Chỉnh sửa công việc"
                    >
                        <EditIcon />
                    </TreeNodeIconButton>
                    <TreeNodeIconButton
                        size="small"
                        onClick={handleDuplicate}
                        title="Nhân bản công việc"
                    >
                        <ContentCopyIcon />
                    </TreeNodeIconButton>
                    <TreeNodeIconButton
                        size="small"
                        onClick={handleDelete}
                        title="Xóa công việc"
                    >
                        <DeleteIcon />
                    </TreeNodeIconButton>
                </TreeNodeActionsWrapper>
            </TreeNodeWrapper>

            <TreeNodeDuration>
                {formatMinutesToText(calculateOwnNodeDuration(node))}
            </TreeNodeDuration>
        </TreeNodeContentContainer>
    )
})

TreeNodeContent.displayName = 'TreeNodeContent'

// TreeView hiển thị và chỉnh sửa cây công việc bằng react-sortable-tree
const TreeView = ({ treeData, setTreeData, onEdit }) => {
    const getNodeKey = useCallback(({ treeIndex }) => treeIndex, [])

    const allTasksMap = useMemo(() => {
        const flat = flattenTree(treeData);
        return flat.reduce((acc, curr) => {
            acc[curr.id || curr._id] = curr.name || curr.title;
            return acc;
        }, {});
    }, [treeData]);

    const handleTitleChange = useCallback(
        (path, newTitle) => {
            setTreeData(prev => {
                const newTree = changeNodeAtPath({
                    treeData: prev,
                    path,
                    getNodeKey,
                    newNode: ({ node }) => ({
                        ...node,
                        title: newTitle,
                        name: newTitle,
                    }),
                });
                return syncAllDurations(newTree);
            })
        },
        [getNodeKey, setTreeData],
    )

    const handleAddChild = useCallback(
        (path) => {
            setTreeData(prev => {
                const result = addNodeUnderParent({
                    treeData: prev,
                    parentKey: path[path.length - 1],
                    getNodeKey,
                    expandParent: true,
                    newNode: {
                        title: 'Công việc con',
                        name: 'Công việc con',
                        children: [],
                        expanded: true,
                    },
                })

                return syncAllDurations(result.treeData)
            })
        },
        [getNodeKey, setTreeData],
    )

    const handleRemove = useCallback(
        (path) => {
            setTreeData(prev =>
                removeNodeAtPath({
                    treeData: prev,
                    path,
                    getNodeKey,
                }),
            )
        },
        [getNodeKey, setTreeData],
    )

    const resetNodeIds = useCallback((node) => {
        // eslint-disable-next-line no-unused-vars
        const { id, _id, dependency, ...rest } = node;
        return {
            ...rest,
            id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            dependency: "", // Reset phụ thuộc khi sao chép
            children: Array.isArray(node.children)
                ? node.children.map(child => resetNodeIds(child))
                : [],
        };
    }, []);

    const handleCopy = useCallback(
        (node, path) => {
            setTreeData(prev => {
                const parentKey = path.length > 1 ? path[path.length - 2] : null

                const result = addNodeUnderParent({
                    treeData: prev,
                    parentKey,
                    getNodeKey,
                    expandParent: true,
                    newNode: resetNodeIds(node),
                })

                return syncAllDurations(result.treeData)
            })
        },
        [getNodeKey, setTreeData, resetNodeIds],
    )

    const handleTreeChange = useCallback((newTreeData) => {
        setTreeData(syncAllDurations(newTreeData));
    }, [setTreeData]);

    return (
        <>
            <TreeContainer>
                <style>{GlobalTreeStyles}</style>
                <SortableTree
                    treeData={treeData}
                    onChange={handleTreeChange}
                    generateNodeProps={({ node, path }) => ({
                        title: (
                            <TreeNodeContent
                                node={node}
                                path={path}
                                onTitleChange={handleTitleChange}
                                onAddChild={handleAddChild}
                                onCopy={handleCopy}
                                onRemove={handleRemove}
                                onEdit={onEdit}
                                allTasksMap={allTasksMap}
                            />
                        ),
                    })}
                />
            </TreeContainer>
        </>
    )
}

export default memo(TreeView)

