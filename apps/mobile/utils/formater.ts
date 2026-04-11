export const formatTime = (time: number) => {
  const minutes = String(Math.floor(time / 60)).padStart(2, "0");
  const secs = String(time % 60).padStart(2, "0");

  return `${minutes}:${secs}`;
};

export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Tháng trong JS bắt đầu từ 0
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

