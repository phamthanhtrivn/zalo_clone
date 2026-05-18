export const formatTime = (time: number) => {
  const minutes = String(Math.floor(time / 60)).padStart(2, "0");
  const secs = String(time % 60).padStart(2, "0");

  return `${minutes}:${secs}`;
};

export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Tháng trong JS bắt đầu từ 0
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};
export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const diffInMinutes = Math.floor(diff / (1000 * 60));
  const diffInHours = Math.floor(diff / (1000 * 60 * 60));
  const diffInDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return "Vừa xong";
  if (diffInMinutes < 60) return `${diffInMinutes} phút`;
  if (diffInHours < 24) return `${diffInHours} giờ`;
  if (diffInDays < 7) return `${diffInDays} ngày`;

  return formatDate(new Date(date));
};

export const formatTimeString = (date: string | Date): string => {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const formatLastSeen = (lastSeenAt?: string | null): string => {
  if (!lastSeenAt) return "Không hoạt động";
  const date = new Date(lastSeenAt);
  if (isNaN(date.getTime())) return "Không hoạt động";

  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Tính sự khác biệt tháng và năm thực tế dựa trên lịch
  const now = new Date();
  const diffYears = now.getFullYear() - date.getFullYear();
  const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());

  if (diffSecs < 60) {
    return "Vừa hoạt động";
  }
  if (diffMins < 60) {
    return `Hoạt động ${diffMins} phút trước`;
  }
  if (diffHours < 24) {
    return `Hoạt động ${diffHours} giờ trước`;
  }
  if (diffDays < 30) {
    return `Hoạt động ${diffDays} ngày trước`;
  }
  if (diffMonths < 12) {
    const months = diffMonths <= 0 ? 1 : diffMonths;
    return `Hoạt động ${months} tháng trước`;
  }

  const years = diffYears <= 0 ? 1 : diffYears;
  return `Hoạt động ${years} năm trước`;
};
