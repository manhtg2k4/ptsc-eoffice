import React, {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from "react";
import PropTypes from "prop-types";

import {
  DynamicBox,
  DynamicTable,
  DynamicTableContainer,
  DynamicTableHead,
  DynamicTableRow,
  DynamicTableCellHead,
} from "@styles/DynamicTableCustom";
import AddIcon from "@mui/icons-material/Add";
import DynamicRow from "./DynamicRow";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { validationSchema } from "./contants";
import { AddButtonContainer, AddRowButton } from "./index.styles";

const DynamicTableV3 = forwardRef(
  ({ defaultValue = [], disabled = false, configColumns = {} }, ref) => {
    const defaultRow = useMemo(() => ({
      id: Date.now(),
      type: "",
      format: "",
      required: false,
      searchable: false,
    }), []);

    const {
      control,
      formState: { errors },
      trigger,
      setValue,
      watch,
      clearErrors,
      setError
    } = useForm({
      defaultValues: {
        rows: defaultValue.length ? defaultValue : [defaultRow]
      },
      resolver: yupResolver(validationSchema),
      mode: 'onChange'
    });

    const { rows } = watch();

    const getProcessedData = useCallback(() => {
      return rows.map((row) => {
        const data = {
          name: row.name,
          code: row.code,
          type: row.type,
          required: row.required,
          searchable: row.searchable,
          format: ["date", "dynamic"].includes(row.type) ? row.format : undefined,
          ...(row.type === "text" && {
            minLength: row.minLength ? +row.minLength : undefined,
            maxLength: row.maxLength ? +row.maxLength : undefined,
          }),
          ...(row.type === "number" && {
            minValue: row.minValue ? +row.minValue : undefined,
            maxValue: row.maxValue ? +row.maxValue : undefined,
          }),
        };
        return JSON.parse(JSON.stringify(data));
      });
    }, [rows]);

    useImperativeHandle(ref, () => ({
      getData: async () => {
        const isValid = await trigger();
        if (isValid) {
          return { data: getProcessedData(), isValid: true }
        } else {
          return { data: [], isValid: false }
        }
        // return isValid ?  : null;
      },
      setError
    }));

    const handleAddRow = useCallback(() => {
      setValue('rows', [
        ...rows,
        { ...defaultRow, id: Date.now() }
      ]);
    }, [rows, setValue, defaultRow]);

    const handleRowChange = useCallback((index, updatedRow) => {
      setValue(`rows.${index}`, updatedRow, { shouldValidate: true });

      if (errors.rows?.[index]) {
        clearErrors(`rows.${index}`);
      }
    }, [setValue, errors, clearErrors]);

    const handleDeleteRow = useCallback((index) => {
      setValue('rows', rows.filter((_, i) => i !== index));
    }, [rows, setValue]);

    const tableHeaders = useMemo(() => [
      "Tên", "Mã", "Kiểu nhập", "Định dạng", "Bắt buộc", "Tìm kiếm",
      "Số ký tự tối thiểu", "Số ký tự tối đa", "Giá trị tối thiểu",
      "Giá trị tối đa", "Thứ tự", ...(!disabled ? ["Thao tác"] : [])
    ], [disabled]);

    return (
      <DynamicBox>
        <DynamicTableContainer>
          <DynamicTable>
            <DynamicTableHead>
              <DynamicTableRow>
                {tableHeaders.map((header, index) => (
                  <DynamicTableCellHead key={index}>{header}</DynamicTableCellHead>
                ))}
              </DynamicTableRow>
            </DynamicTableHead>
            <tbody>
              {rows.map((row, index) => (
                <DynamicRow
                  key={row.id}
                  row={row}
                  index={index}
                  onRowChange={handleRowChange}
                  onDelete={handleDeleteRow}
                  disabled={disabled}
                  config={configColumns}
                  control={control}
                  errors={errors}
                />
              ))}
              {!disabled && (
                <AddButtonContainer>
                  <AddRowButton onClick={handleAddRow}>
                    <AddIcon />
                  </AddRowButton>
                </AddButtonContainer>
              )}
            </tbody>
          </DynamicTable>
        </DynamicTableContainer>
      </DynamicBox>
    );
  }
);

DynamicTableV3.propTypes = {
  defaultValue: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string,
      code: PropTypes.string,
      type: PropTypes.string,
      format: PropTypes.string,
      required: PropTypes.bool,
      searchable: PropTypes.bool,
      minLength: PropTypes.number,
      maxLength: PropTypes.number,
      minValue: PropTypes.number,
      maxValue: PropTypes.number,
    })
  ),
  disabled: PropTypes.bool,
  configColumns: PropTypes.object,
};

DynamicTableV3.defaultProps = {
  defaultValue: [],
  disabled: false,
  configColumns: {},
};

DynamicTableV3.displayName = "DynamicTableV3";
export default DynamicTableV3;