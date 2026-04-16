import { api } from "./api";

export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export const conversationService = {
  getMyConversations: () => api.get("/conversations"),

  getOrCreateDirect: (targetUserId: string) =>
    api.post("/conversations/direct", { targetUserId }),

  createGroup: (payload: {
    name: string;
    memberIds: string[];
    avatarUrl?: string;
  }) => api.post("/conversations/group", payload),

  deleteGroup: (id: string) => api.delete(`/conversations/${id}`),

  getListMembers: (id: string) => api.get(`/conversations/${id}/members`),

  addMembers: (id: string, userIds: string[]) =>
    api.post(`/conversations/${id}/add-members`, { userIds }),

  removeMember: (id: string, memberId: string) =>
    api.delete(`/conversations/${id}/members/${memberId}`),

  updateMembersRole: (id: string, memberIds: string[], newRole: MemberRole) =>
    api.patch(`/conversations/${id}/members/role`, { memberIds, newRole }),

  transferOwner: (id: string, targetUserId: string) =>
    api.post(`/conversations/${id}/transfer-owner`, { targetUserId }),

  leaveGroup: (id: string) => api.post(`/conversations/${id}/leave`),

  markAsRead: (id: string) => api.patch(`/conversations/${id}/read`),

  getConversationsFromUserId: (userId: string) =>
    api.get(`/conversations/user/${userId}`),

  updateGroupSettings: (id: string, payload: any) =>
    api.patch(`/conversations/${id}/settings`, payload),

  getJoinRequests: (id: string) =>
    api.get(`/conversations/${id}/join-requests`),

  handleJoinRequest: (
    id: string,
    requestId: string,
    action: "APPROVED" | "REJECTED",
  ) => {
    const method = action === "APPROVED" ? "approve" : "reject";
    return api.post(
      `/conversations/${id}/join-requests/${requestId}/${method}`,
    );
  },

  updateGroupMetadata: async (
    id: string,
    payload: { name?: string; avatar?: any },
  ) => {
    const formData = new FormData();

    if (payload.name) {
      formData.append("name", payload.name);
    }

    if (payload.avatar) {
      const fileData = {
        uri: payload.avatar.uri,
        name: payload.avatar.fileName || "avatar.jpg",
        type: payload.avatar.type || "image/jpeg",
      };
      formData.append("avatar", fileData as any);
    }

    return api.patch(`/conversations/${id}/group-info`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
