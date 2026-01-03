import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

import { useTheme } from "../../hooks";
import type { AlphabetScrollbarProps } from "./types";

export const AlphabetScrollbar = (props: AlphabetScrollbarProps) => {
  const { colors } = useTheme();
  const ref = useRef<View | null>(null);
  const height = useRef(1);
  const lastIndex = useSharedValue(-1);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const handleIndexChange = useCallback(
    (idx: number) => {
      const data = props.data;
      if (!data || idx < 0 || idx >= data.length) return;
      const letter = data[idx]!;
      props.onCharSelect?.(letter);
      setActiveLetter(letter);
    },
    [props],
  );

  const handleGestureEnd = useCallback(() => {
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

          const yRel = Math.max(0, Math.min(height.current, e.y));
          const itemH = height.current / length;
          const idx = Math.max(
            0,
            Math.min(length - 1, Math.floor(yRel / itemH)),
          );

          runOnJS(handleIndexChange)(idx);
          runOnJS(handleGestureEnd)();
        }),
    [props.data, handleIndexChange, handleGestureEnd, props.hitSlop],
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

          const yRel = Math.max(0, Math.min(height.current, e.y));
          const itemH = height.current / length;
          const idx = Math.max(
            0,
            Math.min(length - 1, Math.floor(yRel / itemH)),
          );

          if (idx !== lastIndex.value) {
            lastIndex.value = idx;
            runOnJS(handleIndexChange)(idx);
          }
        })
        .onFinalize(() => {
          "worklet";
          lastIndex.value = -1;
          runOnJS(handleGestureEnd)();
        }),
    [props.data, lastIndex, handleIndexChange, handleGestureEnd],
  );

  const gesture = useMemo(() => Gesture.Race(tap, pan), [tap, pan]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={ref}
        style={[styles.container, props.containerStyle]}
        onLayout={(e) => {
          height.current = e.nativeEvent.layout.height;
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
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  char: {
    fontSize: 11,
    fontWeight: "600",
  },
});
