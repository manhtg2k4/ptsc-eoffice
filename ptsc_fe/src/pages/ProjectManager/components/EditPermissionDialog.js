import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    PermissionDialogContainer,
    PermissionDialogHeader,
    PermissionHeaderRow,
    RoleBadgeBox,
    DecentralizationSubtitleText,
    PermissionItemContent,
    PermissionItemBox,
    PermissionTextContainer,
    PermissionTitleText,
    PermissionDescText,
    PermissionSwitchStyled,
    PermissionDialogActionsStyled,
    PermissionCancelBtn,
    PermissionSaveBtn,
    DecentralizationTitleText,
} from './AddProject.styles';

const PermissionItem = memo(({ title, description, checked, onChange, id }) => {
    const handleChange = useCallback((e) => {
        onChange(id, e.target.checked);
    }, [id, onChange]);

    return (
        <PermissionItemBox>
            <PermissionTextContainer>
                <PermissionTitleText>{title}</PermissionTitleText>
                <PermissionDescText>{description}</PermissionDescText>
            </PermissionTextContainer>
            <PermissionSwitchStyled 
                checked={checked} 
                onChange={handleChange}
            />
        </PermissionItemBox>
    );
});

PermissionItem.displayName = 'PermissionItem';
PermissionItem.propTypes = {
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
};

const EditPermissionDialog = ({ open, onClose, role, permissions, onPermissionChange, onSave }) => {
    return (
        <PermissionDialogContainer open={open} onClose={onClose} fullWidth>
            <PermissionDialogHeader>
                <PermissionHeaderRow>
                    <DecentralizationTitleText>Chỉnh sửa quyền hạn:</DecentralizationTitleText>
                    {role && (
                        <RoleBadgeBox badgeColor={role.color} noMargin>
                            {role.name}
                        </RoleBadgeBox>
                    )}
                </PermissionHeaderRow>
                <DecentralizationSubtitleText>
                    Bật hoặc tắt từng quyền cụ thể cho vai trò này
                </DecentralizationSubtitleText>
            </PermissionDialogHeader>

            <PermissionItemContent>
                {permissions.map((item) => (
                    <PermissionItem
                        key={item.id}
                        id={item.id}
                        title={item.title}
                        description={item.description}
                        checked={item.enabled}
                        onChange={onPermissionChange}
                    />
                ))}
            </PermissionItemContent>

            <PermissionDialogActionsStyled>
                <PermissionCancelBtn onClick={onClose}>Hủy</PermissionCancelBtn>
                <PermissionSaveBtn onClick={onSave}>Lưu thay đổi</PermissionSaveBtn>
            </PermissionDialogActionsStyled>
        </PermissionDialogContainer>
    );
};

EditPermissionDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    role: PropTypes.shape({
        name: PropTypes.string,
        color: PropTypes.string,
    }),
    permissions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        enabled: PropTypes.bool.isRequired,
    })).isRequired,
    onPermissionChange: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
};

export default memo(EditPermissionDialog);
