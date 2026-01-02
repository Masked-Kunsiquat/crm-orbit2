import { StyleSheet } from "react-native";

import type { SocialMediaLinks } from "@domains/organization";
import { t } from "@i18n/index";
import { FormField } from "./FormField";
import { TextField } from "./TextField";

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
    <FormField label={t(`${translationPrefix}.form.socialMedia.label`)}>
      {fields.map((field) => (
        <TextField
          key={field.key}
          style={styles.socialInput}
          value={socialMedia[field.key] || ""}
          onChangeText={(value) => onChange(field.key, value)}
          placeholder={t(
            `${translationPrefix}.form.socialMedia.${field.placeholderKey}`,
          )}
          autoCapitalize="none"
        />
      ))}
    </FormField>
  );
};

const styles = StyleSheet.create({
  socialInput: {
    marginTop: 8,
  },
});
