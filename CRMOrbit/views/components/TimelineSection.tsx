import { StyleSheet, Text, View } from "react-native";
import type { TimelineItem } from "@views/store/timeline";
import { EVENT_I18N_KEYS } from "@i18n/events";
import { t } from "@i18n/index";
import { useTheme } from "../hooks";
import { Section } from "./Section";

interface TimelineSectionProps {
  timeline: TimelineItem[];
}

export const TimelineSection = ({ timeline }: TimelineSectionProps) => {
  const { colors } = useTheme();

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderTimelineItem = (item: TimelineItem) => {
    if (item.kind === "event") {
      const i18nKey = EVENT_I18N_KEYS[item.event.type];
      const eventLabel = i18nKey ? t(i18nKey) : item.event.type;

      return (
        <View
          key={item.event.id}
          style={[
            styles.timelineItem,
            { borderLeftColor: colors.borderMedium },
          ]}
        >
          <View style={styles.timelineContent}>
            <Text style={[styles.eventLabel, { color: colors.textPrimary }]}>
              {eventLabel}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    }

    if (item.kind === "note") {
      return (
        <View
          key={item.note.id}
          style={[
            styles.timelineItem,
            { borderLeftColor: colors.borderMedium },
          ]}
        >
          <View style={styles.timelineContent}>
            <Text style={[styles.eventLabel, { color: colors.textPrimary }]}>
              {t("events.note.created")}: {item.note.title}
            </Text>
            {item.note.body && (
              <Text
                style={[styles.noteBody, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.note.body}
              </Text>
            )}
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    }

    if (item.kind === "interaction") {
      return (
        <View
          key={item.interaction.id}
          style={[
            styles.timelineItem,
            { borderLeftColor: colors.borderMedium },
          ]}
        >
          <View style={styles.timelineContent}>
            <Text style={[styles.eventLabel, { color: colors.textPrimary }]}>
              {t("events.interaction.logged")}
            </Text>
            {item.interaction.summary && (
              <Text
                style={[styles.noteBody, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.interaction.summary}
              </Text>
            )}
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Section>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t("timeline.title")}
      </Text>
      {timeline.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("timeline.empty")}
        </Text>
      ) : (
        <View style={styles.timelineContainer}>
          {timeline.map((item) => renderTimelineItem(item))}
        </View>
      )}
    </Section>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  timelineContainer: {
    marginTop: 8,
  },
  timelineItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  timelineContent: {
    gap: 4,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  noteBody: {
    fontSize: 13,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
});
