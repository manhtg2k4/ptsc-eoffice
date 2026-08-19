import React, { useState } from 'react';
import { IconButton, Collapse, Tooltip } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useRegistry } from '@builder-form-export/context/RegistryContext';
import ElementWrapper from '@builder-form-export/components/ElementWrapper';
import PropTypes from 'prop-types';
import CustomAccordion from '@components/DynamicForm/CustomAccordion';
import { useDragAndDrop } from '@builder-form-export/hooks/useDragAndDrop';
import CustomDrawer from '@components/DynamicForm/CustomDrawer';
import {
    ConfigCollapseContainer,
    MainContainer,
    SizeConfigContainer,
    SizeConfigItem,
    SizeLabel,
    SizeInput,
    HelperText,
    ChildrenGridContainer,
    ChildConfigContainer,
    ChildConfigItem,
    ChildGridItem,
    EmptyDropZoneGrid,
    EmptyDropZone,
    ChildConfigTypography,
} from './DrawerLayout.styles';
// import { DragContext } from '../context/DragContext';


export const ConfigCollapse = ({ title, children }) => {
    const [showConfig, setShowConfig] = useState(false);
    const handleToggleConfig = () => {
        setShowConfig((prev) => !prev);
    };
    return (
        <>
            <ConfigCollapseContainer>
                <ChildConfigTypography>{title}</ChildConfigTypography>
                <Tooltip title={showConfig ? 'Ẩn cấu hình' : 'Hiện cấu hình'}>
                    <IconButton onClick={handleToggleConfig}>
                        {showConfig ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Tooltip>
            </ConfigCollapseContainer>

            <Collapse in={showConfig}>
                {children}
            </Collapse>
        </>
    );
};

ConfigCollapse.propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
};

export default function DrawerLayout({ item, onDropChild, onPropChange, mode = 'builder', data }) {
    const registry = useRegistry();
    const children = item.props?.children ?? [];

    const {
        dragOverId,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDropNewItem,
    } = useDragAndDrop(
        children,
        (updatedChildren) => onPropChange(item.id, 'children', updatedChildren),
        (type) => onDropChild(item.id, type)
    );

    // const { isDrag } = useContext(DragContext)

    const handleChangeColumns = (key) => (e) => {
		const val = e.target.value;
		if (!isNaN(val)) {
			onPropChange(item.id, "size", { ...item.props?.size, [key]: val });
			onPropChange(item.id, "currentSize", "parent");
		}
	};

    const handleChildSizeChange = (childId, key) => (e) => {
		const value = e.target.value;
		if (!isNaN(value)) {
			const updatedChildren = children.map((child) => {
				if (child.id === childId) {
					return {
						...child,
						props: {
							...child.props,
							size: { ...child.props?.size, [key]: value },
						},
					};
				}
				return child;
			});
			onPropChange(item.id, "children", updatedChildren);
			onPropChange(item.id, "currentSize", "child");
		}
	};

    const handleDelete = (itemToDelete) => {
        const updatedChildren = children.filter((el) => el.id !== itemToDelete.id);
        onPropChange(item.id, 'children', updatedChildren);
    };

    const handleChangeTitleLayout = (value) => {
        onPropChange(item.id, 'title', value);
    };

    const handlePreventDefault = (e) => {
        e.preventDefault();
    };

    // Higher-order functions for drag events
    const dragStartHandler = (item) => (e) => handleDragStart(e, item);
    const dragOverHandler = (item) => (e) => handleDragOver(e, item);
    const dropHandler = (item) => (e) => handleDrop(e, item);

    const sizeLabels = {
        xs: 'Điện thoại',
        sm: 'Máy tính bảng',
        md: 'Laptop',
        lg: 'Màn hình lớn',
    };

    const handleKeyDown = (e) => {
        if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.stopPropagation();
        }
    };

    return (
        <CustomDrawer open={false} title={'Test'}>
            <CustomAccordion
                mode={mode}
                defaultExpanded
                title={item.props?.title || ''}
                onTitleChange={handleChangeTitleLayout}
            >
                <MainContainer>
                    {mode === 'builder' && (
                        <ConfigCollapse title="Cấu hình lưới chung">
                            <SizeConfigContainer>
                                {['xs', 'sm', 'md', 'lg'].map((key) => (
                                    <SizeConfigItem key={key}>
                                        <SizeLabel>
                                            {sizeLabels[key]}:
                                        </SizeLabel>
                                        <SizeInput
                                            type="number"
                                            size="small"
                                            value={item.props?.size?.[key] || ''}
                                            onChange={handleChangeColumns(key)}
                                            onKeyDown={handleKeyDown}
                                            inputProps={{ min: 1, max: 12 }}
                                        />
                                    </SizeConfigItem>
                                ))}
                                <HelperText variant="caption">
                                    Tổng số cột mỗi hàng là 12
                                </HelperText>
                            </SizeConfigContainer>
                        </ConfigCollapse>
                    )}

                    <ChildrenGridContainer
                        container
                        spacing={2}
                        onDragOver={handlePreventDefault}
                        onDrop={handleDropNewItem}
                    >
                        {children.length > 0 ? (
                            children.map((ch) => {
                                const C = registry[ch.type]?.component;
                                if (!C) return null;

                                const content = (
                                    <C
                                        item={ch}
                                        onDropChild={onDropChild}
                                        onPropChange={onPropChange}
                                        mode={mode}
                                        data={data}
                                    />
                                );

                                const configContent = (
                                    <ChildConfigContainer>
                                        {['xs', 'sm', 'md', 'lg'].map((key) => (
                                            <ChildConfigItem key={key}>
                                                <SizeLabel>
                                                    {sizeLabels[key]}:
                                                </SizeLabel>
                                                <SizeInput
                                                    type="number"
                                                    size="small"
                                                    value={ch.props?.size?.[key] || item.props?.size?.[key] || ''}
                                                    onChange={handleChildSizeChange(ch.id, key)}
                                                    onKeyDown={handleKeyDown}
                                                    inputProps={{ min: 1, max: 12 }}
                                                />
                                            </ChildConfigItem>
                                        ))}
                                        <HelperText variant="caption">
                                            Cấu hình riêng sẽ ghi đè cấu hình chung
                                        </HelperText>
                                    </ChildConfigContainer>
                                );

                                return (
                                    <>
                                        <ChildGridItem
                                            item
                                            {...(item.props?.currentSize === 'child'
                                                ? (ch.props?.size || item.props?.size || { xs: 6 })
                                                : (item.props?.size || ch.props?.size || { xs: 6 }))}
                                            key={ch.id}
                                            draggable={mode === "builder"}
                                            onDragStart={dragStartHandler(ch)}
                                            onDragOver={dragOverHandler(ch)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={dropHandler(ch)}
                                            isDraggingOver={dragOverId === ch.id}
                                            mode={mode}
                                        >
                                            {mode === 'builder' ? (
                                                <ElementWrapper
                                                    item={ch}
                                                    onDelete={handleDelete}
                                                    onDragStart={dragStartHandler(ch)}
                                                    onDragOver={dragOverHandler(ch)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={dropHandler(ch)}
                                                    disabledBorder
                                                >
                                                    {content}
                                                    {configContent}
                                                </ElementWrapper>
                                            ) : (
                                                content
                                            )}
                                        </ChildGridItem>
                                    </>
                                );
                            })
                        ) : (
                            <EmptyDropZoneGrid item xs={12}>
                                <EmptyDropZone
                                    isDraggingOver={dragOverId}
                                    mode={mode}
                                    onDragOver={handlePreventDefault}
                                    onDrop={handleDropNewItem}
                                >
                                    {mode === 'builder' ? 'Kéo vào đây' : null}
                                </EmptyDropZone>
                            </EmptyDropZoneGrid>
                        )}

                    </ChildrenGridContainer>
                </MainContainer>
            </CustomAccordion>
        </CustomDrawer>
    );
}

DrawerLayout.propTypes = {
    item: PropTypes.object.isRequired,
    onDropChild: PropTypes.func,
    onPropChange: PropTypes.func,
    data: PropTypes.object,
    mode: PropTypes.oneOf(['builder', 'preview']),
};