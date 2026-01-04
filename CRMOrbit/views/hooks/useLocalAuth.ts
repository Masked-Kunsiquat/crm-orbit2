import { useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";

type LocalAuthResult = {
  authenticate: (reason: string) => Promise<boolean>;
  isAvailable: () => Promise<boolean>;
};

export const useLocalAuth = (): LocalAuthResult => {
  const isAvailable = useCallback(async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return false;

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return isEnrolled;
    } catch {
      return false;
    }
  }, []);

  const authenticate = useCallback(
    async (reason: string): Promise<boolean> => {
      try {
        const available = await isAvailable();
        if (!available) {
          return false;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: reason,
          disableDeviceFallback: false,
        });

        return result.success;
      } catch {
        return false;
      }
    },
    [isAvailable],
  );

  return { authenticate, isAvailable };
};
