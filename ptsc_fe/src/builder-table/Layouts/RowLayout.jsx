import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Collapse,
  Tooltip,
  Stack,
  Grid
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useRegistry } from '@builder-table/context/RegistryContext';
import ElementWrapper from '@builder-table/components/ElementWrapper';
import PropTypes from 'prop-types';
import CustomAccordion from '@components/DynamicForm/CustomAccordion';
import { useDragAndDrop } from '@builder-table/hooks/useDragAndDrop';
import { ColumnGridItem, EmptyColumnBox, RowActionsBox, RowActionsBoxV2, RowActionsBoxV3, RowActionsGrid, RowActionsTypography, RowActionsTypographyV2, RowActionsTypographyV3 } from './RowLayout.styles';
// import { DragContext } from '../context/DragContext';


export const ConfigCollapse = ({ title, children }) => {
  const [showConfig, setShowConfig] = useState(false);
  const handleToggleConfig = () => {
    setShowConfig((prev) => !prev);
  };
  return (
    <>
      <Stack
        // direction="row"
        // alignItems="start"
        // justifyContent="space-between"
        // mb={1}
        // padding={0}
      >
        <RowActionsTypography>{title}</RowActionsTypography>
        <Tooltip title={showConfig ? 'Ẩn cấu hình' : 'Hiện cấu hình'}>
          <IconButton onClick={handleToggleConfig}>
            {showConfig ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Tooltip>
      </Stack>

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

export default function RowLayout({ item, onDropChild, onPropChange, mode = 'builder', data, handleSetColumnConfig }) {
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

  const handleChangeColumns = (e, key) => {
    const val = e.target.value;
    if (!isNaN(val)) {
      onPropChange(item.id, 'size', { ...item.props?.size, [key]: val });
      onPropChange(item.id, 'currentSize', 'parent');
    }
  };

  const createColumnChangeHandler = (key) => (e) => {
    handleChangeColumns(e, key);
  };

  const handleChildSizeChange = (childId, key, value) => {
    if (!isNaN(value)) {
      const updatedChildren = children.map((child) => {
        if (child.id === childId) {
          return {
            ...child,
            props: {
              ...child.props,
              size: { ...child.props?.size, [key]: value }
            }
          };
        }
        return child;
      });
      onPropChange(item.id, 'children', updatedChildren);
      onPropChange(item.id, 'currentSize', 'child');

    }
  };

  const createChildSizeChangeHandler = (childId, key) => (e) => {
    handleChildSizeChange(childId, key, e.target.value);
  };

  const handleDelete = (itemToDelete) => {
    const updatedChildren = children.filter((el) => el.id !== itemToDelete.id);
    onPropChange(item.id, 'children', updatedChildren);
  };

  const createDragHandlers = (ch) => ({
    onDragStart: (e) => handleDragStart(e, ch),
    onDragOver: (e) => handleDragOver(e, ch),
    onDragLeave: handleDragLeave,
    onDrop: (e) => handleDrop(e, ch),
  });

  const preventDefaultDragOver = (e) => {
    e.preventDefault();
  };

  const handleChangeTitleLayout = (value) => {
    onPropChange(item.id, 'title', value);
  };

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
    <CustomAccordion
      mode={mode}
      defaultExpanded
      title={item.props?.title || ''}
      onTitleChange={handleChangeTitleLayout}
    >
      <Box mb={2}>
        {mode === 'builder' && (
          <ConfigCollapse title="Cấu hình lưới chung">
            <RowActionsBox
              // pb={2}
              // mb={1}
              // display="flex"
              // gap={2}
              // flexWrap="wrap"
              // alignItems="center"
            >
              {['xs', 'sm', 'md', 'lg'].map((key) => (
                <RowActionsBoxV2 key={key}>
                  <RowActionsTypographyV2>
                    {sizeLabels[key]}:
                  </RowActionsTypographyV2>
                  <TextField
                    type="number"
                    size="small"
                    value={item.props?.size?.[key] || ''}
                    onChange={createColumnChangeHandler(key)}
                    onKeyDown={handleKeyDown}
                    inputProps={{ min: 1, max: 12, style: { width: 60 } }}
                  />
                </RowActionsBoxV2>
              ))}
              <RowActionsTypographyV3 variant="caption">
                Tổng số cột mỗi hàng là 12
              </RowActionsTypographyV3>
            </RowActionsBox>
          </ConfigCollapse>
        )}

        <RowActionsGrid
          container
          spacing={2}
          onDragOver={preventDefaultDragOver}
          onDrop={handleDropNewItem}
          // sx={{
          //   transition: 'background-color 0.2s',
          // }}
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

              const configContent = (
                <Box>
                  {['xs', 'sm', 'md', 'lg'].map((key) => (
                    <RowActionsBoxV3 key={key} mt={0.5}>
                      <RowActionsTypographyV2>
                        {sizeLabels[key]}:
                      </RowActionsTypographyV2>
                      <TextField
                        type="number"
                        size="small"
                        value={ch.props?.size?.[key] || item.props?.size?.[key] || ''}
                        onChange={createChildSizeChangeHandler(ch.id, key)}
                        onKeyDown={handleKeyDown}
                        inputProps={{ min: 1, max: 12, style: { width: 60 } }}
                      />
                    </RowActionsBoxV3>
                  ))}
                  <RowActionsTypographyV3 variant="caption">
                    Cấu hình riêng sẽ ghi đè cấu hình chung
                  </RowActionsTypographyV3>
                </Box>
              );

              return (
                <>
                  <ColumnGridItem
                    item
                    {...(item.props?.currentSize === 'child'
                      ? (ch.props?.size || item.props?.size || { xs: 6 })
                      : (item.props?.size || ch.props?.size || { xs: 6 }))}
                    key={ch.id}
                    draggable={mode === 'builder'}
                    {...createDragHandlers(ch)}
                    dragOverId={dragOverId}
                    chId={ch.id}
                    mode={mode}
                    // sx={{
                    //   minHeight: 50,
                    //   cursor: mode === 'builder' ? 'grab' : 'default',
                    //   transition: 'background-color 0.2s',
                    //   border: dragOverId === ch.id ? '2px dashed #3f51b5' : 'none',
                    //   pr: 2,
                    // }}
                  >
                    {mode === 'builder' ? (
                      <ElementWrapper
                        item={ch}
                        onDelete={handleDelete}
                        {...createDragHandlers(ch)}
                      >
                        {content}
                        {configContent}
                      </ElementWrapper>
                    ) : (
                      content
                    )}
                  </ColumnGridItem>
                </>
              );
            })
          ) : (
            <Grid item xs={12}>
              <EmptyColumnBox
                // sx={{
                //   textAlign: 'center',
                //   color: '#aaa',
                //   minHeight: 80,
                //   border:
                //     dragOverId === null && mode === 'builder'
                //       ? '2px dashed #3f51b5'
                //       : 'none',
                //   display: 'flex',
                //   alignItems: 'center',
                //   justifyContent: 'center',
                //   width: '100%',
                //   pr: 2,
                // }}
                dragOverId={dragOverId}
                mode={mode}
                onDragOver={preventDefaultDragOver}
                onDrop={handleDropNewItem}
              >
                {mode === 'builder' ? 'Kéo vào đây' : null}
              </EmptyColumnBox>
            </Grid>
          )}

          {/* {isDrag && children.length > 0 ?
            <Grid
              item
              {...(item.props?.size ?? { xs: 6 })}
              sx={{
                height: 111,
                cursor: mode === 'builder' ? 'grab' : 'default',
                transition: 'background-color 0.2s',
                // border: '2px dashed #3f51b5',
                pr: 2,
                display:'flex',
                alignItems:'center',
                justifyContent:'center'
              }}  
            >
            </Grid>
            : null} */}
        </RowActionsGrid>
      </Box>
    </CustomAccordion>
  );
}

RowLayout.propTypes = {
  item: PropTypes.object.isRequired,
  onDropChild: PropTypes.func,
  onPropChange: PropTypes.func,
  mode: PropTypes.oneOf(['builder', 'preview']),
	data: PropTypes.object,
	handleSetColumnConfig: PropTypes.func,
};
