import express from 'express';
import dotenv from 'dotenv';
import identifyRoutes from './routes/identify.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/', identifyRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
