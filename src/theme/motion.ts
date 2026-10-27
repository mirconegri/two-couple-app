import { Easing } from 'react-native-reanimated';

export const duration = {
  fast: 150,
  base: 250,
  screen: 350,
  sheet: 400,
} as const;

export const easing = {
  standard: Easing.bezier(0.32, 0.72, 0, 1),
  accelerate: Easing.bezier(0.4, 0, 1, 1),
} as const;

export const spring = {
  press: { damping: 20, stiffness: 500, mass: 0.7 },
  layout: { damping: 24, stiffness: 260 },
  sheet: { damping: 22, stiffness: 220, mass: 1 },
  pop: { damping: 12, stiffness: 320 },
} as const;

export const motion = {
  duration,
  easing,
  spring,
} as const;
