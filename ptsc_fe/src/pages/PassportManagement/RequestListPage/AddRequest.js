import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { Grid, Typography } from "@mui/material";
import withSharedComponents from "@components/WrapperComponent";
import {
  StyledBoxOptionTypeAdd,
  TextOption,
} from "@styles/PassportManagement.styles";
import AddMyRequest from "./components/AddMyRequest";
import AddOrganizationalRequest from "./components/AddOrganizationalRequest";

const AddRequest = (props) => {
  const {
    open,
    onClose,
    onSuccess,
    sharedComponents,
    // mode = "add",
    title, // Nhận title từ props
    isActionMenu = true,
  } = props;
  const { Dialog } = sharedComponents;
  const [selectedType, setSelectedType] = useState(null);

  const handleSelectPersonal = useCallback(() => {
    setSelectedType("personal");
  }, []);

  const handleSelectGroup = useCallback(() => {
    setSelectedType("group");
  }, []);

  const handleCloseSubDialog = useCallback(() => {
    setSelectedType(null);
  }, []);

  return (
    <>
      <Dialog
        title={title || "Thêm mới hộ chiếu"}
        titleAlign="center"
        open={open && selectedType === null}
        onClose={onClose}
        disableSave
      >
        <Grid container spacing={2} mt={1}>
          <Grid item xs={6}>
            <StyledBoxOptionTypeAdd
              isType="personal"
              onClick={handleSelectPersonal}
            >
              <TextOption variant="h6">Cá nhân</TextOption>
              <Typography variant="body2" mt={1}>
                Thêm mơi yêu cầu cá nhân
              </Typography>
            </StyledBoxOptionTypeAdd>
          </Grid>

          <Grid item xs={6}>
            <StyledBoxOptionTypeAdd isType="group" onClick={handleSelectGroup}>
              <TextOption variant="h6">Đoàn</TextOption>
              <Typography variant="body2" mt={1}>
                Thêm mới yêu cầu đoàn ra
              </Typography>
            </StyledBoxOptionTypeAdd>
          </Grid>
        </Grid>
      </Dialog>
      <AddMyRequest
        open={open && selectedType === "personal"}
        onClose={handleCloseSubDialog}
        onSuccess={onSuccess}
        title="Thêm mới yêu cầu cá nhân"
        isActionMenu={isActionMenu}
      />
      <AddOrganizationalRequest
        open={open && selectedType === "group"}
        onClose={handleCloseSubDialog}
        onSuccess={onSuccess}
        title="Thêm mới yêu cầu đoàn ra"
        isActionMenu={isActionMenu}
      />
    </>
  );
};

AddRequest.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  sharedComponents: PropTypes.object.isRequired,
  title: PropTypes.string, // Thêm prop title
  isActionMenu: PropTypes.bool,
};

export default withSharedComponents(AddRequest);
