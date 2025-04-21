// src/index.ts
import express, { Request, Response } from 'express';
import { PrismaClient } from './generated/prisma/index.js';
import { Contact, ContactResponse, IdentifyRequest } from './types';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/identify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phoneNumber }: IdentifyRequest = req.body;

    // Validate that at least one identifier is provided
    if (!email && !phoneNumber) {
      res.status(400).json({ error: 'At least one of email or phoneNumber is required' });
      return;
    }

   // Find all contacts that matches either email or phone number
   // Create new contact or update existing contact
   // at last , format the contact and return the response
    
    res.status(200).json();
  } catch (error) {
    console.error('Error processing identify request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});