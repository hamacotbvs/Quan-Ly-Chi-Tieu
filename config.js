    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
    import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, updateProfile, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

    // A. KẾT NỐI VỚI CƠ SỞ DỮ LIỆU Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyAbIbeVqEht5hsIYE6IXFrRJaOq2oyMMKw", 
        authDomain: "quanlychitieu-af553.firebaseapp.com",
        projectId: "quanlychitieu-af553",
        storageBucket: "quanlychitieu-af553.appspot.com",
        messagingSenderId: "367355152865",
        appId: "1:367355152865:web:644a86071ef2817d6928e1"
    };
    
    const app = initializeApp(firebaseConfig); 
    export const db = getFirestore(app);       // 👈 Thêm export
    export const auth = getAuth(app);          // 👈 Thêm export

    // 🔥 THÊM ĐOẠN NÀY VÀO NGAY ĐÂY: Ép hệ thống lưu tài khoản vào bộ nhớ máy vĩnh viễn
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
            console.log("Đã cấu hình duy trì đăng nhập lâu dài thành công.");
        })
        .catch((error) => {
            console.error("Lỗi thiết lập duy trì đăng nhập:", error);
        });
    export const datathuchi = collection(db, "giao_dich_business"); // 👈 Thêm export

    // Biến toàn cục hệ thống
    window.ngayChotChuKy = 25; 
    window.boSuoTapHanMuc = {}; // Thay vì localStorage, biến này sẽ được đồng bộ từ Firebase
    window.thoiGianDangXem = new Date();    // NEW
    window.idGiaoDichDangSua = null;        //NEW
    window.duLieuSnapshotQuocTe = null;     //NEW

    // CẮT TỪ DƯỚI ĐEM LÊN
    export const danhSachIcon = {"Ăn uống": "🍔", "Di chuyển": "🚗", "Trang phục": "🛍️", "Mỹ phẩm": "🛍️", "Hóa đơn": "💵", "Nhà cửa": "💵", "Giải trí": "🎬", "Thu nhập từ lương": "💰", "Thu nhập khác": "💸", "Khác": "✨"}; // 👈 Thêm export

    // --- HÀM HỖ TRỢ THỜI GIAN & CHU KỲ ---
    window.layChuoiThangNam = function(dateObj) {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    };

    window.capNhatChuHienThiThang = function() {
        const txtThangNam = document.getElementById('hien-thi-thang-nam-han-muc'); 
        if (txtThangNam) {
            txtThangNam.innerText = `Tháng ${String(window.thoiGianDangXem.getMonth() + 1).padStart(2, '0')}/${window.thoiGianDangXem.getFullYear()}`;
        }
    };

    // Hàm tính toán mốc thời gian chu kỳ tính toán
    function layRangeChuKy(anchorDate) {
        const y = anchorDate.getFullYear();
        const m = anchorDate.getMonth(); 
        const ngayChot = window.ngayChotChuKy || 25;
        const denNgay = new Date(y, m, ngayChot, 23, 59, 59, 999);
        const tuNgay = new Date(y, m - 1, ngayChot + 1, 0, 0, 0, 0);
        return { tuNgay, denNgay };
    }

    // Hàm chuyển đổi chuỗi định dạng "YYYY-MM-DD HH:mm" thành Date
    export function parseChuoiThoiGian(chuoi) { // 👈 Thêm export
        if (!chuoi) return new Date(0);
        const [ngayPart, gioPart] = chuoi.split(' ');
        const [nam, thang, ngay] = ngayPart.split('-').map(Number);
        const [gio, phut] = gioPart ? gioPart.split(':').map(Number) : [0, 0];
        return new Date(nam, thang - 1, ngay, gio, phut);
    }

    // Tạo danh sách từ ngày 1 đến ngày 31 cho thẻ select
    const selectChuKy = document.getElementById('select-ngay-chu-ky');
    if (selectChuKy) {
        for (let i = 1; i <= 31; i++) {
            const opt = document.createElement('option');
            opt.value = i; 
            opt.innerText = `Ngày ${i} hàng tháng`; 
            selectChuKy.appendChild(opt);
        }
    }
