import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

import { useTheme } from "../../hooks";
import type { AlphabetScrollbarProps } from "./types";

export const AlphabetScrollbar = (props: AlphabetScrollbarProps) => {
  const { colors } = useTheme();
  const containerHeight = useSharedValue(1);
  const lastIndex = useSharedValue(-1);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const handleSelect = useCallback(
    (char: string) => {
      props.onCharSelect?.(char);
      setActiveLetter(char);
    },
    [props],
  );

  const clearActive = useCallback(() => {
    setActiveLetter(null);
  }, []);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .hitSlop(props.hitSlop ?? { left: 10, right: 10 })
        .onEnd((e) => {
          "worklet";
          const data = props.data;
          const length = data?.length ?? 0;
          if (!data || length === 0) return;

          const yRel = Math.max(0, Math.min(containerHeight.value, e.y));
          const itemH = containerHeight.value / length;
          const idx = Math.max(
            0,
            Math.min(length - 1, Math.floor(yRel / itemH)),
          );

          const letter = data[idx];
          if (letter) {
            runOnJS(handleSelect)(letter);
          }
        }),
    [props.data, props.hitSlop, containerHeight, handleSelect],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(4)
        .onChange((e) => {
          "worklet";
          const data = props.data;
          const length = data?.length ?? 0;
          if (!data || length === 0) return;

          const yRel = Math.max(0, Math.min(containerHeight.value, e.y));
          const itemH = containerHeight.value / length;
          const idx = Math.max(
            0,
            Math.min(length - 1, Math.floor(yRel / itemH)),
          );

          if (idx !== lastIndex.value) {
            lastIndex.value = idx;
            const letter = data[idx];
            if (letter) {
              runOnJS(handleSelect)(letter);
            }
          }
        })
        .onFinalize(() => {
          "worklet";
          lastIndex.value = -1;
          runOnJS(clearActive)();
        }),
    [props.data, containerHeight, lastIndex, handleSelect, clearActive],
  );

  const gesture = useMemo(() => Gesture.Race(tap, pan), [tap, pan]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.container, props.containerStyle]}
        onLayout={(e) => {
          containerHeight.value = e.nativeEvent.layout.height;
        }}
      >
        {props.data?.map((letter) => {
          const isActive = letter === activeLetter;
          return (
            <View
              key={letter}
              style={[
                styles.charContainer,
                isActive && styles.charContainerActive,
                isActive && { backgroundColor: colors.accent },
                props.charContainerStyle,
              ]}
            >
              <Text
                style={[
                  styles.char,
                  { color: isActive ? colors.onAccent : colors.accent },
                  props.charStyle,
                ]}
              >
                {letter}
              </Text>
            </View>
          );
        })}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  charContainer: {
    paddingVertical: 1,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  charContainerActive: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    transform: [{ scale: 1.2 }],
  },
  char: {
    fontSize: 11,
    fontWeight: "600",
  },
});
