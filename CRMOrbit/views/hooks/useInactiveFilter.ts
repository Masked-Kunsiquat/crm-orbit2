import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type InactiveFilterLabels = {
  showInactive: string;
  hideInactive: string;
};

type InactiveFilterEmptyHint = {
  whenShowingInactive: string;
  whenHidingInactive: string;
};

type UseInactiveFilterOptions<T> = {
  items: T[];
  isActive: (item: T) => boolean;
  sort?: (a: T, b: T) => number;
  initialShowInactive?: boolean;
  menuLabels?: InactiveFilterLabels;
  emptyHint?: InactiveFilterEmptyHint;
};

type UseInactiveFilterResult<T> = {
  showInactive: boolean;
  setShowInactive: Dispatch<SetStateAction<boolean>>;
  toggleShowInactive: () => void;
  filteredItems: T[];
  menuLabel?: string;
  emptyHint?: string;
};

export const useInactiveFilter = <T>({
  items,
  isActive,
  sort,
  initialShowInactive = false,
  menuLabels,
  emptyHint,
}: UseInactiveFilterOptions<T>): UseInactiveFilterResult<T> => {
  const [showInactive, setShowInactive] = useState(initialShowInactive);

  const filteredItems = useMemo(() => {
    const visible = showInactive ? items : items.filter(isActive);
    const sorted = [...visible];

    if (sort) {
      sorted.sort(sort);
    }

    return sorted;
  }, [items, isActive, showInactive, sort]);

  const toggleShowInactive = () => {
    setShowInactive((current) => !current);
  };

  const menuLabel = menuLabels
    ? showInactive
      ? menuLabels.hideInactive
      : menuLabels.showInactive
    : undefined;

  const emptyHintLabel = emptyHint
    ? showInactive
      ? emptyHint.whenShowingInactive
      : emptyHint.whenHidingInactive
    : undefined;

  return {
    showInactive,
    setShowInactive,
    toggleShowInactive,
    filteredItems,
    menuLabel,
    emptyHint: emptyHintLabel,
  };
};
