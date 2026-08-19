import React from 'react';
import { useRegistry } from '@builder-form/context/RegistryContext';
// import { Box } from '@mui/material';
import ElementWrapper from '@builder-form/components/ElementWrapper';
import PropTypes from 'prop-types';
import CustomAccordion from '@components/CustomDialog/CustomAccordion';
import { useDragAndDrop } from '@builder-form/hooks/useDragAndDrop';
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

  const handleSizeChange = (key) => (e) => {
    const { value } = e.target;
    if (!isNaN(value)) {
      onPropChange(item.id, 'size', { ...item.props?.size, [key]: value });
    }
  };

  const handleDelete = (itemToDelete) => {
    const updatedChildren = children.filter((el) => el.id !== itemToDelete.id);
    onPropChange(item.id, 'children', updatedChildren);
  };

  // Curried functions for drag and drop events
  const getDragStartHandler = (draggedItem) => (e) => handleDragStart(e, draggedItem);
  const getDragOverHandler = (draggedOverItem) => (e) => handleDragOver(e, draggedOverItem);
  const getDropHandler = (droppedOnItem) => (e) => handleDrop(e, droppedOnItem);

  // Handler to prevent default drag over behavior
  const handlePreventDefaultDragOver = (e) => e.preventDefault();

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
                  onChange={handleSizeChange(key)}
                  inputProps={{ min: 1 }}
                />
              </SizeConfigItem>
            ))}
          </SizeConfigContainer>
        )}

        <ChildrenContainer
          onDragOver={handlePreventDefaultDragOver}
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
                  onDragStart={getDragStartHandler(ch)}
                  onDragOver={getDragOverHandler(ch)}
                  onDragLeave={handleDragLeave}
                  onDrop={getDropHandler(ch)}
                  isDraggingOver={dragOverId === ch.id}
                  // width={item.props?.size?.xs || '100%'}
                  // maxWidth={item.props?.size?.lg || '100%'}
                  mode={mode}
                >
                  {mode === 'builder' ? (
                    <ElementWrapper
                      item={ch}
                      onDelete={handleDelete}
                      onDragStart={getDragStartHandler(ch)}
                      onDragOver={getDragOverHandler(ch)}
                      onDragLeave={handleDragLeave}
                      onDrop={getDropHandler(ch)}
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
              onDragOver={handlePreventDefaultDragOver}
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