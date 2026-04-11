import { FriendStatus } from 'src/common/types/enums/friend-status';
import { User } from '../schemas/user.schema';
import { Model } from 'mongoose';

export async function updateFriendStatus(
  userModel: Model<User>,
  userId: string,
  friendId: string,
  newStatus: FriendStatus,
) {
  return await userModel.findOneAndUpdate(
    {
      _id: userId,
      'friends.friendId': friendId,
    },
    {
      $set: {
        friendId: friendId,
        'friends.$.status': newStatus,
      },
    },
    { new: true },
  );
}
