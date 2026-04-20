import UserInfoItem from "./UserInforItem";
export default function UserRequestCart({ item,handelAccept,handelReject}: any) {   
  return (
    <div className="w-full mb-5 p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition">

      <UserInfoItem name = {item?.name } avatarUrl = {item?.avatarUrl} desc = {"Kết bạn qua số điện thoại"} />

      <div className="w-full flex gap-5">
        <button onClick = {() => handelReject(item.friendId)} className="w-[50%] px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">
          Từ chối
        </button>

        <button  onClick = {() => handelAccept(item.friendId)} className="w-[50%] px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">
          Chấp nhận
        </button>
      </div>
    </div>
  );
}
