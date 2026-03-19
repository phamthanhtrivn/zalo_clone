import UserInfoItem from "./UserInforItem";
export default function UserRequestCart({ item, handelRecall }: any) {
  return (
    <div className=" mb-5 w-full p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition">

      <UserInfoItem name = {item?.name } avartaUrl = {item?.avartaUrl} desc = {"Bạn đã gửi lời mời"} />

      <div className="w-full flex gap-5">
        <button onClick={() => handelRecall(item.friendId)} className="w-[100%] px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">
          Thu hồi lời mời
        </button>

      </div>
    </div>
  );
}
