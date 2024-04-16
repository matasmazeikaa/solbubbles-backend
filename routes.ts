import Router from 'express-promise-router';
import transactionController from '@/controllers/transactionController';
import userController from '@/controllers/userController';
import { Handlers } from '@sentry/node';

const router = Router();

router.use('/user', userController);
router.use('/transaction', transactionController)

router.use;

router.use(Handlers.errorHandler());

router.use((_: any, __: any, res: any, ___: any) => {
    res.status(500).json({ error: 'Server Error' });
})

export default router;
