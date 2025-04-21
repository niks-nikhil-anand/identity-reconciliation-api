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
   const relatedContacts = await findRelatedContacts(email, phoneNumber);



   // Create new contact or update existing contact


   // at last , format the contact and return the response
    
    res.status(200).json();
  } catch (error) {
    console.error('Error processing identify request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


async function findRelatedContacts(email?: string | null, phoneNumber?: string | null): Promise<Contact[]> {
  // Start by finding any contacts that match the email or phoneNumber
  const directlyRelatedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email || undefined },
        { phoneNumber: phoneNumber || undefined }
      ],
      deletedAt: null
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (directlyRelatedContacts.length === 0) {
    return [];
  }

  // Find the primary contacts by checking linkedIds
  const linkedContactIds = directlyRelatedContacts
    .filter((contact): contact is Contact & { linkedId: number } => contact.linkedId !== null)
    .map(contact => contact.linkedId);

  // Get unique primary contact IDs
  const primaryContactIds = [
    ...new Set([
      ...directlyRelatedContacts
        .filter(contact => contact.linkPrecedence === 'primary')
        .map(contact => contact.id),
      ...linkedContactIds
    ])
  ];

  // Get all contacts associated with these primary contacts
  const allRelatedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: { in: primaryContactIds } },
        { linkedId: { in: primaryContactIds as number[] } }
      ],
      deletedAt: null
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  return allRelatedContacts;
}
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});