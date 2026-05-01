import { apiClient } from "./apiClient";

export interface CreatePollData {
  title: string;
  options: string[];
  isMultipleChoice?: boolean;
  allowAddOptions?: boolean;
}

export const pollService = {
  createPoll: async (conversationId: string, data: CreatePollData) => {
    const response = await apiClient.post(`/api/messages/conversation/${conversationId}/poll`, data);
    return response.data;
  },

  votePoll: async (conversationId: string, pollId: string, optionIds: string[]) => {
    const response = await apiClient.post(`/api/messages/conversation/${conversationId}/poll/vote`, {
      pollId,
      optionIds,
    });
    return response.data;
  },

  addOption: async (conversationId: string, pollId: string, text: string) => {
    const response = await apiClient.patch(`/api/messages/conversation/${conversationId}/poll/${pollId}/option`, {
      text,
    });
    return response.data;
  },

  getPolls: async (conversationId: string) => {
    const response = await apiClient.get(`/api/messages/conversation/${conversationId}/polls`);
    return response.data;
  },
};
