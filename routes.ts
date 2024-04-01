import express from "express";
import transactionController from "@/controllers/transactionController";
import userController from "@/controllers/userController";

const routes = express.Router()

routes.use('/user', userController);
routes.use('/transaction', transactionController);

export default routes;
