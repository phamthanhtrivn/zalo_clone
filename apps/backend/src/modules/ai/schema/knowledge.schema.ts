import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Knowledge {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ type: [Number], required: true }) // Mảng số thực 1536 chiều
  embedding!: number[];

  @Prop()
  category!: string;
}
export const KnowledgeSchema = SchemaFactory.createForClass(Knowledge);
