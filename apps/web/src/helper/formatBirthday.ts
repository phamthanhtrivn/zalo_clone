const formatBirthday = (dateObj : any) => {
  if (!dateObj) return "Chưa cập nhật"; // Nếu không có dữ liệu (undefined)
  
  const day = dateObj.getDate().toString().padStart(2, '0'); // Thêm số 0 nếu là ngày < 10
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0'); // Tháng cộng 1 vì JS tính từ 0
  const year = dateObj.getFullYear();
  
  return `${day} tháng ${month}, ${year}`;
};

export default formatBirthday;