import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { t } from "@i18n/index";
import { CalendarView, HeaderMenu, TimelineView } from "../../components";
import {
  useAccounts,
  useAllAudits,
  useAllInteractions,
  useDoc,
} from "../../store/store";
import type { EventsStackScreenProps } from "../../navigation/types";
import { getEntitiesForInteraction } from "../../store/selectors";
import { useHeaderMenu, useTheme } from "../../hooks";

type CalendarViewMode = "agenda" | "timeline";

type Props = EventsStackScreenProps<"Calendar">;

export const CalendarScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<CalendarViewMode>("agenda");
  const audits = useAllAudits();
  const interactions = useAllInteractions();
  const accounts = useAccounts();
  const doc = useDoc();

  const { menuVisible, menuAnchorRef, closeMenu, headerRight } = useHeaderMenu({
    accessibilityLabel: t("calendar.viewOptions"),
  });

  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((current) => (current === "agenda" ? "timeline" : "agenda"));
  }, []);

  const viewModeLabel =
    viewMode === "agenda"
      ? t("calendar.switchToTimeline")
      : t("calendar.switchToAgenda");

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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight,
    });
  }, [navigation, headerRight]);

  return (
    <>
      {viewMode === "agenda" ? (
        <CalendarView
          audits={audits}
          interactions={interactions}
          accountNames={accountNames}
          entityNamesForInteraction={getEntityNamesForInteraction}
          onAuditPress={handleAuditPress}
          onInteractionPress={handleInteractionPress}
        />
      ) : (
        <TimelineView
          audits={audits}
          interactions={interactions}
          accountNames={accountNames}
          entityNamesForInteraction={getEntityNamesForInteraction}
          onAuditPress={handleAuditPress}
          onInteractionPress={handleInteractionPress}
        />
      )}
      <HeaderMenu
        anchorRef={menuAnchorRef}
        visible={menuVisible}
        onRequestClose={closeMenu}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            toggleViewMode();
            closeMenu();
          }}
          style={({ pressed }) => [
            styles.menuItem,
            {
              backgroundColor: pressed
                ? colors.surfaceElevated
                : colors.surface,
            },
          ]}
        >
          <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
            {viewModeLabel}
          </Text>
        </Pressable>
      </HeaderMenu>
    </>
  );
};

const styles = StyleSheet.create({
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 16,
  },
});
