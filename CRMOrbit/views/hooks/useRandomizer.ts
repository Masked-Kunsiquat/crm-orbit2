import { useCallback, useEffect, useMemo, useState } from "react";

import type { Account } from "@domains/account";
import { useAccounts } from "../store/store";
import {
  generateRandomSelection,
  sortValues,
  validateRandomizerInputs,
  type RandomizerOrder,
  type RandomizerValidationError,
} from "../utils/randomizer";

type GenerateResult =
  | { ok: true }
  | { ok: false; error: RandomizerValidationError };

type UseRandomizerResult = {
  eligibleAccounts: Account[];
  selectedAccount?: Account;
  selectedAccountId: string | null;
  isPickerOpen: boolean;
  minInput: string;
  maxInput: string;
  excludedInput: string;
  countInput: string;
  order: RandomizerOrder;
  results: number[];
  setIsPickerOpen: (value: boolean) => void;
  setMinInput: (value: string) => void;
  setMaxInput: (value: string) => void;
  setExcludedInput: (value: string) => void;
  setCountInput: (value: string) => void;
  setOrder: (value: RandomizerOrder) => void;
  applyAccountValues: (accountId: string | null) => void;
  generate: () => GenerateResult;
};

export const useRandomizer = (): UseRandomizerResult => {
  const accounts = useAccounts();
  const eligibleAccounts = useMemo(() => {
    return [...accounts]
      .filter(
        (account) =>
          typeof account.minFloor === "number" &&
          typeof account.maxFloor === "number",
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [accounts]);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");
  const [excludedInput, setExcludedInput] = useState("");
  const [countInput, setCountInput] = useState("1");
  const [order, setOrder] = useState<RandomizerOrder>("asc");
  const [results, setResults] = useState<number[]>([]);

  const selectedAccount = useMemo(
    () => eligibleAccounts.find((account) => account.id === selectedAccountId),
    [eligibleAccounts, selectedAccountId],
  );

  useEffect(() => {
    setResults((current) =>
      current.length > 0 ? sortValues(current, order) : current,
    );
  }, [order]);

  const applyAccountValues = useCallback(
    (accountId: string | null) => {
      setSelectedAccountId(accountId);
      if (!accountId) {
        return;
      }
      const account = eligibleAccounts.find((item) => item.id === accountId);
      if (!account) {
        return;
      }
      const min = account.minFloor ?? "";
      const max = account.maxFloor ?? "";
      const excluded = account.excludedFloors?.join(", ") ?? "";
      setMinInput(min !== "" ? `${min}` : "");
      setMaxInput(max !== "" ? `${max}` : "");
      setExcludedInput(excluded);
    },
    [eligibleAccounts],
  );

  const generate = useCallback((): GenerateResult => {
    const validation = validateRandomizerInputs(
      minInput,
      maxInput,
      excludedInput,
      countInput,
    );
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const selection = generateRandomSelection(validation.value, order);
    if (!selection.ok) {
      return { ok: false, error: selection.error };
    }

    setResults(selection.value);
    return { ok: true };
  }, [countInput, excludedInput, maxInput, minInput, order]);

  return {
    eligibleAccounts,
    selectedAccount,
    selectedAccountId,
    isPickerOpen,
    minInput,
    maxInput,
    excludedInput,
    countInput,
    order,
    results,
    setIsPickerOpen,
    setMinInput,
    setMaxInput,
    setExcludedInput,
    setCountInput,
    setOrder,
    applyAccountValues,
    generate,
  };
};
