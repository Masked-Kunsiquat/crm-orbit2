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
import { useTheme } from "../hooks";
import { t } from "@i18n/index";

const Stack = createNativeStackNavigator<EventsStackParamList>();

export const EventsStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="EventsLanding"
        component={EventsLandingScreen}
        options={{ title: t("screens.events") }}
      />
      <Stack.Screen
        name="AuditsList"
        component={AuditsListScreen}
        options={{ title: t("audits.listTitle") }}
      />
      <Stack.Screen
        name="AuditDetail"
        component={AuditDetailScreen}
        options={{ title: t("screens.auditDetails") }}
      />
      <Stack.Screen
        name="AuditForm"
        component={AuditFormScreen}
        options={({ route }) => ({
          title: route.params?.auditId
            ? t("screens.editAudit")
            : t("screens.newAudit"),
        })}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: t("screens.calendar") }}
      />
      <Stack.Screen
        name="InteractionsList"
        component={InteractionsListScreen}
        options={{ title: t("interactions.title") }}
      />
      <Stack.Screen
        name="InteractionDetail"
        component={InteractionDetailScreen}
        options={{ title: t("screens.interactionDetails") }}
      />
      <Stack.Screen
        name="InteractionForm"
        component={InteractionFormScreen}
        options={({ route }) => ({
          title: route.params?.interactionId
            ? t("screens.editInteraction")
            : t("screens.newInteraction"),
        })}
      />
    </Stack.Navigator>
  );
};
