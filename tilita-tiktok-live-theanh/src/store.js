import fs from 'node:fs';
import path from 'node:path';

export class JsonStore {
  constructor(dir) { this.dir = dir; this.errors = []; this.blocked = new Set(); fs.mkdirSync(dir, { recursive: true }); }
  read(name, fallback) {
    const file = path.join(this.dir, name + '.json');
    if (!fs.existsSync(file)) return structuredClone(fallback);
    try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
    catch { this.blocked.add(name); this.errors.push(`File ${name}.json lỗi. Đang dùng giá trị mặc định; file gốc được giữ nguyên. Đóng tool và đổi tên file lỗi trước khi lưu lại.`); return structuredClone(fallback); }
  }
  write(name, data) {
    if (this.blocked.has(name)) throw new Error(`Không ghi đè ${name}.json đang lỗi. Hãy xem nhật ký.`);
    const file = path.join(this.dir, name + '.json');
    fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(file + '.tmp', file);
  }
}
