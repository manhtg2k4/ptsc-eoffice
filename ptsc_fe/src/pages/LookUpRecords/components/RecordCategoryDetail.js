// src/pages/RecordCategory/RecordCategoryDetail.jsx
import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Breadcrumbs,
  Link,
  Table,
  TableBody,
  TableCell as MuiTableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
  MenuItem,
  ListItemText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as FileIcon,
  ExpandMore,
  ChevronRight,
} from "@mui/icons-material";
import { useToast } from "@components/common/ToastProvider";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import CustomTableToolbar from "@components/CustomTable/CustomTableToolbar";
import AddProfileCategory from "./AddProfileCategory";
import MenuIcon from '@mui/icons-material/Menu';

// --- Styled Components ---

const folderIconStyle = {
  color: "#ffb300",
  fontSize: '1.25rem', // Tương đương fontSize="small"
};

const StyledFolderOpenIcon = styled(FolderOpenIcon)(folderIconStyle);
const StyledFolderIcon = styled(FolderIcon)(folderIconStyle);

// const StyledFileIcon = styled(FileIcon)(({ theme }) => ({
//   color: "#1976d2",
//   marginLeft: theme.spacing(2),
// }));

const TreeFileIcon = styled(FileIcon)({
  fontSize: '1.25rem',
  marginLeft: 0,
  color: '#1976d2',
});

const StyledActionMenuIcon = styled(MenuIcon)`
  font-size: 1.25rem;
  color: #1976d2;
`;

const TreeCellContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'depth',
})(({ theme, depth }) => ({
  display: 'flex',
  alignItems: 'center',
  paddingLeft: theme.spacing(depth * 3),
}));

const IconContainer = styled('span')(({ theme }) => ({
  marginRight: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
}));

const NodeTypography = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isFolder',
})(({ isFolder }) => ({
  fontWeight: isFolder ? 500 : 400,
}));

const SmallExpandMore = styled(ExpandMore)({
  fontSize: '1.25rem',
});

const SmallChevronRight = styled(ChevronRight)({
  fontSize: '1.25rem',
});

const TogglePlaceholder = styled('span')({
  width: 20, // Giữ chỗ cho icon expand/collapse
});

const StyledTableRow = styled(TableRow, {
  shouldForwardProp: (prop) => prop !== 'isDragOver',
})(({ theme, isDragOver }) => ({
  cursor: 'pointer',
  backgroundColor: isDragOver ? theme.palette.action.hover : 'inherit',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const BreadcrumbContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const NavLink = styled(Link)({
  cursor: 'pointer',
});

const StyledTableContainer = styled(TableContainer)({
  maxHeight: 'calc(100vh - 200px)',
  borderTop: '1px solid rgba(224, 224, 224, 1)',
});

const CodeTableCell = styled(MuiTableCell)({
  width: '20%',
});

const TitleTableCell = styled(MuiTableCell)({
  width: '50%',
});

const TypeTableCell = styled(MuiTableCell)({
  width: '15%',
});

const ActionTableCell = styled(MuiTableCell)({
  width: '15%',
  textAlign: 'center',
});

// Re-export TableCell to avoid conflicts if used elsewhere without specific styling
const TableCell = styled(MuiTableCell)({});

// --- End Styled Components ---

// --- Dữ liệu giả lập ban đầu ---
const initialTreeData = [
  {
    id: "phong-tong-cong-ty",
    code: "VP-TCT",
    name: "I. Văn phòng Tổng Công ty",
    type: "folder",
    children: [
      {
        id: "cong-tac-chi-dao",
        code: "CT-CD",
        name: "1. Công tác chỉ đạo, điều hành",
        type: "folder",
        children: [
          { id: "file1", code: "HS-01", name: "HS-HC-01 Hồ sơ văn bản chỉ đạo, điều hành", type: "file" },
          { id: "file2", code: "HS-02", name: "Hồ sơ xây dựng, ban hành và tổ chức thực hiện kế hoạch công tác văn thư – lưu trữ...", type: "file" },
          { id: "file3", code: "HS-03", name: "Hồ sơ xây dựng, ban hành và tổ chức thực hiện kế hoạch công tác văn thư – lưu trữ... (dài)", type: "file" },
        ],
      },
      { id: "cong-tac-hanh-chinh", code: "CT-HC", name: "2. Công tác hành chính - tổng hợp", type: "folder", children: [] },
      { id: "cong-tac-van-thu", code: "CT-VT", name: "3. Công tác văn thư, lưu trữ", type: "folder", children: [] },
      { id: "cong-tac-van-hanh", code: "CT-VH", name: "4. Công tác vận hành triển khai", type: "folder", children: [] },
    ],
  },
  {
    id: "phong-tai-chinh",
    code: "P-TCKT",
    name: "II. Phòng Tài chính - Kế toán",
    type: "folder",
    children: [
      { id: "chi-dao-tc", code: "CD-TC", name: "1. Công tác chỉ đạo, điều hành", type: "folder", children: [] },
      { id: "hanh-chinh-tc", code: "HC-TC", name: "2. Công tác hành chính - tổng hợp", type: "folder", children: [] },
      { id: "van-thu-tc", code: "VT-TC", name: "3. Công tác văn thư, lưu trữ", type: "folder", children: [] },
    ],
  },
  {
    id: "phong-ke-hoach",
    code: "P-KHDT",
    name: "III. Phòng Kế hoạch - Đầu tư",
    type: "folder",
    children: [
      { id: "chi-dao-kh", code: "CD-KH", name: "1. Công tác chỉ đạo, điều hành", type: "folder", children: [] },
      { id: "hanh-chinh-kh", code: "HC-KH", name: "2. Công tác hành chính - tổng hợp", type: "folder", children: [] },
    ],
  },
];

// --- Helper Functions for Tree Manipulation ---
const findNodeAndParent = (nodes, nodeId, parent = null) => {
  for (const node of nodes) {
    if (node.id === nodeId) return { node, parent };
    if (node.children) {
      const found = findNodeAndParent(node.children, nodeId, node);
      if (found) return found;
    }
  }
  return null;
};

const findNodeById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const RecordCategoryDetail = () => {
  const { id } = useParams(); // Lấy ID bộ danh mục từ URL, ví dụ: /record-category/1
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const categoryName = location.state?.name || `Danh mục ${id}`;
  const [openAddDialog, setOpenAddDialog] = useState(false);
  // State để mở/đóng folder
  const [openFolders, setOpenFolders] = useState({});
  const [treeData, setTreeData] = useState(initialTreeData);
  const [ setDraggedItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  // const [menuNode, setMenuNode] = useState(null);

  const handleOpenMenu = useCallback((event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    // setMenuNode(node);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    // setMenuNode(null);
  }, []);

  const handleViewInfo = useCallback(() => {
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleCreateRequest = useCallback(() => {
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleToggle = useCallback((key) => {
    setOpenFolders(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);
  //   const handleAdd = useCallback(() => {
  //   setOpenAddDialog(true); // Mở dialog khi nhấn nút "Thêm mới"
  // }, []);

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false); // Đóng dialog
  };

  const handleAddSuccess = () => {
    handleCloseAddDialog();
    // TODO: Sau khi thêm mới thành công, bạn có thể gọi API để tải lại dữ liệu cây hoặc cập nhật state
  };

  useEffect(() => {
    // Mở các thư mục cấp cao nhất theo mặc định
    const initialOpen = {};
    treeData.forEach(node => {
      if (node.type === 'folder') {
        initialOpen[node.id] = true;
      }
    });
    setOpenFolders(initialOpen);
  }, [treeData]);

  const handleNodeClick = useCallback((node) => () => {
    if (node.type === "folder") {
      handleToggle(node.id);
    }
  }, [handleToggle]);

  const handleDragStart = useCallback((nodeId) => (e) => {
    e.dataTransfer.setData("text/plain", nodeId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedItemId(nodeId);
  }, []);

  const handleDragOver = useCallback((targetId) => (e) => {
    e.preventDefault();
    setDragOverItemId(targetId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverItemId(null);
  }, []);

  const handleDrop = useCallback((targetNode) => (e) => {
    e.preventDefault();
    setDragOverItemId(null);
    const sourceNodeId = e.dataTransfer.getData("text/plain");

    if (sourceNodeId === targetNode.id || targetNode.type !== 'folder') {
      return;
    }

    const newTreeData = JSON.parse(JSON.stringify(treeData));
    const sourceInfo = findNodeAndParent(newTreeData, sourceNodeId);
    const targetInfo = findNodeAndParent(newTreeData, targetNode.id);

    if (!sourceInfo || !targetInfo) return;

    // Kiểm tra kéo thả vào chính nó hoặc vào thư mục con của nó
    let current = targetInfo.parent;
    while (current) {
      if (current.id === sourceNodeId) {
        toast("Không thể di chuyển thư mục vào thư mục con của chính nó.", "warning");
        return;
      }
      current = findNodeAndParent(newTreeData, current.id)?.parent;
    }

    // Xóa node khỏi vị trí cũ
    const sourceParentChildren = sourceInfo.parent ? sourceInfo.parent.children : newTreeData;
    const sourceIndex = sourceParentChildren.findIndex(n => n.id === sourceNodeId);
    sourceParentChildren.splice(sourceIndex, 1);

    // Thêm node vào vị trí mới
    targetNode.children.push(sourceInfo.node);
    setTreeData(newTreeData);
    toast(`Đã chuyển "${sourceInfo.node.name}" vào "${targetNode.name}"`, "success");
  }, [treeData, toast]);

  // const handleGoBack = useCallback(() => {
  //   navigate(-1);
  // }, [navigate]);

  const handleNavigateHome = useCallback(() => navigate('/look-up-records'), [navigate]);

  const handleToggleClick = useCallback((e) => {
    e.stopPropagation();
    const nodeId = e.currentTarget.dataset.nodeId;
    if (nodeId) {
      handleToggle(nodeId);
    }
  }, [handleToggle]);

  const handleMenuClick = useCallback((e) => {
    e.stopPropagation();
    const nodeId = e.currentTarget.dataset.nodeId;
    const node = findNodeById(treeData, nodeId);
    if (node) {
      handleOpenMenu(e, node);
    }
  }, [treeData, handleOpenMenu]);

  const renderTreeRows = (nodes, depth = 0) => {
    return nodes.flatMap(node => {
      const rows = [
        <StyledTableRow
          key={node.id}
          draggable
          onDragStart={handleDragStart(node.id)}
          onDragOver={handleDragOver(node.id)}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop(node)}
          isDragOver={dragOverItemId === node.id && node.type === 'folder'}
          onClick={handleNodeClick(node)}
        >
          {/* Column 1: Số và ký hiệu hồ sơ */}
          <TableCell>{node.code || "--"}</TableCell>

          {/* Column 2: Tiêu đề hồ sơ (Tree) */}
          <TableCell>
            <TreeCellContent depth={depth}>
              <IconButton size="small" data-node-id={node.id} onClick={handleToggleClick}>
                {node.type === "folder" ? (
                  openFolders[node.id] ? <SmallExpandMore /> : <SmallChevronRight />
                ) : <TogglePlaceholder />}
              </IconButton>
              <IconContainer>
                {node.type === "folder" ? (
                  openFolders[node.id] ? <StyledFolderOpenIcon /> : <StyledFolderIcon />
                ) : <TreeFileIcon />}
              </IconContainer>
              <NodeTypography variant="body2" isFolder={node.type === 'folder'}>
                {node.name}
              </NodeTypography>
            </TreeCellContent>
          </TableCell>

          {/* Column 3: Loại hồ sơ */}
          <TableCell>{node.type === 'folder' ? 'Thư mục' : 'Hồ sơ'}</TableCell>

          {/* Column 4: Hành động */}
          <ActionTableCell>
            <IconButton size="small" data-node-id={node.id} onClick={handleMenuClick}>
              <StyledActionMenuIcon />
            </IconButton>
          </ActionTableCell>
        </StyledTableRow>
      ];

      if (node.type === 'folder' && openFolders[node.id] && node.children) {
        rows.push(...renderTreeRows(node.children, depth + 1));
      }

      return rows;
    });
  };

  return (
     <>
      <CustomTableToolbar
        title={`CHI TIẾT DANH MỤC HỒ SƠ - ${categoryName}`}
        // onAdd={handleAdd}
        disableAdd
        disableSynchronize
        // disableAdd={false}
        permissionsForModule="all"
      />

      {/* Breadcrumb */}
      <BreadcrumbContainer>
        <Breadcrumbs>
          <NavLink underline="hover"  onClick={handleNavigateHome}>
            Danh sách danh mục
          </NavLink>
          <Typography>{categoryName}</Typography>
        </Breadcrumbs>
      </BreadcrumbContainer>

      {/* Tree Table View */}
      <StyledTableContainer component={Paper}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <CodeTableCell>Số và ký hiệu hồ sơ</CodeTableCell>
              <TitleTableCell>Tiêu đề hồ sơ</TitleTableCell>
              <TypeTableCell>Loại hồ sơ</TypeTableCell>
              <ActionTableCell>Hành động</ActionTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {renderTreeRows(treeData)}
          </TableBody>
        </Table>
      </StyledTableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleViewInfo}>
          <ListItemText>Xem thông tin</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCreateRequest}>
          <ListItemText>Tạo yêu cầu khai thác</ListItemText>
        </MenuItem>
      </Menu>

      <AddProfileCategory
        open={openAddDialog}
        onClose={handleCloseAddDialog}
        onSuccess={handleAddSuccess}
        dialogKey="addProfileCategory" // Sử dụng một dialogKey mới cho ngữ cảnh này
      />
      </>
 
  );
};

export default RecordCategoryDetail;