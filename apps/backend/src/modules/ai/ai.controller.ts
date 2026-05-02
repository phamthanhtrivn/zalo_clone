import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { Public } from 'src/common/decorator/is-public.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @Public()
  async chatWithAI(@Body('message') message: string) {
    const response = await this.aiService.chat(message);
    return {
      success: true,
      data: response,
    };
  }
}
