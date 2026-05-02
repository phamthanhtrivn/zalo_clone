const formatBirthday = (dateObj : any) => {
  if (!dateObj) return "Chưa cập nhật";
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
};

export default formatBirthday;