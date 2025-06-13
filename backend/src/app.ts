// backend/src/app.ts

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { logger } from './utils/logger';

// Muat environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import routes
import { ipRoutes } from './routes/ipRoutes';
import { logRoutes } from './routes/logRoutes'; // <-- IMPORT RUTE BARU
import { errorHandler } from './utils/errorHandler';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
logger.info('Setting up routes...');
app.use('/api/ip', ipRoutes);
app.use('/api/logs', logRoutes); // <-- GUNAKAN RUTE BARU
logger.info('Routes set up.');

// Error handling
app.use(errorHandler);

// Koneksi Database
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      logger.error('MongoDB URI is not defined in environment variables. Halting.');
      process.exit(1);
    }
    await mongoose.connect(mongoURI);
    logger.info('Successfully connected to MongoDB Atlas');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

export default app;