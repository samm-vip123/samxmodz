const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;

// Cho phép trang web (index.html) gọi API từ Backend này
app.use(cors());
app.use(express.json());

// --- GIẢ LẬP DATABASE (Lưu trên RAM) ---
const users = []; 
// Mảng chứa file, Admin có thể thêm qua API (nếu cần)
let files = [
    { id: 1, title: 'AIM HACK FREE FIRE', category: 'ff', desc: 'Phiên bản mới nhất - Cập nhật bởi ADMIN' },
    { id: 2, title: 'AIM HACK LIÊN QUÂN', category: 'lq', desc: 'Phiên bản mới nhất - Cập nhật bởi ADMIN' }
];

// --- API ĐĂNG KÝ ---
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Vui lòng nhập đủ Tài khoản và Mật khẩu' });
    
    const existingUser = users.find(u => u.username === username);
    if (existingUser) return res.status(400).json({ error: 'Tài khoản này đã tồn tại!' });

    users.push({ username, password });
    res.json({ message: 'Đăng ký thành công! Hãy đăng nhập.' });
});

// --- API ĐĂNG NHẬP ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        // Trong thực tế sẽ trả về Token (JWT), ở đây giả lập trả về thông tin user
        res.json({ message: 'Đăng nhập thành công!', user: { username: user.username } });
    } else {
        res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu!' });
    }
});

// --- API LẤY DANH SÁCH FILE (Dành cho trang chủ) ---
app.get('/api/files', (req, res) => {
    res.json(files);
});

// --- API THÊM FILE (Dành cho Admin) ---
app.post('/api/files', (req, res) => {
    const { title, category, desc } = req.body;
    const newFile = { id: files.length + 1, title, category, desc };
    files.push(newFile);
    res.json({ message: 'Thêm file thành công!', file: newFile });
});

// Khởi động Server
app.listen(PORT, () => {
    console.log(`🚀 Backend SAMM X MODZ đang chạy tại port ${PORT}`);
});
