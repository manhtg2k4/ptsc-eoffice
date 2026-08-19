import React, { useState, useEffect } from "react";
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

  // --- Styled Components ---
  const DialogContent = styled(Box)(({ theme }) => ({
    paddingTop: theme.spacing(2),
  }));

  const DisplayCountSelect = styled(Select)({
    minWidth: 80,
  });

  const DisplayLabel = styled(Typography)(({ theme }) => ({
    marginLeft: theme.spacing(1),
    display: "inline",
  }));

  const PaginationContainer = styled(Box)(({ theme }) => ({
    marginTop: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  }));
  
  const StyledPagination = styled(Pagination)(({ theme }) => ({
    color: theme.palette.primary.main,
    "& .MuiPaginationItem-root": {
      color: theme.palette.primary.main,
    },
  }));

  const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    marginTop: theme.spacing(2),
    boxShadow: "none",
    border: `1px solid ${theme.palette.divider}`,
  }));
  const TableCellStyled = styled(TableCell)(() => ({
    padding: 'checkbox'
  }));
  const GridStyled = styled(Grid)(() => ({
    alignItems: 'center',
  }));
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

  // --- Event Handlers ---
  const handleSave = () => onSave(selected);
  const handleSearchChange = (event) => setSearch(event.target.value);
  const handleDisplayCountChange = (event) => setDisplayCount(event.target.value);
  const handlePageChange = (_, value) => setPage(value);

  const createSelectHandler = (id) => () => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <CustomDialog
      title="Thêm người dùng vào nhóm"
      open={open}
      onClose={onClose}
      onSave={handleSave}
      type="add"
      size="md"
      isLoading={isLoading || loading}
    >
      <DialogContent>
        <GridStyled container spacing={2} >
          <Grid item xs={8}>
            <TextField
              fullWidth
              placeholder="Tìm kiếm người dùng"
              value={search}
              onChange={handleSearchChange}
              size="small"
            />
          </Grid>
          <Grid item xs={4}>
            <DisplayCountSelect
              value={displayCount}
              onChange={handleDisplayCountChange}
              size="small"
            >
              {[5, 10, 20, 50].map((num) => (
                <MenuItem key={num} value={num}>
                  {num}
                </MenuItem>
              ))}
            </DisplayCountSelect>
            <DisplayLabel variant="body2">
              Hiển thị
            </DisplayLabel>
          </Grid>
        </GridStyled>
        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCellStyled ></TableCellStyled>
                <TableCell>Tên đăng nhập</TableCell>
                <TableCell>Họ và tên</TableCell>
                <TableCell>Email</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedUsers.map((user) => (
                <TableRow key={user._id || user.id} hover>
                  <TableCellStyled >
                    <Checkbox
                      checked={selected.includes(user._id || user.id)}
                      onChange={createSelectHandler(user._id || user.id)}
                    />
                  </TableCellStyled>
                  <TableCell>{user.username || user.name}</TableCell>
                  <TableCell>{user.fullName || user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
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
          <StyledPagination
            count={Math.ceil(filteredUsers.length / displayCount)}
            page={page}
            onChange={handlePageChange}
          />
        </PaginationContainer>
      </DialogContent>
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
