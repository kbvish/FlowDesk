# FlowDesk 🛡️

> **A modern, offline-first desktop productivity dashboard for Windows.**

[![Windows](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge\&logo=windows)]()
[![Electron](https://img.shields.io/badge/Electron-30-47848F?style=for-the-badge\&logo=electron)]()
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge\&logo=react)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge\&logo=typescript)]()
[![SQLite](https://img.shields.io/badge/SQLite-Offline-003B57?style=for-the-badge\&logo=sqlite)]()

FlowDesk is a premium, offline-first Windows desktop application designed to help you organize your tasks, goals, notes, and calendar in one unified workspace. All data is stored locally using SQLite, ensuring complete privacy without requiring an internet connection or an account.

---

# 📥 Download

### Latest Release

➡️ **Download the latest version here:**

**https://github.com/kbvish/FlowDesk/releases/latest**

No additional software or database installation is required.

Simply:

1. Download **FlowDesk Setup.exe**
2. Run the installer
3. Launch FlowDesk

---

# ✨ Features

## 📊 Dashboard

* Time-based greetings
* Daily productivity score
* Weekly analytics
* Current streak tracking
* Focus task
* Upcoming deadlines
* Recent activity

---

## ✅ Task Management

* Create, edit, and delete tasks
* Subtasks
* Priorities
* Categories
* Search & filters
* Bulk actions
* Drag-and-drop organization

---

## 📅 Calendar

* Monthly and weekly views
* Drag-and-drop rescheduling
* Color-coded task visualization

---

## 🎯 Goal Tracking

* Long-term goals
* Milestones
* Progress tracking
* Achievement system

---

## 📝 Markdown Notes

* Folder organization
* Markdown editor
* Live preview
* Autosave
* Search

---

## 📈 Statistics

* Productivity trends
* Weekly and monthly completion charts
* Current streak
* Category breakdown

---

## 🏆 Gamification

* Achievement badges
* Productivity streaks
* Toast notifications
* Daily reflections

---

## 🎨 Customization

* Dark & Light themes
* Dynamic accent colors
* Modern UI
* Responsive layouts

---

## 💾 Backup & Recovery

* Export JSON backups
* ZIP database backups
* Restore from backups
* Local application logs

---

# 🛠️ Technology Stack

| Category         | Technology              |
| ---------------- | ----------------------- |
| Desktop          | Electron 30             |
| Frontend         | React 18 + TypeScript   |
| Styling          | Tailwind CSS            |
| State Management | Zustand                 |
| Routing          | React Router v6         |
| Charts           | Recharts                |
| Database         | SQLite (better-sqlite3) |
| Packaging        | Electron Builder        |

---

# 📁 Project Structure

```text
FlowDesk/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   └── quotes.json
│
├── src/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── styles/
│   ├── types/
│   └── utils/
│
├── public/
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

# 🚀 Getting Started

## Prerequisites

Install:

* Node.js (v18+)
* npm (v9+)
* Visual Studio Build Tools (Windows)

---

## Installation

```bash
npm install
```

---

## Run in Development

Renderer

```bash
npm run dev:renderer
```

Electron

```bash
npm run dev:electron
```

---

## Build for Production

```bash
npm run package
```

Generated files will be available in:

```text
release/
```

Including:

* FlowDesk Setup.exe
* FlowDesk Portable.exe

---

# 🔒 Privacy

FlowDesk is completely offline.

Your data is never uploaded to any server.

All information is stored locally on your computer using SQLite.

---

# 📂 Data Storage

Database

```text
C:\Users\<Username>\AppData\Roaming\FlowDesk\database\flowdesk.db
```

Logs

```text
C:\Users\<Username>\AppData\Roaming\FlowDesk\logs\app.log
```

---

# 🗺️ Roadmap

* Cloud Sync
* AI Assistant
* Habit Tracker
* Pomodoro Timer
* Mobile Companion App
* Auto Updates

---

📥 Download
Windows

Download the latest stable release of FlowDesk using one of the options below.

🚀 Installer (Recommended)

[⬇️ Download FlowDesk Setup v1.0.0](https://github.com/kbvish/FlowDesk/releases/download/v0.1.0/FlowDesk.Setup.1.0.0.exe)

The installer will:

Install FlowDesk on your PC
Create Start Menu shortcuts
Optionally create a Desktop shortcut
Register an uninstaller
Bundle all required dependencies (no need to install SQLite, Node.js, or any additional software)
📦 Latest Release

You can also browse all releases, release notes, and previous versions here:

https://github.com/kbvish/FlowDesk/releases/latest

Requirements
Windows 10 or Windows 11 (64-bit)

No internet connection is required after installation.

All user data is stored locally using SQLite for complete privacy.

# 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

Please open an Issue or submit a Pull Request.

---

# 📄 License

This project is licensed under the MIT License.

---



## ⭐ Support

If you find FlowDesk useful, consider giving the repository a **⭐ Star** on GitHub. It helps others discover the project and supports future development.
