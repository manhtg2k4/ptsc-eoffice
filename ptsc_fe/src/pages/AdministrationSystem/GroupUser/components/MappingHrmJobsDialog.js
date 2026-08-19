import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CircularProgress,
  InputAdornment,
  Tooltip,
  styled,
} from '@mui/material';
import {
  Search as SearchIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '@services/api';
import { 
  API_HRM_JOB_MAPPING, 
  API_HRM_JOB_MAPPING_BATCH,
  API_GET_GROUP_USERS 
} from '@EnvironmentFile/constants/urlConfig';
import { useToast } from '@components/common/ToastProvider';
import { CustomDialog } from "@components/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import { List } from 'react-window';
import {
  SkyTypography,
  SkyButton,
} from "@styles/SkyStyles";

// --- Styled Components ---

const DialogContentContainer = styled('div')({
  height: '600px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const LoadingOverlay = styled('div')({
  display: 'flex',
  flexGrow: 1,
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
});

const MainContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
});

const ActionHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '16px',
  flexShrink: 0,
});

const SearchWrapper = styled('div')({
  width: '280px',
});

const TableContainer = styled('div')({
  border: '1px solid #efefef',
  borderRadius: '8px',
  overflow: 'hidden',
  backgroundColor: '#fff',
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
});

const TableHeaderContainer = styled('div')(({ hasScroll }) => ({
  display: 'flex',
  width: '100%',
  backgroundColor: '#f8f9fa',
  borderBottom: '1px solid #efefef',
  flexShrink: 0,
  paddingRight: hasScroll ? '15px' : 0,
}));

const HeaderCell = styled('div')(({ isRight }) => ({
  flex: isRight ? '1 1 65%' : '0 0 35%',
  minWidth: isRight ? 'auto' : '150px',
  fontWeight: 700,
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: isRight ? 'center' : 'flex-start',
  textAlign: isRight ? 'center' : 'left',
}));

const ListWrapper = styled('div')({
  flexGrow: 1,
  overflow: 'hidden',
});

const EmptyStateWrapper = styled('div')({
  padding: '48px',
  textAlign: 'center',
});

const SentinelRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fafafa',
  borderBottom: '1px solid #f0f0f0',
  height: '100%',
});

const StyledRowItemContainer = styled('div')({
  display: 'flex',
  borderBottom: '1px solid #f0f0f0',
  height: '100%',
});

const GroupNameText = styled(SkyTypography)({
  fontWeight: 600,
});

const CellItem = styled('div')(({ isRight }) => ({
  flex: isRight ? '1 1 65%' : '0 0 35%',
  minWidth: isRight ? 'auto' : '150px',
  display: 'flex',
  flexDirection: isRight ? 'row' : 'column',
  justifyContent: 'center',
  alignItems: isRight ? 'center' : 'flex-start',
  height: '100%',
  padding: '0 16px',
}));

const StyledSearchIcon = styled(SearchIcon)({
  fontSize: '1.25rem',
});

const StyledInputAdornment = styled(InputAdornment)(() => ({}));
StyledInputAdornment.defaultProps = {
  position: 'start',
};

const ButtonGroup = styled('div')({
  display: 'flex',
  gap: '8px',
});

const ButtonWrapper = styled('div')({
  display: 'inline-flex',
});

const StyledVirtualList = styled(List)({
  height: '420px',
  width: '100%',
});

// 🚀 Memoized Row to prevent lag in a large series of inputs
const MappingRow = React.memo(({ index, style, groups, mappings, onMappingChange }) => {
  const group = groups[index];
  const groupId = group?._id || group?.id;
  
  const [localValue, setLocalValue] = useState("");

  useEffect(() => {
    if (groupId) {
      setLocalValue(mappings[groupId] || "");
    }
  }, [groupId, mappings]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    onMappingChange(groupId, newVal);
  };

  // 🔄 Loading Sentinel Row
  if (!group) {
    return (
      <div style={style}>
        <SentinelRow>
          <CircularProgress size={16} />
          <div style={{ marginLeft: '8px' }}>
            <SkyTypography variant="caption">Đang tải thêm nhóm...</SkyTypography>
          </div>
        </SentinelRow>
      </div>
    );
  }

  return (
    <div style={style}>
      <StyledRowItemContainer>
        <CellItem>
          <GroupNameText variant="body2">{group.name}</GroupNameText>
          <SkyTypography variant="caption">
            Mã: {group.code}
          </SkyTypography>
        </CellItem>
        <CellItem isRight>
          <CustomInput
            fullWidth
            size="small"
            placeholder="VD: GD, PGD..."
            variant="outlined"
            value={localValue}
            onChange={handleChange}
            autoComplete="off"
          />
        </CellItem>
      </StyledRowItemContainer>
    </div>
  );
});

MappingRow.displayName = 'MappingRow';

const MappingHrmJobsDialog = ({ open, onClose }) => {
  const [allGroups, setAllGroups] = useState([]);
  const [mappings, setMappings] = useState({}); // Stores ALL session mappings
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const toast = useToast();
  const PAGE_LIMIT = 50;
  const searchTimeout = useRef(null);
  const fileInputRef = useRef(null);

  const fetchGroups = useCallback(async (pageNum, search, isInitial = false) => {
    if (loadingMore) return;
    if (!isInitial) setLoadingMore(true);
    try {
      const params = {
        page: pageNum,
        limit: PAGE_LIMIT,
        name: search || undefined
      };
      const groupsRes = await api.get(API_GET_GROUP_USERS, { params });
      const newGroups = groupsRes.data?.data || [];
      
      if (pageNum === 1) {
        setAllGroups(newGroups);
      } else {
        setAllGroups(prev => [...prev, ...newGroups]);
      }
      
      setHasMore(newGroups.length === PAGE_LIMIT);
    } catch (error) {
      toast('Lỗi khi tải danh sách nhóm người dùng', 'error');
    } finally {
      if (!isInitial) setLoadingMore(false);
    }
  }, [loadingMore, toast]);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const mappingRes = await api.get(API_HRM_JOB_MAPPING);
      const allMappingsList = mappingRes.data || [];
      const stringMappings = {};
      allMappingsList.forEach((m) => {
        if (!stringMappings[m.groupUserId]) {
          stringMappings[m.groupUserId] = [];
        }
        stringMappings[m.groupUserId].push(m.hrmJobCode);
      });
      
      const formatted = {};
      Object.keys(stringMappings).forEach(key => {
        formatted[key] = stringMappings[key].join(', ');
      });
      setMappings(formatted);

      await fetchGroups(1, '', true);
    } catch (error) {
      toast('Lỗi khi tải dữ liệu cấu hình HRM', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchGroups, toast]);

  useEffect(() => {
    if (open) {
      setPage(1);
      setSearchTerm('');
      setAllGroups([]);
      fetchInitialData();
    }
  }, [open, fetchInitialData]);

  const handleRowsRendered = ({ stopIndex }) => {
    if (hasMore && !loadingMore && stopIndex >= allGroups.length - 5) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchGroups(nextPage, searchTerm);
    }
  };

  const onMappingChange = useCallback((groupId, textValue) => {
    setMappings((prev) => ({
      ...prev,
      [groupId]: textValue,
    }));
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchGroups(1, value);
    }, 500);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { 'Mã nhóm': 'admin', 'Mã chức danh HRM': 'GD, PGD, TP' },
      { 'Mã nhóm': 'nhan-vien-vp', 'Mã chức danh HRM': 'NV, KS' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Mapping');
    XLSX.writeFile(wb, 'Template_Mapping_HRM.xlsx');
  };

  const handleImportExcel = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast('Tệp Excel không có dữ liệu', 'warning');
          return;
        }

        setLoading(true);
        // Tải danh sách các nhóm để khớp mã (Lấy đủ để bao quát hệ thống)
        const groupsRes = await api.get(`${API_GET_GROUP_USERS}?limit=3000`);
        const systemGroups = groupsRes.data?.data || [];
        
        const newMappings = { ...mappings };
        let matchCount = 0;

        data.forEach(row => {
          const excelGroupCode = row['Mã nhóm'];
          const hrmCodes = String(row['Mã chức danh HRM'] || "").trim();
          
          if (!excelGroupCode || !hrmCodes) return;

          const foundGroup = systemGroups.find(g => g.code === excelGroupCode);
          if (foundGroup) {
            const existingValue = newMappings[foundGroup.id];
            if (existingValue) {
              // Append if not already present
              const existingCodes = existingValue.split(',').map(s => s.trim()).filter(Boolean);
              const newCodes = hrmCodes.split(',').map(s => s.trim()).filter(Boolean);
              
              const combined = Array.from(new Set([...existingCodes, ...newCodes])).join(', ');
              newMappings[foundGroup.id] = combined;
            } else {
              newMappings[foundGroup.id] = hrmCodes;
            }
            matchCount++;
          }
        });

        setMappings(newMappings);
        toast(`Đã nhập thành công ${matchCount}/${data.length} nhóm từ Excel`, matchCount > 0 ? 'success' : 'warning');
        
        // Reset file input
        e.target.value = '';
      } catch (err) {
        toast('Lỗi khi xử lý tệp Excel', 'error');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        mappings: Object.keys(mappings).map(groupId => {
          const rawText = mappings[groupId] || "";
          const jobCodes = rawText.split(',').map(s => s.trim()).filter(Boolean);
          return {
            groupUserId: groupId,
            hrmJobCodes: jobCodes,
          };
        }),
      };
      
      await api.post(API_HRM_JOB_MAPPING_BATCH, payload);
      toast('Lưu cấu hình mapping HRM thành công', 'success');
      onClose();
    } catch (error) {
      toast('Lỗi khi lưu cấu hình mapping HRM', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title="Cấu hình Mapping chức danh HRM"
      onSave={handleSave}
      isLoading={saving}
      size="lg"
      titleButton="Lưu cấu hình"
      inputLabelLayout="stacked"
    >
      <input
        type="file"
        ref={fileInputRef}
        hidden
        accept=".xlsx, .xls"
        onChange={handleFileChange}
      />
      
      <DialogContentContainer>
        {loading ? (
          <LoadingOverlay>
            <CircularProgress size={40} />
            <SkyTypography>Đang xử lý dữ liệu...</SkyTypography>
          </LoadingOverlay>
        ) : (
          <MainContainer>
            <ActionHeader>
              <SearchWrapper>
                <CustomInput
                  size="small"
                  placeholder="Tìm kiếm nhóm..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  autoComplete="off"
                  InputProps={{
                    startAdornment: (
                      <StyledInputAdornment>
                        <StyledSearchIcon />
                      </StyledInputAdornment>
                    ),
                  }}
                />
              </SearchWrapper>

              <div style={{ flexGrow: 1 }} />
              
              <ButtonGroup>
                <Tooltip title="Tải file mẫu Excel">
                  <ButtonWrapper>
                    <SkyButton 
                      variant="outlined" 
                      size="small" 
                      onClick={handleDownloadTemplate}
                      startIcon={<DownloadIcon />}
                    >
                      Mẫu
                    </SkyButton>
                  </ButtonWrapper>
                </Tooltip>
                
                <Tooltip title="Nhập danh sách từ Excel">
                  <ButtonWrapper>
                    <SkyButton 
                      variant="contained" 
                      size="small" 
                      onClick={handleImportExcel}
                      startIcon={<CloudUploadIcon />}
                    >
                      Nhập Excel
                    </SkyButton>
                  </ButtonWrapper>
                </Tooltip>
              </ButtonGroup>
            </ActionHeader>
            
            <TableContainer>
              <TableHeaderContainer hasScroll={allGroups.length > 5}>
                <HeaderCell>Nhóm người dùng</HeaderCell>
                <HeaderCell isRight>Mã chức danh HRM</HeaderCell>
              </TableHeaderContainer>
              
              <ListWrapper>
                <StyledVirtualList
                  rowCount={allGroups.length + (hasMore ? 1 : 0)}
                  rowHeight={80}
                  rowComponent={MappingRow}
                  rowProps={{ groups: allGroups, mappings, onMappingChange }}
                  onRowsRendered={handleRowsRendered}
                />
              </ListWrapper>
              
              {allGroups.length === 0 && !loadingMore && (
                <EmptyStateWrapper>
                  <SkyTypography variant="body1">Không tìm thấy nhóm người dùng nào trùng khớp.</SkyTypography>
                </EmptyStateWrapper>
              )}
            </TableContainer>
          </MainContainer>
        )}
      </DialogContentContainer>
    </CustomDialog>
  );
};

export default MappingHrmJobsDialog;
