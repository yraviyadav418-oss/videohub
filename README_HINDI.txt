VIDEOHUB — WEBSITE + ADMIN PANEL
================================

Is ZIP mein website aur admin panel ka source code ek saath hai.

FEATURES
- Home page
- Video listing aur search
- Video detail page
- Admin login
- Admin se video add / edit / delete
- SQLite database mein video details save hoti hain
- Admin password ka hash store hota hai
- Login attempts par basic rate limit
- Session cookie HttpOnly aur SameSite=Lax

IMPORTANT
Yeh ZIP source project hai, live website nahi. Website ko chalane ke liye Node.js runtime chahiye.
Sirf ZIP ko Android browser mein kholne se backend/admin database nahi chalega.
Abhi hosting kharidne ki zaroorat nahi; project files tayyar hain. Online karne ke liye baad mein Node.js support wali hosting chahiye.

COMPUTER PAR LOCAL RUN
1. Node.js 20 ya newer install karein.
2. Is folder mein terminal/command prompt kholein.
3. Run karein: npm install
4. Run karein: npm start
5. Browser mein kholein: http://localhost:3000

ADMIN PANEL
1. Website kholne par /admin/setup par jaayein.
2. Pehli baar admin username aur password banayein.
3. Phir /admin/login par login karein.
4. Admin dashboard se videos add/edit/delete karein.

ANDROID
Android par bhi chal sakta hai, lekin Termux jaise environment mein Node.js aur native SQLite dependency setup karna pad sakta hai. Asaan tareeqa: project ko computer par local run karna ya baad mein Node.js hosting par deploy karna.

VIDEO URL
Video URL mein apne video ka direct MP4 URL ya supported embed URL daalein. Poster URL optional hai.
Download links optional hain; sirf wahi links daalein jinke istemal ki permission aapke paas ho.

SECURITY / DEPLOYMENT
- Production par HTTPS use karein.
- SESSION_SECRET environment variable set karein.
- Admin password strong rakhein.
- Public hosting par /admin/setup sirf pehli admin account banne tak khula rehta hai.
- Is starter project ko public launch se pehle hosting-specific security review aur backups ki zaroorat hai.

PUBLIC WEBSITE SE ADMIN CHHUPANA
- Public navigation mein Admin Panel ka link nahi hai.
- robots.txt search crawlers ko /admin aur /admin/setup index na karne ko kehta hai.
- Yeh security ka replacement nahi hai: Admin routes par login aur server-side authorization zaroori hai.
- Pehla admin account banane ke baad /admin/setup automatically band ho jata hai.
