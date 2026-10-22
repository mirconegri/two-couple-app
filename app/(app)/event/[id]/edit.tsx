import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Text, View } from 'react-native';

import { EventEditor } from '../../../../src/components/EventEditor';
import { LoadingScreen } from '../../../../src/components/LoadingScreen';
import { Screen } from '../../../../src/components/Screen';
import { Button } from '../../../../src/components/Button';
import { getEvent } from '../../../../src/db/events';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import type { CalendarEvent } from '../../../../src/types';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { colors, spacing, typography } = useTheme();

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

  if (loading) return <LoadingScreen label="Loading event" />;

  if (!event) {
    return (
      <Screen>
        <View style={{ paddingTop: spacing.xxl }}>
          <Text style={[typography.heading, { color: colors.text }]}>
            Event not found
          </Text>
          <Button
            label="Back"
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </Screen>
    );
  }

  return <EventEditor initialEvent={event} />;
}
