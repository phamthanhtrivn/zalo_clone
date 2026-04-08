export const isVietnamPhone = (phone: string) => {
  const regex = /^(03|05|07|08|09)[0-9]{8}$/;
  return regex.test(phone);
};
