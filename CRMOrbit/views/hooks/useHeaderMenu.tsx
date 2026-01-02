import React, { useCallback, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "./useTheme";

type UseHeaderMenuOptions = {
  accessibilityLabel: string;
};

type UseHeaderMenuResult = {
  menuVisible: boolean;
  setMenuVisible: Dispatch<SetStateAction<boolean>>;
  menuAnchorRef: React.RefObject<View>;
  closeMenu: () => void;
  toggleMenu: () => void;
  headerRight: () => ReactNode;
};

export const useHeaderMenu = ({
  accessibilityLabel,
}: UseHeaderMenuOptions): UseHeaderMenuResult => {
  const { colors } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnchorRef = useRef<View>(null);

  const toggleMenu = useCallback(() => {
    setMenuVisible((current) => !current);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const headerRight = useCallback(
    () => (
      <View ref={menuAnchorRef} style={styles.headerMenuWrapper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={toggleMenu}
          style={styles.headerButton}
        >
          <Text style={[styles.headerButtonText, { color: colors.headerTint }]}>
            ⋮
          </Text>
        </Pressable>
      </View>
    ),
    [accessibilityLabel, colors.headerTint, toggleMenu],
  );

  return {
    menuVisible,
    setMenuVisible,
    menuAnchorRef,
    closeMenu,
    toggleMenu,
    headerRight,
  };
};

const styles = StyleSheet.create({
  headerMenuWrapper: {
    position: "relative",
    alignItems: "flex-end",
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 18,
  },
});
