import { Module } from '@nestjs/common';
import { ConversationSettingsService } from './conversation-settings.service';
import { ConversationSettingsController } from './conversation-settings.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ConversationSetting,
  ConversationSettingSchema,
} from './schemas/conversation-setting.schema';
import { ConversationSettingGateway } from './conversation-setting.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConversationSetting.name, schema: ConversationSettingSchema },
    ]),
  ],
  providers: [ConversationSettingsService, ConversationSettingGateway],
  controllers: [ConversationSettingsController],
})
export class ConversationSettingsModule { }
