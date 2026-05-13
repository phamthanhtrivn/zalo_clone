import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { Post, PostSchema, Comment, CommentSchema } from './schemas/post.schema';
import {
    SocialNotification,
    SocialNotificationSchema,
} from './schemas/social-notification.schema';
import { StorageModule } from 'src/common/storage/storage.module';
import { SpotifyService } from './spotify.service';
import { RedisModule } from 'src/common/redis/redis.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Post.name, schema: PostSchema },
            { name: Comment.name, schema: CommentSchema },
            { name: SocialNotification.name, schema: SocialNotificationSchema },
        ]),
        StorageModule,
        RedisModule,
        ConversationsModule,
        MessagesModule,
    ],
    controllers: [SocialController],
    providers: [SocialService, SpotifyService],
    exports: [SocialService],
})
export class SocialModule { }
