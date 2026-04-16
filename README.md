<div align="center">
  
  # 💰 ExpenseIQ — Smart Financial Tracker
  
  **A premium, high-performance financial management platform.**
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-Online-success?style=for-the-badge&logo=vercel)](https://expense-iq-gold.vercel.app/)
  [![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)
  [![Made with Vanilla JS](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
</div>

<br />

## 🚀 Overview

**ExpenseIQ** is a modern, responsive, and robust expense management application designed to give users absolute control over their financial health. Built natively with **Vanilla JavaScript, HTML5, and CSS3**, it avoids heavy framework bloat while providing a state-of-the-art **Glassmorphism** UI, dynamic animations, and seamless data synchronization via **Supabase**.

Whether you prefer to keep your data strictly on your device (Guest Mode) or securely synced to the cloud across multiple devices via **Google OAuth & PostgreSQL RLS**, ExpenseIQ handles it effortlessly.

---

## ✨ Core Features

### 🔐 Security & Sync (Supabase integration)
- **Google OAuth Login:** Secure 1-click Google authentication via Supabase Auth.
- **Row Level Security (RLS):** Airtight Postgres security ensuring full mathematical isolation of your personal data.
- **Offline-First Guest Mode:** Don't want to log in? Use the app 100% offline via native `localStorage` logic with zero remote calls.

### 📊 Powerful Analytics
- **Dynamic Dashboard:** Real-time summary cards mapping Income, Expenses, and Net Balance.
- **Visual Analytics:** Fully interactive dependency-free `Chart.js` components visualizing spending distribution and time-series trends.

### 💸 Core Operations
- **Transactions Management:** Add, edit, delete, and infinitely scroll through transactions with robust fuzzy-searching.
- **Budgeting Engine:** Assign category limits and receive real-time, toast-based alert warnings when you are nearing or exceeding your limits.
- **Dynamic Categories:** Fully customizable spending categories powered by dynamic `lucide` iconography.

### 🎨 Premium UI/UX & Output
- **State-of-the-Art Aesthetic:** Smooth, performance-focused Glassmorphism design utilizing `CSS var()` theming for **Dark/Light Mode** toggling.
- **PDF Export Generator:** Using `html2pdf.js`, automatically rip your data into a stunning, executive-ready PDF report.

---

## 🛠️ Architecture & Tech Stack

While many modern apps rely on React or Vue, this project was purpose-built to prove the extreme capabilities of an optimized **Vanilla Web Stack**.

| Domain | Technology |
|---|---|
| **Frontend Setup** | HTML5, CSS3 Variables, Vanilla JS (ES6+) |
| **Backend & DB** | Supabase, PostgreSQL |
| **Authentication** | Supabase Auth (Google OAuth 2.0) |
| **Charting** | Chart.js (CDN) |
| **PDF Generation** | html2pdf.js |
| **Icons** | Lucide Icons |
| **Deployment** | Vercel |

---

## ⚙️ Local Development & Setup

To run or contribute to ExpenseIQ locally, follow these steps:

### 1. Clone the Repository
```bash
git clone https://github.com/VAIBHAV7848/ExpenseIQ.git
cd ExpenseIQ
```

### 2. Run Locally (No Build Step Required)
Because the app is natively written, you can simply run it with any static server.
Using `npx` and `serve`:
```bash
npx serve .
```
Or simply use **VSCode Live Server** to serve `index.html`. 

### 3. Setup Supabase (Optional for Cloud Sync)
If you want to configure your own backend instead of Guest Mode:
1. Create a [Supabase](https://supabase.com/) project.
2. Run the SQL schema from `supabase_schema.sql` in your Supabase SQL Editor.
3. Update `js/supabaseConfig.js` with your Project URL and Anon Key.
4. Ensure Google Cloud Console OAuth is configured with your Supabase callback URL.

---

## 🤝 Project Origin

Developed primarily by **Group 7 (Web Technology Lab, 2nd Year CSE)**. 
Designed as a capstone demonstration of utilizing advanced standard web APIs, responsive layout engineering, and distributed backend-as-a-service (BaaS) logic safely.
