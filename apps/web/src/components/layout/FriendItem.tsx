import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { userService } from "@/services/user.service";
import { useSelector } from "react-redux";

export const FriendItem = ({ item, setFriends }: any) => {
  const [openId, setOpenId] = useState<string>("");
  const userId = useSelector((item : any) => item.auth.user.userId);

  const handelBock = (id: string) => {
    const blockFriend = async () => {
      try {
        const data = await userService.blockFriend(id, userId);
        if (data.data) {
          setFriends((prev: any) =>
            prev.map((group: any) => ({
              ...group,
              friends: group.friends.filter(
                (friend: any) => friend.friendId !== id,
              ),
            })),
          );
        }
      } catch (err) {
        console.log(err);
      }
    };
    blockFriend();
  };

  const handelDeleteFriend = (id: string) => {
    const deleteFriend = async () => {
      try{
        const data = await userService.cancelFriend(id, userId);
        if (data.data) {
          setFriends((prev: any) =>
            prev.map((group: any) => ({
              ...group,
              friends: group.friends.filter(
                (friend: any) => friend.friendId !== id,
              ),
            })),
          );
        }
      }
      catch(err){
        console.log(err);
      }
    };
    deleteFriend();
  };

  return (
    <div key={item.key}>
      <div>
        <span className="text-[16px] font-semibold text-gray-800">
          {item.key}
        </span>
      </div>
      {item.friends.map((f: any) => (
        <div
          key={f.friendId}
          className="flex items-center justify-between px-2 py-3 hover:bg-gray-50 rounded-lg mb-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden">
              <img
                src={
                  f?.avatarUrl ||
                  "https://chiemtaimobile.vn/images/companies/1/%E1%BA%A2nh%20Blog/avatar-facebook-dep/Anh-avatar-hoat-hinh-de-thuong-doi-lot-soi.jpg"
                }
                className="w-full h-full object-fit-contain"
              />
            </div>
            <p className="font-medium">{f?.name}</p>
          </div>

          <div className="relative">
            <button onClick={() => setOpenId(openId == f.friendId ? "" : f.friendId)}>
              <MoreHorizontal className="text-gray-500" />
            </button>
            {openId === f.friendId && (
              <div className="absolute right-0 -mt-0.5 w-48 bg-white border rounded-xl shadow-lg">
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  <button>Xem thông tin</button>
                </div>
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  <button>Phân loại</button>
                </div>
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  <button> Đặt tên gợi nhớ</button>
                </div>
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  <button onClick={() => handelBock(f.friendId)}>
                    Chặn người này
                  </button>
                </div>
                <div className="p-3 text-red-500 hover:bg-gray-50 cursor-pointer">
                  <button onClick={() => handelDeleteFriend(f.friendId)}>Xóa bạn</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
