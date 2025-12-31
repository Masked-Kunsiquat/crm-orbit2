import type { ReactNode, RefObject } from "react";
import { useEffect, useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";

import { colors } from "../../domains/shared/theme/colors";

const MENU_WIDTH = 180;
const MENU_OFFSET = 6;

type AnchorLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type HeaderMenuProps = {
  anchorRef: RefObject<View | null>;
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
};

export const HeaderMenu = ({
  anchorRef,
  visible,
  onRequestClose,
  children,
}: HeaderMenuProps) => {
  const [anchorLayout, setAnchorLayout] = useState<AnchorLayout | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorLayout({ x, y, width, height });
    });
  }, [anchorRef, visible]);

  if (!visible || !anchorLayout) {
    return null;
  }

  const { width: windowWidth } = Dimensions.get("window");
  const left = Math.min(
    Math.max(anchorLayout.x + anchorLayout.width - MENU_WIDTH, 12),
    windowWidth - MENU_WIDTH - 12,
  );
  const top = anchorLayout.y + anchorLayout.height + MENU_OFFSET;

  return (
    <Modal transparent visible onRequestClose={onRequestClose}>
      <Pressable style={styles.overlay} onPress={onRequestClose}>
        <View style={[styles.menu, { left, top }]}>
          {children}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  menu: {
    position: "absolute",
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 6,
    minWidth: MENU_WIDTH,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
