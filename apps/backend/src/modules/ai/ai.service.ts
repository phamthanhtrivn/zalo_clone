import {
  BadGatewayException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('ai.api_key'),
      baseURL: this.configService.get('ai.base_url'),
      // Mấy cái này OpenRouter nó bắt buộc để định danh app
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Zola Zola', //
      },
    });
  }

  async chatStreamAndEmit(
    prompt: string,
    targetId: string,
    history?: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string> {
    try {
      const stream = await this.chatStream(prompt, history);

      let fullResponse = '';
      let isFirstChunk = true;

      for await (const chunk of stream) {
        const contentChunk = chunk.choices[0]?.delta?.content || '';
        if (!contentChunk) continue;

        if (isFirstChunk) {
          await this.chatGateway.emitAiStatus(targetId, 'typing');
          isFirstChunk = false;
        }

        fullResponse += contentChunk;
        //gửi từng đoạn tin nhắn của AI xuống fe để stream ra.
        await this.chatGateway.emitAiChunk(targetId, contentChunk, false);
      }
      //gửi sự kiện kết thúc
      await this.chatGateway.emitAiChunk(targetId, '', true);
      return fullResponse;
    } catch (error) {
      console.error('Lỗi AiService:', error);
      await this.chatGateway.emitAiStatus(targetId, null);
      throw error;
    }
  }

  async chatStream(
    prompt: string,
    history?: { role: 'user' | 'assistant'; content: string }[],
  ) {
    try {
      return await this.openai.chat.completions.create({
        model: this.configService.get<string>('ai.model')!,
        temperature: 0.5,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: `Bạn là Zola AI - một người bạn thân thiện trong ứng dụng Zola Zola. 
              Hãy trò chuyện tự nhiên, gần gũi như bạn bè, và điều chỉnh ngữ điệu theo thái độ của người dùng. 
              TRÁNH sử dụng bảng biểu trừ khi người dùng yêu cầu rõ ràng. 
              Nếu tóm tắt, tuyệt đối đừng làm bảng tóm tắt, hãy dùng văn bản trôi chảy.`,
          },
          ...(history?.length ? history : []),
          { role: 'user', content: prompt },
        ],
        stream: true,
      });
    } catch (error) {
      console.error('Lỗi stream:', error);
      throw new BadGatewayException('Máy chủ Ai tạm thời không thể truy cập.');
    }
  }
}
