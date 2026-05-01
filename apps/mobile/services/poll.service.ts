import { api } from "./api";

export const pollService = {
  createPoll: async (conversationId: string, data: {
    title: string;
    options: string[];
    isMultipleChoice?: boolean;
    allowAddOptions?: boolean;
    isAnonymous?: boolean;
    hideResultsUntilVoted?: boolean;
    expiresAt?: string | null;
  }) => {
    const response = await api.post(`/messages/conversation/${conversationId}/poll`, data);
    return response.data;
  },

  votePoll: async (conversationId: string, pollId: string, optionIds: string[]) => {
    const response = await api.post(`/messages/conversation/${conversationId}/poll/vote`, {
      pollId,
      optionIds,
    });
    return response.data;
  },

  addOption: async (conversationId: string, pollId: string, text: string) => {
    const response = await api.patch(`/messages/conversation/${conversationId}/poll/${pollId}/option`, {
      text,
    });
    return response.data;
  },

  getPolls: async (conversationId: string) => {
    const response = await api.get(`/messages/conversation/${conversationId}/polls`);
    return response.data;
  }
};
