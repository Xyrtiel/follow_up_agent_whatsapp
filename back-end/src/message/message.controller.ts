import {
    Controller,
    Get,
    Post, 
    Body,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';   
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('message')
export class MessageController {
    constructor(private readonly messageService: MessageService) {}
    
    @Post()
    async create(@Body() createMessageDto: CreateMessageDto) {
        return this.messageService.createMessage(createMessageDto);
    }

    @Get()
    async findAll() {
        return this.messageService.getAllMessages();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.messageService.getMessageById(id);
    }
}