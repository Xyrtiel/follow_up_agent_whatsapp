import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from './message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessageService {
    constructor(@InjectModel(Message.name) private messageModel: Model<Message>) {}

    async createMessage(createMessageDto: CreateMessageDto): Promise<Message> {
        const newMessage = new this.messageModel(createMessageDto);
        return newMessage.save();
    }

    async getAllMessages(): Promise<Message[]> {
        return this.messageModel.find().exec();
    }

    async getMessageById(id: string): Promise<Message | null> {
        return this.messageModel.findById(id).exec();
    }

}
