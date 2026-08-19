import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRegistry } from '@builder-form/context/RegistryContext';
// import { saveForm } from '../utils/storage';
import ElementWrapper from '@builder-form/components/ElementWrapper';
// import { Box } from '@mui/material';
import PropTypes from 'prop-types';
const layoutTypes = ['row', 'column', 'flex'];
import { useDispatch, useSelector } from 'react-redux';
import { addField, addFormConfig, deleteField, updateField } from '@redux/slices/FormDesign/formDesignSlice';
import {
  CanvasContainer,
  EmptyCanvasPlaceholder,
  PlaceholderBox,
  PlaceholderIcon, PlaceholderText
} from './Canvas.styles';


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

export default function Canvas({ data, defaultConfig = [] }) {

  const dispatch = useDispatch();
  const registry = useRegistry();
  const fields = useSelector(state => state.formDesign.fields);

  const dataFields = useSelector((state) => state.formDesign.dataField);
  const [elements, setElements] = useState(defaultConfig.length ? defaultConfig : []);
  //   const getField = name => {
  //   return dataFields.find(field => field.name === name);

  // }
  const getField = useCallback(name => {
    return dataFields.find(field => field.name === name);
  }, [dataFields]);
  const [dragItem, setDragItem] = useState(null);
  useEffect(() => {
    if (elements.length) {

      dispatch(addFormConfig(elements))
    }
  }, [elements, dispatch])


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

  const addByConfig = useCallback((type) => {

    const id = crypto.randomUUID();
    if (type && registry[type]) {
      const newElement = { id, type, props: {} };
      safeSetElements(prev => [...prev, newElement]);
    }
    return id;
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

  const onPropChange = useCallback((id, key, val, isField, idFieldDelete) => {

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

    if (idFieldDelete) {
      dispatch(deleteField(idFieldDelete))
    } else {
      if (isField && val) {
        const fieldFromDataFields = getField(val); // val là name
        if (!fieldFromDataFields) return;

        // Set field id to element id
        const fieldWithId = {
          ...fieldFromDataFields,
          id
        };

        // Check existing by element id (not by name)
        const existingField = fields.find(f => f.id === id);
        if (existingField) {
          dispatch(updateField(fieldWithId));
        } else {
          dispatch(addField(fieldWithId));
        }
      }
    }

    safeSetElements(prev => updateProps(prev));
  }, [safeSetElements, fields, dispatch, getField]);

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

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

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
                addByConfig={addByConfig}
                onPropChange={onPropChange}
                mode="builder"
                data={data}
              />
            </ElementWrapper>
          </>

        );
      });

    return render(elements);
  }, [data, elements, registry, handleDelete, handleDragStart, handleDrop, addChild, onPropChange, addByConfig]);

  return (
    <PlaceholderBox>
      <CanvasContainer
        // onDragOver={(e) => e.preventDefault()}
        onDragOver={handleDragOver}
        onDrop={add}
      >
        {elements.length ? renderedElements : (
          <EmptyCanvasPlaceholder>
            <PlaceholderIcon />
            <PlaceholderText variant="body1">
              Kéo vào đây...
            </PlaceholderText>
          </EmptyCanvasPlaceholder>
        )}
      </CanvasContainer>
    </PlaceholderBox>
  );
}

Canvas.propTypes = {
  data: PropTypes.object,
  onChangeValue: PropTypes.func.isRequired,
  defaultConfig: PropTypes.array,
};
