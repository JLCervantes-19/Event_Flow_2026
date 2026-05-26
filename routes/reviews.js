import { Router } from 'express';
import { getReviewStats, getReviewsByEvent, createReview, deleteReview } from '../controllers/reviewsController.js';

const router = Router();

router.get('/stats', getReviewStats);
router.get('/:eventoId', getReviewsByEvent);
router.post('/', createReview);
router.delete('/:id', deleteReview);

export default router;
