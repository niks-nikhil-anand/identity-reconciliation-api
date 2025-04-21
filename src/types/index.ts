// src/types/index.ts
import { Contact as PrismaContact } from '../generated/prisma';

export type Contact = PrismaContact;

// You can also export other types or interfaces here
export interface ContactResponse {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}

export interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: string | null;
}