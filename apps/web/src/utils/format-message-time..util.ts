export const formatMessageTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const isSameDay = now.toDateString() === date.toDateString();

  if (isSameDay) {
    if (diffMs < minute) {
      return "Vừa xong";
    }

    if (diffMs < hour) {
      const minutes = Math.floor(diffMs / minute);
      return `${minutes} phút`;
    }

    const hours = Math.floor(diffMs / hour);
    return `${hours} giờ`;
  }

  if (diffMs < 7 * day) {
    const days = Math.floor(diffMs / day);
    return `${days} ngày`;
  }

  const isSameYear = now.getFullYear() === date.getFullYear();

  if (isSameYear) {
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};