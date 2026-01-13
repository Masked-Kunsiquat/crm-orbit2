import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { EventsStackParamList } from "./types";
import { EventsLandingScreen } from "../screens/events/EventsLandingScreen";
import {
  AuditsListScreen,
  AuditDetailScreen,
  AuditFormScreen,
} from "../screens/audits";
import { CalendarScreen } from "../screens/calendar";
import {
  InteractionsListScreen,
  InteractionDetailScreen,
  InteractionFormScreen,
} from "../screens/interactions";
import { getStackScreenOptions } from "./stackOptions";
import { useScreenTitles, useTheme } from "../hooks";
import { t } from "@i18n/index";

const Stack = createNativeStackNavigator<EventsStackParamList>();

export const EventsStack = () => {
  const { colors } = useTheme();
  const { getScreenTitle, screenTitleKeys } = useScreenTitles();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="EventsLanding"
        component={EventsLandingScreen}
        options={{ title: getScreenTitle(screenTitleKeys.events) }}
      />
      <Stack.Screen
        name="AuditsList"
        component={AuditsListScreen}
        options={{ title: getScreenTitle(screenTitleKeys.auditsList) }}
      />
      <Stack.Screen
        name="AuditDetail"
        component={AuditDetailScreen}
        options={{ title: getScreenTitle(screenTitleKeys.auditDetail) }}
      />
      <Stack.Screen
        name="AuditForm"
        component={AuditFormScreen}
        options={({ route }) => ({
          title: getScreenTitle(
            route.params?.auditId
              ? screenTitleKeys.auditFormEdit
              : screenTitleKeys.auditFormNew,
          ),
        })}
      />
      <Stack.Screen
        name="Calendar"
        options={{ title: getScreenTitle(screenTitleKeys.calendar) }}
      >
        {(props) => (
          <CalendarScreen
            {...props}
            viewOptionsLabel={t("calendar.viewOptions")}
            switchToTimelineLabel={t("calendar.switchToTimeline")}
            switchToAgendaLabel={t("calendar.switchToAgenda")}
            unknownEntityLabel={t("common.unknownEntity")}
            quickAddButtonLabel={t("calendar.quickAdd.button")}
            quickAddInteractionLabel={t("calendar.quickAdd.interaction")}
            quickAddAuditLabel={t("calendar.quickAdd.audit")}
            calendarViewLabels={{
              emptyTitle: t("calendar.emptyTitle"),
              emptyHint: t("calendar.emptyHint"),
              unknownValue: t("common.unknown"),
              audit: {
                scheduledForLabel: t("audits.fields.scheduledFor"),
                endsAtLabel: t("audits.fields.endsAt"),
                scoreLabel: t("audits.fields.score"),
                floorsVisitedLabel: t("audits.fields.floorsVisited"),
              },
              interaction: {
                statusLabel: t("interactions.statusLabel"),
                endsAtLabel: t("interactions.fields.endsAt"),
                subtitleLabels: {
                  "interactions.scheduledFor": t("interactions.scheduledFor"),
                  "interactions.occurredAt": t("interactions.occurredAt"),
                },
                statusLabels: {
                  "interaction.status.scheduled": t(
                    "interaction.status.scheduled",
                  ),
                  "interaction.status.completed": t(
                    "interaction.status.completed",
                  ),
                  "interaction.status.canceled": t(
                    "interaction.status.canceled",
                  ),
                },
              },
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="InteractionsList"
        component={InteractionsListScreen}
        options={{ title: getScreenTitle(screenTitleKeys.interactionsList) }}
      />
      <Stack.Screen
        name="InteractionDetail"
        component={InteractionDetailScreen}
        options={{ title: getScreenTitle(screenTitleKeys.interactionDetail) }}
      />
      <Stack.Screen
        name="InteractionForm"
        component={InteractionFormScreen}
        options={({ route }) => ({
          title: getScreenTitle(
            route.params?.interactionId
              ? screenTitleKeys.interactionFormEdit
              : screenTitleKeys.interactionFormNew,
          ),
        })}
      />
    </Stack.Navigator>
  );
};
