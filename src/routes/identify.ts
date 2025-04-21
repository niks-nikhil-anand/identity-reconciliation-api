import express from 'express';
import { identifyContact } from '../controllers/identifyController.ts';
import { healthCheck } from './healthCheck.ts';

const router = express.Router();

router.post('/identify', identifyContact);
router.get('/', healthCheck);

export default router;
