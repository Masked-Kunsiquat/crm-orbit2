import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import type { Contact } from "@domains/contact";
import { t } from "@i18n/index";

import { useTheme } from "../hooks";

type ContactTypeBadgeProps = {
  type: Contact["type"];
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const getContactTypeStyling = (
  type: Contact["type"],
  colors: ReturnType<typeof useTheme>["colors"],
) => {
  switch (type) {
    case "contact.type.internal":
      return {
        backgroundColor: colors.contactTypeInternalBg,
        textColor: colors.contactTypeInternalText,
        label: t("contact.type.internal"),
      };
    case "contact.type.external":
      return {
        backgroundColor: colors.contactTypeExternalBg,
        textColor: colors.contactTypeExternalText,
        label: t("contact.type.external"),
      };
    case "contact.type.vendor":
    default:
      return {
        backgroundColor: colors.contactTypeVendorBg,
        textColor: colors.contactTypeVendorText,
        label: t("contact.type.vendor"),
      };
  }
};

export const ContactTypeBadge = ({
  type,
  style,
  textStyle,
}: ContactTypeBadgeProps) => {
  const { colors } = useTheme();
  const contactType = getContactTypeStyling(type, colors);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: contactType.backgroundColor },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: contactType.textColor },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {contactType.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
