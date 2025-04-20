import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Corrected route handler
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World!");
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


