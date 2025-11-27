import { Router } from 'express'
import { verifyToken } from '../middleware/authMiddleware' // Remove AuthenticatedRequest from here
import { registerUser, loginUser } from '../controllers/usersController'

const router = Router()

router.post('/register', registerUser)
router.post('/login', loginUser)

// Example protected route (test JWT)
router.get('/profile', verifyToken, (req, res) => {
  // TypeScript should now recognize req.user due to the global declaration
  res.json({
    message: `Welcome, ${req.user?.email}!`, // Note: user is nested!
    user: req.user
  })
})

export default router