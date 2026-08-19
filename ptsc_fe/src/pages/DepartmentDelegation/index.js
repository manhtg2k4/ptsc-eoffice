import React, { useState, useCallback, useEffect, memo } from 'react';
import {
  SkyPaper,
  SkyTitle,
  SkyTableContainer,
  SkyTable,
  SkyTableBody,
  SkyTableRow,
  SkyTableCell,
  SkyIconButton,
  SkyFlexGap8,
  SkyBox
} from '@styles/SkyStyles';
import {
  DelegationTableHead,
  StyledTableRow,
  BoldTableCell,
  STTTableCell,
  AssigneeTableCell,
  ActionsTableCell,
  UserAvatar,
  EmptyAssigneeText,
  UserNameText,
  UserTitleText,
  ActionsContainer,
  SkyTooltip,
  PageContainer,
  HeaderContainer,
  BlueEditIcon,
  BlueAddIcon,
  SecondaryTypography
} from '@styles/DepartmentDelegation.styles';
import api from '@services/api';
import { API_TASK_ASSIGNMENT_CONFIGS } from '@EnvironmentFile/constants/urlConfig';
import DelegationModal from './DelegationModal';
import { useToast } from '@components/common/ToastProvider';
import { styled } from '@mui/material';
import LoadingDialog from '@components/LoadingDialog';
import { StyledDialogContent } from '@styles/CustomDialog.styles';

const StyledIconButton = styled(SkyIconButton)(() => ({
  fontSize: '0.75rem',
}));

const DepartmentDelegation = () => {
  const [departments, setDepartments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadDate, setReloadDate] = useState(new Date());
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_TASK_ASSIGNMENT_CONFIGS);
      const data = response?.data || response;
      if (Array.isArray(data)) {
        setDepartments(data.map(item => ({
          id: item.id,
          name: item.unit?.name || 'Không xác định',
          description: item.unit?.description || 'Chưa có mô tả',
          assignee: item.user || null,
          unitId: item.unitId
        })));
      }
    } catch (error) {
      toast(error?.response?.data?.message || 'Không thể lấy danh sách ủy quyền', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData, reloadDate]);

  const handleOpenModal = useCallback((dept) => {
    setSelectedDept(dept);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedDept(null);
  }, []);

  const handleSelectAssignee = useCallback(async (assignee) => {
    try {
      if (!selectedDept?.unitId) {
        toast('Không tìm thấy thông tin đơn vị', 'error');
        return;
      }

      setLoading(true);
      const payload = {
        unitId: selectedDept.unitId,
        userIds: [assignee.id],
        status: 1
      };

      if (selectedDept.id) {
        // Update existing config
        await api.patch(`${API_TASK_ASSIGNMENT_CONFIGS}/${selectedDept.id}`, payload);
      } else {
        // Create new config
        await api.post(API_TASK_ASSIGNMENT_CONFIGS, payload);
      }

      toast(selectedDept.id ? 'Cập nhật ủy quyền thành công' : 'Thêm ủy quyền thành công', 'success');
      setReloadDate(new Date());
      handleCloseModal();
    } catch (error) {
      toast(error?.response?.data?.message || 'Lỗi khi cập nhật ủy quyền', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDept, handleCloseModal, toast]);
 

  return (
    <PageContainer>
      <HeaderContainer>
        <SkyTitle variant="h5">Quản lý ủy quyền nhận đầu công việc</SkyTitle>
        <SecondaryTypography variant="body2">
          Chỉ định người phụ trách nhận và xử lý công việc cho từng phòng ban
        </SecondaryTypography>
      </HeaderContainer>

      <SkyPaper>
        <SkyTableContainer>
          <SkyTable>
            <DelegationTableHead>
              <SkyTableRow>
                <STTTableCell>STT</STTTableCell>
                <BoldTableCell>Tên phòng ban</BoldTableCell>
                <BoldTableCell>Mô tả</BoldTableCell>
                <AssigneeTableCell>Người được ủy quyền</AssigneeTableCell>
                <ActionsTableCell>Thao tác</ActionsTableCell>
              </SkyTableRow>
            </DelegationTableHead>
            <SkyTableBody>
              {departments.map((dept, index) => (
                <DepartmentRow
                  key={dept.id || dept.unitId}
                  dept={dept}
                  index={index}
                  onOpenModal={handleOpenModal}
                  
                />
              ))}
            </SkyTableBody>
          </SkyTable>
        </SkyTableContainer>
      </SkyPaper>

      {isModalOpen && (
        <DelegationModal
          open={isModalOpen}
          onClose={handleCloseModal}
          onSelect={handleSelectAssignee}
          departmentName={selectedDept?.name}
          currentAssignee={selectedDept?.assignee}
        />
      )}

      <LoadingDialog open={loading}>
        <StyledDialogContent>
          {"Đang xử lý, vui lòng chờ trong giây lát..."}
        </StyledDialogContent>
      </LoadingDialog>
    </PageContainer>
  );
};

const DepartmentRow = memo(({ dept, index, onOpenModal }) => {
  const handleOpen = useCallback(() => onOpenModal(dept), [onOpenModal, dept]);
 
  return (
    <StyledTableRow>
      <SkyTableCell align="center">{index + 1}</SkyTableCell>
      <BoldTableCell>{dept.name}</BoldTableCell>
      <SecondaryTypography as={SkyTableCell}>{dept.description}</SecondaryTypography>
      <SkyTableCell>
        {dept.assignee ? (
          <SkyFlexGap8>
            <UserAvatar
              src={dept.assignee.avatar && Array.isArray(dept.assignee.avatar) && dept.assignee.avatar.length > 0 ? dept.assignee.avatar[0] : ''}
            >
              {dept.assignee.name ? dept.assignee.name.charAt(0) : 'U'}
            </UserAvatar>
            <SkyBox>
              <UserNameText>{dept.assignee.name}</UserNameText>
              <UserTitleText>{dept.assignee.position || 'Nhân viên'}</UserTitleText>
            </SkyBox>
          </SkyFlexGap8>
        ) : (
          <EmptyAssigneeText>
            Chưa có người được ủy quyền
          </EmptyAssigneeText>
        )}
      </SkyTableCell>
      <SkyTableCell align="center">
        {dept.assignee ? (
          <ActionsContainer>
            <SkyTooltip title="Chỉnh sửa">
              <StyledIconButton size="small" onClick={handleOpen}>
                <BlueEditIcon />
              </StyledIconButton>
            </SkyTooltip>
             
          </ActionsContainer>
        ) : (
          <SkyTooltip title="Thêm">
            <StyledIconButton size="small" onClick={handleOpen}>
              <BlueAddIcon />
            </StyledIconButton>
          </SkyTooltip>
        )}
      </SkyTableCell>
    </StyledTableRow>
  );
});

DepartmentRow.displayName = 'DepartmentRow';

export default DepartmentDelegation;
