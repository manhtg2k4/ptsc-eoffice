import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Tooltip, Menu } from '@mui/material';
// import MoreVertIcon from '@mui/icons-material/MoreVert';
// import DeleteIcon from '@mui/icons-material/Delete';
import {
  WrapperDiv,
  ContentBox,
  ChildWrapperBox,
  ActionsBox,
  ConfigIconButton,
  DeleteMenuItem,
  MenuItemContentBox,
  ExtraChildBox,
  ExtraDeleteIcon,
  ExtraMoreVertIcon,
} from './ElementWrapper.styles';

function ElementWrapper({
  item,
  children,
  onDelete,
  onDragStart,
  onDrop,
  onDragOver,
  onDragLeave,
  disabledBorder
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  //   const handleClose = () => {
  //   setAnchorEl(null);
  // };

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleDeleteClick = useCallback(() => {
    onDelete(item);
    handleClose();
  }, [onDelete, item, handleClose]);

  const handleDragStart = useCallback((e) => onDragStart?.(e, item), [item, onDragStart]);

  const handleDrop = useCallback((e) => onDrop?.(e, item), [item, onDrop]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    onDragOver?.(e, item);
  }, [item, onDragOver]);

  const handleDragLeave = useCallback((e) => onDragLeave?.(e, item), [item, onDragLeave]);

  return (
    <WrapperDiv
      draggable
      // onDragStart={(e) => onDragStart?.(e, item)}
      // onDrop={(e) => onDrop?.(e, item)}
      // onDragOver={(e) => {
      //   e.preventDefault();
      //   onDragOver?.(e, item);
      // }}
      // onDragLeave={(e) => onDragLeave?.(e, item)}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      disabledBorder={disabledBorder}
    >
      <ContentBox>
        <ChildWrapperBox>{React.Children.toArray(children)[0]}</ChildWrapperBox>
        <ActionsBox>
          <Tooltip title="Tùy chỉnh">
            <ConfigIconButton
              size="small"
              onClick={handleClick}
              aria-controls={open ? 'config-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <ExtraMoreVertIcon/>
            </ConfigIconButton>
          </Tooltip>
          <Menu
            id="config-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{ 'aria-labelledby': 'config-button' }}
          >
            {/* <DeleteMenuItem onClick={() => { onDelete(item); handleClose(); }}> */}
            <DeleteMenuItem onClick={handleDeleteClick}>
              <MenuItemContentBox>
                <ExtraDeleteIcon />
                Xóa thành phần
              </MenuItemContentBox>
            </DeleteMenuItem>
            {React.Children.toArray(children).slice(1).map((child, index) => (
              <ExtraChildBox key={index}>
                {child}
              </ExtraChildBox>
            ))}
          </Menu>
        </ActionsBox>
      </ContentBox>
    </WrapperDiv>
  );
}

ElementWrapper.propTypes = {
  item: PropTypes.object.isRequired,
  children: PropTypes.node,
  onDelete: PropTypes.func,
  onDragStart: PropTypes.func,
  onDrop: PropTypes.func,
  onDragOver: PropTypes.func,
  onDragLeave: PropTypes.func,
  disabledBorder: PropTypes.bool,
};

export default ElementWrapper;