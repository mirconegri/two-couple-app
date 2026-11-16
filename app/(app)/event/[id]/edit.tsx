import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { EventEditor } from '../../../../src/components/EventEditor';
import { LoadingScreen } from '../../../../src/components/LoadingScreen';
import { Screen } from '../../../../src/components/Screen';
import { EmptyState } from '../../../../src/components/EmptyState';
import { TopAppBar } from '../../../../src/components/TopAppBar';
import { getEvent } from '../../../../src/db/events';
import type { CalendarEvent } from '../../../../src/types';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!id) {
      setLoading(false);
      return;
    }

    void getEvent(db, id).then((found) => {
      if (!active) return;
      setEvent(found);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [db, id]);

  if (loading) return <LoadingScreen message="Opening event" />;

  if (!event) {
    return (
      <>
        <TopAppBar title="Edit event" onBack={() => router.back()} />
        <Screen>
          <EmptyState
            icon="cloud-offline-outline"
            title="Event not found"
            description="It may have been deleted on the other phone."
          />
        </Screen>
      </>
    );
  }

  return <EventEditor initialEvent={event} />;
}
