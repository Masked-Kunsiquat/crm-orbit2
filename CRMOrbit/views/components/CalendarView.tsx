import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { CalendarProvider, ExpandableCalendar } from "react-native-calendars";
import type { DateData } from "react-native-calendars";
import { AntDesign, FontAwesome6, Ionicons } from "@expo/vector-icons";

import type { Audit } from "@domains/audit";
import type { Interaction } from "@domains/interaction";
import { t } from "@i18n/index";
import { ListRow, StatusBadge } from "./index";
import { useTheme } from "../hooks";
import { buildCalendarTheme } from "../utils/calendarTheme";
import type { AgendaItem } from "../utils/calendarDataTransformers";
import {
  buildAuditAgendaItem,
  buildInteractionAgendaItem,
  buildMarkedDates,
  getInitialCalendarDate,
} from "../utils/calendarDataTransformers";
import { resolveCalendarPalette } from "../utils/calendarColors";
import { useCalendarSettings } from "../store/store";

export interface CalendarViewProps {
  audits: Audit[];
  interactions: Interaction[];
  accountNames: Map<string, string>;
  entityNamesForInteraction: (interactionId: string) => string;
  onAuditPress: (auditId: string) => void;
  onInteractionPress: (interactionId: string) => void;
}

export const CalendarView = ({
  audits,
  interactions,
  accountNames,
  entityNamesForInteraction,
  onAuditPress,
  onInteractionPress,
}: CalendarViewProps) => {
  const { colors, isDark } = useTheme();
  const calendarSettings = useCalendarSettings();
  const calendarTheme = useMemo(
    () => buildCalendarTheme(colors, isDark),
    [colors, isDark],
  );
  const calendarPalette = useMemo(
    () => resolveCalendarPalette(colors, calendarSettings.palette),
    [colors, calendarSettings.palette],
  );

  // Build agenda items
  const agendaItems = useMemo<AgendaItem[]>(() => {
    const items: AgendaItem[] = [];

    for (const audit of audits) {
      const accountName =
        accountNames.get(audit.accountId) ?? t("common.unknownEntity");
      const item = buildAuditAgendaItem(audit, accountName);
      if (item) items.push(item);
    }

    for (const interaction of interactions) {
      const entityName = entityNamesForInteraction(interaction.id);
      const item = buildInteractionAgendaItem(interaction, entityName);
      if (item) items.push(item);
    }

    return items;
  }, [audits, interactions, accountNames, entityNamesForInteraction]);

  // Initial date (most recent event date or today)
  const initialDate = useMemo(
    () => getInitialCalendarDate(audits, interactions),
    [audits, interactions],
  );

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  // Build marked dates
  const markedDates = useMemo(
    () => buildMarkedDates(audits, interactions, selectedDate, calendarPalette),
    [audits, interactions, selectedDate, calendarPalette],
  );

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  const getInteractionIcon = useCallback(
    (type: string) => {
      switch (type) {
        case "interaction.type.email":
          return (
            <Ionicons name="mail-outline" size={20} color={colors.accent} />
          );
        case "interaction.type.call":
          return (
            <Ionicons name="call-outline" size={20} color={colors.accent} />
          );
        case "interaction.type.meeting":
          return (
            <Ionicons
              name="people-circle-outline"
              size={20}
              color={colors.accent}
            />
          );
        case "interaction.type.other":
        default:
          return (
            <FontAwesome6
              name="lines-leaning"
              size={20}
              color={colors.accent}
            />
          );
      }
    },
    [colors.accent],
  );

  const renderItem = useCallback(
    ({ item }: { item: AgendaItem }) => {
      if (item.kind === "audit") {
        return (
          <ListRow
            onPress={() => onAuditPress(item.audit.id)}
            title={item.accountName}
            subtitle={item.subtitle}
            description={item.description}
            footnote={item.footnote}
            descriptionNumberOfLines={3}
            footnoteNumberOfLines={2}
            style={styles.listRow}
            titleAccessory={
              <StatusBadge tone={item.statusTone} labelKey={item.statusKey} />
            }
          >
            <View style={styles.iconContainer}>
              <AntDesign name="audit" size={20} color={colors.accent} />
            </View>
          </ListRow>
        );
      }

      return (
        <ListRow
          onPress={() => onInteractionPress(item.interaction.id)}
          title={item.interaction.summary}
          subtitle={item.subtitle}
          description={item.description}
          descriptionNumberOfLines={3}
          style={styles.listRow}
        >
          <View style={styles.iconContainer}>
            {getInteractionIcon(item.interaction.type)}
          </View>
        </ListRow>
      );
    },
    [onAuditPress, onInteractionPress, colors.accent, getInteractionIcon],
  );

  const keyExtractor = useCallback(
    (item: AgendaItem) =>
      item.kind === "audit" ? `audit-${item.id}` : `interaction-${item.id}`,
    [],
  );

  const getItemType = useCallback((item: AgendaItem) => {
    return item.kind;
  }, []);

  return (
    <CalendarProvider date={selectedDate} onDateChanged={setSelectedDate}>
      <ExpandableCalendar
        theme={calendarTheme}
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={handleDayPress}
        firstDay={0}
        allowShadow={true}
        closeOnDayPress={true}
      />
      <View
        style={[styles.agendaContainer, { backgroundColor: colors.canvas }]}
      >
        <FlashList
          data={agendaItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          estimatedItemSize={100}
          drawDistance={500}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {t("calendar.emptyTitle")}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textFaint }]}>
                {t("calendar.emptyHint")}
              </Text>
            </View>
          }
        />
      </View>
    </CalendarProvider>
  );
};

const styles = StyleSheet.create({
  agendaContainer: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconContainer: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 14,
    textAlign: "center",
  },
});
