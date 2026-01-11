import { useMemo, type ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import type { Code, CodeType } from "../../../domains/code";
import { ListRow, ListScreenLayout } from "../../components";
import { useAllCodes, useAccounts } from "../../store/store";
import { t } from "@i18n/index";
import { useTheme } from "../../hooks";
import type { NotesStackScreenProps } from "../../navigation/types";

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
type FontAwesome6IconName = ComponentProps<typeof FontAwesome6>["name"];

const CODE_TYPE_ICONS: Record<
  Exclude<CodeType, "code.type.other">,
  MaterialIconName
> = {
  "code.type.door": "door-closed-lock",
  "code.type.lockbox": "lock-outline",
  "code.type.alarm": "alarm-light-outline",
  "code.type.gate": "gate",
};

const OTHER_CODE_ICON: FontAwesome6IconName = "lines-leaning";

type Props = NotesStackScreenProps<"CodesList">;

export const CodesListScreen = ({ navigation }: Props) => {
  const codes = useAllCodes();
  const accounts = useAccounts();
  const { colors } = useTheme();

  const accountNames = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account.name]));
  }, [accounts]);

  const sortedCodes = useMemo(() => {
    return [...codes].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
  }, [codes]);

  const handlePress = (code: Code) => {
    navigation.navigate("CodeDetail", { codeId: code.id });
  };

  const handleAdd = () => {
    navigation.navigate("CodeForm", {});
  };

  const renderItem = ({ item }: { item: Code }) => {
    const accountName =
      accountNames.get(item.accountId) ?? t("common.unknownEntity");
    return (
      <ListRow
        onPress={() => handlePress(item)}
        title={item.label}
        description={accountName}
        descriptionNumberOfLines={2}
      >
        <View style={styles.typeIconContainer}>
          {item.type === "code.type.other" ? (
            <FontAwesome6
              name={OTHER_CODE_ICON}
              size={18}
              color={colors.accent}
            />
          ) : (
            <MaterialCommunityIcons
              name={CODE_TYPE_ICONS[item.type]}
              size={20}
              color={colors.accent}
            />
          )}
        </View>
      </ListRow>
    );
  };

  return (
    <ListScreenLayout
      data={sortedCodes}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      emptyTitle={t("codes.emptyTitle")}
      emptyHint={t("codes.emptyHint")}
      onAdd={handleAdd}
    />
  );
};

const styles = StyleSheet.create({
  typeIconContainer: {
    minWidth: 32,
    alignItems: "flex-end",
  },
});
