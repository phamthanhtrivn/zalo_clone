import { apiClient } from "./apiClient";

type CreateGroupPayload = {
  name: string;
  memberIds: string[];
  avatarUrl?: string;
};

type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export const conversationService = {
  getConversationsFromUser: async () => {
    const response = await apiClient.get("/api/conversations");
    return response.data;
  },
  getMyConversations: async () => {
    const response = await apiClient.get("/api/conversations");
    return response.data;
  },
  getOrCreateDirect: async (targetUserId: string) => {
    const response = await apiClient.post("/api/conversations/direct", {
      targetUserId,
    });
    return response.data;
  },
  createGroup: async (payload: CreateGroupPayload) => {
    const response = await apiClient.post("/api/conversations/group", payload);
    return response.data;
  },
  markAsRead: async (conversationId: string) => {
    const response = await apiClient.patch(
      `/api/conversations/${conversationId}/read`,
    );
    return response.data;
  },
  getConversationsFromUserId: async (userId: string) => {
    const response = await apiClient.get(`/api/conversations/user/${userId}`);
    return response.data;
  },
  getListMembers: async (conversationId: string) => {
    const response = await apiClient.get(
      `/api/conversations/${conversationId}/members`,
    );
    return response?.data ?? null;
  },

  addMembers: async (conversationId: string, userIds: string[]) => {
    const id = String(conversationId ?? "").trim();
    const ids = [
      ...new Set(userIds.map((u) => String(u).trim()).filter(Boolean)),
    ];
    const response = await apiClient.post(
      `/api/conversations/${id}/add-members`,
      { userIds: ids },
    );
    return response?.data ?? null;
  },

  removeMember: async (conversationId: string, targetUserId: string) => {
    const id = String(conversationId ?? "").trim();
    const targetId = String(targetUserId ?? "").trim();
    const response = await apiClient.delete(
      `/api/conversations/${id}/remove-member`,
      {
        data: { targetUserId: targetId },
      },
    );
    return response?.data ?? null;
  },
  updateMembersRole: async (
    conversationId: string,
    memberIds: string[],
    newRole: MemberRole,
  ) => {
    const id = String(conversationId ?? "").trim();
    const ids = [
      ...new Set(memberIds.map((u) => String(u).trim()).filter(Boolean)),
    ];
    const response = await apiClient.patch(
      `/api/conversations/${id}/members/role`,
      {
        memberIds: ids,
        newRole,
      },
    );
    return response?.data ?? null;
  },
  transferOwner: async (conversationId: string, targetUserId: string) => {
    const id = String(conversationId ?? "").trim();
    const targetId = String(targetUserId ?? "").trim();
    const response = await apiClient.post(
      `/api/conversations/${id}/transfer-owner`,
      { targetUserId: targetId },
    );
    return response?.data ?? null;
  },
  leaveGroup: async (conversationId: string) => {
    const id = String(conversationId ?? "").trim();
    const response = await apiClient.post(`/api/conversations/${id}/leave`);
    return response?.data ?? null;
  },
  deleteGroup: async (conversationId: string) => {
    const id = String(conversationId ?? "").trim();
    const response = await apiClient.delete(`/api/conversations/${id}`);
    return response?.data ?? null;
  },
};
