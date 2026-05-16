/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, Comment } from './schemas/post.schema';
import { SocialNotification } from './schemas/social-notification.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { StorageService } from 'src/common/storage/storage.service';
import { SpotifyService } from './spotify.service';
import { RedisService } from 'src/common/redis/redis.service';
import { REDIS_CHANNEL_SOCKET_EVENTS } from 'src/common/constants/redis.constant';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class SocialService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(SocialNotification.name)
    private socialNotificationModel: Model<SocialNotification>,
    private readonly storageService: StorageService,
    private readonly spotifyService: SpotifyService,
    private readonly redisService: RedisService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
  ) {}

  private toObjectId(value: string) {
    return new Types.ObjectId(value);
  }

  private async getUserProfileBasic(userId: string) {
    const user = await this.postModel.db
      .collection('users')
      .findOne(
        { _id: new Types.ObjectId(userId) },
        { projection: { profile: 1 } },
      );

    return {
      name: user?.profile?.name || 'User',
      avatar: user?.profile?.avatarUrl
        ? this.storageService.signFileUrl(user.profile.avatarUrl)
        : '',
    };
  }

  private normalizeObjectIdList(values: any[] = []) {
    return values.map((value) => new Types.ObjectId(String(value)));
  }

  private isAcceptedFriend(user: any, otherUserId: string) {
    return Boolean(
      user?.friends?.some(
        (friend: any) =>
          String(friend.friendId) === String(otherUserId) &&
          friend.status === 'ACCEPTED',
      ),
    );
  }

  private buildSignedMedia(
    media: Array<{ url: string; type: 'IMAGE' | 'VIDEO' }> = [],
  ) {
    return media.map((item) => ({
      type: item.type,
      url: this.storageService.signFileUrl(item.url),
    }));
  }

  private async emitSocialNotification(
    targetUserId: string,
    actorUserId: string,
    payload: {
      type: 'POST_COMMENT' | 'POST_REACTION' | 'STORY_REACTION' | 'STORY_REPLY';
      title: string;
      body: string;
      postId?: string;
      storyId?: string;
    },
  ) {
    if (!targetUserId || String(targetUserId) === String(actorUserId)) {
      return;
    }

    const actor = await this.getUserProfileBasic(actorUserId);

    const created = await this.socialNotificationModel.create({
      userId: new Types.ObjectId(targetUserId),
      actorUserId: new Types.ObjectId(actorUserId),
      type: payload.type,
      title: payload.title,
      body: payload.body,
      actorName: actor.name,
      actorAvatar: actor.avatar,
      postId: payload.postId ? new Types.ObjectId(payload.postId) : null,
      storyId: payload.storyId ? new Types.ObjectId(payload.storyId) : null,
    });

    await this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
      room: targetUserId,
      event: 'social:notification',
      data: {
        id: String(created._id),
        ...payload,
        actorUserId,
        actorName: actor.name,
        actorAvatar: actor.avatar,
        readAt: null,
        createdAt: created.createdAt?.toISOString() || new Date().toISOString(),
      },
    });
  }

  async getNotifications(userId: string) {
    const rows = await this.socialNotificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return rows.map((row: any) => ({
      id: String(row._id),
      type: row.type,
      title: row.title,
      body: row.body,
      actorUserId: row.actorUserId?.toString?.() || '',
      actorName: row.actorName || 'User',
      actorAvatar: row.actorAvatar || '',
      postId: row.postId?.toString?.() || null,
      storyId: row.storyId?.toString?.() || null,
      readAt: row.readAt || null,
      createdAt: row.createdAt,
    }));
  }

  async markNotificationRead(notificationId: string, userId: string) {
    const notification = await this.socialNotificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      { readAt: new Date() },
      { new: true },
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return { success: true, readAt: notification.readAt };
  }

  async getPostDetail(postId: string, viewerId: string) {
    const viewer = await this.userModel
      .findById(viewerId)
      .select('friends hiddenSocialAuthorIds')
      .lean();

    const friendIds =
      viewer?.friends
        ?.filter((f: any) => f.status === 'ACCEPTED')
        ?.map((f: any) => new Types.ObjectId(f.friendId)) || [];
    const hiddenAuthorIds = new Set(
      (viewer?.hiddenSocialAuthorIds || []).map((id: any) => String(id)),
    );

    const post = await this.postModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(postId),
          $or: [{ postType: 'POST' }, { postType: { $exists: false } }],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      { $limit: 1 },
    ]);

    const found = post[0];
    if (!found) {
      throw new NotFoundException('Post not found');
    }

    if (hiddenAuthorIds.has(String(found.authorId))) {
      throw new NotFoundException('Post not found');
    }

    const blockedViewers = new Set(
      (found.author?.blockedDiaryViewerIds || []).map((id: any) => String(id)),
    );
    if (blockedViewers.has(String(viewerId))) {
      throw new ForbiddenException('No permission');
    }

    const isMine = String(found.authorId) === String(viewerId);
    const isFriend = friendIds.some(
      (friendId: Types.ObjectId) => String(friendId) === String(found.authorId),
    );

    const canView =
      found.visibility === 'PUBLIC' ||
      isMine ||
      (found.visibility === 'FRIENDS' && isFriend);

    if (!canView) {
      throw new ForbiddenException('No permission');
    }

    const reactionCounts: Record<string, number> = {};
    let myReaction: string | null = null;

    for (const reaction of found.reactions || []) {
      reactionCounts[reaction.type] = (reactionCounts[reaction.type] || 0) + 1;
      if (reaction.userId?.toString() === viewerId) {
        myReaction = reaction.type;
      }
    }

    return {
      id: String(found._id),
      authorId: String(found.authorId),
      name: found.author?.profile?.name || 'User',
      avatar: found.author?.profile?.avatarUrl
        ? this.storageService.signFileUrl(found.author.profile.avatarUrl)
        : '',
      text: found.content?.text || '',
      images: (found.content?.media || []).map((media: any) =>
        this.storageService.signFileUrl(media.url),
      ),
      visibility: found.visibility || 'PUBLIC',
      likes: (found.reactions || []).length,
      reactionCounts,
      myReaction,
      comments: found.commentCount || 0,
      createdAt: found.createdAt,
      music: found.music || null,
      location: found.location || null,
    };
  }

  // ================= CREATE POST =================
  async createPost(
    userId: string,
    dto: CreatePostDto,
    files: Express.Multer.File[],
  ) {
    // 🔥 parse JSON từ multipart
    if (dto.location) {
      dto.location = JSON.parse(dto.location as any);
    }

    if (dto.music) {
      dto.music = JSON.parse(dto.music as any);
    }

    if (dto.taggedFriends) {
      dto.taggedFriends = JSON.parse(dto.taggedFriends as any);
    }

    const media: { url: string; type: 'IMAGE' | 'VIDEO' }[] = [];

    if (files?.length) {
      for (const file of files) {
        const upload = await this.storageService.uploadFile(file);
        media.push({
          url: upload.fileKey,
          type: file.mimetype.startsWith('video') ? 'VIDEO' : 'IMAGE',
        });
      }
    }

    return this.postModel.create({
      authorId: new Types.ObjectId(userId),
      postType: 'POST',
      content: {
        text: dto.text,
        media,
      },
      visibility: dto.visibility || 'PUBLIC',
      location: dto.location,
      music: dto.music,
      taggedFriends:
        dto.taggedFriends?.map((id) => new Types.ObjectId(id)) || [],
      fontStyle: dto.fontStyle,
      fontColor: dto.fontColor,
    });
  }

  async createVideoPost(
    userId: string,
    dto: CreatePostDto,
    files: Express.Multer.File[],
  ) {
    if (dto.location) {
      dto.location = JSON.parse(dto.location as any);
    }

    if (dto.music) {
      dto.music = JSON.parse(dto.music as any);
    }

    if (dto.taggedFriends) {
      dto.taggedFriends = JSON.parse(dto.taggedFriends as any);
    }

    if (!files?.length) {
      throw new BadRequestException('Video is required');
    }

    const firstVideo = files.find((file) => file.mimetype.startsWith('video'));
    if (!firstVideo) {
      throw new BadRequestException('Invalid video file');
    }

    const upload = await this.storageService.uploadFile(firstVideo);

    return this.postModel.create({
      authorId: new Types.ObjectId(userId),
      postType: 'POST',
      content: {
        text: dto.text || '',
        media: [
          {
            url: upload.fileKey,
            type: 'VIDEO',
          },
        ],
      },
      visibility: dto.visibility || 'PUBLIC',
      location: dto.location || null,
      music: dto.music || null,
      taggedFriends:
        dto.taggedFriends?.map((id: string) => new Types.ObjectId(id)) || [],
      fontStyle: dto.fontStyle,
      fontColor: dto.fontColor,
    });
  }

  // ================= FEED =================
  async getFeed(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('friends hiddenSocialAuthorIds')
      .lean();

    const friendIds =
      user?.friends
        ?.filter((f) => f.status === 'ACCEPTED')
        ?.map((f) => f.friendId) || [];
    const friendObjectIds = friendIds.map((id) => new Types.ObjectId(id));
    const hiddenAuthorObjectIds = this.normalizeObjectIdList(
      user?.hiddenSocialAuthorIds || [],
    );

    const posts = await this.postModel.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [{ postType: 'POST' }, { postType: { $exists: false } }],
            },
            {
              $or: [
                { visibility: 'PUBLIC' },
                { authorId: new Types.ObjectId(userId) },
                {
                  authorId: { $in: friendObjectIds },
                  visibility: { $in: ['PUBLIC', 'FRIENDS'] },
                },
                {
                  authorId: new Types.ObjectId(userId),
                  visibility: 'PRIVATE',
                },
              ],
            },
            {
              authorId: { $nin: hiddenAuthorObjectIds },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { 'author.blockedDiaryViewerIds': { $exists: false } },
            {
              'author.blockedDiaryViewerIds': {
                $nin: [new Types.ObjectId(userId)],
              },
            },
          ],
        },
      },
      {
        $project: {
          id: '$_id',
          authorId: '$authorId',
          text: '$content.text',
          media: '$content.media',
          visibility: '$visibility',
          music: '$music',
          location: '$location',
          reactions: '$reactions',
          comments: '$commentCount',
          shareCount: '$shareCount',
          createdAt: 1,
          name: '$author.profile.name',
          avatar: '$author.profile.avatarUrl',
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return posts.map((post) => {
      const reactionCounts: Record<string, number> = {};
      let myReaction: string | null = null;

      for (const r of post.reactions || []) {
        reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
        if (r.userId?.toString() === userId) {
          myReaction = r.type;
        }
      }

      const signedMedia = this.buildSignedMedia(post.media || []);
      const firstVideo = signedMedia.find((item) => item.type === 'VIDEO');

      return {
        id: post.id.toString(),
        authorId: post.authorId?.toString(),
        name: post.name || 'User',
        avatar: post.avatar ? this.storageService.signFileUrl(post.avatar) : '',
        text: post.text || '',
        media: signedMedia,
        images: signedMedia
          .filter((item) => item.type === 'IMAGE')
          .map((item) => item.url),
        videoUrl: firstVideo?.url || '',
        visibility: post.visibility || 'PUBLIC',
        likes: (post.reactions || []).length,
        reactionCounts,
        myReaction,
        comments: post.comments || 0,
        shares: post.shareCount || 0,
        createdAt: post.createdAt,
        music: post.music,
        location: post.location,
      };
    });
  }

  async getVideoFeed(
    userId: string,
    category?: string,
    feedType?: string,
    authorId?: string,
  ) {
    const viewerObjectId = new Types.ObjectId(userId);
    const user = await this.userModel
      .findById(userId)
      .select('friends hiddenSocialAuthorIds followingVideoCreatorIds')
      .lean();

    const friendIds =
      user?.friends
        ?.filter((f) => f.status === 'ACCEPTED')
        ?.map((f) => f.friendId) || [];
    const friendObjectIds = friendIds.map((id) => new Types.ObjectId(id));
    const hiddenAuthorObjectIds = this.normalizeObjectIdList(
      user?.hiddenSocialAuthorIds || [],
    );
    const followingAuthorIds = new Set(
      (user?.followingVideoCreatorIds || []).map((id: any) => String(id)),
    );
    const normalizedFeedType = String(feedType || 'for-you')
      .trim()
      .toLowerCase();

    const normalizedCategory = String(category || '')
      .trim()
      .toLowerCase();
    const categoryKeywords: Record<string, string[]> = {
      'cho-ban': [],
      'cong-nghe': [
        'công nghệ',
        'technology',
        'tech',
        'app',
        'ai',
        'code',
        'laptop',
        'điện thoại',
      ],
      'the-thao': [
        'thể thao',
        'sport',
        'gym',
        'bóng',
        'tennis',
        'badminton',
        'chạy bộ',
      ],
      'du-lich': [
        'du lịch',
        'travel',
        'trip',
        'biển',
        'đà lạt',
        'sài gòn',
        'hà nội',
        'kyoto',
      ],
      'am-thuc': [
        'ăn',
        'uống',
        'food',
        'ẩm thực',
        'cafe',
        'quán',
        'nhà hàng',
        'món',
      ],
    };

    const matchedKeywords = categoryKeywords[normalizedCategory] || [];
    const canViewConditions: Record<string, any>[] = [
      { authorId: viewerObjectId },
      { visibility: 'PUBLIC' },
    ];

    if (friendObjectIds.length > 0) {
      canViewConditions.push({
        authorId: { $in: friendObjectIds },
        visibility: 'FRIENDS',
      });
    }

    const posts = await this.postModel.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [{ postType: 'POST' }, { postType: { $exists: false } }],
            },
            {
              'content.media.type': 'VIDEO',
            },
            {
              $or: canViewConditions,
            },
            {
              authorId: { $nin: hiddenAuthorObjectIds },
            },
            ...(authorId ? [{ authorId: new Types.ObjectId(authorId) }] : []),
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { 'author.blockedDiaryViewerIds': { $exists: false } },
            {
              'author.blockedDiaryViewerIds': {
                $nin: [viewerObjectId],
              },
            },
          ],
        },
      },
      {
        $project: {
          id: '$_id',
          authorId: '$authorId',
          text: '$content.text',
          media: '$content.media',
          visibility: '$visibility',
          music: '$music',
          location: '$location',
          reactions: '$reactions',
          comments: '$commentCount',
          shareCount: '$shareCount',
          createdAt: 1,
          name: '$author.profile.name',
          avatar: '$author.profile.avatarUrl',
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 60 },
    ]);

    const mapped = posts
      .map((post: any) => {
        const reactionCounts: Record<string, number> = {};
        let myReaction: string | null = null;

        for (const r of post.reactions || []) {
          reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
          if (r.userId?.toString() === userId) {
            myReaction = r.type;
          }
        }

        const videoMedia =
          (post.media || []).find((m: any) => m.type === 'VIDEO') ||
          (post.media || [])[0];

        const signedVideoUrl = videoMedia?.url
          ? this.storageService.signFileUrl(videoMedia.url)
          : '';

        return {
          id: post.id.toString(),
          authorId: post.authorId?.toString(),
          name: post.name || 'User',
          avatar: post.avatar
            ? this.storageService.signFileUrl(post.avatar)
            : '',
          text: post.text || '',
          videoUrl: signedVideoUrl,
          previewUrl: signedVideoUrl,
          visibility: post.visibility || 'PUBLIC',
          likes: (post.reactions || []).length,
          reactionCounts,
          myReaction,
          comments: post.comments || 0,
          shares: post.shareCount || 0,
          createdAt: post.createdAt,
          music: post.music || null,
          location: post.location || null,
          isFollowing: followingAuthorIds.has(String(post.authorId)),
        };
      })
      .filter((item) => item.videoUrl);

    const scopedItems =
      normalizedFeedType === 'following'
        ? mapped.filter(
            (item) =>
              item.authorId === userId ||
              followingAuthorIds.has(String(item.authorId)),
          )
        : mapped;

    if (!matchedKeywords.length) {
      return scopedItems;
    }

    return scopedItems.filter((item) => {
      const haystack =
        `${item.text || ''} ${item.location?.name || ''} ${item.location?.address || ''}`.toLowerCase();
      return matchedKeywords.some((keyword) => haystack.includes(keyword));
    });
  }

  async getVideoProfile(viewerId: string, targetUserId?: string) {
    const resolvedTargetUserId = targetUserId || viewerId;

    const [viewer, targetUser] = await Promise.all([
      this.userModel
        .findById(viewerId)
        .select('friends followingVideoCreatorIds')
        .lean(),
      this.userModel
        .findById(resolvedTargetUserId)
        .select('profile blockedDiaryViewerIds')
        .lean(),
    ]);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (
      resolvedTargetUserId !== viewerId &&
      (targetUser.blockedDiaryViewerIds || []).some(
        (blockedId: any) => String(blockedId) === String(viewerId),
      )
    ) {
      throw new ForbiddenException('You cannot view this video profile');
    }

    const isOwner = String(resolvedTargetUserId) === String(viewerId);
    const isFriend = this.isAcceptedFriend(viewer, resolvedTargetUserId);
    const isFollowing = Boolean(
      viewer?.followingVideoCreatorIds?.some(
        (id: any) => String(id) === String(resolvedTargetUserId),
      ),
    );

    const visibilityFilter = isOwner
      ? {}
      : isFriend
        ? { visibility: { $in: ['PUBLIC', 'FRIENDS'] } }
        : { visibility: 'PUBLIC' };

    const [posts, followerCount] = await Promise.all([
      this.postModel
        .find({
          authorId: new Types.ObjectId(resolvedTargetUserId),
          $or: [{ postType: 'POST' }, { postType: { $exists: false } }],
          'content.media.type': 'VIDEO',
          ...visibilityFilter,
        })
        .sort({ createdAt: -1 })
        .lean(),
      this.userModel.countDocuments({
        followingVideoCreatorIds: new Types.ObjectId(resolvedTargetUserId),
      }),
    ]);

    const videos = (posts || [])
      .map((post: any) => {
        const videoMedia =
          (post.content?.media || []).find((m: any) => m.type === 'VIDEO') ||
          (post.content?.media || [])[0];

        const reactionCounts: Record<string, number> = {};
        for (const reaction of post.reactions || []) {
          reactionCounts[reaction.type] =
            (reactionCounts[reaction.type] || 0) + 1;
        }

        const videoUrl = videoMedia?.url
          ? this.storageService.signFileUrl(videoMedia.url)
          : '';

        return {
          id: String(post._id),
          authorId: String(post.authorId || resolvedTargetUserId),
          text: post.content?.text || '',
          videoUrl,
          previewUrl: videoUrl,
          createdAt: post.createdAt,
          visibility: post.visibility || 'PUBLIC',
          likes: (post.reactions || []).length,
          comments: post.commentCount || 0,
          shares: post.shareCount || 0,
          reactionCounts,
        };
      })
      .filter((item) => item.videoUrl);

    const totalLikes = videos.reduce((sum, item) => sum + (item.likes || 0), 0);

    return {
      profile: {
        userId: String(targetUser._id),
        name: targetUser?.profile?.name || 'Nguoi dung Zalo',
        avatar: targetUser?.profile?.avatarUrl
          ? this.storageService.signFileUrl(targetUser.profile.avatarUrl)
          : '',
      },
      stats: {
        videoCount: videos.length,
        followerCount,
        totalLikes,
      },
      meta: {
        isOwner,
        isFriend,
        isFollowing,
      },
      videos,
    };
  }

  async followVideoCreator(viewerId: string, targetUserId: string) {
    if (String(viewerId) === String(targetUserId)) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const targetUser = await this.userModel
      .findById(targetUserId)
      .select('_id')
      .lean();
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    await this.userModel.updateOne(
      { _id: new Types.ObjectId(viewerId) },
      {
        $addToSet: {
          followingVideoCreatorIds: new Types.ObjectId(targetUserId),
        },
      },
    );

    const followerCount = await this.userModel.countDocuments({
      followingVideoCreatorIds: new Types.ObjectId(targetUserId),
    });

    return {
      userId: targetUserId,
      isFollowing: true,
      followerCount,
    };
  }

  async unfollowVideoCreator(viewerId: string, targetUserId: string) {
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(viewerId) },
      {
        $pull: {
          followingVideoCreatorIds: new Types.ObjectId(targetUserId),
        },
      },
    );

    const followerCount = await this.userModel.countDocuments({
      followingVideoCreatorIds: new Types.ObjectId(targetUserId),
    });

    return {
      userId: targetUserId,
      isFollowing: false,
      followerCount,
    };
  }

  async createStory(userId: string, dto: any, files: Express.Multer.File[]) {
    const media: { url: string; type: 'IMAGE' | 'VIDEO' }[] = [];

    if (dto.includeUserIds && typeof dto.includeUserIds === 'string') {
      dto.includeUserIds = JSON.parse(dto.includeUserIds);
    }
    if (dto.excludeUserIds && typeof dto.excludeUserIds === 'string') {
      dto.excludeUserIds = JSON.parse(dto.excludeUserIds);
    }
    if (dto.music && typeof dto.music === 'string') {
      dto.music = JSON.parse(dto.music);
    }

    if (files?.length) {
      for (const file of files) {
        const upload = await this.storageService.uploadFile(file);
        media.push({
          url: upload.fileKey,
          type: file.mimetype.startsWith('video') ? 'VIDEO' : 'IMAGE',
        });
      }
    }

    if (media.length === 0 && !dto.text) {
      throw new NotFoundException('Story content is required');
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const mode = (dto.privacyMode || 'friends') as
      | 'friends'
      | 'include'
      | 'exclude'
      | 'private';

    const created = await this.postModel.create({
      authorId: new Types.ObjectId(userId),
      postType: 'STORY',
      content: {
        text: dto.text || '',
        media,
      },
      visibility: mode === 'private' ? 'PRIVATE' : 'FRIENDS',
      music: dto.music || null,
      expiresAt,
      storyPrivacy: {
        mode,
        includeUserIds: (dto.includeUserIds || []).map(
          (id: string) => new Types.ObjectId(id),
        ),
        excludeUserIds: (dto.excludeUserIds || []).map(
          (id: string) => new Types.ObjectId(id),
        ),
      },
    });

    // Realtime: push story:new to author + friends so strip updates without refresh
    const author = await this.postModel.db
      .collection('users')
      .findOne({ _id: new Types.ObjectId(userId) });
    const friendIds: string[] =
      author?.friends
        ?.filter((f: any) => f.status === 'ACCEPTED')
        ?.map((f: any) => String(f.friendId)) || [];
    const targets = Array.from(new Set([userId, ...friendIds]));

    const mediaUri = created.content?.media?.[0]?.url
      ? this.storageService.signFileUrl(created.content.media[0].url)
      : '';
    const authorName = author?.profile?.name || 'User';
    const authorAvatar = author?.profile?.avatarUrl
      ? this.storageService.signFileUrl(author.profile.avatarUrl)
      : '';

    const payload = {
      authorId: userId,
      userName: authorName,
      userAvatar: authorAvatar,
      story: {
        id: created._id.toString(),
        mediaUri,
        mediaType:
          created.content?.media?.[0]?.type ||
          (created.content?.text ? 'TEXT' : 'IMAGE'),
        text: created.content?.text || '',
        music: created.music || null,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
      },
    };

    await Promise.all(
      targets.map((uid) =>
        this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
          room: uid,
          event: 'story:new',
          data: payload,
        }),
      ),
    );

    return created;
  }

  async getStories(viewerId: string) {
    const viewer = await this.userModel
      .findById(viewerId)
      .select('friends hiddenSocialAuthorIds')
      .lean();

    const friendIds: string[] =
      viewer?.friends
        ?.filter((f: any) => f.status === 'ACCEPTED')
        ?.map((f: any) => String(f.friendId)) || [];
    const friendSet = new Set(friendIds);
    const hiddenAuthorSet = new Set(
      (viewer?.hiddenSocialAuthorIds || []).map((id: any) => String(id)),
    );

    const stories = await this.postModel.aggregate([
      {
        $match: {
          postType: 'STORY',
          expiresAt: { $gt: new Date() },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
    ]);

    const canView = (story: any) => {
      const authorId = story.authorId?.toString?.() || String(story.authorId);
      if (authorId === viewerId) return true;
      if (hiddenAuthorSet.has(authorId)) return false;

      const blockedViewers = new Set(
        (story.author?.blockedDiaryViewerIds || []).map((id: any) =>
          String(id),
        ),
      );
      if (blockedViewers.has(String(viewerId))) return false;

      const mode = story.storyPrivacy?.mode || 'friends';
      const include = (story.storyPrivacy?.includeUserIds || []).map(
        (id: any) => id?.toString?.() || String(id),
      );
      const exclude = (story.storyPrivacy?.excludeUserIds || []).map(
        (id: any) => id?.toString?.() || String(id),
      );

      if (story.visibility === 'PUBLIC') return true;
      if (mode === 'private') return false;
      if (mode === 'include') return include.includes(viewerId);
      if (mode === 'exclude') return !exclude.includes(viewerId);
      // default/friends: only friend viewers can watch
      return friendSet.has(authorId);
    };

    const visibleStories = stories.filter(canView);
    const groups = new Map<string, any>();

    for (const s of visibleStories) {
      const authorId = s.authorId.toString();
      const authorName = s.author?.profile?.name || 'User';
      const authorAvatar = s.author?.profile?.avatarUrl
        ? this.storageService.signFileUrl(s.author.profile.avatarUrl)
        : '';
      const mediaUri = s.content?.media?.[0]?.url
        ? this.storageService.signFileUrl(s.content.media[0].url)
        : '';
      const mediaType =
        s.content?.media?.[0]?.type || (s.content?.text ? 'TEXT' : 'IMAGE');
      const reactionCounts: Record<string, number> = {};
      const myReactionTypes: string[] = [];

      for (const reaction of s.storyReactions || []) {
        reactionCounts[reaction.type] =
          (reactionCounts[reaction.type] || 0) + 1;
        if (String(reaction.userId) === String(viewerId)) {
          myReactionTypes.push(reaction.type);
        }
      }
      const reactionSummary = Object.entries(reactionCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      if (!groups.has(authorId)) {
        groups.set(authorId, {
          authorId,
          userName: authorName,
          userAvatar: authorAvatar,
          stories: [],
        });
      }

      groups.get(authorId).stories.push({
        id: s._id.toString(),
        mediaUri,
        mediaType,
        text: s.content?.text || '',
        music: s.music || null,
        viewCount: (s.storyViews || []).length,
        reactionCount: (s.storyReactions || []).length,
        reactionSummary,
        myReactionTypes,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      });
    }

    return Array.from(groups.values());
  }

  async deleteStory(storyId: string, userId: string) {
    const story = await this.postModel.findOne({
      _id: new Types.ObjectId(storyId),
      authorId: new Types.ObjectId(userId),
      postType: 'STORY',
    });
    if (!story) {
      throw new NotFoundException('Story not found or no permission');
    }

    await this.postModel.deleteOne({ _id: story._id });

    const author = await this.postModel.db
      .collection('users')
      .findOne({ _id: new Types.ObjectId(userId) });
    const friendIds: string[] =
      author?.friends
        ?.filter((f: any) => f.status === 'ACCEPTED')
        ?.map((f: any) => String(f.friendId)) || [];
    const targets = Array.from(new Set([userId, ...friendIds]));

    await Promise.all(
      targets.map((uid) =>
        this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
          room: uid,
          event: 'story:deleted',
          data: {
            storyId,
            authorId: userId,
          },
        }),
      ),
    );

    return { success: true };
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.postModel.findOne({
      _id: this.toObjectId(postId),
      postType: 'POST',
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (String(post.authorId) !== String(userId)) {
      throw new ForbiddenException('No permission');
    }

    await Promise.all([
      this.commentModel.deleteMany({ postId: post._id }),
      this.postModel.deleteOne({ _id: post._id }),
    ]);

    return { success: true, postId };
  }

  async updatePostVisibility(
    postId: string,
    userId: string,
    visibility: string,
  ) {
    const allowed = ['PUBLIC', 'FRIENDS', 'PRIVATE'];
    if (!allowed.includes(visibility)) {
      throw new BadRequestException('Invalid visibility');
    }

    const post = await this.postModel.findOne({
      _id: this.toObjectId(postId),
      postType: 'POST',
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (String(post.authorId) !== String(userId)) {
      throw new ForbiddenException('No permission');
    }

    post.visibility = visibility;
    await post.save();

    return {
      success: true,
      postId,
      visibility: post.visibility,
    };
  }

  async hideAuthorFromFeed(postId: string, userId: string) {
    const post = await this.postModel
      .findById(postId)
      .select('authorId postType')
      .lean();
    if (!post || post.postType === 'STORY') {
      throw new NotFoundException('Post not found');
    }

    await this.userModel.updateOne(
      { _id: this.toObjectId(userId) },
      { $addToSet: { hiddenSocialAuthorIds: post.authorId } },
    );

    return {
      success: true,
      hiddenAuthorId: String(post.authorId),
      postId,
    };
  }

  async blockDiaryViewer(postId: string, userId: string) {
    const post = await this.postModel
      .findById(postId)
      .select('authorId postType')
      .lean();
    if (!post || post.postType === 'STORY') {
      throw new NotFoundException('Post not found');
    }

    if (String(post.authorId) === String(userId)) {
      throw new BadRequestException('Cannot block yourself');
    }

    await this.userModel.updateOne(
      { _id: this.toObjectId(userId) },
      { $addToSet: { blockedDiaryViewerIds: post.authorId } },
    );

    return {
      success: true,
      blockedUserId: String(post.authorId),
      postId,
    };
  }

  async reportPost(postId: string, userId: string, reason?: string) {
    const post = await this.postModel.findOne({
      _id: this.toObjectId(postId),
      postType: 'POST',
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existing = (post.reports || []).some(
      (report: any) => String(report.userId) === String(userId),
    );

    if (!existing) {
      post.reports = [
        ...(post.reports || []),
        {
          userId: this.toObjectId(userId),
          reason: (reason || '').trim(),
          createdAt: new Date(),
        } as any,
      ];
      await post.save();
    }

    return {
      success: true,
      postId,
      alreadyReported: existing,
    };
  }

  async markStoryViewed(storyId: string, userId: string) {
    const story = await this.postModel.findOne({
      _id: new Types.ObjectId(storyId),
      postType: 'STORY',
      expiresAt: { $gt: new Date() },
    });
    if (!story) throw new NotFoundException('Story not found');

    const already = (story.storyViews || []).some(
      (v: any) => String(v.userId) === String(userId),
    );
    if (!already) {
      story.storyViews = [
        ...(story.storyViews || []),
        { userId: new Types.ObjectId(userId), viewedAt: new Date() } as any,
      ];
      await story.save();
    }
    return { success: true };
  }

  async getStoryViewers(storyId: string, userId: string) {
    const story = await this.postModel.findOne({
      _id: new Types.ObjectId(storyId),
      postType: 'STORY',
    });
    if (!story) throw new NotFoundException('Story not found');
    if (String(story.authorId) !== String(userId)) {
      throw new ForbiddenException('No permission');
    }

    const viewerIds = (story.storyViews || []).map(
      (v: any) => new Types.ObjectId(v.userId),
    );
    if (!viewerIds.length) return [];
    const users = await this.postModel.db
      .collection('users')
      .find({ _id: { $in: viewerIds } })
      .project({ profile: 1 })
      .toArray();

    const map = new Map(users.map((u: any) => [String(u._id), u]));
    const reactionMap = new Map(
      (story.storyReactions || []).reduce(
        (acc: Map<string, string[]>, reaction: any) => {
          const key = String(reaction.userId);
          const list = acc.get(key) || [];
          list.push(reaction.type);
          acc.set(key, list);
          return acc;
        },
        new Map<string, string[]>(),
      ),
    );
    return (story.storyViews || [])
      .map((v: any) => {
        const u = map.get(String(v.userId));
        const reactionTypes = reactionMap.get(String(v.userId)) || [];
        return {
          userId: String(v.userId),
          name: u?.profile?.name || 'User',
          avatar: u?.profile?.avatarUrl
            ? this.storageService.signFileUrl(u.profile.avatarUrl)
            : '',
          viewedAt: v.viewedAt,
          reactionType: reactionTypes[0] || null,
          reactionTypes,
        };
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime(),
      );
  }

  async reactStory(storyId: string, userId: string, type: string) {
    const allowed = ['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD'];
    if (!allowed.includes(type))
      throw new BadRequestException('Invalid reaction type');
    const story = await this.postModel.findOne({
      _id: new Types.ObjectId(storyId),
      postType: 'STORY',
      expiresAt: { $gt: new Date() },
    });
    if (!story) throw new NotFoundException('Story not found');

    const list: any[] = story.storyReactions || [];
    const idx = list.findIndex(
      (r: any) => String(r.userId) === String(userId) && r.type === type,
    );
    let shouldNotify = true;
    if (idx > -1) {
      list.splice(idx, 1);
      shouldNotify = false;
    } else {
      list.push({
        userId: new Types.ObjectId(userId),
        type,
        createdAt: new Date(),
      });
    }
    story.storyReactions = list as any;
    await story.save();

    if (shouldNotify) {
      await this.emitSocialNotification(String(story.authorId), userId, {
        type: 'STORY_REACTION',
        title: 'Cam xuc moi tren story',
        body: `${type === 'HEART' ? 'Da tha tim' : 'Da tha cam xuc'} vao story cua ban`,
        storyId: String(story._id),
      });
    }

    return { success: true, count: list.length };
  }

  async replyStory(storyId: string, userId: string, content: string) {
    const text = (content || '').trim();
    if (!text) throw new BadRequestException('Reply content is required');
    const story = await this.postModel.findOne({
      _id: new Types.ObjectId(storyId),
      postType: 'STORY',
      expiresAt: { $gt: new Date() },
    });
    if (!story) throw new NotFoundException('Story not found');
    if (String(story.authorId) === String(userId)) {
      throw new BadRequestException('Cannot reply to your own story');
    }

    story.storyReplies = [
      ...(story.storyReplies || []),
      {
        userId: new Types.ObjectId(userId),
        content: text,
        createdAt: new Date(),
      } as any,
    ];
    await story.save();

    const [sender, author] = await Promise.all([
      this.postModel.db
        .collection('users')
        .findOne(
          { _id: new Types.ObjectId(userId) },
          { projection: { profile: 1 } },
        ),
      this.postModel.db
        .collection('users')
        .findOne(
          { _id: new Types.ObjectId(story.authorId) },
          { projection: { profile: 1 } },
        ),
    ]);

    const conversation: any =
      await this.conversationsService.getOrCreateDirectConversation(
        userId,
        String(story.authorId),
      );

    const previewImageKey = story.content?.media?.[0]?.url || '';
    const previewText =
      story.content?.text?.trim() ||
      (story.content?.media?.[0]?.type === 'VIDEO'
        ? 'Da gui mot story video'
        : 'Da gui mot story');

    await this.messagesService.sendStandardMessage({
      senderId: userId,
      conversationId: String(conversation._id),
      content: {
        text,
        storyLink: {
          storyId: String(story._id),
          authorId: String(story.authorId),
          previewText,
          previewImage: previewImageKey
            ? this.storageService.signFileUrl(previewImageKey)
            : '',
        },
      },
    } as any);

    await this.emitSocialNotification(String(story.authorId), userId, {
      type: 'STORY_REPLY',
      title: 'Co phan hoi story moi',
      body: 'da tra loi story cua ban',
      storyId: String(story._id),
    });

    return {
      success: true,
      conversationId: String(conversation._id),
      reply: {
        userId,
        name: sender?.profile?.name || 'User',
        avatar: sender?.profile?.avatarUrl
          ? this.storageService.signFileUrl(sender.profile.avatarUrl)
          : '',
        content: text,
        createdAt: new Date(),
      },
      story: {
        storyId: String(story._id),
        authorId: String(story.authorId),
        authorName: author?.profile?.name || 'User',
      },
    };
  }

  async getStoryMusicSuggestions(q: string) {
    const query = (q || '').trim();
    const matchMusic: any = {
      postType: 'STORY',
      music: { $ne: null },
      expiresAt: { $gt: new Date() },
    };

    if (query) {
      matchMusic.$or = [
        { 'music.title': { $regex: query, $options: 'i' } },
        { 'music.artist': { $regex: query, $options: 'i' } },
      ];
    }

    const rows = await this.postModel.aggregate([
      { $match: matchMusic },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          title: '$music.title',
          artist: '$music.artist',
          thumbnail: '$music.thumbnail',
          previewUrl: '$music.previewUrl',
        },
      },
      {
        $group: {
          _id: {
            title: '$title',
            artist: '$artist',
          },
          title: { $first: '$title' },
          artist: { $first: '$artist' },
          thumbnail: { $first: '$thumbnail' },
          previewUrl: { $first: '$previewUrl' },
        },
      },
      { $limit: 50 },
    ]);

    const fromStories = rows
      .filter((r: any) => r.title || r.artist)
      .map((r: any) => ({
        id: `${r.title || 'song'}-${r.artist || 'artist'}`,
        title: r.title || 'Unknown',
        artist: r.artist || 'Unknown',
        thumbnail: r.thumbnail || '',
        previewUrl: r.previewUrl || '',
      }));

    if (fromStories.length > 0) return fromStories;

    const fallback = await this.spotifyService.searchTrack(query || 'top');
    const fallbackTracks = Array.isArray(fallback?.tracks)
      ? fallback.tracks
      : [];
    return fallbackTracks.map((t: any) => ({
      id: String(t.id),
      title: t.title || 'Unknown',
      artist: t.artist || 'Unknown',
      thumbnail: t.thumbnail || '',
      previewUrl: t.previewUrl || '',
    }));
  }

  // ================= REACTION =================
  async toggleReaction(postId: string, userId: string, type: string) {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException();

    const index = post.reactions.findIndex(
      (r) => r.userId.toString() === userId,
    );
    let shouldNotify = true;

    if (index > -1) {
      if (post.reactions[index].type === type) {
        post.reactions.splice(index, 1);
        shouldNotify = false;
      } else {
        post.reactions[index].type = type;
      }
    } else {
      post.reactions.push({
        userId: new Types.ObjectId(userId),
        type,
      });
    }

    await post.save();

    if (shouldNotify) {
      await this.emitSocialNotification(String(post.authorId), userId, {
        type: 'POST_REACTION',
        title: 'Cam xuc moi tren bai dang',
        body: `${type === 'HEART' ? 'Da tha tim' : 'Da tha cam xuc'} vao bai dang cua ban`,
        postId: String(post._id),
      });
    }

    const reactionCounts: Record<string, number> = {};
    let myReaction: string | null = null;
    for (const r of post.reactions) {
      reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
      if (r.userId?.toString() === userId) {
        myReaction = r.type;
      }
    }

    return {
      postId,
      likes: post.reactions.length,
      reactionCounts,
      myReaction,
    };
  }

  async incrementShareCount(postId: string, userId: string) {
    const post = await this.postModel.findByIdAndUpdate(
      postId,
      { $inc: { shareCount: 1 } },
      { new: true },
    );
    if (!post) throw new NotFoundException();

    await this.emitSocialNotification(String(post.authorId), userId, {
      type: 'POST_REACTION',
      title: 'Bai dang duoc chia se',
      body: 'da chia se bai dang cua ban',
      postId: String(post._id),
    });

    return {
      postId,
      shareCount: post.shareCount || 0,
    };
  }

  // ================= COMMENT =================
  async addComment(
    postId: string,
    userId: string,
    content: string,
    parentId?: string,
  ) {
    const comment = await this.commentModel.create({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
      content,
      parentId: parentId ? new Types.ObjectId(parentId) : null,
    });

    await this.postModel.updateOne(
      { _id: postId },
      { $inc: { commentCount: 1 } },
    );

    const populated = await comment.populate(
      'userId',
      'profile.name profile.avatarUrl',
    );

    const post = await this.postModel.findById(postId).select('authorId');
    if (post) {
      await this.emitSocialNotification(String(post.authorId), userId, {
        type: 'POST_COMMENT',
        title: 'Binh luan moi',
        body: 'da binh luan bai dang cua ban',
        postId: String(post._id),
      });
    }

    const user = populated.userId as any;

    return {
      id: comment._id,
      content: comment.content,
      parentId: comment.parentId,
      createdAt: (comment as any).createdAt,
      user: {
        id: user._id,
        name: user.profile?.name || '',
        avatar: user.profile?.avatarUrl
          ? this.storageService.signFileUrl(user.profile.avatarUrl)
          : '',
      },
    };
  }

  // ================= GET COMMENTS (filtered by friends) =================
  async getComments(postId: string, viewerId: string) {
    // Lấy danh sách bạn bè của viewer
    const viewer = await this.postModel.db
      .collection('users')
      .findOne({ _id: new Types.ObjectId(viewerId) });

    const friendIds: Types.ObjectId[] = (viewer?.friends || [])
      .filter((f: any) => f.status === 'ACCEPTED')
      .map((f: any) => new Types.ObjectId(f.friendId));

    // Thêm chính viewer vào danh sách được phép xem
    friendIds.push(new Types.ObjectId(viewerId));

    const comments = await this.commentModel
      .find({
        postId: new Types.ObjectId(postId),
        userId: { $in: friendIds },
      })
      .populate('userId', 'profile.name profile.avatarUrl')
      .sort({ createdAt: 1 })
      .lean();

    return comments.map((c: any) => ({
      id: c._id,
      content: c.content,
      parentId: c.parentId || null,
      createdAt: c.createdAt,
      user: {
        id: c.userId?._id,
        name: c.userId?.profile?.name || '',
        avatar: c.userId?.profile?.avatarUrl
          ? this.storageService.signFileUrl(c.userId.profile.avatarUrl)
          : '',
      },
    }));
  }

  // ================= DELETE COMMENT =================
  async deleteComment(commentId: string, userId: string) {
    const comment = await this.commentModel
      .findOneAndDelete({
        _id: new Types.ObjectId(commentId),
        userId: new Types.ObjectId(userId),
      })
      .lean();

    if (!comment)
      throw new NotFoundException(
        'Bình luận không tồn tại hoặc không có quyền xoá',
      );

    await this.postModel.updateOne(
      { _id: (comment as any).postId },
      { $inc: { commentCount: -1 } },
    );

    return { success: true };
  }

  searchTrack(query: string) {
    return this.spotifyService.searchTrack(query);
  }
}
