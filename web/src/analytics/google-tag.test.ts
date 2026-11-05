// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadGoogleTag, resetGoogleTagsForTests, routeTemplate } from './google-tag';

type TestWindow = Window & { dataLayer?: unknown[] };

describe('routeTemplate', () => {
  it.each([
    ['/', '/'],
    ['/trips/abc', '/trips/:tripId'],
    ['/trips/a.b%20c', '/trips/:tripId'],
    ['/trips/abc/', '/trips/:tripId'],
    ['/nope/here', '/nope/here'],
    ['/trips', '/trips'],
  ])('%s -> %s', (pathname, expected) => {
    expect(routeTemplate(pathname)).toBe(expected);
  });
});

describe('loadGoogleTag', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete (window as TestWindow).dataLayer;
    resetGoogleTagsForTests();
  });
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('adds the gtag script once and configures it without automatic page views', () => {
    const tag = loadGoogleTag('G-TEST123456');
    expect(tag).not.toBeNull();
    expect(loadGoogleTag('G-TEST123456')).toBe(tag);
    const scripts = document.head.querySelectorAll('script');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]!.src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST123456');
    expect(scripts[0]!.async).toBe(true);

    const layer = (window as TestWindow).dataLayer!.map((entry) => Array.from(entry as unknown[]));
    expect(layer[0]![0]).toBe('js');
    expect(layer[1]).toEqual([
      'config',
      'G-TEST123456',
      {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      },
    ]);
  });

  it('reports page views with the route template and no query, fragment or trip ID', () => {
    const tag = loadGoogleTag('G-TEST123456')!;
    tag.pageView('/trips/SECRET-TRIP-1', 'GTFS-RT Debugger');
    const events = (window as TestWindow)
      .dataLayer!.map((entry) => Array.from(entry as unknown[]))
      .filter(([name]) => name === 'event');
    expect(events).toEqual([
      [
        'event',
        'page_view',
        {
          page_location: `${window.location.origin}/trips/:tripId`,
          page_title: 'GTFS-RT Debugger',
        },
      ],
    ]);
    expect(JSON.stringify((window as TestWindow).dataLayer)).not.toContain('SECRET-TRIP-1');
  });

  it.each(['', 'UA-1-1', 'g-lower', 'G-A"></script>'])('refuses the ID %j', (id) => {
    expect(loadGoogleTag(id)).toBeNull();
    expect(document.head.querySelectorAll('script')).toHaveLength(0);
  });
});
