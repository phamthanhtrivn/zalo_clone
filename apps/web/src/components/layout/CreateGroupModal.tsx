import { useEffect, useMemo, useState } from "react";
import { conversationService } from "@/services/conversation.service";
import { userService } from "@/services/user.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Friend = {
  friendId: string;
  name: string;
  avatarUrl?: string;
};

type FriendGroup = {
  key: string;
  friends: Friend[];
};

export type CreateGroupModalMode = "CREATE_GROUP" | "ADD_MEMBER";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: CreateGroupModalMode;
  /** Bắt buộc khi mode === ADD_MEMBER */
  conversationId?: string;
  /** Ẩn bạn đã có trong nhóm (theo userId) */
  excludeUserIds?: string[];
  onCreated?: () => void;
  onMembersAdded?: () => void;
};

const CreateGroupModal = ({
  open,
  onOpenChange,
  mode = "CREATE_GROUP",
  conversationId,
  excludeUserIds = [],
  onCreated,
  onMembersAdded,
}: Props) => {
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const excludeSet = useMemo(
    () => new Set(excludeUserIds.filter(Boolean)),
    [excludeUserIds],
  );

  const visibleFriends = useMemo(
    () => friends.filter((f) => !excludeSet.has(f.friendId)),
    [friends, excludeSet],
  );

  useEffect(() => {
    if (!open) return;

    const loadFriends = async () => {
      try {
        setIsLoadingFriends(true);
        const response = await userService.getListFriends();
        const groups: FriendGroup[] = response?.data?.users || [];
        const flattened = groups.flatMap((group) => group.friends || []);
        setFriends(flattened);
      } catch (error) {
        setFriends([]);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    loadFriends();
  }, [open]);

  const canSubmit = useMemo(() => {
    if (mode === "ADD_MEMBER") {
      return selectedMemberIds.length >= 1;
    }
    return groupName.trim().length > 0 && selectedMemberIds.length >= 2;
  }, [mode, groupName, selectedMemberIds.length]);

  const toggleMember = (friendId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    if (mode === "ADD_MEMBER") {
      const cid = String(conversationId ?? "").trim();
      const userIds = [...selectedMemberIds]
        .map((id) => String(id).trim())
        .filter(Boolean);
      if (!cid || userIds.length === 0) return;
      try {
        setIsSubmitting(true);
        await conversationService.addMembers(cid, userIds);
        setSelectedMemberIds([]);
        onOpenChange(false);
        onMembersAdded?.();
      } catch (error) {
        console.error(error);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      setIsSubmitting(true);
      await conversationService.createGroup({
        name: groupName.trim(),
        memberIds: selectedMemberIds,
      });

      setGroupName("");
      setSelectedMemberIds([]);
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setGroupName("");
      setSelectedMemberIds([]);
    }
  };

  const isAddMember = mode === "ADD_MEMBER";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>
            {isAddMember ? "Thêm thành viên vào nhóm" : "Tạo nhóm mới"}
          </DialogTitle>
          <DialogDescription>
            {isAddMember
              ? "Chọn ít nhất một bạn bè để thêm vào nhóm."
              : "Nhập tên nhóm và chọn ít nhất 2 bạn bè để tạo nhóm."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isAddMember && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên nhóm</label>
              <Input
                placeholder="Nhập tên nhóm"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-medium">Danh sách bạn bè</div>
            <div className="max-h-72 overflow-y-auto rounded-md border p-2">
              {isLoadingFriends && (
                <p className="p-2 text-sm text-gray-500">
                  Đang tải danh sách bạn bè...
                </p>
              )}

              {!isLoadingFriends && visibleFriends.length === 0 && (
                <p className="p-2 text-sm text-gray-500">
                  {friends.length === 0
                    ? "Không có bạn bè để chọn."
                    : "Không còn bạn bè nào có thể thêm (đã tham gia nhóm)."}
                </p>
              )}

              {!isLoadingFriends &&
                visibleFriends.map((friend) => (
                  <label
                    key={friend.friendId}
                    className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(friend.friendId)}
                      onChange={() => toggleMember(friend.friendId)}
                    />
                    <img
                      src={friend.avatarUrl || ""}
                      alt={friend.name}
                      className="h-8 w-8 rounded-full object-cover bg-gray-100"
                    />
                    <span className="text-sm">{friend.name}</span>
                  </label>
                ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting
              ? isAddMember
                ? "Đang thêm..."
                : "Đang tạo..."
              : isAddMember
                ? "Thêm"
                : "Tạo nhóm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;
