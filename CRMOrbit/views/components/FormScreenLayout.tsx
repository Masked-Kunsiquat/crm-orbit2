import { useCallback, useMemo, useRef, type ReactNode } from "react";
import {
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../hooks";
import { FormScrollProvider } from "./FormScrollContext";

type FormScreenLayoutProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export const FormScreenLayout = ({
  children,
  contentStyle,
}: FormScreenLayoutProps) => {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const scrollToInput = useCallback((inputNode: number) => {
    const scrollNode = scrollRef.current
      ? findNodeHandle(scrollRef.current)
      : null;
    if (!scrollNode) return;
    const schedule =
      globalThis.requestAnimationFrame ??
      ((cb: () => void) => globalThis.setTimeout(cb, 0));
    schedule(() => {
      UIManager.measureLayout(
        inputNode,
        scrollNode,
        () => {},
        (_x, y) => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, y - 24),
            animated: true,
          });
        },
      );
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      scrollToInput,
    }),
    [scrollToInput],
  );

  return (
    <FormScrollProvider value={contextValue}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.canvas }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.form, contentStyle]}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </FormScrollProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
