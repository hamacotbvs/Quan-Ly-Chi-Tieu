    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
    import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, updateProfile, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

    // Tạo danh sách từ ngày 1 đến ngày 31 cho thẻ select
    const selectChuKy = document.getElementById('select-ngay-chu-ky');
    if (selectChuKy) {for (let i = 1; i <= 31; i++) {const opt = document.createElement('option'); opt.value = i; opt.innerText = `Ngày ${i} hàng tháng`; selectChuKy.appendChild(opt);}}
    // Biến toàn cục lưu ngày chốt chu kỳ (Mặc định là ngày 25 nếu chưa tải xong từ DB)
    window.ngayChotChuKy = 25; 

// Biến toàn cục hệ thống
    window.ngayChotChuKy = 25; 
    window.boSuoTapHanMuc = {}; // Thay vì localStorage, biến này sẽ được đồng bộ từ Firebase
    let checkKhoiTaoLanDau = true;
    let bieuDoInstance = null; // Biến giữ trạng thái biểu đồ tránh trùng lặp canvas
    let bieuDoBaoCaoInstance = null; // ➕ THÊM MỚI dòng này để quản lý riêng biểu đồ tab Báo cáo

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
    function parseChuoiThoiGian(chuoi) {
        if (!chuoi) return new Date(0);
        const [ngayPart, gioPart] = chuoi.split(' ');
        const [nam, thang, ngay] = ngayPart.split('-').map(Number);
        const [gio, phut] = gioPart ? gioPart.split(':').map(Number) : [0, 0];
        return new Date(nam, thang - 1, ngay, gio, phut);
    }

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
    const db = getFirestore(app);
    const auth = getAuth(app); 
    // 🔥 THÊM ĐOẠN NÀY VÀO NGAY ĐÂY: Ép hệ thống lưu tài khoản vào bộ nhớ máy vĩnh viễn
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
            console.log("Đã cấu hình duy trì đăng nhập lâu dài thành công.");
        })
        .catch((error) => {
            console.error("Lỗi thiết lập duy trì đăng nhập:", error);
        });
    const datathuchi = collection(db, "giao_dich_business");
    
    let huyTheoDoiThuChi = null;
    let huyTheoDoiCauHinh = null;

    // B. THAO TÁC CHUNG & QUẢN LÝ TÀI KHOẢN (AUTH)
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

// Lắng nghe trạng thái đăng nhập hệ thống
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (manHinhAuth) manHinhAuth.style.display = 'none';
        if (khungAppChinh) khungAppChinh.style.display = 'block';
        // ➕ Ép màn hình trả về vị trí gốc ban đầu (Hủy mọi vết phóng to lỗi khi nhấn ô nhập liệu cũ)
        window.scrollTo(0, 0);
        
        const txtTenUser = document.getElementById('ten-user-hien-thi');
        const txtEmailUser = document.getElementById('email-user-hien-thi');
        if (txtTenUser) txtTenUser.innerText = user.displayName || user.email.split('@')[0];
        if (txtEmailUser) txtEmailUser.innerText = user.email;
        
        tichHopNutDangXuat(); 
        
        // Tải cấu hình ngày chốt và HẠN MỨC từ bảng cau_hinh_user realtime
        const docRefCauHinh = doc(db, "cau_hinh_user", user.uid);
        huyTheoDoiCauHinh = onSnapshot(docRefCauHinh, (docSnap) => {
            if (docSnap.exists()) {
                const dataCH = docSnap.data();
                window.ngayChotChuKy = dataCH.ngayChot || 25;
                // 🔥 Lấy hạn mức từ Firebase đổ vào biến toàn cục
                window.boSuoTapHanMuc = dataCH.hanMucThang || {};
                
                const selectNgay = document.getElementById('select-ngay-chu-ky');
                if (selectNgay) selectNgay.value = window.ngayChotChuKy;
            }
            
            // Tự động nhảy sang chu kỳ tháng tiếp theo nếu vượt quá ngày chốt
            if (checkKhoiTaoLanDau) {
                const homNay = new Date();
                if (homNay.getDate() > window.ngayChotChuKy) {
                    window.thoiGianDangXem.setMonth(homNay.getMonth() + 1);
                }
                window.capNhatChuHienThiThang(); 
                checkKhoiTaoLanDau = false; 
            }

            // Cập nhật lại giao diện hạn mức ngay khi dữ liệu cấu hình từ Firebase trả về
            if (window.duLieuSnapshotQuocTe) {
                capNhatThanhHanMuc(window.duLieuSnapshotQuocTe);
            }

            if (!huyTheoDoiThuChi) {
                kichHoatHeThongDuLieuRealtime(user); 
            } else {
                hayLaiHeThongGiaoDienYeuCau();
            }
        });

    } else {
        // 🟢 ĐOẠN NÀY BỊ THIẾU TRONG CODE CỦA BẠN - ĐÃ BÙ LẠI CHUẨN XÁC:
        if (manHinhAuth) manHinhAuth.style.display = 'flex';
        if (khungAppChinh) khungAppChinh.style.display = 'none';
        if (huyTheoDoiThuChi) { huyTheoDoiThuChi(); huyTheoDoiThuChi = null; } 
        if (huyTheoDoiCauHinh) { huyTheoDoiCauHinh(); huyTheoDoiCauHinh = null; } 
    } 

}); // Ký tự đóng chuẩn hàm onAuthStateChanged

// Lưu ngày chốt chu kỳ
const selectNgayChuKy = document.getElementById('select-ngay-chu-ky');
const nutLuuChuKy = document.getElementById('nut-luu-chu-ky');
if (nutLuuChuKy && selectNgayChuKy) {
    nutLuuChuKy.addEventListener('click', async () => {
        if (!auth.currentUser) { alert("Phiên đăng nhập đã hết hạn!"); return; }
        const ngayChon = parseInt(selectNgayChuKy.value);
        try {
            await setDoc(doc(db, "cau_hinh_user", auth.currentUser.uid), {
                ngayChot: ngayChon
            }, { merge: true });
            alert("Đã cập nhật ngày kết thúc chu kỳ thành công!");
        } catch (error) {
            alert("Không thể lưu cấu hình: " + error.message);
        }
    });
    
    // Sự kiện thay đổi ô select cập nhật ghi chú tức thì
    selectNgayChuKy.addEventListener('change', (e) => {
        window.ngayChotChuKy = parseInt(e.target.value) || 25;
        if (window.duLieuSnapshotQuocTe) {
            capNhatThanhHanMuc(window.duLieuSnapshotQuocTe);
        } 
    }); 
}

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

// I. NÚT LÀM MỚI ỨNG DỤNG
const idNutLamMoi = document.getElementById('NUT-LAM-MOI-APP');
if (idNutLamMoi) {
    idNutLamMoi.addEventListener('click', () => {
        const iconSvg = idNutLamMoi.querySelector('svg'); 
        if (iconSvg) {
            iconSvg.style.transform = 'rotate(360deg)';
            iconSvg.style.transition = 'transform 0.4s ease';
        }
        // Khi bấm nút làm mới, trang sẽ tự load lại và màn hình Loading sẽ che đi, chặn hoàn toàn hiện tượng lóe
        setTimeout(() => { window.location.reload(); }, 350);
    });
}

    // II. CHUYỂN ĐỔI QUA LẠI GIỮA CÁC TAB
    const cacNutTab = document.querySelectorAll('.nut-tab');
    cacNutTab.forEach(nut => {
        nut.addEventListener('click', () => {
            const mucTieu = nut.getAttribute('data-target'); 
            cacNutTab.forEach(b => b.classList.remove('active'));
            nut.classList.add('active'); 
            const cacVungNoiDung = document.querySelectorAll('.tab-menu-duoi');                
            cacVungNoiDung.forEach(content => content.classList.remove('active'));
            const vungNoiDungMucTieu = document.getElementById(`tab-${mucTieu}`); 
            if (vungNoiDungMucTieu) vungNoiDungMucTieu.classList.add('active'); 
        }); 
    });

    // C.I TAB HOME (QUẢN LÝ HẠN MỨC)
    const txtChu = document.getElementById('chi-tieu-tren-han-muc');
    const thanhPhanTram = document.getElementById('thanh-phat-trien-han-muc');
    const txtGoiY = document.getElementById('goi-y-han-muc');

    if (typeof thoiGianDangXem === 'undefined') {
        window.thoiGianDangXem = new Date();
        window.layChuoiThangNam = function(dateObj) {
            return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        }
        window.capNhatChuHienThiThang = function() {
            const txtThangNam = document.getElementById('hien-thi-thang-nam-han-muc'); 
            if (txtThangNam) {
                txtThangNam.innerText = `Tháng ${String(window.thoiGianDangXem.getMonth() + 1).padStart(2, '0')}/${window.thoiGianDangXem.getFullYear()}`;
            }
        }
    }

    // 🔥 XỬ LÝ SỰ KIỆN NHẬP HẠN MỨC - LƯU THẲNG LÊN FIREBASE
    document.getElementById('vung-han-muc-chi-tieu')?.addEventListener('click', async () => {
        if (!auth.currentUser) { alert("Phiên đăng nhập đã hết hạn!"); return; }
        
        let thangDangXem = window.layChuoiThangNam(window.thoiGianDangXem); 
        let hanMucThangDangXem = window.boSuoTapHanMuc[thangDangXem] || 0; 
        const [nam, thg] = thangDangXem.split('-'); 
        let loiNhac = hanMucThangDangXem > 0
            ? `Hạn mức tháng ${thg}/${nam} hiện tại là ${hanMucThangDangXem.toLocaleString('vi-VN')} đ.\nNhập hạn mức mới (đ):`
            : `Nhập hạn mức chi tiêu cho tháng ${thg}/${nam} (đ):`;        
        
        let nhapVao = prompt(loiNhac, hanMucThangDangXem > 0 ? hanMucThangDangXem : "");    
        if (nhapVao !== null) {
            let soTienMoi = parseFloat(nhapVao.toString().replace(/[^0-9]/g, '')); 
            if (!isNaN(soTienMoi) && soTienMoi > 0) {
                window.boSuoTapHanMuc[thangDangXem] = soTienMoi;
            } else {
                delete window.boSuoTapHanMuc[thangDangXem];
            }
            
            // Tiến hành update đẩy object map lên Firebase dữ liệu cấu hình user
            try {
                await setDoc(doc(db, "cau_hinh_user", auth.currentUser.uid), {
                    hanMucThang: window.boSuoTapHanMuc
                }, { merge: true });
                
                if (window.duLieuSnapshotQuocTe) { capNhatThanhHanMuc(window.duLieuSnapshotQuocTe); }
            } catch (error) {
                alert("Lỗi không thể lưu hạn mức lên đám mây: " + error.message);
            }
        }
    });

    document.getElementById('cum-chuyen-thang')?.addEventListener('click', (e) => { e.stopPropagation(); });
    document.getElementById('nut-thang-truoc')?.addEventListener('click', (e) => { e.stopPropagation(); window.thoiGianDangXem.setMonth(window.thoiGianDangXem.getMonth() - 1); hayLaiHeThongGiaoDienYeuCau(); });
    document.getElementById('nut-thang-sau')?.addEventListener('click', (e) => { e.stopPropagation(); window.thoiGianDangXem.setMonth(window.thoiGianDangXem.getMonth() + 1); hayLaiHeThongGiaoDienYeuCau(); }); 

    function hayLaiHeThongGiaoDienYeuCau() {
        window.capNhatChuHienThiThang(); 
        if (window.duLieuSnapshotQuocTe) {
            capNhatThanhHanMuc(window.duLieuSnapshotQuocTe); 
            capNhatToanBoGiaoDien(window.duLieuSnapshotQuocTe);
        }
    } 

    function capNhatThanhHanMuc(docs) {
        window.duLieuSnapshotQuocTe = docs; 
        let thangDangXem = window.layChuoiThangNam(window.thoiGianDangXem); 
        let tongDaChi = 0; 
        const chuKyMoc = layRangeChuKy(window.thoiGianDangXem);
        // ➕ THÊM 4 DÒNG NÀY VÀO ĐÂY ĐỂ ĐỔI THÁNG LÀ TỰ NHẢY CHỮ gợi ý chu kỳ tính toán
        const fMat = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const txtGhiChu = document.getElementById('ghi-chu-pham-vi-chu-ky');
        if (txtGhiChu) {txtGhiChu.innerText = `*Chu kỳ: Từ ngày ${fMat(chuKyMoc.tuNgay)} đến ngày ${fMat(chuKyMoc.denNgay)}.*`;}
        docs.forEach(docItem => {
            const data = docItem.data(); 
            const thoiGianMoc = parseChuoiThoiGian(data.thoiGian);
            if (thoiGianMoc >= chuKyMoc.tuNgay && thoiGianMoc <= chuKyMoc.denNgay && data.loai === 'chi') {tongDaChi += parseFloat(data.soTien) || 0;}}); 
        // 🔥 Đọc dữ liệu từ map cấu hình lấy về từ Firebase
        let hanMucThangDangXem = window.boSuoTapHanMuc[thangDangXem] || 0;
        if (!txtChu || !thanhPhanTram) return;
        if (hanMucThangDangXem === 0) {
            txtChu.innerText = `${tongDaChi.toLocaleString('vi-VN')} đ / Chưa đặt`; 
            thanhPhanTram.style.width = '0%'; 
            if (txtGoiY) { txtGoiY.innerText = "💡 Bấm vào đây để cài đặt hạn mức tháng"; txtGoiY.style.color = '#999999'; }
            return;
        }
        let phanTram = (tongDaChi / hanMucThangDangXem) * 100; 
        txtChu.innerText = `${tongDaChi.toLocaleString('vi-VN')}/${hanMucThangDangXem.toLocaleString('vi-VN')}đ`; 
        thanhPhanTram.style.width = `${phanTram > 100 ? 100 : phanTram}%`;
        if (phanTram >= 100) {
            thanhPhanTram.style.backgroundColor = '#e74c3c'; 
            if (txtGoiY) { txtGoiY.innerText = `⚠️ Vượt quá hạn mức ${(phanTram - 100).toFixed(0)}%!`; txtGoiY.style.color = '#e74c3c'; }
        } else {
            thanhPhanTram.style.backgroundColor = '#2ecc71'; 
            if (txtGoiY) { txtGoiY.innerText = `✅ Còn ${(hanMucThangDangXem - tongDaChi).toLocaleString('vi-VN')}đ chi tiêu`; txtGoiY.style.color = '#999999'; } }
        capNhatBieuDoBaoCaoNam(docs); // 🔥 CHÈN DÒNG NÀY VÀO ĐÂY: Để cứ có thay đổi hoặc chuyển tháng/năm là biểu đồ tự làm mới
        capNhatBieuDoTabBaoCaoTaiChinh(docs); // Khi dữ liệu tải xong: Vẽ biểu đồ Thu nhập
    }
    window.capNhatChuHienThiThang();
// BIỂU ĐỒ NGÂN SÁCH THU CHI 12 THÁNG
// Hàm xử lý gom dữ liệu 12 tháng theo CHU KỲ, vẽ biểu đồ đè lồng nhau và đường CÒN LẠI (Màu vàng, không chấm)
function capNhatBieuDoBaoCaoNam(docs) {
    const ctx = document.getElementById('bieuDoNganSach');
    if (!ctx) return;

    const namDangXem = window.thoiGianDangXem.getFullYear();
    
    const txtTieuDeBc = document.getElementById('tieu-de-bieu-do');
    if (txtTieuDeBc) txtTieuDeBc.innerText = `Biểu đồ Ngân sách & Chi tiêu năm ${namDangXem}`;

    const mangDaChiThucTe = Array(12).fill(0);
    
    docs.forEach(docItem => {
        const data = docItem.data();
        if (data.loai === 'chi' && data.thoiGian) {
            const thoiGianMoc = parseChuoiThoiGian(data.thoiGian);
            for (let m = 0; m < 12; m++) {
                const ngayDaiDienThang = new Date(namDangXem, m, 1);
                const chuKyMoc = layRangeChuKy(ngayDaiDienThang);
                if (thoiGianMoc >= chuKyMoc.tuNgay && thoiGianMoc <= chuKyMoc.denNgay) {
                    mangDaChiThucTe[m] += parseFloat(data.soTien) || 0;
                    break; 
                }
            }
        }
    });

    const mangMax = Array(12).fill(0);       
    const mangMin = Array(12).fill(0);       
    const mangConLai = Array(12).fill(0); 
    const mangMauMax = Array(12).fill('');   
    const mangMauMin = Array(12).fill('');   

    for (let m = 0; m < 12; m++) {
        const chuoiThangNam = `${namDangXem}-${String(m + 1).padStart(2, '0')}`;
        const hanMuc = window.boSuoTapHanMuc[chuoiThangNam] || 0;
        const daChi = mangDaChiThucTe[m];

        mangConLai[m] = hanMuc - daChi; 

        if (hanMuc >= daChi) {
            mangMax[m] = hanMuc;
            mangMin[m] = daChi;
            mangMauMax[m] = '#3498db'; 
            mangMauMin[m] = '#e74c3c'; 
        } else {
            mangMax[m] = daChi;
            mangMin[m] = hanMuc;
            mangMauMax[m] = '#e74c3c'; 
            mangMauMin[m] = '#3498db'; 
        }
    }

    if (bieuDoInstance) {
        bieuDoInstance.destroy();
    }

    bieuDoInstance = new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
            datasets: [
                {
                    type: 'line', 
                    label: 'Còn lại',
                    data: mangConLai,
                    borderColor: '#f1c40f',    
                    backgroundColor: '#f1c40f',
                    borderWidth: 1, 
                    tension: 0.2, 
                    pointRadius: 0,            
                    pointHoverRadius: 0,       
                    fill: false,
                    grouped: false,
                    order: 1 
                },
                {
                    label: 'Thanh Trước',
                    data: mangMin,
                    backgroundColor: mangMauMin,
                    barPercentage: 0.55, 
                    categoryPercentage: 0.8,
                    borderRadius: 4,
                    grouped: false, 
                    order: 2
                },
                {
                    label: 'Thanh Sau',
                    data: mangMax,
                    backgroundColor: mangMauMax,
                    barPercentage: 0.85, 
                    categoryPercentage: 0.8, 
                    borderRadius: 4,
                    grouped: false, 
                    order: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 35 // Tăng nhẹ khoảng trống đỉnh để dòng chú thích mới đứng thoải mái
                }
            },
            plugins: {
                legend: { display: false }, 
                tooltip: { enabled: false } 
            },
            scales: {
                x: { 
                    stacked: false,
                    ticks: {
                        maxRotation: 0,
                        minRotation: 0,
                        autoSkip: false 
                    }
                },
                y: {
                    beginAtZero: true,
                    grace: '20%', 
                    ticks: {
                        callback: function(value) { 
                            return (value / 1000000).toFixed(0) + 'tr'; 
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'hienChuDauCot',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();
                
                // 🔑 1. VẼ CỤM CHÚ THÍCH HÀNG NGANG: Ô MÀU + CHỮ VIẾT RÕ RÀNG
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 11px sans-serif';
                
                const txtNS = 'Ngân sách';
                const txtChi = 'Chi tiêu';
                const txtCon = 'Còn lại';
                
                // Đo độ rộng thực tế của chữ để tính toán căn giữa chuẩn xác
                const wNS = ctx.measureText(txtNS).width;
                const wChi = ctx.measureText(txtChi).width;
                const wCon = ctx.measureText(txtCon).width;
                
                const boxSize = 10;        // Kích thước ô vuông màu
                const boxGap = 5;          // Khoảng cách từ ô vuông đến chữ đi kèm
                const khoangCachCum = 20;  // Khoảng cách giữa các cụm (Cụm Ngân sách <-> Cụm Chi tiêu)
                
                // Tổng chiều rộng của toàn bộ dải chú thích
                const tongChieuRong = (boxSize + boxGap) * 3 + wNS + wChi + wCon + (khoangCachCum * 2);
                
                let toaDoXChay = (chart.width - tongChieuRong) / 2; // Điểm bắt đầu vẽ để nằm chính giữa
                const toaDoYChuan = 12; // Vị trí nằm ngay dưới chữ Tiêu đề biểu đồ
                
                ctx.textAlign = 'left';
                
                // --- Vẽ cụm 1: Ngân sách ---
                ctx.fillStyle = '#3498db'; // Màu xanh
                ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize);
                toaDoXChay += boxSize + boxGap;
                ctx.fillStyle = '#333333'; // Chữ màu tối cho dễ đọc
                ctx.fillText(txtNS, toaDoXChay, toaDoYChuan);
                toaDoXChay += wNS + khoangCachCum;
                
                // --- Vẽ cụm 2: Chi tiêu ---
                ctx.fillStyle = '#e74c3c'; // Màu đỏ
                ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize);
                toaDoXChay += boxSize + boxGap;
                ctx.fillStyle = '#333333';
                ctx.fillText(txtChi, toaDoXChay, toaDoYChuan);
                toaDoXChay += wChi + khoangCachCum;
                
                // --- Vẽ cụm 3: Còn lại ---
                ctx.fillStyle = '#f1c40f'; // Màu vàng
                ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize);
                toaDoXChay += boxSize + boxGap;
                ctx.fillStyle = '#333333';
                ctx.fillText(txtCon, toaDoXChay, toaDoYChuan);

                // -------------------------------------------------------------
                // 2. VẼ CÁC SỐ TRÊN ĐẦU CỘT NHƯ CŨ
                ctx.textAlign = 'center';
                ctx.font = 'bold 9px sans-serif';
                
                const meta = chart.getDatasetMeta(2);
                
                for (let i = 0; i < 12; i++) {
                    const ns = window.boSuoTapHanMuc[`${namDangXem}-${String(i + 1).padStart(2, '0')}`] || 0;
                    const ct = mangDaChiThucTe[i];
                    const cl = mangConLai[i];
                    
                    if (ns === 0 && ct === 0) continue;
                    
                    const bar = meta.data[i];
                    if (!bar) continue;
                    
                    const xPos = bar.x;
                    let yPos = bar.y - 6; 
                    
                    const chuoiNs = (ns / 1000000).toFixed(1).replace('.', ',');
                    const chuoiCt = (ct / 1000000).toFixed(1).replace('.', ',');
                    const chuoiCl = (Math.abs(cl) / 1000000).toFixed(1).replace('.', ',');
                    const dauCl = cl >= 0 ? '' : '-';
                    
                    // Vẽ dòng 3: Còn lại (Vàng)
                    ctx.fillStyle = '#e67e22';
                    ctx.fillText(dauCl + chuoiCl, xPos, yPos);
                    
                    // Vẽ dòng 2: Chi tiêu (Đỏ)
                    ctx.fillStyle = '#c0392b';
                    ctx.fillText(chuoiCt, xPos, yPos - 11);
                    
                    // Vẽ dòng 1: Ngân sách (Xanh)
                    ctx.fillStyle = '#3498db';
                    ctx.fillText(chuoiNs, xPos, yPos - 22);
                }
                ctx.restore();
            }
        }]
    });
}

    // C.2 TAB LỊCH SỬ & ĐỔ DỮ LIỆU REALTIME
    const idHienThiSoDu = document.getElementById('so-du');
    const idVungLichSu = document.getElementById('lich-su-giao-dich');
    const idBcThu = document.getElementById('bao-cao-thu');
    const idBcChi = document.getElementById('bao-cao-chi');
    const idThanhThu = document.getElementById('thanh-thu-ti-le');
    const idThanhChi = document.getElementById('thanh-chi-ti-le');
    const danhSachIcon = {"Ăn uống": "🍔", "Di chuyển": "🚗", "Trang phục": "🛍️", "Mỹ phẩm": "🛍️", "Hóa đơn": "💵", "Nhà cửa": "💵", "Giải trí": "🎬", "Thu nhập từ lương": "💰", "Thu nhập khác": "💸", "Khác": "✨"};


    // CÁC DỮ LIỆU
    function kichHoatHeThongDuLieuRealtime(user) {
        const truyVanDocLapUser = query(datathuchi, where("userId", "==", user.uid)); 
        huyTheoDoiThuChi = onSnapshot(truyVanDocLapUser, (snapshot) => {
            capNhatToanBoGiaoDien(snapshot.docs);
            capNhatThanhHanMuc(snapshot.docs);
        });
    }

    function capNhatToanBoGiaoDien(docs) {
        window.duLieuSnapshotQuocTe = docs;
        if (!idVungLichSu) return;
        idVungLichSu.innerHTML = ''; 
        let tongSoDu = 0;    
        let tongThuNhap = 0; 
        let tongChiTieu = 0; 

        const chuKy = layRangeChuKy(window.thoiGianDangXem);

        if (!docs || docs.length === 0) {
            idVungLichSu.innerHTML = '<div class="trang-thai-trong">Chưa có giao dịch nào!</div>'; 
            if (idHienThiSoDu) idHienThiSoDu.innerText = "0 đ";
            if (idBcThu) idBcThu.innerText = "0 đ";
            if (idBcChi) idBcChi.innerText = "0 đ";
            return;
        }

        const mangSapXep = [...docs].sort((a, b) => (b.data().thoiGian || '').localeCompare(a.data().thoiGian || ''));

        mangSapXep.forEach((docItem) => {
            const giaoDich = docItem.data();
            const docId = docItem.id;
            const soTienGiaoDich = parseFloat(giaoDich.soTien) || 0;
            const thoiGianMoc = parseChuoiThoiGian(giaoDich.thoiGian);

            if (giaoDich.loai === 'thu') { tongSoDu += soTienGiaoDich; } else { tongSoDu -= soTienGiaoDich; }

            if (thoiGianMoc >= chuKy.tuNgay && thoiGianMoc <= chuKy.denNgay) {
                if (giaoDich.loai === 'thu') { tongThuNhap += soTienGiaoDich; } else { tongChiTieu += soTienGiaoDich; }

                const hienThiDanhMuc = giaoDich.danhMuc || "Khác";
                const iconPhuHop = danhSachIcon[hienThiDanhMuc] || "📂";
                const hienThiThoiGian = giaoDich.thoiGian || "--/--/---- --:--";

                let kyTuDau = giaoDich.loai === 'thu' ? '+' : '-';
                let lopMauSac = giaoDich.loai === 'thu' ? 'mau-thu' : 'mau-chi';

                const dongMoi = document.createElement('div');
                dongMoi.classList.add('dong-giao-dich');
                dongMoi.innerHTML = `
                    <div class="nen-hanh-dong"><div class="hanh-dong-sua">✏️ Sửa</div><div class="hanh-dong-xoa">🗑️ Xóa</div></div>
                    <div class="giao-dich-noi-dung" data-id="${docId}">
                        <div class="giao-dich-trai"> <span class="giao-dich-muc">${iconPhuHop} ${hienThiDanhMuc}</span> <span class="giao-dich-ten">${giaoDich.ten}</span> </div>
                        <div class="giao-dich-phai-cum"> <span class="giao-dich-thoi-gian">🕒 ${hienThiThoiGian}</span> <span class="giao-dich-phai ${lopMauSac}">${kyTuDau}${soTienGiaoDich.toLocaleString('vi-VN')} đ</span> </div>
                    </div>
                `;
                idVungLichSu.appendChild(dongMoi);
            }
        });

        if (idVungLichSu.innerHTML === '') {
            idVungLichSu.innerHTML = '<div class="trang-thai-trong">Chu kỳ tháng này không phát sinh giao dịch!</div>';
        }

        if (idHienThiSoDu) idHienThiSoDu.innerText = tongSoDu.toLocaleString('vi-VN') + " đ"; 
        if (idBcThu) idBcThu.innerText = tongThuNhap.toLocaleString('vi-VN') + " đ"; 
        if (idBcChi) idBcChi.innerText = tongChiTieu.toLocaleString('vi-VN') + " đ";

        const maxTong = Math.max(tongThuNhap, tongChiTieu);
        if (maxTong > 0) {
            if (idThanhThu) idThanhThu.style.width = `${(tongThuNhap / maxTong) * 100}%`; 
            if (idThanhChi) idThanhChi.style.width = `${(tongChiTieu / maxTong) * 100}%`;
        } else {
            if (idThanhThu) idThanhThu.style.width = "0%"; if (idThanhChi) idThanhChi.style.width = "0%";
        }

        // ĐOẠN XỬ LÝ VUỐT CHẠM (SWIPE TO EDIT/DELETE)
        document.querySelectorAll('.giao-dich-noi-dung').forEach(noiDung => {
            let xBatDau = 0; let xDiChuyen = 0; let dangVuot = false;
            const batDauVuot = (e) => { dangVuot = true; xBatDau = e.touches ? e.touches[0].clientX : e.clientX; };
            const dangKeo = (e) => { 
                if (!dangVuot) return; 
                const xHienTai = e.touches ? e.touches[0].clientX : e.clientX; 
                xDiChuyen = xHienTai - xBatDau; 
                if (xDiChuyen > 100) xDiChuyen = 100; if (xDiChuyen < -100) xDiChuyen = -100; 
                noiDung.style.transform = `translateX(${xDiChuyen}px)`; noiDung.style.transition = 'none';
            };
            const ketThucVuot = async () => { 
                if (!dangVuot) return; dangVuot = false; 
                noiDung.style.transition = 'transform 0.2s ease-out';
                const idTaiLieu = noiDung.getAttribute('data-id');
                const tenGiaoDich = noiDung.querySelector('.giao-dich-ten')?.innerText || '';
                const danhMucGiaoDich = noiDung.querySelector('.giao-dich-muc')?.innerText || '';
                const thoiGianGiaoDich = noiDung.querySelector('.giao-dich-thoi-gian')?.innerText || '';
                const soTienGiaoDich = noiDung.querySelector('.giao-dich-phai')?.innerText || '';

                if (xDiChuyen < -60) {
                    noiDung.style.transform = 'translateX(-50%)'; 
                    setTimeout(async () => {
                        if (confirm(`Bạn có chắc chắn muốn xóa giao dịch "${tenGiaoDich}" không?`)) {
                            try { await deleteDoc(doc(db, "giao_dich_business", idTaiLieu)); } catch (err) { noiDung.style.transform = 'translateX(0)'; }
                        } else { noiDung.style.transform = 'translateX(0)'; }
                    }, 200);
                } 
                else if (xDiChuyen > 60) {
                    noiDung.style.transform = 'translateX(0)';
                    if (idTen) idTen.value = tenGiaoDich; 
                    if (idSoTien) { idSoTien.value = soTienGiaoDich.replace(/[^\d]/g, ''); idSoTien.dispatchEvent(new Event('input')); } 
                    if (idLoaiGiaoDich) { idLoaiGiaoDich.value = soTienGiaoDich.includes('+') ? 'thu' : 'chi'; idLoaiGiaoDich.dispatchEvent(new Event('change')); } 
                    setTimeout(() => { if (idDanhMuc) idDanhMuc.value = danhMucGiaoDich.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "").trim() || 'Khác'; }, 100);                        
                    let thoiGianSạch = thoiGianGiaoDich.replace('🕒', '').trim(); 
                    if (thoiGianSạch && thoiGianSạch.includes(' ')) {
                        const mangPhanTach = thoiGianSạch.split(' '); 
                        if (inputNgay) inputNgay.value = mangPhanTach[0]; if (inputGio) inputGio.value = mangPhanTach[1];
                    } 
                    window.idGiaoDichDangSua = idTaiLieu; 
                    if (idnutsave) idnutsave.innerText = "💾 Cập nhật thay đổi"; 
                    document.querySelector('[data-target="add"]')?.click();
                } 
                else { noiDung.style.transform = 'translateX(0)'; }
                xDiChuyen = 0;
            };

            noiDung.addEventListener('touchstart', batDauVuot); noiDung.addEventListener('touchmove', dangKeo); noiDung.addEventListener('touchend', ketThucVuot); 
            noiDung.addEventListener('mousedown', (e) => {
                batDauVuot(e);
                const xửLýDiChuột = (ev) => dangKeo(ev);
                const xửLýThảChuột = () => { ketThucVuot(); window.removeEventListener('mousemove', xửLýDiChuột); window.removeEventListener('mouseup', xửLýThảChuột); };
                window.addEventListener('mousemove', xửLýDiChuột); window.addEventListener('mouseup', xửLýThảChuột);
            }); 
        });
    }

    // C.3 TAB THÊM GIAO DỊCH MỚI
    const idnutsave = document.getElementById('nut-save');
    const idLoaiGiaoDich = document.getElementById('loai-dong-tien');
    const idDanhMuc = document.getElementById('phan-nhom-thu-chi');
    const idTen = document.getElementById('ten-khoan-thu-chi');
    const idSoTien = document.getElementById('so-tien');
    const labelSoTien = document.getElementById('label-so-tien');
    const inputNgay = document.getElementById('ngay-giao-dich'); 
    const inputGio = document.getElementById('gio-giao-dich'); 
    const nutHome = document.querySelector('[data-target="home"]');

    const bayGio = new Date(); 
    if (inputNgay && inputGio) {
        inputNgay.value = `${bayGio.getFullYear()}-${String(bayGio.getMonth() + 1).padStart(2, '0')}-${String(bayGio.getDate()).padStart(2, '0')}`; 
        inputGio.value = `${String(bayGio.getHours()).padStart(2, '0')}:${String(bayGio.getMinutes()).padStart(2, '0')}`;
    }

    if (idLoaiGiaoDich && idDanhMuc) {
        idLoaiGiaoDich.addEventListener('change', () => {
            idDanhMuc.innerHTML = '';
            if (idLoaiGiaoDich.value === 'chi') {
                idDanhMuc.innerHTML = `<option value="Ăn uống">🍔 Ăn uống</option> <option value="Di chuyển">🚗 Di chuyển</option> <option value="Trang phục">🛍️ Trang phục</option> <option value="Mỹ phẩm">🛍️ Mỹ phẩm</option> <option value="Hóa đơn">💵 Hóa đơn </option> <option value="Nhà cửa">💵 Nhà cửa </option> <option value="Giải trí">🎬 Giải trí & Cà phê</option> <option value="Khác">✨ Khác</option> `;
            } else if (idLoaiGiaoDich.value === 'thu') {
                idDanhMuc.innerHTML = `<option value="Thu nhập từ lương">💵 Thu nhập từ lương</option> <option value="Thu nhập khác">💰 Thu nhập khác</option>`;
            }
        });
    }

    if (idSoTien && labelSoTien) {
        idSoTien.addEventListener('input', function () {
            let value = this.value.replace(/\D/g, ''); this.value = value;
            if (!value) { labelSoTien.innerText = 'Số tiền (đ):'; return; } 
            labelSoTien.innerText = `Số tiền: ${Number(value).toLocaleString('vi-VN')}đ`;
        });
    }

    if (idnutsave) {
        idnutsave.addEventListener('click', async () => {
            if (!auth.currentUser) { alert("Phiên đăng nhập đã hết hạn!"); return; }
            const ngayNhap = inputNgay ? inputNgay.value : ""; 
            const gioNhap = inputGio ? inputGio.value : ""; 
            const loai = idLoaiGiaoDich ? idLoaiGiaoDich.value : "chi";
            const ten = idTen ? idTen.value.trim() : "";
            const danhMuc = idDanhMuc ? idDanhMuc.value : "Khác";
            const soTien = idSoTien ? parseInt(idSoTien.value) : 0;
            const chuoiThoiGianGop = `${ngayNhap} ${gioNhap}`;

            if (ten === '' || isNaN(soTien) || soTien <= 0 || !ngayNhap || !gioNhap) {
                alert('Vui lòng kiểm tra lại thông tin hợp lệ!'); return;
            }
            let tenUserHienTai = auth.currentUser.displayName;
            if (!tenUserHienTai && auth.currentUser.email) {
                tenUserHienTai = auth.currentUser.email.split('@')[0];
            }
            const duLieuGiaoDich = {
            ten: ten, 
            soTien: soTien, 
            loai: loai, 
            danhMuc: danhMuc, 
            thoiGian: chuoiThoiGianGop, 
            userId: auth.currentUser.uid,       // Mã định danh UID
            tenUser: tenUserHienTai            // Tên user rõ ràng (VD: phumai)
            };
            try {
                if (window.idGiaoDichDangSua) {
                    // --- KHI SỬA GIAO DỊCH ---
                    await updateDoc(doc(db, "giao_dich_business", window.idGiaoDichDangSua), duLieuGiaoDich);
                        window.idGiaoDichDangSua = null; 
                        idnutsave.innerText = "Cập nhật ví";
                } else {
                    // Thêm giao dịch mới
                    let customDocId = `${tenUserHienTai}-${loai}-${chuoiThoiGianGop}-${Date.now()}`.toUpperCase();
                    await setDoc(doc(db, "giao_dich_business", customDocId), duLieuGiaoDich);
                }

                // Reset lại form nhập liệu
                if (idTen) idTen.value = ''; 
                if (idSoTien) idSoTien.value = ''; 
                if (labelSoTien) labelSoTien.innerText = 'Số tiền (đ):'; 
                
                const bayGioSauLuu = new Date();
                if (inputNgay) inputNgay.value = `${bayGioSauLuu.getFullYear()}-${String(bayGioSauLuu.getMonth() + 1).padStart(2, '0')}-${String(bayGioSauLuu.getDate()).padStart(2, '0')}`;
                if (inputGio) inputGio.value = `${String(bayGioSauLuu.getHours()).padStart(2, '0')}:${String(bayGioSauLuu.getMinutes()).padStart(2, '0')}`;
                
                // Quay về tab Home
                if (nutHome) nutHome.click();

            } catch (loi) { 
                console.error("Lỗi khi ghi dữ liệu:", loi);
                alert("Không thể ghi nhận giao dịch: " + loi.message); 
            } 
        });
    }
    // C.4 TAB BÁO CÁO
// BIỂU ĐỒ THU NHẬP CHI TIÊU 12 THÁNG
// Hàm xử lý gom dữ liệu 12 tháng theo CHU KỲ, vẽ biểu đồ đè lồng nhau và đường CÒN LẠI (Màu vàng, không chấm)
function capNhatBieuDoTabBaoCaoTaiChinh(docs) {
    const ctx = document.getElementById('bieuDoBaoCaoTaiChinh'); // ID canvas mới
    if (!ctx) return;

    const namDangXem = window.thoiGianDangXem.getFullYear();
    
    const txtTieuDeBc = document.getElementById('tieu-de-bieu-do-bao-cao'); // ID tiêu đề mới
    if (txtTieuDeBc) txtTieuDeBc.innerText = `Biểu đồ Thu nhập, Chi tiêu & Tích lũy năm ${namDangXem}`;

    // 1. Khởi tạo mảng lưu trữ dữ liệu 12 tháng
    const mangThuNhapThucTe = Array(12).fill(0);
    const mangChiTieuThucTe = Array(12).fill(0);
    
    // Phân tách dữ liệu thu và chi theo từng tháng
    docs.forEach(docItem => {
        const data = docItem.data();
        if (data.thoiGian) {
            const thoiGianMoc = parseChuoiThoiGian(data.thoiGian);
            for (let m = 0; m < 12; m++) {
                const ngayDaiDienThang = new Date(namDangXem, m, 1);
                const chuKyMoc = layRangeChuKy(ngayDaiDienThang);
                if (thoiGianMoc >= chuKyMoc.tuNgay && thoiGianMoc <= chuKyMoc.denNgay) {
                    if (data.loai === 'thu') {
                        mangThuNhapThucTe[m] += parseFloat(data.soTien) || 0;
                    } else if (data.loai === 'chi') {
                        mangChiTieuThucTe[m] += parseFloat(data.soTien) || 0;
                    }
                    break; 
                }
            }
        }
    });

    // 2. Tính toán mảng Tích lũy và mảng Max/Min để lồng cột đồ thị giống tab Home
    const mangMax = Array(12).fill(0);       
    const mangMin = Array(12).fill(0);       
    const mangTichLuy = Array(12).fill(0); 
    const mangMauMax = Array(12).fill('');   
    const mangMauMin = Array(12).fill('');   

    for (let m = 0; m < 12; m++) {
        const thuNhap = mangThuNhapThucTe[m];
        const chiTieu = mangChiTieuThucTe[m];

        mangTichLuy[m] = thuNhap - chiTieu; // Tích lũy = Thu nhập - Chi tiêu

        if (thuNhap >= chiTieu) {
            mangMax[m] = thuNhap;
            mangMin[m] = chiTieu;
            mangMauMax[m] = '#3498db'; // Thu nhập cao hơn -> Thanh ngoài màu Xanh
            mangMauMin[m] = '#e74c3c'; // Chi tiêu thấp hơn -> Thanh trong màu Đỏ
        } else {
            mangMax[m] = chiTieu;
            mangMin[m] = thuNhap;
            mangMauMax[m] = '#e74c3c'; // Bị lạm chi -> Thanh ngoài biến thành màu Đỏ bao bọc
            mangMauMin[m] = '#3498db'; // Thu nhập tụt vào trong màu Xanh
        }
    }

    // Kiểm tra hủy instance cũ của riêng tab Báo cáo để không bị đè bộ nhớ
    if (bieuDoBaoCaoInstance) {
        bieuDoBaoCaoInstance.destroy();
    }

    // 3. Khởi tạo Chart.js mới cho tab Báo cáo
    bieuDoBaoCaoInstance = new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
            datasets: [
                {
                    type: 'line', 
                    label: 'Tích lũy',
                    data: mangTichLuy,
                    borderColor: '#f1c40f',    
                    backgroundColor: '#f1c40f',
                    borderWidth: 1, 
                    tension: 0.2, 
                    pointRadius: 0,            
                    pointHoverRadius: 0,       
                    fill: false,
                    grouped: false,
                    order: 1 
                },
                {
                    label: 'Thanh Trước',
                    data: mangMin,
                    backgroundColor: mangMauMin,
                    barPercentage: 0.55, 
                    categoryPercentage: 0.8,
                    borderRadius: 4,
                    grouped: false, 
                    order: 2
                },
                {
                    label: 'Thanh Sau',
                    data: mangMax,
                    backgroundColor: mangMauMax,
                    barPercentage: 0.85, 
                    categoryPercentage: 0.8, 
                    borderRadius: 4,
                    grouped: false, 
                    order: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 35 // Giữ nguyên khoảng đệm 35px lý tưởng của bạn
                }
            },
            plugins: {
                legend: { display: false }, 
                tooltip: { enabled: false } 
            },
            scales: {
                x: { 
                    stacked: false,
                    ticks: { maxRotation: 0, minRotation: 0, autoSkip: false }
                },
                y: {
                    beginAtZero: true,
                    grace: '20%', 
                    ticks: {
                        callback: function(value) { 
                            return (value / 1000000).toFixed(0) + 'tr'; 
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'hienChuDauCotBaoCao',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();
                
                // Vẽ Legend Chú thích tùy biến (Thu nhập - Chi tiêu - Tích lũy)
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 11px sans-serif';
                
                const txtThu = 'Thu nhập';
                const txtChi = 'Chi tiêu';
                const txtTl = 'Tích lũy';
                
                const wThu = ctx.measureText(txtThu).width;
                const wChi = ctx.measureText(txtChi).width;
                const wTl = ctx.measureText(txtTl).width;
                
                const boxSize = 10;        
                const boxGap = 5;          
                const khoangCachCum = 20;  
                
                const tongChieuRong = (boxSize + boxGap) * 3 + wThu + wChi + wTl + (khoangCachCum * 2);
                let toaDoXChay = (chart.width - tongChieuRong) / 2; 
                const toaDoYChuan = 12; 
                
                ctx.textAlign = 'left';
                
                // Cụm Thu nhập
                ctx.fillStyle = '#3498db'; 
                ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize);
                toaDoXChay += boxSize + boxGap;
                ctx.fillStyle = '#333333'; 
                ctx.fillText(txtThu, toaDoXChay, toaDoYChuan);
                toaDoXChay += wThu + khoangCachCum;
                
                // Cụm Chi tiêu
                ctx.fillStyle = '#e74c3c'; 
                ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize);
                toaDoXChay += boxSize + boxGap;
                ctx.fillStyle = '#333333';
                ctx.fillText(txtChi, toaDoXChay, toaDoYChuan);
                toaDoXChay += wChi + khoangCachCum;
                
                // Cụm Tích lũy
                ctx.fillStyle = '#f1c40f'; 
                ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize);
                toaDoXChay += boxSize + boxGap;
                ctx.fillStyle = '#333333';
                ctx.fillText(txtTl, toaDoXChay, toaDoYChuan);

                // Vẽ các khối số 3 tầng trên đầu cột
                ctx.textAlign = 'center';
                ctx.font = 'bold 9px sans-serif';
                
                const meta = chart.getDatasetMeta(2);
                
                for (let i = 0; i < 12; i++) {
                    const thu = mangThuNhapThucTe[i];
                    const chi = mangChiTieuThucTe[i];
                    const tl = mangTichLuy[i];
                    
                    if (thu === 0 && chi === 0) continue;
                    
                    const bar = meta.data[i];
                    if (!bar) continue;
                    
                    const xPos = bar.x;
                    let yPos = bar.y - 6; 
                    
                    const chuoiThu = (thu / 1000000).toFixed(1).replace('.', ',');
                    const chuoiChi = (chi / 1000000).toFixed(1).replace('.', ',');
                    const chuoiTl = (Math.abs(tl) / 1000000).toFixed(1).replace('.', ',');
                    const dauTl = tl >= 0 ? '' : '-';
                    
                    // Dòng 3: Tích lũy (Vàng) - sử dụng tông màu đậm sậm tí cho rõ chữ trên nền trắng
                    ctx.fillStyle = '#d4ac0d';
                    ctx.fillText(dauTl + chuoiTl, xPos, yPos);
                    
                    // Dòng 2: Chi tiêu (Đỏ)
                    ctx.fillStyle = '#c0392b';
                    ctx.fillText(chuoiChi, xPos, yPos - 11);
                    
                    // Dòng 1: Thu nhập (Xanh)
                    ctx.fillStyle = '#3498db';
                    ctx.fillText(chuoiThu, xPos, yPos - 22);
                }
                ctx.restore();
            }
        }]
    });
}
    // SỬA LỖI KẸT MÀN HÌNH - TỰ ĐỘNG HẠ KHUNG HÌNH VỀ VỊ TRÍ CŨ KHI ẨN BÀN PHÍM
    document.querySelectorAll('input, select, textarea').forEach(element => {
        element.addEventListener('blur', () => {
            setTimeout(() => {
                // Ép iOS vẽ lại toàn bộ body bằng cách thay đổi tạm thời overflow
                document.body.style.overflow = 'hidden';
                
                // Cuộn về 0 để reset
                window.scrollTo(0, 0);
                
                // Trả lại trạng thái cũ ngay lập tức
                setTimeout(() => {
                    document.body.style.overflow = '';
                }, 50);
            }, 150); // Đợi bàn phím đóng xong mới chạy
        });
    });
