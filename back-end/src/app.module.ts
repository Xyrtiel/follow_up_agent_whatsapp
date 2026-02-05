import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactSchema } from './contact/contact.schema';
import { MessageSchema } from './message/message.schema';
import { WhatsAppService } from './twillio_app/send_whatsapp_message';
import { WhatsAppAgentService } from './twillio_app/whatsapp-agent.service';
import { WhatsAppReceiverController } from './twillio_app/receive_whatsapp_message';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Build a resilient MongoDB connection string from available env vars
    // Prefer MONGO_URI (set by docker-compose), fall back to DATABASE_URL
    // If APP_DB_USER is provided, prefer using that credential and service hostname 'mongodb'
    (() => {
      const defaultDb = 'follow_up_agent_db';
      let mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL || `mongodb://appuser:apppassword@localhost:27017/${defaultDb}`;

      // If an application-specific DB user is provided, construct a URI for the internal docker network
      if (process.env.APP_DB_USER && process.env.APP_DB_PASSWORD && process.env.MONGO_INITDB_DATABASE) {
        mongoUri = `mongodb://${process.env.APP_DB_USER}:${process.env.APP_DB_PASSWORD}@mongodb:27017/${process.env.MONGO_INITDB_DATABASE}`;
      }

      // Ensure authSource=admin is present when connecting with root credentials
      if (!/authSource=/i.test(mongoUri)) {
        mongoUri += (mongoUri.includes('?') ? '&' : '?') + 'authSource=admin';
      }

      return MongooseModule.forRoot(mongoUri, {
        dbName: process.env.MONGO_INITDB_DATABASE || defaultDb,
        // keep defaults for other mongoose options; connection retries are handled by Nest/Mongoose
      });
    })(),
    MongooseModule.forFeature([
      { name: 'Contact', schema: ContactSchema },
      { name: 'Message', schema: MessageSchema },
    ]),
  ],
  controllers: [AppController, WhatsAppReceiverController],
  providers: [AppService, WhatsAppService, WhatsAppAgentService],
})
export class AppModule {}
