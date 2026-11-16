import { useMemo } from 'react';
import * as Haptics from 'expo-haptics';

import { useSettings } from '../settings/SettingsProvider';

export interface HapticsApi {
  selection: () => void;
  light: () => void;
  toggleOn: () => void;
  toggleOff: () => void;
  confirm: () => void;
  reject: () => void;
  longPress: () => void;
  gestureStart: () => void;
  gestureEnd: () => void;
  tick: () => void;
}

/** Haptic role names, so a component can ask for one by name. */
export type SimpleHaptic = keyof HapticsApi;

/** Material 3 feedback roles mapped onto Android's predefined haptic effects. */
export function useHaptics(): HapticsApi {
  const { settings } = useSettings();

  return useMemo<HapticsApi>(() => {
    const run = (effect: Haptics.AndroidHaptics) => {
      if (!settings.haptics) return;
      void Haptics.performAndroidHapticsAsync(effect).catch(() => {});
    };

    return {
      selection: () => run(Haptics.AndroidHaptics.Context_Click),
      light: () => run(Haptics.AndroidHaptics.Virtual_Key),
      toggleOn: () => run(Haptics.AndroidHaptics.Toggle_On),
      toggleOff: () => run(Haptics.AndroidHaptics.Toggle_Off),
      confirm: () => run(Haptics.AndroidHaptics.Confirm),
      reject: () => run(Haptics.AndroidHaptics.Reject),
      longPress: () => run(Haptics.AndroidHaptics.Long_Press),
      gestureStart: () => run(Haptics.AndroidHaptics.Gesture_Start),
      gestureEnd: () => run(Haptics.AndroidHaptics.Gesture_End),
      tick: () => run(Haptics.AndroidHaptics.Segment_Tick),
    };
  }, [settings.haptics]);
}
