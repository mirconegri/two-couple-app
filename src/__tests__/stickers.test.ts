import {
  isStickerMessage,
  parseStickerMessage,
  encodeStickerMessage,
  addRecentSticker,
  toggleFavoriteSticker,
  addCustomSticker,
  updateStickerStoragePath,
  loadCustomStickers,
  base64ToArrayBuffer,
  type Sticker,
} from '../theme/stickers';

describe('stickers module', () => {
  it('correctly detects sticker messages', () => {
    expect(isStickerMessage('[sticker:😘]')).toBe(true);
    expect(isStickerMessage('[sticker_img:file:///path/to/img.png]')).toBe(true);
    expect(isStickerMessage('[sticker_storage:couple_1/abc.webp]')).toBe(true);
    expect(isStickerMessage('[sticker:unclosed')).toBe(false);
    expect(isStickerMessage('Hello there')).toBe(false);
    expect(isStickerMessage('')).toBe(false);
  });

  it('correctly encodes and parses emoji stickers', () => {
    const sticker: Sticker = {
      id: 'love_kiss',
      packId: 'love',
      label: 'Bacio',
      emoji: '😘',
    };
    const encoded = encodeStickerMessage(sticker);
    expect(encoded).toBe('[sticker:😘]');

    const parsed = parseStickerMessage(encoded);
    expect(parsed).toEqual({ type: 'emoji', value: '😘' });
  });

  it('correctly encodes and parses custom image stickers', () => {
    const sticker: Sticker = {
      id: 'custom_123',
      packId: 'custom',
      label: 'Custom sticker',
      imageUri: 'file:///data/user/0/img.png',
    };
    const encoded = encodeStickerMessage(sticker);
    expect(encoded).toBe('[sticker_img:file:///data/user/0/img.png]');

    const parsed = parseStickerMessage(encoded);
    expect(parsed).toEqual({ type: 'image', value: 'file:///data/user/0/img.png' });
  });

  it('prefers storagePath when encoding synced custom stickers', () => {
    const sticker: Sticker = {
      id: 'custom_456',
      packId: 'custom',
      label: 'Synced sticker',
      imageUri: 'file:///data/user/0/local.png',
      storagePath: 'couple-uuid/sticker-uuid.png',
    };
    const encoded = encodeStickerMessage(sticker);
    expect(encoded).toBe('[sticker_storage:couple-uuid/sticker-uuid.png]');

    const parsed = parseStickerMessage(encoded);
    expect(parsed).toEqual({ type: 'storage', value: 'couple-uuid/sticker-uuid.png' });
  });

  it('backfills storagePath across saved lists', async () => {
    const added = await addCustomSticker('file:///local.png', 'Test');
    await addRecentSticker(added);
    await toggleFavoriteSticker(added);

    await updateStickerStoragePath(added.id, 'c1/s1.png');

    const customs = await loadCustomStickers();
    expect(customs.find((s) => s.id === added.id)?.storagePath).toBe('c1/s1.png');
  });

  it('decodes base64 payloads into ArrayBuffer cleanly', () => {
    const bytes = new Uint8Array(base64ToArrayBuffer('SGVsbG8='));
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);

    const dataUriBytes = new Uint8Array(base64ToArrayBuffer('data:image/png;base64,AQI='));
    expect(Array.from(dataUriBytes)).toEqual([1, 2]);
  });

  it('caps recents at 20 items and prioritizes latest', async () => {
    let recents: Sticker[] = [];
    for (let i = 1; i <= 25; i++) {
      recents = await addRecentSticker({
        id: `s_${i}`,
        packId: 'love',
        label: `Sticker ${i}`,
        emoji: '❤️',
      });
    }
    expect(recents.length).toBe(20);
    expect(recents[0]?.id).toBe('s_25');
  });

  it('toggles favorites correctly', async () => {
    const s: Sticker = { id: 'fav_1', packId: 'love', label: 'Fav', emoji: '🌟' };
    let favs = await toggleFavoriteSticker(s);
    expect(favs.some((f) => f.id === 'fav_1')).toBe(true);

    favs = await toggleFavoriteSticker(s);
    expect(favs.some((f) => f.id === 'fav_1')).toBe(false);
  });
});
