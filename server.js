const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ============ DATABASE JSON ============
const DB_FILE = path.join(__dirname, 'keys.json');

function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ keys: [] }, null, 2));
    }
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return { keys: [] };
    }
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ============ TẠO KEY RANDOM ============
function generateKey() {
    const part = () => crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
    return `VIP-${part()}-${part()}-${part()}`;
}

// ============ API ROUTES ============

// 1. Lấy Key Free
app.post('/api/get-key', (req, res) => {
    const { deviceId } = req.body || {};
    const db = loadDB();

    // Chống spam: Mỗi device chỉ lấy 1 key / ngày
    if (deviceId) {
        const today = new Date().toDateString();
        const existed = db.keys.find(k =>
            k.deviceId === deviceId &&
            new Date(k.createdAt).toDateString() === today
        );
        if (existed) {
            return res.status(429).json({
                success: false,
                message: 'Hôm nay bạn đã nhận key rồi. Quay lại ngày mai nhé!',
                key: existed.key
            });
        }
    }

    const key = generateKey();
    const newKey = {
        key,
        deviceId: deviceId || null,
        createdAt: Date.now(),
        active: true,
        usedCount: 0
    };

    db.keys.push(newKey);
    saveDB(db);

    console.log(`[GET KEY] Đã cấp: ${key} | Device: ${deviceId || 'unknown'}`);

    res.json({
        success: true,
        message: 'Cấp key thành công!',
        key: newKey.key
    });
});

// 2. Xác thực Key
app.post('/api/verify-key', (req, res) => {
    const { key } = req.body;

    if (!key) return res.status(400).json({ success: false, message: 'Thiếu key' });

    const db = loadDB();
    const found = db.keys.find(k => k.key === key.trim().toUpperCase());

    if (!found) return res.status(404).json({ success: false, message: 'Key không tồn tại' });
    if (!found.active) return res.status(403).json({ success: false, message: 'Key bị vô hiệu hóa' });

    found.usedCount = (found.usedCount || 0) + 1;
    saveDB(db);

    console.log(`[VERIFY] Key hợp lệ: ${found.key}`);

    res.json({
        success: true,
        message: 'Key hợp lệ',
        key: found.key,
        createdAt: found.createdAt
    });
});

// 3. API Xem toàn bộ Key (Dành cho Admin)
app.get('/api/keys', (req, res) => {
    const db = loadDB();
    res.json({ success: true, total: db.keys.length, keys: db.keys });
});

// ============ PHỤC VỤ GIAO DIỆN WEB (FIX LỖI CANNOT GET /) ============
// Phục vụ các file tĩnh trong thư mục 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Bất kỳ route nào không khớp API và file tĩnh -> trả về index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ KHỞI CHẠY SERVER ============
app.listen(PORT, () => {
    console.log(`\n🚀 PROXY VIP SERVER ĐANG CHẠY TẠI CỔNG: ${PORT}`);
    console.log(`👉 Mở trình duyệt: http://localhost:${PORT}`);
    console.log(`📁 Database: ${DB_FILE}`);
    console.log(`\n⚠️  LƯU Ý TRÊN RENDER: File keys.json sẽ bị reset khi server khởi động lại (do Free tier).\n`);
});
