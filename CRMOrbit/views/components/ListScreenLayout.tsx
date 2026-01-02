import type { ReactElement } from "react";
import type { ListRenderItem } from "react-native";
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
};

export const ListScreenLayout = <ItemT,>({
  data,
  renderItem,
  keyExtractor,
  emptyTitle,
  emptyHint,
  onAdd,
  listFooterComponent,
}: ListScreenLayoutProps<ItemT>) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <FlatList
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
});
