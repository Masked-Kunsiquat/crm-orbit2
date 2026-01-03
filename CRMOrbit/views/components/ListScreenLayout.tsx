import type { ReactElement, RefObject } from "react";
import type { FlatList as FlatListType, ListRenderItem } from "react-native";
import { FlatList, StyleSheet, View } from "react-native";

import { useTheme } from "../hooks";
import { FloatingActionButton } from "./FloatingActionButton";
import { ListEmptyState } from "./ListEmptyState";

type ListScreenLayoutProps<ItemT> = {
  data: ItemT[];
  renderItem: ListRenderItem<ItemT>;
  keyExtractor: (item: ItemT) => string;
  emptyTitle: string;
  emptyHint?: string;
  onAdd: () => void;
  listFooterComponent?: ReactElement | null;
  rightAccessory?: ReactElement | null;
  flatListRef?: RefObject<FlatListType<ItemT> | null>;
};

export const ListScreenLayout = <ItemT,>({
  data,
  renderItem,
  keyExtractor,
  emptyTitle,
  emptyHint,
  onAdd,
  listFooterComponent,
  rightAccessory,
  flatListRef,
}: ListScreenLayoutProps<ItemT>) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListFooterComponent={listFooterComponent}
        contentContainerStyle={
          data.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          <ListEmptyState title={emptyTitle} hint={emptyHint} />
        }
      />
      {rightAccessory && (
        <View style={styles.rightAccessoryContainer}>{rightAccessory}</View>
      )}
      <FloatingActionButton onPress={onAdd} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    padding: 16,
  },
  rightAccessoryContainer: {
    position: "absolute",
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
