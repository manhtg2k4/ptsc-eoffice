import React, { useState, useEffect } from 'react';
import Swipper from '@components/Swipper';
import { SkyBox } from '@styles/SkyStyles';
import {
    ProfileHeaderContainer,
    ProfileAvatarBox,
    ProfileInfoBox,
    ProfileName,
    ProfileSubInfo,
    InfoSectionContainer,
    InfoGrid,
    InfoItemContainer,
    InfoLabel,
    InfoValue,
    StyleAvatar
} from '@styles/EmployeeInformation/EmployeeInformation.styles';
import LoadingDialog from '@components/LoadingDialog';
import api from '@services/api';
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import { useToast } from '@components/common/ToastProvider';

const EmployeeInformation = (props) => {
    const { open = true, onClose, title, id } = props;
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    useEffect(() => {
        const fetchEmployeeData = async () => {
            if (open && id) {
                setLoading(true);
                try {
                    const response = await api.get(`${APP_BASE}/api/hrm/${id}/employee-detail`);
                    setEmployee(response?.data || response);
                } catch (error) {
                    toast(error?.response?.data?.message || 'Lỗi khi lấy thông tin chi tiết', 'error');
                } finally {
                    setLoading(false);
                }
            } else if (!open) {
                // Reset state when drawer/modal closes
                setEmployee(null);
            }
        };

        fetchEmployeeData();
    }, [open, id, toast]);

    // Format avatar initials
    const getInitials = (name) => {
        if (!name) return '';
        const names = name.split(' ').filter(Boolean);
        if (names.length === 0) return '';
        return names.map(n => n.charAt(0).toUpperCase()).join('');
    };

    return (
        <Swipper
            open={open}
            onClose={onClose}
            title={title || 'Chi tiết thông tin nhân viên'}
            type="view"
        >
            <SkyBox>
                {employee ? (
                    <SkyBox>
                        {/* Basic Info Header section */}
                        <ProfileHeaderContainer>
                            <ProfileAvatarBox>
                                <StyleAvatar
                                    src={employee.avatarUrl}

                                >
                                    {!employee.avatarUrl && getInitials(employee.name)}
                                </StyleAvatar>
                            </ProfileAvatarBox>
                            <ProfileInfoBox flx={1}>
                                <ProfileName>{employee.name}</ProfileName>
                                <ProfileSubInfo>
                                    {employee.codeND} &bull; {employee.organizationName}
                                </ProfileSubInfo>
                            </ProfileInfoBox>
                        </ProfileHeaderContainer>

                        {/* Detailed Info section / Read-only form */}
                        <InfoSectionContainer>
                            <InfoGrid>
                                <InfoItemContainer>
                                    <InfoLabel>Mã nhân viên</InfoLabel>
                                    <InfoValue>{employee.codeND}</InfoValue>
                                </InfoItemContainer>
                                <InfoItemContainer>
                                    <InfoLabel>Họ và tên</InfoLabel>
                                    <InfoValue>{employee.name}</InfoValue>
                                </InfoItemContainer>

                                <InfoItemContainer>
                                    <InfoLabel>Email</InfoLabel>
                                    <InfoValue>{employee.emailUser}</InfoValue>
                                </InfoItemContainer>
                                <InfoItemContainer>
                                    <InfoLabel>Số điện thoại</InfoLabel>
                                    <InfoValue>{employee.phone || '---'}</InfoValue>
                                </InfoItemContainer>

                                <InfoItemContainer>
                                    <InfoLabel>Đơn vị</InfoLabel>
                                    <InfoValue>{employee.organizationName}</InfoValue>
                                </InfoItemContainer>
                                <InfoItemContainer>
                                    <InfoLabel>Chức vụ</InfoLabel>
                                    <InfoValue>{employee.position || '---'}</InfoValue>
                                </InfoItemContainer>

                                <InfoItemContainer>
                                    <InfoLabel>Cấp bậc</InfoLabel>
                                    <InfoValue>{employee.leader || '---'}</InfoValue>
                                </InfoItemContainer>
                                <InfoItemContainer>
                                    <InfoLabel>Ngày vào cảng</InfoLabel>
                                    <InfoValue>{employee.ngayVaoCang || '---'}</InfoValue>
                                </InfoItemContainer>
                                <InfoItemContainer>
                                    <InfoLabel>Ngày tạo</InfoLabel>
                                    <InfoValue>{employee.createdAt || '---'}</InfoValue>
                                </InfoItemContainer>
                            </InfoGrid>
                        </InfoSectionContainer>
                    </SkyBox>
                ) : null}
            </SkyBox>
            <LoadingDialog open={loading} >
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>
        </Swipper>
    );
};

export default EmployeeInformation;