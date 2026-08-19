import React, { useEffect, useState } from 'react';
import { useRegistry } from '@builder-popup/context/RegistryContext';
import { useForm, FormProvider } from 'react-hook-form';
import { mapFields } from '@builder-popup/utils/fieldList';
 
import { API_FUNCTIONMANAGEMANT_BY_ID } from '@EnvironmentFile/constants/urlConfig';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { addDataFieldPopup, addFormConfig } from '@redux/slices/FormDesign/formDesignSlice';
import CustomDialog from '@components/CustomDialog/CustomDialog';
import api from '@services/api';

export default function Popup({ code, title, onData, defaultValues, isViewOnly, onClose, open }) {
  const reg = useRegistry();
  const dispatch = useDispatch();
  const [def, setDef] = useState([]);
  const predefinedFields = useSelector((state) => state.formDesign.dataFieldPopup);
  logger.log("🚀 ~ Popup ~ predefinedFields:", predefinedFields)

  const transformedDefaultValues = React.useMemo(() => {
    return Object.keys(defaultValues || {}).reduce((acc, key) => {
      const field = predefinedFields.find((f) => f.name === key);
      const fieldType = field?.type || 'text';
      acc[key] = {
        type: fieldType,
        value: defaultValues[key] || '',
      };
      return acc;
    }, {});
  }, [defaultValues, predefinedFields]);

  const methods = useForm({ defaultValues: transformedDefaultValues });

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const { data: res } = await api.get(
          `${API_FUNCTIONMANAGEMANT_BY_ID}/find-by-code/${code}`
        );
        const fields = res?.data?.fields ?? [];
        logger.log("🚀 ~ fetchForm ~ fields:", fields)
        const valueField = res?.data?.valueField?.field ?? [];
        logger.log("🚀 ~ fetchForm ~ valueField:", valueField)
        setDef(fields);
        dispatch(addFormConfig(fields));
        dispatch(addDataFieldPopup(valueField));
      } catch (err) {
        setDef([]);
      }
    };

    if (code) {
      fetchForm();
    }
  }, [code, dispatch]);

  // useEffect(() => {
  //   if (defaultValues) {
  //     methods.reset(transformedDefaultValues);
  //   }
  // }, [defaultValues, methods, transformedDefaultValues]);

  const { handleSubmit } = methods;

  const onSubmit = async (data) => {
    const mapDataPayload = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [
        k,
        {
          value: v?.value,
          type: typeof mapFields[v?.type] === 'function' ? mapFields[v?.type](v?.value) : 'undefined',
        },
      ])
    );
    const payload = {
      variables: mapDataPayload,
      localVariables: mapDataPayload,
    };
    onData && onData(data, payload);
  };

  function render(items) {
    return items.map((el) => {
      const C = reg[el.type]?.component;
      if (!C) return null;
      return (
        <C
          key={el.id}
          item={el}
          disabled={isViewOnly}
          mode="runtime"
        />
      );
    });
  }
  const handleClose = () => {
    onClose();
    // Thêm logic khác nếu cần
  };

  return (

    <CustomDialog
      size='lg'
      onClose={handleClose}
      onSave={handleSubmit(onSubmit)}
      open={open}
      title={title}
    >
      <FormProvider {...methods}>
        <form>
          {render(def)}
        </form>
      </FormProvider>
    </CustomDialog>

  );
}

Popup.propTypes = {
  code: PropTypes.string,
  onData: PropTypes.func,
  defaultValues: PropTypes.object,
  isViewOnly: PropTypes.bool,
};

Popup.defaultProps = {
  defaultValues: {},
  isViewOnly: false,
};