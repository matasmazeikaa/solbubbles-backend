import express from "express";
import authController from "@/controllers/authController";
import transactionController from "@/controllers/transactionController";
import userController from "@/controllers/userController";

const routes = express.Router()

routes.use('/user', userController);
routes.use('/auth', authController);
routes.use('/transaction', transactionController);

export default routes;
