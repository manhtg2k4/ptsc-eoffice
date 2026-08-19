import React, { useCallback, useEffect, useState } from 'react';
import { useRegistry } from '@builder-table/context/RegistryContext';
// import { loadForm } from '../utils/storage';
import { Box, styled } from '@mui/material';
import { API_FUNCTIONMANAGEMANT_BY_ID } from '@EnvironmentFile/constants/urlConfig';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { addFormConfig, addDataFieldTable, setKeyFormOnTable } from '@redux/slices/FormDesign/formDesignSlice';
import api from '@services/api';
import { setFnCode } from '@redux/slices/CustomTable/CustomTableSlice';

const StyledContainer = styled(Box)(() => ({
  // overflow: 'auto', // Bỏ overflow
  // height: '95vh',   // Bỏ giới hạn chiều cao
  // backgroundColor: theme.palette.background.paper,
  // padding: theme.spacing(2),
  paddingTop: 0
}));

export default function ViewTable({ fnCode }) {
  const reg = useRegistry();
  const dispatch = useDispatch();
	const [def, setDef] = useState([]);
	const [configData, setConfigData] = useState([]);
  const globalCode = useSelector((state) => state.formDesign.code);
  const { dataUser } = useSelector((state) => state.auth);

	const fetchForm = useCallback(async (code) => {
  const userId = dataUser?._id || dataUser?.id;
  const cacheKey = `FORM_CONFIG_${userId}_${code}`;

  const cache = sessionStorage.getItem(cacheKey);

  if (cache) {
    const resData = JSON.parse(cache);

    setDef(resData.fields ?? []);
    setConfigData(resData);

    dispatch(addFormConfig(resData.fields ?? []));
    dispatch(addDataFieldTable(resData.valueField?.field ?? []));
    dispatch(setKeyFormOnTable(resData.valueField));

    return;
  }

  try {
    const { data: res } = await api.get(
      `${API_FUNCTIONMANAGEMANT_BY_ID}/find-by-code/${code}`
    );

    const resData = {
      ...res.data,
      fnCode: code,
    };

    // Lưu nguyên object
    sessionStorage.setItem(cacheKey, JSON.stringify(resData));

    setDef(resData.fields ?? []);
    setConfigData(resData);

    dispatch(addFormConfig(resData.fields ?? []));
    dispatch(addDataFieldTable(resData.valueField?.field ?? []));
    dispatch(setKeyFormOnTable(resData.valueField));
  } catch (err) {
    logger.log("Lỗi", err);
    setDef([]);
  }
}, [dispatch]);

  // useEffect(() => {
  //   const code = fnCode;
  //   if (code) {
  //     fetchForm(code);
  //   }
	// }, [fnCode]);
	useEffect(() => {
  	if (!fnCode) return;
  	fetchForm(fnCode);
  	dispatch(setFnCode(fnCode));
	}, [fnCode, dispatch, fetchForm ]);



  useEffect(() => {
    const code = globalCode;
    if (code) {
      fetchForm(code);
    }
  }, [globalCode, fetchForm]);


  function render(items) {
    return items.map(el => {

      const C = reg[el.type]?.component;
      if (!C) return null;

      return (
        <C
          key={el.id}
          fnCode={fnCode}
          item={el}
					mode="runtime"
					data={configData}
          field={{
            name: el.props?.field,
          }} />
      );
    });
  }

  return (
    <StyledContainer>
      {render(def)}
    </StyledContainer>
  );
}

ViewTable.propTypes = {
  fnCode: PropTypes.string,
  onData: PropTypes.func,
};
