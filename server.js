// ============================================================
// PROXY VIP - KEY SERVER (FREE KEY EDITION)
// Server tự tạo key random và cấp free cho người dùng
// Không phân loại ngày/tuần/tháng/vĩnh viễn
// ============================================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ DATABASE ============
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
// Format: VIP-XXXXX-XXXXX-XXXXX (15 ký tự random, dễ đọc)
function generateKey() {
    const part = () => crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
    return `VIP-${part()}-${part()}-${part()}`;
}

// ============ API: LẤY KEY FREE ============
// POST /api/get-key
// Server tự tạo key random, không phân loại
app.post('/api/get-key', (req, res) => {
    const { deviceId } = req.body || {};
    const db = loadDB();

    // (Tùy chọn) Giới hạn: mỗi device chỉ được get 1 key / ngày
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
                key: existed.key,
                createdAt: existed.createdAt
            });
        }
    }

    // Tạo key mới
    const key = generateKey();
    const now = Date.now();

    const newKey = {
        key,
        deviceId: deviceId || null,
        createdAt: now,
        active: true,
        usedCount: 0
    };

    db.keys.push(newKey);
    saveDB(db);

    console.log(`[GET KEY] Cấp key mới: ${key} | device: ${deviceId || 'unknown'}`);

    res.json({
        success: true,
        message: 'Cấp key free thành công!',
        key: newKey.key,
        createdAt: newKey.createdAt
    });
});

// ============ API: XÁC THỰC KEY ============
// POST /api/verify-key
app.post('/api/verify-key', (req, res) => {
    const { key } = req.body;

    if (!key) {
        return res.status(400).json({ success: false, message: 'Thiếu key' });
    }

    const db = loadDB();
    const found = db.keys.find(k => k.key === key.trim().toUpperCase());

    if (!found) {
        return res.status(404).json({ success: false, message: 'Key không tồn tại' });
    }

    if (!found.active) {
        return res.status(403).json({ success: false, message: 'Key đã bị vô hiệu hóa' });
    }

    found.usedCount = (found.usedCount || 0) + 1;
    saveDB(db);

    console.log(`[VERIFY] Key ${found.key} hợp lệ (dùng ${found.usedCount} lần)`);

    res.json({
        success: true,
        message: 'Key hợp lệ',
        key: found.key,
        createdAt: found.createdAt,
        usedCount: found.usedCount
    });
});

// ============ API: DANH SÁCH KEY (admin demo) ============
app.get('/api/keys', (req, res) => {
    const db = loadDB();
    res.json({ success: true, total: db.keys.length, keys: db.keys });
});

// ============ START ============
app.listen(PORT, () => {
    console.log(`\n🚀 PROXY VIP SERVER chạy tại: http://localhost:${PORT}`);
    console.log(`📁 DB: ${DB_FILE}`);
    console.log(`\n📌 API:`);
    console.log(`   POST /api/get-key     → lấy key free (server tự tạo)`);
    console.log(`   POST /api/verify-key  → xác thực key`);
    console.log(`   GET  /api/keys        → xem tất cả key (demo)\n`);
});
