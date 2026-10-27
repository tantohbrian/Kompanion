import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerShortcut,
  clearShortcuts,
  handleKeyDown,
  isTypingInInput,
  matchesShortcut,
} from './registry';

describe('Shortcut Registry', () => {
  beforeEach(() => {
    clearShortcuts();
  });

  it('detects when the user is typing in form controls or contenteditable elements', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const div = document.createElement('div');
    div.contentEditable = 'true';
    const normalDiv = document.createElement('div');

    expect(isTypingInInput(input)).toBe(true);
    expect(isTypingInInput(textarea)).toBe(true);
    expect(isTypingInInput(div)).toBe(true);
    expect(isTypingInInput(normalDiv)).toBe(false);
    expect(isTypingInInput(null)).toBe(false);
  });

  it('matches single key shortcuts like Space', () => {
    const action = vi.fn();
    const shortcut = {
      id: 'play-pause',
      key: 'Space',
      description: 'Play/Pause',
      action,
    };
    registerShortcut(shortcut);

    const event = new KeyboardEvent('keydown', { key: ' ', code: 'Space' });
    const matched = handleKeyDown(event);

    expect(matched).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('matches Ctrl/Cmd modifier shortcuts (e.g., Cmd+D for duplicate)', () => {
    const action = vi.fn();
    const shortcut = {
      id: 'duplicate',
      key: 'd',
      ctrlOrCmd: true,
      description: 'Duplicate clip',
      action,
    };

    expect(
      matchesShortcut(shortcut, new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }))
    ).toBe(true);
    expect(
      matchesShortcut(shortcut, new KeyboardEvent('keydown', { key: 'd', metaKey: true }))
    ).toBe(true);
    expect(
      matchesShortcut(shortcut, new KeyboardEvent('keydown', { key: 'd' }))
    ).toBe(false);
  });

  it('ignores shortcuts when target is an input field', () => {
    const action = vi.fn();
    registerShortcut({
      id: 'split',
      key: 's',
      description: 'Split clip',
      action,
    });

    const input = document.createElement('input');
    const event = new KeyboardEvent('keydown', { key: 's' });
    Object.defineProperty(event, 'target', { value: input, writable: false });

    const matched = handleKeyDown(event);
    expect(matched).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it('unregisters shortcuts using the returned callback', () => {
    const action = vi.fn();
    const unregister = registerShortcut({
      id: 'delete-clip',
      key: 'Delete',
      description: 'Delete clip',
      action,
    });

    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    expect(handleKeyDown(event)).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);

    unregister();
    expect(handleKeyDown(event)).toBe(false);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
