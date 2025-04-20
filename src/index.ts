import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/identify',async (req: Request, res: Response):Promise<any> => {
  const { name, email } = req.body;

  // Check if required fields are present
  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required.' });
  }

  // Simulate some identification logic (e.g., check a database or some service)
  return res.json({
    message: 'Contact identified successfully',
    contact: { name, email },
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
