import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Canvas from './Canvas';
// import { Box } from '@mui/material';
import { DragContext } from '@builder-popup/context/DragContext';

import { useDispatch, useSelector } from 'react-redux';
import { addDataFieldPopup, setValue } from '@redux/slices/FormDesign/formDesignSlice';
import {
	PopupBuilderContainer,
	SidebarContainer,
	CanvasWrapper,
} from './PopupBuilder.styles';


export default function PopupBuilder({ defaultData, idList }) {

	const [isDrag, setIsDrag] = useState(false);
	const [data, setData] = useState('');

	const dispatch = useDispatch();
	const value = useSelector((state) => state.formDesign.value);

	const handleSetData = (data) => {
		setData(data);
		dispatch(addDataFieldPopup(data.field));
		dispatch(setValue(data));
	}

	useEffect(() => {

		if (defaultData?.valueField) {
			dispatch(setValue(defaultData?.valueField));
			dispatch(addDataFieldPopup(defaultData?.valueField?.field));
		}
	}, [])

	return (
		<DragContext.Provider value={{ isDrag, setIsDrag }}>

			<PopupBuilderContainer>
				<SidebarContainer>
					<Sidebar idList={idList} setIsDrag={setIsDrag} onData={handleSetData} value={value} />
				</SidebarContainer>
				<CanvasWrapper>
					<Canvas data={data} defaultConfig={defaultData?.fields} />
				</CanvasWrapper>
			</PopupBuilderContainer>
		</DragContext.Provider>
	);
}