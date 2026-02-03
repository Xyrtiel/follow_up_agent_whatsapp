import {
    IsString,
    IsIn,
    IsNotEmpty, 
    IsMongoId,
    IsDate
} from 'class-validator';

export class CreateMessageDto {
    @IsString()
    @IsNotEmpty()
    contenu_message: string;

    @IsDate()
    @IsNotEmpty()
    delai_envoi: Date;

    @IsMongoId()
    @IsNotEmpty()
    contact_id: string;
}