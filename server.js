const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Thư viện kết nối Database

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }));
app.use(express.json());

// ================= KẾT NỐI DATABASE MONGODB =================
// THAY LINK DƯỚI ĐÂY BẰNG LINK CỦA BẠN (Nhớ thay <password>)
const MONGO_URI = 'mongodb+srv://admin:123456@cluster0.xxxxx.mongodb.net/samxmodz?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Đã kết nối Database thành công!'))
    .catch(err => console.log('❌ Lỗi kết nối Database:', err));

// ================= TẠO CẤU TRÚC DỮ LIỆU =================
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

const File = mongoose.model('File', new mongoose.Schema({
    title: String,
    imageUrl: String,
    link: String,
    downloads: { type: Number, default: 0 }
}));

// ================= API CƠ BẢN =================
app.get('/', (req, res) => res.json({ status: 'Backend + Database đang chạy!' }));

// ================= API USER =================
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Thiếu thông tin' });
        
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
        
        await User.create({ username, password });
        res.json({ message: 'Đăng ký thành công!' });
    } catch (e) { res.status(500).json({ error: 'Lỗi Server' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (user) res.json({ message: 'Đăng nhập thành công!', user: { username: user.username } });
        else res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
    } catch (e) { res.status(500).json({ error: 'Lỗi Server' }); }
});

// ================= API FILE =================
app.get('/api/files', async (req, res) => {
    try {
        const files = await File.find().sort({ _id: -1 }); // Lấy file mới nhất
        res.json(files);
    } catch (e) { res.status(500).json({ error: 'Lỗi lấy file' }); }
});

app.post('/api/files/:id/download', async (req, res) => {
    try {
        await File.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
        res.json({ message: 'Đã tăng lượt tải' });
    } catch (e) { res.status(500).json({ error: 'Lỗi' }); }
});

// ================= API ADMIN =================
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (e) { res.status(500).json({ error: 'Lỗi' }); }
});

app.post('/api/admin/add-file', async (req, res) => {
    try {
        const { title, imageUrl, link } = req.body;
        const newFile = await File.create({ 
            title, 
            imageUrl: imageUrl || 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg', 
            link 
        });
        res.json({ message: 'Thêm file thành công!', file: newFile });
    } catch (e) { res.status(500).json({ error: 'Lỗi thêm file' }); }
});

app.put('/api/admin/edit-file/:id', async (req, res) => {
    try {
        const { title, imageUrl, link } = req.body;
        await File.findByIdAndUpdate(req.params.id, { title, imageUrl, link });
        res.json({ message: 'Cập nhật file thành công!' });
    } catch (e) { res.status(500).json({ error: 'Lỗi sửa file' }); }
});

app.delete('/api/admin/delete-file/:id', async (req, res) => {
    try {
        await File.findByIdAndDelete(req.params.id);
        res.json({ message: 'Xóa file thành công!' });
    } catch (e) { res.status(500).json({ error: 'Lỗi xóa file' }); }
});

app.listen(PORT, () => console.log(`🚀 Server chạy trên port ${PORT}`));
