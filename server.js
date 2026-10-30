const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer'); // Thư viện nhận file upload
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }));
app.use(express.json());

// Cấu hình thư mục lưu file upload
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Cấu hình Multer (Lưu file vào thư mục uploads)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});
const upload = multer({ storage: storage });

// Cho phép truy cập file tĩnh từ thư mục uploads
app.use('/uploads', express.static(uploadDir));

// ================= KẾT NỐI DATABASE =================
const MONGO_URI = 'mongodb+srv://admin:123456@cluster0.xxxxx.mongodb.net/samxmodz?retryWrites=true&w=majority'; // SỬA LINK NÀY
let isDbConnected = false;

mongoose.connect(MONGO_URI)
    .then(() => { console.log('✅ Đã kết nối Database!'); isDbConnected = true; })
    .catch(err => console.log('❌ Lỗi Database:', err.message, '- Sẽ dùng RAM!'));

// Cấu trúc Data
const User = mongoose.model('User', new mongoose.Schema({ username: String, password: String }));
const FileData = mongoose.model('FileData', new mongoose.Schema({ 
    title: String, imageUrl: String, fileUrl: String, downloads: { type: Number, default: 0 } 
}));
let ramUsers = []; let ramFiles = [];

// ================= API USER =================
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (isDbConnected) {
            if (await User.findOne({ username })) return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
            await User.create({ username, password });
        } else {
            if (ramUsers.find(u => u.username === username)) return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
            ramUsers.push({ username, password });
        }
        res.json({ message: 'Đăng ký thành công!' });
    } catch (e) { res.status(500).json({ error: 'Lỗi Server' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = isDbConnected ? await User.findOne({ username, password }) : ramUsers.find(u => u.username === username && u.password === password);
        if (user) res.json({ message: 'Đăng nhập thành công!', user: { username: user.username } });
        else res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
    } catch (e) { res.status(500).json({ error: 'Lỗi Server' }); }
});

// ================= API FILE =================
app.get('/api/files', async (req, res) => {
    try {
        if (isDbConnected) res.json(await FileData.find().sort({ _id: -1 }));
        else res.json([...ramFiles].reverse());
    } catch (e) { res.status(500).json({ error: 'Lỗi lấy file' }); }
});

app.post('/api/files/:id/download', async (req, res) => {
    try {
        if (isDbConnected) await FileData.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
        else { const f = ramFiles.find(x => x.id === req.params.id); if(f) f.downloads++; }
        res.json({ message: 'OK' });
    } catch (e) { res.status(500).json({ error: 'Lỗi' }); }
});

// ================= API ADMIN =================
app.get('/api/admin/users', async (req, res) => {
    if (isDbConnected) res.json(await User.find()); else res.json(ramUsers);
});

// Thêm file mới (Có upload file đính kèm)
app.post('/api/admin/add-file', upload.single('fileUpload'), async (req, res) => {
    try {
        const { title, imageUrl } = req.body;
        let fileUrl = req.body.link; // Link ngoài (nếu có)

        // Nếu Admin có tải file lên, tạo link từ file đó
        if (req.file) {
            fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        const img = imageUrl || 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';

        if (isDbConnected) {
            const newFile = await FileData.create({ title, imageUrl: img, fileUrl, downloads: 0 });
            res.json({ message: 'Thêm file thành công!', file: newFile });
        } else {
            const newFile = { id: Date.now().toString(), title, imageUrl: img, fileUrl, downloads: 0 };
            ramFiles.push(newFile);
            res.json({ message: 'Thêm file thành công (RAM)!', file: newFile });
        }
    } catch (e) { console.error(e); res.status(500).json({ error: 'Lỗi thêm file' }); }
});

app.listen(PORT, () => console.log(`🚀 Server chạy trên port ${PORT}`));
