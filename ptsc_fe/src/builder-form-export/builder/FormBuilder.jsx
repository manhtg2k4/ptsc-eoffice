import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Canvas from './Canvas';
// import { Box } from '@mui/material';
import { DragContext } from '@builder-form-export/context/DragContext';

import { useDispatch, useSelector } from 'react-redux';
import { addDataField, setValue } from '@redux/slices/FormDesign/formDesignSlice';
import {
	FormBuilderContainer,
	SidebarContainer,
	CanvasWrapper,
} from './FormBuilder.styles';


export default function FormBuilder({ defaultData, idList }) {

	const [isDrag, setIsDrag] = useState(false);
	const [data, setData] = useState('');

	const dispatch = useDispatch();
	const value = useSelector((state) => state.formDesign.value);

	const handleSetData = (data) => {
		logger.log('data', data)
		setData(data);
		dispatch(addDataField(data.field));
		dispatch(setValue(data));
	}

	useEffect(() => {

		if (defaultData?.valueField) {
			logger.log('defaultData', defaultData)
			dispatch(setValue(defaultData?.valueField));
			dispatch(addDataField(defaultData?.valueField?.field));
		}
	}, [defaultData, dispatch]);

	return (
		<DragContext.Provider value={{ isDrag, setIsDrag }}>

			<FormBuilderContainer>
				<SidebarContainer>
					<Sidebar idList={idList} setIsDrag={setIsDrag} onData={handleSetData} value={value} />
				</SidebarContainer>
				<CanvasWrapper>
					<Canvas data={data} defaultConfig={defaultData?.fields} />
				</CanvasWrapper>
			</FormBuilderContainer>
		</DragContext.Provider>
	);
}