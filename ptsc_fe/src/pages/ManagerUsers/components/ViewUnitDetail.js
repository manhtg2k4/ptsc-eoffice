import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
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
} from "@mui/material";
// import { useForm } from "react-hook-form";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  columnsUsers,
  filtersUsers,
  permissions,
} from "@pages/ManagerUsers/constantsDistrict";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import {
  RotatableIconButton,
  StyledCheckBox,
  StyledDivDeital,
  StyledExpand,
  StyledGridContainer,
  StyledGridUnit,
  StyledGridUnitView,
  StyledTypography,
} from "@styles/ManagementUnit.styles";
import CustomTable from "@components/CustomTable/CustomTable";
import { useDispatch } from "react-redux";
import {
  getDataDetailUnit,
  getDataListUserByUnit,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { useLocation } from "react-router-dom";

const ViewUnitDetail = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { id } = location.state || {};

  const [expandedInfo, setExpandedInfo] = useState(true);
  const [expandedPermission, setExpandedPermission] = useState(false);
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
  // const handleToggle = (key) => {
  //   const newPermissions = selectedPermissions.includes(key)
  //     ? selectedPermissions.filter((perm) => perm !== key)
  //     : [...selectedPermissions, key];

  //   setSelectedPermissions(newPermissions);
  // };

  const handleToggle = useCallback((key) => {
    setSelectedPermissions((prevSelected) =>
      prevSelected.includes(key)
        ? prevSelected.filter((perm) => perm !== key)
        : [...prevSelected, key]
    );
  }, []);

  useEffect(() => {
    const result = dispatch(getDataDetailUnit(id)).unwrap();
    result.then((data) => {
      if (data && data.data) {
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
            getDataListUserByUnit({ page, limit, query, code, sort })
          ).unwrap();
        } else if (sort) {
          //Chỉ sort thì rơi vào nhánh này
          response = await dispatch(
            getDataListUserByUnit({ page, limit, query, code, sort })
          ).unwrap();
        } else {
          //Mặc định
          response = await dispatch(
            getDataListUserByUnit({ page, limit, sort })
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
    [dispatch] // Dependency chỉ có dispatch, không phụ thuộc vào list
  );

  const handleToggleExpandedInfo = useCallback(() => {
    setExpandedInfo((prev) => !prev);
  }, []);

  const handleToggleExpandedPermission = useCallback(() => {
    setExpandedPermission((prev) => !prev);
  }, []);

  const createPermissionClickHandler = useCallback(
    (permission) => {
      return () => handleToggle(permission);
    },
    [handleToggle]
  );

  // Tạo hàm stable
  const handleToggleExpandedUsers = useCallback(() => {
    setExpandedUsers((prev) => !prev);
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div style={{ margin: "20px" }}>
        {/* Thông tin cơ bản */}
        <StyledGridUnit
          container
          // onClick={() => setExpandedInfo(!expandedInfo)}
          onClick={handleToggleExpandedInfo}
        >
          <StyledTypography variant="h6">Thông tin cơ bản</StyledTypography>
          <IconButton size="small">
            <RotatableIconButton
            // style={{ transform: expandedInfo ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </IconButton>
        </StyledGridUnit>
        <Collapse in={expandedInfo} timeout="auto" unmountOnExit>
          <Card variant="outlined">
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
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
                    <StyledGridUnitView container key={item.key} spacing={1}>
                      <Grid item xs={2}>
                        <Typography variant="body2">{item.key}:</Typography>
                      </Grid>
                      <Grid item xs={10}>
                        <Typography variant="body2">{item.value}</Typography>
                      </Grid>
                    </StyledGridUnitView>
                  ))}
                </Grid>

                <Grid item xs={6}>
                  {[
                    { key: "Lãnh đạo", value: dataDetail.leader },
                    { key: "Chức vụ", value: dataDetail.position },
                  ].map((item) => (
                    <StyledGridUnitView container key={item.key} spacing={1}>
                      <Grid item xs={2}>
                        <Typography variant="body2">{item.key}:</Typography>
                      </Grid>
                      <Grid item xs={10}>
                        <Typography variant="body2">{item.value}</Typography>
                      </Grid>
                    </StyledGridUnitView>
                  ))}
                </Grid>
                {/* Phân quyền chức năng */}
                <Grid item xs={12}>
                  <StyledDivDeital>
                    <StyledExpand
                      // onClick={() => setExpandedPermission(!expandedPermission)}
                      onClick={handleToggleExpandedPermission}
                    >
                      Phân quyền báo cáo{" "}
                      {expandedPermission ? <ExpandLess /> : <ExpandMore />}
                    </StyledExpand>

                    {/* Danh sách phân quyền */}
                    <Collapse in={expandedPermission}>
                      <TableContainer component={Paper}>
                        <Table>
                          <TableBody>
                            {/* {permissions.map((permission, index) => ( */}
                            {permissions.map((permission) => (
                              <TableRow
                                key={permission}
                                hover
                                // onClick={() => handleToggle(permission)}
                                onClick={createPermissionClickHandler(
                                  permission
                                )}
                              >
                                <TableCell>{permission}</TableCell>
                                <TableCell align="right">
                                  <StyledCheckBox
                                    checked={selectedPermissions.includes(
                                      permission
                                    )}
                                    // onChange={() => handleToggle(permission)}
                                    onClick={createPermissionClickHandler(
                                      permission
                                    )}
                                    // color="primary"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Collapse>
                  </StyledDivDeital>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Collapse>

        {/* Danh sách người dùng */}
        <StyledGridContainer
          container
          // onClick={() => setExpandedUsers(!expandedUsers)}
          onClick={handleToggleExpandedUsers}
        >
          <StyledTypography variant="h6">Danh sách người dùng</StyledTypography>
          <IconButton size="small">
            <RotatableIconButton
            //  style={{ transform: expandedUsers ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </IconButton>
        </StyledGridContainer>
        <Collapse in={expandedUsers} timeout="auto" unmountOnExit>
          <Card variant="outlined">
            <CustomTable
              fetchData={getDataDistrictFromApi}
              disableSynchronize
              disableMore
              columns={columnsUsers}
              filter={filtersUsers}
              // onAdd={() => handleOpenDialog("add")}
              // onDelete={(ids) => handleOpenDialog("delete", ids)}
              // onEdit={(record) => handleOpenDialog("edit", record)}
              // onView={(record) => navigate(`/manage-unit/${record}`)}
							encodeHtml
            ></CustomTable>
          </Card>
        </Collapse>
      </div>
    </LocalizationProvider>
  );
};

export default ViewUnitDetail;
