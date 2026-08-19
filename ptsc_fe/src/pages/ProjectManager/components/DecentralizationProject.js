import React, { useState, useCallback, memo, useEffect } from 'react';
import { Grid, Box } from '@mui/material';
import PropTypes from 'prop-types';
import axiosInstance from "@utils/axiosInstance";
import {
    DecentralizationMainBox,
    DecentralizationHeaderBox,
    DecentralizationTitleText,
    DecentralizationSubtitleText,
    DecentralizationRoleCard,
    RoleBadgeBox,
    RolePermissionCountText,
    DecentralizationActionButton,
    DecentralizationShieldIconStyled,
    DecentralizationSettingsIconStyled,
} from './AddProject.styles';
import EditPermissionDialog from './EditPermissionDialog';
import { API_PROJECT_MANAGEMENT } from "@EnvironmentFile/constants/urlConfig";
import withSharedComponents from "@components/WrapperComponent";

const RoleCard = memo(({ role, onEdit }) => {
    const handleEditClick = useCallback(() => {
        onEdit(role);
    }, [onEdit, role]);

    return (
        <DecentralizationRoleCard>
            <RoleBadgeBox badgeColor={role.color}>
                {role.name}
            </RoleBadgeBox>
            <RolePermissionCountText>
                {role.permissions}
            </RolePermissionCountText>
            <DecentralizationActionButton
                variant="outlined"
                startIcon={<DecentralizationSettingsIconStyled />}
                onClick={handleEditClick}
            >
                Chỉnh sửa quyền
            </DecentralizationActionButton>
        </DecentralizationRoleCard>
    );
});

RoleCard.displayName = 'RoleCard';
RoleCard.propTypes = {
    role: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        permissions: PropTypes.string.isRequired,
        color: PropTypes.string.isRequired,
    }).isRequired,
    onEdit: PropTypes.func.isRequired,
};

const INITIAL_PERMISSIONS = [
    { id: 'update_status', title: 'Cập nhật trạng thái', description: 'Cho phép cập nhật trạng thái của dự án', enabled: true },
    { id: 'update_general', title: 'Cập nhật thông tin chung', description: 'Cho phép cập nhật thông tin chung của dự án', enabled: true },
    { id: 'update_participants', title: 'Cập nhật thông tin người tham gia', description: 'Cho phép cập nhật thông tin người tham gia của dự án', enabled: true },
    { id: 'upload_file', title: 'Tải lên tài liệu', description: 'Cho phép tải tài liệu lên dự án', enabled: true },
    { id: 'comment', title: 'Bình luận', description: 'Cho phép bình luận trong dự án', enabled: true },
    { id: 'delay_reason', title: 'Nhập lý do chậm tiến độ', description: 'Cho phép nhập lý do khi dự án chậm tiến độ', enabled: true },
    { id: 'view_analysis', title: 'Xem phân tích', description: 'Cho phép xem phân tích tình trạng của dự án', enabled: true },
];

const DecentralizationProject = ({ projectId, sharedComponents }) => {
    const { toast } = sharedComponents;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [permissions, setPermissions] = useState(INITIAL_PERMISSIONS);
    const [currentRolePermissions, setCurrentRolePermissions] = useState(null);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const [roleData, setRoleData] = useState([
        {
            id: 'manager',
            name: 'Quản lý dự án',
            permissions: '7 / 7 Quyền được bật',
            color: '#4caf50',
        },
        {
            id: 'member',
            name: 'Thành viên dự án',
            permissions: '4 / 7 Quyền được bật',
            color: '#3b82f6',
        },
        {
            id: 'viewer',
            name: 'Người xem',
            permissions: '2 / 7 Quyền được bật',
            color: '#757575',
        }
    ]);

    // Fetch permissions from API
    useEffect(() => {
        const fetchAllRoleCounts = async () => {
            if (!projectId) return;

            const rolesToFetch = ['manager', 'member', 'viewer'];
            
            try {
                const results = await Promise.all(
                    rolesToFetch.map(async (roleId) => {
                        try {
                            const response = await axiosInstance.get(`${API_PROJECT_MANAGEMENT}/${projectId}/permissions/${roleId}`);
                            const perms = response?.permissions || response;
                            
                            // Danh sách 7 quyền thực tế hiển thị trên UI
                            const uiPermissionKeys = [
                                'updateStatus', 'updateGeneralInfo', 'updateParticipants', 
                                'uploadFiles', 'comment', 'inputDelayReason', 'viewAnalysis'
                            ];
                            
                            const enabledCount = uiPermissionKeys.filter(key => perms[key] === true).length;
                            return { roleId, enabledCount };
                        } catch (err) {
                            return { roleId, enabledCount: 0 };
                        }
                    })
                );

                setRoleData(prev => prev.map(role => {
                    const result = results.find(r => r.roleId === role.id);
                    if (result) {
                        return {
                            ...role,
                            permissions: `${result.enabledCount} / ${INITIAL_PERMISSIONS.length} Quyền được bật`
                        };
                    }
                    return role;
                }));
            } catch (error) {
                logger.error("Failed to fetch all role permissions:", error);
            }
        };

        fetchAllRoleCounts();
    }, [projectId, reloadTrigger]);

    const handleOpenDialog = useCallback(async (role) => {
        setSelectedRole(role);
        
        // Fetch detailed permissions for the selected role before opening dialog
        try {
            const response = await axiosInstance.get(`${API_PROJECT_MANAGEMENT}/${projectId}/permissions/${role.id}`);
            const apiPermissions = response?.permissions || response;
            setCurrentRolePermissions(apiPermissions);

            const permissionMapping = {
                updateStatus: 'update_status',
                updateGeneralInfo: 'update_general',
                updateParticipants: 'update_participants',
                uploadFiles: 'upload_file',
                comment: 'comment',
                inputDelayReason: 'delay_reason',
                viewAnalysis: 'view_analysis',
            };

            const updatedPermissions = INITIAL_PERMISSIONS.map(perm => {
                const apiKey = Object.keys(permissionMapping).find(
                    key => permissionMapping[key] === perm.id
                );
                
                if (apiKey && apiPermissions[apiKey] !== undefined) {
                    return { ...perm, enabled: apiPermissions[apiKey] === true };
                }
                return perm;
            });

            setPermissions(updatedPermissions);
            setDialogOpen(true);
        } catch (error) {
            logger.error("Failed to fetch detailed permissions:", error);
            // Fallback or show error
        }
    }, [projectId]);

    const handleCloseDialog = useCallback(() => {
        setDialogOpen(false);
    }, []);

    const handlePermissionChange = useCallback((id, enabled) => {
        setPermissions(prev => prev.map(p => p.id === id ? { ...p, enabled } : p));
    }, []);

    const handleSavePermissions = useCallback(async () => {
        if (!selectedRole || !currentRolePermissions) return;

        const permissionMapping = {
            'update_status': 'updateStatus',
            'update_general': 'updateGeneralInfo',
            'update_participants': 'updateParticipants',
            'upload_file': 'uploadFiles',
            'comment': 'comment',
            'delay_reason': 'inputDelayReason',
            'view_analysis': 'viewAnalysis',
        };

        const payload = {
            createTask: currentRolePermissions.createTask ?? true,
            setPermissions: currentRolePermissions.setPermissions ?? false,
            ...currentRolePermissions, // Đảm bảo giữ các cờ ẩn khác
        };

        // Cập nhật các giá trị từ UI
        permissions.forEach(p => {
            const apiKey = permissionMapping[p.id];
            if (apiKey) {
                payload[apiKey] = p.enabled;
            }
        });

        try {
            await axiosInstance.patch(`${API_PROJECT_MANAGEMENT}/${projectId}/permissions/${selectedRole.id}`, payload);
            toast("Cập nhật quyền thành công", "success");
            setDialogOpen(false);
            setReloadTrigger(prev => prev + 1); // Load lại số lượng trên các thẻ
        } catch (error) {
            toast("Cập nhật quyền thất bại", "error");
            logger.error("Failed to update permissions:", error);
        }
    }, [selectedRole, currentRolePermissions, permissions, projectId, toast]);

    return (
        <DecentralizationMainBox>
            <DecentralizationHeaderBox>
                <DecentralizationShieldIconStyled />
                <Box>
                    <DecentralizationTitleText>
                        Quản lý phân quyền chi tiết
                    </DecentralizationTitleText>
                    <DecentralizationSubtitleText>
                        Tùy chỉnh quyền hạn cụ thể cho từng vai trò trong dự án
                    </DecentralizationSubtitleText>
                </Box>
            </DecentralizationHeaderBox>

            <Grid container spacing={3}>
                {roleData.map((role) => (
                    <Grid item xs={12} md={4} key={role.id}>
                        <RoleCard role={role} onEdit={handleOpenDialog} />
                    </Grid>
                ))}
            </Grid>

            <EditPermissionDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                role={selectedRole}
                permissions={permissions}
                onPermissionChange={handlePermissionChange}
                onSave={handleSavePermissions}
            />
        </DecentralizationMainBox>
    );
};

DecentralizationProject.propTypes = {
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    userPermissions: PropTypes.object,
    sharedComponents: PropTypes.object,
};

export default withSharedComponents(DecentralizationProject);
