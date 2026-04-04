# NNPTUDM_BCMH

Web ban xe do dung Node.js, Express, Mongoose va frontend tinh.

## Chuc nang

- Dang ky, dang nhap bang JWT
- Phan quyen `admin` va `user`
- Trang chu hien thi xe noi bat, thuong hieu, danh muc, khuyen mai
- Trang rieng cho `user`: xem dashboard, dat hang tu gio
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
