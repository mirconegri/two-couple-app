import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { NoteEditor } from '../../../src/components/NoteEditor';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
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

  if (loading) return <LoadingScreen />;
  return <NoteEditor initialNote={note} />;
}
