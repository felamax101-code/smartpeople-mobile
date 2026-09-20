// ─────────────────────────────────────────────────────────────────────────────
// useReport.ts — Report modal visibility, submission, and success state
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { newsService } from '@/services/news.service';
export const useReport = (newsId: string) => {
  const [visible,    setVisible]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  /**
   * useCallback — submitReport
   *
   * Sends the report to the backend. On success, flips `submitted` to true
   * (which triggers the success animation in the modal) and auto-closes after
   * 1.5 s. On failure, surfaces an error message inside the modal.
   *
   * Dependencies: [newsId]
   *   newsId is embedded in the API endpoint URL. If the card were ever
   *   recycled or reused for a different item (unlikely in a push-navigation
   *   pattern but defensively correct), we need the current value.
   */
  const submitReport = useCallback(
    async (reason: string, additionalNote?: string) => {
      setSubmitting(true);
      setError(null);

      try {
        await newsService.reportNews({ newsId, reason, additionalNote });
        setSubmitted(true);

        // Auto-close after showing the success checkmark for 1.5 s
        setTimeout(() => {
          setVisible(false);
          setSubmitted(false);
        }, 1500);
      } catch {
        setError('Could not submit report. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [newsId],
  );

  const openReport = useCallback(() => {
    setError(null);      // clear any previous error before reopening
    setVisible(true);
  }, []);

  const closeReport = useCallback(() => setVisible(false), []);

  return {
    reportVisible: visible,
    openReport,
    closeReport,
    submitReport,
    submitting,
    submitted,
    reportError: error,
  };
};
