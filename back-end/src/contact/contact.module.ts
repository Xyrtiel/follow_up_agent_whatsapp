import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {ContactService} from './contact.service';
import {ContactController} from './contact.controller';
import {Contact, ContactSchema} from './contact.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{name: Contact.name, schema: ContactSchema}]),
    ],
    controllers: [ContactController],
    exports: [MongooseModule],
    providers: [ContactService],
})
export class ContactModule {}