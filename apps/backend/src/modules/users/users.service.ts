import {
  Injectable,
  Body,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { RequestFriendDto } from './dto/request-friend.dto';
import { updateFriendStatus } from './helper/updateFriendStatus.helper';
import { checkFriendStatus } from './helper/checkFriendStaus.helper';
import { SearchFriendDto } from './dto/search-friend.dto';
import { generateSuggestFriends } from './helper/generateSuggestFriends.helper';
import { InforUser } from './dto/infor-user.dto';
import { flattenObject } from './helper/flattenObject.helper';
import { StorageService } from '../../common/storage/storage.service';
import { getListUserForStatus } from './helper/getListUserForStatus.helper';
import { format } from './helper/format.helper';
import * as bcrypt from 'bcrypt';
import { Gender } from 'src/common/types/enums/gender';
import { FriendStatus } from 'src/common/types/enums/friend-status';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly storageService: StorageService,
  ) {}

  async findByPhone(phone: string) {
    return this.userModel.findOne({ phone: phone }).exec();
  }

  async findById(userId: string) {
    return this.userModel.findById(userId);
  }

  async createRegister(
    phone: string,
    name: string,
    gender: Gender,
    birthday: Date,
    pass: string,
  ) {
    const password = await bcrypt.hash(pass, 10);
    const profile = {
      name,
      gender,
      birthday,
    };

    return this.userModel.create({
      phone,
      profile,
      password,
    });
  }

  async checkMatchPassword(
    phone: string,
    oldPassword: string,
  ): Promise<boolean> {
    const user = await this.userModel.findOne({ phone });
    if (!user) {
      throw new BadRequestException('User không tồn tại');
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      throw new BadRequestException([
        { field: 'oldPassword', error: 'Mật khẩu cũ không chính xác!' },
      ]);
    }
    return true;
  }

  async updatePassword(phone: string, password: string) {
    const hashedPass = await bcrypt.hash(password, 10);

    return await this.userModel.updateOne(
      { phone },
      { $set: { password: hashedPass } },
    );
  }

  createTestUser(body: any) {
    return this.userModel.create(body);
  }
  // [POST] /api/users/add-friend
  async addFriend(body: RequestFriendDto) {
    const { userId, friendId } = body;

    const check = await checkFriendStatus(
      this.userModel,
      userId,
      friendId,
      FriendStatus.PENDING,
    );
    // Gui yeu cau lai lan nua
    if (check) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await updateFriendStatus(
        this.userModel,
        friendId,
        userId,
        FriendStatus.REQUESTED,
      );
      return { userId, friendId };
    }

    await this.userModel.findByIdAndUpdate(
      userId,
      {
        $push: {
          friends: {
            friendId: friendId,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            status: FriendStatus.PENDING,
          },
        },
      },
      { new: true },
    );
    await this.userModel.findByIdAndUpdate(friendId, {
      $push: {
        friends: {
          friendId: userId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          status: FriendStatus.REQUESTED,
        },
      },
    });
    return { userId, friendId };
  }
  // [POST] /api/users/accept-friend
  async acceptFriend(body: RequestFriendDto) {
    const { userId, friendId } = body;

    const check = await checkFriendStatus(
      this.userModel,
      userId,
      friendId,
      FriendStatus.REQUESTED,
    );
    if (check) {
      // update status user
      await updateFriendStatus(
        this.userModel,
        userId,
        friendId,
        FriendStatus.ACCEPTED,
      );
      // update status friend
      await updateFriendStatus(
        this.userModel,
        friendId,
        userId,
        FriendStatus.ACCEPTED,
      );
      return { userId, friendId };
    }
  }
  // [POST] /api/users/reject-friend
  async rejectFriend(body: RequestFriendDto) {
    const { userId, friendId } = body;

    const check = await checkFriendStatus(
      this.userModel,
      userId,
      friendId,
      FriendStatus.REQUESTED,
    );
    if (check) {
      await updateFriendStatus(
        this.userModel,
        userId,
        friendId,
        FriendStatus.REJECTED,
      );
      return { userId, friendId };
    }
  }
  //  [POST] /api/users/block-friend
  async blockFriend(body: RequestFriendDto) {
    const { userId, friendId } = body;
    await updateFriendStatus(
      this.userModel,
      userId,
      friendId,
      FriendStatus.BLOCKED,
    );
    await updateFriendStatus(
      this.userModel,
      friendId,
      userId,
      FriendStatus.BLOCKED_BY_OTHER,
    );
    return { userId, friendId };
  }
  //  [POST] /api/users/cancel-friend
  async cancelFriend(body: RequestFriendDto) {
    const { userId, friendId } = body;
    await this.userModel.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        $pull: {
          friends: {
            friendId: friendId,
          },
        },
      },
    );
    await this.userModel.findOneAndUpdate(
      {
        _id: friendId,
      },
      {
        $pull: {
          friends: {
            friendId: userId,
          },
        },
      },
    );
    return { userId, friendId };
  }
  // [POST] /api/users/search-friend
  async searchFriend(body: SearchFriendDto) {
    const { userId, key } = body;
    const users = await this.userModel
      .find({
        $or: [
          {
            phone: key,
          },
          {
            $and: [
              { 'friends.friendId': userId },
              { 'friends.status': FriendStatus.ACCEPTED },
              { 'profile.name': { $regex: `${key}`, $options: 'i' } },
            ],
          },
        ],
      })
      .select({ _id: true, profile: true });

    const userMap = users?.map((item) => {
      return {
        _id: item._id,
        name: item.profile?.name,
        avatarUrl: this.storageService.signFileUrl(
          item.profile?.avatarUrl ? item.profile?.avatarUrl : '',
        ),
      };
    });

    const usersFormat = format(userMap);

    return { users: usersFormat };
  }
  // [POST] /api/users/suggest-friend
  async suggestFriend(userId: string) {
    // id ung cu vien co the kb
    const candidatesIds = await generateSuggestFriends(this.userModel, userId);
    const friendsUser = await this.userModel
      .findOne({ _id: userId })
      .select({ friends: 1 })
      .lean();
    // chuyen ve set giam do phuc tap
    const userFriendSet = new Set(
      friendsUser?.friends?.map((f) => f.friendId.toString()) ?? [],
    );
    // ung cu vien co the kb
    const candidates = await this.userModel
      .find({ _id: { $in: candidatesIds } })
      .lean();
    const result: {
      friendId: string;
      name: string;
      avatarUrl: string;
      score: number;
    }[] = [];

    // lay toan bo id cua ban chung
    const allMutualIds = new Set<string>();

    for (const item of candidates) {
      for (const f of item.friends ?? []) {
        if (userFriendSet.has(f.friendId.toString())) {
          allMutualIds.add(f.friendId.toString());
        }
      }
    }
    const mutualUsers = await this.userModel
      .find({ _id: { $in: Array.from(allMutualIds) } })
      .select({ friends: 1 })
      .lean();

    const degreeMap = new Map<string, number>();

    for (const u of mutualUsers) {
      degreeMap.set(u._id.toString(), u.friends?.length ?? 1);
    }

    for (const item of candidates) {
      let score = 0;
      for (const f of item.friends || []) {
        const fid = f.friendId.toString();
        // kiem tra co ban chung k
        if (userFriendSet.has(fid)) {
          const degree = degreeMap.get(fid) ?? 1;
          if (degree > 1) {
            score += 1 / Math.log(degree);
          }
        }
      }
      result.push({
        friendId: item._id.toString(),
        name: item.profile?.name || '',
        avatarUrl:
          this.storageService.signFileUrl(item.profile?.avatarUrl ?? '') || '',
        score: score,
      });
    }
    result.sort((a, b) => b.score - a.score);
    return result;
  }
  async updateInformationUser(
    body: InforUser,
    file?: Express.Multer.File,
    id?: string,
  ) {
    const data = body;
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (file) {
      if (user.profile?.avatarUrl) {
        await this.storageService.deleteFile(user.profile.avatarUrl);
      }
      const uploadResult = await this.storageService.uploadFile(file);

      data.profile = {
        ...data.profile,
        avatarUrl: uploadResult.fileKey,
      };
    }
    const newData = flattenObject(data);
    let record = await this.userModel
      .findByIdAndUpdate(id, { $set: newData }, { new: true })
      .lean();
    const imageUrl = this.storageService.signFileUrl(
      record?.profile?.avatarUrl ? record?.profile?.avatarUrl : '',
    );

    record = {
      ...record!,
      profile: {
        ...record!.profile,
        name: record!.profile?.name || '',
        avatarUrl: imageUrl || '',
      },
    };

    return record;
  }

  async getListFriends(userId: string) {
    const users = await getListUserForStatus(
      this.userModel,
      FriendStatus.ACCEPTED,
      this.storageService,
      userId,
    );
    const userFormat = format(users);
    return { users: userFormat };
  }
  async getReceivedFriendRequests(userId: string) {
    const users = await getListUserForStatus(
      this.userModel,
      FriendStatus.REQUESTED,
      this.storageService,
      userId,
    );
    return { users };
  }
  async getSentFriendRequests(userId: string) {
    const users = await getListUserForStatus(
      this.userModel,
      FriendStatus.PENDING,
      this.storageService,
      userId,
    );
    return { users };
  }
  async getUserInformation(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select({ phone: 1, profile: 1, email: 1 })
      .lean();
    if (!user) {
      return null;
    }

    const avatarKey = user.profile?.avatarUrl;

    const data = {
      ...user,
      profile: {
        ...user.profile,
        avatarUrl: avatarKey ? this.storageService.signFileUrl(avatarKey) : '',
      },
    };

    return data;
  }
}
