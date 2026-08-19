import React, { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useRegistry } from '@builder-table/context/RegistryContext';

import ElementWrapper from '@builder-table/components/ElementWrapper';
import { Box, Grid, Typography, styled } from '@mui/material';
import CustomInput from '@components/CustomInput/CustomInput';
import { COMPONENT_OPTIONS } from '@pages/AdministrationSystem/FunctionManagement/components/ComponentOption';

import PropTypes from 'prop-types';
const layoutTypes = ['row', 'column', 'flex'];

// Styled components used for the selector + preview UI
const BoxStyed = styled(Box)(() => ({
	padding: 16, border: '1px dashed', borderColor: 'divider', borderRadius: 1,
	width: '100%'
}));

const GridST = styled(Grid)(() => ({
	padding: 16,
}));

const TypographyStyled = styled(Typography)(() => ({
	marginBottom: 8,
}));

const TypographyCL = styled(Typography)(() => ({
	color: 'text.secondary',
}));

const COMPONENT_OPTIONS_ARRAY = Object.keys(COMPONENT_OPTIONS || {}).map((key) => ({
	value: key,
	label: COMPONENT_OPTIONS[key].title || key,
	...COMPONENT_OPTIONS[key],
}));
import { useDispatch } from 'react-redux';
import { addTableConfig } from '@redux/slices/FormDesign/formDesignSlice';
import {
	CanvasContainer,
	CanvasArea,
	EmptyCanvasBox,
	StyledAddIcon,
} from './CanvasTable.styles';

const template = [
	{
		id: crypto.randomUUID(),
		type: "flex",
		props: {
			children: [
				{
					id: crypto.randomUUID(),
					type: "table",
					props: {}
				}
			]
		}
	}
]

function deepEqual(a, b) {
	if (a === b) return true;
	if (typeof a !== typeof b || a == null || b == null) return false;

	if (typeof a !== 'object') return false;

	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return false;

	for (const key of aKeys) {
		if (!bKeys.includes(key) || !deepEqual(a[key], b[key])) return false;
	}
	return true;
}

export default function CanvasTablecl({ data, defaultConfig, onDataChange, setCustomComponent }) {


	const dispatch = useDispatch();
	const registry = useRegistry();
	const [elements, setElements] = useState(() => {
		const config = defaultConfig?.length ? defaultConfig : template;
		const clean = (list) => {
			return list
				.filter(item => !['pagination', 'action', 'search'].includes(item.type))
				.map(item => {
					if (item.props?.children) {
						return {
							...item,
							props: { ...item.props, children: clean(item.props.children) }
						};
					}
					return item;
				});
		};
		return clean(config);
	});

	// Selected component key for preview
	const [selectedCustomComponent, setSelectedCustomComponent] = useState(null);

	// Initialize from incoming data (e.g., loaded saved config that contains customComponent)
	useEffect(() => {
		// Prefer value from data.customComponent if exists and user hasn't selected another one yet
		const incoming = data?.customComponent || data?.valueField?.customComponent;
		if (incoming && !selectedCustomComponent) {
			setSelectedCustomComponent(incoming);
		}
	}, [data, selectedCustomComponent]);

	const onSelectCustomComponent = (valOrEvent) => {
		const value = valOrEvent && valOrEvent.target ? valOrEvent.target.value : valOrEvent;
		setSelectedCustomComponent(value || null);

		if (setCustomComponent) {
			setCustomComponent(value || null);
		}

		if (typeof onDataChange === 'function') {
			const next = { ...(data || {}), customComponent: value || null };
			onDataChange(next);
		}

		setElements(prev => {
			const update = (list) => list.map(el => {
				if (el.type === 'table') {
					return { ...el, props: { ...el.props, customComponent: value } };
				}
				if (el.props?.children) {
					return { ...el, props: { ...el.props, children: update(el.props.children) } };
				}
				return el;
			});
			return update(prev);
		});
	};

	useEffect(() => {
		if (elements.length) {
			dispatch(addTableConfig(elements))
		}
	}, [elements, dispatch])

	const safeSetElements = useCallback((updaterFn) => {
		setElements(prev => {
			const next = updaterFn(prev);
			return deepEqual(prev, next) ? prev : next;
		});
	}, []);

	const addChild = useCallback((parentId, type) => {
		const updateTree = (arr) =>
			arr.map(el => {
				if (el.id === parentId && layoutTypes.includes(el.type)) {
					const newChild = { id: crypto.randomUUID(), type, props: {} };
					return {
						...el,
						props: {
							...el.props,
							children: [...(el.props?.children || []), newChild],
						},
					};
				}
				return {
					...el,
					props: {
						...el.props,
						children: el.props?.children ? updateTree(el.props.children) : el.props?.children,
					},
				};
			});

		safeSetElements(prev => updateTree(prev));
	}, [safeSetElements]);

	const onPropChange = useCallback((id, key, val) => {
		const updateProps = (arr) =>
			arr.map(el => {
				if (el.id === id) {
					return {
						...el,
						props: { ...el.props, [key]: val },
					};
				}
				return {
					...el,
					props: {
						...el.props,
						children: el.props?.children ? updateProps(el.props.children) : el.props?.children,
					},
				};
			});

		safeSetElements(prev => updateProps(prev));
	}, [safeSetElements]);

	const handleDelete = useCallback((target) => {
		const removeElement = (arr) =>
			arr
				.map(el => ({
					...el,
					props: {
						...el.props,
						children: el.props?.children ? removeElement(el.props.children) : [],
					},
				}))
				.filter(el => el.id !== target.id);

		safeSetElements(prev => removeElement(prev));
	}, [safeSetElements]);

	
	const renderedElements = useMemo(() => {
		const render = (list) =>
			list?.map(el => {
				const Component = registry[el.type]?.component;
				if (!Component) return null;
				
				// Ép isHideTitle từ cấu hình chung vào props của mọi element
				// Điều này đảm bảo TableLayout bọc ngoài Flex hay bất cứ thứ gì đều thấy lệnh ẩn
				const itemWithProps = {
					...el,
					props: { 
						...el.props, 
						isHideTitle: data?.isHideTitle ?? el.props?.isHideTitle 
					}
				};

				return (
					<React.Fragment key={el.id}>
						<ElementWrapper
							item={el}
							onDelete={handleDelete}
						>
							<Component
								item={itemWithProps}
								onDropChild={addChild}
								onPropChange={onPropChange}
								mode="preview"
								data={data}
								onAdvancedSearch={data?.onAdvancedSearch}
							/>
						</ElementWrapper>
					</React.Fragment>
				);
			});

		return render(elements);
	}, [data, elements, registry, handleDelete, addChild, onPropChange]);

	return (
		<Grid container spacing={2}>
			<Grid item xs={12} md={4}>
				<GridST container>
					<Grid item xs={12}>
						<CustomInput
							label="Chọn Component"
							select
							options={COMPONENT_OPTIONS_ARRAY}
							customLabel="label"
							customValue="value"
							value={selectedCustomComponent || ''}
							onChange={onSelectCustomComponent}
						/>
					</Grid>

					<Grid item xs={12}>
						<Box mt={2}>
						{/* preview moved to full-width row above */}
						</Box>
					</Grid>
				</GridST>
			</Grid>

			{/* Full-width preview row */}
			<Grid item xs={12}>
				{selectedCustomComponent ? (
					(() => {
						const cfg = COMPONENT_OPTIONS[selectedCustomComponent];
						if (!cfg || !cfg.component) return null;
						const SelectedComp = cfg.component;
						return (
						<BoxStyed>
							<TypographyStyled variant="subtitle2">{cfg.title}</TypographyStyled>
							<Suspense fallback={<Typography variant="body2">Đang tải...</Typography>}>
								<SelectedComp {...(cfg.defaultProps || {})} data={data} />
							</Suspense>
						</BoxStyed>
						);
					})()
				) : (
					<TypographyCL variant="body2">Chưa chọn component để hiển thị</TypographyCL>
				)}
			</Grid>

			<Grid item xs={12} md={8}>
				<CanvasContainer>
					<CanvasArea>
						{elements.length ? renderedElements : (
							<EmptyCanvasBox>
								<StyledAddIcon />
								<Typography variant="body1">
									Chưa có cấu hình
								</Typography>
							</EmptyCanvasBox>
						)}
					</CanvasArea>
				</CanvasContainer>
			</Grid>
		</Grid>
	);
}
CanvasTablecl.propTypes = {
	data: PropTypes.object,
	defaultConfig: PropTypes.array,
	onDataChange: PropTypes.func,
	setCustomComponent: PropTypes.func,
};
