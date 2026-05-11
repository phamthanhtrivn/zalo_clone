import { Users, Search, ArrowUpDown } from "lucide-react";
import { userService } from "../services/user.service.ts";
import { useEffect, useMemo, useState } from "react";
import { FriendItem } from "../components/layout/FriendItem.tsx";
import { useSelector } from "react-redux";
import { useSocket } from "@/contexts/SocketContext.tsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const ContactPage = () => {
  const [keyword, setKeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const userId = useSelector((item: any) => item.auth.user.userId);
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [sortOrder, setSortOrder] = useState<string>("a-z");

  // Debounce keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Fetch friends with React Query
  const { data: friendsData, isLoading } = useQuery({
    queryKey: ["friends", debouncedKeyword, userId],
    queryFn: async () => {
      const res = await userService.searchFriend(debouncedKeyword, userId);
      return res?.data?.users || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache trong 5 phút
  });

  const setFriends = (updater: any) => {
    queryClient.setQueryData(["friends", debouncedKeyword, userId], (old: any) => {
      if (typeof updater === "function") {
        return updater(old);
      }
      return updater;
    });
  };

  const friends = useMemo(() => {
    let data = [...(friendsData || [])];
    if (sortOrder) {
      data = data.map((group) => ({
        ...group,
        friends: [...group.friends].sort((a, b) =>
          sortOrder === "a-z"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name),
        ),
      }));

      data.sort((a, b) =>
        sortOrder === "a-z" ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key),
      );
    }
    return data;
  }, [friendsData, sortOrder]);

  const countFriends = () => {
    return friendsData?.reduce((sum: number, item: any) => {
      return sum + (item.friends?.length || 0);
    }, 0);
  };

  const handelSort = (value: string) => {
    setSortOrder(value);
  };

  const handelSearch = (value: string) => {
    setKeyword(value);
  };

  useEffect(() => {
    if (!socket) return;
    const updateAvatar = (data: any) => {
      queryClient.setQueryData(["friends", debouncedKeyword, userId], (old: any) => {
        if (!old) return old;
        return old.map((group: any) => ({
          ...group,
          friends: group.friends.map((friend: any) =>
            friend.friendId === data.userId
              ? {
                ...friend,
                name: data.name ?? friend.name,
                avatarUrl: data.avatarUrl ?? friend.avatarUrl,
              }
              : friend,
          ),
        }));
      });
    };

    const handleCancelFriendRequest = (friendId: string) => {
      queryClient.setQueryData(["friends", debouncedKeyword, userId], (old: any) => {
        if (!old) return old;
        return old
          .map((group: any) => ({
            ...group,
            friends: group.friends.filter(
              (friend: any) => friend.friendId !== friendId,
            ),
          }))
          .filter((group: any) => group.friends.length > 0);
      });
    };

    socket.on("update_profile", updateAvatar);
    socket.on("cancel_friend_request", handleCancelFriendRequest);
    return () => {
      socket.off("update_profile", updateAvatar);
      socket.off("cancel_friend_request", handleCancelFriendRequest);
    };
  }, [socket, queryClient, debouncedKeyword, userId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-[64px] border-b border-[#e5e7eb] flex items-center px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-gray-600" />
          <h1 className="text-[16px] font-semibold text-gray-800">
            Danh sách bạn bè
          </h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col bg-gray-200 px-5 pt-5">
        <div className="mb-4">
          <span className="text-[16px] font-semibold text-gray-800">
            Bạn bè ({countFriends() || 0})
          </span>
        </div>

        <div className="flex-1 bg-white rounded-md p-4 flex flex-col h-[600px]">
          {/* 1. Phần Search & Sort: Giữ nguyên nhưng bọc trong một div để cố định phía trên */}
          <div className="flex gap-4 mb-6">
            {/* SEARCH */}
            <div className="flex flex-1 items-center bg-white px-3 py-2 rounded-lg border">
              <Search size={18} className="text-gray-400" />
              <input
                onChange={(e) => handelSearch(e.target.value)}
                className="ml-2 outline-none w-full"
                placeholder="Tìm bạn"
              />
            </div>

            {/* SORT */}
            <div className="w-[30%] flex items-center gap-2 bg-white px-4 py-2 border rounded-lg cursor-pointer">
              <ArrowUpDown size={18} />
              <select
                onChange={(e) => handelSort(e.target.value)}
                className="flex-1 outline-none border-none focus:ring-0 cursor-pointer"
              >
                <option value="a-z">A-Z</option>
                <option value="z-a">Z-A</option>
              </select>
            </div>
          </div>

          {/* 2. Phần Danh sách: Thêm overflow-y-auto và flex-1 để nó chiếm hết phần còn lại */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {friends?.length === 0 && friends ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Users className="w-20 h-20 mx-auto opacity-20" />
                <p className="text-2xl text-gray-400 mt-4">
                  Hiện tại bạn chưa có bạn bè
                </p>
              </div>
            ) : (
              friends.map((item: any, index: number) => (
                <FriendItem key={index} item={item} setFriends={setFriends} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
