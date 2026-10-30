const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;

// Cấu hình CORS để không bị chặn kết nối từ Github Pages/Render Static
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST']
}));
app.use(express.json());

// --- DATABASE GIẢ LẬP ---
let users = []; 
let files = [
    { 
        id: 1, 
        title: 'AIM HACK FREE FIRE', 
        imageUrl: 'https://i.ibb.co/680hYh2/freefire.jpg', 
        link: 'https://google.com' 
    }
];

// ================= API CƠ BẢN =================
app.get('/', (req, res) => {
    res.send('Backend SAMM X MODZ đang hoạt động!');
});

// ================= API NGƯỜI DÙNG =================
app.post('/api/register', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin' });
        
        const userExists = users.find(u => u.username === username);
        if (userExists) return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
        
        users.push({ username, password });
        res.json({ message: 'Đăng ký thành công!' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi Server' });
    }
});

app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            res.json({ message: 'Đăng nhập thành công!', user: { username: user.username } });
        } else {
            res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Lỗi Server' });
    }
});

// ================= API FILE =================
app.get('/api/files', (req, res) => {
    res.json(files);
});

app.post('/api/admin/add-file', (req, res) => {
    try {
        const { title, imageUrl, link } = req.body;
        if (!title || !link) return res.status(400).json({ error: 'Thiếu tên hoặc link file' });
        
        const newFile = { 
            id: files.length + 1, 
            title: title, 
            imageUrl: imageUrl || 'https://i.ibb.co/680hYh2/freefire.jpg', 
            link: link 
        };
        files.push(newFile);
        res.json({ message: 'Thêm file thành công!', file: newFile });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi Server' });
    }
});

// Lấy danh sách user cho Admin
app.get('/api/admin/users', (req, res) => {
    res.json(users);
});

// Khởi động Server
app.listen(PORT, () => {
    console.log(`🚀 Backend đang chạy trên port ${PORT}`);
});
