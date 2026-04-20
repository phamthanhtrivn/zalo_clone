import { FriendStatus } from 'src/common/types/enums/friend-status';
import { User } from '../schemas/user.schema';
import { Model } from 'mongoose';

export async function checkFriendStatus(
  userModel: Model<User>,
  userId: string,
  friendId: string,
  newStatus: FriendStatus,
) {
  return await userModel.findOne(
    {
      _id: userId,
      friends: {
        $elemMatch: {
          friendId: friendId,
          status: newStatus,
        },
      },
    },
    { new: true },
  );
}
