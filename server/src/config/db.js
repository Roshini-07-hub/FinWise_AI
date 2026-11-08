import mongoose from 'mongoose';

let memoryServer = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI;

  try {
    if (mongoUri) {
      console.log('Connecting to MongoDB Atlas / configured database...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`MongoDB Connected: ${mongoose.connection.host}`);
      return;
    }

    if (process.env.VERCEL) {
      throw new Error('MONGODB_URI environment variable is required on Vercel deployments. Please configure MONGODB_URI in your Vercel Project Settings.');
    }

    console.warn('⚠️ MONGODB_URI not provided in .env. Falling back to local embedded MongoDB Memory Server for seamless development...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    await mongoose.connect(uri);
    console.log(`Connected to in-memory MongoDB at: ${uri}`);
    console.log('💡 Note: Set MONGODB_URI in server/.env with your MongoDB Atlas connection string for persistent cloud storage.');
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    
    // If Atlas connection timed out/failed, attempt memory server fallback so the app remains usable for testing
    if (!memoryServer && !process.env.VERCEL) {
      try {
        console.warn('⚠️ Attempting fallback to in-memory database to keep application running...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const uri = memoryServer.getUri();
        await mongoose.connect(uri);
        console.log(`Connected to fallback in-memory MongoDB at: ${uri}`);
        return;
      } catch (fallbackErr) {
        console.error('Fallback memory database failed:', fallbackErr.message);
      }
    }
    
    if (process.env.VERCEL) {
      throw err;
    }
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
  } catch (err) {
    console.error('Error disconnecting database:', err);
  }
};
