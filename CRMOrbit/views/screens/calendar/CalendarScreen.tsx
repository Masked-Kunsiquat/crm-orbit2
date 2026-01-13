import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "@i18n/index";
import {
  CalendarView,
  FloatingActionButton,
  HeaderMenu,
  TimelineView,
} from "../../components";
import {
  useAccounts,
  useAllAudits,
  useAllInteractions,
  useDoc,
} from "../../store/store";
import type { EventsStackScreenProps } from "../../navigation/types";
import { getEntitiesForInteraction } from "../../store/selectors";
import { useHeaderMenu, useTheme } from "../../hooks";
import { getInitialCalendarDate } from "../../utils/calendarDataTransformers";

type CalendarViewMode = "agenda" | "timeline";

type Props = EventsStackScreenProps<"Calendar">;

export const CalendarScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<CalendarViewMode>("agenda");
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const audits = useAllAudits();
  const interactions = useAllInteractions();
  const accounts = useAccounts();
  const doc = useDoc();
  const initialDate = useMemo(
    () => getInitialCalendarDate(audits, interactions),
    [audits, interactions],
  );
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

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

  const handleCreateInteraction = useCallback(() => {
    setQuickAddVisible(false);
    navigation.navigate("InteractionForm", { prefillDate: selectedDate });
  }, [navigation, selectedDate]);

  const handleCreateAudit = useCallback(() => {
    setQuickAddVisible(false);
    navigation.navigate("AuditForm", { prefillDate: selectedDate });
  }, [navigation, selectedDate]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight,
    });
  }, [navigation, headerRight]);

  return (
    <>
      <View style={styles.container}>
        {viewMode === "agenda" ? (
          <CalendarView
            audits={audits}
            interactions={interactions}
            accountNames={accountNames}
            entityNamesForInteraction={getEntityNamesForInteraction}
            onAuditPress={handleAuditPress}
            onInteractionPress={handleInteractionPress}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        ) : (
          <TimelineView
            audits={audits}
            interactions={interactions}
            accountNames={accountNames}
            fallbackUnknownEntity={t("common.unknownEntity")}
            entityNamesForInteraction={getEntityNamesForInteraction}
            onAuditPress={handleAuditPress}
            onInteractionPress={handleInteractionPress}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        )}
        <FloatingActionButton
          label="+"
          accessibilityLabel={t("calendar.quickAdd.button")}
          onPress={() => setQuickAddVisible(true)}
        />
      </View>
      <Modal
        transparent
        visible={quickAddVisible}
        animationType="fade"
        onRequestClose={() => setQuickAddVisible(false)}
      >
        <View style={styles.quickAddOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setQuickAddVisible(false)}
          />
          <View
            style={[
              styles.quickAddMenu,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              onPress={handleCreateInteraction}
              style={({ pressed }) => [
                styles.quickAddItem,
                pressed && styles.quickAddItemPressed,
              ]}
            >
              <Text
                style={[styles.quickAddText, { color: colors.textPrimary }]}
              >
                {t("calendar.quickAdd.interaction")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleCreateAudit}
              style={({ pressed }) => [
                styles.quickAddItem,
                pressed && styles.quickAddItemPressed,
              ]}
            >
              <Text
                style={[styles.quickAddText, { color: colors.textPrimary }]}
              >
                {t("calendar.quickAdd.audit")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  container: {
    flex: 1,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 16,
  },
  quickAddOverlay: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 16,
  },
  quickAddMenu: {
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    marginBottom: 72,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  quickAddItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  quickAddItemPressed: {
    opacity: 0.8,
  },
  quickAddText: {
    fontSize: 16,
  },
});
