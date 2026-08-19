import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useRegistry } from '@builder-table/context/RegistryContext';
import { Tabs, Tab, Stack } from '@mui/material';
// import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
 
import { API_DESIGN_FORM } from '@EnvironmentFile/constants/urlConfig';
import {
	SidebarContainer,
	AutocompleteContainer,
	StyledCustomAutocomplete,
	StyledTabPanel,
	DraggableItem,
	DraggableItemContent,
	DraggableItemLabel,
	DraggIndicatorIcon,
} from './Sidebar.styles';
import api from '@services/api';

function TabPanel({ children, value, index }) {
	if (value !== index) return null;
	return <StyledTabPanel>{children}</StyledTabPanel>;
}

TabPanel.propTypes = {
	children: PropTypes.node,
	value: PropTypes.number.isRequired,
	index: PropTypes.number.isRequired,
};

Sidebar.propTypes = {
	setIsDrag: PropTypes.func.isRequired,
	onData: PropTypes.func.isRequired,
	value: PropTypes.any,
	idList: PropTypes.any
};

export default function Sidebar({ setIsDrag, onData, value = null, idList }) {
	const registry = useRegistry();
	const [tab, setTab] = useState(0);
	const [options, setOptions] = useState([]);

	const components = Object.entries(registry).filter(([, v]) => !v.isLayout);
	const layouts = Object.entries(registry).filter(([, v]) => v.isLayout);

	// API duy nhất
	const fethApiFields = async () => {
		try {
			const res = await api.get(`${API_DESIGN_FORM}?type=attribute&processID=${idList}`);
			setOptions(res.data.data || []);
		} catch (error) {
			// eslint-disable-next-line no-console
			logger.error(error);
		}
	};

	useEffect(() => {
		fethApiFields();
	}, []);

	const handleDragStart = (key) => (e) => {
		e.dataTransfer.setData('type', key);
		setIsDrag(true);
	};

	const handleDragEnd = () => setIsDrag(false);

	const renderItem = ([key, val]) => (
		<DraggableItem
			key={key}
			draggable
			onDragStart={handleDragStart(key)}
			onDragEnd={handleDragEnd}
		>
			<DraggableItemContent as={Stack} direction="row" spacing={1}>
				<DraggIndicatorIcon/>
				<DraggableItemLabel variant="body2">
					{val.displayName}
				</DraggableItemLabel>
			</DraggableItemContent>
		</DraggableItem>
	);
	const handleTabChange = (event, newValue) => {
		setTab(newValue);
	};

	return (
		<SidebarContainer>
			<AutocompleteContainer>
				<StyledCustomAutocomplete
					disableClearable
					field={{
						value: value,
						onChange: onData
					}}
					size="small"
					options={options}
					getOptionLabel={(option) => option.name}
					placeholder={'Chọn dữ liệu...'}
					isOptionEqualToValue={(option, value) => option?.code === value?.code}
				/>
			</AutocompleteContainer>

			<Tabs value={tab} onChange={handleTabChange} centered>
				<Tab label="Thành phần" />
				<Tab label="Bố cục" />
			</Tabs>

			<TabPanel value={tab} index={0}>
				{components.map(renderItem)}
			</TabPanel>

			<TabPanel value={tab} index={1}>
				{layouts.map(renderItem)}
			</TabPanel>
		</SidebarContainer>
	);
}
