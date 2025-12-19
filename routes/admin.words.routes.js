import express from 'express';
import { 
    getAllWords, 
    getWordById, 
    createWord, 
    updateWord, 
    deleteWord 
} from '../controllers/admin.word.controller.js';

const router = express.Router();

router.get('/', getAllWords);
router.get('/:id', getWordById); 
router.post('/', createWord);
router.put('/:id', updateWord);
router.delete('/:id', deleteWord);

export default router;