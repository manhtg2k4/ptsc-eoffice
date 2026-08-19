import React, { useRef, useState, useEffect } from "react";
import { Box, Grid, styled } from "@mui/material";
import { Controller } from "react-hook-form";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";
import DynamicTableFormList from "@components/DynamicTableFormList";
import InputFilter from "@pages/DataManagement/RecordTransferRequestForm/components/InputFilter";

// Định nghĩa các trường để lọc cho InputFilter
const subTableFilters = [
  { name: "Tên", code: "label" },
  { name: "Mã", code: "name" },
];

const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const QuarterWidthGridItem = styled(Grid)({
  width: "100%",
  "@media (min-width: 600px)": {
    flexBasis: "25%",
    maxWidth: "25%",
  },
});

const FullWidthGridItem = styled(Grid)({
  width: "100%",
});

const FilterContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    width: "50%",
  },
}));

const ViewDialog = ({
  open,
  onClose,
  getValues,
  control,
  errors,
  defaultValues,
  isLoading,
}) => {
  const refDynamicTable = useRef();
  const [searchKey, setSearchKey] = useState({});
  const [inheritedViewConfigName, setInheritedViewConfigName] = useState("");

  useEffect(() => {
    if (open) {
      try {
        const viewConfigStr = localStorage.getItem("viewConfig");
        if (viewConfigStr) {
          const parsedConfig = JSON.parse(viewConfigStr);
          const options = Array.isArray(parsedConfig)
            ? parsedConfig
            : parsedConfig?.data || [];
          const viewConfigId = getValues("viewConfigId");
          const config = options.find((c) => c._id === viewConfigId);
          setInheritedViewConfigName(config ? config.name : "");
        }
      } catch (error) {
        // console.error("Lỗi khi đọc viewConfig từ localStorage:", error);
        setInheritedViewConfigName("");
      }
    }
  }, [open, getValues]);

  return (
    <CustomDialog
      disableSave
      title="Chi tiết cấu hình bộ thuộc tính"
      open={open}
      onClose={onClose}
      type="view"
      size="xl"
      isLoading={isLoading}
    >
      <FormContainer>
        <Grid container spacing={2}>
          <QuarterWidthGridItem item>
            <Controller
              disabled
              name="code"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Mã thuộc tính"
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.code}
                  helperText={errors.code?.message}
                  required
                />
              )}
            />
          </QuarterWidthGridItem>
          <QuarterWidthGridItem item>
            <Controller
              disabled
              name="name"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Tên thuộc tính"
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  required
                />
              )}
            />
          </QuarterWidthGridItem>
          <QuarterWidthGridItem item>
            <CustomInput
              disabled
              label="Kế thừa View Config"
              value={inheritedViewConfigName}
              placeholder="Không kế thừa"
            />
          </QuarterWidthGridItem>
          <FullWidthGridItem item>
            <FilterContainer>
              <InputFilter
                filter={subTableFilters}
                onSearch={setSearchKey}
                outlined
              />
            </FilterContainer>
          </FullWidthGridItem>
          <FullWidthGridItem item>
            <DynamicTableFormList
              disabled
              ref={refDynamicTable}
              defaultValue={defaultValues}
              searchKey={searchKey}
              tableStyleOptions={{
                inheritRowBackground: true,
                showCellBorder: true,
                dangerDeleteAction: true,
              }}
            />
          </FullWidthGridItem>
        </Grid>
      </FormContainer>
    </CustomDialog>
  );
};

ViewDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  getValues: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  defaultValues: PropTypes.array,
  isLoading: PropTypes.bool,
};

export default ViewDialog;
