import React, { useEffect } from "react";
import { SkyGrid, SkyTypography } from "@styles/SkyStyles";
import { Controller } from "react-hook-form";
import CustomInput from "@components/CustomInput/CustomInput";
import CustomSwipper from "@components/Swipper";
import PropTypes from "prop-types";
import DynamicValuesTable from "./DynamicValuesTable";
import { FormContainer, FullWidthGridItem, HalfWidthGridItem } from "@styles/FormDialog.styles";
import { StyleBoxTitle } from "./DynamicValuesTable.styles";

const ViewDialog = ({ open, onClose, control, reset, defaultData, idDocumentParent }) => {
  useEffect(() => {
    if (open && defaultData) {
      reset(defaultData);
    }
  }, [open, defaultData, reset]);

  return (
    <CustomSwipper
      open={open}
      onClose={onClose}
      title="Xem chi tiết danh mục"
      type="view"
    >
      <FormContainer>
        <StyleBoxTitle>
          <SkyTypography variant="h5">Thông tin chung</SkyTypography>
        </StyleBoxTitle>
        <SkyGrid container spacing={2}>
          <HalfWidthGridItem item>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Mã danh mục"
                  {...field}
                  disabled
                />
              )}
            />
          </HalfWidthGridItem>
          <HalfWidthGridItem item>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Tên danh mục"
                  {...field}
                  disabled
                />
              )}
            />
          </HalfWidthGridItem>
          {/* <HalfWidthGridItem item>
            <Controller
              name="originalName"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Tên danh mục gốc"
                  {...field}
                  disabled
                />
              )}
            />
          </HalfWidthGridItem> */}
          <FullWidthGridItem item>
            <StyleBoxTitle>
              <SkyTypography variant="h5">Danh sách danh mục con</SkyTypography>
            </StyleBoxTitle>
            <DynamicValuesTable defaultValue={defaultData?.data} disabled idDocumentParent={idDocumentParent} type={'view'} customMaxHeight={600}/>
          </FullWidthGridItem>
        </SkyGrid>
      </FormContainer>
    </CustomSwipper>
  );
};

ViewDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  reset: PropTypes.func.isRequired,
  defaultData: PropTypes.object,
};

export default ViewDialog;