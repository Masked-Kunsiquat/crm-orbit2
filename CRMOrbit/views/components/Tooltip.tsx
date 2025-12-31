import { useState, useRef } from "react";
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  type ViewStyle,
  type TextStyle,
} from "react-native";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Tooltip = ({ content, children, containerStyle }: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const anchorRef = useRef<View>(null);

  const showTooltip = () => {
    anchorRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setPosition({ x: pageX, y: pageY, width, height });
      setVisible(true);
    });
  };

  const hideTooltip = () => {
    setVisible(false);
  };

  return (
    <>
      <View ref={anchorRef} collapsable={false} style={containerStyle}>
        <Pressable onLongPress={showTooltip}>{children}</Pressable>
      </View>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={hideTooltip}>
        <TouchableWithoutFeedback onPress={hideTooltip}>
          <View style={styles.overlay}>
            <View
              style={[
                styles.tooltip,
                {
                  top: position.y + position.height + 5,
                  left: Math.max(10, position.x - 50),
                },
              ]}
            >
              <Text style={styles.tooltipText}>{content}</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipText: {
    color: "#fff",
    fontSize: 13,
  },
});
