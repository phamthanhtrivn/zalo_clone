import { forwardRef, Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from '../chat/chat.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Knowledge, KnowledgeSchema } from './schema/knowledge.schema';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ChatModule),
    MongooseModule.forFeature([
      { name: Knowledge.name, schema: KnowledgeSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
