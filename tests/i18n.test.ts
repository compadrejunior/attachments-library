import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInit, mockT } = vi.hoisted(() => ({
  mockInit: vi.fn().mockResolvedValue(undefined),
  mockT: vi.fn((key: string) => key),
}));

vi.mock('i18next', () => ({
  default: {
    init: mockInit,
    t: mockT,
  },
}));

// Must import after vi.mock
import { initI18n, t } from '../src/i18n/i18n';

describe('initI18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: vi.fn() },
      writable: true,
    });
  });

  it('uses the language stored in localStorage', async () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue('pt-BR');

    await initI18n();

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ lng: 'pt-BR' }),
    );
  });

  it('falls back to "en" when localStorage has no language', async () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue(null);

    await initI18n();

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ lng: 'en' }),
    );
  });

  it('configures fallbackLng as "en"', async () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue(null);

    await initI18n();

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ fallbackLng: 'en' }),
    );
  });

  it('registers en and pt-BR translation resources', async () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue(null);

    await initI18n();

    const call = mockInit.mock.calls[0][0];
    expect(call.resources).toHaveProperty('en');
    expect(call.resources).toHaveProperty('pt-BR');
    expect(call.resources.en).toHaveProperty('translation');
    expect(call.resources['pt-BR']).toHaveProperty('translation');
  });

  it('disables HTML escaping in interpolation', async () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue(null);

    await initI18n();

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        interpolation: { escapeValue: false },
      }),
    );
  });
});

describe('t', () => {
  it('delegates to i18next.t with the given key', () => {
    mockT.mockReturnValue('translated');

    const result = t('some.key');

    expect(mockT).toHaveBeenCalledWith('some.key', undefined);
    expect(result).toBe('translated');
  });

  it('passes options through to i18next.t', () => {
    mockT.mockReturnValue('Hello José');

    const result = t('greeting', { name: 'José' });

    expect(mockT).toHaveBeenCalledWith('greeting', { name: 'José' });
    expect(result).toBe('Hello José');
  });
});
