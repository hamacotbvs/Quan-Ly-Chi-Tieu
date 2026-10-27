import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAbIbeVqEht5hsIYE6IXFrRJaOq2oyMMKw", 
    authDomain: "quanlychitieu-af553.firebaseapp.com",
    projectId: "quanlychitieu-af553",
    storageBucket: "quanlychitieu-af553.appspot.com",
    messagingSenderId: "367355152865",
    appId: "1:367355152865:web:644a86071ef2817d6928e1"
};          

const app = initializeApp(firebaseConfig); 
export const db = getFirestore(app);
export const auth = getAuth(app); 
export const datathuchi = collection(db, "giao_dich_business");

setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Lỗi thiết lập duy trì đăng nhập:", error);
});

window.ngayChotChuKy = 25; 
window.boSuoTapHanMuc = {}; 
window.thoiGianDangXem = new Date();
window.idGiaoDichDangSua = null;
window.duLieuSnapshotQuocTe = null;

export const danhSachIcon = {"Ăn uống": "🍔", "Di chuyển": "🚗", "Trang phục": "🛍️", "Mỹ phẩm": "🛍️", "Hóa đơn": "💵", "Nhà cửa": "💵", "Giải trí": "🎬", "Thu nhập từ lương": "💰", "Thu nhập khác": "💸", "Khác": "✨"};

window.layChuoiThangNam = function(dateObj) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
};

window.capNhatChuHienThiThang = function() {
    const txtThangNam = document.getElementById('hien-thi-thang-nam-han-muc'); 
    if (txtThangNam) {
        txtThangNam.innerText = `Tháng ${String(window.thoiGianDangXem.getMonth() + 1).padStart(2, '0')}/${window.thoiGianDangXem.getFullYear()}`;
    }
};

export function layRangeChuKy(anchorDate) {
    const y = anchorDate.getFullYear();
    const m = anchorDate.getMonth(); 
    const ngayChot = window.ngayChotChuKy || 25;
    const denNgay = new Date(y, m, ngayChot, 23, 59, 59, 999);
    const tuNgay = new Date(y, m - 1, ngayChot + 1, 0, 0, 0, 0);
    return { tuNgay, denNgay };
}

export function parseChuoiThoiGian(chuoi) {
    if (!chuoi) return new Date(0);
    const [ngayPart, gioPart] = chuoi.split(' ');
    const [nam, thang, ngay] = ngayPart.split('-').map(Number);
    const [gio, phut] = gioPart ? gioPart.split(':').map(Number) : [0, 0];
    return new Date(nam, thang - 1, ngay, gio, phut);
}

const selectChuKy = document.getElementById('select-ngay-chu-ky');
if (selectChuKy) {
    for (let i = 1; i <= 31; i++) {
        const opt = document.createElement('option'); opt.value = i; opt.innerText = `Ngày ${i} hàng tháng`; selectChuKy.appendChild(opt);
    }
}
