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
      `/api/conversations/${id}/members/${targetId}`,
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

  updateGroupSettings: async (
    id: string,
    payload: {
      allowMembersInvite?: boolean;
      approvalRequired?: boolean;
      allowMembersSendMessages?: boolean;
    },
  ) => {
    const response = await apiClient.patch(
      `/api/conversations/${id}/settings`,
      payload,
    );
    return response.data;
  },

  getJoinRequests: async (id: string) => {
    const response = await apiClient.get(
      `/api/conversations/${id}/join-requests`,
    );
    return response.data;
  },

  handleJoinRequest: async (
    id: string,
    requestId: string,
    action: "approve" | "reject",
  ) => {
    const response = await apiClient.post(
      `/api/conversations/${id}/join-requests/${requestId}/${action}`,
    );
    return response.data;
  },

  updateGroupMetadata: async (
    id: string,
    payload: { name?: string; avatar?: File },
  ) => {
    const formData = new FormData();
    if (payload.name) formData.append("name", payload.name);
    if (payload.avatar) formData.append("avatar", payload.avatar);

    const response = await apiClient.patch(
      `/api/conversations/${id}/group-info`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  },
  search: async (
    query: {
      keyword: string;
      userId: string;
      scope?: "all" | "contacts" | "messages" | "files" | "groups";
      limit?: number;
    }
  ) => {
    const response = await apiClient.get("/api/conversations/search", {
      params: query,
    });
    return response.data;
  },
  sendFriendRequest: async (fromUserId: string, targetUserId: string) => {
    const response = await apiClient.post("/api/users/add-friend", {
      userId: fromUserId,
      friendId: targetUserId,
    });
    return response.data;
  },
};