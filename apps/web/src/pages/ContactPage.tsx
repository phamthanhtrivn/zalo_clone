import { Users, Search, ArrowUpDown } from "lucide-react";
import { userService } from "../services/user.service.ts";
import { useEffect, useState } from "react";
import { FriendItem } from "../components/layout/FriendItem.tsx";

const ContactPage = () => {
  const [friends, setFriends] = useState<any>([]);
  const [keyword, setKeyword] = useState<string>("");

  useEffect(() => {
    const getFriends = async () => {
      const data = await userService.getListFriends();
      if (data?.data?.users) {
        setFriends(data.data.users);
      }
    };
    getFriends();
  }, []);

  useEffect(() => {
    if (!keyword) return;
    const timer = setTimeout(async () => {
      try {
        const data = await userService.searchFriend(keyword);
        if (data?.data?.users) {
          setFriends(data.data.users);
        }
      } catch (err) {
        console.log(err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const countFriends = () => {
    const count = friends?.reduce((sum: number, item: any) => {
      return sum + item.friends.length;
    }, 0);
    return count;
  };

  const handelSort = (value: string) => {
    const sorted = [...friends].map((group) => ({
      ...group,
      friends: [...group.friends].sort((a, b) =>
        value === "a-z"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name),
      ),
    }));

    sorted.sort((a, b) =>
      value === "a-z" ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key),
    );

    setFriends(sorted);
  };

  const handelSearch = (value: string) => {
    setKeyword(value);
  };

  console.log("friends : ", friends);

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

        <div className="flex-1 bg-white rounded-xl p-4">
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
                className="flex-1 outline-none border-none focus:ring-0"
              >
                <option value="a-z">A-Z</option>
                <option value="z-a">Z-A</option>
              </select>
            </div>
          </div>

          {friends?.length == 0 && friends ? (
            <div className="flex-1 flex-col items-center justify-center p-4 text-center">
              <Users className="w-20 h-20 mx-auto opacity-20" />
              <p className="text-2xl">Hiện tại bạn chưa có bạn bè</p>
            </div>
          ) : (
            friends.map((item: any) => (
              <FriendItem key={item.key} item={item} setFriends={setFriends} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
