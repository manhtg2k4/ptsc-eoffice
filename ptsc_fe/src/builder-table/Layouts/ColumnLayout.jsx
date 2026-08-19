import React from 'react';
import { useRegistry } from '@builder-table/context/RegistryContext';
import { Box, TextField } from '@mui/material';
import ElementWrapper from '@builder-table/components/ElementWrapper';
import PropTypes from 'prop-types';
import CustomAccordion from '@components/CustomDialog/CustomAccordion';
import { useDragAndDrop } from '@builder-table/hooks/useDragAndDrop';
import { ColumnActions, ColumnActionsTypography, ColumnActionsV2, ColumnActionsV3, ColumnActionsV4, EmptyColumnBox } from './ColumnLayout.styles';

export default function ColumnLayout({
  item,
  onDropChild,
  onPropChange,
	mode = 'builder',
	data,
	handleSetColumnConfig
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

  const handleChangeSize = (e, key) => {
    const val = e.target.value;
    if (!isNaN(val)) {
      onPropChange(item.id, 'size', { ...item.props?.size, [key]: val });
    }
  };

  const handleDelete = (itemToDelete) => {
    const updatedChildren = children.filter((el) => el.id !== itemToDelete.id);
    onPropChange(item.id, 'children', updatedChildren);
  };
  const preventDefaultDragOver = (e) => {
    e.preventDefault();
  };

  const createChangeHandler = (key) => (e) => {
    handleChangeSize(e, key);
  };

  const createDragHandlers = (ch) => ({
    onDragStart: (e) => handleDragStart(e, ch),
    onDragOver: (e) => handleDragOver(e, ch),
    onDragLeave: handleDragLeave,
    onDrop: (e) => handleDrop(e, ch),
  });

  return (
    <CustomAccordion defaultExpanded title="Thông tin cột">
      <Box mb={2}>
        {mode === 'builder' && (
          <ColumnActions pb={2} mb={1}>
            {['xs', 'sm', 'md', 'lg'].map((key) => (
              <ColumnActionsV2 key={key}>
                <ColumnActionsTypography>{key}:</ColumnActionsTypography>
                <TextField
                  type="number"
                  size="small"
                  value={item.props?.size?.[key] || ''}
                  onChange={createChangeHandler(key)}
                  inputProps={{ min: 1, style: { width: 60 } }}
                />
              </ColumnActionsV2>
            ))}
          </ColumnActions>
        )}

        <ColumnActionsV3
          // sx={{
          //   display: 'flex',
          //   flexDirection: 'column',
          //   gap: 2,
          //   // backgroundColor: dragOverId === null && mode === 'builder' ? '#f0f0f0' : 'transparent',
          //   transition: 'background-color 0.2s',
          //   minHeight: 80,
          //   p: 2,
          // }}
          onDragOver={preventDefaultDragOver}
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
									handleSetColumnConfig={handleSetColumnConfig}
                />
              );

              return (
                <ColumnActionsV4
                  key={ch.id}
                  draggable={mode === 'builder'}
                  {...createDragHandlers(ch)}
                  isminHeight={50}
                  iscursor={mode === 'builder' ? 'grab' : 'default'}
                  istransition="background-color 0.2s"
                  isborder={dragOverId === ch.id ? '2px dashed #3f51b5' : 'none'}
                  iswidth={item.props?.size?.xs || '100%'}
                  ismaxWidth={item.props?.size?.lg || '100%'}
                >
                  {mode === 'builder' ? (
                    <ElementWrapper
                      item={ch}
                      onDelete={handleDelete}
                      {...createDragHandlers(ch)}
                    >
                      {content}
                    </ElementWrapper>
                  ) : (
                    content
                  )}
                </ColumnActionsV4>
              );
            })
          ) : (
            <EmptyColumnBox
              // sx={{
              //   textAlign: 'center',
              //   color: '#aaa',
              //   minHeight: 80,
              //   border: dragOverId === null && mode === 'builder' ? '2px dashed #3f51b5' : 'none',
              //   display: 'flex',
              //   alignItems: 'center',
              //   justifyContent: 'center',
              //   width: '100%',
              // }}
              onDragOver={preventDefaultDragOver}
              onDrop={handleDropNewItem}
            >
              {mode === 'builder' ? 'Kéo component vào đây' : null}
            </EmptyColumnBox>
          )}
        </ColumnActionsV3>
      </Box>
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
	data: PropTypes.object,
	handleSetColumnConfig: PropTypes.func,
};

ColumnLayout.defaultProps = {
  mode: 'builder',
};