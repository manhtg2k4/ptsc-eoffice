import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useRegistry } from "@builder-form-export/context/RegistryContext";
import { useForm, FormProvider } from "react-hook-form";
import { mapFields } from "@builder-form-export/utils/fieldList";

import { API_FUNCTIONMANAGEMANT_BY_ID } from "@EnvironmentFile/constants/urlConfig";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import {
  addDataFieldExport,
  addFormConfigExport,
} from "@redux/slices/FormDesign/formDesignSlice";
import { FormContainer, SubmitButton } from "./FormExport.styles";
import api from "@services/api";

const FormExport = forwardRef(
  ({ code, onData, defaultValues, isViewOnly }, ref) => {
    const reg = useRegistry();
    const dispatch = useDispatch();
    const [def, setDef] = useState([]);
    const predefinedFields = useSelector(
      (state) => state.formDesign.dataFieldExport
    );

    const transformedDefaultValues = React.useMemo(() => {
      return Object.keys(defaultValues || {}).reduce((acc, key) => {
        const field = predefinedFields.find((f) => f.name === key);
        const fieldType = field?.type || "text";
        acc[key] = {
          type: fieldType,
          value: defaultValues[key] || "",
        };
        return acc;
      }, {});
    }, [defaultValues, predefinedFields]);

    const methods = useForm({ defaultValues: transformedDefaultValues });
    const { handleSubmit } = methods;

    // Hàm submit form
    const onSubmit = async (data) => {
      const mapDataPayload = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
          k,
          {
            value: v?.value,
            type:
              typeof mapFields[v?.type] === "function"
                ? mapFields[v?.type](v?.value)
                : "undefined",
          },
        ])
      );
      const payload = {
        variables: mapDataPayload,
        localVariables: mapDataPayload,
      };
      onData && onData(data, payload);
    };

    // Expose method submitForm cho component cha qua ref
    useImperativeHandle(ref, () => ({
      submitForm: handleSubmit(onSubmit),
    }));

    useEffect(() => {
      const fetchForm = async () => {
        try {
          const { data: res } = await api.get(
            `${API_FUNCTIONMANAGEMANT_BY_ID}/find-by-code/${code}`
          );
          const fields = res?.data?.fields ?? [];
          const valueField = res?.data?.valueField?.field ?? [];
          setDef(fields);
          dispatch(addFormConfigExport(fields));
          dispatch(addDataFieldExport(valueField));
        } catch (err) {
          setDef([]);
        }
      };

      if (code) {
        fetchForm();
      }
    }, [code, dispatch]);

    useEffect(() => {
      if (defaultValues) {
        methods.reset(transformedDefaultValues);
      }
    }, [defaultValues, methods, transformedDefaultValues]);

    function render(items) {
      return items.map((el) => {
        const C = reg[el.type]?.component;
        if (!C) return null;
        return <C key={el.id} item={el} disabled={isViewOnly} mode="runtime" />;
      });
    }

    return (
      <FormContainer>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {render(def)}
            {!isViewOnly && (
              <SubmitButton variant="contained" type="submit">
                Lưu
              </SubmitButton>
            )}
          </form>
        </FormProvider>
      </FormContainer>
    );
  }
);

FormExport.displayName = "FormExport";

FormExport.propTypes = {
  code: PropTypes.string,
  onData: PropTypes.func,
  defaultValues: PropTypes.object,
  isViewOnly: PropTypes.bool,
};

FormExport.defaultProps = {
  defaultValues: {},
  isViewOnly: false,
};

export default FormExport;
