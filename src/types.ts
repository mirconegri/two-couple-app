export type SyncStatus = 'pending' | 'sent' | 'failed';

export type EventVisibility = 'shared' | 'private';

export interface Message {
  id: string;
  coupleId: string;
  senderId: string;
  body: string;
  clientCreatedAt: string;
  serverCreatedAt: string | null;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  failureReason: string | null;
}

export interface CalendarEvent {
  id: string;
  coupleId: string;
  createdBy: string;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  startsOn: string | null;
  endsOn: string | null;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  visibility: EventVisibility;
  category: string | null;
  color: string | null;
  reminderMinutes: number[];
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface Member {
  userId: string;
  email: string | null;
  displayName: string | null;
  coupleId: string;
  joinedAt: string;
}

export interface EventDraft {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  startsOn: string | null;
  endsOn: string | null;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  visibility: EventVisibility;
  category: string | null;
  color: string | null;
  reminderMinutes: number[];
}

export type NoteKind = 'text' | 'checklist';

export interface NoteChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Note {
  id: string;
  coupleId: string;
  createdBy: string;
  title: string;
  kind: NoteKind;
  body: string | null;
  checklist: NoteChecklistItem[] | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}
