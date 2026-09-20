// ─────────────────────────────────────────────────────────────────────────────
// useVote.ts — Optimistic up/downvote with server sync and rollback
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { VoteType } from '@/types';
import { newsService } from '@/services/news.service';
interface UseVoteProps {
  newsId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote: VoteType;
}

export const useVote = ({
  newsId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote,
}: UseVoteProps) => {
  const [upvotes,   setUpvotes]   = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote,  setUserVote]  = useState<VoteType>(initialUserVote);

  /**
   * useCallback — handleVote
   *
   * Applies an optimistic UI update immediately so the tap feels instant,
   * then syncs with the server. If the server call fails, state is rolled
   * back to whatever it was before the tap.
   *
   * Tapping the same direction as the active vote removes it (toggle off).
   *
   * Dependencies: [newsId, userVote, upvotes, downvotes]
   *   newsId:    included in the API payload and can't be stale.
   *   userVote:  determines the toggle logic (is this a switch or a removal?).
   *   upvotes/downvotes: captured in the snapshot for rollback — must be
   *     the values at the moment of the tap, not a stale closure.
   */
  const handleVote = useCallback(
    async (type: 'up' | 'down') => {
      const isToggle   = userVote === type;          // tapping same → remove vote
      const newVote: VoteType = isToggle ? null : type;

      // Capture current state so we can roll back on failure
      const snapshot = { upvotes, downvotes, userVote };

      // ── Optimistic update — apply before the network call ────────────────
      setUserVote(newVote);

      if (isToggle) {
        // Undoing an existing vote: subtract one from the matching counter
        type === 'up'
          ? setUpvotes(u => u - 1)
          : setDownvotes(d => d - 1);
      } else {
        if (type === 'up') {
          setUpvotes(u => u + 1);
          // If switching from downvote, also decrement downvotes
          if (userVote === 'down') setDownvotes(d => d - 1);
        } else {
          setDownvotes(d => d + 1);
          // If switching from upvote, also decrement upvotes
          if (userVote === 'up') setUpvotes(u => u - 1);
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      try {
        const result = await newsService.voteOnNews({ newsId, voteType: newVote });
        // Sync with the server's authoritative counts (handles race conditions)
        setUpvotes(result.upvotes);
        setDownvotes(result.downvotes);
        setUserVote(result.userVote);
      } catch {
        // Network error — revert the optimistic update silently
        setUpvotes(snapshot.upvotes);
        setDownvotes(snapshot.downvotes);
        setUserVote(snapshot.userVote);
      }
    },
    [newsId, userVote, upvotes, downvotes],
  );

  return { upvotes, downvotes, userVote, handleVote };
};
