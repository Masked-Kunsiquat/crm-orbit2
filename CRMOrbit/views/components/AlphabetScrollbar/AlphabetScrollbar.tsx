import { useCallback, useMemo, useRef, useState } from "react";
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

          const yRel = Math.max(0, Math.min(heightRef.current, e.y));
          const itemH = heightRef.current / length;
          const idx = Math.max(
            0,
            Math.min(length - 1, Math.floor(yRel / itemH)),
          );

          const letter = data[idx];
          if (letter) {
            runOnJS(handleSelect)(letter);
            runOnJS(clearActive)();
          }
        }),
    [props.data, props.hitSlop, handleSelect, clearActive],
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
          runOnJS(clearActive)();
        }),
    [props.data, lastIndexValue, handleSelect, clearActive],
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
