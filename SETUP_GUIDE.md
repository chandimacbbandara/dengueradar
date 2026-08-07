# DengueRadar Setup Guide

Welcome to the DengueRadar repository!

## Prerequisites

Because this project utilizes Machine Learning models and large dataset files, we use **Git LFS (Large File Storage)** to track them. Before cloning or pulling this repository, you must have Git LFS installed on your system.

### 1. Install Git LFS
If you don't have it installed, follow the instructions for your OS:
- **Ubuntu/Debian**: `sudo apt install git-lfs`
- **MacOS**: `brew install git-lfs`
- **Windows**: Download and install from [git-lfs.github.com](https://git-lfs.github.com/)

### 2. Initialize Git LFS
Run the following command once per user account:
```bash
git lfs install
```

### 3. Clone the Repository
Once installed, you can safely clone the repository. Git LFS will automatically download the correct model files instead of tiny pointer files.
```bash
git clone <repository_url>
cd dengueradar
```

### Troubleshooting: "Missing Model Files"
If you cloned the repository *before* installing Git LFS, your `.model`, `.bin`, and `.csv` files might be corrupt (they will look like small text pointer files). To fix this, run:
```bash
git lfs pull
```

---

## Starting the Application

### 1. Python ML Service
```bash
cd apps/ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Node.js Backend
```bash
cd apps/backend
npm install
npm run dev
```

### 3. React Frontend
```bash
cd apps/frontend
npm install
npm start
```
