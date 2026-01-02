import { StyleSheet, Text, TextInput, View } from "react-native";

import type { SocialMediaLinks } from "@domains/organization";
import { useTheme } from "../hooks";

type SocialMediaFieldsProps = {
  socialMedia: SocialMediaLinks;
  onChange: (platform: keyof SocialMediaLinks, value: string) => void;
};

export const SocialMediaFields = ({
  socialMedia,
  onChange,
}: SocialMediaFieldsProps) => {
  const { colors } = useTheme();

  const fields: Array<{
    key: keyof SocialMediaLinks;
    placeholder: string;
  }> = [
    {
      key: "x",
      placeholder: "X (Twitter) username or URL",
    },
    {
      key: "linkedin",
      placeholder: "LinkedIn URL",
    },
    {
      key: "facebook",
      placeholder: "Facebook URL",
    },
    {
      key: "instagram",
      placeholder: "Instagram username or URL",
    },
  ];

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        Social Media
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
          placeholder={field.placeholder}
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
