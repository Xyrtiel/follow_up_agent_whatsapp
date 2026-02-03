import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema ({ timestamps: true })
export class Message extends Document {
    @Prop({ required: true })
    contact_id: string;

    @Prop({ required: true })
    contenu_message: string;

    @Prop({ required: true, default: Date.now })
    delai_attente: Date;

}

export const MessageSchema = SchemaFactory.createForClass(Message);