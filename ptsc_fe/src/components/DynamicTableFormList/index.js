import React, {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import { yupResolver } from "@hookform/resolvers/yup";

import {
  DynamicBox,
  DynamicTable,
  DynamicTableContainer,
  DynamicTableHead,
  DynamicTableRow,
  // DynamicTableCellHead,
} from "@styles/DynamicTableCustom";
import AddIcon from "@mui/icons-material/Add";
import DynamicRow from "./DynamicRow";
import { useForm } from "react-hook-form";
import { validationSchema } from "./contants";
import {
  AddButtonContainer,
  AddRowButton,
  NoDataCell,
  RequiredAsterisk,
  StyledHeaderCell,
} from "@styles/index.styles";

const DynamicTableFormList = forwardRef(
  (
    {
      defaultValue = [],
      disabled = false,
      configColumns = {},
      searchKey = {},
      isInherited = false,
      tableStyleOptions = {},
    },
    ref
  ) => {
    const {
      inheritRowBackground = false,
      showCellBorder = false,
      dangerDeleteAction = false,
    } = tableStyleOptions;

    const defaultRow = useMemo(
      () => ({
        id: Date.now(),
        label: "",
        name: "",
        type: "text",
        format: "",
        required: false,
        searchable: false,
        textAlign: "",
        apiSource: "",
        advancedSearch: false,
        advancedSearchOrder: "",
        searchInList: false,
        timeDeafultValue: false,
        isSingleDateSearch: false,
        defaultTimePreset: "",
        textStyle: "",
        size: "",
        minLength: "",
        maxLength: "",
        email: "",
        margin:false,
        multiple: false,
        dateFormat: "",
        filter: false,
        hiddenInFilter: false,
        showInList: false,
        showMobile: false,
        hiddenInFlow: false,
        spellcheck: false,
        showFilterCalendar: false,
        valueInput: [],

      }),
      []
    );

    const initialRows = useMemo(() => {
      const rowsWithId = (defaultValue || []).map((row, index) => ({
        ...row,
        id: row.id || `${Date.now()}-${index}`,
        showMobile: row.showMobile || false,
        advancedSearchOrder: row.advancedSearchOrder || "",
      }));
      return rowsWithId.length ? rowsWithId : [defaultRow];
    }, [defaultValue, defaultRow]);

    const {
      control,
      formState: { errors },
      trigger,
      setValue,
      watch,
      getValues,
      clearErrors,
      setError,
    } = useForm({
      defaultValues: { rows: initialRows },
      resolver: yupResolver(validationSchema),
      mode: "onChange",
    });
    // logger.log("errors in dynamic table", errors);
    
    const { rows } = watch();

    const displayRows = useMemo(() => {
      const searchText = (Object.values(searchKey)[0] || "")
        .trim()
        .toLowerCase();
      const searchFields = Object.keys(searchKey);

      if (!searchText || searchFields.length === 0) {
        return rows.map((rowData, index) => ({ originalIndex: index, rowData }));
      }

      const filtered = [];
      rows.forEach((rowData, index) => {
        const isMatch = searchFields.some((field) =>
          rowData[field]?.toString().toLowerCase().includes(searchText)
        );
        if (isMatch) {
          filtered.push({ originalIndex: index, rowData });
        }
      });
      return filtered;
    }, [rows, searchKey]);

    const getProcessedData = useCallback(() => {
      return rows.map((row) => {
        const data = {
          label: row.label || row.title,
          name: row.name,
          type: row.type,
          ref: row.ref,
          defaultValue: row.defaultValue,
          textStyle: row.textStyle,
          size: row.size,
          required: row.required,
          multiple: row.multiple,
          dateFormat: row.dateFormat,
          filter: row.filter,
          apiSource: row.apiSource,
          advancedSearch: row.advancedSearch,
          advancedSearchOrder: row.advancedSearchOrder,
          searchInList: row.searchInList,
          timeDeafultValue: row.timeDeafultValue,
          isSingleDateSearch: row.type === "date" ? !!row.isSingleDateSearch : false,
          // Chỉ gửi mốc thời gian mặc định khi field là date và đã bật, tránh rác payload
          ...(row.type === "date" && row.timeDeafultValue && row.defaultTimePreset
            ? { defaultTimePreset: row.defaultTimePreset }
            : {}),
          hiddenInFilter: row.hiddenInFilter,
          showInList: row.showInList,
          showMobile: row.showMobile || false,
          hiddenInFlow: row.hiddenInFlow,
          spellcheck: row.spellcheck,
          email: row.email,
          margin:row.margin,
          showFilterCalendar: row.showFilterCalendar,
          valueInput: row.valueInput,
          tableConfig: row.tableConfig,
          filterTableConfig: row.filterTableConfig,
          format: ["date", "dynamic"].includes(row.type)
            ? row.format
            : undefined,
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
        const isValid = await trigger("rows"); // Trigger validation cho toàn bộ mảng rows
        if (isValid) {
          return { data: getProcessedData(), isValid: true };
        } else {
          const rowsData = getValues("rows") || [];
          let errorDetails = [];
          try {
            await validationSchema.validate({ rows: rowsData }, { abortEarly: false });
          } catch (yupError) {
            errorDetails = yupError.inner || [];
          }
          return { data: [], isValid: false, errors: errorDetails };
        }
        // return isValid ?  : null;
      },
      setError,
    }));

    const handleAddRow = useCallback(() => {
      setValue("rows", [...rows, { ...defaultRow, id: Date.now() }]);
    }, [rows, setValue, defaultRow]);

    const handleRowChange = useCallback(
      (index, partialUpdate) => {
        const currentRow = getValues(`rows.${index}`);
        const updatedRow = { ...currentRow, ...partialUpdate };
        setValue(`rows.${index}`, updatedRow, { shouldValidate: true });

        if (errors.rows?.[index]) {
          clearErrors(`rows.${index}`);
        }
      },
      [setValue, getValues, errors, clearErrors]
    );

    const handleDeleteRow = useCallback(
      (index) => {
        setValue(
          "rows",
          rows.filter((_, i) => i !== index)
        );
      },
      [rows, setValue]
    );

    const tableHeaders = useMemo(
      () => ["STT", "Tên *", "Mã *", "Kiểu nhập *", "Thao tác"],
      []
    );

    const renderHeaderWithRedAsterisk = (header) => {
      if (typeof header === "string" && header.endsWith(" *")) {
        return (
          <>
            {header.slice(0, -2)} <RequiredAsterisk>*</RequiredAsterisk>
          </>
        );
      }
      return header;
    };

  const getDeleteHandler = useCallback(
  (rowIndex) => () => handleDeleteRow(rowIndex),
  [handleDeleteRow]
);



    return (
      <DynamicBox>
        <DynamicTableContainer>
          <DynamicTable>
            <DynamicTableHead>
              <DynamicTableRow inheritRowBackground={inheritRowBackground}>
                {tableHeaders.map((header, index) => (
                  <StyledHeaderCell
                    key={index}
                    headerText={header}
                    showCellBorder={showCellBorder}
                  >
                    {renderHeaderWithRedAsterisk(header)}
                  </StyledHeaderCell>
                ))}
              </DynamicTableRow>
            </DynamicTableHead>
            <tbody>
              {displayRows.length > 0 ? (
                displayRows.map(({ originalIndex, rowData }) => (
                  <DynamicRow
                    key={rowData.id}
                    row={rowData}
                    index={originalIndex}
                    onRowChange={handleRowChange}
                    // onDelete={() => handleDeleteRow(originalIndex)}
                    onDelete={getDeleteHandler(originalIndex)}
                    disabled={disabled}
                    isInherited={isInherited}
                    config={configColumns}
                    tableStyleOptions={{
                      inheritRowBackground,
                      showCellBorder,
                      dangerDeleteAction,
                    }}
                    control={control}
                    errors={errors}
                    colSpan={tableHeaders.length}
                    setValue={setValue}
                    watch={watch}
                  />
                ))
              ) : (
                <DynamicTableRow inheritRowBackground={inheritRowBackground}>
                  <NoDataCell colSpan={tableHeaders.length} showCellBorder={showCellBorder}>
                    Không có dữ liệu
                  </NoDataCell>
                </DynamicTableRow>
              )}
              {!disabled && !isInherited && (
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

DynamicTableFormList.propTypes = {
  searchKey: PropTypes.object,
  defaultValue: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string,
      code: PropTypes.string,
      type: PropTypes.string,
      format: PropTypes.string,
      required: PropTypes.bool,
      searchable: PropTypes.bool,
      apiSource: PropTypes.string,
      advancedSearch: PropTypes.bool,
      advancedSearchOrder: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      searchInList: PropTypes.bool,
      timeDeafultValue: PropTypes.bool,
      defaultTimePreset: PropTypes.string,
      minLength: PropTypes.number,
      maxLength: PropTypes.number,
      minValue: PropTypes.number,
      maxValue: PropTypes.number,
      showFilterCalendar: PropTypes.bool,
    })
  ),
  disabled: PropTypes.bool,
  configColumns: PropTypes.object,
  isInherited: PropTypes.bool,
  tableStyleOptions: PropTypes.shape({
    inheritRowBackground: PropTypes.bool,
    showCellBorder: PropTypes.bool,
    dangerDeleteAction: PropTypes.bool,
  }),
};

DynamicTableFormList.defaultProps = {
  defaultValue: [],
  searchKey: {},
  disabled: false,
  configColumns: {},
  isInherited: false,
  tableStyleOptions: {
    inheritRowBackground: false,
    showCellBorder: false,
    dangerDeleteAction: false,
  },
};

DynamicTableFormList.displayName = "DynamicTableFormList";
export default DynamicTableFormList;
