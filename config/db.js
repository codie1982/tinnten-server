
const mongoose = require('mongoose')
mongoose.set('strictQuery', true);
const connectDB = async (mongoUri = process.env.MONGO_URI) => {
  try {
    const conn = await mongoose.connect(mongoUri,{dbName:process.env.DB_TINNTEN})
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline)
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}

module.exports = {connectDB}