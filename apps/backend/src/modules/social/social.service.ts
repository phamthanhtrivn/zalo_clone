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
            {
                $lookup: {
                    from: 'users',
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
                    reactions: '$reactions',
                    comments: '$commentCount',
                    createdAt: 1,
                    name: '$author.profile.name',
                    avatar: '$author.profile.avatarUrl'
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        return posts.map(post => {
            const reactionCounts: Record<string, number> = {};
            let myReaction: string | null = null;

            for (const r of (post.reactions || [])) {
                reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
                if (r.userId?.toString() === userId) {
                    myReaction = r.type;
                }
            }

            return {
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
                likes: (post.reactions || []).length,
                reactionCounts,
                myReaction,
                comments: post.comments || 0,
                createdAt: post.createdAt,
                music: post.music,
                location: post.location,
            };
        });
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

        await post.save();

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
        const comment = await this.commentModel.findOneAndDelete({
            _id: new Types.ObjectId(commentId),
            userId: new Types.ObjectId(userId),
        }).lean();

        if (!comment) throw new NotFoundException('Bình luận không tồn tại hoặc không có quyền xoá');

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