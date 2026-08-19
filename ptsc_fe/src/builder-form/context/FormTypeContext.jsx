import { createContext, useContext } from "react";

export const FormTypeContext = createContext("form"); // default = "form"

export const useFormType = () => useContext(FormTypeContext);
