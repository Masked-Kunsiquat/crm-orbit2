import { Linking, Pressable, StyleSheet, Text } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import type { SocialMediaLinks } from "@domains/organization";
import { useTheme } from "../hooks";
import { Tooltip } from "./Tooltip";
import { t } from "@i18n/index";

type SocialLinksSectionProps = {
  socialMedia: SocialMediaLinks;
  translationPrefix: "organizations" | "accounts";
};

const normalizeUrl = (platform: string, value: string): string => {
  if (value.startsWith("http")) {
    return value;
  }

  switch (platform) {
    case "instagram":
      return `https://instagram.com/${value}`;
    case "x":
      return `https://x.com/${value}`;
    default:
      return value;
  }
};

const getSocialIcon = (
  platform: keyof SocialMediaLinks,
): "square-facebook" | "instagram" | "linkedin" | "square-x-twitter" => {
  switch (platform) {
    case "facebook":
      return "square-facebook";
    case "instagram":
      return "instagram";
    case "linkedin":
      return "linkedin";
    case "x":
      return "square-x-twitter";
  }
};

export const SocialLinksSection = ({
  socialMedia,
  translationPrefix,
}: SocialLinksSectionProps) => {
  const { colors } = useTheme();

  const platforms: Array<keyof SocialMediaLinks> = [
    "facebook",
    "instagram",
    "linkedin",
    "x",
  ];

  return (
    <>
      {platforms.map(
        (platform) =>
          socialMedia[platform] && (
            <Tooltip
              key={platform}
              content={normalizeUrl(platform, socialMedia[platform]!)}
            >
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    normalizeUrl(platform, socialMedia[platform]!),
                  )
                }
                style={styles.socialLinkContainer}
              >
                <Text style={[styles.socialLink, { color: colors.link }]}>
                  {t(`${translationPrefix}.socialMedia.${platform}`)}
                </Text>
                <FontAwesome6
                  name={getSocialIcon(platform)}
                  size={18}
                  color={colors.link}
                  style={styles.socialIcon}
                />
              </Pressable>
            </Tooltip>
          ),
      )}
    </>
  );
};

const styles = StyleSheet.create({
  socialLinkContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  socialLink: {
    fontSize: 16,
  },
  socialIcon: {
    marginLeft: 4,
  },
});
