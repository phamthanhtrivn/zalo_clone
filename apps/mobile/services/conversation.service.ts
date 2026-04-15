import { api } from "./api";

// --- TYPES ---
export type CreateGroupPayload = {
  name: string;
  memberIds: string[];
  avatarUrl?: string;
};

export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

// --- SERVICE ---
export const conversationService = {
  // Lấy danh sách hội thoại của tôi
  getMyConversations: async () => {
    const res = await api.get("/conversations");
    return res; // Interceptor đã trả về .data nên return res là đúng
  },

  // Lấy danh sách hội thoại theo ID người dùng
  getConversationsFromUserId: async (userId: string) => {
    const res = await api.get(`/conversations/user/${userId}`);
    return res;
  },

  // Tạo hoặc lấy hội thoại 1-1
  getOrCreateDirect: async (targetUserId: string) => {
    const res = await api.post("/conversations/direct", { targetUserId });
    return res;
  },

  // Tạo nhóm mới
  createGroup: async (payload: CreateGroupPayload) => {
    const res = await api.post("/conversations/group", payload);
    return res;
  },

  // Xóa/Giải tán nhóm
  deleteGroup: async (conversationId: string) => {
    const id = String(conversationId ?? "").trim();
    const res = await api.delete(`/conversations/${id}`);
    return res;
  },

  // Lấy danh sách thành viên trong nhóm
  getListMembers: async (conversationId: string) => {
    const id = String(conversationId ?? "").trim();
    const res = await api.get(`/conversations/${id}/members`);
    return res;
  },

  // Thêm thành viên vào nhóm
  addMembers: async (conversationId: string, userIds: string[]) => {
    const id = String(conversationId ?? "").trim();
    const ids = [
      ...new Set(userIds.map((u) => String(u).trim()).filter(Boolean)),
    ];
    const res = await api.post(`/conversations/${id}/add-members`, {
      userIds: ids,
    });
    return res;
  },

  // Xóa thành viên khỏi nhóm
  removeMember: async (conversationId: string, targetUserId: string) => {
    const id = String(conversationId ?? "").trim();
    const targetId = String(targetUserId ?? "").trim();
    const res = await api.delete(`/conversations/${id}/remove-member`, {
      data: { targetUserId: targetId },
    });
    return res;
  },

  // Cập nhật vai trò thành viên (Phó nhóm/Thành viên)
  updateMembersRole: async (
    conversationId: string,
    memberIds: string[],
    newRole: MemberRole,
  ) => {
    const id = String(conversationId ?? "").trim();
    const ids = [
      ...new Set(
        memberIds.map((memberId) => String(memberId).trim()).filter(Boolean),
      ),
    ];
    const res = await api.patch(`/conversations/${id}/members/role`, {
      memberIds: ids,
      newRole,
    });
    return res;
  },

  // Chuyển quyền Trưởng nhóm
  transferOwner: async (conversationId: string, targetUserId: string) => {
    const id = String(conversationId ?? "").trim();
    const targetId = String(targetUserId ?? "").trim();
    const res = await api.post(`/conversations/${id}/transfer-owner`, {
      targetUserId: targetId,
    });
    return res;
  },

  // Đánh dấu đã đọc hội thoại
  markAsRead: async (conversationId: string) => {
    const id = String(conversationId ?? "").trim();
    const res = await api.patch(`/conversations/${id}/read`);
    return res;
  },

  // Rời khỏi nhóm
  leaveGroup: async (conversationId: string) => {
    const id = String(conversationId ?? "").trim();
    const res = await api.post(`/conversations/${id}/leave`);
    return res;
  },
};
