import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';   
import { ContactService } from './contact.service';
import { etat_contact } from './contact.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller('contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) {}
    
    @Post()
    async create(@Body() createContactDto: CreateContactDto) {
        return this.contactService.createContact(createContactDto.name, createContactDto.numero_telephone);
    }

    @Get(':numero_telephone')
    async findOne(@Param('numero_telephone') numero_telephone: string) {
        return this.contactService.findContactByPhone(numero_telephone);
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('etat_contact') etat_contact: etat_contact
    ) {
        return this.contactService.updateContactStatus(id, etat_contact);
    }  

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.contactService.removeContact(id);
    }
}