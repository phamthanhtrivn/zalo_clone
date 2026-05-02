import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
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

  async chat(prompt: string) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('ai.model')!,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: 'Bạn là trợ lý trong app chat Zola Zola.',
          },
          { role: 'user', content: prompt },
        ],
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter erorr:', error);
      return 'Lỗi kết nối AI!';
    }
  }

  async chatStream(prompt: string) {
    try {
      return await this.openai.chat.completions.create({
        model: this.configService.get<string>('ai.model')!,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: 'Bạn là trợ lý aỏ trong app chat Zola Zola.',
          },
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
