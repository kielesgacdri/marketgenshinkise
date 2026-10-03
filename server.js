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

// Schema User & Owner
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    phone: String,
    role: { type: String, default: 'user' } // 'owner' atau 'user'
});
const User = mongoose.model('User', UserSchema);

// Inisialisasi Akun Owner Otomatis saat server jalan
async function initOwner() {
    const ownerExist = await User.findOne({ username: 'kiel' });
    if (!ownerExist) {
        await User.create({
            username: 'kiel',
            password: 'kiel2345@',
            phone: '087776951600',
            role: 'owner'
        });
        console.log('Akun Owner berhasil dibuat!');
    }
}
initOwner();

// Register User / Owner
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, phone } = req.body;
        const exist = await User.findOne({ username });
        if (exist) {
            return res.json({ success: false, message: 'Username sudah digunakan!' });
        }
        await User.create({ username, password, phone, role: 'user' });
        res.json({ success: true, message: 'Registrasi berhasil! Silakan login.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
});

// Login (Bisa User & Owner)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Cek khusus Owner
        if (username === 'kiel' && password === 'kiel2345@') {
            return res.json({ 
                success: true, 
                role: 'owner', 
                username: 'kiel', 
                message: 'Login Owner Berhasil!' 
            });
        }

        // Cek User biasa di database
        const user = await User.findOne({ username, password });
        if (user) {
            return res.json({ 
                success: true, 
                role: user.role, 
                username: user.username, 
                message: 'Login Berhasil!' 
            });
        }

        res.json({ success: false, message: 'Username atau Password salah!' });
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
            return res.status(403).json({ success: false, message: 'Akses ditolak! Hanya owner yang bisa memposting akun.' });
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
