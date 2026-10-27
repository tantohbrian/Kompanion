export interface ShortcutDefinition {
  id: string;
  key: string; // e.g. ' ', 'ArrowLeft', 'ArrowRight', 's', 'Delete', 'Backspace', 'd', 'z', 'y', '+', '=', '-', '0', 'Home', 'End'
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: (e: KeyboardEvent) => void;
  scope?: string;
  enabled?: boolean | (() => boolean);
}
