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

  updateGroupSettings: (
    id: string,
    payload: {
      allowMembersInvite?: boolean;
      approvalRequired?: boolean;
      allowMembersSendMessages?: boolean;
    },
  ) => api.patch(`/conversations/${id}/settings`, payload),

  updateConversationSetting: (
    id: string,
    payload: {
      pinned?: boolean;
      muted?: boolean;
      mutedUntil?: string | null;
      hidden?: boolean;
    },
  ) => api.patch(`/conversations/${id}/personal-settings`, payload),

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
  getConversationsFromUserId: async (userId: string) => {
    const response = await api.get(`/conversations/user/${userId}`);
    console.log(
      "📊 API Response sample:",
      JSON.stringify(response.data?.[0], null, 2),
    );
    console.log(
      "📊 unreadCount values:",
      response.data?.map((c: any) => ({
        name: c.name,
        unreadCount: c.unreadCount,
      })),
    );
    return response;
  },
  search: async (
    params: {
      userId: string;
      keyword: string;
      scope?: "all" | "contacts" | "messages" | "files" | "groups";
      limit?: number;
    }
  ) => {
    const response = await api.get("/conversations/search", {
      params: {
        userId: params.userId,
        keyword: params.keyword,
        scope: params.scope || "all",
        limit: params.limit || 8,
      },
    });
    return response;
  },
};
