import { createContext, useContext } from "react";

type FormScrollContextValue = {
  scrollToInput: (inputNode: number) => void;
};

const FormScrollContext = createContext<FormScrollContextValue | null>(null);

export const FormScrollProvider = FormScrollContext.Provider;

export const useFormScrollContext = (): FormScrollContextValue | null =>
  useContext(FormScrollContext);
