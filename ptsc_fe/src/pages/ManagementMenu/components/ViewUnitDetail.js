import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Checkbox,
  Collapse,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  styled,
} from "@mui/material";
// import { useForm } from "react-hook-form";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  columnsUsers,
  filtersUsers,
} from "@pages/ManagementMenu/constantsDistrict";
import { ExpandMore } from "@mui/icons-material";
import { StyledDivDeital, StyledExpand } from "@styles/ManagementUnit.styles";
import CustomTable from "@components/CustomTable/CustomTable";
import { useDispatch } from "react-redux";
import {
  getDataDetailUnit,
  getDataListUserByUnit,
  deleteUser,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { useLocation, useNavigate } from "react-router-dom";
import DeleteDialog from "./DeleteDialog";
import { useToast } from "@components/common/ToastProvider";
import PropTypes from "prop-types";

const PageContainer = styled("div")(({ theme }) => ({
  margin: theme.spacing(2.5),
}));

const SectionHeader = styled(Grid)(({ theme }) => ({
  cursor: "pointer",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: theme.spacing(1.25),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
}));

const ExpandIcon = styled(ExpandMore, {
  shouldForwardProp: (prop) => prop !== "isExpanded",
})(({ isExpanded }) => ({
  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
  transition: "transform 0.3s",
}));

const StyledCard = styled(Card)({
  // Wrapper to satisfy ESLint
});

const InfoGridContainer = styled(Grid)({
  // Wrapper for spacing
});

const HalfWidthGridItem = styled(Grid)({
  width: "100%",
  "@media (min-width: 600px)": {
    width: "50%",
  },
});

const FullWidthGridItem = styled(Grid)({
  width: "100%",
});

const InfoItemGrid = styled(Grid)(({ theme }) => ({
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

const InfoKeyGridItem = styled(Grid)({
  flexBasis: "16.666667%",
  maxWidth: "16.666667%",
});

const InfoValueGridItem = styled(Grid)({
  flexBasis: "83.333333%",
  maxWidth: "83.333333%",
});

const StyledTableCell = styled(TableCell)({
  // Wrapper to satisfy ESLint
});

const RightAlignedTableCell = styled(TableCell)({
  textAlign: "right",
});

const PrimaryCheckbox = styled(Checkbox)(({ theme }) => ({
  "&.Mui-checked": {
    color: theme.palette.primary.main,
  },
  color: theme.palette.action.active,
}));

const ViewUnitDetail = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { id } = location.state || {};

  const [expandedInfo, setExpandedInfo] = useState(true);
  const [selectedIds, setSelectedIds] = useState();
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [expandedUsers, setExpandedUsers] = useState(true);
  const [dataDetail, setDataDetail] = useState({
    position: "",
    code: "",
    name: "",
    type: "",
    email: "",
    phoneNumber: "",
    address: "",
    description: "",
    leader: "",
    parent: {
      name: "",
    },
  });
  const [openDialogs, setOpenDialogs] = useState({
    view: false,
    edit: false,
    add: false,
    delete: false,
  });
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false); // Thêm state để quản lý loading
  useEffect(() => {
    const result = dispatch(getDataDetailUnit(id)).unwrap();
    result.then((data) => {
      if (data && data.data) {
        let array = data?.data?.roleGroup?.roles;
        setSelectedPermissions(array);
        setDataDetail(data.data);
      }
    });
  }, [dispatch, id]);
  const getDataDistrictFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      if (!page || !limit) {
        return { data: [], total: 0 };
      }
      try {
        let response;
        if (query !== "" && code && sort) {
          //Tìm kiếm rơi vào nhánh này
          response = await dispatch(
            getDataListUserByUnit({ page, limit, query, code, sort, id })
          ).unwrap();
        } else if (sort) {
          //Chỉ sort thì rơi vào nhánh này
          response = await dispatch(
            getDataListUserByUnit({ page, limit, query, code, sort, id })
          ).unwrap();
        } else {
          //Mặc định
          response = await dispatch(
            getDataListUserByUnit({ page, limit, sort, id })
          ).unwrap();
        }
        return {
          data: response.data || [], // Giả sử fetchDocuments trả về mảng dữ liệu
          total: response.total || response.length || 0, // Cần điều chỉnh nếu API trả về total
        };
      } catch (error) {
        return { data: [], total: 0 };
      }
    },
    [dispatch, id] // Dependency chỉ có dispatch, không phụ thuộc vào list
  );

  //   const handleCloseDialog = (dialogKey) => {
  //     setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  //   };
  // const handleOpenDialog = async (dialogKey, idsOrRecord = null) => {
  //     if (idsOrRecord) {
  //       if (dialogKey === "edit") {
  //         setSelectedIds(idsOrRecord);
  //         // const result = await dispatch(getDataDetailUnitUpdate(idsOrRecord)).unwrap();
  //         // reset(result.data);
  //       }
  //       else if (dialogKey === "view") {
  //         // setSelectedIds(idsOrRecord);
  //         // const result = await dispatch(getDataDetailUnit(idsOrRecord)).unwrap();
  //         // reset(result.data);
  //       } else if (dialogKey === "delete") {
  //         setSelectedIds(
  //           Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
  //         );
  //       }
  //     }
  //     setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  //   };
  const handleCloseDialog = useCallback((dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  }, []);
  const handleOpenDialog = useCallback(
    async (dialogKey, idsOrRecord = null) => {
      if (idsOrRecord) {
        if (dialogKey === "edit") {
          setSelectedIds(idsOrRecord);
          // const result = await dispatch(getDataDetailUnitUpdate(idsOrRecord)).unwrap();
          // reset(result.data);
        } else if (dialogKey === "view") {
          // setSelectedIds(idsOrRecord);
          // const result = await dispatch(getDataDetailUnit(idsOrRecord)).unwrap();
          // reset(result.data);
        } else if (dialogKey === "delete") {
          setSelectedIds(
            Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
          );
        }
      }
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
    },
    []
  );
  const handleDelete = async () => {
    setIsLoading(true);
    if (!selectedIds?.length) {
      toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
      return;
    }
    try {
      await Promise.all(
        selectedIds.map((ids) =>
          dispatch(deleteUser({ idUser: ids, idUnit: id }))
        )
      );
      handleCloseDialog("delete");
      setSelectedIds();
      setIsLoading(false);
      toast(`Đã xóa ${selectedIds.length} bản ghi thành công!`, "success");
    } catch (error) {
      toast("Đã xảy ra lỗi khi xóa!", "error");
      setIsLoading(false);
    }
  };

  const handleToggleInfo = useCallback(() => {
    setExpandedInfo((prev) => !prev);
  }, []);

  const handleToggleUsers = useCallback(() => {
    setExpandedUsers((prev) => !prev);
  }, []);

  const handleAddUser = useCallback(() => {
    navigate(`/manage-users/add`, { state: { id: id, view: "add" } });
  }, [navigate, id]);

  const handleEditUser = useCallback(
    (ids) => {
      navigate(`/manage-users/${ids}`, { state: { id: id, view: "update" } });
    },
    [navigate, id]
  );

  const handleViewUser = useCallback(
    (ids) => {
      navigate(`/manage-user/${ids}`, { state: { id: id, view: "view" } });
    },
    [navigate, id]
  );

  const handleDeleteUser = useCallback(
    (ids) => handleOpenDialog("delete", ids),
    [handleOpenDialog]
  );
  const handleCloseDeleteDialog = useCallback(
    () => handleCloseDialog("delete"),
    [handleCloseDialog]
  );
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <PageContainer>
        {/* Thông tin cơ bản */}
        <SectionHeader
          container
          // onClick={() => setExpandedInfo(!expandedInfo)}
          onClick={handleToggleInfo}
        >
          <SectionTitle variant="h6">Thông tin cơ bản</SectionTitle>
          <IconButton size="small">
            <ExpandIcon isExpanded={expandedInfo} />
          </IconButton>
        </SectionHeader>
        <Collapse in={expandedInfo} timeout="auto" unmountOnExit>
          <StyledCard variant="outlined">
            <CardContent>
              <InfoGridContainer container spacing={2}>
                <HalfWidthGridItem item>
                  {[
                    { key: "Đơn vị cha", value: dataDetail?.parent?.name },
                    { key: "Mã đơn vị", value: dataDetail.code },
                    { key: "Tên đơn vị", value: dataDetail.name },
                    { key: "Loại đơn vị", value: dataDetail.type },
                    { key: "Email", value: dataDetail.email },
                    { key: "Số điện thoại", value: dataDetail.phoneNumber },
                    { key: "Địa chỉ", value: dataDetail.address },
                    { key: "Mô tả", value: dataDetail.description },
                    // ].map((item, index) => (
                  ].map((item) => (
                    // <InfoItemGrid container key={index} spacing={1}>
                    <InfoItemGrid container key={item.key} spacing={1}>
                      <InfoKeyGridItem item>
                        <Typography variant="body2">{item.key}:</Typography>
                      </InfoKeyGridItem>
                      <InfoValueGridItem item>
                        <Typography variant="body2">{item.value}</Typography>
                      </InfoValueGridItem>
                    </InfoItemGrid>
                  ))}
                </HalfWidthGridItem>

                <HalfWidthGridItem item>
                  {[
                    { key: "Lãnh đạo", value: dataDetail.leader },
                    { key: "Chức vụ", value: dataDetail.position },
                  ].map((item) => (
                    <InfoItemGrid container key={item.key} spacing={1}>
                      <InfoKeyGridItem item>
                        <Typography variant="body2">{item.key}:</Typography>
                      </InfoKeyGridItem>
                      <InfoValueGridItem item>
                        <Typography variant="body2">{item.value}</Typography>
                      </InfoValueGridItem>
                    </InfoItemGrid>
                  ))}
                </HalfWidthGridItem>
                {/* Phân quyền chức năng */}
                <FullWidthGridItem item>
                  <StyledDivDeital>
                    <StyledExpand>Phân quyền chức năng</StyledExpand>

                    {/* Danh sách phân quyền */}
                    {/* <Collapse in={true}> */}
                    <Collapse in>
                      <TableContainer component={Paper}>
                        <Table>
                          <TableBody>
                            {/* {selectedPermissions.map((permission, index) => ( */}
                            {selectedPermissions.map((permission) => (
                              <TableRow
                                //  key={index}
                                key={permission.id}
                              >
                                <StyledTableCell>
                                  {permission.titleFunction}
                                </StyledTableCell>
                                <RightAlignedTableCell>
                                  <PrimaryCheckbox
                                    checked={
                                      permission.methods?.[0]?.allow || false
                                    }
                                    disabled
                                  />
                                </RightAlignedTableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Collapse>
                  </StyledDivDeital>
                </FullWidthGridItem>
              </InfoGridContainer>
            </CardContent>
          </StyledCard>
        </Collapse>

        {/* Danh sách người dùng */}
        <SectionHeader
          container
          // onClick={() => setExpandedUsers(!expandedUsers)}
          onClick={handleToggleUsers}
        >
          <SectionTitle variant="h6">Danh sách người dùng</SectionTitle>
          <IconButton size="small">
            <ExpandIcon isExpanded={expandedUsers} />
          </IconButton>
        </SectionHeader>
        <Collapse in={expandedUsers} timeout="auto" unmountOnExit>
          <StyledCard variant="outlined">
            <CustomTable
              fetchData={getDataDistrictFromApi}
              disableSynchronize
              // disableMore
              reload={isLoading}
              columns={columnsUsers}
              filter={filtersUsers}
              // onAdd={() => navigate(`/manage-users/add`,{ state: { id: id,view:'add' } })}
              // onDelete={(ids) => handleOpenDialog("delete", ids)}
              // onEdit={(ids) => navigate(`/manage-users/${ids}`,{ state: { id: id,view:'update' } })}
              // onView={(ids) => navigate(`/manage-user/${ids}`,{ state: { id: id,view:'view' } })}
              onAdd={handleAddUser}
              onDelete={handleDeleteUser}
              onEdit={handleEditUser}
              onView={handleViewUser}
							encodeHtml
            ></CustomTable>
          </StyledCard>
        </Collapse>

        <DeleteDialog
          open={openDialogs.delete}
          // onClose={() => handleCloseDialog("delete")}
          onClose={handleCloseDeleteDialog}
          onSave={handleDelete}
          selectedIds={selectedIds}
          isLoading={isLoading}
        />
      </PageContainer>
    </LocalizationProvider>
  );
};

ViewUnitDetail.propTypes = {
  listRoles: PropTypes.array.isRequired,
};

export default ViewUnitDetail;
