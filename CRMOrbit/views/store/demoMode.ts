import { create } from "zustand";

type DemoModeState = {
  isDemo: boolean;
  setDemoMode: (value: boolean) => void;
};

const useDemoModeStore = create<DemoModeState>((set) => ({
  isDemo: false,
  setDemoMode: (value) => set({ isDemo: value }),
}));

/** Returns true when demo mode is active (dummy data loaded, security disabled). */
export const useDemoMode = (): boolean =>
  useDemoModeStore((state) => state.isDemo);

/** Imperatively set demo mode on/off. Call from non-component contexts (e.g. event handlers). */
export const setDemoMode = (value: boolean): void =>
  useDemoModeStore.getState().setDemoMode(value);
