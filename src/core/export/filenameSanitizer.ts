/**
 * Sanitizes project name and returns a valid filesystem filename:
 * `{project}-{YYYY-MM-DD}.mp4`
 * Strips invalid filesystem characters (< > : " / \ | ? * and control chars).
 */
export function sanitizeExportFilename(projectName: string, date = new Date()): string {
  // Strip control characters (< 32 or 127) and illegal filesystem characters across OSes (< > : " / \ | ? *)
  const sanitized = Array.from(projectName)
    .filter((char) => {
      const code = char.charCodeAt(0);
      if (code < 32 || code === 127) return false;
      return !'<>/\\|?*":'.includes(char);
    })
    .join('')
    .trim()
    .replace(/[. ]+$/, ''); // Remove trailing dots or spaces

  const baseName = sanitized.length > 0 ? sanitized : 'project';

  // Format YYYY-MM-DD
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  return `${baseName}-${dateStr}.mp4`;
}
