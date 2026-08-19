import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Canvas from './Canvas';
import { DragContext } from '@builder-form/context/DragContext';

import { useDispatch, useSelector } from 'react-redux';
import { addDataField, addFields, addValueField, setValue } from '@redux/slices/FormDesign/formDesignSlice';
import { API_GET_LIST_FUNCTIONMANAGEMANT } from '@EnvironmentFile/constants/urlConfig';
import PropTypes from 'prop-types';
import api from '@services/api';
import {
	FormBuilderContainer,
	SidebarWrapper,
	CanvasWrapper,
} from './FormBuilder.styles';


export default function FormBuilder({ defaultData, idList, fnCode }) {

	const [isDrag, setIsDrag] = useState(false);
	const [data, setData] = useState('');

	const [funcDataForm, setFuncDataForm] = useState([]);
	const [funcDataList, setFuncDataList] = useState([]);
	const dispatch = useDispatch();
	const value = useSelector((state) => state.formDesign.value);

	const handleSetData = (data) => {
		logger.log('check',data)
	
		setData(data);
		dispatch(addDataField(data.field));
		dispatch(setValue(data));
	}

	// useEffect(() => {
	// 	if (defaultData?.valueField) {
	// 		dispatch(setValue(defaultData?.valueField));
	// 		dispatch(addValueField(defaultData?.valueField));
	// 		dispatch(addFields(defaultData?.valueField?.fieldsOfuse));
	// 		dispatch(addDataField(defaultData?.valueField?.field));
	// 	}
	// }, [])

	useEffect(() => {
		if (defaultData?.valueField) {
			const allFields = defaultData.valueField.field;
			const fieldsOfuse = defaultData.valueField.fieldsOfuse;

			if (allFields && fieldsOfuse && Array.isArray(allFields) && Array.isArray(fieldsOfuse)) {
				const fieldsOfuseMap = new Map(fieldsOfuse.map(f => [f.name, f]));

				// Ghi đè id từ fieldsOfuse sang allFields nếu trùng tên
				const updatedFields = allFields.map(field => {
					const fieldOfUse = fieldsOfuseMap.get(field.name);
					if (fieldOfUse) {
						return {
							...field,
							id: fieldOfUse.id, // ghi đè id ở đây
						};
					}
					return field;
				});

				// Lọc fieldsOfuse tương ứng với updatedFields (có thể không cần nữa tùy logic)
				const mapFieldsOfuse = fieldsOfuse
					.map(f => {
						const updatedField = updatedFields.find(uf => uf.name === f.name);
						return updatedField || null;
					})
					.filter(Boolean);

				dispatch(setValue(defaultData.valueField));
				dispatch(addValueField(defaultData.valueField));
				dispatch(addFields(mapFieldsOfuse));
				dispatch(addDataField(updatedFields));
			}
		}
	}, [defaultData, dispatch]);


	useEffect(() => {
		const fetchOptions = async () => {
			try {
				const [formRes, listRes] = await Promise.all([
					api.get(`${API_GET_LIST_FUNCTIONMANAGEMANT}?featureType=form&limit=9999`),
					api.get(`${API_GET_LIST_FUNCTIONMANAGEMANT}?featureType=list,automatic&limit=9999`)
				]);

				setFuncDataForm(formRes.data?.data?.data);
				setFuncDataList(listRes.data?.data?.data);
			} catch (error) {
				// eslint-disable-next-line no-console
				logger.error("Fetch options failed:", error);
			}
		};

		if (idList) fetchOptions();
	}, [idList]);

	return (
		<DragContext.Provider value={{ isDrag, setIsDrag }}>

			<FormBuilderContainer>
				<SidebarWrapper>
					<Sidebar idList={idList} setIsDrag={setIsDrag} onData={handleSetData} value={value} />
				</SidebarWrapper>
				<CanvasWrapper>
					<Canvas data={{ ...data, fnCode, funcDataForm, funcDataList }} defaultConfig={defaultData?.fields} />
				</CanvasWrapper>
			</FormBuilderContainer>
		</DragContext.Provider>
	);
}

FormBuilder.propTypes = {
	defaultData: PropTypes.object,
	idList: PropTypes.string,
	fnCode: PropTypes.string,
};