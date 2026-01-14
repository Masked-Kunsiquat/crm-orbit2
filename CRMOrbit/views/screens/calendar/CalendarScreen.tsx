import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  CalendarView,
  FloatingActionButton,
  HeaderMenu,
  TimelineView,
} from "../../components";
import type { CalendarViewLabels } from "../../components/CalendarView";
import { useAccounts, useAllCalendarEvents, useDoc } from "../../store/store";
import type { EventsStackScreenProps } from "../../navigation/types";
import { getEntitiesForCalendarEvent } from "../../store/selectors";
import { useHeaderMenu, useTheme } from "../../hooks";
import { getInitialCalendarDateFromEvents } from "../../utils/calendarDataTransformers";

type CalendarViewMode = "agenda" | "timeline";

type CalendarScreenLabels = {
  viewOptionsLabel: string;
  switchToTimelineLabel: string;
  switchToAgendaLabel: string;
  unknownEntityLabel: string;
  quickAddButtonLabel: string;
  quickAddInteractionLabel: string;
  quickAddAuditLabel: string;
  calendarViewLabels: CalendarViewLabels;
};

type Props = EventsStackScreenProps<"Calendar"> & CalendarScreenLabels;

export const CalendarScreen = ({
  navigation,
  viewOptionsLabel,
  switchToTimelineLabel,
  switchToAgendaLabel,
  unknownEntityLabel,
  quickAddButtonLabel,
  quickAddInteractionLabel,
  quickAddAuditLabel,
  calendarViewLabels,
}: Props) => {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<CalendarViewMode>("agenda");
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const calendarEvents = useAllCalendarEvents();
  const accounts = useAccounts();
  const doc = useDoc();
  const initialDate = useMemo(
    () => getInitialCalendarDateFromEvents(calendarEvents),
    [calendarEvents],
  );
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedDateTouched, setSelectedDateTouched] = useState(false);

  const { menuVisible, menuAnchorRef, closeMenu, headerRight } = useHeaderMenu({
    accessibilityLabel: viewOptionsLabel,
  });

  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((current) => (current === "agenda" ? "timeline" : "agenda"));
  }, []);

  const viewModeLabel =
    viewMode === "agenda" ? switchToTimelineLabel : switchToAgendaLabel;

  const getEntityNamesForEvent = useCallback(
    (eventId: string): string => {
      const linkedEntities = getEntitiesForCalendarEvent(doc, eventId);
      const names = linkedEntities
        .map((entity) => entity.name)
        .filter((name): name is string => Boolean(name));
      return names.join(", ");
    },
    [doc],
  );

  const handleEventPress = useCallback(
    (calendarEventId: string, occurrenceTimestamp?: string) => {
      navigation.navigate("CalendarEventDetail", {
        calendarEventId,
        ...(occurrenceTimestamp && { occurrenceTimestamp }),
      });
    },
    [navigation],
  );

  const handleDateChange = useCallback((nextDate: string) => {
    setSelectedDateTouched(true);
    setSelectedDate(nextDate);
  }, []);

  const handleCreateInteraction = useCallback(() => {
    setQuickAddVisible(false);
    navigation.navigate("CalendarEventForm", { prefillDate: selectedDate });
  }, [navigation, selectedDate]);

  const handleCreateAudit = useCallback(() => {
    setQuickAddVisible(false);
    navigation.navigate("CalendarEventForm", {
      prefillDate: selectedDate,
      prefillType: "audit",
    });
  }, [navigation, selectedDate]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight,
    });
  }, [navigation, headerRight]);

  useEffect(() => {
    if (selectedDateTouched) {
      return;
    }
    setSelectedDate(initialDate);
  }, [initialDate, selectedDateTouched]);

  return (
    <>
      <View style={styles.container}>
        {viewMode === "agenda" ? (
          <CalendarView
            calendarEvents={calendarEvents}
            accountNames={accountNames}
            unknownEntityLabel={unknownEntityLabel}
            labels={calendarViewLabels}
            entityNamesForEvent={getEntityNamesForEvent}
            onEventPress={handleEventPress}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
          />
        ) : (
          <TimelineView
            calendarEvents={calendarEvents}
            accountNames={accountNames}
            unknownEntityLabel={unknownEntityLabel}
            entityNamesForEvent={getEntityNamesForEvent}
            onEventPress={handleEventPress}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
          />
        )}
        <FloatingActionButton
          label="+"
          accessibilityLabel={quickAddButtonLabel}
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
                {quickAddInteractionLabel}
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
                {quickAddAuditLabel}
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
