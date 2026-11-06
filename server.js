// ============================================================
// PROXY VIP - KEY SERVER
// API cấp key free + xác thực key
// Hỗ trợ: ngày (day) / tuần (week) / tháng (month) / vĩnh viễn (lifetime)
// ============================================================

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
app.use(express.static(path.join(__dirname, 'public')));

// ============ DATABASE JSON ============
const DB_FILE = path.join(__dirname, 'keys.json');

// Khởi tạo DB nếu chưa có
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

// ============ CẤU HÌNH THỜI HẠN KEY ============
const DURATIONS = {
    day:      { ms: 24 * 60 * 60 * 1000,           label: 'Ngày / Day' },
    week:     { ms: 7 * 24 * 60 * 60 * 1000,       label: 'Tuần / Week' },
    month:    { ms: 30 * 24 * 60 * 60 * 1000,      label: 'Tháng / Month' },
    lifetime: { ms: null,                            label: 'Vĩnh viễn / Lifetime' }
};

// ============ TẠO KEY ============
function generateKey(type) {
    // Format: VIP-XXXXX-XXXXX-XXXXX (dễ đọc)
    const rand = () => crypto.randomBytes(3).toString('hex').toUpperCase();
    return `VIP-${rand()}-${rand()}-${rand()}`;
}

// ============ API: LẤY KEY FREE ============
// POST /api/get-key  body: { type: 'day'|'week'|'month'|'lifetime', deviceId?: string }
app.post('/api/get-key', (req, res) => {
    const { type, deviceId } = req.body;

    // Kiểm tra loại key hợp lệ
    if (!type || !DURATIONS[type]) {
        return res.status(400).json({
            success: false,
            message: 'Loại key không hợp lệ. Chọn: day / week / month / lifetime'
        });
    }

    const db = loadDB();

    // (Tùy chọn) Giới hạn 1 device chỉ được get 1 key free / loại / ngày
    if (deviceId) {
        const today = new Date().toDateString();
        const existed = db.keys.find(k =>
            k.deviceId === deviceId &&
            k.type === type &&
            new Date(k.createdAt).toDateString() === today
        );
        if (existed) {
            return res.status(429).json({
                success: false,
                message: 'Hôm nay bạn đã nhận key loại này rồi. Thử loại khác hoặc quay lại ngày mai!',
                existingKey: existed.key,
                expiresAt: existed.expiresAt
            });
        }
    }

    // Tạo key mới
    const key = generateKey(type);
    const now = Date.now();
    const duration = DURATIONS[type].ms;
    const expiresAt = duration === null ? null : now + duration;

    const newKey = {
        key,
        type,
        typeLabel: DURATIONS[type].label,
        deviceId: deviceId || null,
        createdAt: now,
        expiresAt,
        active: true,
        usedCount: 0
    };

    db.keys.push(newKey);
    saveDB(db);

    res.json({
        success: true,
        message: `Cấp key ${DURATIONS[type].label} thành công!`,
        key: newKey.key,
        type: newKey.type,
        typeLabel: newKey.typeLabel,
        createdAt: newKey.createdAt,
        expiresAt: newKey.expiresAt,
        expiresIn: duration === null ? 'Vĩnh viễn' : formatDuration(duration)
    });
});

// ============ API: XÁC THỰC KEY ============
// POST /api/verify-key  body: { key: 'VIP-XXXXX-...' }
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

    // Kiểm tra hết hạn
    if (found.expiresAt !== null && Date.now() > found.expiresAt) {
        return res.status(403).json({ success: false, message: 'Key đã hết hạn' });
    }

    if (!found.active) {
        return res.status(403).json({ success: false, message: 'Key đã bị vô hiệu hóa' });
    }

    // Tăng lượt dùng
    found.usedCount = (found.usedCount || 0) + 1;
    saveDB(db);

    res.json({
        success: true,
        message: 'Key hợp lệ',
        key: found.key,
        type: found.type,
        typeLabel: found.typeLabel,
        createdAt: found.createdAt,
        expiresAt: found.expiresAt,
        remaining: found.expiresAt === null
            ? 'Vĩnh viễn'
            : formatDuration(found.expiresAt - Date.now())
    });
});

// ============ API: DANH SÁCH KEY (admin - demo) ============
app.get('/api/keys', (req, res) => {
    const db = loadDB();
    res.json({ success: true, total: db.keys.length, keys: db.keys });
});

// ============ HELPER: format thời gian ============
function formatDuration(ms) {
    if (ms <= 0) return 'Đã hết hạn';
    const sec = Math.floor(ms / 1000);
    const day = Math.floor(sec / 86400);
    const hour = Math.floor((sec % 86400) / 3600);
    const min = Math.floor((sec % 3600) / 60);
    if (day > 0) return `${day} ngày ${hour} giờ`;
    if (hour > 0) return `${hour} giờ ${min} phút`;
    return `${min} phút`;
}

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log(`\n🚀 PROXY VIP SERVER đang chạy tại: http://localhost:${PORT}`);
    console.log(`📁 DB: ${DB_FILE}`);
    console.log(`\n📌 API:`);
    console.log(`   POST /api/get-key     → lấy key free (day/week/month/lifetime)`);
    console.log(`   POST /api/verify-key  → xác thực key`);
    console.log(`   GET  /api/keys        → xem tất cả key (demo)\n`);
});
