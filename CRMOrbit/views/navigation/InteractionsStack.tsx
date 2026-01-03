import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { InteractionsStackParamList } from "./types";
import {
  InteractionsListScreen,
  InteractionDetailScreen,
  InteractionFormScreen,
} from "../screens/interactions";
import { getStackScreenOptions } from "./stackOptions";
import { t } from "@i18n/index";
import { useTheme } from "../hooks";

const Stack = createNativeStackNavigator<InteractionsStackParamList>();

export const InteractionsStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
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
