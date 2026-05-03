import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { StorageService } from '../../common/storage/storage.service';
import { ChatModule } from '../chat/chat.module';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ChatModule,
  ],
  providers: [UsersService, StorageService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
