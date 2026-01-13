import { useCallback, useMemo } from "react";
import { t } from "@i18n/index";
import { CalendarView } from "../../components";
import {
  useAccounts,
  useAllAudits,
  useAllInteractions,
  useDoc,
} from "../../store/store";
import type { EventsStackScreenProps } from "../../navigation/types";
import { getEntitiesForInteraction } from "../../store/selectors";

type Props = EventsStackScreenProps<"Calendar">;

export const CalendarScreen = ({ navigation }: Props) => {
  const audits = useAllAudits();
  const interactions = useAllInteractions();
  const accounts = useAccounts();
  const doc = useDoc();

  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const getEntityNamesForInteraction = useCallback(
    (interactionId: string): string => {
      const linkedEntities = getEntitiesForInteraction(doc, interactionId);
      const accountEntity =
        linkedEntities.find((entity) => entity.entityType === "account") ??
        linkedEntities[0];
      return accountEntity?.name ?? t("common.unknownEntity");
    },
    [doc],
  );

  const handleAuditPress = useCallback(
    (auditId: string) => {
      navigation.navigate("AuditDetail", { auditId });
    },
    [navigation],
  );

  const handleInteractionPress = useCallback(
    (interactionId: string) => {
      navigation.navigate("InteractionDetail", { interactionId });
    },
    [navigation],
  );

  return (
    <CalendarView
      audits={audits}
      interactions={interactions}
      accountNames={accountNames}
      entityNamesForInteraction={getEntityNamesForInteraction}
      onAuditPress={handleAuditPress}
      onInteractionPress={handleInteractionPress}
    />
  );
};
