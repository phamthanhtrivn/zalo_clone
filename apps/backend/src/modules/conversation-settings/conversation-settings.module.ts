import { Module } from '@nestjs/common';
import { ConversationSettingsService } from './conversation-settings.service';
import { ConversationSettingsController } from './conversation-settings.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ConversationSetting,
  ConversationSettingSchema,
} from './schemas/conversation-setting.schema';
import { ConversationSettingGateway } from './conversation-setting.gateway';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConversationSetting.name, schema: ConversationSettingSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [ConversationSettingsService, ConversationSettingGateway],
  controllers: [ConversationSettingsController],
})
export class ConversationSettingsModule { }
