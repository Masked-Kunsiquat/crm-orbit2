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
        component={CalendarScreen}
        options={{ title: getScreenTitle(screenTitleKeys.calendar) }}
      />
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
