/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    ConversationSetting,
    ConversationSettingDocument
} from './schemas/conversation-setting.schema';
import { Model, Types } from 'mongoose';
@Injectable()
export class ConversationSettingsService {
    constructor(
        @InjectModel(ConversationSetting.name)
        private readonly conversationSettingModel: Model<ConversationSettingDocument>,
    ) { }

    // Ẩn cuộc hội thoại
    async hideConversation(
        userId: Types.ObjectId,
        conversationId: Types.ObjectId) {
        const setting = await this.conversationSettingModel.findOneAndUpdate(
            {
                userId,
                conversationId,
            },
            {
                $set: { hidden: true },
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
            },
        );
        return setting;
    }
    // Bổ ẩn
    async unhideConversation(
        userId: Types.ObjectId,
        conversationId: Types.ObjectId) {
        const setting = await this.conversationSettingModel.findOneAndUpdate(
            { userId, conversationId },
            { $set: { hidden: false } },
            { new: true }
        );
        if (!setting) {
            throw new Error('Conversation setting not found');
        }
        return setting;
    }
    // Gim cuộc hội thoại
    async pinConversation(
        userId: Types.ObjectId,
        conversationId: Types.ObjectId) {
        const setting = await this.conversationSettingModel.findOneAndUpdate(
            { userId, conversationId },
            { $set: { pinned: true } },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
            }
        );

        return setting;
    }
    // Bỏ gim
    async unpinConversation(
        userId: Types.ObjectId,
        conversationId: Types.ObjectId) {
        const setting = await this.conversationSettingModel.findOneAndUpdate(
            { userId, conversationId },
            { $set: { pinned: false } },
            { new: true }
        );
        if (!setting) {
            throw new Error('Conversation setting not found');
        }
        return setting;

    }
    // Tắt thông báo
    async muteConversation(
        userId: Types.ObjectId,
        conversationId: Types.ObjectId,
        duration: number
    ) {
        if (duration === undefined || duration === null) {
            throw new BadRequestException("Duration is required");
        }

        const now = new Date();
        let mutedUntil: Date;

        if (duration === -1) {

            mutedUntil = new Date("2999-12-31");
        } else if (duration === -2) {

            const target = new Date();

            target.setHours(8, 0, 0, 0);

            if (now >= target) {
                target.setDate(target.getDate() + 1);
            }

            mutedUntil = target;
        } else {
            mutedUntil = new Date(Date.now() + duration * 60 * 1000);
        }
        const setting = await this.conversationSettingModel.findOneAndUpdate(
            { userId, conversationId },
            {
                $set: { mutedUntil }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
            }
        );

        return setting;
    }
    // Bật thông báo
    async unmuteConversation(
        userId: Types.ObjectId,
        conversationId: Types.ObjectId) {
        const setting = await this.conversationSettingModel.findOneAndUpdate(
            { userId, conversationId },
            { $set: { mutedUntil: null } },
            { new: true }
        );
        if (!setting) {
            throw new Error('Conversation setting not found');
        }
        return setting;
    }


    // Phân loại hội thoại
    async setCategory(
        userId: Types.ObjectId,
        conversationId: Types.ObjectId,
        category: string | null
    ) {
        const validCategories = [
            'customer',
            'family',
            'work',
            'friends',
            'later',
            'colleague'
        ];

        if (category !== null && !validCategories.includes(category)) {
            throw new BadRequestException('Invalid category');
        }

        const setting = await this.conversationSettingModel.findOneAndUpdate(
            { userId, conversationId },
            { $set: { category } }, // 👈 cho phép null
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
            }
        );

        return setting;
    }
}

