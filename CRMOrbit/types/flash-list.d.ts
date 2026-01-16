export {};

declare module "@shopify/flash-list" {
  export interface FlashListProps<TItem> {
    estimatedItemSize?: number;
    // Phantom field to keep the generic in use for linting.
    __itemType?: TItem;
  }
}
