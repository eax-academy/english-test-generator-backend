import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
    method: { type: String, required: true },
    url: { type: String, required: true },
    status: { type: Number, required: true },
    responseTime: { type: Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ip: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const Log = mongoose.model('Log', logSchema);

export default Log;
