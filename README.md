# NNPTUDM_BCMH

Web ban xe do dung Node.js, Express, Mongoose va frontend tinh.

## Chuc nang

- Dang ky, dang nhap bang JWT
- Phan quyen `admin` va `user`
- Trang chu hien thi xe noi bat, thuong hieu, danh muc, khuyen mai
- Trang rieng cho `user`: xem dashboard, dat hang tu gio
- Thanh toan co 2 lua chon: `Tien mat` hoac `Giao dich ma QR`, ma QR tu dong nhung tong tien
- Trang rieng cho `admin`: xem dashboard, tao khuyen mai
- Su dung 8 model MongoDB:
  - `User`
  - `Brand`
  - `Category`
  - `Vehicle`
  - `Cart`
  - `Order`
  - `Review`
  - `Promotion`

## Cau hinh MongoDB Compass

1. Cai `MongoDB Community Server` va `MongoDB Compass`.
2. Tao file `.env` tu `.env.example`.
3. Dat chuoi ket noi:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/xe_do_shop
JWT_SECRET=super_secret_key
GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
QR_BANK_BIN=970407
QR_BANK_NAME=Techcombank
QR_ACCOUNT_NO=7777368888
QR_ACCOUNT_NAME=NGUYEN VAN THANH HUNG
QR_TEMPLATE=compact2
```

4. Trong MongoDB Compass, connect bang:

```text
mongodb://127.0.0.1:27017
```

5. Sau khi seed du lieu, database `xe_do_shop` se xuat hien trong Compass.

## Cach chay

```bash
npm install
copy .env.example .env
npm run seed
npm run dev
```

Mo `http://localhost:5000`.

## Dang nhap Google

1. Tao `OAuth Client ID` loai `Web application` trong Google Cloud Console.
2. Them `Authorized JavaScript origins`:
   - `http://localhost:5000`
3. Gan `GOOGLE_CLIENT_ID` vao file `.env`.
4. Mo trang chu, bam `Dang nhap` hoac `Dang ky`, sau do chon `Google`.

Backend se xac thuc `idToken` cua Google, tim hoac tao user trong MongoDB, roi phat JWT noi bo cua he thong.

## Tai khoan demo

- Admin: `admin` / `123456`
- User: `user1` / `123456`

## API chinh

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/catalog/home`
- `GET /api/catalog/vehicles`
- `GET /api/user/dashboard`
- `POST /api/user/cart`
- `POST /api/user/orders`
- `POST /api/user/reviews`
- `GET /api/admin/dashboard`
- `POST /api/admin/brands`
- `POST /api/admin/categories`
- `POST /api/admin/vehicles`
- `PATCH /api/admin/orders/:id/status`
- `POST /api/admin/promotions`

## Ghi chu

- `MongoDB Compass` chi la cong cu xem va quan ly du lieu, app Node.js ket noi vao MongoDB qua `MONGO_URI`.
- Trong workspace nay minh moi scaffold code, chua `npm install` vi moi truong hien tai khong co truy cap mang.
