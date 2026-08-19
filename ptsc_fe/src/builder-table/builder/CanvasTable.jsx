import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRegistry } from '@builder-table/context/RegistryContext';

import ElementWrapper from '@builder-table/components/ElementWrapper';
import { Typography } from '@mui/material';

import PropTypes from 'prop-types';
const layoutTypes = ['row', 'column', 'flex'];
import { useDispatch } from 'react-redux';
import { addTableConfig } from '@redux/slices/FormDesign/formDesignSlice';
import {
	CanvasContainer,
	CanvasArea,
	EmptyCanvasBox,
	StyledAddIcon,
} from './CanvasTable.styles';

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

const template = [
	{
		id: crypto.randomUUID(),
		type: "flex",
		props: {
			children: [
				{
					id: crypto.randomUUID(),
					type: "pagination",
					props: {}
				},
				{
					id: crypto.randomUUID(),
					type: "action",
					props: {}
				},
				{
					id: crypto.randomUUID(),
					type: "search",
					props: {}
				},
				{
					id: crypto.randomUUID(),
					type: "table",
					props: {}
				}
			]
		}
	}

]
export default function CanvasTable({ data, defaultConfig }) {

	const dispatch = useDispatch();
	const registry = useRegistry();
	const [elements, setElements] = useState(defaultConfig?.length ? defaultConfig : template);

	const [dragItem, setDragItem] = useState(null);

	useEffect(() => {
		if (elements.length) {
			dispatch(addTableConfig(elements))
		}
	}, [elements])

	const safeSetElements = useCallback((updaterFn) => {
		setElements(prev => {
			const next = updaterFn(prev);
			return deepEqual(prev, next) ? prev : next;
		});
	}, []);

	const add = useCallback((e) => {
		const type = e.dataTransfer.getData('type');
		if (type && registry[type]) {
			const newElement = { id: crypto.randomUUID(), type, props: {} };
			safeSetElements(prev => [...prev, newElement]);
		}
	}, [registry, safeSetElements]);

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

	const handleDragStart = useCallback((e, item) => {
		setDragItem(item);
	}, []);

	const moveItem = useCallback((list, fromId, toId) => {
		let fromItem = null;

		const remove = (arr) =>
			arr.reduce((acc, el) => {
				if (el.id === fromId) {
					fromItem = el;
					return acc;
				}
				const children = el.props?.children ? remove(el.props.children) : [];
				return [...acc, { ...el, props: { ...el.props, children } }];
			}, []);

		const insert = (arr) =>
			arr.flatMap(el => {
				if (el.id === toId && fromItem) {
					return [fromItem, el];
				}
				const children = el.props?.children ? insert(el.props.children) : [];
				return [{ ...el, props: { ...el.props, children } }];
			});

		const removed = remove(list);
		return insert(removed);
	}, []);

	const handleDrop = useCallback((e, target) => {
		e.preventDefault();
		e.stopPropagation();
		if (!dragItem || dragItem.id === target.id) return;

		const moved = moveItem(elements, dragItem.id, target.id);
		safeSetElements(() => moved);
		setDragItem(null);
	}, [dragItem, elements, moveItem, safeSetElements]);

	
	const renderedElements = useMemo(() => {
		const render = (list) =>
			list?.map(el => {
				const Component = registry[el.type]?.component;
				if (!Component) return null;
				return (
					<>
						<ElementWrapper
							key={el.id}
							item={el}
							onDelete={handleDelete}
							onDragStart={handleDragStart}
							onDrop={handleDrop}
						>
							<Component
								item={el}
								onDropChild={addChild}
								onPropChange={onPropChange}
								mode="builder"
								data={data}
								onAdvancedSearch={data.onAdvancedSearch}
							/>
						</ElementWrapper>
					</>
				);
			});

		return render(elements);
	}, [data, elements, registry, handleDelete, handleDragStart, handleDrop, addChild, onPropChange]);
	const handlePreventDefault = (e) => {
		e.preventDefault();
	};

	return (
		<CanvasContainer>
			<CanvasArea
				onDragOver={handlePreventDefault}
				onDrop={add}
			>
				{elements.length ? renderedElements : (
					<EmptyCanvasBox>
						<StyledAddIcon />
						<Typography variant="body1">
							Kéo vào đây...
						</Typography>
					</EmptyCanvasBox>
				)}
			</CanvasArea>
		</CanvasContainer>
	);
}
CanvasTable.propTypes = {
	data: PropTypes.object,
	defaultConfig: PropTypes.array,
};
