import { StyleSheet, View } from "react-native";

import { SegmentedOptionGroup } from "./SegmentedOptionGroup";

type DetailTab<T extends string> = {
  value: T;
  label: string;
};

type DetailTabsProps<T extends string> = {
  tabs: ReadonlyArray<DetailTab<T>>;
  activeTab: T;
  onTabChange: (tab: T) => void;
};

export const DetailTabs = <T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: DetailTabsProps<T>) => {
  return (
    <View style={styles.container}>
      <SegmentedOptionGroup
        options={tabs}
        value={activeTab}
        onChange={onTabChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
});
