import React, { useCallback, useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
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
import { styled as muiStyled } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  filtersUsers,
  permissions,
} from "@pages/Users/constantsDistrict";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { StyledDivDeital, StyledExpand } from "@styles/ManagementUnit.styles";
import CustomTable from "@components/CustomTable/CustomTable";
import { useDispatch } from "react-redux";
import {
  getDataDetailUnit,
  getDataListUserByUnit,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import Swipper from "@components/Swipper/BaseSwiper";

const PageContainer = styled("div")(({ theme }) => ({
  margin: "20px",
  [theme.breakpoints.down("sm")]: {
    margin: "12px",
  },
  [theme.breakpoints.down("xs")]: {
    margin: "8px",
  },
}));

const RotatableIconButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ open }) => ({
  transform: open ? "rotate(180deg)" : "rotate(0deg)",
  transition: "transform 0.3s",
}));

const InfoRowGrid = styled(Grid)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  alignItems: "flex-start",
  [theme.breakpoints.down("sm")]: {
    marginBottom: theme.spacing(1.5),
  },
}));

const InfoKeyTypography = styled(Typography)({
  // Có thể thêm style cho key nếu muốn
});

const BoldHeaderTypography = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
}));

const StyledHeaderGrid = styled(Grid)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
  },
}));

const StyledUserListHeaderGrid = styled(Grid)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  marginTop: theme.spacing(2),
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
  },
}));

const StyleTypography = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  [theme.breakpoints.down("sm")]: {
    fontSize: "1rem",
  },
}));

const StyledTableContainer = muiStyled(TableContainer)({
  maxHeight: 400,
  overflowY: "auto",
});

const StyledCard = muiStyled(Card)({
  maxHeight: 650,
  overflowY: "hidden",
});

const ViewUnitDetail = ({ open, onClose, id }) => {
  const dispatch = useDispatch();

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

  const handleTogglePermission = useCallback(
    (key) => {
      const newPermissions = selectedPermissions.includes(key)
        ? selectedPermissions.filter((perm) => perm !== key)
        : [...selectedPermissions, key];

      setSelectedPermissions(newPermissions);
    },
    [selectedPermissions]
  );

  const createPermissionToggleHandler = useCallback(
    (permission) => () => {
      handleTogglePermission(permission);
    },
    [handleTogglePermission]
  );

  const handleToggleExpandedInfo = useCallback(() => {
    setExpandedInfo((prev) => !prev);
  }, []);

  const handleToggleExpandedPermission = useCallback(() => {
    setExpandedPermission((prev) => !prev);
  }, []);

  const handleToggleExpandedUsers = useCallback(() => {
    setExpandedUsers((prev) => !prev);
  }, []);

  const idRef = useRef(id);
  
  // Update ref when id changes
  useEffect(() => {
    idRef.current = id;
  }, [id]);

  useEffect(() => {
    if (!id || !open) return;
    
    const fetchData = async () => {
      try {
        const result = await dispatch(getDataDetailUnit(id)).unwrap();
        if (result && result.data) {
          setDataDetail(result.data);
        }
      } catch {
        // Silently handle error
      }
    };
    
    fetchData();
  }, [dispatch, id, open]);

  const getDataDistrictFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      const currentId = idRef.current;
      if (!page || !limit || !currentId) {
        return { data: [], total: 0 };
      }
      try {
        const payload = { page, limit, id: currentId };

        if (query) payload.query = query;
        if (code) payload.code = code;
        if (sort && Object.keys(sort).length > 0) payload.sort = sort;

        const response = await dispatch(
          getDataListUserByUnit(payload)
        ).unwrap();

        return {
          data: response.data || [],
          total: response.total || response.length || 0,
        };
      } catch {
        return { data: [], total: 0 };
      }
    },
    [dispatch]
  );

 

  return (
    <Swipper
      open={open}
      onClose={onClose}
      title="Chi tiết đơn vị"
      type="view"
    >
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <PageContainer>
          {/* Thông tin cơ bản */}
          <StyledHeaderGrid container onClick={handleToggleExpandedInfo}>
            <StyleTypography variant="h6">Thông tin cơ bản</StyleTypography>
            <RotatableIconButton size="small" open={expandedInfo}>
              <ExpandMore />
            </RotatableIconButton>
          </StyledHeaderGrid>
          <Collapse in={expandedInfo} timeout="auto" unmountOnExit>
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    {[
                      {
                        key: "Đơn vị cha",
                        value: dataDetail?.parent?.name || "N/A",
                      },
                      { key: "Mã đơn vị", value: dataDetail.code },
                      { key: "Tên đơn vị", value: dataDetail.name },
                      { key: "Loại đơn vị", value: dataDetail.type },
                      { key: "Email", value: dataDetail.email },
                      { key: "Số điện thoại", value: dataDetail.phoneNumber },
                      { key: "Địa chỉ", value: dataDetail.address },
                      { key: "Mô tả", value: dataDetail.description },
                    ].map((item) => (
                      <InfoRowGrid container key={item.key} spacing={1}>
                        <Grid item xs={12} sm={3}>
                          <InfoKeyTypography variant="body2">
                            {item.key}:
                          </InfoKeyTypography>
                        </Grid>
                        <Grid item xs={12} sm={9}>
                          <Typography variant="body2">{item.value}</Typography>
                        </Grid>
                      </InfoRowGrid>
                    ))}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    {[
                      { key: "Lãnh đạo", value: dataDetail.leader },
                      { key: "Chức vụ", value: dataDetail.position },
                    ].map((item) => (
                      <InfoRowGrid container key={item.key} spacing={1}>
                        <Grid item xs={12} sm={3}>
                          <InfoKeyTypography variant="body2">
                            {item.key}:
                          </InfoKeyTypography>
                        </Grid>
                        <Grid item xs={12} sm={9}>
                          <Typography variant="body2">{item.value}</Typography>
                        </Grid>
                      </InfoRowGrid>
                    ))}
                  </Grid>
                  {/* Phân quyền chức năng */}
                  <Grid item xs={12}>
                    <StyledDivDeital>
                      <StyledExpand onClick={handleToggleExpandedPermission}>
                        Phân quyền báo cáo{" "}
                        {expandedPermission ? <ExpandLess /> : <ExpandMore />}
                      </StyledExpand>

                      {/* Danh sách phân quyền */}
                      <Collapse in={expandedPermission}>
                        <StyledTableContainer component={Paper}>
                          <Table>
                            <TableBody>
                              {permissions.map((permission) => {
                                const toggleHandler =
                                  createPermissionToggleHandler(permission);
                                return (
                                  <TableRow
                                    key={permission}
                                    hover
                                    onClick={toggleHandler}
                                  >
                                    <TableCell>{permission}</TableCell>
                                    <TableCell align="right">
                                      <Checkbox
                                        checked={selectedPermissions.includes(
                                          permission
                                        )}
                                        onChange={toggleHandler}
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </StyledTableContainer>
                      </Collapse>
                    </StyledDivDeital>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Collapse>

          {/* Danh sách người dùng */}
          <StyledUserListHeaderGrid container onClick={handleToggleExpandedUsers}>
            <BoldHeaderTypography variant="h6">
              Danh sách người dùng
            </BoldHeaderTypography>
            <RotatableIconButton size="small" open={expandedUsers}>
              <ExpandMore />
            </RotatableIconButton>
          </StyledUserListHeaderGrid>
          <Collapse in={expandedUsers} timeout="auto" unmountOnExit>
            <StyledCard variant="outlined">
              <CustomTable
                codeModule="UserManagement"
                fetchData={getDataDistrictFromApi}
                disableSynchronize
                disableMore
                customMaxHeight={450}
                uiPreset="unitModern"
                actionIconSize="medium"
                useModernActionColors
                rowsPerPageOptions={[25, 50, 100, 500]}
                lockRowsPerPageOptions
                showFilterTitleIcon={false}
                hideHeaderColumnDivider
                hideTableBorder
                hidePaginationBorder
                filter={filtersUsers}
                tableContainerStyle={{ maxHeight: 450, overflowY: "auto" }}
								encodeHtml
              />
            </StyledCard>
          </Collapse>
        </PageContainer>
      </LocalizationProvider>
    </Swipper>
  );
};

ViewUnitDetail.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

ViewUnitDetail.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default ViewUnitDetail;
