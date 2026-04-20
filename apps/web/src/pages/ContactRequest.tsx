import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { userService } from "@/services/user.service";
import UserRequestCart from "@/components/layout/UserRequestCard";
import UserSendCart from "@/components/layout/UserSendCart";
import UserSuggestCart from "@/components/layout/UserSuggestCart";
import { useSelector } from "react-redux";
import { useSocket } from "@/contexts/SocketContext";
import { toast } from "react-toastify";

const ContactRequest = () => {
  const [receivedUsers, setReceivedUsers] = useState<any>([]);
  const [sendUsers, setSendUsers] = useState<any>([]);
  const [suggestUsers, setSuggestUsers] = useState<any>([]);
  const userId = useSelector((item: any) => item.auth.user.userId);
  const { socket } = useSocket();

  useEffect(() => {
    const getUsers = async () => {
      try {
        let data = await userService.receivedFriendRequests();
        if (data?.data?.users) {
          setReceivedUsers(data.data.users);
        }
        data = await userService.sentFriendRequests();
        if (data?.data?.users) {
          setSendUsers(data.data.users);
        }
        data = await userService.suggestFriend();
        if (data?.data) {
          setSuggestUsers(data.data);
        }
      } catch (err) {
        console.log(err);
      }
    };
    getUsers();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // 1. Xử lý khi có người khác gửi lời mời cho mình
    const handleReceiveRequest = (data: any) => {
      console.log("Nhận lời mời mới:", data);
      setReceivedUsers((prev: any) => [data, ...prev]);
      toast.info(`Bạn có lời mời kết bạn mới từ ${data.name}!`);
    };

    // 2. Xử lý khi lời mời mình gửi đi được đối phương chấp nhận
    const handleFriendAccepted = (data: any) => {
      console.log("Lời mời đã được chấp nhận:", data);
      setSendUsers((prev: any) =>
        prev.filter((user: any) => user.friendId !== data.friendId),
      );

      toast.success(`${data.name} đã chấp nhận lời mời kết bạn!`);
    };

    // Đăng ký các sự kiện
    socket.on("receive_friend_request", handleReceiveRequest);
    socket.on("friend_accepted", handleFriendAccepted);

    // Hàm cleanup
    return () => {
      socket.off("receive_friend_request", handleReceiveRequest);
      socket.off("friend_accepted", handleFriendAccepted);
    };
  }, [socket]);


  const handelAccept = (id: string) => {
    const acceptFriend = async () => {
      try {
        const data = await userService.acceptFriend(id, userId);
        if (data.data) {
          setReceivedUsers((prev: any) =>
            prev.filter((item: any) => item.friendId != id),
          );
          toast.success("Kết bạn thành công");
        }
      } catch (err) {
        console.log(err);
      }
    };

    acceptFriend();
  };

  const handelReject = (id: string) => {
    const rejectFriend = async () => {
      try {
        const data = await userService.rejectFriend(id, userId);
        if (data.data) {
          setReceivedUsers((prev: any) =>
            prev.filter((item: any) => item.friendId != id),
          );
          toast.success("Từ chối thành công");
        }
      } catch (err) {
        console.log(err);
      }
    };
    rejectFriend();
  };

  const handelRecall = (id: string) => {
    const recallFriend = async () => {
      try {
        const data = await userService.cancelFriend(id, userId);
        if (data.data) {
          setSendUsers((prev: any) =>
            prev.filter((item: any) => item.friendId != id),
          );
          toast.success("Thu hồi thành công");
        }
      } catch (err) {
        console.log(err);
      }
    };
    recallFriend();
  };

  const handelAddFriend = (id: string) => {
    const addFriend = async () => {
      try {
        const data = await userService.addFriend(id, userId);
        if (data.data) {
          const item = suggestUsers.find((user: any) => user.friendId == id);
          setSuggestUsers((prev: any) =>
            prev.filter((item: any) => item.friendId != id),
          );
          setSendUsers([...sendUsers, item]);
          toast.success("Thêm bạn thành công");
        }
      } catch (err) {
        console.log(err);
      }
    };
    addFriend();
  };

  const handelSkip = (id: string) => {
    toast.success("Bỏ qua thành công");
    setSuggestUsers((prev: any) =>
      prev.filter((item: any) => item.friendId != id),
    );
  };

  return (
    <div className="flex-1 overflow-y-auto flex-col bg-white overflow-hidden">
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
              Lời mời kết bạn ({receivedUsers.length || 0})
            </span>
          </div>
          <div className="flex justify-content-between">
            {receivedUsers?.length > 0 ? (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {receivedUsers.map((item: any) => (
                  <UserRequestCart
                    key={item.friendId}
                    item={item}
                    handelAccept={() => handelAccept(item.friendId)}
                    handelReject={handelReject}
                  />
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
              Lời mời đã gửi ({sendUsers.length || 0})
            </span>
          </div>
          <div className="flex justify-content-between">
            {sendUsers?.length > 0 ? (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sendUsers.map((item: any) => (
                  <UserSendCart
                    key={item.friendId}
                    item={item}
                    handelRecall={handelRecall}
                  />
                ))}
              </div>
            ) : (
              <div className="flex-1 flex-column justify-content-center align-items-center text-center"></div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-5">
            <span className="text-[16px] font-semibold text-gray-800">
              Gợi ý kết bạn ({suggestUsers.length || 0})
            </span>
          </div>
          <div className="flex justify-content-between">
            {suggestUsers?.length > 0 ? (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestUsers.map((item: any) => (
                  <UserSuggestCart
                    key={item.friendId}
                    item={item}
                    handelAddFriend={handelAddFriend}
                    handelSkip={handelSkip}
                  />
                ))}
              </div>
            ) : (
              <div className="flex-1 flex-column justify-content-center align-items-center text-center"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactRequest;
