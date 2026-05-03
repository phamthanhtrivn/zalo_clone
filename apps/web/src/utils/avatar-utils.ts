export const AVATAR_COLORS = [
  "#FF5722", // Deep Orange
  "#FF9800", // Orange
  "#FFC107", // Amber
  "#4CAF50", // Green
  "#009688", // Teal
  "#2196F3", // Blue
  "#3F51B5", // Indigo
  "#673AB7", // Deep Purple
  "#9C27B0", // Purple
  "#E91E63", // Pink
];

export const getColorByName = (name: string) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const getAvatarData = (name: string) => {
  if (!name) return { initials: "?", isGroupIcon: false };

  // Logic: Nếu tên chứa dấu phẩy hoặc có chữ "người khác" -> Hiện Icon Nhóm
  const isDefaultGroup = name.includes(",") || name.includes("người khác");
  
  if (isDefaultGroup) {
    return { initials: null, isGroupIcon: true };
  }

  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return { initials: parts[0].charAt(0).toUpperCase(), isGroupIcon: false };
  }
  
  const first = parts[0].charAt(0).toUpperCase();
  const last = parts[parts.length - 1].charAt(0).toUpperCase();
  return { initials: first + last, isGroupIcon: false };
};

// Legacy support
export const getInitials = (name: string) => getAvatarData(name).initials;
