# Identity Reconciliation API – Bitespeed Backend Task

This project implements an identity reconciliation service for Bitespeed, designed to link a customer’s multiple contact records using email and phone number.

## 🧠 Problem Statement

Customers may place multiple orders using different contact information. Bitespeed needs to recognize these as the same customer for personalization and analytics. This service handles:

- Linking contacts by `email` or `phoneNumber`
- Tracking `primary` and `secondary` contact relationships
- Updating contact precedence over time

Refer to the [Bitespeed Identity Reconciliation Task PDF](https://drive.google.com/file/d/1m57CORq21t0T4EObYu2NqSWBVIP4uwxO/view) for full details.

## 📦 Tech Stack

- **Backend:** Node.js + Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **DevOps:** Docker (optional), Render (hosting)

## 🚀 Hosted API Endpoint

> 🔗 [https://identity-reconciliation-4wz3.onrender.com/identify](https://identity-reconciliation-4wz3.onrender.com/identify)

## 🧪 API Reference

### POST `/identify`

**Request Body (JSON):**
```json
{
  "email": "niks@developer.edu",
  "phoneNumber": "1234567890"
}
