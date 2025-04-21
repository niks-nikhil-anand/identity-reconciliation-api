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
   const processedContacts = await processContacts(relatedContacts, email, phoneNumber);


   // At last , format the contact and return the response
   const contactResponse = formatContactResponse(processedContacts);


    
   res.status(200).json({ contact: contactResponse });
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


async function processContacts(relatedContacts: Contact[], email?: string | null, phoneNumber?: string | null): Promise<Contact[]> {
  // If no related contacts, create a new primary contact
  if (relatedContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkPrecedence: 'primary'
      }
    });
    return [newContact];
  }

  // Find the primary contact from the related contacts
  const primaryContact = relatedContacts.find(contact => contact.linkPrecedence === 'primary') || relatedContacts[0];
  
  // Check if the provided email and phoneNumber contain new information
  const existingEmails = relatedContacts.map(contact => contact.email).filter(Boolean);
  const existingPhones = relatedContacts.map(contact => contact.phoneNumber).filter(Boolean);
  
  const hasNewEmail = email && !existingEmails.includes(email);
  const hasNewPhone = phoneNumber && !existingPhones.includes(phoneNumber);
  
  // Create a new secondary contact if new information is provided
  if ((hasNewEmail || hasNewPhone) && (email || phoneNumber)) {
    const newContact = await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkedId: primaryContact.id,
        linkPrecedence: 'secondary'
      }
    });
    relatedContacts.push(newContact);
  }
  
  // Handle the case where we need to link previously separate primary contacts
  await consolidatePrimaryContacts(relatedContacts);
  
  return relatedContacts;
}

// Consolidate multiple primary contacts if needed

async function consolidatePrimaryContacts(contacts: Contact[]): Promise<void> {
  const primaryContacts = contacts.filter(contact => contact.linkPrecedence === 'primary');
  
  if (primaryContacts.length <= 1) {
    return; 
  }
  
  // Sort primary contacts by creation date
  primaryContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  
  const oldestPrimary = primaryContacts[0];
  const primaryContactsToConvert = primaryContacts.slice(1);
  
  // Convert other primary contacts to secondary
  for (const contact of primaryContactsToConvert) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        linkedId: oldestPrimary.id,
        linkPrecedence: 'secondary',
        updatedAt: new Date()
      }
    });
    
    // Update all secondary contacts linked to this primary to point to the oldest primary
    await prisma.contact.updateMany({
      where: { linkedId: contact.id },
      data: {
        linkedId: oldestPrimary.id,
        updatedAt: new Date()
      }
    });
    
    // Update the contact object in our array
    contact.linkedId = oldestPrimary.id;
    contact.linkPrecedence = 'secondary';
    
    // Update secondary contacts in our array
    contacts.forEach(c => {
      if (c.linkedId === contact.id) {
        c.linkedId = oldestPrimary.id;
      }
    });
  }
}


// Format the response according to the required structure
function formatContactResponse(contacts: Contact[]): ContactResponse {
 // Re-fetch primary contact after potential consolidation
 const primaryContact = contacts.find(contact => contact.linkPrecedence === 'primary');
 
 if (!primaryContact) {
   throw new Error("Primary contact not found");
 }
 
 const secondaryContacts = contacts.filter(contact => contact.linkPrecedence === 'secondary');
 
 // Collect unique emails and phone numbers
 const allEmails = contacts
   .map(contact => contact.email)
   .filter((email): email is string => email !== null);
 
 const allPhoneNumbers = contacts
   .map(contact => contact.phoneNumber)
   .filter((phone): phone is string => phone !== null);
 
 // Remove duplicates
 const uniqueEmails = [...new Set(allEmails)];
 const uniquePhoneNumbers = [...new Set(allPhoneNumbers)];
 
 // Ensure primary contact's email and phone are first in the lists
 const orderedEmails = [
   ...(primaryContact.email ? [primaryContact.email] : []),
   ...uniqueEmails.filter(email => email !== primaryContact.email)
 ];
 
 const orderedPhoneNumbers = [
   ...(primaryContact.phoneNumber ? [primaryContact.phoneNumber] : []),
   ...uniquePhoneNumbers.filter(phone => phone !== primaryContact.phoneNumber)
 ];
 
 return {
   primaryContactId: primaryContact.id,
   emails: orderedEmails,
   phoneNumbers: orderedPhoneNumbers,
   secondaryContactIds: secondaryContacts.map(contact => contact.id)
 };
}





















app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});