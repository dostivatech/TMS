# 📱 WoodTrack Mobile App

React Native (Expo) mobile app for WoodTrack — connects to the same Django backend.

## 📁 Structure

```
woodtrack-mobile/
├── App.js                        # Root entry
├── app.json                      # Expo config
├── package.json
├── babel.config.js
└── src/
    ├── api/api.js                # Axios API client (change BASE_URL here!)
    ├── context/AuthContext.js    # JWT auth with AsyncStorage
    ├── theme.js                  # Colors and styles
    ├── navigation/
    │   └── AppNavigator.js       # Bottom tabs + stack navigation
    ├── components/
    │   └── UI.js                 # Shared components
    └── screens/
        ├── LoginScreen.js
        ├── DashboardScreen.js    # Charts + stats
        ├── TransactionsScreen.js # Buy/sell CRUD
        ├── InvoicesScreen.js     # Invoice list
        ├── InvoiceDetailScreen.js# Invoice detail + payments
        ├── RemindersScreen.js    # Overdue alerts
        ├── CustomersScreen.js    # Customer management
        ├── ProductsScreen.js     # Product catalog
        └── ProfileScreen.js      # User profile + logout
```

## 🚀 Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set your backend IP address
Open `src/api/api.js` and update:
```javascript
export const BASE_URL = 'http://YOUR_PC_IP:8000/api'
```

Find your PC IP:
```bash
ipconfig   # Windows
```

### 3. Start backend with network access
```bash
python manage.py runserver 0.0.0.0:8000
```

### 4. Start the app
```bash
npx expo start
```

### 5. Test on phone
- Install **Expo Go** from Play Store
- Scan the QR code shown in terminal

## 📱 Screens

| Screen | Features |
|--------|---------|
| Login | JWT authentication |
| Dashboard | Charts, stats, overdue alerts |
| Transactions | List, create, delete with filters |
| Invoices | List with status tabs, search |
| Invoice Detail | View items, record payments, cancel |
| Reminders | Overdue + due-soon with configurable days |
| Customers | CRUD with search |
| Products | CRUD with unit selection |
| Profile | User info, logout |

## 🏗️ Build APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure
eas build:configure

# Build APK
eas build --platform android --profile preview
```
