import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
 
import {
  DATA_TABLE_BPMN,
  FUNCTIONMANAGEMANT,
} from "@EnvironmentFile/constants/urlConfig";

import { addDataFieldTableInForm } from "@redux/slices/FormDesign/formDesignSlice";

import { FormHelperText, MenuItem, Select } from "@mui/material";
import BaseTableCheckbox from "@components/CustomTableBorder/BaseTableCheckbox";
import { LabelTypography, RequiredMark } from "./TableCheckbox.styles";
import api from "@services/api";

const TableCheckbox = ({
  data,
  mode,
  item,
  onPropChange,
  funcDataList,
  disabled,
  onChange, value,
  label,
  required,
  error,
  helperText }) => {

  const dispatch = useDispatch();
  const [dataTable, setDataTable] = useState([]);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    rowsPerPage: 25,
    totalPages: 1,
  });

  // Parse value (string JSON) thành mảng id
  const parsedValue = useMemo(() => {
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch (e) {
      return [];
    }
  }, [value]);

  const [selectedIds, setSelectedIds] = useState(parsedValue);

  useEffect(() => {
    setSelectedIds(parsedValue);
  }, [parsedValue]);

  // eslint-disable-next-line no-unused-vars
  const [userFilters, setUserFilters] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [reloadTable, setReloadTable] = useState(1);


  const dataFields = useSelector((state) => state.formDesign.dataFieldTableInForm);
  // const activityInstanceIdOfTable = useSelector((state) => state.formDesign.activityInstanceIdOfTable);

  const dataColumn = useMemo(
    () => (dataFields?.length ? dataFields : null),
    [dataFields]
  );
  const dataTableCheck = useMemo(
    () => (dataTable?.length ? dataTable : []),
    [dataTable]
  );

  const fetchTableData = useCallback(async (params, code) => {
    if (!code) return;
    try {
      const { data: tableData } = await api.post(
        DATA_TABLE_BPMN,
        {
          processFn: code,
        },
        { params }
      );

      const rows =
        tableData?.data?.map((row) => {
          const variables = row.variables || {};
          return {
            ...variables,
            activityInstanceId: row.activityInstanceId,
          };
        }) || [];

      setDataTable(rows);
    
      setPagination({
        total: rows.length,
        page: 1,
        rowsPerPage: 25,
        totalPages: Math.ceil(rows.length / 25),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      logger.log("🚀 ~ error:", error)

      setDataTable([]);
    }
  }, []);

  useEffect(() => {
    if (onPropChange) {
      if (item?.id && data?.fnCode) {
        onPropChange(item.id, "fnCode", data.fnCode);
      }
      if (item?.id && data?.idList) {
        onPropChange(item.id, "processId", data.idList);
      }
    }
  }, [onPropChange, item?.id, data?.fnCode, data?.idList]);

  // Handlers
  const handleSelectRows = useCallback(
    (ids) => {
      setSelectedIds(ids);
      if (onChange) {
        onChange(JSON.stringify(ids));
      }
    },
    [onChange]
  );

  const handlePageChange = useCallback(
    async ({ page, rowsPerPage }) => {
      await fetchTableData({ page, limit: rowsPerPage }, item.props.fnCodeList, userFilters);
    },
    [fetchTableData, item.props.fnCodeList, userFilters]
  );

  useEffect(() => {
    const fetchCodeList = async () => {
      try {
        const { data: res } = await api.get(
          `${FUNCTIONMANAGEMANT}/find-by-code/${item.props?.fnCodeList}`
        );

        dispatch(addDataFieldTableInForm(res.data?.valueField?.field));

        fetchTableData(
          {},
          item.props?.fnCodeList,
          {}
        );
        return res.data;
      } catch (error) {
        return {};
      }
    };
    if (item.props?.fnCodeList) {
      fetchCodeList();
    }
  }, [item.props?.fnCodeList, reloadTable, fetchTableData, dispatch]);
  const createFnCodeListChangeHandler = (id) => (e) => {
    onPropChange(id, "fnCodeList", e.target.value);
  };


  return (
    <>
      <LabelTypography>{label} {required && <RequiredMark>*</RequiredMark>}</LabelTypography>
      {error && <FormHelperText error={error}>{helperText}</FormHelperText>}
      {mode === "builder" && (
        <Select
          size="small"
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={item.props?.fnCodeList || ""}
          onChange={createFnCodeListChangeHandler(item.id)}
        >
          {funcDataList.map((item) => (
            <MenuItem key={item._id} value={item.code}>
              {item.name}
            </MenuItem>
          ))}
        </Select>
      )}

      <BaseTableCheckbox
        dataColumn={dataColumn}
        data={dataTableCheck}
        showIndexColumn
        showCheckboxColumn
        onSelect={handleSelectRows}
        pagination={pagination}
        onPage={handlePageChange}
        defaultValues={selectedIds}
        mode={mode}
        item={item}
        onPropChange={onPropChange}
        processId={data?.idList}
        formatId="activityInstanceId"
        disabled={disabled}
      />
    </>
  );
}


TableCheckbox.propTypes = {
  data: PropTypes.object,
  mode: PropTypes.string,
  item: PropTypes.object,
  onPropChange: PropTypes.func,
  funcDataList: PropTypes.array,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  value: PropTypes.any,
  label: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  funcDataForm: PropTypes.array,
};

export default TableCheckbox;
