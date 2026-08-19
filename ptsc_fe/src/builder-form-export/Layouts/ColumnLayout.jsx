import React from 'react';
import { useRegistry } from '@builder-form-export/context/RegistryContext';
// import { Box } from '@mui/material';
import ElementWrapper from '@builder-form-export/components/ElementWrapper';
import PropTypes from 'prop-types';
import CustomAccordion from '@components/CustomDialog/CustomAccordion';
import { useDragAndDrop } from '@builder-form-export/hooks/useDragAndDrop';
import {
  MainContainer,
  SizeConfigContainer,
  SizeConfigItem,
  SizeLabel,
  SizeInput,
  ChildrenContainer,
  ChildItemWrapper,
  EmptyDropZone,
} from './ColumnLayout.styles';

export default function ColumnLayout({
  item,
  onDropChild,
  onPropChange,
  mode = 'builder',
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
    (updatedChildren) => onPropChange(item.id, 'children', updatedChildren),
    (type) => onDropChild(item.id, type)
  );

  const handleChangeSize = (key) => (e) => {
		const val = e.target.value;
		if (!isNaN(val)) {
			onPropChange(item.id, "size", { ...item.props?.size, [key]: val });
		}
	};

  const handleDelete = (itemToDelete) => {
    const updatedChildren = children.filter((el) => el.id !== itemToDelete.id);
    onPropChange(item.id, 'children', updatedChildren);
  };

  const handlePreventDefault = (e) => {
    e.preventDefault();
  };

  // Higher-order functions for drag events
  const dragStartHandler = (item) => (e) => handleDragStart(e, item);
  const dragOverHandler = (item) => (e) => handleDragOver(e, item);
  const dropHandler = (item) => (e) => handleDrop(e, item);

  return (
    <CustomAccordion defaultExpanded title="Thông tin cột">
      <MainContainer>
        {mode === 'builder' && (
          <SizeConfigContainer>
            {['xs', 'sm', 'md', 'lg'].map((key) => (
              <SizeConfigItem key={key}>
                <SizeLabel>{key}:</SizeLabel>
                <SizeInput
                  type="number"
                  size="small"
                  value={item.props?.size?.[key] || ''}
                  onChange={handleChangeSize(key)}
                  inputProps={{ min: 1 }}
                />
              </SizeConfigItem>
            ))}
          </SizeConfigContainer>
        )}

        <ChildrenContainer
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
                />
              );

              return (
                <ChildItemWrapper
                  key={ch.id}
                  draggable={mode === 'builder'}
                  onDragStart={dragStartHandler(ch)}
                  onDragOver={dragOverHandler(ch)}
                  onDragLeave={handleDragLeave}
                  onDrop={dropHandler(ch)}
                  isDraggingOver={dragOverId === ch.id}
                  iswidth={item.props?.size?.xs || '100%'}
                  ismaxWidth={item.props?.size?.lg || '100%'}
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
                    >
                      {content}
                    </ElementWrapper>
                  ) : (
                    content
                  )}
                </ChildItemWrapper>
              );
            })
          ) : (
            <EmptyDropZone
              isDraggingOver={dragOverId}
              mode={mode}
              onDragOver={handlePreventDefault}
              onDrop={handleDropNewItem}
            >
              {mode === 'builder' ? 'Kéo component vào đây' : null}
            </EmptyDropZone>
          )}
        </ChildrenContainer>
      </MainContainer>
    </CustomAccordion>
  );
}

ColumnLayout.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.string.isRequired,
    props: PropTypes.shape({
      size: PropTypes.object,
      children: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
          type: PropTypes.string.isRequired,
          props: PropTypes.object,
        })
      ),
    }),
  }).isRequired,
  onDropChild: PropTypes.func.isRequired,
  onPropChange: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['builder', 'preview']),
};

ColumnLayout.defaultProps = {
  mode: 'builder',
};