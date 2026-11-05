import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { getConfig } from '@/api/client';
import { loadGoogleTag, type GoogleTag } from './google-tag';

/**
 * Renders nothing. On page load it asks the server for the analytics measurement ID and, when
 * there is one, loads the Google tag and reports a page view for the current route and for every
 * later navigation ([analytics](../../../specs/behaviors/analytics.md)). Any failure leaves
 * analytics off for this page load and is not shown. Must sit inside the router.
 */
export function Analytics() {
  const { pathname } = useLocation();
  const [tag, setTag] = useState<GoogleTag | null>(null);
  const lastReported = useRef<{ tag: GoogleTag; pathname: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getConfig(controller.signal).then(
      (config) => {
        if (controller.signal.aborted || !config.analytics) return;
        setTag(loadGoogleTag(config.analytics.measurementId));
      },
      () => {},
    );
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!tag) return;
    const last = lastReported.current;
    if (last?.tag === tag && last.pathname === pathname) return;
    lastReported.current = { tag, pathname };
    tag.pageView(pathname, document.title);
  }, [tag, pathname]);

  return null;
}
