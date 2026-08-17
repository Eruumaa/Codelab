import sqlite3
import json
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from executor import run_code_safely

app = FastAPI(title="Codelab by Informatics 25 Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend assets & static files
app.mount("/Assets", StaticFiles(directory="Assets"), name="assets")

@app.get("/")
def serve_index():
    return FileResponse("index.html")

@app.get("/style.css")
def serve_css():
    return FileResponse("style.css", media_type="text/css")

@app.get("/app.js")
def serve_js():
    return FileResponse("app.js", media_type="application/javascript")

# 3 Dedicated Assistant Lab (Aslab) Accounts with Unique Credentials
ASLAB_ACCOUNTS = {
    "aslab_1": {
        "username": "aslab_1",
        "name": "Aslab 1: Koordinator Lab IF'25",
        "nim": "ASLAB-01",
        "pin": "1928",
        "role": "aslab",
        "avatar": "👑",
        "title": "Koordinator Praktikum & Sistem",
        "xp": 999,
        "level": 9,
        "streak": 14,
        "completed_materials": [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    "aslab_2": {
        "username": "aslab_2",
        "name": "Aslab 2: Kurikulum & Modul IF'25",
        "nim": "ASLAB-02",
        "pin": "2525",
        "role": "aslab",
        "avatar": "⚡",
        "title": "Asisten Kurikulum & Bahan Ajar C",
        "xp": 950,
        "level": 9,
        "streak": 10,
        "completed_materials": [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    "aslab_3": {
        "username": "aslab_3",
        "name": "Aslab 3: Evaluasi & Tugas IF'25",
        "nim": "ASLAB-03",
        "pin": "2025",
        "role": "aslab",
        "avatar": "🛡️",
        "title": "Asisten Penilaian & Live Scoreboard",
        "xp": 920,
        "level": 9,
        "streak": 12,
        "completed_materials": [1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
}
ASLAB_SECRET_PIN = "aslab2025"

def init_db():
    conn = sqlite3.connect('app.db')
    c = conn.cursor()
    
    # 1. Tabel Submissions
    c.execute('''CREATE TABLE IF NOT EXISTS submissions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  username TEXT,
                  language TEXT, 
                  code TEXT, 
                  output TEXT,
                  status TEXT,
                  timestamp TEXT)''')
    
    # 2. Tabel Materials (9 Modul Resmi Semester 1)
    c.execute('''CREATE TABLE IF NOT EXISTS materials
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  title TEXT, 
                  summary TEXT,
                  content TEXT, 
                  language TEXT,
                  category TEXT DEFAULT 'Dasar Pemrograman',
                  difficulty TEXT DEFAULT 'Beginner',
                  xp_reward INTEGER DEFAULT 50)''')
    
    # 3. Tabel Users (Local Profiles)
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE,
                  name TEXT,
                  nim TEXT,
                  role TEXT,
                  avatar TEXT,
                  banner TEXT DEFAULT '',
                  xp INTEGER DEFAULT 0,
                  level INTEGER DEFAULT 1,
                  streak INTEGER DEFAULT 1,
                  completed_materials TEXT DEFAULT '[]')''')
    try:
        c.execute("ALTER TABLE users ADD COLUMN banner TEXT DEFAULT ''")
    except:
        pass
    try:
        c.execute("ALTER TABLE users ADD COLUMN pin TEXT DEFAULT '1928'")
    except:
        pass

    # Seed 3 dynamic Aslab accounts into users table if not present
    initial_aslabs = [
        ("aslab_1", "Aslab 1 IF'25", "ASLAB-01", "aslab", "👑", "linear-gradient(135deg, #0c1c4d 0%, #1e1035 100%)", 999, 9, 14, "1928", json.dumps([1,2,3,4,5,6,7,8,9])),
        ("aslab_2", "Aslab 2 IF'25", "ASLAB-02", "aslab", "⚡", "linear-gradient(135deg, #052e16 0%, #0c1c4d 100%)", 950, 9, 10, "2525", json.dumps([1,2,3,4,5,6,7,8,9])),
        ("aslab_3", "Aslab 3 IF'25", "ASLAB-03", "aslab", "🛡️", "linear-gradient(135deg, #3b0764 0%, #030712 100%)", 920, 9, 12, "2025", json.dumps([1,2,3,4,5,6,7,8,9])),
    ]
    for u_aslab in initial_aslabs:
        c.execute("SELECT id FROM users WHERE username = ?", (u_aslab[0],))
        if not c.fetchone():
            c.execute("""INSERT INTO users (username, name, nim, role, avatar, banner, xp, level, streak, pin, completed_materials)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", u_aslab)

    # 4. Tabel Assignments (Tugas Praktikum)
    c.execute('''CREATE TABLE IF NOT EXISTS assignments
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  module_id INTEGER,
                  title TEXT,
                  category TEXT,
                  deadline TEXT,
                  points INTEGER,
                  description TEXT,
                  task_prompt TEXT)''')

    # 5. Tabel Articles (Artikel Teori & Referensi Kurikulum)
    c.execute('''CREATE TABLE IF NOT EXISTS articles
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  module_id INTEGER,
                  title TEXT,
                  category TEXT,
                  reading_time TEXT,
                  summary TEXT,
                  content TEXT,
                  references_url TEXT)''')

    # 6. Tabel Live Scores (Live Score saat tugas/praktikum berlangsung)
    c.execute('''CREATE TABLE IF NOT EXISTS live_scores
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT,
                  student_name TEXT,
                  nim TEXT,
                  assignment_id INTEGER,
                  assignment_title TEXT,
                  score INTEGER,
                  status TEXT,
                  exec_time TEXT,
                  timestamp TEXT)''')

    # 7. Tabel Chat Messages (Tanya Aslab)
    c.execute('''CREATE TABLE IF NOT EXISTS chat_messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT,
                  sender_name TEXT,
                  avatar TEXT,
                  role TEXT,
                  text TEXT,
                  timestamp TEXT)''')

    # Users & Chat tables start completely clean without dummy messages

    # Users table starts empty so students register on their own

    # Seed Official Informatics 25 Curriculum (Modul 1-9 without Valgrind)
    c.execute('SELECT COUNT(*) FROM materials')
    if c.fetchone()[0] == 0:
        sample_materials = [
            (
                "01. Instalasi & Kompilasi Bahasa C",
                "Pengenalan compiler GCC, struktur dasar program C, header stdio.h, fungsi main(), dan mencetak output pertama.",
                """<h3>Modul 1: Pengenalan Compiler & Anatomi Program C</h3>
<p>Compiler adalah program yang menerjemahkan bahasa C menjadi bahasa mesin yang dapat dipahami komputer. Pada praktikum Informatika 25, kita menggunakan compiler <strong>GCC (GNU Compiler Collection)</strong> di lingkungan jaringan lokal.</p>
<div class='callout-box'>
  <strong>Tugas Praktikum:</strong> Tulis kode program C dari awal yang mencetak nama lengkap, NIM, dan kelompok praktikum Anda ke layar terminal menggunakan fungsi <code>printf()</code>.
</div>
<h4>Konsep Utama:</h4>
<ul>
  <li><code>#include &lt;stdio.h&gt;</code>: Menyertakan header standar input-output (Standard I/O)</li>
  <li><code>int main()</code>: Titik awal (entry point) seluruh eksekusi program C</li>
  <li><code>printf()</code>: Fungsi output untuk mencetak teks berformat ke layar</li>
  <li><code>return 0;</code>: Menandakan program selesai dieksekusi dengan status sukses</li>
</ul>""",
                "c",
                "Dasar Pemrograman",
                "Beginner",
                50
            ),
            (
                "02. Input dan Output dalam Bahasa C",
                "Mempelajari fungsi input scanf(), output printf(), format specifiers (%d, %f, %c, %s), dan operator address-of (&).",
                """<h3>Modul 2: Operasi Input dan Output</h3>
<p>Input adalah proses memberikan data ke dalam program, sedangkan output adalah proses menampilkan data hasil pemrosesan ke layar atau terminal.</p>
<div class='callout-box'>
  <strong>Tugas Praktikum:</strong> Buat program yang membaca dua angka integer dari input, kemudian menghitung dan mencetak hasil penjumlahan, pengurangan, dan perkalian keduanya.
</div>
<h4>Penentu Format (Format Specifiers):</h4>
<ul>
  <li><code>%d</code> atau <code>%i</code>: Bilangan bulat (Integer)</li>
  <li><code>%f</code>: Bilangan pecahan berkoma (Float)</li>
  <li><code>%c</code>: Karakter tunggal (Char)</li>
  <li><code>%s</code>: Deretan karakter (String)</li>
  <li><code>&amp; (Address-of)</code>: Memberikan alamat memori variabel ke fungsi <code>scanf</code></li>
</ul>""",
                "c",
                "Dasar Pemrograman",
                "Beginner",
                50
            ),
            (
                "03. Variabel dan Tipe Data",
                "Memahami tipe data primitif (int, float, double, char), ukuran memori sizeof(), konstanta const, dan operator aritmatika.",
                """<h3>Modul 3: Variabel, Tipe Data & Operator</h3>
<p>Variabel adalah label nama untuk alamat memori yang menyimpan nilai. Tipe data menentukan jenis dan rentang data yang dapat disimpan di memori.</p>
<div class='callout-box'>
  <strong>Tugas Praktikum:</strong> Deklarasikan konstanta <code>const float PI = 3.14159;</code> dan hitung luas serta keliling lingkaran berdasarkan jari-jari yang ditentukan.
</div>
<h4>Ukuran Memori Dasar:</h4>
<ul>
  <li><code>char</code>: 1 byte (-128 s.d 127)</li>
  <li><code>int</code>: 4 byte (-2.147.483.648 s.d 2.147.483.647)</li>
  <li><code>float</code>: 4 byte presisi tunggal</li>
  <li><code>double</code>: 8 byte presisi ganda</li>
</ul>""",
                "c",
                "Dasar Pemrograman",
                "Beginner",
                50
            ),
            (
                "04. Pernyataan Bersyarat (Control Flow)",
                "Logika percabangan program dengan if, if-else, if-else if, switch-case, dan evaluasi kondisi boolean.",
                """<h3>Modul 4: Pengambilan Keputusan (Conditional Statements)</h3>
<p>Pernyataan bersyarat digunakan untuk mengarahkan alur eksekusi program berdasarkan evaluasi kondisi boolean (benar/salah).</p>
<div class='callout-box'>
  <strong>Tugas Praktikum:</strong> Buat program konversi nilai praktikan (0-100) menjadi huruf mutu (A, B+, B, C+, C, D, E) menggunakan blok <code>if - else if - else</code>.
</div>
<h4>Struktur Kontrol:</h4>
<ul>
  <li><code>if (kondisi)</code>: Blok dijalankan jika kondisi bernilai TRUE</li>
  <li><code>else if (kondisi)</code>: Mengevaluasi alternatif kondisi berikutnya</li>
  <li><code>else</code>: Blok default jika seluruh kondisi sebelumnya FALSE</li>
  <li><code>switch (variabel)</code>: Percabangan multi-kondisi diskrit</li>
</ul>""",
                "c",
                "Struktur Kontrol",
                "Intermediate",
                75
            ),
            (
                "05. Array dan Pointer",
                "Struktur data linear array 1D/2D, indexing, pengenalan alamat memori (&), dereferensi pointer (*), dan relasi array-pointer.",
                """<h3>Modul 5: Struktur Data Array & Pengalamatan Pointer</h3>
<p>Array adalah struktur data linear dengan ukuran tetap yang tersimpan secara berurutan di dalam memori. Pointer adalah variabel khusus yang menyimpan alamat fisik dari variabel lain.</p>
<div class='callout-box'>
  <strong>Tugas Praktikum:</strong> Buat array 1D berisi 5 bilangan bulat, lalu akses dan tampilkan setiap elemen array beserta alamat memorinya menggunakan pointer <code>*(ptr + i)</code>.
</div>
<h4>Relasi Array &amp; Pointer:</h4>
<pre><code>int arr[5] = {10, 20, 30, 40, 50};\nint *ptr = arr; // ptr menunjuk ke elemen pertama arr[0]\nprintf("Elemen ke-2: %d\\n", *(ptr + 1)); // Mencetak 20</code></pre>""",
                "c",
                "Memori & Pointer",
                "Intermediate",
                75
            ),
            (
                "06. Fungsi dan Modularitas Kode",
                "Membuat fungsi modular, parameter formal vs aktual, mekanisme pass by value vs pass by reference menggunakan pointer.",
                """<h3>Modul 6: Pemrograman Modular dengan Fungsi</h3>
<p>Fungsi membagi program besar menjadi bagian-bagian kecil yang dapat digunakan kembali (reusable), mudah diuji, dan terstruktur.</p>
<div class='callout-box'>
  <strong>Tugas Praktikum:</strong> Implementasikan fungsi <code>void swap(int *a, int *b)</code> untuk menukar nilai dua variabel dengan mekanisme <em>pass by reference</em>.
</div>
<h4>Mekanisme Passing Parameter:</h4>
<ul>
  <li><em>Pass by Value</em>: Mengirimkan salinan nilai variabel (tidak mengubah variabel asli)</li>
  <li><em>Pass by Reference</em>: Mengirimkan alamat memori pointer (dapat memodifikasi variabel asli)</li>
</ul>""",
                "c",
                "Modular Programming",
                "Intermediate",
                75
            ),
            (
                "07. Operasi File (TXT dan Biner)",
                "Persistensi data ke file eksternal: pointer FILE*, membuka file dengan fopen(), menulis dengan fprintf(), membaca dengan fscanf(), dan menutup dengan fclose().",
                """<h3>Modul 7: Manajemen Berkas / File I/O</h3>
<p>Untuk persistensi data setelah program selesai dieksekusi, kita menggunakan media penyimpanan eksternal berupa file Teks (.txt) dan file Biner (.bin).</p>
<div class='callout-box'>
  <strong>Tugas Praktikum:</strong> Buat program yang menulis rekaman data praktikum (NIM, Nama, Nilai) ke dalam file teks <code>data_praktikum.txt</code>, lalu membacanya kembali dan mencetaknya ke layar.
</div>
<h4>Fungsi Standar File I/O:</h4>
<ul>
  <li><code>FILE* fptr = fopen("data.txt", "w");</code>: Membuka file dalam mode write</li>
  <li><code>fprintf(fptr, "format", args...);</code>: Menulis teks berformat ke file</li>
  <li><code>fgets(buffer, size, fptr);</code>: Membaca sebaris teks dari file</li>
  <li><code>fclose(fptr);</code>: Menutup stream file</li>
</ul>""",
                "c",
                "Manajemen File",
                "Advanced",
                100
            ),
            (
                "08. Struct dan Typedef",
                "Mendefinisikan tipe data bentukan (struct), inisialisasi variabel anggota, penyederhanaan dengan typedef, dan array of struct.",
                """<h3>Modul 8: Tipe Data Kustom dengan Struct &amp; Typedef</h3>
<p>Struct memungkinkan kita menggabungkan berbagai variabel dengan tipe data berbeda ke dalam satu kesatuan objek rekaman data.</p>
<div class='callout-box'>
  <strong>Tugas Praktikum:</strong> Buat <code>typedef struct</code> Mahasiswa berisi field NIM, Nama, dan IPK. Buat array of struct untuk 3 mahasiswa dan tentukan mahasiswa dengan IPK tertinggi.
</div>
<h4>Bentuk Umum Struct:</h4>
<pre><code>typedef struct {\n    char nim[12];\n    char nama[50];\n    float ipk;\n} Mahasiswa;\n\nMahasiswa m1 = {"13525001", "Akil", 3.95};\nprintf("%s - IPK: %.2f\\n", m1.nama, m1.ipk);</code></pre>""",
                "c",
                "Struktur Data C",
                "Advanced",
                100
            ),
            (
                "09. Command Line Argument (CLA)",
                "Mengirim argumen pada saat eksekusi program di terminal melalui int main(int argc, char *argv[]) dan konversi tipe data atoi().",
                """<h3>Modul 9: Parameter Eksekusi Command Line Argument</h3>
<p>Command Line Argument (CLA) adalah parameter atau argumen yang diberikan ke program saat dijalankan melalui terminal (contoh: <code>./program arg1 arg2</code>).</p>
<div class='callout-box'>
  <strong>Tugas Praktikum:</strong> Gunakan <code>argc</code> dan <code>argv</code> untuk membuat program kalkulator terminal sederhana yang menerima 3 argumen: <code>&lt;angka1&gt; &lt;operator&gt; &lt;angka2&gt;</code> dan mencetak hasilnya.
</div>
<h4>Anatomi Header CLA:</h4>
<pre><code>int main(int argc, char *argv[]) {\n    // argc: Jumlah total argumen yang dikirimkan\n    // argv: Array of strings berisi argumen\n    printf("Total argumen: %d\\n", argc);\n    return 0;\n}</code></pre>""",
                "c",
                "Sistem & Terminal",
                "Advanced",
                100
            )
        ]
        c.executemany("""INSERT INTO materials (title, summary, content, language, category, difficulty, xp_reward) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)""", sample_materials)

    # Seed Default Assignments (Tugas Praktikum Modul 1-9)
    c.execute('SELECT COUNT(*) FROM assignments')
    if c.fetchone()[0] == 0:
        sample_assignments = [
            (
                1,
                "Tugas 1: Program Kartu Tanda Mahasiswa (KTM)",
                "Dasar Pemrograman",
                "Sesi 1 • Minggu 1",
                100,
                "Buatlah program dalam bahasa C yang mencetak format Kartu Tanda Mahasiswa (KTM) lengkap dengan bingkai karakter ASCII (* atau =), menampilkan Nama Lengkap, NIM, Program Studi, Fakultas, dan Tahun Angkatan.",
                "Buat program kartu identitas mahasiswa dengan format yang rapi menggunakan printf."
            ),
            (
                2,
                "Tugas 2: Kalkulator Aritmatika Interaktif",
                "Dasar Pemrograman",
                "Sesi 1 • Minggu 2",
                100,
                "Buatlah program yang meminta input 2 buah bilangan pecahan (float) dari pengguna, kemudian mencetak hasil operasi: Penjumlahan, Pengurangan, Perkalian, dan Pembagian dengan format 2 angka di belakang koma (%.2f).",
                "Gunakan scanf() untuk membaca input dan tampilkan hasil seluruh operasi matematika dasar."
            ),
            (
                3,
                "Tugas 3: Konversi Satuan Suhu & Luas Bangun Datar",
                "Dasar Pemrograman",
                "Sesi 1 • Minggu 3",
                100,
                "Buatlah program yang mengonversi suhu Celcius ke Fahrenheit, Reamur, dan Kelvin. Serta menghitung luas dan volume tabung menggunakan konstanta PI.",
                "Deklarasikan variabel dengan tipe data yang tepat dan gunakan konstanta const."
            ),
            (
                4,
                "Tugas 4: Sistem Penilaian Mutu & Kelulusan Praktikum",
                "Struktur Kontrol",
                "Sesi 2 • Minggu 4",
                100,
                "Buatlah program sistem penilaian yang mengevaluasi nilai Tugas (30%), UTS (35%), dan UAS (35%). Program mencetak Nilai Akhir, Grade Mutu (A/B/C/D/E), dan status Kelulusan dengan nested if-else.",
                "Gunakan struktur kontrol conditional percabangan if-else if-else secara terstruktur."
            ),
            (
                5,
                "Tugas 5: Analisis Array & Manipulasi Alamat Pointer",
                "Memori & Pointer",
                "Sesi 2 • Minggu 5",
                100,
                "Buatlah program yang menyimpan N buah nilai bilangan bulat ke dalam array. Cari nilai maksimum, minimum, dan rata-rata, lalu tampilkan alamat memori masing-masing elemen menggunakan pointer traversal *(ptr + i).",
                "Gunakan pointer untuk mengakses dan mengiterasi seluruh elemen di dalam array."
            ),
            (
                6,
                "Tugas 6: Library Fungsi Matematika & Rekursi Faktorial",
                "Modular Programming",
                "Sesi 2 • Minggu 6",
                100,
                "Buatlah fungsi rekursif untuk menghitung faktorial(n) dan fungsi kombinasi nCr(n, r) yang modular. Sertakan prototipe fungsi di bagian atas file kode program.",
                "Bagi kode menjadi fungsi-fungsi kecil yang modular dan memiliki return value."
            ),
            (
                7,
                "Tugas 7: Sistem Database Mahasiswa Berbasis File TXT",
                "Manajemen File",
                "Sesi 3 • Minggu 7",
                100,
                "Buatlah program yang dapat menambahkan data mahasiswa (NIM, Nama, Nilai) ke dalam file 'database_if25.txt' dan membaca kembali seluruh isi file tersebut untuk ditampilkan dalam bentuk tabel rapi di layar.",
                "Gunakan fopen(), fprintf(), fgets()/fscanf(), dan pastikan fclose() selalu dipanggil."
            ),
            (
                8,
                "Tugas 8: Manajemen Rekaman Data Mahasiswa (Struct)",
                "Struktur Data C",
                "Sesi 3 • Minggu 8",
                100,
                "Buatlah struct Mahasiswa yang memiliki member: NIM, Nama, dan Array Nilai[3]. Hitung rata-rata nilai tiap mahasiswa dan urutkan daftar mahasiswa dari nilai tertinggi ke terendah.",
                "Implementasikan typedef struct dan array of structs untuk pengolahan rekaman data."
            ),
            (
                9,
                "Tugas 9: CLI Utility / Argument Parser di Terminal",
                "Sistem & Terminal",
                "Sesi 3 • Minggu 9",
                100,
                "Buatlah program utilitas terminal yang menerima argumen: './kalkulator <num1> <op> <num2>' melalui argc dan argv, lalu melakukan kalkulasi dan mencetak hasilnya ke layar.",
                "Gunakan int main(int argc, char *argv[]) dan fungsi atoi/atof untuk parsing argumen CLI."
            )
        ]
        c.executemany("""INSERT INTO assignments (module_id, title, category, deadline, points, description, task_prompt)
                         VALUES (?, ?, ?, ?, ?, ?, ?)""", sample_assignments)
    
    # 6. Seed Official Theory Articles with MIT OCW Reference Links
    c.execute('SELECT COUNT(*) FROM articles')
    if c.fetchone()[0] == 0:
        sample_articles = [
            (
                1,
                "Anatomi Kode Program C & Pengantar Kompilasi GCC",
                "Dasar Pemrograman",
                "10 Menit",
                "Memahami struktur blok fungsi main, directive preprocessor, linking library standar stdio.h, dan kompilasi baris perintah.",
                """<h2>Struktur Dasar dan Eksekusi Bahasa C</h2>
<p>Bahasa C adalah bahasa pemrograman terstruktur berkecepatan tinggi yang dikompilasi secara langsung ke dalam kode mesin. Program C dimulai dari fungsi <code>main()</code>.</p>
<h3>Proses Kompilasi GCC:</h3>
<ol>
  <li><strong>Preprocessing:</strong> Menggabungkan header file (#include) dan makro (#define).</li>
  <li><strong>Compilation:</strong> Menerjemahkan kode sumber C ke instruksi bahasa Assembly.</li>
  <li><strong>Assembly:</strong> Mengonversi kode Assembly menjadi file objek biner (.o).</li>
  <li><strong>Linking:</strong> Menghubungkan seluruh file objek dan library eksternal menjadi executable biner.</li>
</ol>
<div class='callout-box'>
  <strong>Referensi Silabus Resmi:</strong> Pelajari lebih lanjut konsep dasar kompilasi C pada modul MIT OpenCourseWare: <a href='https://ocw.mit.edu/courses/6-087-practical-programming-in-c-january-iap-2010/pages/syllabus/' target='_blank'>MIT 6.087: Practical Programming in C</a> dan <a href='https://ocw.mit.edu/courses/6-s096-introduction-to-c-and-c-january-iap-2013/' target='_blank'>MIT 6.S096: Introduction to C and C++</a>.
</div>""",
                "https://ocw.mit.edu/courses/6-087-practical-programming-in-c-january-iap-2010/pages/syllabus/"
            ),
            (
                2,
                "Format Specifier, Buffer I/O & Validasi Input",
                "Dasar Pemrograman",
                "12 Menit",
                "Panduan lengkap format specifiers (%d, %f, %c, %s), pembersihan buffer stdin, dan penanganan input pengguna.",
                """<h2>Operasi Masukan dan Keluaran Terformat</h2>
<p>Fungsi <code>printf()</code> dan <code>scanf()</code> merupakan fungsi bawaan dari library <code>&lt;stdio.h&gt;</code>.</p>
<h3>Kunci Penggunaan scanf:</h3>
<p>Selalu sertakan simbol operator alamat memori <code>&amp;</code> untuk tipe data primitif (seperti int, float, char), kecuali untuk array string/char pointer.</p>
<div class='callout-box'>
  <strong>Referensi Belajar:</strong> Dikutip dari kurikulum praktikum dan referensi <a href='https://ocw.mit.edu/courses/6-s096-introduction-to-c-and-c-january-iap-2013/' target='_blank'>MIT OCW 6.S096</a> Bab Standard I/O Streams.
</div>""",
                "https://ocw.mit.edu/courses/6-s096-introduction-to-c-and-c-january-iap-2013/"
            ),
            (
                3,
                "Tipe Data Primitif, Konversi Tipe (Casting) & Memory Sizing",
                "Dasar Pemrograman",
                "15 Menit",
                "Memahami ukuran byte tipe data integer, floating point, unsigned modifiers, dan implicit/explicit type conversion.",
                """<h2>Representasi Tipe Data & Ukuran Memori</h2>
<p>Bahasa C bersifat statically-typed. Tipe data menentukan seberapa besar alokasi memori dan interpretasi pola bit nilai variabel.</p>
<div class='callout-box'>
  <strong>Referensi Silabus:</strong> Baca materi lanjutan tipe data pada <a href='https://ocw.mit.edu/courses/6-087-practical-programming-in-c-january-iap-2010/pages/syllabus/' target='_blank'>MIT OCW 6.087 Syllabus</a>.
</div>""",
                "https://ocw.mit.edu/courses/6-087-practical-programming-in-c-january-iap-2010/pages/syllabus/"
            ),
            (
                4,
                "Struktur Logika Percabangan (If-Else & Switch-Case)",
                "Struktur Kontrol",
                "14 Menit",
                "Penguasaan branching conditional, operator logika Boolean, short-circuit evaluation, dan efisiensi tabel jump switch-case.",
                """<h2>Pengambilan Keputusan dalam Kode Program</h2>
<p>Struktur kontrol percabangan memungkinkan program mengeksekusi blok kode tertentu berdasarkan evaluasi ekspresi kondisi (True/False).</p>""",
                "https://ocw.mit.edu/courses/6-s096-introduction-to-c-and-c-january-iap-2013/"
            ),
            (
                5,
                "Pengantar Memori, Pointer & Hubungan dengan Array",
                "Memori & Pointer",
                "20 Menit",
                "Konsep fundamental alamat memori, pointer dereferencing, aritmatika pointer, dan indexing array kontinu.",
                """<h2>Pointer dan Arsitektur Alamat Memori</h2>
<p>Pointer adalah variabel yang menyimpan alamat memori dari variabel lain. Pointer memberikan kontrol langsung atas memori fisik sistem.</p>
<div class='callout-box'>
  <strong>Materi Wajib:</strong> Topik pointer merupakan materi paling esensial dalam praktikum. Baca penjelasan mendalam di <a href='https://ocw.mit.edu/courses/6-s096-introduction-to-c-and-c-january-iap-2013/' target='_blank'>MIT OCW 6.S096 Lecture: Pointers and Memory Management</a>.
</div>""",
                "https://ocw.mit.edu/courses/6-s096-introduction-to-c-and-c-january-iap-2013/"
            ),
            (
                6,
                "Pemrograman Modular: Fungsi, Scope Variabel & Rekursi",
                "Modular Programming",
                "18 Menit",
                "Prinsip modularitas, prototype deklarasi fungsi, parameter pass-by-value vs pass-by-reference, dan rekursi call-stack.",
                """<h2>Desain Kode Modular & Fungsi</h2>
<p>Membagi program menjadi modul fungsi-fungsi kecil meningkatkan keterbacaan, memudahkan pengujian (debugging), dan mencegah redundansi kode.</p>""",
                "https://ocw.mit.edu/courses/6-087-practical-programming-in-c-january-iap-2010/pages/syllabus/"
            ),
            (
                7,
                "Manajemen Berkas File I/O (fopen, fprintf, fscanf, fclose)",
                "Manajemen File",
                "16 Menit",
                "Manipulasi stream berkas persistent di harddisk, mode akses file ('r', 'w', 'a'), dan penanganan error file tidak ditemukan.",
                """<h2>Persistent Storage dengan File I/O</h2>
<p>File I/O memungkinkan data program disimpan secara permanen di media penyimpanan dan dibaca kembali saat program dijalankan di masa mendatang.</p>""",
                "https://ocw.mit.edu/courses/6-s096-introduction-to-c-and-c-january-iap-2013/"
            ),
            (
                8,
                "Tipe Data Buatan: Struct, Union & Typedef",
                "Struktur Data C",
                "18 Menit",
                "Membuat record data gabungan dengan struct, penghematan memori union, dan penyederhanaan nama tipe menggunakan typedef.",
                """<h2>Struktur Data Majemuk (Struct)</h2>
<p><code>struct</code> memungkinkan pengelompokan beberapa variabel dengan berbagai tipe data berbeda ke dalam satu kesatuan rekaman logis.</p>""",
                "https://ocw.mit.edu/courses/6-087-practical-programming-in-c-january-iap-2010/pages/syllabus/"
            ),
            (
                9,
                "Argumen Baris Perintah (argc, argv) & Sistem Operasi",
                "Sistem & Terminal",
                "15 Menit",
                "Menerima parameter langsung dari terminal OS melalui signature `int main(int argc, char *argv[])` dan konversi argumen.",
                """<h2>Interaksi Terminal melalui CLI Arguments</h2>
<p>Argumen CLI memungkinkan pengguna memasukkan konfigurasi atau data input saat menjalankan biner program dari terminal tanpa prompt interaktif.</p>
<div class='callout-box'>
  <strong>Referensi Eksternal:</strong> <a href='https://ocw.mit.edu/courses/6-s096-introduction-to-c-and-c-january-iap-2013/' target='_blank'>MIT 6.S096</a> &amp; <a href='https://ocw.mit.edu/courses/6-087-practical-programming-in-c-january-iap-2010/pages/syllabus/' target='_blank'>MIT 6.087 Syllabus</a>.
</div>""",
                "https://ocw.mit.edu/courses/6-s096-introduction-to-c-and-c-january-iap-2013/"
            )
        ]
        c.executemany("""INSERT INTO articles (module_id, title, category, reading_time, summary, content, references_url)
                         VALUES (?, ?, ?, ?, ?, ?, ?)""", sample_articles)
    
    conn.commit()
    conn.close()

init_db()

# ---- SCHEMAS ----
class CodeSubmission(BaseModel):
    language: str
    code: str
    username: Optional[str] = "akil"

class Material(BaseModel):
    title: str
    summary: Optional[str] = ""
    content: str
    language: str
    category: Optional[str] = "Dasar Pemrograman"
    difficulty: Optional[str] = "Beginner"
    xp_reward: Optional[int] = 50

class MaterialUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    xp_reward: Optional[int] = None

class AssignmentCreate(BaseModel):
    module_id: Optional[int] = 1
    title: str
    category: Optional[str] = "Tugas Praktikum"
    deadline: Optional[str] = "Sesi Praktikum"
    points: Optional[int] = 100
    description: str
    task_prompt: Optional[str] = ""

class AssignmentUpdate(BaseModel):
    module_id: Optional[int] = None
    title: Optional[str] = None
    category: Optional[str] = None
    deadline: Optional[str] = None
    points: Optional[int] = None
    description: Optional[str] = None
    task_prompt: Optional[str] = None

class ArticleCreate(BaseModel):
    module_id: Optional[int] = 1
    title: str
    category: Optional[str] = "Teori & Konsep"
    reading_time: Optional[str] = "10 Menit"
    summary: Optional[str] = ""
    content: str
    references_url: Optional[str] = "https://ocw.mit.edu/courses/6-s096-introduction-to-c-and-c-january-iap-2013/"

class ArticleUpdate(BaseModel):
    module_id: Optional[int] = None
    title: Optional[str] = None
    category: Optional[str] = None
    reading_time: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    references_url: Optional[str] = None

class UserRegister(BaseModel):
    username: str
    name: str
    nim: str
    avatar: Optional[str] = "👨‍💻"

class UserLogin(BaseModel):
    identifier: str  # NIM or Username

class AslabLoginRequest(BaseModel):
    aslab_id: Optional[str] = None
    pin: str

class UserProgressUpdate(BaseModel):
    username: str
    material_id: int
    xp_earned: Optional[int] = 50

class LiveScoreSubmit(BaseModel):
    username: str
    assignment_id: int
    code: str
    language: Optional[str] = "c"

# ---- API ENDPOINTS ----

@app.post("/execute")
def execute_code(submission: CodeSubmission):
    if submission.language not in ["c", "python"]:
        raise HTTPException(status_code=400, detail="Hanya mendukung bahasa C dan Python")
    
    result = run_code_safely(submission.language, submission.code)
    
    # Log submission to SQLite database
    try:
        conn = sqlite3.connect('app.db')
        c = conn.cursor()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute("""INSERT INTO submissions (username, language, code, output, status, timestamp) 
                     VALUES (?, ?, ?, ?, ?, ?)""",
                  (submission.username, submission.language, submission.code, result.get("output", ""), result.get("status", "error"), timestamp))
        conn.commit()
        conn.close()
    except Exception as e:
        print("Logging error:", e)
        
    return result

# ─── MATERIALS / MODUL CRUD ───
@app.get("/materials")
def get_materials():
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM materials ORDER BY id ASC")
    rows = c.fetchall()
    conn.close()
    return [dict(ix) for ix in rows]

@app.post("/materials")
def add_material(material: Material):
    conn = sqlite3.connect('app.db')
    c = conn.cursor()
    c.execute("""INSERT INTO materials (title, summary, content, language, category, difficulty, xp_reward) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)""",
              (material.title, material.summary, material.content, material.language, material.category, material.difficulty, material.xp_reward))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    return {"status": "success", "id": new_id, "message": "Modul baru berhasil ditambahkan ke kurikulum"}

@app.put("/materials/{material_id}")
def update_material(material_id: int, data: MaterialUpdate):
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM materials WHERE id = ?", (material_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Modul tidak ditemukan")
    
    curr = dict(row)
    title = data.title if data.title is not None else curr["title"]
    summary = data.summary if data.summary is not None else curr["summary"]
    content = data.content if data.content is not None else curr["content"]
    language = data.language if data.language is not None else curr["language"]
    category = data.category if data.category is not None else curr["category"]
    difficulty = data.difficulty if data.difficulty is not None else curr["difficulty"]
    xp_reward = data.xp_reward if data.xp_reward is not None else curr["xp_reward"]
    
    c.execute("""UPDATE materials SET title=?, summary=?, content=?, language=?, category=?, difficulty=?, xp_reward=?
                 WHERE id=?""", (title, summary, content, language, category, difficulty, xp_reward, material_id))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Modul #{material_id} berhasil diperbarui"}

@app.delete("/materials/{material_id}")
def delete_material(material_id: int):
    conn = sqlite3.connect('app.db')
    c = conn.cursor()
    c.execute("DELETE FROM materials WHERE id = ?", (material_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Modul #{material_id} berhasil dihapus"}

# ─── ASSIGNMENTS / TUGAS CRUD ───
@app.get("/assignments")
def get_assignments():
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM assignments ORDER BY id ASC")
    rows = c.fetchall()
    conn.close()
    return [dict(ix) for ix in rows]

@app.post("/assignments")
def add_assignment(ass: AssignmentCreate):
    conn = sqlite3.connect('app.db')
    c = conn.cursor()
    c.execute("""INSERT INTO assignments (module_id, title, category, deadline, points, description, task_prompt)
                 VALUES (?, ?, ?, ?, ?, ?, ?)""",
              (ass.module_id, ass.title, ass.category, ass.deadline, ass.points, ass.description, ass.task_prompt))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    return {"status": "success", "id": new_id, "message": "Tugas praktikum baru berhasil ditambahkan"}

@app.put("/assignments/{assignment_id}")
def update_assignment(assignment_id: int, data: AssignmentUpdate):
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM assignments WHERE id = ?", (assignment_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
        
    curr = dict(row)
    title = data.title if data.title is not None else curr["title"]
    category = data.category if data.category is not None else curr["category"]
    deadline = data.deadline if data.deadline is not None else curr["deadline"]
    points = data.points if data.points is not None else curr["points"]
    desc = data.description if data.description is not None else curr["description"]
    prompt = data.task_prompt if data.task_prompt is not None else curr["task_prompt"]
    
    c.execute("""UPDATE assignments SET title=?, category=?, deadline=?, points=?, description=?, task_prompt=?
                 WHERE id=?""", (title, category, deadline, points, desc, prompt, assignment_id))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Tugas #{assignment_id} berhasil diperbarui"}

@app.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: int):
    conn = sqlite3.connect('app.db')
    c = conn.cursor()
    c.execute("DELETE FROM assignments WHERE id = ?", (assignment_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Tugas #{assignment_id} berhasil dihapus"}

# ─── ARTICLES / TEORI CRUD ───
@app.get("/articles")
def get_articles():
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM articles ORDER BY id ASC")
    rows = c.fetchall()
    conn.close()
    return [dict(ix) for ix in rows]

@app.get("/articles/{article_id}")
def get_article(article_id: int):
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM articles WHERE id = ?", (article_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Artikel tidak ditemukan")
    return dict(row)

@app.post("/articles")
def add_article(art: ArticleCreate):
    conn = sqlite3.connect('app.db')
    c = conn.cursor()
    c.execute("""INSERT INTO articles (module_id, title, category, reading_time, summary, content, references_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?)""",
              (art.module_id, art.title, art.category, art.reading_time, art.summary, art.content, art.references_url))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    return {"status": "success", "id": new_id, "message": "Artikel teori baru berhasil diterbitkan"}

@app.put("/articles/{article_id}")
def update_article(article_id: int, data: ArticleUpdate):
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM articles WHERE id = ?", (article_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Artikel tidak ditemukan")
        
    curr = dict(row)
    title = data.title if data.title is not None else curr["title"]
    category = data.category if data.category is not None else curr["category"]
    reading_time = data.reading_time if data.reading_time is not None else curr["reading_time"]
    summary = data.summary if data.summary is not None else curr["summary"]
    content = data.content if data.content is not None else curr["content"]
    ref_url = data.references_url if data.references_url is not None else curr["references_url"]
    
    c.execute("""UPDATE articles SET title=?, category=?, reading_time=?, summary=?, content=?, references_url=?
                 WHERE id=?""", (title, category, reading_time, summary, content, ref_url, article_id))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Artikel #{article_id} berhasil diperbarui"}

@app.delete("/articles/{article_id}")
def delete_article(article_id: int):
    conn = sqlite3.connect('app.db')
    c = conn.cursor()
    c.execute("DELETE FROM articles WHERE id = ?", (article_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Artikel #{article_id} berhasil dihapus"}

# ─── SUBMISSIONS AUDIT & LOGS ───
@app.get("/submissions")
def get_submissions():
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM submissions ORDER BY id DESC LIMIT 50")
    rows = c.fetchall()
    conn.close()
    return [dict(ix) for ix in rows]

# ─── LEADERBOARD & LIVE SCORE SYSTEM ───
@app.get("/leaderboard")
def get_leaderboard():
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE role = 'praktikan' ORDER BY xp DESC, id ASC")
    rows = c.fetchall()
    conn.close()
    
    students = []
    for rank, r in enumerate(rows, start=1):
        u = dict(r)
        try:
            completed = json.loads(u.get("completed_materials") or "[]")
        except:
            completed = []
        u["completed_count"] = len(completed)
        u["rank"] = rank
        
        # Rank Tier badge
        if u["xp"] >= 500:
            u["tier"] = "MASTER"
            u["badge"] = "🏆"
        elif u["xp"] >= 300:
            u["tier"] = "GOLD"
            u["badge"] = "🥇"
        elif u["xp"] >= 150:
            u["tier"] = "SILVER"
            u["badge"] = "🥈"
        else:
            u["tier"] = "BRONZE"
            u["badge"] = "🥉"
            
        students.append(u)
    return students

@app.get("/livescore")
def get_livescore():
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM live_scores ORDER BY id DESC LIMIT 50")
    rows = c.fetchall()
    conn.close()
    return [dict(ix) for ix in rows]

@app.post("/livescore/submit")
def submit_livescore(sub: LiveScoreSubmit):
    result = run_code_safely(sub.language or "c", sub.code)
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Lookup user
    c.execute("SELECT * FROM users WHERE username = ?", (sub.username,))
    user_row = c.fetchone()
    student_name = user_row["name"] if user_row else sub.username
    nim = user_row["nim"] if user_row else "-"
    
    # Lookup assignment
    c.execute("SELECT * FROM assignments WHERE id = ?", (sub.assignment_id,))
    ass_row = c.fetchone()
    ass_title = ass_row["title"] if ass_row else f"Tugas #{sub.assignment_id}"
    max_points = ass_row["points"] if ass_row else 100
    
    is_success = result.get("status") == "success"
    score = max_points if is_success else 30
    status_label = "PASSED" if is_success else "FAILED"
    exec_time = f"{result.get('exec_time_ms', 15)}ms"
    now_str = datetime.now().strftime("%H:%M:%S")
    
    c.execute("""INSERT INTO live_scores (username, student_name, nim, assignment_id, assignment_title, score, status, exec_time, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
              (sub.username, student_name, nim, sub.assignment_id, ass_title, score, status_label, exec_time, now_str))
    
    # Also log to submissions
    timestamp_full = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    c.execute("""INSERT INTO submissions (username, language, code, output, status, timestamp) 
                 VALUES (?, ?, ?, ?, ?, ?)""",
              (sub.username, sub.language or "c", sub.code, result.get("output", ""), result.get("status", "error"), timestamp_full))
    
    # If user found and test passed, award XP
    if user_row and is_success:
        new_xp = user_row["xp"] + score
        new_lvl = max(1, (new_xp // 150) + 1)
        c.execute("UPDATE users SET xp = ?, level = ? WHERE username = ?", (new_xp, new_lvl, sub.username))
        
    conn.commit()
    conn.close()
    return {
        "status": "success",
        "result": result,
        "score": score,
        "verdict": status_label,
        "assignment_title": ass_title,
        "message": f"Tugas berhasil dievaluasi! Skor Anda: {score}/{max_points} Poin" if is_success else "Program gagal dieksekusi dengan sempurna. Periksa kembali error compiler!"
    }

# ─── USERS & AUTHENTICATION ───
@app.get("/users")
def get_users():
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users ORDER BY role DESC, xp DESC")
    rows = c.fetchall()
    conn.close()
    
    users = []
    for r in rows:
        u = dict(r)
        try:
            u["completed_materials"] = json.loads(u.get("completed_materials") or "[]")
        except:
            u["completed_materials"] = []
        users.append(u)
    return users

@app.post("/users")
def register_user(user: UserRegister):
    username_clean = user.username.strip().lower().replace(" ", "_")
    if not username_clean:
        raise HTTPException(status_code=400, detail="Username tidak boleh kosong")
        
    conn = sqlite3.connect('app.db')
    c = conn.cursor()
    try:
        # Public registration is strictly for Praktikan (Student) role
        c.execute("""INSERT INTO users (username, name, nim, role, avatar, xp, level, streak, completed_materials)
                     VALUES (?, ?, ?, 'praktikan', ?, 0, 1, 1, '[]')""",
                  (username_clean, user.name.strip(), user.nim.strip(), user.avatar or "👨‍💻"))
        conn.commit()
        conn.close()
        return {"status": "success", "username": username_clean, "role": "praktikan", "message": "Mahasiswa baru berhasil didaftarkan"}
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Username sudah terdaftar! Gunakan username lain.")
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/users/login")
def login_user(cred: UserLogin):
    ident = cred.identifier.strip().lower()
    if not ident:
        raise HTTPException(status_code=400, detail="Masukkan NIM atau Username Anda!")
    
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(nim) = ?", (ident, ident))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan! Pastikan NIM atau Username sudah benar atau silakan daftar baru.")
    
    u = dict(row)
    try:
        u["completed_materials"] = json.loads(u.get("completed_materials") or "[]")
    except:
        u["completed_materials"] = []
    return {"status": "success", "user": u, "message": f"Selamat datang kembali, {u['name']}!"}

@app.delete("/users/{username}")
def delete_user(username: str):
    conn = sqlite3.connect('app.db')
    c = conn.cursor()
    c.execute("DELETE FROM users WHERE username = ?", (username,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"User {username} berhasil dihapus"}

@app.delete("/users")
def delete_all_users():
    conn = sqlite3.connect('app.db')
    c = conn.cursor()
    c.execute("DELETE FROM users")
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Seluruh akun mahasiswa berhasil dihapus"}

# ─── ASLAB ACCOUNTS & DYNAMIC AUTH ───
@app.get("/aslab/accounts")
def get_aslab_accounts():
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE role = 'aslab' ORDER BY id ASC")
    rows = c.fetchall()
    conn.close()
    
    accounts = []
    for r in rows:
        u = dict(r)
        u.pop("pin", None)
        try:
            u["completed_materials"] = json.loads(u.get("completed_materials") or "[]")
        except:
            u["completed_materials"] = []
        accounts.append(u)
    return accounts

@app.post("/aslab/login")
def aslab_login(auth: AslabLoginRequest):
    pin_clean = auth.pin.strip()
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # 1. If specific aslab_id provided
    if auth.aslab_id:
        c.execute("SELECT * FROM users WHERE (username = ? OR id = ?) AND role = 'aslab'", (auth.aslab_id, auth.aslab_id))
        row = c.fetchone()
        if row:
            u = dict(row)
            user_pin = str(u.get("pin") or "1928")
            if pin_clean == user_pin or pin_clean in ["1928", "2525", "2025", "aslab2025"]:
                conn.close()
                u.pop("pin", None)
                try:
                    u["completed_materials"] = json.loads(u.get("completed_materials") or "[]")
                except:
                    u["completed_materials"] = []
                return {
                    "status": "success",
                    "role": "aslab",
                    "user": u,
                    "message": f"Autentikasi {u['name']} Berhasil!",
                    "token": f"aslab_token_{u['username']}"
                }
            else:
                conn.close()
                raise HTTPException(status_code=401, detail=f"PIN untuk {u['name']} salah! Akses ditolak.")
    
    # 2. Check matching PIN across all aslab accounts in SQLite
    c.execute("SELECT * FROM users WHERE role = 'aslab'")
    aslab_rows = c.fetchall()
    for row in aslab_rows:
        u = dict(row)
        user_pin = str(u.get("pin") or "1928")
        if pin_clean == user_pin:
            conn.close()
            u.pop("pin", None)
            try:
                u["completed_materials"] = json.loads(u.get("completed_materials") or "[]")
            except:
                u["completed_materials"] = []
            return {
                "status": "success",
                "role": "aslab",
                "user": u,
                "message": f"Autentikasi {u['name']} Berhasil!",
                "token": f"aslab_token_{u['username']}"
            }
            
    # 3. Master PIN fallback
    if pin_clean in ["1928", "2525", "2025", "aslab2025"] and aslab_rows:
        u = dict(aslab_rows[0])
        conn.close()
        u.pop("pin", None)
        try:
            u["completed_materials"] = json.loads(u.get("completed_materials") or "[]")
        except:
            u["completed_materials"] = []
        return {
            "status": "success",
            "role": "aslab",
            "user": u,
            "message": f"Autentikasi {u['name']} Berhasil!",
            "token": f"aslab_token_{u['username']}"
        }
        
    conn.close()
    raise HTTPException(status_code=401, detail="Kode PIN Asisten Laboratorium salah! Akses ditolak.")

@app.get("/users/{username}")
def get_user_profile(username: str):
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    u = dict(row)
    u.pop("pin", None)
    try:
        u["completed_materials"] = json.loads(u.get("completed_materials") or "[]")
    except:
        u["completed_materials"] = []
    return u

class UserProfileCustomization(BaseModel):
    name: Optional[str] = None
    nim: Optional[str] = None
    avatar: Optional[str] = None
    banner: Optional[str] = None

@app.put("/users/{username}")
def update_user_profile(username: str, data: UserProfileCustomization):
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    current = dict(row)
    new_name = data.name.strip() if data.name is not None and data.name.strip() else current.get("name")
    new_nim = data.nim.strip() if data.nim is not None and data.nim.strip() else current.get("nim")
    new_avatar = data.avatar if data.avatar is not None else current.get("avatar")
    new_banner = data.banner if data.banner is not None else current.get("banner", "")
    
    c.execute("""UPDATE users SET name = ?, nim = ?, avatar = ?, banner = ? WHERE username = ?""",
              (new_name, new_nim, new_avatar, new_banner, username))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Profil berhasil diperbarui", "username": username}

@app.post("/users/progress")
def update_user_progress(prog: UserProgressUpdate):
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ?", (prog.username,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    user = dict(row)
    try:
        completed = json.loads(user.get("completed_materials") or "[]")
    except:
        completed = []
        
    if prog.material_id not in completed:
        completed.append(prog.material_id)
        
    new_xp = user.get("xp", 0) + prog.xp_earned
    new_level = max(1, (new_xp // 150) + 1)
    
    c.execute("""UPDATE users SET xp = ?, level = ?, completed_materials = ? WHERE username = ?""",
              (new_xp, new_level, json.dumps(completed), prog.username))
    conn.commit()
    conn.close()
    return {"status": "success", "xp": new_xp, "level": new_level}
    
class ChatMessageCreate(BaseModel):
    username: str
    sender_name: str
    avatar: Optional[str] = "👨‍💻"
    role: Optional[str] = "praktikan"
    text: str

@app.get("/chat/messages")
def get_chat_messages():
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM chat_messages ORDER BY id ASC")
    rows = c.fetchall()
    conn.close()
    return [dict(ix) for ix in rows]

@app.post("/chat/messages")
def send_chat_message(msg: ChatMessageCreate):
    conn = sqlite3.connect('app.db')
    c = conn.cursor()
    now_str = datetime.now().strftime("%H:%M")
    c.execute("""INSERT INTO chat_messages (username, sender_name, avatar, role, text, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?)""",
              (msg.username, msg.sender_name, msg.avatar, msg.role, msg.text, now_str))
    conn.commit()
    msg_id = c.lastrowid

    # If sender is praktikan, generate smart Aslab assistance responses for common topics
    auto_reply = None
    lower_text = msg.text.lower()
    if msg.role != "aslab":
        if "pointer" in lower_text or "modul 5" in lower_text:
            auto_reply = "💡 Aslab Tip [Pointer]: Gunakan `&variabel` untuk mengambil alamat memori, dan `*pointer` untuk mengakses nilai (dereference). Pastikan pointer tidak NULL sebelum diakses!"
        elif "segfault" in lower_text or "segmentation fault" in lower_text:
            auto_reply = "⚠️ Aslab Tip [Segfault]: Segmentation fault biasanya terjadi karena mengakses memori di luar batas array atau dereferencing pointer liar (NULL pointer). Cek indeks loop Anda!"
        elif "scanf" in lower_text or "format" in lower_text:
            auto_reply = "📌 Aslab Tip [I/O]: Ingat bahwa `scanf` membutuhkan alamat memori: `scanf(\"%d\", &angka)`. Khusus untuk string array: `scanf(\"%s\", nama)`."
        elif "tugas" in lower_text or "assignment" in lower_text:
            auto_reply = "📝 Aslab Tip [Tugas]: Anda dapat mengklik tombol 'Kerjakan di IDE' pada halaman Assignment untuk langsung menulis dan menguji kode tugas."
        elif "halo" in lower_text or "hai" in lower_text or "p" == lower_text.strip():
            auto_reply = "👋 Halo! Ada modul atau kode program yang mengalami error dan butuh bantuan Asisten Lab?"

    if auto_reply:
        c.execute("""INSERT INTO chat_messages (username, sender_name, avatar, role, text, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?)""",
                  ("aslab_if25", "Asisten Lab IF'25", "👑", "aslab", auto_reply, now_str))
        conn.commit()

    conn.close()
    return {"status": "success", "id": msg_id}