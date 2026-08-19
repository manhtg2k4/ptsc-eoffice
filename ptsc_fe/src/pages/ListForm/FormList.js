import React, { useRef, useState, useEffect, useMemo } from "react";
import { Box, Grid, styled } from "@mui/material";
import { Controller } from "react-hook-form";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";
import DynamicTableFormList from "@components/DynamicTableFormList";
import InputFilter from "@pages/DataManagement/RecordTransferRequestForm/components/InputFilter";
import { useToast } from "@components/common/ToastProvider";

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

const FormList = ({
  title,
  open,
  onClose,
  control,
  onSave,
  getValues,
  errors,
  isLoading,
  trigger,
  idList,
}) => {
  const refDynamicTable = useRef();
  const toast = useToast();
  const [searchKey, setSearchKey] = useState({});
  const [viewConfigOptions, setViewConfigOptions] = useState([]);
  const [selectedViewConfig, setSelectedViewConfig] = useState("");
  const [dynamicTableDefaultValue, setDynamicTableDefaultValue] = useState([]);

  // Reset state khi dialog được mở
  useEffect(() => {
    if (open) {
      setSelectedViewConfig("");
      setDynamicTableDefaultValue([]);
    }
  }, [open]);

  useEffect(() => {
    try {
      const viewConfigStr = localStorage.getItem("viewConfig");
      if (viewConfigStr) {
        const parsedConfig = JSON.parse(viewConfigStr);
        // Dữ liệu có thể nằm trong thuộc tính 'data' hoặc là một mảng trực tiếp
        const options = Array.isArray(parsedConfig)
          ? parsedConfig
          : parsedConfig?.data || [];
        setViewConfigOptions(options);
      }
    } catch (error) {
      logger.error("Lỗi khi đọc viewConfig từ localStorage:", error);
    }
  }, []);

  const handleViewConfigChange = (selectedValue) => {
    const selectedCode = selectedValue || "";
    setSelectedViewConfig(selectedCode);
    const selectedConfig = viewConfigOptions.find(
      (config) => config.code === selectedCode
    );
    setDynamicTableDefaultValue(selectedConfig?.field || []);
  };

  // Tạo một key duy nhất để reset DynamicTableFormList khi defaultValue thay đổi
  const dynamicTableKey = useMemo(() => {
    return dynamicTableDefaultValue.map((f) => f.name || f.label).join("-");
  }, [dynamicTableDefaultValue]);

  const handleAction = async () => {
    const mainFormPromise = trigger(["code", "name"]);
    const dynamicTablePromise = refDynamicTable?.current?.getData
      ? refDynamicTable.current.getData()
      : Promise.resolve({ data: [], isValid: true });

    const [isMainFormValid, dynamicTableResult] = await Promise.all([
      mainFormPromise,
      dynamicTablePromise,
    ]);

    const { data: dynamicTableData, isValid: isDynamicTableValid, errors: dynamicTableErrors } =
      dynamicTableResult;

    if (!isDynamicTableValid) {
      let toastContent = "Vui lòng điền đầy đủ thông tin trong bảng.";
      if (Array.isArray(dynamicTableErrors) && dynamicTableErrors.length > 0) {
        const fieldLabelMapping = {
          label: "Tên",
          name: "Mã",
          type: "Kiểu nhập",
          apiSource: "Nguồn API",
          defaultTimePreset: "Mốc thời gian mặc định",
          isSingleDateSearch: "Hiển thị giao diện ô tìm kiếm đơn",
          minLength: "Ký tự tối thiểu",
          maxLength: "Ký tự tối đa",
          minValue: "Giá trị tối thiểu",
          maxValue: "Giá trị tối đa",
          format: "Định dạng",
          ref: "Biểu thức tham chiếu",
        };

        const errorList = dynamicTableErrors.map((err) => {
          const match = err.path ? err.path.match(/rows\[(\d+)\]\.(\w+)/) : null;
          if (match) {
            const rowIndex = parseInt(match[1]) + 1;
            const fieldName = match[2];
            const fieldLabel = fieldLabelMapping[fieldName] || fieldName;
            return `Dòng số ${rowIndex}: Trường [${fieldLabel}] - ${err.message}`;
          }
          return err.message;
        }).filter(Boolean);

        if (errorList.length > 0) {
          toastContent = (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
              {errorList.map((msg, index) => (
                <div key={index}>{msg}</div>
              ))}
            </div>
          );
        }
      }
      toast(toastContent, "error");
      return;
    }

    const selectedConfig = viewConfigOptions.find(
      (config) => config.code === selectedViewConfig
    );
    const viewConfigId = selectedConfig ? selectedConfig._id : null;

    if (isMainFormValid && isDynamicTableValid) {
      onSave({
        code: getValues("code"),
        name: getValues("name"),
        type: "attribute",
        field: dynamicTableData,
        viewConfigId: viewConfigId,
        processID: idList ? idList : null,
      });
    }
  };
  return (
    <CustomDialog
      title={title}
      open={open}
      onClose={onClose}
      onSave={handleAction}
      type="add"
      isLoading={isLoading}
      size="xl"
    >
      <FormContainer>
        <Grid container spacing={2}>
          <QuarterWidthGridItem item>
            <Controller
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
              label="Kế thừa View Config"
              select
              value={selectedViewConfig}
              onChange={handleViewConfigChange}
              options={viewConfigOptions.map((item) => ({
                label: item.name,
                value: item.code,
              }))}
              customLabel="label"
              customValue="value"
              placeholder="Chọn để tải cột..."
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
              ref={refDynamicTable}
              searchKey={searchKey}
              defaultValue={dynamicTableDefaultValue}
              tableStyleOptions={{
                inheritRowBackground: true,
                showCellBorder: true,
                dangerDeleteAction: true,
              }}
              key={dynamicTableKey} // Reset component khi defaultValue thay đổi
              // isInherited={!!selectedViewConfig}
            />
          </FullWidthGridItem>
        </Grid>
      </FormContainer>
    </CustomDialog>
  );
};

FormList.propTypes = {
  title: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  getValues: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  idList: PropTypes.string.isRequired,
  isLoading: PropTypes.bool,
  trigger: PropTypes.func.isRequired,
};

export default FormList;
