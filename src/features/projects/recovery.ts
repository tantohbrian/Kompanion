/**
 * Utility for exporting and recovering raw project JSON when schema validation fails.
 * PRD Section 8 & DECISIONS.md: Corrupt project data recovery without app crash.
 */

export function formatCorruptProjectFilename(projectId?: string, timestamp: number = Date.now()): string {
  const safeId = projectId ? projectId.replace(/[^a-zA-Z0-9-_]/g, '_') : 'unknown';
  return `kompanion-recovery-${safeId}-${timestamp}.json`;
}

export function downloadCorruptProjectJson(
  rawData: unknown,
  projectId?: string
): { success: boolean; filename: string; json: string } {
  const filename = formatCorruptProjectFilename(projectId);
  const json = JSON.stringify(rawData, null, 2);

  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true, filename, json };
    } catch (err) {
      console.error('Failed to initiate raw JSON download:', err);
      return { success: false, filename, json };
    }
  }

  return { success: true, filename, json };
}
