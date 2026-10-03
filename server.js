const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// KONEKSI MONGODB ATLAS
const MONGO_URI = 'mongodb+srv://kiseadmin:kise12345@cluster0.zlyhybb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Terhubung!'))
  .catch(err => console.log('Gagal konek DB:', err));

// Schema Produk
const ProductSchema = new mongoose.Schema({
    title: String,
    server: String,
    price: Number,
    image: String,
    description: String,
    seller: String,
    createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', ProductSchema);

// Schema User (Menyimpan status OTP registrasi)
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    phone: String,
    otp: String,
    isVerified: { type: Boolean, default: false },
    role: { type: String, default: 'user' }
});
const User = mongoose.model('User', UserSchema);

// STEP 1: Kirim OTP ke WA saat User ingin Daftar
app.post('/api/send-register-otp', async (req, res) => {
    try {
        const { username, password, phone } = req.body;
        if (!username || !password || !phone) {
            return res.json({ success: false, message: 'Semua kolom wajib diisi!' });
        }

        const exist = await User.findOne({ username });
        if (exist && exist.isVerified) {
            return res.json({ success: false, message: 'Username sudah terdaftar!' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Simpan data sementara ke database sebelum verifikasi OTP
        await User.findOneAndUpdate(
            { username },
            { password, phone, otp, isVerified: false, role: 'user' },
            { upsert: true, new: true }
        );

        // Kirim via Fonnte (Ganti TOKEN Fonnte lu di header Authorization jika perlu)
        try {
            await axios.post('https://api.fonnte.com/send', {
                target: phone,
                message: `Kode OTP Pendaftaran Marketplace Genshin lu adalah: *${otp}*. Jangan berikan kode ini ke siapa pun!`
            }, {
                headers: { Authorization: 'MASUKKAN_TOKEN_FONNTE_DISINI' }
            });
            res.json({ success: true, message: 'Kode OTP berhasil dikirim ke WhatsApp Anda!' });
        } catch (error) {
            // Fallback jika token fonnte belum dipasang, tampilkan kode darurat di alert biar gak nyangkut
            res.json({ success: true, message: `OTP terkirim! (Kode darurat testing: ${otp})` });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
});

// STEP 2: Verifikasi OTP & Selesaikan Registrasi (Auto Login)
app.post('/api/verify-register-otp', async (req, res) => {
    try {
        const { username, otp } = req.body;
        const user = await User.findOne({ username });

        if (user && user.otp === otp) {
            user.isVerified = true;
            await user.save();
            return res.json({ 
                success: true, 
                role: user.role, 
                username: user.username, 
                message: 'Registrasi Berhasil & Auto Login!' 
            });
        }
        res.json({ success: false, message: 'Kode OTP Salah!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal verifikasi OTP.' });
    }
});

// LOGIN BIASA & OWNER
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Cek khusus Owner (Kiel)
        if (username === 'kiel' && password === 'kiel2345@') {
            return res.json({ 
                success: true, 
                role: 'owner', 
                username: 'kiel', 
                message: 'Login Owner Berhasil!' 
            });
        }

        // Cek User terdaftar
        const user = await User.findOne({ username, password, isVerified: true });
        if (user) {
            return res.json({ 
                success: true, 
                role: user.role, 
                username: user.username, 
                message: 'Login Berhasil!' 
            });
        }

        res.json({ success: false, message: 'Username, Password salah atau akun belum verifikasi!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal melakukan login.' });
    }
});

// Get Produk
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Gagal memuat produk' });
    }
});

// Post Produk (Hanya Owner)
app.post('/api/products', async (req, res) => {
    try {
        const { title, server, price, image, description, role } = req.body;
        if (role !== 'owner') {
            return res.status(403).json({ success: false, message: 'Akses ditolak! Hanya owner Kiel yang bisa memposting akun.' });
        }
        const newProduct = new Product({ title, server, price, image, description, seller: 'Kiel Owner' });
        await newProduct.save();
        res.json({ success: true, message: 'Akun berhasil diposting ke beranda!' });
    } catch (err) {
        res.status(500).json({ error: 'Gagal memposting akun' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
