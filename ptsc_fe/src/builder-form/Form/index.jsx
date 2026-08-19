/* eslint-disable no-console */
import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useContext,
} from "react";
import { useRegistry } from "@builder-form/context/RegistryContext";
import { useForm, FormProvider } from "react-hook-form";
import { mapFields } from "@builder-form/utils/fieldList";
 
import {
  API_FUNCTIONMANAGEMANT_BY_ID,
  API_UPLOAD_FILE,
  API_UPLOAD_FILE_EXCEL,
} from "@EnvironmentFile/constants/urlConfig";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import {
  addCodeMoreForm,
  addDataField,
  addDataFieldExport,
  addDataFieldPopup,
  addDataFormInTableInForm,
  addFormConfig,
  addFormTableInFormConfig,
  addValueField,
} from "@redux/slices/FormDesign/formDesignSlice";
import dayjs from "dayjs";
import { yupResolver } from "@hookform/resolvers/yup";
import { buildSchema } from "./Validation";
import { FormTypeContext } from "@builder-form/context/FormTypeContext";
import { AuthContext } from "@AuthContext/AuthProvider";
import { FormContainer } from "./index.styles";
import api from "@services/api";

const Form = forwardRef(
  (
    {
      code,
      onData,
      defaultValues,
      isViewOnly,
      style,
      type
    },
    ref
  ) => {
    const reg = useRegistry();
    const dispatch = useDispatch();
    const [def, setDef] = useState([]);
    const { user } = useContext(AuthContext);
    const codeMoreForm = useSelector((state) => state.formDesign.codeMoreForm.value);

    const [fieldValidate, setFieldValidate] = useState({
      "form": [],
      "form-popup": [],
      "form-export": [],
      "form-table-in-form": [],
    })


    const predefinedFields = useSelector((state) => {
      switch (type) {
        case "form-popup":
          return state.formDesign.dataFieldPopup;
        case "form-export":
          return state.formDesign.dataFieldExport;
        case "form-table-in-form":
          return state.formDesign.dataFormInTableInForm;
        default:
          return state.formDesign.dataField;
      }
    });
    const schema = buildSchema(fieldValidate[type]);
    logger.log("🚀 ~ fieldValidate[type]:", fieldValidate[type])


    const transformedDefaultValues = React.useMemo(() => {
      return Object.keys(defaultValues || {}).reduce((acc, key) => {
        const field = predefinedFields.find((f) => f.name === key);
        const fieldType = field?.type || "text";

        let value = defaultValues[key] || "";
        if (fieldType === "date" && value) {
          const parsed = dayjs(value, [
            "YYYY-MM-DD",
            "DD/MM/YYYY",
            "MM-DD-YYYY",
          ]);
          if (parsed.isValid()) {
            value = parsed.format("MM-DD-YYYY");
          }
        }

        acc[key] = {
          type: fieldType,
          value,
        };
        return acc;
      }, {});
    }, [defaultValues, predefinedFields]);

    const methods = useForm({
      resolver: yupResolver(schema),
      defaultValues: transformedDefaultValues,
    });
    const { handleSubmit, formState: { errors }, trigger } = methods;
    logger.log('errors', errors)

    const onSubmit = async (data) => {
      let dataExImport = {};
      const entries = await Promise.all(
        Object.entries(data)
          // eslint-disable-next-line no-unused-vars
          .filter(([_, v]) => v?.value !== undefined && v?.value !== null)
          .map(async ([k, v]) => {
            let value = v?.value?.value || v?.value || "";

            if (v?.type === "file" && v.value instanceof File) {
              const formData = new FormData();

              const isExcel =
                v.value.type === "application/vnd.ms-excel" ||
                v.value.type ===
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                v.value.name.endsWith(".xls") ||
                v.value.name.endsWith(".xlsx");

              const uploadUrl = isExcel
                ? API_UPLOAD_FILE_EXCEL
                : API_UPLOAD_FILE;

              if (isExcel) {
                formData.append("tab", 0);
                formData.append("entityType", user?.user.username || 'admin');
                formData.append("files", v.value);
              } else {
                formData.append("file", v.value);
              }

              const uploadRes = await api.post(`${uploadUrl}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });

              if (isExcel) {
                const fileData = uploadRes.data.data[0] || {};
                value = fileData.data._id || "";
                // value = fileData._id || "";

                const excelData = fileData.data || {};
                dataExImport = excelData;

                const excelEntries = predefinedFields
                  .filter(
                    (field) => field.name && excelData[field.name] !== undefined
                  )
                  .map((field) => [
                    field.name,
                    {
                      value: excelData[field.name],
                      type:
                        typeof mapFields[field.type] === "function"
                          ? mapFields[field.type](excelData[field.name])
                          : "String",
                    },
                  ]);

                return [
                  [k, { value, type: "String" }],
                  ["name", { value: fileData.file, type: "String" }],
                  ...excelEntries,
                ];
              } else {
                value = uploadRes.data.data._id;
              }
            }

            if (typeof value !== "string") {
              try {
                value = JSON.stringify(value);
              } catch {
                value = String(value);
              }
            }

            return [
              [
                k,
                {
                  value,
                  type:
                    typeof mapFields[v?.type] === "function"
                      ? mapFields[v?.type](v?.value)
                      : "String",
                },
              ],
            ];
          })
      );

      const flatEntries = entries.flat();
      const mapDataPayload = Object.fromEntries(flatEntries);

      const payload = {
        variables: mapDataPayload,
        localVariables: mapDataPayload,
      };

      onData && onData(data, payload, dataExImport, codeMoreForm || code);
    };

    useImperativeHandle(ref, () => ({
      submitForm: handleSubmit(onSubmit),
      validate: async () => {
        logger.log('errors',errors)
        const isValid = await trigger();
        return [fieldValidate[type], isValid];
      },
      getErrors: () => errors,
    }));

    useEffect(() => {
      const fetchForm = async () => {
        try {
          const { data: res } = await api.get(
            `${API_FUNCTIONMANAGEMANT_BY_ID}/find-by-code/${code}`
          );
          const fields = res?.data?.fields ?? [];
          const valueField = res?.data?.valueField?.field ?? [];
          const valueFieldOfuse = res?.data?.valueField?.fieldsOfuse ?? [];

          setFieldValidate({
            ...fieldValidate,
            [type]: valueFieldOfuse
          })

          // Fetch fields for codeMoreForm if it exists
          let moreFields = [];
          let moreValueField = [];
          let moreValueFieldOfuse = [];

          if (codeMoreForm) {
            const { data: moreRes } = await api.get(
              `${API_FUNCTIONMANAGEMANT_BY_ID}/find-by-code/${codeMoreForm}`
            );
            moreFields = moreRes?.data?.fields ?? [];
            moreValueField = moreRes?.data?.valueField?.field ?? [];
            moreValueFieldOfuse = moreRes?.data?.valueField?.fieldsOfuse ?? [];
          }

          const combinedFields = [...fields, ...moreFields];
          const combinedValueField = [...valueField, ...moreValueField];
          const combinedValueFieldOfuse = [...valueFieldOfuse, ...moreValueFieldOfuse];

          setFieldValidate({
            ...fieldValidate,
            [type]: combinedValueFieldOfuse
          });
          setDef(combinedFields);

          switch (type) {
            case "form":
              dispatch(addFormConfig(fields));
              dispatch(addDataField(combinedValueField));
              dispatch(addValueField(res?.data?.valueField));

              break;
            case "form-popup":
              dispatch(addFormConfig(fields));
              dispatch(addDataFieldPopup(combinedValueField));
              break;
            case "form-export":
              dispatch(addDataFieldExport(combinedValueField));
              break;
            case "form-table-in-form":
              dispatch(addFormTableInFormConfig(fields));
              dispatch(addDataFormInTableInForm(combinedValueField));
              break;
            default:
              dispatch(addDataField(combinedValueField));
          }
        } catch (err) {
          setDef([]);
          logger.error('Error fetching form data:', err);
        }
      };

      if (code) {
        fetchForm();
      }
    }, [code, dispatch, type, codeMoreForm, fieldValidate, setFieldValidate]);

    useEffect(() => {
      if (defaultValues) {
        methods.reset(transformedDefaultValues);
      }
    }, [defaultValues, methods, transformedDefaultValues]);

    useEffect(() => {
      return () => dispatch(addCodeMoreForm(''));

    }, [dispatch])

    function render(items) {
      return items.map((el) => {
        const C = reg[el.type]?.component;
        if (!C) return null;
        return <C key={el.id} item={el} disabled={isViewOnly} mode="runtime" />;
      });
    }

    return (
      <FormTypeContext.Provider value={type}>
        <FormContainer customStyle={style}>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>{render(def)}</form>
          </FormProvider>
        </FormContainer>
      </FormTypeContext.Provider>
    );
  }
);

Form.displayName = "Form";

Form.propTypes = {
  code: PropTypes.string,
  onData: PropTypes.func,
  defaultValues: PropTypes.object,
  isViewOnly: PropTypes.bool,
  disableSave: PropTypes.bool,
  style: PropTypes.object,
  type: PropTypes.string,
};

Form.defaultProps = {
  defaultValues: {},
  isViewOnly: false,
  disableSave: false,
};

export default Form;