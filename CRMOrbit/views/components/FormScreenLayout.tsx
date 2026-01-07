import { useCallback, useMemo, useRef, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeMethods,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { TextInput } from "react-native";

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
  const contentRef = useRef<View>(null);

  const scrollToInput = useCallback((inputRef: TextInput | null) => {
    if (!scrollRef.current || !contentRef.current || !inputRef) return;
    const schedule =
      globalThis.requestAnimationFrame ??
      ((cb: () => void) => globalThis.setTimeout(cb, 0));
    schedule(() => {
      const relativeTo = contentRef.current as unknown as
        | number
        | NativeMethods;
      inputRef.measureLayout(
        relativeTo,
        (_x, y) => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, y - 24),
            animated: true,
          });
        },
        () => {},
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
          <View ref={contentRef} style={[styles.form, contentStyle]}>
            {children}
          </View>
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
