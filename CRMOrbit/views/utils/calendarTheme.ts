import type { Theme } from "react-native-calendars/src/types";
import type { ColorScheme } from "@domains/shared/theme/colors";

/**
 * Builds a react-native-calendars theme from the app's color scheme
 */
export const buildCalendarTheme = (
  colors: ColorScheme,
  isDark: boolean,
): Theme => {
  return {
    // Background colors
    backgroundColor: colors.canvas,
    calendarBackground: colors.surface,

    // Text colors
    textSectionTitleColor: colors.textMuted,
    textSectionTitleDisabledColor: colors.textFaint,
    dayTextColor: colors.textPrimary,
    todayTextColor: colors.accent,
    selectedDayTextColor: colors.onAccent,
    monthTextColor: colors.textPrimary,
    textDisabledColor: colors.textFaint,
    textDayFontWeight: "400",
    textMonthFontWeight: "600",
    textDayHeaderFontWeight: "600",

    // Selected day styling
    selectedDayBackgroundColor: colors.accent,

    // Arrow colors
    arrowColor: colors.accent,

    // Dot colors (for marked dates)
    dotColor: colors.accent,
    selectedDotColor: colors.onAccent,

    // Disable dates styling
    disabledArrowColor: colors.textFaint,

    // Agenda styling
    agendaDayTextColor: colors.textPrimary,
    agendaDayNumColor: colors.textPrimary,
    agendaTodayColor: colors.accent,
    agendaKnobColor: colors.border,

    // Additional styling
    stylesheet: {
      calendar: {
        header: {
          header: {
            backgroundColor: colors.surface,
            flexDirection: "row" as const,
            justifyContent: "space-between" as const,
            paddingLeft: 10,
            paddingRight: 10,
            marginTop: 6,
            alignItems: "center" as const,
          },
          monthText: {
            fontSize: 16,
            fontWeight: "600" as const,
            color: colors.textPrimary,
            margin: 10,
          },
          arrow: {
            padding: 10,
          },
          week: {
            marginTop: 7,
            flexDirection: "row" as const,
            justifyContent: "space-around" as const,
          },
        },
      },
      day: {
        basic: {
          base: {
            width: 32,
            height: 32,
            alignItems: "center" as const,
            justifyContent: "center" as const,
          },
          text: {
            fontSize: 16,
            color: colors.textPrimary,
          },
          today: {
            backgroundColor: isDark
              ? colors.surfaceElevated
              : colors.borderLight,
            borderRadius: 16,
          },
          todayText: {
            color: colors.accent,
            fontWeight: "600" as const,
          },
          selected: {
            backgroundColor: colors.accent,
            borderRadius: 16,
          },
          selectedText: {
            color: colors.onAccent,
            fontWeight: "600" as const,
          },
          disabled: {
            opacity: 0.3,
          },
          disabledText: {
            color: colors.textFaint,
          },
        },
      },
      agenda: {
        main: {
          knobContainer: {
            flex: 1,
            position: "absolute" as const,
            left: 0,
            right: 0,
            height: 24,
            bottom: 0,
            alignItems: "center" as const,
            backgroundColor: colors.surface,
          },
          knob: {
            width: 38,
            height: 7,
            marginTop: 10,
            borderRadius: 3,
            backgroundColor: colors.border,
          },
        },
      },
    },
  };
};
