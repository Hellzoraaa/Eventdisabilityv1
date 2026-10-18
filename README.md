# Event for Disability

Struktur project:

```text
project/
├── frontend/   # React + Vite
└── backend/    # Express API + MySQL
```

## Menjalankan aplikasi

1. Siapkan database MySQL sesuai konfigurasi di `backend/.env`.
2. Terminal pertama:

   ```bash
   cd frontend
   npm install
   npm run build
   ```

3. Terminal kedua:

   ```bash
   cd backend
   npm install
   npm run dev
   ```

Server berjalan pada `http://localhost:3000`. Pada mode development, backend menjalankan middleware Vite dari folder `frontend`.

Catatan: folder `node_modules` tidak disertakan dalam arsip. Jalankan `npm install` pada masing-masing folder setelah ekstraksi.
