import express from 'express';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();
const app = express();

const port = process.env.PORT || 3333;

app.use(express.json());
app.use(routes);
app.listen(port);
