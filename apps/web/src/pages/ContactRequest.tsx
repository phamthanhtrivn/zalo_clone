import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { userService } from "@/services/user.service";
import UserRequestCart from "@/components/layout/UserRequestCard";
import UserSendCart from "@/components/layout/UserSendCart";
import UserSuggestCart from "@/components/layout/UserSuggestCart";

const ContactRequest = () => {
  const [receivedUsers, setReceivedUsers] = useState<any>([]);
  const [sendUsers, setSendUsers] = useState<any>([]);
  const [suggestUsers, setSuggestUsers] = useState<any>([]);
  useEffect(() => {
    const getUsers = async () => {
      try {
        let data = await userService.receivedFriendRequests();
        if (data?.data?.users) {
          setReceivedUsers([
            ...data.data.users,
            { id: "1111111", name: "Tran Minh Tri" },
          ]);
        }
        data = await userService.sentFriendRequests();
        if (data?.data?.users) {
          setSendUsers([
            ...data.data.users,
            { id: "1111111", name: "Tran Minh Tri" },
          ]);
        }
        data = await userService.suggestFriend();
        console.log(data);
        if (data?.data) {
          setSuggestUsers([
            ...data.data,
            { id: "1111111", name: "Tran Minh Tri" },
          ]);
        }
      } catch (err) {
        console.log(err);
      }
    };
    getUsers();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <header className="h-[64px] border-b border-[#e5e7eb] flex items-center px-4 shrink-0">
        <div className="flex items-center gap-3">
          <UserPlus className="w-5 h-5 text-gray-600" />
          <h1 className="text-[16px] font-semibold text-gray-800">
            Lời mời kết bạn
          </h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col bg-[#f4f7f9] p-4">
        <div className="flex-1">
          <div className="mb-5">
            <span className="text-[16px] font-semibold text-gray-800">
              Lời mời kết bạn (3)
            </span>
          </div>
          <div className="flex justify-content-between">
            {receivedUsers?.length > 0 ? (
              <div className="w-[30%]">
                {receivedUsers.map((item: any) => (
                  <UserRequestCart key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="flex-1 flex-column justify-content-center align-items-center text-center">
                <UserPlus className="w-16 h-16 mx-auto opacity-20 mb-4" />
                <p className="text-sm">Chưa có lời mời kết bạn nào</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="mb-5">
            <span className="text-[16px] font-semibold text-gray-800">
              Lời mời đã gửi (2)
            </span>
          </div>
          <div className="flex justify-content-between">
            {sendUsers?.length > 0 ? (
              <div className="w-[30%]">
                {receivedUsers.map((item: any) => (
                  <UserSendCart key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="flex-1 flex-column justify-content-center align-items-center text-center">
                <UserPlus className="w-16 h-16 mx-auto opacity-20 mb-4" />
                <p className="text-sm">Chưa có lời mời kết bạn nào</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="mb-5">
            <span className="text-[16px] font-semibold text-gray-800">
              Gợi ý kết bạn (10)
            </span>
          </div>
          <div className="flex justify-content-between">
            {suggestUsers?.length > 0 ? (
              <div className="w-[30%]">
                {receivedUsers.map((item: any) => (
                  <UserSuggestCart key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="flex-1 flex-column justify-content-center align-items-center text-center">
                <UserPlus className="w-16 h-16 mx-auto opacity-20 mb-4" />
                <p className="text-sm">Chưa có lời mời kết bạn nào</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactRequest;
