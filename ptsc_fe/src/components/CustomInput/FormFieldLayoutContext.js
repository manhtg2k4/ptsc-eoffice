import { createContext, useContext } from "react";

const defaultFieldLayout = {
  inputLabelLayout: "floating",
};

export const FormFieldLayoutContext = createContext(defaultFieldLayout);

export const useFormFieldLayout = () => useContext(FormFieldLayoutContext);

export default FormFieldLayoutContext;
