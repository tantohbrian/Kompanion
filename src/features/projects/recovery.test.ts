import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadCorruptProjectJson, formatCorruptProjectFilename } from './recovery';

describe('Corrupt Project Recovery Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats filename with project ID and timestamp', () => {
    const filename = formatCorruptProjectFilename('project-123', 1700000000000);
    expect(filename).toBe('kompanion-recovery-project-123-1700000000000.json');
  });

  it('sanitizes unsafe characters in project ID for filename', () => {
    const filename = formatCorruptProjectFilename('proj/bad:id#99', 1700000000000);
    expect(filename).toBe('kompanion-recovery-proj_bad_id_99-1700000000000.json');
  });

  it('exports valid formatted JSON without throwing', () => {
    const corruptPayload = {
      id: 'corrupt-1',
      schemaVersion: 1,
      brokenField: { invalid: true },
    };

    // Mock document.createElement and URL methods for JSDOM
    const clickMock = vi.fn();
    const appendChildMock = vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.createElement('div'));
    const removeChildMock = vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.createElement('div'));

    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    const createElementMock = vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickMock,
      href: '',
      download: '',
    } as unknown as HTMLElement);

    const result = downloadCorruptProjectJson(corruptPayload, 'corrupt-1');

    expect(result.success).toBe(true);
    expect(result.filename).toContain('kompanion-recovery-corrupt-1');
    expect(JSON.parse(result.json)).toEqual(corruptPayload);
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');

    createElementMock.mockRestore();
    appendChildMock.mockRestore();
    removeChildMock.mockRestore();
  });
});
