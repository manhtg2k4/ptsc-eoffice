// src/pages/RecordCategory/RecordCategoryGrid.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Folder as FolderIcon } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import CustomTableToolbar from "@components/CustomTable/CustomTableToolbar";
import AddCategorySet from "./AddCategorySet";

// Styled components đã chỉnh sửa để giống ảnh
const FolderItem = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  cursor: "pointer",
  transition: "transform 0.2s, box-shadow 0.2s",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: theme.shadows[8],
  },
  paddingTop: theme.spacing(2),
}));

const StyledFolderIcon = styled(FolderIcon)(() => ({
  fontSize: "150px", // To hơn để giống ảnh (icon thư mục lớn, không background bao quanh)
  color: "#ffb300", // Màu vàng cam giống icon folder chuẩn
}));

const FolderName = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  fontSize: "0.875rem",
  wordBreak: "break-word",
  textAlign: "center",
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  display: "-webkit-box",
  "-webkit-line-clamp": 2,
  "-webkit-box-orient": "vertical",
  overflow: "hidden",
  maxWidth: 140,
}));

const EmptyMessageContainer = styled(Box)(({ theme }) => ({
  textAlign: "center",
  marginTop: theme.spacing(4),
}));

const RecordCategoryGrid = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [inputValue, setInputValue] = useState("");

  const [openAddDialog, setOpenAddDialog] = useState(false);
  // --- START: Thêm state cho bộ lọc ---
  const [openFilter, setOpenFilter] = useState(false);
  const filterOptions = [];
  const [selectedColumns, setSelectedColumns] = useState(filterOptions.map(f => f.name));
  const [tempSelectedColumns, setTempSelectedColumns] = useState(selectedColumns);
  // --- END: Thêm state cho bộ lọc ---

  // Giả lập dữ liệu
  useEffect(() => {
    const fakeData = [
      { id: 1, name: "Bộ danh mục theo QD123 - 2025", code: "DM001" },
      { id: 2, name: "Bộ danh mục theo QD113 - 2024", code: "DM002" },
      { id: 3, name: "Bộ danh mục theo QD234 - 2023", code: "DM003" },
      { id: 4, name: "Bộ danh mục theo QD244 - 2022", code: "DM004" },
      // Thêm nhiều hơn để giống ảnh
    ];
    setTimeout(() => {
      setData(fakeData);
      setLoading(false);
      const initialFiltered = fakeData.filter(item => item.name.toLowerCase().includes(searchText.toLowerCase()));
      setFilteredData(initialFiltered);
    }, 500);
  }, []);

  // Logic tìm kiếm
  useEffect(() => {
    if (!searchText) {
      setFilteredData(data);
    } else {
      const filtered = data.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchText, data]);

  const handleSearch = () => {
    setSearchText(inputValue.trim());
  };

  const handleClearSearch = () => {
    setSearchText("");
    setInputValue("");
  };

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const handleFolderClick = useCallback((id) => () => {
    navigate(`/look-up-records/${id}`);
  }, [navigate]);

  const handleAdd = () => {
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
  };

  const handleAddSuccess = () => {
    handleCloseAddDialog();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  // --- Bộ lọc handlers (giữ nguyên) ---
  const handleFilterToggle = useCallback(() => {
    if (!openFilter) {
      setTempSelectedColumns(selectedColumns);
    }
    setOpenFilter(prev => !prev);
  }, [openFilter, selectedColumns]);

  const handleFilterAway = useCallback(() => setOpenFilter(false), []);

  const handleColumnFilterChange = useCallback((columnName) => () => {
    setTempSelectedColumns(prev =>
      prev.includes(columnName)
        ? prev.filter(c => c !== columnName)
        : [...prev, columnName]
    );
  }, []);

  const handleApplyFilter = useCallback(() => {
    setSelectedColumns(tempSelectedColumns);
    handleFilterAway();
  }, [tempSelectedColumns, handleFilterAway]);
  // --- End bộ lọc ---

  if (loading) return <CircularProgress />;

  return (
    <>
      <CustomTableToolbar
        searchText={searchText}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onSearchClick={handleSearch}
        onClearSearch={handleClearSearch}
        title="Quản lý danh mục"
        disableSynchronize
        onAdd={handleAdd}
        disableAdd={false}
        permissionsForModule={"all"}
        filter={filterOptions}
        selectedColumns={selectedColumns}
        tempSelectedColumns={tempSelectedColumns}
        openFilter={openFilter}
        onFilterToggle={handleFilterToggle}
        onFilterAway={handleFilterAway}
        onColumnFilterChangeDirect={handleColumnFilterChange}
        onApplyFilter={handleApplyFilter}
      />

      <Box p={4}>
        <Grid container spacing={6} > {/* spacing lớn hơn để khoảng cách rộng như ảnh */}
          {filteredData.map((item) => (
            <Grid item key={item.id}>
              <FolderItem onClick={handleFolderClick(item.id)}>
                <StyledFolderIcon />
                <FolderName>{item.name}</FolderName>
              </FolderItem>
            </Grid>
          ))}
        </Grid>

        {filteredData.length === 0 && (
          <EmptyMessageContainer>
            <Typography>
              Không tìm thấy danh mục nào.
            </Typography>
          </EmptyMessageContainer>
        )}
      </Box>

      <AddCategorySet
        open={openAddDialog}
        onClose={handleCloseAddDialog}
        onSuccess={handleAddSuccess}
        dialogKey="addDocumentBook"
      />
    </>   
  );
};

export default RecordCategoryGrid;