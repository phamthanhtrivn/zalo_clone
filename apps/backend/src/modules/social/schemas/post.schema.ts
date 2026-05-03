import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
class MediaItem {
    @Prop({ required: true })
    url: string;

    @Prop({ enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' })
    type: string;
}

@Schema({ timestamps: true })
export class Post extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    authorId: Types.ObjectId;

    @Prop({ enum: ['USER', 'STORE'], default: 'USER' })
    authorType: string;

    @Prop({
        type: {
            text: String,
            media: [SchemaFactory.createForClass(MediaItem)],
        },
    })
    content: {
        text?: string;
        media: MediaItem[];
    };

    @Prop({ enum: ['PUBLIC', 'FRIENDS', 'PRIVATE'], default: 'PUBLIC' })
    visibility: string;

    @Prop({
        type: [
            {
                userId: { type: Types.ObjectId, ref: 'User' },
                type: { type: String, enum: ['LIKE', 'HEART', 'HAHA', 'SAD'], default: 'LIKE' },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        default: [],
    })
    reactions: any[];

    @Prop({ default: 0 })
    commentCount: number;
}

@Schema({ timestamps: true })
export class Comment extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
    postId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    content: string;

    @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
    parentId: Types.ObjectId;
}

export const PostSchema = SchemaFactory.createForClass(Post);
export const CommentSchema = SchemaFactory.createForClass(Comment);