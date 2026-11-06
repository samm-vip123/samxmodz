const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 6767; // ĐÃ ĐỔI CỔNG THÀNH 6767

const ADMIN_PASSWORD = "admin123"; 
app.use(cors());
app.use(express.json());

// ============ DATABASE ============
const DB_FILE = path.join(__dirname, 'keys.json');

function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ keys: [], config: { proxypin: "" } }, null, 2));
    }
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if(!data.config) data.config = { proxypin: "" };
        return data;
    } catch (e) {
        return { keys: [], config: { proxypin: "" } };
    }
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ============ TẠO KEY ============
function generateKey() {
    const part = () => crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
    return `VIP-${part()}-${part()}-${part()}`;
}

// ============ API USER ============
app.post('/api/get-key', (req, res) => {
    const { deviceId } = req.body || {};
    const db = loadDB();

    if (deviceId) {
        const today = new Date().toDateString();
        const existed = db.keys.find(k =>
            k.deviceId === deviceId &&
            new Date(k.createdAt).toDateString() === today
        );
        if (existed) {
            return res.status(429).json({ success: false, message: 'Hôm nay bạn đã nhận key rồi.', key: existed.key });
        }
    }

    const key = generateKey();
    const newKey = { 
        key, 
        deviceId: deviceId || null, 
        createdAt: Date.now(), 
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), 
        active: true, 
        usedCount: 0 
    };
    db.keys.push(newKey);
    saveDB(db);
    res.json({ success: true, key: newKey.key });
});

app.post('/api/verify-key', (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, message: 'Thiếu key' });

    const db = loadDB();
    const found = db.keys.find(k => k.key === key.trim().toUpperCase());

    if (!found) return res.status(404).json({ success: false, message: 'Key không tồn tại' });
    if (!found.active) return res.status(403).json({ success: false, message: 'Key bị vô hiệu hóa' });
    if (found.expiresAt && Date.now() > found.expiresAt) return res.status(403).json({ success: false, message: 'Key đã hết hạn' });

    found.usedCount = (found.usedCount || 0) + 1;
    saveDB(db);
    res.json({ success: true, message: 'Key hợp lệ' });
});

// ============ API TẢI FILE CẤU HÌNH (.mobileconfig) ============
// Tạo một route để tải file cấu hình trực tiếp từ server của bạn
app.get('/api/download-config', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'proxypin.mobileconfig');
    
    if (fs.existsSync(filePath)) {
        // Đặt header để trình duyệt hiểu đây là file cần tải về
        res.setHeader('Content-Disposition', 'attachment; filename="proxypin.mobileconfig"');
        res.setHeader('Content-Type', 'application/x-apple-aspen-config');
        res.sendFile(filePath);
    } else {
        res.status(404).send('Không tìm thấy file cấu hình trên Server.');
    }
});

// ============ API ADMIN ============
function checkAdmin(req, res, next) {
    const pass = req.headers['x-admin-password'] || req.body.password;
    if (pass !== ADMIN_PASSWORD) return res.status(401).json({ success: false, message: 'Sai mật khẩu Admin!' });
    next();
}

app.get('/api/admin/keys', checkAdmin, (req, res) => {
    const db = loadDB();
    res.json({ success: true, keys: db.keys.reverse() });
});

app.post('/api/admin/create', checkAdmin, (req, res) => {
    const { amount, type } = req.body; 
    const count = parseInt(amount) || 1;
    if (count > 100) return res.status(400).json({ success: false, message: 'Tối đa 100 key/lần' });

    const db = loadDB();
    const newKeys = [];
    const now = Date.now();
    
    let expiresAt = null;
    if (type === 'hour') expiresAt = now + (60 * 60 * 1000);
    else if (type === 'day') expiresAt = now + (24 * 60 * 60 * 1000);
    else if (type === 'week') expiresAt = now + (7 * 24 * 60 * 60 * 1000);
    else if (type === 'month') expiresAt = now + (30 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < count; i++) {
        const newKey = { key: generateKey(), deviceId: "ADMIN_CREATED", createdAt: now, expiresAt: expiresAt, active: true, usedCount: 0 };
        db.keys.push(newKey);
        newKeys.push(newKey.key);
    }
    saveDB(db);
    res.json({ success: true, message: `Đã tạo ${count} key (${type})` });
});

app.delete('/api/admin/delete/:key', checkAdmin, (req, res) => {
    const db = loadDB();
    const initLength = db.keys.length;
    db.keys = db.keys.filter(k => k.key !== req.params.key);
    if (db.keys.length === initLength) return res.status(404).json({ success: false, message: 'Không tìm thấy key' });
    saveDB(db);
    res.json({ success: true, message: 'Đã xóa key' });
});

// ============ SERVE FRONTEND ============
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 SERVER CHẠY TẠI CỔNG: ${PORT}`);
    console.log(`👉 TRANG CHỦ: http://localhost:${PORT}`);
    console.log(`👉 TRANG ADMIN: http://localhost:${PORT}/Admin.html\n`);
});
