import UserInfoItem from "./UserInforItem";
export default function UserRequestCart({ item }: any) {
  return (
    <div className="w-full mb-5 p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition">

      <UserInfoItem name = {item?.name } avartaUrl = {item?.avartaUrl} desc = {"Kết bạn qua số điện thoại"} />

      <div className="w-full flex gap-5">
        <button className="w-[50%] px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">
          Từ chối
        </button>

        <button className="w-[50%] px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">
          Kết bạn
        </button>
      </div>
    </div>
  );
}
