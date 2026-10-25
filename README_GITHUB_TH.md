# 55 AMBERLANDS — GitHub Pages Migration (ภาษาไทย)

ต้นทาง: ZIP Netlify deploy-6adcc1be5186cf1e513f4ab0.zip ที่ผู้ใช้อัปโหลด
ชุดนี้เป็น **V24.2 Pixel + ระบบออนไลน์ V23.4** ตามไฟล์ต้นทาง; **ไม่ใช่ V24.3**.

## สำคัญมาก

- โปรเจกต์นี้เป็นเว็บ static (HTML/JS/PNG) เท่านั้น; ระบบล็อกอินและบันทึกเกมยังอยู่ใน Supabase เดิม
- อย่าย้ายหรือรัน SQL เพราะ GitHub Pages ไม่ใช่ backend และไม่ต้องเปลี่ยนฐานข้อมูลเดิม
- Source code ใน GitHub Repository แบบ Public อ่านได้โดยบุคคลทั่วไป
- ในเกมมี **Supabase publishable key** ฝังใน frontend อยู่แล้วตามปกติ; ตรวจ Supabase RLS ให้ถูกต้อง ห้ามใส่ service_role / secret key ใน repo
- ถ้า Item Shop รับเงินจริง หรือเว็บมีวัตถุประสงค์หลักเพื่อการค้า GitHub Pages ไม่ใช่ hosting ที่เหมาะ (GitHub Pages usage policy)
- GitHub Pages ไม่อ่านไฟล์ Netlify `_headers`; ไม่ได้คัดลอกไฟล์ดังกล่าวเข้าชุดนี้
- เปลี่ยนลิงก์เว็บ 3 หน้า (about / privacy / terms) จาก absolute path เป็น relative path รองรับ `ชื่อ.github.io/55-amberlands/`.

## เปิดใช้งานครั้งแรกบนมือถือ Android

1. สมัคร/ลงชื่อเข้า GitHub: https://github.com
2. สร้าง repo ที่ https://github.com/new ชื่อ `55-amberlands`, เลือก **Public**, branch ชื่อ **main**, สร้าง README เริ่มต้นได้
3. อัปโหลดไฟล์ ZIP นี้เป็นไฟล์ 1 ไฟล์เข้า repo ด้วย `Add file > Upload files` แล้วกด Commit
4. ที่ repo แตะ `Code > Codespaces > Create codespace on main`. หากเมนูเล็ก ให้ Chrome เปิด `Desktop site`. Codespaces มีโควต้าฟรีรายเดือน ไม่ใช่บริการไม่จำกัด
5. ใน Codespaces เลือก `Terminal > New Terminal` แล้วรัน 3 คำสั่งด้านล่าง (ตรงชื่อ ZIP):

```bash
unzip -o 55_AMBERLANDS_GITHUB_EDITABLE_SOURCE_V24_2.zip -d .
git rm -f 55_AMBERLANDS_GITHUB_EDITABLE_SOURCE_V24_2.zip
git add -A && git commit -m "Import 55 AMBERLANDS V24.2 from Netlify" && git push origin main
```

6. ไปที่ GitHub repo > Settings > Pages > Build and deployment > Source เลือก **GitHub Actions**
7. ดูแท็บ `Actions`, งาน `Deploy 55 AMBERLANDS` ต้องเป็นสีเขียว. หากไม่เริ่ม ลอง `Actions > Deploy 55 AMBERLANDS > Run workflow` (branch main)
8. เว็บอยู่ที่ `https://USERNAME.github.io/55-amberlands/` (แทน USERNAME ด้วยบัญชีจริง)

## เชื่อม Supabase + Google Login เดิม

1. ไป Supabase Dashboard **โปรเจกต์เดิม** > Authentication > URL Configuration > Redirect URLs
2. เพิ่ม URL ให้ตรงเป๊ะ `https://USERNAME.github.io/55-amberlands/`
3. ยังไม่ต้องลบ Redirect URL ของ Netlify เพราะช่วงทดสอบอาจต้องย้อนกลับ
4. `online_bridge.js` ใช้ `redirectTo: location.origin + location.pathname` จึงไปหน้า GitHub Pages อัตโนมัติเมื่อ URL นี้อยู่ใน allow list
5. Google OAuth callback ที่ Google Cloud ปกติยังเป็น `https://<project-ref>.supabase.co/auth/v1/callback` ไม่ใช่ Github Pages; อย่าเพิ่งแก้ Google callback ของเดิม
6. เมื่อเกมบน GitHub ทดสอบได้แล้ว ค่อยตั้ง Site URL เป็น GitHub หากต้องการให้เป็นเว็บไซต์หลัก; Site URL เป็น fallback สำหรับลิงก์ยืนยันอีเมล/รีเซ็ตรหัสผ่าน
7. ตรวจว่า Data API RLS ปกป้องข้อมูลตัวละครผู้เล่น ไม่ควรให้ผู้เล่นแก้ของคนอื่นได้

## หลังจากนี้แก้บั๊กได้ทันทีโดยไม่ Deploy ผ่าน Netlify

**วิธีเร็วบนมือถือ:**
1. เปิด repository บน GitHub > เลือกไฟล์ JS ที่ต้องแก้ เช่น `v23_dungeon.js`
2. แตะไอคอนดินสอ `Edit` หรือใช้ `https://github.dev/USERNAME/55-amberlands` (ฟรีและแก้หลายไฟล์ได้)
3. แก้โค้ดแล้วกด `Commit changes` ไปที่ branch `main`
4. GitHub Actions จะตรวจโค้ดและ deploy ใหม่โดยอัตโนมัติ

**วิธีปลอดภัยสำหรับบั๊กใหญ่:** แก้ใน branch `fix/...`, ทดลองก่อน แล้ว Merge ผ่าน Pull Request (merge main จึง deploy)

**Rollback:** repo > Commits > ดู Commit ก่อนหน้า แล้วใช้ Revert/Commit กู้กลับ หรือใช้ git revert ผ่าน Codespaces; GitHub Actions จะ deploy commit ที่ย้อนกลับให้อัตโนมัติ (การ revert frontend ไม่ย้อนข้อมูล Supabase ที่เปลี่ยนไปแล้ว)

**อัปเดตภาพ/ไอเทม:** อัปโหลดเข้า `assets/` + แก้โค้ด JS ที่เรียกภาพ + Commit ขึ้น main. อย่าเปลี่ยนไอดี item/server โดยไม่ตั้งใจ

**ตรวจหลังอัปเดต:** Google Login, โหลดตัวละครเดิม, ตีมอน/บอส, สกิล, ปีก, เพ็ต, inventory, ปาร์ตี้, ตลาด, มือถือจอแนวตั้ง

## ไฟล์ใน repo

- `index.html`: หน้าเกม (ใหญ่ ~1.16 MB)
- `online_bridge.js`: Supabase และ Google Login — ระวังอย่าเปลี่ยน endpoint โปรเจกต์เดิม
- `v23_dungeon.js`: ดันเจี้ยน V23.4
- `v20_itemshop_costumes.js`, `v23_pet_shop.js`: Item Shop, ปีก, สัตว์เลี้ยง
- `v24_px_*.js`: Pixel Art engine และการเชื่อมภาพ V24
- `assets/`: sprites PNG, SVG, manifest
- `.github/workflows/pages.yml`: auto deploy ทุกการ commit main
- `tools/check_static_site.py`: ทดสอบลิงก์ใน HTML และไฟล์ภาพ
- `tools/export_pages.py`: สร้าง `_site/` เฉพาะไฟล์เว็บ (ไม่เผยแพร่เอกสารและ repository tooling)

อย่าสับสน: GitHub เป็นที่เก็บโค้ด; GitHub Pages เป็นบริการเผยแพร่ static website; Supabase เป็นบริการเกมออนไลน์/ฐานข้อมูลเดิม
