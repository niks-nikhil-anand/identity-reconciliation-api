import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/index.js';
import { Contact, ContactResponse, IdentifyRequest } from '../types';

const prisma = new PrismaClient();

export const identifyContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phoneNumber }: IdentifyRequest = req.body;

    if (!email && !phoneNumber) {
      res.status(400).json({ error: 'At least one of email or phoneNumber is required' });
      return;
    }

    const relatedContacts = await findRelatedContacts(email, phoneNumber);
    const processedContacts = await processContacts(relatedContacts, email, phoneNumber);
    const contactResponse = formatContactResponse(processedContacts);

    res.status(200).json({ contact: contactResponse });
  } catch (error) {
    console.error('Error processing identify request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

async function findRelatedContacts(email?: string | null, phoneNumber?: string | null): Promise<Contact[]> {
  const directlyRelatedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email || undefined },
        { phoneNumber: phoneNumber || undefined }
      ],
      deletedAt: null
    },
    orderBy: { createdAt: 'asc' }
  });

  if (directlyRelatedContacts.length === 0) return [];

  const linkedContactIds = directlyRelatedContacts
    .filter((contact): contact is Contact & { linkedId: number } => contact.linkedId !== null)
    .map(contact => contact.linkedId);

  const primaryContactIds = [
    ...new Set([
      ...directlyRelatedContacts
        .filter(contact => contact.linkPrecedence === 'primary')
        .map(contact => contact.id),
      ...linkedContactIds
    ])
  ];

  const allRelatedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: { in: primaryContactIds } },
        { linkedId: { in: primaryContactIds as number[] } }
      ],
      deletedAt: null
    },
    orderBy: { createdAt: 'asc' }
  });

  return allRelatedContacts;
}

async function processContacts(relatedContacts: Contact[], email?: string | null, phoneNumber?: string | null): Promise<Contact[]> {
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

  const primaryContact = relatedContacts.find(contact => contact.linkPrecedence === 'primary') || relatedContacts[0];
  const existingEmails = relatedContacts.map(c => c.email).filter(Boolean);
  const existingPhones = relatedContacts.map(c => c.phoneNumber).filter(Boolean);

  const hasNewEmail = email && !existingEmails.includes(email);
  const hasNewPhone = phoneNumber && !existingPhones.includes(phoneNumber);

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

  await consolidatePrimaryContacts(relatedContacts);
  return relatedContacts;
}

async function consolidatePrimaryContacts(contacts: Contact[]): Promise<void> {
  const primaryContacts = contacts.filter(c => c.linkPrecedence === 'primary');
  if (primaryContacts.length <= 1) return;

  primaryContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const oldestPrimary = primaryContacts[0];
  const toConvert = primaryContacts.slice(1);

  for (const contact of toConvert) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        linkedId: oldestPrimary.id,
        linkPrecedence: 'secondary',
        updatedAt: new Date()
      }
    });

    await prisma.contact.updateMany({
      where: { linkedId: contact.id },
      data: {
        linkedId: oldestPrimary.id,
        updatedAt: new Date()
      }
    });

    contact.linkedId = oldestPrimary.id;
    contact.linkPrecedence = 'secondary';

    contacts.forEach(c => {
      if (c.linkedId === contact.id) {
        c.linkedId = oldestPrimary.id;
      }
    });
  }
}

function formatContactResponse(contacts: Contact[]): ContactResponse {
  const primaryContact = contacts.find(c => c.linkPrecedence === 'primary');
  if (!primaryContact) throw new Error("Primary contact not found");

  const secondaryContacts = contacts.filter(c => c.linkPrecedence === 'secondary');
  const allEmails = [...new Set(contacts.map(c => c.email).filter(Boolean) as string[])];
  const allPhones = [...new Set(contacts.map(c => c.phoneNumber).filter(Boolean) as string[])];

  const orderedEmails = [
    ...(primaryContact.email ? [primaryContact.email] : []),
    ...allEmails.filter(email => email !== primaryContact.email)
  ];

  const orderedPhones = [
    ...(primaryContact.phoneNumber ? [primaryContact.phoneNumber] : []),
    ...allPhones.filter(phone => phone !== primaryContact.phoneNumber)
  ];

  return {
    primaryContactId: primaryContact.id,
    emails: orderedEmails,
    phoneNumbers: orderedPhones,
    secondaryContactIds: secondaryContacts.map(c => c.id)
  };
}
