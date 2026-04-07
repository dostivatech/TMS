# 🌲 WoodTrack Node.js Backend

Simple Express + SQLite backend. No virtual environment needed!

## 📁 Structure

```
woodtrack-node/
├── .env                      ← Environment config
├── package.json
└── src/
    ├── server.js             ← Entry point
    ├── models/index.js       ← All database models
    ├── middleware/auth.js    ← JWT middleware
    ├── config/database.js   ← SQLite connection
    └── routes/
        ├── auth.js           ← Login, register, me
        ├── transactions.js   ← Buy/sell CRUD
        ├── invoices.js       ← Invoice management
        ├── payments.js       ← Payment recording
        ├── customerProducts.js ← Customers + Products
        └── dashboard.js      ← Analytics
```

## 🚀 Setup (3 steps only!)

### Step 1 - Install
```
npm install
```

### Step 2 - Start
```
npm run dev
```

### Step 3 - Login
Default credentials created automatically:
- Username: admin
- Password: admin123

## 📡 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register |
| GET | /api/auth/me | Current user |
| GET | /api/dashboard | Analytics |
| GET/POST | /api/transactions | Transactions |
| GET/POST | /api/invoices | Invoices |
| POST | /api/invoices/:id/mark_sent | Mark sent |
| POST | /api/invoices/:id/cancel | Cancel |
| GET | /api/invoices/reminders | Overdue alerts |
| GET/POST | /api/payments | Payments |
| GET/POST | /api/customers | Customers |
| GET/POST | /api/products | Products |

## 🔧 Create Additional Users

Hit this endpoint:
```
POST http://localhost:8000/api/auth/register
{
  "username": "john",
  "password": "john1234",
  "password2": "john1234",
  "firstName": "John"
}
```

## 📱 Mobile App Connection
Update BASE_URL in mobile app:
```
http://YOUR_PC_IP:8000/api
```
