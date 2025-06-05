// src/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
// Ensure logger is robust or initialized after dotenv if it uses env vars
import { logger } from './utils/logger'; // Assuming logger is fine

const envPath = path.resolve(__dirname, '../.env');
logger.info(`Attempting to load .env file from: ${envPath}`);
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
  logger.error('Error loading .env file:', dotenvResult.error);
} else {
  // dotenvResult.parsed will contain the object of parsed key-values from the .env file
  // If it's empty or doesn't have your keys, the file might be empty or not found despite no error
  logger.info('.env file processing complete.');
  if (dotenvResult.parsed) {
    logger.info('Parsed .env variables:', Object.keys(dotenvResult.parsed));
  } else {
    logger.warn('.env file was empty or variables were already set in the environment.');
  }
}

// CRITICAL CHECK: Log the specific environment variables AFTER dotenv.config()
logger.info(`[app.ts] VIRUSTOTAL_API_KEY: ${process.env.VIRUSTOTAL_API_KEY ? 'Loaded (value exists)' : 'NOT LOADED or Empty'}`);
logger.info(`[app.ts] ABUSEIPDB_API_KEY: ${process.env.ABUSEIPDB_API_KEY ? 'Loaded (value exists)' : 'NOT LOADED or Empty'}`);
logger.info(`[app.ts] SHODAN_API_KEY: ${process.env.SHODAN_API_KEY ? 'Loaded (value exists)' : 'NOT LOADED or Empty'}`);
logger.info(`[app.ts] LLM_API_KEY: ${process.env.LLM_API_KEY ? 'Loaded (value exists)' : 'NOT LOADED or Empty'}`);
logger.info(`[app.ts] IPGEO_API_KEY: ${process.env.IPGEO_API_KEY ? 'Loaded (value exists)' : 'NOT LOADED or Empty'}`);


// Import routes AFTER dotenv has been configured and variables logged
import { ipRoutes } from './routes/ipRoutes'; // This import likely triggers ExternalAPIService instantiation
import { errorHandler } from './utils/errorHandler';

// ... rest of your app.ts
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
logger.info('Setting up routes...');
app.use('/api/ip', ipRoutes);
logger.info('Routes set up.');

// Error handling
app.use(errorHandler);

// ... (MongoDB connection code)
const connectDB = async () => {
  // ... (your existing connectDB code)
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      // This check is good, do similar for other critical env vars if needed at this stage
      logger.error('MongoDB URI is not defined in environment variables. Halting.');
      throw new Error('MongoDB URI is not defined in environment variables');
    }
    // ... rest of connectDB
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    mongoose.connection.on('connected', () => logger.info('Successfully connected to MongoDB Atlas'));
    mongoose.connection.on('error', (err) => logger.error('MongoDB connection error:', err));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        logger.error('Error during MongoDB connection closure:', err);
        process.exit(1);
      }
    });
    logger.info('Initial MongoDB Atlas connection successful');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    setTimeout(() => process.exit(1), 1000);
  }
};

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`); // Use logger
});

export default app;