import React, { useState } from "react";
import {
  IconButton,
  Collapse,
  Tooltip,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useRegistry } from "@builder-popup/context/RegistryContext";
import ElementWrapper from "@builder-popup/components/ElementWrapper";
import PropTypes from "prop-types";
import CustomAccordion from "@components/DynamicForm/CustomAccordion";
import { useDragAndDrop } from "@builder-popup/hooks/useDragAndDrop";
import {
  ConfigCollapseContainer,
  MainContainer,
  ChildrenGridContainer,
  ChildConfigContainer,
  ChildConfigItem,
  SizeLabel,
  SizeInput,
  HelperText,
  ChildGridItem,
  EmptyDropZoneGrid,
  EmptyDropZone,
  HelperTextRow,
} from "./RowLayout.styles";
// import { DragContext } from '../context/DragContext';

export const ConfigCollapse = ({ title, children }) => {
  const [showConfig, setShowConfig] = useState(false);
  const handleToggleConfig = () => {
    setShowConfig((prev) => !prev);
  };
  return (
    <>
      <ConfigCollapseContainer>
        <HelperTextRow>{title}</HelperTextRow>
        <Tooltip title={showConfig ? "Ẩn cấu hình" : "Hiện cấu hình"}>
          <IconButton onClick={handleToggleConfig} >
            {showConfig ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Tooltip>
      </ConfigCollapseContainer>

      <Collapse in={showConfig}>{children}</Collapse>
    </>
  );
};

ConfigCollapse.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default function RowLayout({
  item,
  onDropChild,
  onPropChange,
  mode = "builder",
  data,
  disabled,
  // ...rest
}) {

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
    (updatedChildren) => onPropChange(item.id, "children", updatedChildren),
    (type) => onDropChild(item.id, type)
  );

  const handleChangeColumns = (e, key) => {
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
    onPropChange(item.id, "children", updatedChildren);
  };

  const handleChangeTitleLayout = (value) => {
    onPropChange(item.id, "title", value);
  };

  const sizeLabels = {
    xs: "Điện thoại",
    sm: "Máy tính bảng",
    md: "Laptop",
    lg: "Màn hình lớn",
  };

  const handleKeyDown = (e) => {
    if (["ArrowUp", "ArrowDown"].includes(e.key)) {
      e.stopPropagation();
    }
  };
  const handlePreventDefault = (e) => {
    e.preventDefault();
  };

  // Higher-order functions for drag events
  const dragStartHandler = (item) => (e) => handleDragStart(e, item);
  const dragOverHandler = (item) => (e) => handleDragOver(e, item);
  const dropHandler = (item) => (e) => handleDrop(e, item);

  return (
    <CustomAccordion
      mode={mode}
      defaultExpanded
      title={item.props?.title || ""}
      onTitleChange={handleChangeTitleLayout}
      item={item}
      onKeyDown={handleKeyDown}
      onSizeChange={handleChangeColumns}
    >
      <MainContainer>
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
                  items={children}
                  onDropChild={onDropChild}
                  onPropChange={onPropChange}
                  mode={mode}
                  data={data}
                  disabled={disabled}
                />
              );

              const configContent = (
                <ChildConfigContainer>
                  {["xs", "sm", "md", "lg"].map((key) => (
                    <ChildConfigItem key={key}>
                      <SizeLabel>
                        {sizeLabels[key]}:
                      </SizeLabel>
                      <SizeInput
                        type="number"
                        size="small"
                        value={
                          ch.props?.size?.[key] || item.props?.size?.[key] || ""
                        }
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
                  <ChildGridItem
                    item
                    {...(item.props?.currentSize === "child"
                      ? ch.props?.size || item.props?.size || { xs: 6 }
                      : item.props?.size || ch.props?.size || { xs: 6 })}
                    key={ch.id}
                    draggable={mode === 'builder'}
                    onDragStart={dragStartHandler(ch)}
                    onDragOver={dragOverHandler(ch)}
                    onDragLeave={handleDragLeave}
                    onDrop={dropHandler(ch)}
                    isDraggingOver={dragOverId === ch.id}
                    mode={mode}
                  >
                    {mode === "builder" ? (
                      <ElementWrapper
                        item={ch}
                        items={children}
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
                {mode === "builder" ? "Kéo vào đây" : null}
              </EmptyDropZone>
            </EmptyDropZoneGrid>
          )}

        </ChildrenGridContainer>
      </MainContainer>
    </CustomAccordion>
  );
}

RowLayout.propTypes = {
  item: PropTypes.object.isRequired,
  onDropChild: PropTypes.func,
  onPropChange: PropTypes.func,
  data: PropTypes.object,
  mode: PropTypes.oneOf(["builder", "preview"]),
};
