import React, { useCallback, useEffect, useState } from 'react';
import SyncIcon from '@mui/icons-material/Sync';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import DomainIcon from '@mui/icons-material/Domain';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PopupAsync from './PopupAsync';

import {
  AsyncHRMContainer,
  AsyncHRMHeader,
  AsyncHRMHeaderRight,
  AsyncHRMStatusBox,
  AsyncHRMStatusDot,
  AsyncHRMSyncButton,
  AsyncHRMStatsContainer,
  AsyncHRMStatCard,
  AsyncHRMIconBox,
  AsyncHRMStatContent,
  AsyncHRMStatValue,
  AsyncHRMStatLabel,
} from '@styles/AsyncHRM/AsyncHrm.styles';
import { StyleTittleBox, StyleTittleTyprography } from '@builder-table/components/SearchSection.styles';
import { useSelector } from 'react-redux';
import { useToast } from '@components/common/ToastProvider';
import axiosInstance from '@utils/axiosInstance';
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import dayjs from 'dayjs';

const buildStatData = (stats) => [
  {
    id: 1,
    value: stats?.totalEmployee?.toLocaleString('vi-VN') ?? '—',
    label: 'Tổng nhân viên',
    icon: <PeopleAltIcon />,
    bgColor: '#E2E6EA',
    color: '#495057'
  },
  {
    id: 2,
    value: stats?.working?.toLocaleString('vi-VN') ?? '—',
    label: 'Đang làm việc',
    icon: <HowToRegIcon />,
    bgColor: '#D4EDDA',
    color: '#155724'
  },
  {
    id: 3,
    value: stats?.departments?.toLocaleString('vi-VN') ?? '—',
    label: 'Đơn vị/ Phòng ban',
    icon: <DomainIcon />,
    bgColor: '#FDF1D3',
    color: '#E08000'
  },
  {
    id: 4,
    value: stats?.updatedToday?.toLocaleString('vi-VN') ?? '—',
    label: 'Cập nhập mới hôm nay',
    icon: <AutorenewIcon />,
    bgColor: '#F0E6F7',
    color: '#8A2BE2'
  }
];

const AsyncHRM = (props) => {
  const { setReloadData } = props;
  const [openSync, setOpenSync] = React.useState(false);
  const currentPageTitle = useSelector((state) => state.layout.currentPageTitle);
  const toast = useToast();
  const [progress, setProgress] = React.useState(0);
  const [syncStatus, setSyncStatus] = React.useState('syncing');
  const [syncResult, setSyncResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  // ✅ State lưu thống kê từ API
  const [hrmStats, setHrmStats] = useState(null);
 
  const fetchDataDash = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`${APP_BASE}/api/hrm/dashboard`)

      setHrmStats(response)

    } catch (error) {
      toast(
        error?.response?.data?.message || 'Lỗi khi lấy dữ liệu',
        'error'
      )
    }
  }, [toast])

  useEffect(() => {
    fetchDataDash()
  }, [fetchDataDash])
  // ✅ Build statData từ dữ liệu API
  const statData = buildStatData(hrmStats);

  const handleSync = useCallback(async () => {
    setOpenSync(true);
    setSyncStatus('syncing');
    setProgress(0);
    setSyncResult(null);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + 5;
      });
    }, 500);

    try {
      setLoading(true);
      const response = await axiosInstance.post(`${APP_BASE}/api/hrm/sync`);

      clearInterval(interval);
      setProgress(100);
      setSyncStatus('success');
      setSyncResult(response);

      if (response) {
        toast(response?.message || 'Lấy dữ liệu thành công', 'success'); 

        setLoading(false);
        setReloadData(new Date() * 1);
      }
    } catch (error) {
      clearInterval(interval);
      setLoading(false);
      setSyncStatus('error');
      toast(error?.response?.data?.message || 'Lỗi khi lấy dữ liệu', 'error');
    }
  }, [setReloadData, toast]);

  const handleCloseSync = () => {
    setOpenSync(false);
    if (setReloadData) setReloadData(new Date() * 1);
  };

  return (
    <AsyncHRMContainer>
      <AsyncHRMHeader>
        {currentPageTitle && (
          <StyleTittleBox>
            <StyleTittleTyprography>{currentPageTitle}</StyleTittleTyprography>
          </StyleTittleBox>
        )}
        <AsyncHRMHeaderRight>
          <AsyncHRMStatusBox>
            <AsyncHRMStatusDot />
            Đồng bộ lần cuối: {dayjs(hrmStats?.lastSyncDate).format('HH:mm:ss DD/MM/YYYY')}
          </AsyncHRMStatusBox>
          <AsyncHRMSyncButton startIcon={<SyncIcon />} onClick={handleSync}>
            Đồng Bộ HRM
          </AsyncHRMSyncButton>
        </AsyncHRMHeaderRight>
      </AsyncHRMHeader>

      <AsyncHRMStatsContainer>
        {statData.map((stat) => (
          <AsyncHRMStatCard key={stat.id}>
            <AsyncHRMIconBox bg={stat.bgColor} col={stat.color}>
              {stat.icon}
            </AsyncHRMIconBox>
            <AsyncHRMStatContent>
              <AsyncHRMStatValue>{stat.value}</AsyncHRMStatValue>
              <AsyncHRMStatLabel>{stat.label}</AsyncHRMStatLabel>
            </AsyncHRMStatContent>
          </AsyncHRMStatCard>
        ))}
      </AsyncHRMStatsContainer>

      <PopupAsync
        open={openSync}
        onClose={handleCloseSync}
        loading={loading}
        status={syncStatus}
        progress={progress}
        result={syncResult}
      />
    </AsyncHRMContainer>
  );
};

export default AsyncHRM;