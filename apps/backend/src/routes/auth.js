import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import {
  signupGeneral,
  signupMohOfficer,
  login,
  verifyEmail,
  refreshToken,
  logout,
} from '../controllers/authController.js';

const router = Router();

const passwordRules = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
];

router.post(
  '/signup/general',
  [
    body('firstName').notEmpty().withMessage('First name required'),
    body('lastName').notEmpty().withMessage('Last name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('district').notEmpty().withMessage('District required'),
    body('mohZone').notEmpty().withMessage('MOH zone required'),
    ...passwordRules,
  ],
  validate,
  signupGeneral
);

router.post(
  '/signup/moh-officer',
  [
    body('officerName').notEmpty().withMessage('Officer name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('district').notEmpty().withMessage('District required'),
    body('mohZone').notEmpty().withMessage('MOH zone required'),
    ...passwordRules,
  ],
  validate,
  signupMohOfficer
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  login
);

router.post('/verify-email', verifyEmail);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

export default router;
