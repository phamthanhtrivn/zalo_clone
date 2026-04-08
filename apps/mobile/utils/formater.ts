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