const express = require('express');
const cors = require('cors');
const app = express();

// Render sẽ tự cấp port, không được sửa dòng này
const PORT = process.env.PORT || 10000;

// Cấu hình CORS cho phép mọi trang web gọi API
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ==========================================
// GIẢ LẬP DATABASE (Lưu trên RAM - Sẽ mất khi Server khởi động lại)
// ==========================================
let users = []; 
// Mảng file để trống, chờ Admin cập nhật mới có
let files = []; 

// ==========================================
// API CƠ BẢN (Kiểm tra Server sống hay chết)
// ==========================================
app.get('/', (req, res) => {
    res.json({ 
        status: 'success', 
        message: '🚀 Backend SAMM X MODZ đang hoạt động!' 
    });
});

// ==========================================
// API NGƯỜI DÙNG (ĐĂNG KÝ / ĐĂNG NHẬP)
// ==========================================
app.post('/api/register', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập đủ Tài khoản và Mật khẩu' });
        }
        
        const userExists = users.find(u => u.username === username);
        if (userExists) {
            return res.status(400).json({ error: 'Tài khoản này đã tồn tại!' });
        }
        
        users.push({ username, password });
        res.json({ message: 'Đăng ký thành công! Hãy đăng nhập.' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi Server nội bộ' });
    }
});

app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            res.json({ 
                message: 'Đăng nhập thành công!', 
                user: { username: user.username } 
            });
        } else {
            res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu!' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Lỗi Server nội bộ' });
    }
});

// ==========================================
// API FILE (DÀNH CHO TRANG CHỦ)
// ==========================================
app.get('/api/files', (req, res) => {
    try {
        // Đảo ngược mảng để file mới nhất hiện lên đầu
        const sortedFiles = [...files].reverse();
        res.json(sortedFiles);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi lấy dữ liệu file' });
    }
});

// API Tăng lượt tải (Khi người dùng bấm Tải xuống)
app.post('/api/files/:id/download', (req, res) => {
    try {
        const fileId = parseInt(req.params.id);
        const file = files.find(f => f.id === fileId);
        
        if (file) {
            file.downloads = (file.downloads || 0) + 1;
            res.json({ message: 'Đã tăng lượt tải', downloads: file.downloads });
        } else {
            res.status(404).json({ error: 'Không tìm thấy file này' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Lỗi cập nhật lượt tải' });
    }
});

// ==========================================
// API DÀNH CHO ADMIN
// ==========================================
// Lấy danh sách tài khoản
app.get('/api/admin/users', (req, res) => {
    res.json(users);
});

// Thêm file mới
app.post('/api/admin/add-file', (req, res) => {
    try {
        const { title, imageUrl, link } = req.body;
        
        if (!title || !link) {
            return res.status(400).json({ error: 'Vui lòng nhập Tên file và Link tải' });
        }
        
        const newFile = { 
            id: Date.now(), // Dùng timestamp làm ID để không bao giờ trùng
            title: title, 
            imageUrl: imageUrl || 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg', 
            link: link,
            downloads: 0 // Khởi tạo lượt tải
        };
        
        files.push(newFile);
        res.json({ message: 'Thêm file thành công!', file: newFile });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi thêm file' });
    }
});

// Khởi động Server
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 BACKEND SAMM X MODZ ĐANG CHẠY`);
    console.log(`📡 Cổng: ${PORT}`);
    console.log(`=========================================`);
});
