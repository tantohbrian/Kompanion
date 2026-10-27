import { ShortcutDefinition } from './types';

const shortcutsMap = new Map<string, ShortcutDefinition>();

export function isTypingInInput(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return true;
  }
  if (
    target.isContentEditable ||
    target.contentEditable === 'true' ||
    target.getAttribute('contenteditable') === 'true' ||
    target.getAttribute('contenteditable') === ''
  ) {
    return true;
  }
  return false;
}

export function registerShortcut(shortcut: ShortcutDefinition): () => void {
  shortcutsMap.set(shortcut.id, shortcut);
  return () => {
    shortcutsMap.delete(shortcut.id);
  };
}

export function unregisterShortcut(id: string): void {
  shortcutsMap.delete(id);
}

export function clearShortcuts(): void {
  shortcutsMap.clear();
}

export function getRegisteredShortcuts(): ShortcutDefinition[] {
  return Array.from(shortcutsMap.values());
}

export function matchesShortcut(def: ShortcutDefinition, e: KeyboardEvent): boolean {
  if (def.enabled !== undefined) {
    const isEnabled = typeof def.enabled === 'function' ? def.enabled() : def.enabled;
    if (!isEnabled) return false;
  }

  const isCtrlOrCmd = e.metaKey || e.ctrlKey;
  if (Boolean(def.ctrlOrCmd) !== isCtrlOrCmd) return false;
  if (Boolean(def.shift) !== e.shiftKey) return false;
  if (Boolean(def.alt) !== e.altKey) return false;

  const eventKey = e.key.toLowerCase();
  const defKey = def.key.toLowerCase();

  if (defKey === ' ' || defKey === 'space') {
    return e.key === ' ' || e.code === 'Space';
  }

  // Handle = and + for zoom in
  if (defKey === '+' && (eventKey === '+' || eventKey === '=')) {
    return true;
  }

  return eventKey === defKey;
}

export function handleKeyDown(e: KeyboardEvent): boolean {
  if (isTypingInInput(e.target)) {
    return false;
  }

  for (const shortcut of shortcutsMap.values()) {
    if (matchesShortcut(shortcut, e)) {
      e.preventDefault();
      shortcut.action(e);
      return true;
    }
  }

  return false;
}
