import mongoose from 'mongoose';

function redactUri(uri: string) {
  return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^@]+)@/i, (_, prefix) => `${prefix}***:***@`);
}

export async function connectMongo(uri: string) {
  if (mongoose.connection.readyState === 1) {
    console.info('[mongo] Reusing existing connection');
    return mongoose.connection;
  }
  console.info('[mongo] Connecting to', redactUri(uri));
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.info('[mongo] Connected');
  return mongoose.connection;
}
