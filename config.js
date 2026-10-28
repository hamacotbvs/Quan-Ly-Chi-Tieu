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
        appId: "1:367355152865:web:644a86071ef2817d6928e1"};
    const app = initializeApp(firebaseConfig); 
    export const db = getFirestore(app);       // 👈 Thêm export
    export const auth = getAuth(app);          // 👈 Thêm export

    // Ép hệ thống lưu tài khoản vào bộ nhớ máy vĩnh viễn
    setPersistence(auth, browserLocalPersistence)
        .then(() => {console.log("Đã cấu hình duy trì đăng nhập lâu dài thành công.");})
        .catch((error) => {console.error("Lỗi thiết lập duy trì đăng nhập:", error);});

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
    export function layRangeChuKy(anchorDate) {// 👈 Thêm export ở đây
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

    // --- XỬ LÝ GIAO DIỆN ĐĂNG NHẬP / ĐĂNG KÝ / QUÊN MẬT KHẨU ---
    const manHinhAuth = document.getElementById('man-hinh-auth');
    const khungAppChinh = document.getElementById('khung-chua-app-chinh');
    const authTieuDe = document.getElementById('auth-tieu-de');
    const authGhiChu = document.getElementById('auth-ghi-chu');
    const inputAuthUsername = document.getElementById('auth-username');
    const inputAuthPassword = document.getElementById('auth-password');
    const vungNhapLaiMatKhau = document.getElementById('vung-nhap-lai-mat-khau');
    const inputAuthRePassword = document.getElementById('auth-re-password');
    const nutHanhDongAuth = document.getElementById('nut-hanh-dong-auth');
    const linkQuenMk = document.getElementById('link-quen-mk');
    const linkChuyenTrang = document.getElementById('link-chuyen-trang');
    let isLoginMode = true;

    // Chuyển đổi giao diện Đăng Nhập / Đăng Ký
    if (linkChuyenTrang) {
        linkChuyenTrang.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            if (isLoginMode) {
                authTieuDe.innerText = "Đăng nhập tài khoản";
                authGhiChu.innerText = "Đăng nhập bằng tên tài khoản";
                vungNhapLaiMatKhau.style.display = "none";
                nutHanhDongAuth.innerText = "Đăng Nhập";
                linkQuenMk.style.display = "inline";
                linkChuyenTrang.innerText = 'Chưa có tài khoản? <span class="chu-dang-ky">Đăng ký</span>';
            } else {
                authTieuDe.innerText = "Đăng ký tài khoản";
                authGhiChu.innerText = "Ứng dụng quản lý thu chi cá nhân";
                vungNhapLaiMatKhau.style.display = "block";
                nutHanhDongAuth.innerText = "Đăng Ký Ngay";
                linkQuenMk.style.display = "none";
                linkChuyenTrang.innerText = 'Đã có tài khoản? <span class="chu-dang-ky">Đăng nhập</span>';
            }
        });
    }

    // Xử lý nút Đăng Nhập hoặc Đăng Ký
    if (nutHanhDongAuth) {
        nutHanhDongAuth.addEventListener('click', async () => {
            let userInput = inputAuthUsername.value.trim().toLowerCase().replace(/\s+/g, '');
            const password = inputAuthPassword.value;
            if (!userInput || !password) {
                alert("Vui lòng điền đầy đủ User và Mật khẩu!");
                return;
            }
            // 🔑 KỸ THUẬT QUY ĐỔI: Tự động gán đuôi để tương thích với Firebase Auth
            const emailDinhDanh = `${userInput}@quanlychitieu.phumai.vn`;
            try {
                if (isLoginMode) {
                    await signInWithEmailAndPassword(auth, emailDinhDanh, password);
                } else {
                    const rePassword = inputAuthRePassword.value;
                    if (password !== rePassword) {
                        alert("Mật khẩu nhập lại không trùng khớp!");
                        return;
                    }
                    if (password.length < 6) {
                        alert("Mật khẩu bảo mật phải từ 6 ký tự trở lên!");
                        return;
                    }
                    const userCredential = await createUserWithEmailAndPassword(auth, emailDinhDanh, password);
                    await updateProfile(userCredential.user, { displayName: userInput });
                    alert("Đăng ký tài khoản thành công!");
                }
            } catch (error) {
                if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
                    alert("Tài khoản hoặc mật khẩu không chính xác!");
                } else if (error.code === 'auth/email-already-in-use') {
                    alert("Tên đăng nhập này đã có người sử dụng, vui lòng chọn tên khác!");
                } else {
                    alert("Thao tác thất bại: " + error.message);
                }
            }
        });
    }

    // Xử lý nút "Quên mật khẩu"
    if (linkQuenMk) {
        linkQuenMk.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = inputAuthUsername.value.trim();
            if (!email || !email.includes('@')) {
                alert("Vui lòng nhập chính xác Email của bạn vào ô 'Tài khoản'!");
                return;
            }
            try {
                await sendPasswordResetEmail(auth, email);
                alert(`Hệ thống đã gửi liên kết đặt lại mật khẩu vào hòm thư: ${email}`);
            } catch (error) {
                alert("Không thể gửi email: " + error.message);
            }
        });
    }

    // Nút đăng xuất
    function tichHopNutDangXuat() {
    const nutDangXuat = document.getElementById('nut-dang-xuat-app');
    
    if (nutDangXuat && !nutDangXuat.dataset.hasListener) {
        nutDangXuat.addEventListener('click', () => {
            if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
                signOut(auth);
            }
        });
        nutDangXuat.dataset.hasListener = "true";
    }
}
