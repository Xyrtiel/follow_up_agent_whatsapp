import { IsString, IsIn, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateContactDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    numero_telephone: string;

    @IsString()
    @IsIn(
        [
            'FOLLOWED_UP',
            'FOLLOWED_UP_REMINDER',
            'ACCEPTED',
            'NOT_CONTACTED',
            'INVALID_CONTACT'
        ],
        { message: 'Le statut fourni n\'est pas valide.' }
    )
    etat_contact: string;

    @IsNotEmpty()
    @IsMongoId()
    id?: string;
    
}   