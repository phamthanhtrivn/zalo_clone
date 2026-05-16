export const AVATAR_COLORS = [
  "#FF5722",
  "#FF9800",
  "#FFC107",
  "#4CAF50",
  "#009688",
  "#2196F3",
  "#3F51B5",
  "#673AB7",
  "#9C27B0",
  "#E91E63",
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

  const normalizedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const isDefaultGroup =
    name.includes(",") ||
    normalizedName.includes("nguoi khac") ||
    normalizedName.includes("nhom");

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

export const getInitials = (name: string) => getAvatarData(name).initials;
