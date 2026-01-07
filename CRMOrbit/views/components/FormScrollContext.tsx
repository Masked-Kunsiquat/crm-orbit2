import { createContext, useContext } from "react";
import type { TextInput } from "react-native";

type FormScrollContextValue = {
  scrollToInput: (inputRef: TextInput | null) => void;
};

const FormScrollContext = createContext<FormScrollContextValue | null>(null);

export const FormScrollProvider = FormScrollContext.Provider;

export const useFormScrollContext = (): FormScrollContextValue | null =>
  useContext(FormScrollContext);
