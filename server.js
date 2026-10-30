const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }));
app.use(express.json());

// ================= KẾT NỐI DATABASE =================
// Link này phải có tên database (ví dụ: /samxmodz)
// VÀ PHẢI THAY CHỮ <password> BẰNG MẬT KHẨU CỦA BẠN
const MONGO_URI = 'mongodb+srv://admin:123456@cluster0.xxxxx.mongodb.net/samxmodz?retryWrites=true&w=majority';

let isDbConnected = false;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Đã kết nối Database thành công!');
        isDbConnected = true;
    })
    .catch(err => {
        console.log('❌ LỖI KẾT NỐI DATABASE:', err.message);
        console.log('⚠️ Sẽ sử dụng bộ nhớ tạm (RAM) để chạy tiếp!');
    });

// ================= CẤU TRÚC DỮ LIỆU =================
const userSchema = new mongoose.Schema({ username: String, password: String });
const fileSchema = new mongoose.Schema({ title: String, imageUrl: String, link: String, downloads: { type: Number, default: 0 } });

const User = mongoose.model('User', userSchema);
const File = mongoose.model('File', fileSchema);

// Mảng dự phòng (RAM) nếu Database lỗi
let ramUsers = [];
let ramFiles = [];

// ================= API USER =================
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Thiếu thông tin' });

        if (isDbConnected) {
            const existing = await User.findOne({ username });
            if (existing) return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
            await User.create({ username, password });
        } else {
            if (ramUsers.find(u => u.username === username)) return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
            ramUsers.push({ username, password });
        }
        res.json({ message: 'Đăng ký thành công!' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Lỗi Server khi đăng ký' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        let user = null;

        if (isDbConnected) {
            user = await User.findOne({ username, password });
        } else {
            user = ramUsers.find(u => u.username === username && u.password === password);
        }

        if (user) res.json({ message: 'Đăng nhập thành công!', user: { username: user.username } });
        else res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Lỗi Server khi đăng nhập' });
    }
});

// ================= API FILE =================
app.get('/api/files', async (req, res) => {
    try {
        if (isDbConnected) {
            const files = await File.find().sort({ _id: -1 });
            return res.json(files);
        } else {
            return res.json([...ramFiles].reverse());
        }
    } catch (e) {
        res.status(500).json({ error: 'Lỗi lấy file' });
    }
});

// ================= API ADMIN =================
app.get('/api/admin/users', async (req, res) => {
    try {
        if (isDbConnected) {
            const users = await User.find();
            return res.json(users);
        } else {
            return res.json(ramUsers);
        }
    } catch (e) { res.status(500).json({ error: 'Lỗi' }); }
});

app.post('/api/admin/add-file', async (req, res) => {
    try {
        const { title, imageUrl, link } = req.body;
        const img = imageUrl || 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';
        
        if (isDbConnected) {
            const newFile = await File.create({ title, imageUrl: img, link });
            return res.json({ message: 'Thêm file thành công!', file: newFile });
        } else {
            const newFile = { id: Date.now().toString(), title, imageUrl: img, link, downloads: 0 };
            ramFiles.push(newFile);
            return res.json({ message: 'Thêm file thành công (RAM)!', file: newFile });
        }
    } catch (e) { res.status(500).json({ error: 'Lỗi thêm file' }); }
});

// ================= KHỞI ĐỘNG =================
app.listen(PORT, () => console.log(`🚀 Server chạy trên port ${PORT}`));
