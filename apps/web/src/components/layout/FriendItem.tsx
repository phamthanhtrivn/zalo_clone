import { MoreHorizontal } from "lucide-react";
import AppAvatar from "../common/AppAvatar";
import { useState } from "react";
import { userService } from "@/services/user.service";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { conversationService } from "@/services/conversation.service";
import { toast } from "react-toastify";
import FriendProfileModal from "./FriendProfileModal";

export const FriendItem = ({ item, setFriends }: any) => {
  const [openId, setOpenId] = useState<string>("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string>("");
  const navigate = useNavigate();
  const userId = useSelector((item: any) => item.auth.user.userId);

  const handleStartConversation = async (targetUserId: string) => {
    try {
      const response =
        await conversationService.getOrCreateDirect(targetUserId);
      const conversationId =
        response?.data?._id || response?.data?.conversationId || response?._id;

      if (!conversationId) return;

      setOpenId("");
      navigate(`/conversations/${conversationId}`);
    } catch (error) {
      console.log(error);
    }
  };

  const handelBock = (id: string) => {
    const blockFriend = async () => {
      try {
        const data = await userService.blockFriend(id, userId);
        if (data.data) {
          setFriends((prev: any) =>
            prev
              .map((group: any) => ({
                ...group,
                friends: group.friends.filter(
                  (friend: any) => friend.friendId !== id,
                ),
              }))
              .filter((group: any) => group.friends.length > 0),
          );
          toast.success("Chặn bạn thành công !");
        }
      } catch (err) {
        console.log(err);
      }
    };
    blockFriend();
  };

  const handelDeleteFriend = (id: string) => {
    const deleteFriend = async () => {
      try {
        const data = await userService.cancelFriend(id, userId);
        if (data.data) {
          setFriends((prev: any) =>
            prev
              .map((group: any) => ({
                ...group,
                friends: group.friends.filter(
                  (friend: any) => friend.friendId !== id,
                ),
              }))
              .filter((group: any) => group.friends.length > 0),
          );
          toast.success("Xóa bạn thành công !");
        }
      } catch (err) {
        console.log(err);
      }
    };
    deleteFriend();
  };

  const handleOpenProfile = (friendId: string) => {
    setSelectedFriendId(friendId);
    setIsProfileOpen(true);
    setOpenId("");
  };

  const handleMessageFromProfile = async () => {
    if (!selectedFriendId) return;
    await handleStartConversation(selectedFriendId);
    setIsProfileOpen(false);
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
          className="mb-2 flex items-center justify-between rounded-lg px-2 py-3 hover:bg-gray-50"
        >
          <div
            className="flex items-center gap-3"
            onClick={() => handleStartConversation(f.friendId)}
          >
            <AppAvatar
              src={f?.avatarUrl}
              name={f?.name || "User"}
              className="w-12 h-12"
            />
            <p className="font-medium">{f?.name}</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenId(openId == f.friendId ? "" : f.friendId)}
            >
              <MoreHorizontal className="text-gray-500" />
            </button>
            {openId === f.friendId && (
              <div className="absolute right-0 -mt-0.5 w-48 rounded-xl border bg-white shadow-lg">
                <div className="cursor-pointer p-3 hover:bg-gray-50">
                  <button onClick={() => handleOpenProfile(f.friendId)}>
                    Xem thông tin
                  </button>
                </div>
                <div className="cursor-pointer p-3 hover:bg-gray-50">
                  <button onClick={() => handleStartConversation(f.friendId)}>
                    Nhắn tin
                  </button>
                </div>
                {/* <div className="cursor-pointer p-0">
                  <CategoryFilterButton
                    variant="inline"
                  />
                </div> */}
                <div className="cursor-pointer p-3 hover:bg-gray-50">
                  <button onClick={() => handelBock(f.friendId)}>
                    Chặn người này
                  </button>
                </div>
                <div className="cursor-pointer p-3 text-red-500 hover:bg-gray-50">
                  <button onClick={() => handelDeleteFriend(f.friendId)}>
                    Xóa bạn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      <FriendProfileModal
        open={isProfileOpen}
        profileId={selectedFriendId}
        onClose={() => setIsProfileOpen(false)}
        onMessage={handleMessageFromProfile}
      />
    </div>
  );
};
