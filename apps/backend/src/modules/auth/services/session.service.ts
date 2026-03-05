import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Session } from '../schemas/session.schem';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<Session>,
  ) {}

  async create(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    device?: string,
  ) {
    return await this.sessionModel.create({
      userId,
      refreshToken,
      expiresAt,
      device,
    });
  }

  async findValidSession(userId: string, refreshToken: string) {
    const sessions = await this.sessionModel.find({
      userId: new Types.ObjectId(userId),
    });

    for (const session of sessions) {
      console.log(session.refreshToken);
      const match = await bcrypt.compare(refreshToken, session.refreshToken);
      if (match) {
        return session;
      }
    }
    return null;
  }

  async remove(userId: string, refreshToken: string) {
    const sessions = await this.sessionModel.find({ userId });

    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refreshToken)) {
        await this.sessionModel.deleteOne({ _id: session.id });
        return;
      }
    }
  }
  async removeByDevice(userId: string, device: string) {
    await this.sessionModel.deleteMany({ userId, device });
  }
}
