import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { EventEditor } from '../../../src/components/EventEditor';

export default function NewEventScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  return <EventEditor defaultDate={params.date} />;
}
