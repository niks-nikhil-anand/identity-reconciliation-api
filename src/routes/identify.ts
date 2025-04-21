import express from 'express';
import { identifyContact } from '../controllers/identifyController.ts';

const router = express.Router();

router.post('/identify', identifyContact);

export default router;
