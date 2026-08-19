import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import FolderIcon from '@mui/icons-material/Folder';
import { useCallback, useState, useMemo, useEffect } from 'react';
import axiosInstance from '@utils/axiosInstance';
import { API_MANAGEMENT_FODER } from '@EnvironmentFile/constants/urlConfig';
import { 
  StyledIconWrapper,
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
const PanelContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#fff',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[1],
  display: 'flex',
  flexDirection: 'column',
  // Đặt chiều cao tối đa để panel có thể cuộn bên trong
  // Giá trị này có thể cần điều chỉnh tùy theo layout tổng thể.
  maxHeight: 'calc(100vh - 200px)', 
  overflow: 'hidden',
}));

const PanelHeader = styled(Box)(({ theme }) => ({
  backgroundColor: '#fff',
  color: '#000',
  padding: theme.spacing(1, 2),
  flexShrink: 0,
}));

const HeaderTitle = styled(Typography)({
  fontWeight: 600,
});

const ListContainer = styled(Box)({
  overflowY: 'auto',
  flexGrow: 1,
});

const LoadMoreContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing(1),
  borderTop: `1px solid ${theme.palette.divider}`,
  flexShrink: 0,
}));

const StyledFolderIcon = styled(FolderIcon)({
  color: '#ffb300',
});

const LoadingSpinnerContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexGrow: 1,
  padding: theme.spacing(2),
}));

export default function OtherDocumentPanel({ excludeId, onFolderClick }) {
  const [allRootFolders, setAllRootFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(20);

  // Fetch all root folders when the component mounts
  useEffect(() => {
    const fetchRootFolders = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(API_MANAGEMENT_FODER, { params: { parentId: null } });
        // The interceptor might return the array directly
        const data = Array.isArray(response) ? response : (response.data || []);
        setAllRootFolders(data);
      } catch (error) {
        logger.error("Failed to fetch root folders for panel:", error);
        setAllRootFolders([]); // Set to empty on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchRootFolders();
  }, []); // Fetch only once on mount

  // Filter the fetched folders based on the excludeId prop
  const filteredFolders = useMemo(() => {
    let folders = allRootFolders;
    // Lọc bỏ những thư mục không có quyền xem và không có quyền sửa (hiển thị khóa ở danh sách chính)
    folders = folders.filter(f => f.canView || f.canEdit);
    
    if (!excludeId) {
      return folders;
    }
    return folders.filter(f => f.id !== excludeId);
  }, [allRootFolders, excludeId]);

  // Reset display limit when the filtered list changes (e.g., when excludeId changes)
  useEffect(() => {
    setDisplayLimit(20);
  }, [filteredFolders]);

  const displayedFolders = useMemo(() => filteredFolders.slice(0, displayLimit), [filteredFolders, displayLimit]);
  const canLoadMore = filteredFolders.length > displayLimit;

  const handleLoadMore = useCallback(() => {
    setDisplayLimit(prev => prev + 20);
  }, []);

  const handleClick = useCallback((e) => {
    const id = e.currentTarget.dataset.id;    
    const folder = displayedFolders.find(f => String(f.id) === String(id));
    if (onFolderClick && folder) onFolderClick(folder);
  }, [onFolderClick, displayedFolders]);

  if (isLoading) {
    return (
      <PanelContainer>
        <PanelHeader>
          <HeaderTitle>Bộ tài liệu khác</HeaderTitle>
        </PanelHeader>
        <LoadingSpinnerContainer>
          <CircularProgress />
        </LoadingSpinnerContainer>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer>
      <PanelHeader>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <StyledIconWrapper>
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.94 2.49C14.94 2.26987 14.8525 2.05882 14.6968 1.90317C14.5412 1.74751 14.3301 1.66 14.11 1.66L2.49 1.66C2.26987 1.66 2.05882 1.74751 1.90317 1.90317C1.74751 2.05882 1.66 2.26987 1.66 2.49L1.66 13.7663L3.56317 11.8632L3.62395 11.8081C3.77166 11.687 3.95737 11.62 4.15 11.62L14.11 11.62C14.3301 11.62 14.5412 11.5325 14.6968 11.3768C14.8525 11.2212 14.94 11.0101 14.94 10.79L14.94 2.49ZM16.6 10.79C16.6 11.4504 16.3375 12.0836 15.8705 12.5505C15.4036 13.0175 14.7704 13.28 14.11 13.28L4.49367 13.28L1.41684 16.3568C1.17946 16.5942 0.822414 16.6652 0.512268 16.5368C0.20218 16.4083 0 16.1057 0 15.77L0 2.49C0 1.82961 0.262529 1.19646 0.729495 0.729495C1.19646 0.262529 1.82961 0 2.49 0L14.11 0C14.7703 0 15.4036 0.262529 15.8705 0.729495C16.3375 1.19646 16.6 1.82961 16.6 2.49L16.6 10.79Z" fill="#2364B0"/>
</svg>


          </StyledIconWrapper>
          <StyledHeaderContent variant="h6">
            Bộ tài liệu khác
          </StyledHeaderContent>
        </div>
       
      </PanelHeader>
       <StyledDivider />
      <ListContainer>
        <List dense>
          {displayedFolders.map((folder) => (
            <ListItem 
              button 
              key={folder.id} 
              divider 
              data-id={folder.id}
              onClick={handleClick}
            >
              <ListItemIcon>
                <StyledFolderIcon />
              </ListItemIcon>
              <ListItemText primary={folder.name} />
            </ListItem>
          ))}
        </List>
      </ListContainer>
      {canLoadMore && (
        <LoadMoreContainer><Button onClick={handleLoadMore}>Xem thêm</Button></LoadMoreContainer>
      )}
    </PanelContainer>
  );
}
