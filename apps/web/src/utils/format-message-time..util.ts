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



  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfDate.getTime()) / day,
  );

  if (diffDays === 1) {
    return "Hôm qua";
  }

  if (diffDays < 7) {
    return `${diffDays} ngày`;
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

export const formatTime = (date: string) => {
  const d = new Date(date);
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatOldDate = (date: string) => {
  const d = new Date(date);

  const weekday = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${weekday} ${day}/${month}/${year}`;
};

export const getDateLabel = (date: string) => {
  const msgDate = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(msgDate, today)) return "Hôm nay";
  if (isSameDay(msgDate, yesterday)) return "Hôm qua";

  return formatOldDate(date);
};

export const isSameHourAndMinute = (a: string, b: string) => {
  const d1 = new Date(a);
  const d2 = new Date(b);

  return d1.getHours() === d2.getHours() && d1.getMinutes() === d2.getMinutes();
};
