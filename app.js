// app.js - Logic xử lý địa chỉ THÔNG MINH
class AddressConverter {
    constructor() {
        this.provinces = [];
        this.districts = [];
        this.wards = [];
        this.dataLoaded = false;
        this.currentResults = [];
        
        // Từ khóa nhận diện
        this.keywords = {
            province: ['tỉnh', 'tp', 'thành phố', 't.'],
            district: ['huyện', 'quận', 'tx', 'thị xã', 'q.'],
            ward: ['xã', 'phường', 'p.', 'tt', 'thị trấn'],
            hamlet: ['ấp', 'thôn', 'bản', 'làng', 'tổ', 'khóm', 'khu phố']
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Tải dữ liệu song song
            await Promise.all([
                this.loadData('provinces'),
                this.loadData('districts'),
                this.loadData('wards')
            ]);
            
            this.dataLoaded = true;
            this.updateUI();
            console.log('✅ Dữ liệu đã tải xong:', {
                provinces: this.provinces.length,
                districts: this.districts.length,
                wards: this.wards.length
            });
            
        } catch (error) {
            console.error('❌ Lỗi tải dữ liệu:', error);
            this.showError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
        }
    }
    
    async loadData(type) {
        const response = await fetch(`data/${type}.json`);
        const data = await response.json();
        
        switch(type) {
            case 'provinces':
                this.provinces = data;
                $('#provinceCount').text(data.length);
                break;
            case 'districts':
                this.districts = data;
                $('#districtCount').text(data.length);
                break;
            case 'wards':
                this.wards = data;
                $('#wardCount').text(data.length);
                break;
        }
    }
    
    // Hàm CHUẨN HÓA văn bản (quan trọng)
    normalizeText(text) {
        if (!text) return '';
        
        return text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9\s]/g, ' ') // Giữ lại chữ, số, khoảng trắng
            .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
            .trim();
    }
    
    // Phân tích địa chỉ THÔNG MINH
    parseAddressSmart(addressText) {
        const original = addressText.trim();
        let normalized = this.normalizeText(original);
        
        // Chuẩn hóa từ viết tắt
        normalized = normalized
            .replace(/\btp\b/g, 'thanh pho')
            .replace(/\bt\b/g, 'tinh')
            .replace(/\bq\b/g, 'quan')
            .replace(/\bp\b/g, 'phuong')
            .replace(/\btx\b/g, 'thi xa')
            .replace(/\btt\b/g, 'thi tran');
        
        // Tách thành các phần bằng dấu phẩy
        const parts = normalized.split(',').map(p => p.trim()).filter(p => p);
        
        let province = '', district = '', ward = '', hamlet = '', street = '';
        
        // Phân tích từng phần
        for (let part of parts) {
            const words = part.split(' ');
            
            // Kiểm tra từ khóa để xác định loại địa chỉ
            for (let word of words) {
                // Tìm tỉnh/thành phố
                if (this.keywords.province.some(kw => part.includes(kw))) {
                    province = part.replace(/\b(tinh|thanh pho|tp)\b/g, '').trim();
                    continue;
                }
                
                // Tìm quận/huyện
                if (this.keywords.district.some(kw => part.includes(kw))) {
                    district = part.replace(/\b(huyen|quan|thi xa|tx)\b/g, '').trim();
                    continue;
                }
                
                // Tìm phường/xã
                if (this.keywords.ward.some(kw => part.includes(kw))) {
                    ward = part.replace(/\b(xa|phuong|thi tran|tt)\b/g, '').trim();
                    continue;
                }
                
                // Tìm ấp/thôn
                if (this.keywords.hamlet.some(kw => part.includes(kw))) {
                    hamlet = part.replace(/\b(ap|thon|ban|lang)\b/g, '').trim();
                    continue;
                }
            }
            
            // Nếu phần này không có từ khóa, có thể là số nhà/đường
            if (!province && !district && !ward && !hamlet && part.match(/^[0-9]/)) {
                street = part;
            }
        }
        
        // Nếu không tìm thấy bằng dấu phẩy, thử tách bằng từ khóa trực tiếp
        if (!province || !district || !ward) {
            const patterns = [
                // Mẫu: "Số 34 ấp Bình Long xã Thanh Bình huyện Chợ Gạo tỉnh Tiền Giang"
                /(.*?)\s+(ap|thon|ban)\s+(.*?)\s+(xa|phuong)\s+(.*?)\s+(huyen|quan)\s+(.*?)\s+(tinh|thanh pho)\s+(.*)/i,
                
                // Mẫu: "xã Thanh Bình huyện Chợ Gạo tỉnh Tiền Giang"
                /(xa|phuong)\s+(.*?)\s+(huyen|quan)\s+(.*?)\s+(tinh|thanh pho)\s+(.*)/i,
                
                // Mẫu: "huyện Chợ Gạo tỉnh Tiền Giang"
                /(huyen|quan)\s+(.*?)\s+(tinh|thanh pho)\s+(.*)/i,
                
                // Mẫu: "phường Trúc Bạch quận Ba Đình Hà Nội"
                /(phuong|xa)\s+(.*?)\s+(quan|huyen)\s+(.*?)\s+(.*)/i
            ];
            
            for (const pattern of patterns) {
                const match = normalized.match(pattern);
                if (match) {
                    if (!ward && match[1] && (match[1].includes('xa') || match[1].includes('phuong'))) {
                        ward = match[2];
                    }
                    if (!district && match[3] && (match[3].includes('huyen') || match[3].includes('quan'))) {
                        district = match[4];
                    }
                    if (!province && (match[5] || match[6])) {
                        province = match[5] || match[6];
                    }
                    break;
                }
            }
        }
        
        return {
            original: original,
            province: province,
            district: district,
            ward: ward,
            hamlet: hamlet,
            street: street,
            normalized: normalized
        };
    }
    
    // Tìm địa chỉ trong cơ sở dữ liệu
    async findAddressInDatabase(parsedAddress) {
        if (!this.dataLoaded) {
            return { status: 'error', message: 'Dữ liệu chưa sẵn sàng' };
        }
        
        let foundProvince = null;
        let foundDistrict = null;
        let foundWard = null;
        
        // 1. Tìm tỉnh
        for (const province of this.provinces) {
            const normProvinceName = this.normalizeText(province.name);
            const normProvinceCode = province.code;
            
            if (normProvinceName.includes(parsedAddress.province) || 
                parsedAddress.province.includes(normProvinceName) ||
                parsedAddress.normalized.includes(normProvinceName)) {
                foundProvince = province;
                break;
            }
        }
        
        if (!foundProvince) {
            return { 
                status: 'error', 
                message: 'Không tìm thấy tỉnh/thành phố',
                details: `Tỉnh: "${parsedAddress.province}"`
            };
        }
        
        // 2. Tìm huyện (nếu có)
        if (parsedAddress.district) {
            const provinceDistricts = this.districts.filter(d => 
                d.parent_code === foundProvince.code
            );
            
            for (const district of provinceDistricts) {
                const normDistrictName = this.normalizeText(district.name);
                
                if (normDistrictName.includes(parsedAddress.district) || 
                    parsedAddress.district.includes(normDistrictName)) {
                    foundDistrict = district;
                    break;
                }
            }
        }
        
        // 3. Tìm xã
        const provinceWards = this.wards.filter(w => 
            w.parent_code === foundProvince.code
        );
        
        // Ưu tiên tìm theo tên xã
        for (const ward of provinceWards) {
            const normWardName = this.normalizeText(ward.name);
            
            if ((parsedAddress.ward && normWardName.includes(parsedAddress.ward)) ||
                normWardName.includes(parsedAddress.ward) ||
                parsedAddress.normalized.includes(normWardName)) {
                foundWard = ward;
                break;
            }
        }
        
        // Nếu không tìm thấy xã, thử tìm bằng tên huyện
        if (!foundWard && foundDistrict) {
            const districtWards = provinceWards.filter(w => 
                w.parent_code === foundDistrict.code
            );
            
            if (districtWards.length > 0) {
                foundWard = districtWards[0];
            }
        }
        
        const result = {
            status: foundWard ? 'success' : (foundProvince ? 'warning' : 'error'),
            province: foundProvince,
            district: foundDistrict,
            ward: foundWard,
            original: parsedAddress.original
        };
        
        if (!foundWard && foundProvince) {
            result.message = 'Tìm thấy tỉnh nhưng không xác định được xã/phường';
        }
        
        return result;
    }
    
    // Xử lý hàng loạt
    async processBatch(addresses) {
        const results = [];
        const total = addresses.length;
        
        $('#progressContainer').show();
        $('#progressBar').css('width', '0%');
        $('#progressPercent').text('0%');
        
        for (let i = 0; i < total; i++) {
            const address = addresses[i];
            
            // Cập nhật tiến trình
            const percent = Math.round(((i + 1) / total) * 100);
            $('#progressBar').css('width', percent + '%');
            $('#progressPercent').text(percent + '%');
            $('#progressText').text(`Đang xử lý: ${i + 1}/${total}`);
            
            // Phân tích địa chỉ
            const parsed = this.parseAddressSmart(address);
            const result = await this.findAddressInDatabase(parsed);
            
            results.push({
                index: i + 1,
                original: address,
                parsed: parsed,
                result: result,
                display: {
                    province: result.province ? result.province.name : '',
                    district: result.district ? result.district.name : '',
                    ward: result.ward ? result.ward.name : '',
                    status: result.status,
                    message: result.message || ''
                }
            });
            
            // Nghỉ một chút để UI cập nhật
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        $('#progressContainer').hide();
        return results;
    }
    
    // Hiển thị kết quả
    displayResults(results) {
        this.currentResults = results;
        const tableBody = $('#resultBody');
        tableBody.empty();
        
        let successCount = 0, warningCount = 0, errorCount = 0;
        
        results.forEach(item => {
            // Đếm số lượng
            if (item.result.status === 'success') successCount++;
            else if (item.result.status === 'warning') warningCount++;
            else errorCount++;
            
            // Xác định class và icon
            let statusClass, statusIcon, statusText;
            
            switch(item.result.status) {
                case 'success':
                    statusClass = 'badge-success';
                    statusIcon = '<i class="fas fa-check-circle"></i>';
                    statusText = 'Thành công';
                    break;
                case 'warning':
                    statusClass = 'badge-warning';
                    statusIcon = '<i class="fas fa-exclamation-triangle"></i>';
                    statusText = 'Cảnh báo';
                    break;
                default:
                    statusClass = 'badge-danger';
                    statusIcon = '<i class="fas fa-times-circle"></i>';
                    statusText = 'Lỗi';
            }
            
            const row = `
                <tr>
                    <td class="fw-bold">${item.index}</td>
                    <td><small>${this.escapeHtml(item.original)}</small></td>
                    <td>${item.display.province || '<span class="text-muted">-</span>'}</td>
                    <td>${item.display.district || '<span class="text-muted">-</span>'}</td>
                    <td>${item.display.ward || '<span class="text-muted">-</span>'}</td>
                    <td>
                        <span class="badge ${statusClass}">
                            ${statusIcon} ${statusText}
                        </span>
                    </td>
                </tr>
            `;
            
            tableBody.append(row);
        });
        
        // Cập nhật thống kê
        const total = results.length;
        const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
        
        $('#resultTitle').html(`ĐÃ XỬ LÝ ${total} ĐỊA CHỈ`);
        $('#resultText').html(`
            <span class="text-success">${successCount} thành công</span> • 
            <span class="text-warning">${warningCount} cảnh báo</span> • 
            <span class="text-danger">${errorCount} lỗi</span>
            <span class="float-end fw-bold">Tỷ lệ thành công: ${successRate}%</span>
        `);
        
        $('#resultStats').show();
        
        // Hiển thị bảng với DataTables
        if ($.fn.DataTable.isDataTable('#resultTable')) {
            $('#resultTable').DataTable().destroy();
        }
        
        $('#resultTable').DataTable({
            pageLength: 10,
            lengthMenu: [10, 25, 50, 100],
            order: [[0, 'asc']],
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/vi.json'
            }
        }).show();
        
        $('#exportSection').show();
        
        // Cuộn đến kết quả
        $('html, body').animate({
            scrollTop: $('#exportSection').offset().top - 100
        }, 500);
    }
    
    // Các hàm tiện ích
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateUI() {
        $('#dataStatus').html(`
            <div class="card-body text-center">
                <div class="text-success mb-3">
                    <i class="fas fa-check-circle fa-4x"></i>
                </div>
                <h4 class="text-gradient">DỮ LIỆU ĐÃ SẴN SÀNG!</h4>
                <p class="mb-0">
                    <span class="fw-bold">${this.provinces.length}</span> tỉnh • 
                    <span class="fw-bold">${this.districts.length}</span> huyện • 
                    <span class="fw-bold">${this.wards.length}</span> xã
                </p>
            </div>
        `);
        
        $('#btnConvert').prop('disabled', false);
        $('#versionInfo').text(`v2.0 • ${this.provinces.length} tỉnh`);
    }
    
    showError(message) {
        $('#dataStatus').html(`
            <div class="card-body text-center text-danger">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <h5>LỖI TẢI DỮ LIỆU</h5>
                <p class="mb-0">${message}</p>
            </div>
        `);
    }
}

// Khởi tạo ứng dụng
let addressConverter;

$(document).ready(function() {
    // Khởi tạo converter
    addressConverter = new AddressConverter();
    
    // Đếm số dòng nhập liệu
    $('#inputAddresses').on('input', function() {
        const lines = $(this).val().trim().split('\n').filter(line => line.trim() !== '');
        $('#lineCount').text(lines.length);
    });
    
    // Nút chuyển đổi
    $('#btnConvert').click(async function() {
        const inputText = $('#inputAddresses').val().trim();
        if (!inputText) {
            alert('Vui lòng nhập danh sách địa chỉ cần chuyển đổi.');
            return;
        }
        
        const addresses = inputText.split('\n').filter(line => line.trim() !== '');
        const results = await addressConverter.processBatch(addresses);
        addressConverter.displayResults(results);
    });
    
    // Nút xóa tất cả
    $('#btnReset').click(function() {
        if (confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu?')) {
            $('#inputAddresses').val('');
            $('#lineCount').text('0');
            $('#resultStats').hide();
            $('#resultTable').hide();
            $('#exportSection').hide();
            $('#progressContainer').hide();
        }
    });
    
    // Nút dùng ví dụ
    $('#btnExample').click(function() {
        const examples = [
            "Số 34 ấp Bình Long, xã Thanh Bình, huyện Chợ Gạo, tỉnh Tiền Giang",
            "Thôn 5, xã Ea Khal, huyện Ea H'Leo, tỉnh Đắk Lắk",
            "Phường Trúc Bạch, quận Ba Đình, thành phố Hà Nội",
            "Ấp Mỹ Hòa, xã Mỹ Phước, huyện Tân Phước, tỉnh Tiền Giang",
            "Số 123 đường Lê Lợi, phường Bến Nghé, quận 1, TP. Hồ Chí Minh"
        ].join('\n');
        
        $('#inputAddresses').val(examples);
        $('#lineCount').text('5');
    });
    
    // Xuất CSV
    $('#btnExportCSV').click(function() {
        if (addressConverter.currentResults.length === 0) return;
        
        const headers = ['STT', 'Địa chỉ gốc', 'Tỉnh/Thành', 'Quận/Huyện', 'Xã/Phường', 'Trạng thái'];
        const rows = addressConverter.currentResults.map(item => [
            item.index,
            item.original,
            item.display.province,
            item.display.district,
            item.display.ward,
            item.display.status === 'success' ? 'Thành công' : 
            item.display.status === 'warning' ? 'Cảnh báo' : 'Lỗi'
        ]);
        
        const csv = Papa.unparse({
            fields: headers,
            data: rows
        });
        
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `diachi_ketqua_${new Date().getTime()}.csv`;
        link.click();
    });
    
    // Xuất Excel
    $('#btnExportExcel').click(function() {
        if (addressConverter.currentResults.length === 0) return;
        
        const wsData = [
            ['KẾT QUẢ CHUYỂN ĐỔI ĐỊA CHỈ'],
            ['Thời gian:', new Date().toLocaleString('vi-VN')],
            [''],
            headers = ['STT', 'Địa chỉ gốc', 'Tỉnh/Thành', 'Quận/Huyện', 'Xã/Phường', 'Trạng thái']
        ];
        
        addressConverter.currentResults.forEach(item => {
            wsData.push([
                item.index,
                item.original,
                item.display.province,
                item.display.district,
                item.display.ward,
                item.display.status === 'success' ? 'Thành công' : 
                item.display.status === 'warning' ? 'Cảnh báo' : 'Lỗi'
            ]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Kết quả');
        XLSX.writeFile(wb, `diachi_ketqua_${new Date().getTime()}.xlsx`);
    });
    
    // Sao chép bảng
    $('#btnCopyTable').click(function() {
        const table = $('#resultTable').clone();
        const html = table.prop('outerHTML');
        
        navigator.clipboard.writeText(html).then(() => {
            alert('Đã sao chép bảng vào clipboard!');
        });
    });
    
    // In ấn
    $('#btnPrint').click(function() {
        window.print();
    });
    
    // Phím tắt
    $(document).keydown(function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            $('#btnConvert').click();
        }
        if (e.key === 'Escape') {
            $('#btnReset').click();
        }
    });
});
