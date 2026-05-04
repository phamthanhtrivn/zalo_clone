/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, Comment } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { StorageService } from 'src/common/storage/storage.service';
import { SpotifyService } from './spotify.service';

@Injectable()
export class SocialService {
    constructor(
        @InjectModel(Post.name) private postModel: Model<Post>,
        @InjectModel(Comment.name) private commentModel: Model<Comment>,
        private readonly storageService: StorageService,
        private readonly spotifyService: SpotifyService,
    ) { }

    // ================= CREATE POST =================
    async createPost(userId: string, dto: CreatePostDto, files: Express.Multer.File[]) {

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

            content: {
                text: dto.text,
                media,
            },

            visibility: dto.visibility || 'PUBLIC',

            // 🔥 NEW FEATURES
            location: dto.location,
            music: dto.music,
            taggedFriends: dto.taggedFriends?.map(id => new Types.ObjectId(id)) || [],
            fontStyle: dto.fontStyle,
            fontColor: dto.fontColor,
        });
    }

    // ================= FEED =================
    async getFeed(userId: string) {
        const user = await this.postModel.db
            .collection('users')
            .findOne({ _id: new Types.ObjectId(userId) });

        const friendIds =
            user?.friends
                ?.filter((f) => f.status === 'ACCEPTED')
                ?.map((f) => f.friendId) || [];

        const posts = await this.postModel.aggregate([
            {
                $match: {
                    $or: [
                        { visibility: 'PUBLIC' },
                        {
                            visibility: 'FRIENDS',
                            authorId: { $in: friendIds.map(id => new Types.ObjectId(id)) }
                        },
                        {
                            visibility: 'PRIVATE',
                            authorId: new Types.ObjectId(userId)
                        }
                    ]
                }
            },

            // JOIN USER
            {
                $lookup: {
                    from: 'users', // collection name
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'author'
                }
            },

            { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    id: '$_id',
                    authorId: '$authorId',
                    text: '$content.text',
                    media: '$content.media',
                    likes: { $size: { $ifNull: ['$reactions', []] } },
                    comments: '$commentCount',
                    createdAt: 1,

                    name: '$author.profile.name',
                    avatar: '$author.profile.avatarUrl'
                }
            },

            { $sort: { createdAt: -1 } }
        ]);

        return posts.map(post => ({
            id: post.id.toString(),
            authorId: post.authorId?.toString(),
            name: post.name || 'User',
            avatar: post.avatar
                ? this.storageService.signFileUrl(post.avatar)
                : '',
            text: post.text || '',
            images: (post.media || []).map(m =>
                this.storageService.signFileUrl(m.url)
            ),
            likes: post.likes || 0,
            comments: post.comments || 0,
            createdAt: post.createdAt,
            music: post.music,
            location: post.location,
        }));
    }

    // ================= REACTION =================
    async toggleReaction(postId: string, userId: string, type: string) {
        const post = await this.postModel.findById(postId);
        if (!post) throw new NotFoundException();

        const index = post.reactions.findIndex(
            (r) => r.userId.toString() === userId,
        );

        if (index > -1) {
            if (post.reactions[index].type === type) {
                post.reactions.splice(index, 1);
            } else {
                post.reactions[index].type = type;
            }
        } else {
            post.reactions.push({
                userId: new Types.ObjectId(userId),
                type,
            });
        }

        return post.save();
    }

    // ================= COMMENT =================
    async addComment(postId: string, userId: string, content: string, parentId?: string) {
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

        const user = populated.userId as any;

        return {
            id: comment._id,
            content: comment.content,
            parentId: comment.parentId,
            user: {
                id: user._id,
                name: user.profile?.name || '',
                avatar: user.profile?.avatarUrl
                    ? this.storageService.signFileUrl(user.profile.avatarUrl)
                    : '',
            },
        };
    }

    // ================= GET COMMENTS =================
    async getComments(postId: string) {
        const comments = await this.commentModel
            .find({ postId })
            .populate('userId', 'profile.name profile.avatarUrl')
            .sort({ createdAt: 1 })
            .lean();

        return comments.map((c: any) => ({
            id: c._id,
            content: c.content,
            parentId: c.parentId,
            createdAt: c.createdAt,
            user: {
                id: c.userId?._id,
                name: c.userId?.profile?.name,
                avatar: c.userId?.profile?.avatarUrl
                    ? this.storageService.signFileUrl(
                        c.userId.profile.avatarUrl,
                    )
                    : '',
            },
        }));
    }
    searchTrack(query: string) {
        return this.spotifyService.searchTrack(query);
    }


}