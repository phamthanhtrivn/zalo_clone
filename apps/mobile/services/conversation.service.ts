import { api } from "./api";

type CreateGroupPayload = {
  name: string;
  memberIds: string[];
  avatarUrl?: string;
};

type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export const conversationService = {
  getMyConversations: async () => {
    const res = await api.get("/conversations");
    console.log("API Response:", res);
    return res;
  },
  getConversationsFromUserId: async (userId: string) => {
    const res = await api.get(`/conversations/user/${userId}`);
    return res;
  },
  getOrCreateDirect: async (targetUserId: string) => {
    const res = await api.post("/conversations/direct", { targetUserId });
    return res;
  },
  createGroup: async (payload: CreateGroupPayload) => {
    const res = await api.post("/conversations/group", payload);
    return res;
  },
  deleteGroup: async (conversationId: string) => {
    const id = String(conversationId ?? "").trim();
    const res = await api.delete(`/conversations/${id}`);
    return res;
  },
  getListMembers: async (conversationId: string) => {
    const id = String(conversationId ?? "").trim();
    const res = await api.get(`/conversations/${id}/members`);
    return res;
  },
  addMembers: async (conversationId: string, userIds: string[]) => {
    const id = String(conversationId ?? "").trim();
    const ids = [...new Set(userIds.map((u) => String(u).trim()).filter(Boolean))];
    const res = await api.post(`/conversations/${id}/add-members`, {
      userIds: ids,
    });
    return res;
  },
  removeMember: async (conversationId: string, targetUserId: string) => {
    const id = String(conversationId ?? "").trim();
    const targetId = String(targetUserId ?? "").trim();
    const res = await api.delete(`/conversations/${id}/remove-member`, {
      data: { targetUserId: targetId },
    });
    return res;
  },
  updateMembersRole: async (
    conversationId: string,
    memberIds: string[],
    newRole: MemberRole,
  ) => {
    const id = String(conversationId ?? "").trim();
    const ids = [
      ...new Set(memberIds.map((memberId) => String(memberId).trim()).filter(Boolean)),
    ];
    const res = await api.patch(`/conversations/${id}/members/role`, {
      memberIds: ids,
      newRole,
    });
    return res;
  },
  transferOwner: async (conversationId: string, targetUserId: string) => {
    const id = String(conversationId ?? "").trim();
    const targetId = String(targetUserId ?? "").trim();
    const res = await api.post(`/conversations/${id}/transfer-owner`, {
      targetUserId: targetId,
    });
    return res;
  },
  markAsRead: async (conversationId: string) => {
    const id = String(conversationId ?? "").trim();
    const res = await api.patch(`/conversations/${id}/read`);
    return res;
  },
  leaveGroup: async (conversationId: string) => {
    const id = String(conversationId ?? "").trim();
    const res = await api.post(`/conversations/${id}/leave`);
    return res;
  },
};
