import { User } from '../schemas/user.schema';
import { Model } from 'mongoose';

export async function generateSuggestFriends(
  userModel: Model<User>,
  userId: string,
) {
  const visited = new Set<string>();
  const users = await userModel.findById(userId).select({ friends: 1 });
  const friendIds: string[] =
    users?.friends?.map((f) => f.friendId.toString()) ?? [];
  const queue: { userId: string; level: number }[] = [];
  for (const id of friendIds) {
    queue.push({ userId: id, level: 1 });
    visited.add(id); // danh dua ban truc tiep
  }
  visited.add(userId); // danh dau userId
  const result: string[] = [];
  while (queue.length > 0) {
    const item = queue.shift()!;
    // Kiem tra da ton va tranh ban truc tiep
    if (item?.level >= 2 && item?.level <= 3) {
      result.push(item?.userId);
    }
    if (item?.level < 3) {
      const users = await userModel
        .findById(item.userId)
        .select({ friends: 1 });

      const friendIds: string[] =
        users?.friends?.map((f) => f.friendId.toString()) ?? [];
      friendIds.forEach((id) => {
        // Kiem tra chua tham
        if (!visited.has(id)) {
          queue.push({ userId: id, level: item.level + 1 });
          visited.add(id); // danh dau da ton tai
        }
      });
    }
  }
  return result;
}
