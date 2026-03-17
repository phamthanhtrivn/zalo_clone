import { MoreHorizontal } from "lucide-react";
import { useState} from "react";

export const FriendItem = ({ item }: any) => {
  const [openId, setOpenId] = useState<string>("");


  return (
    <div key={item.key}>
      <div>
        <span className="text-[16px] font-semibold text-gray-800">
          {item.key}
        </span>
      </div>
      {item.friends.map((f: any) => (
        <div
          key={f.id}
          className="flex items-center justify-between px-2 py-3 hover:bg-gray-50 rounded-lg mb-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden">
              <img
                src={
                  f?.avatarUrl ||
                  "data:image/jpeg;base64,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"
                }
                className="w-full h-full object-fit-contain"
              />
            </div>
            <p className="font-medium">{f?.name}</p>
          </div>

          <div className="relative" >
            <button onClick={() => setOpenId(openId === f.id ? "" : f.id)}>
              <MoreHorizontal className="text-gray-500" />
            </button>
            {openId === f.id && (
              <div className="absolute right-0 -mt-0.5 w-48 bg-white border rounded-xl shadow-lg">
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  Xem thông tin
                </div>
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  Phân loại
                </div>
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  Đặt tên gợi nhớ
                </div>
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  Chặn người này
                </div>
                <div className="p-3 text-red-500 hover:bg-gray-50 cursor-pointer">
                  Xóa bạn
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
