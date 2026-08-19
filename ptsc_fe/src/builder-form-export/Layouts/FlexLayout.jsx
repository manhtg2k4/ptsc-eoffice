import React from 'react';
import { useRegistry } from '@builder-form-export/context/RegistryContext';
import { Select, MenuItem, InputLabel } from '@mui/material';
import ElementWrapper from '@builder-form-export/components/ElementWrapper';
import PropTypes from 'prop-types';
import { useDragAndDrop } from '@builder-form-export/hooks/useDragAndDrop';
import {
  LayoutContainer,
  ControlsContainer,
  StyledFormControl,
  GapControlContainer,
  GapLabel,
  GapInput,
  ChildrenContainer,
  ChildItemWrapper,
  EmptyDropZone,
} from './FlexLayout.styles';

export default function FlexLayout({
  item,
  onDropChild,
  onPropChange,
  mode = 'builder',
}) {
  const registry = useRegistry();
  const children = item.props?.children || [];

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
    (type) => {
      onDropChild(item.id, type);
    }
  );

  const handlePreventDefaultDragOver = (e) => {
    e.preventDefault();
  };

	const handleChangeProp = (propName, isNumber = false) => (e) => {
		const value = e.target.value;
		onPropChange(item.id, propName, isNumber ? Number(value) : value);
	};

  const handleDelete = (itemToDelete) => {
    const updatedChildren = children.filter((el) => el.id !== itemToDelete.id);
    onPropChange(item.id, 'children', updatedChildren);
  };

  // Higher-order functions for drag events
  const dragStartHandler = (item) => (e) => handleDragStart(e, item);
  const dragOverHandler = (item) => (e) => handleDragOver(e, item);
  const dropHandler = (item) => (e) => handleDrop(e, item);

  return (
    <LayoutContainer>
      {mode === 'builder' && (
        <ControlsContainer>
          {/* Flex Direction Control */}
          <StyledFormControl size="small">
            <InputLabel>Direction</InputLabel>
            <Select
              value={item.props?.direction || 'row'}
              label="Direction"
              onChange={handleChangeProp('direction')}
            >
              <MenuItem value="row">Row</MenuItem>
              <MenuItem value="column">Column</MenuItem>
              <MenuItem value="row-reverse">Row Reverse</MenuItem>
              <MenuItem value="column-reverse">Column Reverse</MenuItem>
            </Select>
          </StyledFormControl>

          {/* Justify Content Control */}
          <StyledFormControl size="small">
            <InputLabel>Justify Content</InputLabel>
            <Select
              value={item.props?.justifyContent || 'flex-start'}
              label="Justify Content"
              onChange={handleChangeProp('justifyContent')}
            >
              <MenuItem value="flex-start">Start</MenuItem>
              <MenuItem value="flex-end">End</MenuItem>
              <MenuItem value="center">Center</MenuItem>
              <MenuItem value="space-between">Space Between</MenuItem>
              <MenuItem value="space-around">Space Around</MenuItem>
              <MenuItem value="space-evenly">Space Evenly</MenuItem>
            </Select>
          </StyledFormControl>

          {/* Align Items Control */}
          <StyledFormControl size="small">
            <InputLabel>Align Items</InputLabel>
            <Select
              value={item.props?.alignItems || 'stretch'}
              label="Align Items"
              onChange={handleChangeProp('alignItems')}
            >
              <MenuItem value="flex-start">Start</MenuItem>
              <MenuItem value="flex-end">End</MenuItem>
              <MenuItem value="center">Center</MenuItem>
              <MenuItem value="stretch">Stretch</MenuItem>
              <MenuItem value="baseline">Baseline</MenuItem>
            </Select>
          </StyledFormControl>

          {/* Gap Control */}
          <GapControlContainer>
            <GapLabel>Gap:</GapLabel>
            <GapInput
              type="number"
              size="small"
              value={item.props?.gap || 8}
              onChange={handleChangeProp('gap', true)}
              inputProps={{ min: 0 }}
            />
          </GapControlContainer>
        </ControlsContainer>
      )}

      <ChildrenContainer
        isflexDirection={item.props?.direction}
        isjustifyContent={item.props?.justifyContent}
        isalignItems={item.props?.alignItems}
        isgap={`${item.props?.gap || 8}px`}
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
                isflex={ch.props?.flex}
                draggable={mode === 'builder'}
                onDragStart={dragStartHandler(ch)}
                onDragOver={dragOverHandler(ch)}
                onDragLeave={handleDragLeave}
                onDrop={dropHandler(ch)}
                isDraggingOver={dragOverId === ch.id}
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
            onDragOver={handlePreventDefaultDragOver}
          >
            {mode === 'builder' ? 'Kéo component vào đây' : null}
          </EmptyDropZone>
        )}
      </ChildrenContainer>
    </LayoutContainer>
  );
}

FlexLayout.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.string.isRequired,
    props: PropTypes.shape({
      direction: PropTypes.string,
      justifyContent: PropTypes.string,
      alignItems: PropTypes.string,
      gap: PropTypes.number,
      flex: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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

FlexLayout.defaultProps = {
  mode: 'builder',
};