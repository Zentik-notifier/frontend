import { makeVar } from '@apollo/client';

/**
 * Bumped whenever the backend reports the local device is unknown ("Device not found").
 * Consumers can subscribe (via `useReactiveVar`) to force a re-registration flow.
 */
export const deviceRegistrationInvalidatedVar = makeVar<number>(0);

export function bumpDeviceRegistrationInvalidated(): void {
  deviceRegistrationInvalidatedVar(deviceRegistrationInvalidatedVar() + 1);
}
