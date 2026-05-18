/**
 * Định dạng thời gian hoạt động cuối cùng của người dùng (last seen)
 * sang định dạng thân thiện với người đọc bằng Tiếng Việt.
 * 
 * @param lastSeenAt Chuỗi ISO ngày hoạt động cuối
 * @returns Chuỗi định dạng trực quan (Vừa hoạt động, X phút trước, X ngày trước, X tháng trước, X năm trước)
 */
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
