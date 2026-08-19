import React, { useState } from 'react';
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
  ExtraMoreVertIconx,
  ExtraDeleteIcon,
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

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteClick = () => {
    onDelete(item);
    handleClose();
  };

  const handleDragStart = (e) => onDragStart?.(e, item);
  const handleDrop = (e) => onDrop?.(e, item);
  const handleDragOver = (e) => {
    e.preventDefault();
    onDragOver?.(e, item);
  };
  const handleDragLeave = (e) => onDragLeave?.(e, item);

  return (
    <WrapperDiv
      draggable
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
              <ExtraMoreVertIconx/>
            </ConfigIconButton>
          </Tooltip>
          <Menu
            id="config-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'config-button',
            }}
          >
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