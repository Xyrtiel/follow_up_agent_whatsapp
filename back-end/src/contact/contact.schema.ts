import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum etat_contact {
    FOLLOWED_UP = 'FOLLOWED_UP',
    FOLLOWED_UP_REMINDER = 'FOLLOWED_UP_REMINDER',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    NOT_CONTACTED = 'NOT_CONTACTED',
    INVALID_CONTACT = 'INVALID_CONTACT',
    UNSUBSCRIBED = 'UNSUBSCRIBED'
}

@Schema({timestamps: true})
export class Contact extends Document {
    @Prop({required: true})
    name: string;

    @Prop({required: true, unique: true})
    numero_telephone: string;

    @Prop({type: String, enum: Object.values(etat_contact), default: etat_contact.NOT_CONTACTED, required: true})
    etat_contact: etat_contact;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);