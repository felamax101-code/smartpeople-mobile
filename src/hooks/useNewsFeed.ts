// ─────────────────────────────────────────────────────────────────────────────
// useNewsFeed.ts — Feed state: items, search, pagination, pull-to-refresh
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { NewsItem } from '@/types';
import { newsService } from '@/services/news.service';

const PAGE_SIZE = 15;

export const useNewsFeed = () => {
  const [items,      setItems]      = useState<NewsItem[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);

  // ── Refs ────────────────────────────────────────────────────────────────────

  /**
   * useRef — debounce timer
   *
   * Stores the ID returned by setTimeout so we can cancel it if the user
   * types again before the 400 ms window closes.
   * We use a ref rather than state because updating it must NOT trigger a
   * re-render — it is purely internal bookkeeping.
   */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * useRef — in-flight guard
   *
   * Prevents a second concurrent fetch from firing while one is already
   * running (e.g. the user scrolls to trigger loadMore while a search
   * debounce is still in progress).
   * Again, a ref and not state — changes to it shouldn't paint the UI.
   */
  const fetchingRef = useRef(false);

  // ── Core loader ─────────────────────────────────────────────────────────────

  /**
   * useCallback — load
   *
   * Core async function that actually calls the API. Accepts explicit
   * arguments rather than closing over state so the dependency array stays
   * minimal and the function reference stays stable across renders.
   *
   * Dependencies: [] (empty)
   *   All values that can change (query, page) are passed as arguments,
   *   so the function itself never needs to be recreated. A stable
   *   reference means downstream useEffect calls that list [load] won't
   *   loop endlessly.
   */
  const load = useCallback(
    async (reset: boolean, targetPage: number, query: string) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      reset ? setRefreshing(true) : setLoading(true);
      setError(null);

      try {
        const data = await newsService.fetchNews({ search: query, page: targetPage, pageSize: PAGE_SIZE });
        // reset=true replaces the list; false appends (infinite scroll)
        setItems(prev => (reset ? data.results : [...prev, ...data.results]));
        setHasMore(data.next !== null);
        if (reset) setPage(1);
      } catch {
        setError('Failed to load news. Pull to refresh.');
      } finally {
        reset ? setRefreshing(false) : setLoading(false);
        fetchingRef.current = false;
      }
    },
    [], // no dependencies — args are always passed explicitly
  );

  // ── Effects ─────────────────────────────────────────────────────────────────

  /**
   * useEffect — debounced search
   *
   * Fires whenever searchQuery changes. Waits 400 ms after the user stops
   * typing before hitting the API to avoid hammering the backend on every
   * keystroke.
   *
   * Dependencies: [searchQuery]
   *   Must re-run whenever the query changes so we can schedule a fresh
   *   debounced fetch for the new value.
   *   `load` is intentionally excluded — it's stable (empty dep array) and
   *   including it would cause an extra fetch cycle on every render.
   */
  useEffect(() => {
    // Cancel any timer that is still counting down from the last keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      load(true, 1, searchQuery); // reset=true → fresh first page
    }, 400);

    // Cleanup: if searchQuery changes again before 400 ms, cancel this timer
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * useEffect — pagination
   *
   * Fires when `page` increments (triggered by loadMore below).
   * Skips page 1 because the search effect already handles the initial load
   * and any reset-to-first-page scenario.
   *
   * Dependencies: [page]
   *   We only want to fetch the next page when the page counter changes.
   *   `searchQuery` is passed as an argument to `load` so it doesn't need
   *   to be in the dep array here.
   */
  useEffect(() => {
    if (page > 1) load(false, page, searchQuery);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public actions ───────────────────────────────────────────────────────────

  /**
   * useCallback — refresh
   *
   * Called by the FlatList's RefreshControl (pull-to-refresh gesture).
   * Always resets to page 1 and re-fetches.
   *
   * Dependencies: [load, searchQuery]
   *   load is stable but listed for explicitness. searchQuery must be
   *   current so the refreshed data reflects the active search filter.
   */
  const refresh = useCallback(async () => {
    setPage(1);
    await load(true, 1, searchQuery);
  }, [load, searchQuery]);

  /**
   * useCallback — loadMore
   *
   * Called by FlatList's onEndReached. Increments page, which triggers
   * the pagination useEffect above.
   *
   * Dependencies: [loading, hasMore]
   *   Skip if a request is already in-flight (loading) or there are no
   *   more pages (hasMore). Both values must be current to make that
   *   decision correctly.
   */
  const loadMore = useCallback(() => {
    if (!loading && !fetchingRef.current && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  return {
    items,
    loading,
    refreshing,
    error,
    searchQuery,
    setSearchQuery,
    refresh,
    loadMore,
    hasMore,
  };
};
