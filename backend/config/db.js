import mongoose from 'mongoose';

/**
 * Connect to MongoDB (ner_logix).
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ner_logix';

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  return mongoose;
}

/**
 * True when mongoose reports a ready connection.
 */
export function isDbConnected() {
  // 1 = connected
  return mongoose.connection.readyState === 1;
}

export default { connectDB, isDbConnected };
