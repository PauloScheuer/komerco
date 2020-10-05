import express from 'express';
import StocksController from './controllers/stocksController';

const stocksController = new StocksController();

const routes = express.Router();

routes.post('/stocks/create', stocksController.create);

routes.get('/setups/', stocksController.all);

routes.get('/setups/:idStock', stocksController.one);

routes.delete('/delete', stocksController.delete);

export default routes;
