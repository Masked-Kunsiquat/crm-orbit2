declare module "@shopify/flash-list" {
  import type * as React from "react";

  export type FlashListProps<TItem> = {
    estimatedItemSize?: number;
    // Phantom field to keep the generic in use for linting.
    __itemType?: TItem;
    [key: string]: unknown;
  };

  export const FlashList: <TItem>(
    props: FlashListProps<TItem>,
  ) => React.ReactElement | null;
}
