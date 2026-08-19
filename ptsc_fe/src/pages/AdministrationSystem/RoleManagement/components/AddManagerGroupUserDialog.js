import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TableHead,
  Paper,
  Grid,
  TextField,
  Select,
  MenuItem,
  Pagination,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { useDispatch, useSelector } from "react-redux";
import { getDataListUserByUnit } from "@redux/slices/SharedCategory/managementUnitSlice";
import PropTypes from "prop-types";

const CenteredGrid = styled(Grid)({
  alignItems: 'center',
});

const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const SearchGridItem = styled(Grid)({
  flexBasis: '66.666667%',
  maxWidth: '66.666667%',
});

const SelectGridItem = styled(Grid)({
  flexBasis: '33.333333%',
  maxWidth: '33.333333%',
});

const DisplaySelect = styled(Select)({
  minWidth: 80,
});

const InlineTypography = styled(Typography)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  display: 'inline',
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const PaginationContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

const CheckboxTableCell = styled(TableCell)({
  padding: '0 16px',
});

const PrimaryPagination = styled(Pagination)(({ theme }) => ({
  '& .Mui-selected': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
}));

const StyledTableCell = styled(TableCell)({
  // No custom styles needed, just wrapping to satisfy ESLint
});

const AddManagerGroupUserDialog = ({
  open,
  onClose,
  onSave,
  isLoading,
  unitId,
  selectedUserIds = [],
}) => {
  const dispatch = useDispatch();
  const { listUserByUnit, loading } = useSelector((state) => state.unit);
  const [search, setSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(5);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) {
      dispatch(getDataListUserByUnit({ page: 1, limit: 100, id: unitId }));
      setSelected(selectedUserIds);
    }
  }, [open, dispatch, unitId, selectedUserIds]);

  // Lọc user theo search
  const filteredUsers = Array.isArray(listUserByUnit)
    ? listUserByUnit.filter((u) =>
        (u.name || u.username || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : [];

  // Phân trang
  const pagedUsers = filteredUsers.slice(
    (page - 1) * displayCount,
    page * displayCount
  );

  // const handleSelect = (id) => {
  //   setSelected((prev) =>
  //     prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  //   );
  // };

  const handleSelect = useCallback((id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

   const handleSelectChange = useCallback((id) => () => {
    handleSelect(id);
  }, [handleSelect]);

  const handleSave = useCallback(() => {
    onSave(selected);
  }, [onSave, selected]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
  }, []);

  const handleDisplayCountChange = useCallback((e) => {
    setDisplayCount(e.target.value);
  }, []);

  const handlePageChange = useCallback((_, value) => {
    setPage(value);
  }, []);

  return (
    <CustomDialog
      title="Thêm người dùng vào nhóm"
      open={open}
      onClose={onClose}
      // onSave={() => onSave(selected)}
      onSave={handleSave}
      type="add"
      size="md"
      isLoading={isLoading || loading}
    >
      <FormContainer>
        <CenteredGrid container spacing={2}>
          <SearchGridItem item>
            <TextField
              fullWidth
              placeholder="Tìm kiếm người dùng"
              value={search}
              // onChange={(e) => setSearch(e.target.value)}
              onChange={handleSearchChange}
              size="small"
            />
          </SearchGridItem>
          <SelectGridItem item>
            <DisplaySelect
              value={displayCount}
              // onChange={(e) => setDisplayCount(e.target.value)}
              onChange={handleDisplayCountChange}
              size="small"
            >
              {[5, 10, 20, 50].map((num) => (
                <MenuItem key={num} value={num}>
                  {num}
                </MenuItem>
              ))}
            </DisplaySelect>
            <InlineTypography variant="body2">
              Hiển thị
            </InlineTypography>
          </SelectGridItem>
        </CenteredGrid>
        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <CheckboxTableCell />
                <StyledTableCell>Tên đăng nhập</StyledTableCell>
                <StyledTableCell>Họ và tên</StyledTableCell>
                <StyledTableCell>Email</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedUsers.map((user) => (
                <TableRow key={user._id || user.id} hover>
                  <CheckboxTableCell>
                    <Checkbox
                      checked={selected.includes(user._id || user.id)}
                      // onChange={() => handleSelect(user._id || user.id)}
                      onChange={handleSelectChange(user._id || user.id)}
                    />
                  </CheckboxTableCell>
                  <StyledTableCell>{user.username || user.name}</StyledTableCell>
                  <StyledTableCell>{user.fullName || user.name}</StyledTableCell>
                  <StyledTableCell>{user.email}</StyledTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
        <PaginationContainer>
          <Typography variant="body2">
            Hiển thị {pagedUsers.length > 0 ? (page - 1) * displayCount + 1 : 0}
            -{(page - 1) * displayCount + pagedUsers.length} trong số{" "}
            {filteredUsers.length} người dùng
          </Typography>
          <PrimaryPagination
            count={Math.ceil(filteredUsers.length / displayCount)}
            page={page}
            // onChange={(_, value) => setPage(value)}
            onChange={handlePageChange}
          />
        </PaginationContainer>
      </FormContainer>
    </CustomDialog>
  );
};
AddManagerGroupUserDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  unitId: PropTypes.string,
  selectedUserIds: PropTypes.arrayOf(PropTypes.string),
};

AddManagerGroupUserDialog.defaultProps = {
  isLoading: false,
};

export default AddManagerGroupUserDialog;
