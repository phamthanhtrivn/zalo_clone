import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { LocalStrategy } from './passport/local.strategy';
import { PassportModule } from '@nestjs/passport';
import { TokenService } from '../../common/jwt-token/jwt.service';
import { JwtStrategy } from './passport/jwt.stratege';
import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from './schemas/session.schem';
import { SessionService } from './services/session.service';
import { TokenModule } from 'src/common/jwt-token/jwt.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    UsersModule,
    PassportModule,
    JwtModule.register({
      global: true,
    }),
    TokenModule,
    ChatModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, SessionService],
})
export class AuthModule {}
