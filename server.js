const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }));
app.use(express.json());

let users = []; 
let files = []; 

app.get('/', (req, res) => res.json({ status: 'Backend Active' }));

// --- API USER ---
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Thiếu thông tin' });
    if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
    users.push({ username, password });
    res.json({ message: 'Đăng ký thành công!' });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) res.json({ message: 'Đăng nhập thành công!', user });
    else res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
});

// --- API FILE ---
app.get('/api/files', (req, res) => res.json([...files].reverse()));

app.post('/api/files/:id/download', (req, res) => {
    const file = files.find(f => f.id === parseInt(req.params.id));
    if (file) { file.downloads = (file.downloads || 0) + 1; res.json({ message: 'OK' }); }
    else res.status(404).json({ error: 'Không tìm thấy' });
});

// --- API ADMIN ---
app.get('/api/admin/users', (req, res) => res.json(users));

app.post('/api/admin/add-file', (req, res) => {
    const { title, imageUrl, link } = req.body;
    if (!title || !link) return res.status(400).json({ error: 'Thiếu thông tin' });
    const newFile = { id: Date.now(), title, imageUrl: imageUrl || 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg', link, downloads: 0 };
    files.push(newFile);
    res.json({ message: 'Thêm thành công!', file: newFile });
});

// Sửa file
app.put('/api/admin/edit-file/:id', (req, res) => {
    const fileId = parseInt(req.params.id);
    const { title, imageUrl, link } = req.body;
    const fileIndex = files.findIndex(f => f.id === fileId);
    
    if (fileIndex !== -1) {
        files[fileIndex].title = title || files[fileIndex].title;
        files[fileIndex].imageUrl = imageUrl || files[fileIndex].imageUrl;
        files[fileIndex].link = link || files[fileIndex].link;
        res.json({ message: 'Cập nhật file thành công!' });
    } else {
        res.status(404).json({ error: 'Không tìm thấy file' });
    }
});

// Xóa file
app.delete('/api/admin/delete-file/:id', (req, res) => {
    const fileId = parseInt(req.params.id);
    const initialLength = files.length;
    files = files.filter(f => f.id !== fileId);
    
    if (files.length < initialLength) res.json({ message: 'Xóa file thành công!' });
    else res.status(404).json({ error: 'Không tìm thấy file' });
});

app.listen(PORT, () => console.log(`🚀 Server chạy trên port ${PORT}`));
