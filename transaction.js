import { db, auth, datathuchi, layRangeChuKy, parseChuoiThoiGian } from './auth-config.js';
import { doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const danhSachIcon = {"Ăn uống": "🍔", "Di chuyển": "🚗", "Trang phục": "🛍️", "Mỹ phẩm": "🛍️", "Hóa đơn": "💵", "Nhà cửa": "💵", "Giải trí": "🎬", "Thu nhập từ lương": "💰", "Thu nhập khác": "💸", "Khác": "✨"};

const idHienThiSoDu = document.getElementById('so-du');
const idVungLichSu = document.getElementById('lich-su-giao-dich');
const idBcThu = document.getElementById('bao-cao-thu');
const idBcChi = document.getElementById('bao-cao-chi');
const idThanhThu = document.getElementById('thanh-thu-ti-le');
const idThanhChi = document.getElementById('thanh-chi-ti-le');

export function capNhatToanBoGiaoDien(docs) {
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
    const inputNgay = document.getElementById('ngay-giao-dich'); 
    const inputGio = document.getElementById('gio-giao-dich'); 
    const idTen = document.getElementById('ten-khoan-thu-chi');
    const idSoTien = document.getElementById('so-tien');
    const idLoaiGiaoDich = document.getElementById('loai-dong-tien');
    const idDanhMuc = document.getElementById('phan-nhom-thu-chi');
    const idnutsave = document.getElementById('nut-save');

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
            const xuLyDiChuột = (ev) => dangKeo(ev);
            const xuLyThaChuột = () => { ketThucVuot(); window.removeEventListener('mousemove', xuLyDiChuột); window.removeEventListener('mouseup', xuLyThaChuột); };
            window.addEventListener('mousemove', xuLyDiChuột); window.addEventListener('mouseup', xuLyThaChuột);
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
            userId: auth.currentUser.uid,       
            tenUser: tenUserHienTai            
        };
        try {
            if (window.idGiaoDichDangSua) {
                // --- KHI SỬA GIAO DỊCH ---
                await updateDoc(doc(db, "giao_dich_business", window.idGiaoDichDangSua), duLieuGiaoDich);
                window.idGiaoDichDangSua = null; 
                idnutsave.innerText = "Cập nhật ví";
            } else {
                // --- KHI THÊM MỚI: TẠO CUSTOM ID SẠCH KÝ TỰ ĐẶC BIỆT ---
                const now = new Date();
                const namSys = now.getFullYear();
                const thangSys = String(now.getMonth() + 1).padStart(2, '0');
                const ngaySys = String(now.getDate()).padStart(2, '0');
                const gioSys = String(now.getHours()).padStart(2, '0');
                const phutSys = String(now.getMinutes()).padStart(2, '0');
                const giaySys = String(now.getSeconds()).padStart(2, '0');
                const chuoiHeThong = `${namSys}${thangSys}${ngaySys}_${gioSys}${phutSys}${giaySys}`;
                
                // Làm sạch các ký tự đặc biệt trong chuoiThoiGianGop để Firestore chấp nhận làm ID
                let thoiGianSach = chuoiThoiGianGop.replace(/[- :]/g, '');
                let customDocId = `${tenUserHienTai}-${loai}-${thoiGianSach}-${chuoiHeThong}`.toUpperCase();
                
                await setDoc(doc(db, "giao_dich_business", customDocId), duLieuGiaoDich);
            }

            // Reset lại form nhập liệu
            if (idTen) idTen.value = ''; 
            if (idSoTien) idSoTien.value = ''; 
            if (labelSoTien) labelSoTien.innerText = 'Số tiền (đ):'; 
            
            const bayGioSauLuu = new Date();
            if (inputNgay) inputNgay.value = `${bayGioSauLuu.getFullYear()}-${String(bayGioSauLuu.getMonth() + 1).padStart(2, '0')}-${String(bayGioSauLuu.getDate()).padStart(2, '0')}`;
            if (inputGio) inputGio.value = `${String(bayGioSauLuu.getHours()).padStart(2, '0')}:${String(bayGioSauLuu.getMinutes()).padStart(2, '0')}`;
            
            if (nutHome) nutHome.click();

        } catch (loi) { 
            console.error("Lỗi khi ghi dữ liệu:", loi);
            alert("Không thể ghi nhận giao dịch: " + loi.message); 
        } 
    });
}
