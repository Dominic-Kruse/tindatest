import express from 'express'
import { registerUser, loginUser, getUserById, getUserByUsername, getAllUsers, getCurrentUser } from '../controllers/usersController'
import { verifyToken } from '../middleware/authMiddleware'

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/me', verifyToken , getCurrentUser)
router.get('/', getAllUsers);
router.get('/username/:username', getUserByUsername);
export default router