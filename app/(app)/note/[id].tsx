import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { NoteEditor } from '../../../src/components/NoteEditor';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/EmptyState';
import { TopAppBar } from '../../../src/components/TopAppBar';
import { getNote } from '../../../src/db/notes';
import type { Note } from '../../../src/types';

export default function EditNoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!id) {
      setLoading(false);
      return;
    }
    void getNote(db, id).then((found) => {
      if (!active) return;
      setNote(found);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [db, id]);

  if (loading) return <LoadingScreen message="Opening note" />;

  if (!note) {
    return (
      <>
        <TopAppBar title="Note" onBack={() => router.back()} />
        <Screen>
          <EmptyState
            icon="document-text-outline"
            title="Note not found"
            description="It may have been deleted on the other phone."
          />
        </Screen>
      </>
    );
  }

  return <NoteEditor initialNote={note} />;
}
