# FlowDesk 🛡️

> **A modern, offline-first desktop productivity dashboard for Windows.**

[![Windows](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows)]()
[![Electron](https://img.shields.io/badge/Electron-30-47848F?style=for-the-badge&logo=electron)]()
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)]()
[![JSON Database](https://img.shields.io/badge/Database-Atomic_JSON-blue?style=for-the-badge&logo=json)]()

FlowDesk is a premium, offline-first Windows desktop application designed to help you organize your tasks, goals, notes, and calendar in one unified workspace. All data is stored locally in a human-readable JSON format, ensuring complete privacy, zero native C++ compile bottlenecks, and seamless support for remote cloud sync drives.

---

# 📥 Download & Installation

### Latest Release

➡️ **Download the latest version here:**

**https://github.com/kbvish/FlowDesk/releases/latest**

You can download one of two versions:

1. **`FlowDesk Setup 1.0.0.exe` (Windows Setup Wizard - Recommended)**
   * Double-click the installer to run the setup wizard.
   * Installs the app to your system, adds Desktop/Start Menu shortcuts, and automatically boots the app.
   * **Clean Uninstallation:** Registers automatically in the **Windows Control Panel ("Add or Remove Programs" / "Apps & Features")**. You can cleanly uninstall the application at any time like any native Windows software.
2. **`FlowDesk 1.0.0.exe` (Portable Version)**
   * A standalone executable that runs instantly from any folder (or a USB drive) without installing anything.
   * Does not register in the Control Panel (to uninstall, simply delete the executable and its local data folder).

---

# ✨ Features

## 📊 Dashboard
* Time-based greetings
* Daily productivity score
* Weekly completion charts using Recharts
* Streak fire tracker with micro-animations
* Focus task and upcoming deadlines
* Random motivational quote loader (240+ local quote database)

## ✅ Task Management
* Create, edit, delete tasks and nested checklist subtasks
* High, Medium, and Low priorities
* Categories/Folders tree
* Real-time search query filters and sorting metrics
* Checked multi-selection bulk operations (Bulk Complete / Bulk Delete)

## 📅 Rescheduling Calendar
* Toggleable Monthly grid and Weekly grids
* Native HTML5 drag-and-drop to reschedule task due dates
* Click empty cells to quickly add tasks with preset dates

## 🎯 Goal Timelines
* Milestone checklists for each target goal
* Completion progress tracking
* Unlocks trophies upon completion

## 📝 Markdown Notes
* Folder explorer panel
* Split-pane raw Markdown editor and styled HTML parsed Preview
* 500ms debounced autosave directly to database file

## 📈 Statistics Dashboard
* Heatmap grids (similar to GitHub commits) plotting completion volume over 18 weeks
* Trend charts showing productivity spikes
* Pie charts showing category completions

## 🏆 Gamification
* Achievement medals unlocked dynamically (e.g., *7-Day Streak*, *Goal Crusher*)
* Toast notifications with custom trophy slide-ins
* Daily reflection log prompts mood tracker (1-5 scale)

## 🎨 Customization & Cloud Sync
* Dark & Light themes
* Accent highlight color selection (Indigo, Blue, Green, Emerald, Orange, Rose)
* **Cloud Sync Directory Picker:** Change your database storage path to your OneDrive, Dropbox, or Google Drive folder to sync data across computers.

---

# 💾 Data Storage Locations

FlowDesk is completely offline. Your data is stored locally in `flowdesk_data.json`:

### Default Installed Mode
If installed under Program Files (which restricts write access), FlowDesk safely stores data in:
* **JSON Database:** `C:\Users\<Username>\AppData\Roaming\flowdesk\database\flowdesk_data.json`
* **Settings Config:** `C:\Users\<Username>\AppData\Roaming\flowdesk\flowdesk_config.json`
* **Diagnostics Logs:** `C:\Users\<Username>\AppData\Roaming\flowdesk\logs\app.log`

### Portable Mode
If run from a custom writable directory (e.g., a Desktop folder or USB drive), FlowDesk stores data in:
* **Database Folder:** `<Executable_Directory>\data\flowdesk_data.json`
* **Settings Config:** `C:\Users\<Username>\AppData\Roaming\flowdesk\flowdesk_config.json`
* **Diagnostics Logs:** `C:\Users\<Username>\AppData\Roaming\flowdesk\logs\app.log`

---

# 🛠️ Technology Stack

| Category         | Technology                 |
| ---------------- | -------------------------- |
| Desktop          | Electron 30                |
| Frontend         | React 18 + TypeScript      |
| Styling          | Tailwind CSS               |
| State Management | Zustand                    |
| Routing          | React Router v6            |
| Charts           | Recharts (Hex Color binds) |
| Database         | Atomic JSON Storage Engine |
| Packaging        | Electron Builder (NSIS)    |

---

# 📁 Project Structure

```text
FlowDesk/
├── electron/
│   ├── main.ts         # Main process (JSON storage query handles, file sync, window configs)
│   ├── preload.ts      # ContextBridge IPC mappings
│   └── quotes.json     # Motivational quote database
│
├── src/
│   ├── components/     # UI components (Button, Input, Toast, Dialog, CommandPalette)
│   ├── hooks/          # Zustand global states (useStore.ts)
│   ├── pages/          # Views (Dashboard, Tasks, Calendar, Goals, Notes, Stats, Settings)
│   ├── styles/         # CSS variables & Tailwind config
│   ├── types/          # TypeScript interfaces
│   └── utils/          # Utility scripts (cn class merger)
│
├── public/             # Static icons
├── package.json        # Manifest & build commands
├── vite.config.ts      # Vite config (relative asset pathing)
└── tailwind.config.js  # Color tokens
```

---

# 🚀 Developer Guide

## Prerequisites
* Node.js (v18+)
* npm (v9+)

*(No Visual Studio C++ build tools are required as we use a pure-JavaScript JSON database engine!)*

## Installation
```bash
npm install
```

## Running in Development
Run the React dev server and the Electron shell concurrently:

```bash
# In terminal 1 (Vite Dev Server)
npm run dev:renderer

# In terminal 2 (Electron Host)
npm run dev:electron
```

## Build for Production Packaging
```bash
npm run package
```
Generated installers and standalone executables will be written to:
* `release/FlowDesk Setup 1.0.0.exe` (Windows Installer)
* `release/FlowDesk 1.0.0.exe` (Portable Version)

---

# 🤝 Contributing
Contributions, suggestions, and bug reports are welcome. Please open an Issue or submit a Pull Request on GitHub.

# 📄 License
This project is licensed under the MIT License.

## ⭐ Support
If you find FlowDesk useful, consider giving the repository a **⭐ Star** on GitHub! It helps others discover the project and supports future developments.
