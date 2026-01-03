import { useCallback, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

import { useTheme } from "../../hooks";
import type { AlphabetScrollbarProps } from "./types";

export const AlphabetScrollbar = (props: AlphabetScrollbarProps) => {
  const { colors } = useTheme();
  const ref = useRef<View | null>(null);
  const heightRef = useRef(1);
  const lastIndexValue = useSharedValue(-1);

  const handleSelect = useCallback(
    (char: string) => {
      props.onCharSelect?.(char);
    },
    [props],
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .hitSlop(props.hitSlop ?? { left: 10, right: 10 })
        .onEnd((e) => {
          "worklet";
          const data = props.data;
          const length = data?.length ?? 0;
          if (!data || length === 0) return;

          const yRel = Math.max(0, Math.min(heightRef.current, e.y));
          const itemH = heightRef.current / length;
          const idx = Math.max(
            0,
            Math.min(length - 1, Math.floor(yRel / itemH)),
          );

          const letter = data[idx];
          if (letter) {
            runOnJS(handleSelect)(letter);
          }
        }),
    [props.data, props.hitSlop, handleSelect],
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

          const yRel = Math.max(0, Math.min(heightRef.current, e.y));
          const itemH = heightRef.current / length;
          const idx = Math.max(
            0,
            Math.min(length - 1, Math.floor(yRel / itemH)),
          );

          if (idx !== lastIndexValue.value) {
            lastIndexValue.value = idx;
            const letter = data[idx];
            if (letter) {
              runOnJS(handleSelect)(letter);
            }
          }
        })
        .onFinalize(() => {
          "worklet";
          lastIndexValue.value = -1;
        }),
    [props.data, lastIndexValue, handleSelect],
  );

  const gesture = useMemo(() => Gesture.Race(tap, pan), [tap, pan]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={ref}
        style={[styles.container, props.containerStyle]}
        onLayout={(e) => {
          heightRef.current = e.nativeEvent.layout.height;
        }}
      >
        {props.data?.map((letter) => (
          <View
            key={letter}
            style={[styles.charContainer, props.charContainerStyle]}
          >
            <Text style={[styles.char, { color: colors.accent }, props.charStyle]}>
              {letter}
            </Text>
          </View>
        ))}
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
  char: {
    fontSize: 11,
    fontWeight: "600",
  },
});
