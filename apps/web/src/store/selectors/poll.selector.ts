import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store";

const selectMessages = (state: RootState) => state.message.messagesByConversation;

export const makeSelectPollByMessageId = (conversationId: string, pollId: string) =>
  createSelector(
    [selectMessages],
    (messagesByConversation) => {
      const messages = messagesByConversation[conversationId] || [];
      const msg = messages.find((m) => {
        if (!m.pollId) return false;
        const currentPollId = typeof m.pollId === "string" ? m.pollId : (m.pollId as any)._id;
        return String(currentPollId) === String(pollId);
      });
      return msg?.poll || null;
    }
  );

export const makeSelectMyVotes = (conversationId: string, pollId: string, currentUserId: string) =>
  createSelector(
    [makeSelectPollByMessageId(conversationId, pollId)],
    (poll) => {
      if (!poll || !poll.options) return [];
      return poll.options
        .filter((opt) => opt.voters?.some((v) => v.userId === currentUserId))
        .map((opt) => opt._id);
    }
  );

export const makeSelectTotalParticipants = (conversationId: string, pollId: string) =>
  createSelector(
    [makeSelectPollByMessageId(conversationId, pollId)],
    (poll) => poll?.totalParticipants || 0
  );
