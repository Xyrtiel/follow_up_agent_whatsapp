import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Contact, etat_contact } from "./contact.schema";

@Injectable()
export class ContactService {
    constructor(@InjectModel(Contact.name) private contactModel: Model<Contact>) {}

    async createContact(name: string, numero_telephone: string): Promise<Contact> {
        const newContact = new this.contactModel({ name, numero_telephone });
        return newContact.save();
    }

    async findContactByPhone(numero_telephone: string): Promise<Contact | null> {
        return this.contactModel.findOne({ numero_telephone }).exec();
    }

    async findAll(): Promise<Contact[]> {
        return this.contactModel.find().exec();
    }

    async updateContactStatus(id: string, status: etat_contact): Promise<Contact | null> {
        return this.contactModel.findByIdAndUpdate(id, { etat_contact: status }, { new: true }).exec();
    }

    async removeContact(id: string): Promise<Contact | null> {
        return this.contactModel.findByIdAndRemove(id).exec();
    }
}