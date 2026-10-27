import { db, auth, layRangeChuKy, parseChuoiThoiGian } from './auth-config.js';
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { capNhatToanBoGiaoDien } from './transaction.js';

let huyTheoDoiThuChi = null;
let huyTheoDoiCauHinh = null;
let checkKhoiTaoLanDau = true;
let bieuDoInstance = null; 
let bieuDoBaoCaoInstance = null; 

// Lắng nghe trạng thái đăng nhập hệ thống
onAuthStateChanged(auth, async (user) => {
    const manHinhAuth = document.getElementById('man-hinh-auth');
    const khungAppChinh = document.getElementById('khung-chua-app-chinh');

    if (user) {
        if (manHinhAuth) manHinhAuth.style.display = 'none';
        if (khungAppChinh) khungAppChinh.style.display = 'block';
        window.scrollTo(0, 0);
        
        const txtTenUser = document.getElementById('ten-user-hien-thi');
        const txtEmailUser = document.getElementById('email-user-hien-thi');
        if (txtTenUser) txtTenUser.innerText = user.displayName || user.email.split('@')[0];
        if (txtEmailUser) txtEmailUser.innerText = user.email;
        
        tichHopNutDangXuat(); 
        
        const docRefCauHinh = doc(db, "cau_hinh_user", user.uid);
        huyTheoDoiCauHinh = onSnapshot(docRefCauHinh, (docSnap) => {
            if (docSnap.exists()) {
                const dataCH = docSnap.data();
                window.ngayChotChuKy = dataCH.ngayChot || 25;
                window.boSuoTapHanMuc = dataCH.hanMucThang || {};
                
                const selectNgay = document.getElementById('select-ngay-chu-ky');
                if (selectNgay) selectNgay.value = window.ngayChotChuKy;
            }
            
            if (checkKhoiTaoLanDau) {
                const homNay = new Date();
                if (homNay.getDate() > window.ngayChotChuKy) {
                    window.thoiGianDangXem.setMonth(homNay.getMonth() + 1);
                }
                window.capNhatChuHienThiThang(); 
                checkKhoiTaoLanDau = false; 
            }

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
        if (manHinhAuth) manHinhAuth.style.display = 'flex';
        if (khungAppChinh) khungAppChinh.style.display = 'none';
        if (huyTheoDoiThuChi) { huyTheoDoiThuChi(); huyTheoDoiThuChi = null; } 
        if (huyTheoDoiCauHinh) { huyTheoDoiCauHinh(); huyTheoDoiCauHinh = null; } 
    } 
});

function kichHoatHeThongDuLieuRealtime(user) {
    const truyVanDocLapUser = query(datathuchi, where("userId", "==", user.uid)); 
    huyTheoDoiThuChi = onSnapshot(truyVanDocLapUser, (snapshot) => {
        capNhatToanBoGiaoDien(snapshot.docs);
        capNhatThanhHanMuc(snapshot.docs);
    });
}

// Lưu ngày chốt chu kỳ
const selectNgayChuKy = document.getElementById('select-ngay-chu-ky');
const nutLuuChuKy = document.getElementById('nut-luu-chu-ky');
if (nutLuuChuKy && selectNgayChuKy) {
    nutLuuChuKy.addEventListener('click', async () => {
        if (!auth.currentUser) { alert("Phiên đăng nhập đã hết hạn!"); return; }
        const ngayChon = parseInt(selectNgayChuKy.value);
        try {
            await setDoc(doc(db, "cau_hinh_user", auth.currentUser.uid), { ngayChot: ngayChon }, { merge: true });
            alert("Đã cập nhật ngày kết thúc chu kỳ thành công!");
        } catch (error) {
            alert("Không thể lưu cấu hình: " + error.message);
        }
    });
    
    selectNgayChuKy.addEventListener('change', (e) => {
        window.ngayChotChuKy = parseInt(e.target.value) || 25;
        if (window.duLieuSnapshotQuocTe) {
            capNhatThanhHanMuc(window.duLieuSnapshotQuocTe);
        } 
    }); 
}

// Xử lý nút Đăng Nhập / Đăng Ký & Quên mật khẩu
const isLoginMode = true; 
const authTieuDe = document.getElementById('auth-tieu-de');
const authGhiChu = document.getElementById('auth-ghi-chu');
const inputAuthUsername = document.getElementById('auth-username');
const inputAuthPassword = document.getElementById('auth-password');
const vungNhapLaiMatKhau = document.getElementById('vung-nhap-lai-mat-khau');
const inputAuthRePassword = document.getElementById('auth-re-password');
const nutHanhDongAuth = document.getElementById('nut-hanh-dong-auth');
const linkQuenMk = document.getElementById('link-quen-mk');
const linkChuyenTrang = document.getElementById('link-chuyen-trang');

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

if (nutHanhDongAuth) {
    nutHanhDongAuth.addEventListener('click', async () => {
        let userInput = inputAuthUsername.value.trim().toLowerCase().replace(/\s+/g, '');
        const password = inputAuthPassword.value;
        if (!userInput || !password) {
            alert("Vui lòng điền đầy đủ User và Mật khẩu!");
            return;
        }
        const emailDinhDanh = `${userInput}@quanlychitieu.phumai.vn`;
        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, emailDinhDanh, password);
            } else {
                const rePassword = inputAuthRePassword.value;
                if (password !== rePassword) { alert("Mật khẩu nhập lại không trùng khớp!"); return; }
                if (password.length < 6) { alert("Mật khẩu bảo mật phải từ 6 ký tự trở lên!"); return; }
                const userCredential = await createUserWithEmailAndPassword(auth, emailDinhDanh, password);
                await updateProfile(userCredential.user, { displayName: userInput });
                alert("Đăng ký tài khoản thành công!");
            }
        } catch (error) {
            alert("Thao tác thất bại: " + error.message);
        }
    });
}

if (linkQuenMk) {
    linkQuenMk.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = inputAuthUsername.value.trim();
        if (!email || !email.includes('@')) { alert("Vui lòng nhập chính xác Email của bạn!"); return; }
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
            if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) { signOut(auth); }
        });
        nutDangXuat.dataset.hasListener = "true";
    }
}

// Nút làm mới app
const idNutLamMoi = document.getElementById('NUT-LAM-MOI-APP');
if (idNutLamMoi) {
    idNutLamMoi.addEventListener('click', () => {
        const iconSvg = idNutLamMoi.querySelector('svg'); 
        if (iconSvg) { iconSvg.style.transform = 'rotate(360deg)'; iconSvg.style.transition = 'transform 0.4s ease'; }
        setTimeout(() => { window.location.reload(); }, 350);
    });
}

// Chuyển tab
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

// Quản lý hạn mức
const txtChu = document.getElementById('chi-tieu-tren-han-muc');
const thanhPhanTram = document.getElementById('thanh-phat-trien-han-muc');
const txtGoiY = document.getElementById('goi-y-han-muc');

document.getElementById('vung-han-muc-chi-tieu')?.addEventListener('click', async () => {
    if (!auth.currentUser) { alert("Phiên đăng nhập đã hết hạn!"); return; }
    let thangDangXem = window.layChuoiThangNam(window.thoiGianDangXem); 
    let hanMucThangDangXem = window.boSuoTapHanMuc[thangDangXem] || 0; 
    const [nam, thg] = thangDangXem.split('-'); 
    let loiNhac = hanMucThangDangXem > 0 ? `Hạn mức tháng ${thg}/${nam} hiện tại là ${hanMucThangDangXem.toLocaleString('vi-VN')} đ.\nNhập hạn mức mới (đ):` : `Nhập hạn mức chi tiêu cho tháng ${thg}/${nam} (đ):`;        
    let nhapVao = prompt(loiNhac, hanMucThangDangXem > 0 ? hanMucThangDangXem : "");    
    if (nhapVao !== null) {
        let soTienMoi = parseFloat(nhapVao.toString().replace(/[^0-9]/g, '')); 
        if (!isNaN(soTienMoi) && soTienMoi > 0) { window.boSuoTapHanMuc[thangDangXem] = soTienMoi; } 
        else { delete window.boSuoTapHanMuc[thangDangXem]; }
        try {
            await setDoc(doc(db, "cau_hinh_user", auth.currentUser.uid), { hanMucThang: window.boSuoTapHanMuc }, { merge: true });
            if (window.duLieuSnapshotQuocTe) { capNhatThanhHanMuc(window.duLieuSnapshotQuocTe); }
        } catch (error) { alert("Lỗi lưu hạn mức: " + error.message); }
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
    const fMat = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const txtGhiChu = document.getElementById('ghi-chu-pham-vi-chu-ky');
    if (txtGhiChu) {txtGhiChu.innerText = `*Chu kỳ: Từ ngày ${fMat(chuKyMoc.tuNgay)} đến ngày ${fMat(chuKyMoc.denNgay)}.*`;}
    docs.forEach(docItem => {
        const data = docItem.data(); 
        const thoiGianMoc = parseChuoiThoiGian(data.thoiGian);
        if (thoiGianMoc >= chuKyMoc.tuNgay && thoiGianMoc <= chuKyMoc.denNgay && data.loai === 'chi') {tongDaChi += parseFloat(data.soTien) || 0;}
    }); 
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
    } else {
        thanhPhanTram.style.backgroundColor = '#2ecc71'; 
    }
    capNhatBieuDoBaoCaoNam(docs); 
    capNhatBieuDoTabBaoCaoTaiChinh(docs); 
}
window.capNhatChuHienThiThang();

// BIỂU ĐỒ 12 THÁNG & BÁO CÁO
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
            mangMax[m] = hanMuc; mangMin[m] = daChi;
            mangMauMax[m] = '#3498db'; mangMauMin[m] = '#e74c3c'; 
        } else {
            mangMax[m] = daChi; mangMin[m] = hanMuc;
            mangMauMax[m] = '#e74c3c'; mangMauMin[m] = '#3498db'; 
        }
    }

    if (bieuDoInstance) { bieuDoInstance.destroy(); }

    bieuDoInstance = new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
            datasets: [
                { type: 'line', label: 'Còn lại', data: mangConLai, borderColor: '#f1c40f', backgroundColor: '#f1c40f', borderWidth: 1, tension: 0.2, pointRadius: 0, pointHoverRadius: 0, fill: false, grouped: false, order: 1 },
                { label: 'Thanh Trước', data: mangMin, backgroundColor: mangMauMin, barPercentage: 0.55, categoryPercentage: 0.8, borderRadius: 4, grouped: false, order: 2 },
                { label: 'Thanh Sau', data: mangMax, backgroundColor: mangMauMax, barPercentage: 0.85, categoryPercentage: 0.8, borderRadius: 4, grouped: false, order: 3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 35 } },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { stacked: false, ticks: { maxRotation: 0, minRotation: 0, autoSkip: false } },
                y: { beginAtZero: true, grace: '20%', ticks: { callback: function(value) { return (value / 1000000).toFixed(0) + 'tr'; } } }
            }
        },
        plugins: [{
            id: 'hienChuDauCot',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();
                ctx.textBaseline = 'middle'; ctx.font = 'bold 11px sans-serif';
                const txtNS = 'Ngân sách', txtChi = 'Chi tiêu', txtCon = 'Còn lại';
                const wNS = ctx.measureText(txtNS).width, wChi = ctx.measureText(txtChi).width, wCon = ctx.measureText(txtCon).width;
                const boxSize = 10, boxGap = 5, khoangCachCum = 20; 
                const tongChieuRong = (boxSize + boxGap) * 3 + wNS + wChi + wCon + (khoangCachCum * 2);
                let toaDoXChay = (chart.width - tongChieuRong) / 2; 
                const toaDoYChuan = 12; 
                ctx.textAlign = 'left';
                
                ctx.fillStyle = '#3498db'; ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize); toaDoXChay += boxSize + boxGap; ctx.fillStyle = '#333333'; ctx.fillText(txtNS, toaDoXChay, toaDoYChuan); toaDoXChay += wNS + khoangCachCum;
                ctx.fillStyle = '#e74c3c'; ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize); toaDoXChay += boxSize + boxGap; ctx.fillStyle = '#333333'; ctx.fillText(txtChi, toaDoXChay, toaDoYChuan); toaDoXChay += wChi + khoangCachCum;
                ctx.fillStyle = '#f1c40f'; ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize); toaDoXChay += boxSize + boxGap; ctx.fillStyle = '#333333'; ctx.fillText(txtCon, toaDoXChay, toaDoYChuan);

                ctx.textAlign = 'center'; ctx.font = 'bold 9px sans-serif';
                const meta = chart.getDatasetMeta(2);
                for (let i = 0; i < 12; i++) {
                    const ns = window.boSuoTapHanMuc[`${namDangXem}-${String(i + 1).padStart(2, '0')}`] || 0;
                    const ct = mangDaChiThucTe[i];
                    const cl = mangConLai[i];
                    if (ns === 0 && ct === 0) continue;
                    const bar = meta.data[i];
                    if (!bar) continue;
                    const xPos = bar.x; let yPos = bar.y - 6; 
                    const chuoiNs = (ns / 1000000).toFixed(1).replace('.', ',');
                    const chuoiCt = (ct / 1000000).toFixed(1).replace('.', ',');
                    const chuoiCl = (Math.abs(cl) / 1000000).toFixed(1).replace('.', ',');
                    const dauCl = cl >= 0 ? '' : '-';
                    
                    ctx.fillStyle = '#e67e22'; ctx.fillText(dauCl + chuoiCl, xPos, yPos);
                    ctx.fillStyle = '#c0392b'; ctx.fillText(chuoiCt, xPos, yPos - 11);
                    ctx.fillStyle = '#3498db'; ctx.fillText(chuoiNs, xPos, yPos - 22);
                }
                ctx.restore();
            }
        }]
    });
}

function capNhatBieuDoTabBaoCaoTaiChinh(docs) {
    const ctx = document.getElementById('bieuDoBaoCaoTaiChinh');
    if (!ctx) return;
    const namDangXem = window.thoiGianDangXem.getFullYear();
    const txtTieuDeBc = document.getElementById('tieu-de-bieu-do-bao-cao');
    if (txtTieuDeBc) txtTieuDeBc.innerText = `Biểu đồ Thu nhập, Chi tiêu & Tích lũy năm ${namDangXem}`;

    const mangThuNhapThucTe = Array(12).fill(0);
    const mangChiTieuThucTe = Array(12).fill(0);
    
    docs.forEach(docItem => {
        const data = docItem.data();
        if (data.thoiGian) {
            const thoiGianMoc = parseChuoiThoiGian(data.thoiGian);
            for (let m = 0; m < 12; m++) {
                const ngayDaiDienThang = new Date(namDangXem, m, 1);
                const chuKyMoc = layRangeChuKy(ngayDaiDienThang);
                if (thoiGianMoc >= chuKyMoc.tuNgay && thoiGianMoc <= chuKyMoc.denNgay) {
                    if (data.loai === 'thu') { mangThuNhapThucTe[m] += parseFloat(data.soTien) || 0; } 
                    else if (data.loai === 'chi') { mangChiTieuThucTe[m] += parseFloat(data.soTien) || 0; }
                    break; 
                }
            }
        }
    });

    const mangMax = Array(12).fill(0);      
    const mangMin = Array(12).fill(0);      
    const mangTichLuy = Array(12).fill(0); 
    const mangMauMax = Array(12).fill('');   
    const mangMauMin = Array(12).fill('');   

    for (let m = 0; m < 12; m++) {
        const thuNhap = mangThuNhapThucTe[m];
        const chiTieu = mangChiTieuThucTe[m];
        mangTichLuy[m] = thuNhap - chiTieu; 
        if (thuNhap >= chiTieu) {
            mangMax[m] = thuNhap; mangMin[m] = chiTieu;
            mangMauMax[m] = '#3498db'; mangMauMin[m] = '#e74c3c'; 
        } else {
            mangMax[m] = chiTieu; mangMin[m] = thuNhap;
            mangMauMax[m] = '#e74c3c'; mangMauMin[m] = '#3498db'; 
        }
    }

    if (bieuDoBaoCaoInstance) { bieuDoBaoCaoInstance.destroy(); }

    bieuDoBaoCaoInstance = new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
            datasets: [
                { type: 'line', label: 'Tích lũy', data: mangTichLuy, borderColor: '#f1c40f', backgroundColor: '#f1c40f', borderWidth: 1, tension: 0.2, pointRadius: 0, pointHoverRadius: 0, fill: false, grouped: false, order: 1 },
                { label: 'Thanh Trước', data: mangMin, backgroundColor: mangMauMin, barPercentage: 0.55, categoryPercentage: 0.8, borderRadius: 4, grouped: false, order: 2 },
                { label: 'Thanh Sau', data: mangMax, backgroundColor: mangMauMax, barPercentage: 0.85, categoryPercentage: 0.8, borderRadius: 4, grouped: false, order: 3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 35 } },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { stacked: false, ticks: { maxRotation: 0, minRotation: 0, autoSkip: false } },
                y: { beginAtZero: true, grace: '20%', ticks: { callback: function(value) { return (value / 1000000).toFixed(0) + 'tr'; } } }
            }
        },
        plugins: [{
            id: 'hienChuDauCotBaoCao',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();
                ctx.textBaseline = 'middle'; ctx.font = 'bold 11px sans-serif';
                const txtThu = 'Thu nhập', txtChi = 'Chi tiêu', txtTl = 'Tích lũy';
                const wThu = ctx.measureText(txtThu).width, wChi = ctx.measureText(txtChi).width, wTl = ctx.measureText(txtTl).width;
                const boxSize = 10, boxGap = 5, khoangCachCum = 20; 
                const tongChieuRong = (boxSize + boxGap) * 3 + wThu + wChi + wTl + (khoangCachCum * 2);
                let toaDoXChay = (chart.width - tongChieuRong) / 2; 
                const toaDoYChuan = 12; 
                ctx.textAlign = 'left';
                
                ctx.fillStyle = '#3498db'; ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize); toaDoXChay += boxSize + boxGap; ctx.fillStyle = '#333333'; ctx.fillText(txtThu, toaDoXChay, toaDoYChuan); toaDoXChay += wThu + khoangCachCum;
                ctx.fillStyle = '#e74c3c'; ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize); toaDoXChay += boxSize + boxGap; ctx.fillStyle = '#333333'; ctx.fillText(txtChi, toaDoXChay, toaDoYChuan); toaDoXChay += wChi + khoangCachCum;
                ctx.fillStyle = '#f1c40f'; ctx.fillRect(toaDoXChay, toaDoYChuan - boxSize / 2, boxSize, boxSize); toaDoXChay += boxSize + boxGap; ctx.fillStyle = '#333333'; ctx.fillText(txtTl, toaDoXChay, toaDoYChuan);

                ctx.textAlign = 'center'; ctx.font = 'bold 9px sans-serif';
                const meta = chart.getDatasetMeta(2);
                for (let i = 0; i < 12; i++) {
                    const thu = mangThuNhapThucTe[i], chi = mangChiTieuThucTe[i], tl = mangTichLuy[i];
                    if (thu === 0 && chi === 0) continue;
                    const bar = meta.data[i];
                    if (!bar) continue;
                    const xPos = bar.x; let yPos = bar.y - 6; 
                    const chuoiThu = (thu / 1000000).toFixed(1).replace('.', ',');
                    const chuoiChi = (chi / 1000000).toFixed(1).replace('.', ',');
                    const chuoiTl = (Math.abs(tl) / 1000000).toFixed(1).replace('.', ',');
                    const dauTl = tl >= 0 ? '' : '-';
                    
                    ctx.fillStyle = '#d4ac0d'; ctx.fillText(dauTl + chuoiTl, xPos, yPos);
                    ctx.fillStyle = '#c0392b'; ctx.fillText(chuoiChi, xPos, yPos - 11);
                    ctx.fillStyle = '#3498db'; ctx.fillText(chuoiThu, xPos, yPos - 22);
                }
                ctx.restore();
            }
        }]
    });
}

// Chống kẹt màn hình iOS
document.querySelectorAll('input, select, textarea').forEach(element => {
    element.addEventListener('blur', () => {
        setTimeout(() => {
            document.body.style.overflow = 'hidden';
            window.scrollTo(0, 0);
            setTimeout(() => { document.body.style.overflow = ''; }, 50);
        }, 150);
    });
});
