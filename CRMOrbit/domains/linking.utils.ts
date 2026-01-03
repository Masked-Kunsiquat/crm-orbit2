import { Alert, Linking, Platform } from "react-native";
import { t } from "@i18n/index";
import { createLogger } from "../utils/logger";

const logger = createLogger("Linking");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.replace(/[^\d+]/g, "");
};

const showLinkingAlert = (messageKey: string): void => {
  Alert.alert(t("common.error"), t(messageKey), t("common.ok"));
};

const openLinkingUrl = async (
  url: string,
  description: string,
  alertMessages?: {
    unsupportedMessageKey?: string;
    failedMessageKey?: string;
  },
): Promise<void> => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      logger.warn(`${description} not available`, { url });
      if (alertMessages?.unsupportedMessageKey) {
        showLinkingAlert(alertMessages.unsupportedMessageKey);
      }
      return;
    }

    await Linking.openURL(url);
  } catch (error) {
    logger.error(`Failed to open ${description}`, { url }, error);
    if (alertMessages?.failedMessageKey) {
      showLinkingAlert(alertMessages.failedMessageKey);
    }
  }
};

const openMapsUrl = async (
  primaryUrl: string,
  fallbackUrl?: string,
): Promise<void> => {
  try {
    const supported = await Linking.canOpenURL(primaryUrl);
    if (supported) {
      await Linking.openURL(primaryUrl);
      return;
    }

    if (fallbackUrl) {
      await Linking.openURL(fallbackUrl);
      return;
    }

    logger.warn("Maps app not available", { url: primaryUrl });
    showLinkingAlert("no_maps_app");
  } catch (error) {
    logger.error("Failed to open maps", { url: primaryUrl, fallbackUrl }, error);
    showLinkingAlert("maps_open_failed");
  }
};

/**
 * Opens the native phone dialer with the phone number pre-filled
 * @param phoneNumber - The phone number to dial (can include formatting characters)
 */
export const openPhoneDialer = (phoneNumber: string): void => {
  const cleanNumber = normalizePhoneNumber(phoneNumber);
  if (!cleanNumber) {
    logger.warn("Phone number missing for dialer", { phoneNumber });
    return;
  }

  void openLinkingUrl(`tel:${cleanNumber}`, "phone dialer");
};

/**
 * Opens the native SMS app with the phone number pre-filled
 * @param phoneNumber - The phone number to send SMS to (can include formatting characters)
 */
export const openSMS = (phoneNumber: string): void => {
  const cleanNumber = normalizePhoneNumber(phoneNumber);
  if (!cleanNumber) {
    logger.warn("Phone number missing for SMS", { phoneNumber });
    return;
  }

  void openLinkingUrl(`sms:${cleanNumber}`, "SMS");
};

/**
 * Opens the default email app with the email address pre-filled
 * @param email - The email address to send to
 */
export const openEmailComposer = async (email: string): Promise<void> => {
  const trimmedEmail = email.trim();
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    logger.warn("Invalid email address for composer", { email });
    showLinkingAlert("email_invalid");
    return;
  }

  const url = `mailto:${trimmedEmail}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      logger.warn("No email app available", { email: trimmedEmail });
      showLinkingAlert("no_email_app");
      return;
    }

    await Linking.openURL(url);
  } catch (error) {
    logger.error("Failed to open email composer", { email: trimmedEmail }, error);
    showLinkingAlert("email_send_failed");
  }
};

/**
 * Opens the native maps app with the address pre-filled
 * Shows app picker with all installed mapping apps
 * @param address - The full address string
 */
export const openMapsWithAddress = async (address: string): Promise<void> => {
  const encodedAddress = encodeURIComponent(address);
  if (Platform.OS === "ios") {
    await openMapsUrl(
      `maps://?q=${encodedAddress}`,
      `https://maps.apple.com/?q=${encodedAddress}`,
    );
    return;
  }

  await openMapsUrl(`geo:0,0?q=${encodedAddress}`);
};

/**
 * Opens the native maps app with coordinates and optional label
 * Shows app picker with all installed mapping apps
 * @param latitude - The latitude coordinate
 * @param longitude - The longitude coordinate
 * @param label - Optional label for the location
 */
export const openMapsWithCoordinates = async (
  latitude: number,
  longitude: number,
  label?: string,
): Promise<void> => {
  const encodedLabel = label ? encodeURIComponent(label) : "";
  const coordinates = `${latitude},${longitude}`;

  if (Platform.OS === "ios") {
    const query = encodedLabel ? `&q=${encodedLabel}` : "";
    await openMapsUrl(
      `maps://?ll=${coordinates}${query}`,
      `https://maps.apple.com/?ll=${coordinates}${query}`,
    );
    return;
  }

  const labelSuffix = encodedLabel ? `(${encodedLabel})` : "";
  await openMapsUrl(`geo:${coordinates}?q=${coordinates}${labelSuffix}`);
};

/**
 * Formats an address object into a single string for maps
 * @param address - Address object with street, city, state, zipCode
 */
export const formatAddressForMaps = (address: {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}): string => {
  return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
};
