import { useState, useRef, cloneElement, isValidElement } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  type ViewStyle,
} from "react-native";

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  containerStyle?: ViewStyle;
}

export const Tooltip = ({ content, children, containerStyle }: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const anchorRef = useRef<View>(null);

  const showTooltip = () => {
    anchorRef.current?.measureInWindow((pageX, pageY, width, height) => {
      setPosition({ x: pageX, y: pageY, width, height });
      setVisible(true);
    });
  };

  const hideTooltip = () => {
    setVisible(false);
  };

  // Clone the child element and add onLongPress to it
  const childWithLongPress = isValidElement(children)
    ? cloneElement(children, {
        onLongPress: showTooltip,
      } as any)
    : children;

  return (
    <>
      <View ref={anchorRef} collapsable={false} style={containerStyle}>
        {childWithLongPress}
      </View>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={hideTooltip}>
        <TouchableWithoutFeedback onPress={hideTooltip}>
          <View style={styles.overlay}>
            <View
              style={[
                styles.tooltip,
                {
                  top: position.y,
                  left: position.x + position.width + 10,
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
