// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router';
import { act, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Analytics } from './analytics';
import { resetGoogleTagsForTests } from './google-tag';

type TestWindow = Window & { dataLayer?: unknown[] };

const pageViews = () =>
  ((window as TestWindow).dataLayer ?? [])
    .map((entry) => Array.from(entry as unknown[]))
    .filter((args) => args[0] === 'event' && args[1] === 'page_view')
    .map((args) => (args[2] as { page_location: string }).page_location);

const origin = () => window.location.origin;

const router: { navigate?: ReturnType<typeof useNavigate> } = {};
const navigate = (to: string) => router.navigate!(to);
function Capture() {
  const nav = useNavigate();
  useEffect(() => {
    router.navigate = nav;
  }, [nav]);
  return null;
}

function mount(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Analytics />
      <Capture />
    </MemoryRouter>,
  );
}

function stubConfig(response: () => Promise<Response>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchMock = vi.fn((_input: RequestInfo | URL) => response());
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('<Analytics />', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete (window as TestWindow).dataLayer;
    resetGoogleTagsForTests();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads no tag and reports nothing when the server has no measurement ID', async () => {
    const fetchMock = stubConfig(() =>
      Promise.resolve(new Response(JSON.stringify({ analytics: null }))),
    );
    mount();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/v1/config');
    await act(async () => {});
    expect(document.head.querySelectorAll('script')).toHaveLength(0);
    expect((window as TestWindow).dataLayer).toBeUndefined();
  });

  it('stays off, silently, when the config request fails', async () => {
    stubConfig(() => Promise.reject(new TypeError('offline')));
    mount();
    await act(async () => {});
    expect(document.head.querySelectorAll('script')).toHaveLength(0);
    stubConfig(() => Promise.resolve(new Response('nope', { status: 500 })));
    mount();
    await act(async () => {});
    expect(document.head.querySelectorAll('script')).toHaveLength(0);
  });

  it('reports the first page and each navigation by route template', async () => {
    stubConfig(() =>
      Promise.resolve(
        new Response(JSON.stringify({ analytics: { measurementId: 'G-TEST123456' } })),
      ),
    );
    mount('/trips/SECRET-TRIP-1');
    await waitFor(() => expect(pageViews()).toHaveLength(1));
    expect(pageViews()).toEqual([`${origin()}/trips/:tripId`]);

    await act(async () => navigate('/'));
    await act(async () => navigate('/trips/other'));
    await act(async () => navigate('/nowhere'));
    expect(pageViews()).toEqual([
      `${origin()}/trips/:tripId`,
      `${origin()}/`,
      `${origin()}/trips/:tripId`,
      `${origin()}/nowhere`,
    ]);
    expect(JSON.stringify((window as TestWindow).dataLayer)).not.toContain('SECRET-TRIP-1');
  });

  it('does not report again for a re-render on the same path', async () => {
    stubConfig(() =>
      Promise.resolve(
        new Response(JSON.stringify({ analytics: { measurementId: 'G-TEST123456' } })),
      ),
    );
    const { rerender } = mount('/');
    await waitFor(() => expect(pageViews()).toHaveLength(1));
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Analytics />
        <Capture />
      </MemoryRouter>,
    );
    await act(async () => navigate('/'));
    expect(pageViews()).toHaveLength(1);
  });
});
