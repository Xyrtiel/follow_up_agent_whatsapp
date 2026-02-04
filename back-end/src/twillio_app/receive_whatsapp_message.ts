import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
import twilio from 'twilio';
const { twiml } = twilio;

const app = express();

app.post('/whatsapp', express.urlencoded({ extended: false }), (req, res) => {
    const response = new twiml.MessagingResponse();
    response.message('Merci pour votre message! Nous vous répondrons sous peu.');
    res.type('text/xml').send(response.toString());
});

app.listen(3000, () => {
    console.log('Express server listening on port 3000');
});