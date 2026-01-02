import { StyleSheet, Text, TextInput, View } from "react-native";

import type { SocialMediaLinks } from "@domains/organization";
import { useTheme } from "../hooks";
import { t } from "@i18n/index";

type SocialMediaFieldsProps = {
  socialMedia: SocialMediaLinks;
  onChange: (platform: keyof SocialMediaLinks, value: string) => void;
  translationPrefix: "organizations" | "accounts";
};

export const SocialMediaFields = ({
  socialMedia,
  onChange,
  translationPrefix,
}: SocialMediaFieldsProps) => {
  const { colors } = useTheme();

  const fields: Array<{
    key: keyof SocialMediaLinks;
    placeholderKey: string;
  }> = [
    {
      key: "x",
      placeholderKey: "xPlaceholder",
    },
    {
      key: "linkedin",
      placeholderKey: "linkedinPlaceholder",
    },
    {
      key: "facebook",
      placeholderKey: "facebookPlaceholder",
    },
    {
      key: "instagram",
      placeholderKey: "instagramPlaceholder",
    },
  ];

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {t(`${translationPrefix}.form.socialMedia.label`)}
      </Text>
      {fields.map((field) => (
        <TextInput
          key={field.key}
          style={[
            styles.input,
            styles.socialInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          value={socialMedia[field.key] || ""}
          onChangeText={(value) => onChange(field.key, value)}
          placeholder={t(
            `${translationPrefix}.form.socialMedia.${field.placeholderKey}`,
          )}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  socialInput: {
    marginBottom: 8,
  },
});
