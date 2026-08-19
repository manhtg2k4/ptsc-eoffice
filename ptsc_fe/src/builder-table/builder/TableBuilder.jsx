import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import CanvasTable from './CanvasTable';
import { DragContext } from '@builder-table/context/DragContext';
import { useDispatch, useSelector } from 'react-redux';
import { setValue, addDataFieldTable } from '@redux/slices/FormDesign/formDesignSlice';

import PropTypes from 'prop-types';
import { API_GET_LIST_FUNCTIONMANAGEMANT } from '@EnvironmentFile/constants/urlConfig';
 
import {
  TableBuilderContainer,
  SidebarContainer,
  CanvasWrapper,
} from './TableBuilder.styles';
import api from '@services/api';
import CanvasTablecl from './CanvasTablecl';
export default function TableBuilder({ defaultData, idList, fnCode, featureType, isFollowAssignee,onAdvancedSearch, url, apiUrl, apiUrlChildren, authorizedFunction,isAuthorized,isParentChild,inheritSubTabFunction,isInheritSubTab, isHideTitle }) {


  const [isDrag, setIsDrag] = useState(false);
  const [data, setData] = useState({});

  const [funcDataForm, setFuncDataForm] = useState([]); 
  const [funcDataList, setFuncDataList] = useState([]);
  const [funcDataListFull, setFuncDataListFull] = useState([]);
  const [customComponent, setCustomComponent] = useState("");



  const dispatch = useDispatch();
  const value = useSelector((state) => state.formDesign.value);

  const handleSetData = (data) => {
    setData(data);
    dispatch(setValue(data));
    dispatch(addDataFieldTable(data.field));

  };

  useEffect(() => {
    if (defaultData?.valueField) {
      setData(defaultData?.valueField);
      dispatch(setValue(defaultData?.valueField));
      dispatch(addDataFieldTable(defaultData?.valueField?.field));
    }
  }, [])


  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem("token_app");
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [formRes, listRes, listResFull] = await Promise.all([
          api.get(`${API_GET_LIST_FUNCTIONMANAGEMANT}?featureType=form&processID=${idList}`, { headers }),
          api.get(`${API_GET_LIST_FUNCTIONMANAGEMANT}?featureType=list,automatic&processID=${idList}`, { headers }),
          api.get(`${API_GET_LIST_FUNCTIONMANAGEMANT}?featureType=list,automatic&limit=5000`, { headers })

        ]);

        setFuncDataForm(formRes.data?.data?.data);

        setFuncDataList(listRes.data?.data?.data);
        setFuncDataListFull(listResFull.data?.data?.data)
      } catch (error) {
        // eslint-disable-next-line no-console
        logger.error("Fetch options failed:", error);
      }
    };

    if (idList) fetchOptions();
  }, [idList]);

  return (
    <DragContext.Provider value={{ isDrag, setIsDrag }}>
      <TableBuilderContainer>
        <SidebarContainer>
          <Sidebar idList={idList} setIsDrag={setIsDrag} onData={handleSetData} value={value} />
        </SidebarContainer>
        <CanvasWrapper>
          {featureType === 'custom' ? (
            <CanvasTablecl
              data={{
                ...data,
                idList,
                fnCode,
                url,
                funcDataForm,
                funcDataList,
                funcDataListFull,
                featureType,
                isFollowAssignee,
                onAdvancedSearch,
                apiUrl: apiUrl ?? data?.apiUrl,
                apiUrlChildren: apiUrlChildren ?? data?.apiUrlChildren,
                authorizedFunction,
                isAuthorized,
                isParentChild,
                inheritSubTabFunction,
                isInheritSubTab,
                isHideTitle,
              }}
              defaultConfig={defaultData?.fields}
              onDataChange={handleSetData}
              setCustomComponent={setCustomComponent}
            />
          ) : (
            <CanvasTable
              data={{
                ...data,
                idList,
                fnCode,
                url,
                funcDataForm,
                funcDataList,
                funcDataListFull,
                featureType,
                isFollowAssignee,
                onAdvancedSearch,
                apiUrl: apiUrl ?? data?.apiUrl,
                apiUrlChildren: apiUrlChildren ?? data?.apiUrlChildren,
                authorizedFunction,
                isAuthorized,
                isParentChild,
                inheritSubTabFunction,
                isInheritSubTab,
                isHideTitle,
                customComponent,
              }}
              defaultConfig={defaultData?.fields}
            />
          )}
        </CanvasWrapper>
      </TableBuilderContainer>
    </DragContext.Provider>
  );
}

TableBuilder.propTypes = {
  showTabs: PropTypes.arrayOf(PropTypes.string),
  setDetailData: PropTypes.func.isRequired,
  defaultData: PropTypes.object,
  idList: PropTypes.string.isRequired,
  fnCode: PropTypes.string.isRequired,
  featureType: PropTypes.string.isRequired,
  isFollowAssignee: PropTypes.bool,
  onAdvancedSearch: PropTypes.func,
  apiUrl: PropTypes.string,
  apiUrlChildren: PropTypes.string,
  authorizedFunction: PropTypes.arrayOf(PropTypes.string),
  isAuthorized: PropTypes.bool,
  isParentChild: PropTypes.bool,
  inheritSubTabFunction: PropTypes.string,
  isInheritSubTab: PropTypes.bool,
  isHideTitle: PropTypes.bool,
};