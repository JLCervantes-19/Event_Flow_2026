// routes/reservations.js
import { Router } from 'express';
import {
  getReservations, getReservationById, createReservation,
  updateReservation, cancelReservation,
} from '../controllers/reservationsController.js';

const router = Router();

router.get('/', getReservations);
router.get('/:id', getReservationById);
router.post('/', createReservation);
router.put('/:id', updateReservation);
router.delete('/:id', cancelReservation);

export default router;
