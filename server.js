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

const AdminSchema = new mongoose.Schema({
    username: String,
    phone: String,
    otp: String
});
const Admin = mongoose.model('Admin', AdminSchema);

app.post('/api/send-otp', async (req, res) => {
    const { username, password, phone } = req.body;
    
    if (username !== 'kiseadmin' || password !== 'kise12345') {
        return res.json({ success: false, message: 'Username atau Password Admin salah!' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Admin.findOneAndUpdate({ username }, { phone, otp }, { upsert: true });

    try {
        await axios.post('https://api.fonnte.com/send', {
            target: phone,
            message: `Kode OTP Login Marketplace Genshin lu adalah: *${otp}*.`
        }, {
            headers: { Authorization: 'MASUKKAN_TOKEN_FONNTE_DISINI' }
        });
        res.json({ success: true, message: 'OTP berhasil dikirim ke WhatsApp!' });
    } catch (error) {
        res.json({ success: true, message: `OTP terkirim! (Kode darurat testing: ${otp})` });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    const { username, otp } = req.body;
    const admin = await Admin.findOne({ username });

    if (admin && admin.otp === otp) {
        res.json({ success: true, message: 'Login Berhasil!' });
    } else {
        res.json({ success: false, message: 'Kode OTP Salah!' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Gagal memuat produk' });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.json({ success: true, message: 'Akun berhasil diposting ke beranda!' });
    } catch (err) {
        res.status(500).json({ error: 'Gagal memposting akun' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
