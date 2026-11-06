const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Phục vụ file HTML

// ================= KẾT NỐI DATABASE =================
// Thay link MongoDB của bạn vào đây
const MONGO_URI = 'mongodb+srv://admin:123456@cluster0.xxxxx.mongodb.net/samxmodz?retryWrites=true&w=majority'; 

let isDbConnected = false;
mongoose.connect(MONGO_URI)
    .then(() => { console.log('✅ Đã kết nối MongoDB!'); isDbConnected = true; })
    .catch(err => console.log('❌ Lỗi Database:', err.message, '- Sẽ dùng RAM tạm thời!'));

// ================= CẤU TRÚC DATA =================
// Cấu trúc Key: code, expText (hiển thị), expireAt (thời gian thực), createdAt
const KeySchema = new mongoose.Schema({ 
    code: { type: String, unique: true, required: true }, 
    expText: String, 
    expireAt: { type: Number, default: -1 }, // -1 là vĩnh viễn
    createdAt: { type: Date, default: Date.now }
});
const Key = mongoose.model('Key', KeySchema);

// Mảng lưu RAM nếu mất kết nối DB
let ramKeys = [];

// ================= API ADMIN (TẠO KEY) =================
app.post('/api/admin/generate-key', async (req, res) => {
    try {
        const { durationType, customDays, customHours } = req.body;
        let expText = '';
        let expireAt = -1; // Mặc định vĩnh viễn
        let now = new Date();

        // Tính toán thời gian
        if (durationType === 'custom') {
            let d = parseInt(customDays) || 0;
            let h = parseInt(customHours) || 0;
            now.setDate(now.getDate() + d);
            now.setHours(now.getHours() + h);
            expireAt = now.getTime();
            expText = `${d} Ngày ${h} Giờ`;
        } else {
            switch(durationType) {
                case '1_day': now.setDate(now.getDate() + 1); expText = '1 Ngày'; break;
                case '1_week': now.setDate(now.getDate() + 7); expText = '1 Tuần'; break;
                case '1_month': now.setDate(now.getDate() + 30); expText = '1 Tháng'; break;
                case '1_year': now.setDate(now.getDate() + 365); expText = '1 Năm'; break;
                case 'lifetime': expText = 'Vĩnh Viễn'; expireAt = -1; break;
            }
            if(durationType !== 'lifetime') expireAt = now.getTime();
        }

        // Tạo mã Key ngẫu nhiên: SAMM-XXXX-XXXX
        const randStr = () => crypto.randomBytes(2).toString('hex').toUpperCase();
        const newCode = `SAMM-${randStr()}-${randStr()}`;

        const keyData = { code: newCode, expText, expireAt };

        if (isDbConnected) {
            await Key.create(keyData);
        } else {
            ramKeys.push(keyData);
        }

        res.json({ message: 'Tạo Key thành công!', key: keyData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi Server khi tạo Key' });
    }
});

// Lấy danh sách Key (Cho Admin xem)
app.get('/api/admin/keys', async (req, res) => {
    try {
        if (isDbConnected) {
            const keys = await Key.find().sort({ createdAt: -1 });
            res.json(keys);
        } else {
            res.json([...ramKeys].reverse());
        }
    } catch (e) { res.status(500).json({ error: 'Lỗi lấy danh sách' }); }
});

// Xóa Key
app.delete('/api/admin/keys/:code', async (req, res) => {
    try {
        if (isDbConnected) await Key.deleteOne({ code: req.params.code });
        else ramKeys = ramKeys.filter(k => k.code !== req.params.code);
        res.json({ message: 'Đã xóa Key' });
    } catch (e) { res.status(500).json({ error: 'Lỗi xóa Key' }); }
});

// ================= API USER (XÁC THỰC KEY) =================
app.post('/api/verify-key', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Vui lòng nhập Key' });

        let foundKey = null;

        if (isDbConnected) {
            foundKey = await Key.findOne({ code });
        } else {
            foundKey = ramKeys.find(k => k.code === code);
        }

        if (!foundKey) {
            return res.status(404).json({ error: 'Key không tồn tại trên hệ thống!' });
        }

        // Kiểm tra hạn sử dụng
        if (foundKey.expireAt !== -1) {
            const now = new Date().getTime();
            if (now > foundKey.expireAt) {
                return res.status(403).json({ error: 'Key đã hết hạn sử dụng!' });
            }
        }

        res.json({ message: 'Xác thực thành công', key: foundKey });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi Server khi xác thực' });
    }
});

app.listen(PORT, () => console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`));
