// feedCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedApiResponse } from '@/types';
const FEED_CACHE_KEY = 'feed_cache_page1';
const FEED_CACHE_TIMESTAMP_KEY = 'feed_cache_timestamp';

export async function saveFeedCache(firstPage: FeedApiResponse) {
  try {
    await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(firstPage));
    await AsyncStorage.setItem(FEED_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // ignore write failures, not critical
  }
}

export async function loadFeedCache() {
  try {
    const [pageStr, tsStr] = await Promise.all([
      AsyncStorage.getItem(FEED_CACHE_KEY),
      AsyncStorage.getItem(FEED_CACHE_TIMESTAMP_KEY),
    ]);
    if (!pageStr) return null;
    return {
      page: JSON.parse(pageStr) as FeedApiResponse,
      timestamp: tsStr ? parseInt(tsStr, 10) : 0,
    };
  } catch {
    return null;
  }
}