import { supabase } from '../lib/supabase';
import type { CalendarEvent, EventVisibility, Member, Message, Note, NoteChecklistItem, NoteKind } from '../types';
import type { PushEventPayload } from '../db/events';
import type { PushNotePayload } from '../db/notes';

/**
 * The network boundary of the sync engine.
 * Everything above this line is testable without a network.
 */
export interface RemotePort {
  pushMessage(input: {
    id: string;
    body: string;
    clientCreatedAt: string;
  }): Promise<{ serverCreatedAt: string | null }>;

  pushEvent(input: PushEventPayload & { deletedAt: string | null }): Promise<void>;
  pushNote(input: PushNotePayload): Promise<void>;

  fetchMessagesSince(coupleId: string, since: string | null): Promise<Message[]>;
  fetchEventsSince(coupleId: string, since: string | null): Promise<CalendarEvent[]>;
  fetchNotesSince(coupleId: string, since: string | null): Promise<Note[]>;
  fetchMembers(coupleId: string): Promise<Member[]>;
  markMessagesDelivered(until?: string): Promise<void>;
  markMessagesRead(until?: string): Promise<void>;
}

interface MessageDto {
  id: string;
  couple_id: string;
  sender_id: string;
  body: string;
  client_created_at: string;
  server_created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  updated_at: string;
  deleted_at: string | null;
}

interface EventDto {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  description: string | null;
  location: string | null;
  all_day: boolean;
  starts_on: string | null;
  ends_on: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  visibility: string;
  category: string | null;
  color: string | null;
  reminder_minutes: number[] | null;
  updated_at: string;
  deleted_at: string | null;
}

export function mapMessageDto(dto: MessageDto): Message {
  return {
    id: dto.id,
    coupleId: dto.couple_id,
    senderId: dto.sender_id,
    body: dto.body,
    clientCreatedAt: dto.client_created_at,
    serverCreatedAt: dto.server_created_at,
    deliveredAt: dto.delivered_at ?? null,
    readAt: dto.read_at ?? null,
    updatedAt: dto.updated_at,
    deletedAt: dto.deleted_at,
    syncStatus: 'sent',
    failureReason: null,
  };
}

export function mapEventDto(dto: EventDto): CalendarEvent {
  return {
    id: dto.id,
    coupleId: dto.couple_id,
    createdBy: dto.created_by,
    title: dto.title,
    description: dto.description,
    location: dto.location,
    allDay: dto.all_day,
    startsOn: dto.starts_on,
    endsOn: dto.ends_on,
    startsAt: dto.starts_at,
    endsAt: dto.ends_at,
    timezone: dto.timezone,
    visibility: dto.visibility as EventVisibility,
    category: dto.category,
    color: dto.color,
    reminderMinutes: dto.reminder_minutes ?? [],
    updatedAt: dto.updated_at,
    deletedAt: dto.deleted_at,
    syncStatus: 'sent',
  };
}

interface NoteDto {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  kind: string;
  body: string | null;
  checklist: unknown;
  color: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function mapNoteDto(dto: NoteDto): Note {
  return {
    id: dto.id,
    coupleId: dto.couple_id,
    createdBy: dto.created_by,
    title: dto.title,
    kind: dto.kind as NoteKind,
    body: dto.body,
    checklist: Array.isArray(dto.checklist) ? (dto.checklist as NoteChecklistItem[]) : null,
    color: dto.color,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    deletedAt: dto.deleted_at,
    syncStatus: 'sent',
  };
}

const PAGE_SIZE = 200;

export const supabaseRemote: RemotePort = {
  async pushMessage(input) {
    const { data, error } = await supabase.rpc('push_message', {
      p_id: input.id,
      p_body: input.body,
      p_client_created_at: input.clientCreatedAt,
    });

    if (error) throw new Error(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    return { serverCreatedAt: (row?.server_created_at as string | undefined) ?? null };
  },

  async pushEvent(input) {
    const { error } = await supabase.rpc('push_event', {
      p_id: input.id,
      p_title: input.title,
      p_description: input.description,
      p_location: input.location,
      p_all_day: input.allDay,
      p_starts_on: input.startsOn,
      p_ends_on: input.endsOn,
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
      p_timezone: input.timezone,
      p_visibility: input.visibility,
      p_category: input.category,
      p_color: input.color,
      p_reminder_minutes: input.reminderMinutes,
      p_deleted_at: input.deletedAt,
    });

    if (error) throw new Error(error.message);
  },

  async pushNote(input) {
    const { error } = await supabase.rpc('push_note', {
      p_id: input.id,
      p_title: input.title,
      p_kind: input.kind,
      p_body: input.body,
      p_checklist: input.checklist,
      p_color: input.color,
      p_deleted_at: input.deletedAt,
    });

    if (error) throw new Error(error.message);
  },

  async fetchMessagesSince(coupleId, since) {
    let query = supabase
      .from('messages')
      .select(
        'id, couple_id, sender_id, body, client_created_at, server_created_at, delivered_at, read_at, updated_at, deleted_at',
      )
      .eq('couple_id', coupleId)
      .order('updated_at', { ascending: true })
      .limit(PAGE_SIZE);

    if (since) query = query.gt('updated_at', since);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as MessageDto[];
    return rows.map(mapMessageDto);
  },

  async fetchEventsSince(coupleId, since) {
    let query = supabase
      .from('events')
      .select(
        'id, couple_id, created_by, title, description, location, all_day, ' +
          'starts_on, ends_on, starts_at, ends_at, timezone, visibility, ' +
          'category, color, reminder_minutes, updated_at, deleted_at',
      )
      .eq('couple_id', coupleId)
      .order('updated_at', { ascending: true })
      .limit(PAGE_SIZE);

    if (since) query = query.gt('updated_at', since);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as EventDto[];
    return rows.map(mapEventDto);
  },

  async fetchNotesSince(coupleId, since) {
    let query = supabase
      .from('notes')
      .select(
        'id, couple_id, created_by, title, kind, body, checklist, color, created_at, updated_at, deleted_at',
      )
      .eq('couple_id', coupleId)
      .order('updated_at', { ascending: true })
      .limit(PAGE_SIZE);

    if (since) query = query.gt('updated_at', since);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as NoteDto[];
    return rows.map(mapNoteDto);
  },

  async fetchMembers(coupleId) {
    const { data, error } = await supabase
      .from('couple_members')
      .select('user_id, couple_id, joined_at')
      .eq('couple_id', coupleId);

    if (error) throw new Error(error.message);

    const profileMap = new Map<string, string | null>();
    try {
      const { data: profiles } = await supabase.rpc('get_couple_profiles');
      if (Array.isArray(profiles)) {
        for (const p of profiles as Array<{ user_id: string; display_name: string | null }>) {
          profileMap.set(p.user_id, p.display_name);
        }
      }
    } catch {
      // Best effort profile fetch
    }

    const rows = (data ?? []) as unknown as {
      user_id: string;
      couple_id: string;
      joined_at: string;
    }[];

    return rows.map((row) => ({
      userId: row.user_id,
      email: null,
      displayName: profileMap.get(row.user_id) ?? null,
      coupleId: row.couple_id,
      joinedAt: row.joined_at,
    }));
  },

  async markMessagesDelivered(until) {
    try {
      await supabase.rpc('mark_messages_delivered', {
        p_until: until ?? new Date().toISOString(),
      });
    } catch {
      // Best effort
    }
  },

  async markMessagesRead(until) {
    try {
      await supabase.rpc('mark_messages_read', {
        p_until: until ?? new Date().toISOString(),
      });
    } catch {
      // Best effort
    }
  },
};
