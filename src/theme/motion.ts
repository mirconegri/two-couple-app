import { Easing, type WithSpringConfig } from 'react-native-reanimated';

/**
 * Material 3 Expressive motion physics.
 *
 * Reanimated takes a damping coefficient rather than the damping ratio the
 * spec publishes, so each token is converted once here. The effects springs
 * are critically damped: alpha and color must never overshoot.
 */
function damping(ratio: number, stiffness: number): number {
  return ratio * 2 * Math.sqrt(stiffness);
}

export const spring = {
  spatialFast: { damping: damping(0.6, 800), stiffness: 800, mass: 1 },
  spatialDefault: { damping: damping(0.8, 380), stiffness: 380, mass: 1 },
  spatialSlow: { damping: damping(0.8, 200), stiffness: 200, mass: 1 },
  effectsFast: { damping: damping(1, 3800), stiffness: 3800, mass: 1 },
  effectsDefault: { damping: damping(1, 1600), stiffness: 1600, mass: 1 },
  effectsSlow: { damping: damping(1, 800), stiffness: 800, mass: 1 },
} as const satisfies Record<string, WithSpringConfig>;

/** Press feedback: quick and slightly springy, never bouncy enough to distract. */
export const pressSpring = { damping: damping(0.75, 900), stiffness: 900, mass: 1 } as const;

/** Legacy Material 3 easing curves, kept for non-physics transitions. */
export const easing = {
  emphasized: Easing.bezier(0.2, 0, 0, 1),
  emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
  emphasizedAccelerate: Easing.bezier(0.3, 0, 0.8, 0.15),
  standard: Easing.bezier(0.2, 0, 0, 1),
  standardDecelerate: Easing.bezier(0, 0, 0, 1),
  standardAccelerate: Easing.bezier(0.3, 0, 1, 1),
} as const;

export const duration = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
  long1: 450,
  long2: 500,
} as const;
