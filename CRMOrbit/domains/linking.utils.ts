import { Alert, Linking } from "react-native";
import { t } from "@i18n/index";
import { createLogger } from "../utils/logger";

const logger = createLogger("Linking");

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
export const openEmailComposer = (email: string): void => {
  const url = `mailto:${email}`;
  void openLinkingUrl(url, "email composer", {
    unsupportedMessageKey: "no_email_app",
    failedMessageKey: "email_send_failed",
  });
};

/**
 * Opens the native maps app with the address pre-filled
 * Shows app picker with all installed mapping apps
 * @param address - The full address string
 */
export const openMapsWithAddress = (address: string): void => {
  const encodedAddress = encodeURIComponent(address);
  void openLinkingUrl(`geo:0,0?q=${encodedAddress}`, "maps", {
    unsupportedMessageKey: "no_maps_app",
    failedMessageKey: "maps_open_failed",
  });
};

/**
 * Opens the native maps app with coordinates and optional label
 * Shows app picker with all installed mapping apps
 * @param latitude - The latitude coordinate
 * @param longitude - The longitude coordinate
 * @param label - Optional label for the location
 */
export const openMapsWithCoordinates = (
  latitude: number,
  longitude: number,
  label?: string,
): void => {
  const labelParam = label ? `(${encodeURIComponent(label)})` : "";
  void openLinkingUrl(
    `geo:${latitude},${longitude}?q=${latitude},${longitude}${labelParam}`,
    "maps",
    {
      unsupportedMessageKey: "no_maps_app",
      failedMessageKey: "maps_open_failed",
    },
  );
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
