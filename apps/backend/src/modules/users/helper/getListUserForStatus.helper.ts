import { FriendStatus } from '@zalo-clone/shared-types';
import { User } from '../schemas/user.schema';
import { Model } from 'mongoose';
import { StorageService } from '../../../common/storage/storage.service';

export async function getListUserForStatus(
  userModel: Model<User>,
  friendStaus: FriendStatus,
  storageService: StorageService,
  userId: string,
) {
  const users = await userModel
    .findOne({
      _id: userId,
      'friends.status': friendStaus,
    })
    .select({ friends: 1 })
    .populate({
      path: 'friends.friendId',
      select: 'profile.name profile.avatarUrl',
    })
    .lean();

  const friends = users?.friends?.map((f) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const friend = f.friendId as any;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const avatarKey = friend?.profile?.avatarUrl || '';
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      id: friend._id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      name: friend.profile?.name,
      avatarUrl: avatarKey ? storageService.signFileUrl(avatarKey) : null,
    };
  });

  return { friends };
}
