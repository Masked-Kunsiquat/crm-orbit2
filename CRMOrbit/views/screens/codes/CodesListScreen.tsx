import { useMemo } from "react";

import type { Code } from "../../../domains/code";
import { ListRow, ListScreenLayout } from "../../components";
import { useAllCodes, useAccounts } from "../../store/store";
import { t } from "@i18n/index";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export const CodesListScreen = ({ navigation }: Props) => {
  const codes = useAllCodes();
  const accounts = useAccounts();

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
    const description = `${accountName} • ${t(item.type)}`;
    return (
      <ListRow
        onPress={() => handlePress(item)}
        title={item.label}
        description={description}
        descriptionNumberOfLines={2}
        footnote={item.codeValue}
        footnoteNumberOfLines={1}
      />
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
