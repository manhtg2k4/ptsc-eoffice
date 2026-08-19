/* eslint-disable react/forbid-component-props */
import React, { useState, useCallback, memo, useEffect } from 'react';
import {
  SkyDialogTitle,
  SkyDialogContent,
  SkyDialogActions,
  SkyButton,
  SkyTypography
} from '@styles/SkyStyles';
import {
  ListItemAvatar,
  ListItemText,
  styled
} from '@mui/material';
import {
  StyledDialog,
  SearchField,
  EmployeeList,
  EmployeeListItem,
  EmployeeAvatar,
  StyledSearchIcon,
  StyledCheckCircleIcon,
  UserNameText,
  StyledInputAdornment,
  SecondaryTypography
} from '@styles/DepartmentDelegation.styles';
import { APP_DHVB_BASE } from '@EnvironmentFile/constants/urlConfig';
import axiosInstance from '@utils/axiosInstance';
import LoadingDialog from '@components/LoadingDialog';
import { StyledDialogContent } from '@styles/CustomDialog.styles';
import { useToast } from '@components/common/ToastProvider';

const StyleSkyTypography = styled(SkyTypography)(() => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
}));

const DelegationModal = ({ open, onClose, onSelect, departmentName, currentAssignee, loading }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState(currentAssignee?.id || null);
  const [users, setUsers] = useState([]);
  const toast = useToast();


  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);



  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(
        `${APP_DHVB_BASE}/users/by-task-role`,
        {
          params: {
            typeTaskUser: 'director',
            name: debouncedSearchTerm,
            page: 1,
            limit: 25,
          },
        }
      );

      const data = response?.data || response;
      if (Array.isArray(data)) {
        setUsers(data);
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast(
        error?.response?.data?.message || 'Không thể lấy danh sách nhân viên',
        'error'
      );
    }
  }, [toast, debouncedSearchTerm]);


  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleSelectEmployee = useCallback((emp) => {
    setSelectedId(emp.id);
    onSelect(emp);
  }, [onSelect]);

  return (
    <StyledDialog open={open} onClose={onClose} fullWidth>
      <SkyDialogTitle>
        Chọn người được ủy quyền
        <SecondaryTypography variant="body2">
          {departmentName}
        </SecondaryTypography>
      </SkyDialogTitle>

      <SkyDialogContent dividers>
        <SearchField
          fullWidth
          placeholder="Tìm kiếm nhân viên..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <StyledInputAdornment adornmentPosition="start">
                <StyledSearchIcon />
              </StyledInputAdornment>
            ),
          }}
        />

        <EmployeeList>
          {users.length === 0 && !isLoading ? (
            <StyleSkyTypography variant="body2" textAlign="center">
              Không tìm thấy dữ liệu
            </StyleSkyTypography>
          ) : (
            users.map((emp) => (
              <EmployeeRow
                key={emp.id}
                emp={emp}
                isSelected={selectedId === emp.id}
                onSelect={handleSelectEmployee}
              />
            ))
          )}
        </EmployeeList>
      </SkyDialogContent>

      <SkyDialogActions>
        <SkyButton
          variant="outlined"
          onClick={onClose}
        >
          Đóng
        </SkyButton>
      </SkyDialogActions>

      <LoadingDialog open={loading || isLoading}>
        <StyledDialogContent>
          {"Đang xử lý, vui lòng chờ trong giây lát..."}
        </StyledDialogContent>
      </LoadingDialog>
    </StyledDialog>
  );
};

const EmployeeRow = memo(({ emp, isSelected, onSelect }) => {
  const handleClick = useCallback(() => onSelect(emp), [onSelect, emp]);

  return (
    <EmployeeListItem
      button
      onClick={handleClick}
      isSelected={isSelected}
    >
      <ListItemAvatar>
        <EmployeeAvatar isSelected={isSelected}>
          {emp.name ? emp.name.charAt(0) : 'U'}
        </EmployeeAvatar>
      </ListItemAvatar>
      <ListItemText
        primary={<UserNameText>{emp.name}</UserNameText>}
        secondary={emp.username || emp.emailUser}
      />
      {isSelected && (
        <StyledCheckCircleIcon />
      )}
    </EmployeeListItem>
  );
});

EmployeeRow.displayName = 'EmployeeRow';

export default DelegationModal;
