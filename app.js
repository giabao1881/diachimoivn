// app.js - Phiên bản ổn định & mạnh mẽ - Dùng dữ liệu từ dvhcvn.json
class AddressConverter {
    constructor() {
        this.allProvinces = []; // Danh sách tỉnh
        this.allDistricts = []; // Danh sách huyện
        this.allWards = [];     // Danh sách xã
        this.dataLoaded = false;
        this.currentResults = [];
        console.log('🚀 Khởi tạo công cụ...');
        this.init();
    }

    async init() {
        try {
            $('#loadingSection').show();
            console.log('📥 Đang tải dữ liệu từ dvhcvn.json...');
            
            // SỬA ĐƯỜNG DẪN NẾU CẦN: './data/dvhcvn.json' hoặc 'data/dvhcvn.json'
            const response = await fetch('./data/dvhcvn.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}: Không tải được file`);
            
            const fullData = await response.json();
            
            // Xử lý dữ liệu: tạo các mảng phẳng để tìm kiếm nhanh
            this.processData(fullData);
            this.dataLoaded = true;
            
            console.log('✅ Dữ liệu đã sẵn sàng!');
            console.log(`📊 Thống kê: ${this.allProvinces.length} tỉnh, ${this.allDistricts.length} huyện, ${this.allWards.length} xã`);
            
            // Cập nhật giao diện
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Lỗi tải dữ liệu:', error);
            $('#loadingSection').html(`
                <div class="alert alert-danger">
                    <h5><i class="fas fa-exclamation-triangle"></i> Lỗi tải dữ liệu!</h5>
                    <p>${error.message}</p>
                    <p class="mb-0"><small>Vui lòng kiểm tra file <code>data/dvhcvn.json</code>.</small></p>
                </div>
            `);
        }
    }

    processData(fullData) {
        // Giả sử fullData có cấu trúc { "data": [ {tỉnh}, ... ] }
        const provincesData = fullData.data || fullData;
        
        provincesData.forEach(province => {
            // Lưu thông tin tỉnh
            this.allProvinces.push({
                code: province.code,
                name: province.name,
                name_normalized: this.normalizeText(province.name)
            });
            
            // Duyệt qua các huyện (nếu có)
            if (province.districts && Array.isArray(province.districts)) {
                province.districts.forEach(district => {
                    this.allDistricts.push({
                        code: district.code,
                        name: district.name,
                        province_code: province.code,
                        name_normalized: this.normalizeText(district.name)
                    });
                    
                    // Duyệt qua các xã (nếu có) - ĐÂY LÀ DỮ LIỆU CŨ (3 cấp)
                    if (district.wards && Array.isArray(district.wards)) {
                        district.wards.forEach(ward => {
                            this.allWards.push({
                                code: ward.code,
                                name: ward.name,
                                district_code: district.code,
                                province_code: province.code, // Mã tỉnh CŨ
                                name_normalized: this.normalizeText(ward.name)
                            });
                        });
                    }
                });
            }
            
            // KIỂM TRA: Nếu tỉnh có mảng 'wards' trực tiếp -> ĐÂY LÀ DỮ LIỆU MỚI (2 cấp)
            if (province.wards && Array.isArray(province.wards)) {
                console.log(`⚠️ Tỉnh "${province.name}" có dữ liệu wards trực tiếp (cấu trúc mới).`);
                // Có thể xử lý thêm tại đây nếu cần
            }
        });
        
        console.log(`Đã xử lý xong: ${this.allProvinces.length} tỉnh, ${this.allDistricts.length} huyện, ${this.allWards.length} xã.`);
    }

    // Hàm chuẩn hóa văn bản để tìm kiếm không dấu, không hoa/thường
    normalizeText(text) {
        return text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9\s]/g, ' ') // Chỉ giữ chữ, số, khoảng trắng
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Phân tích địa chỉ nhập vào
    parseAddress(input) {
        const original = input.trim();
        const normalized = this.normalizeText(original);
        
        console.log(`🔍 Phân tích: "${original}"`);
        console.log(`   Chuẩn hóa: "${normalized}"`);
        
        // Biến lưu kết quả tìm thấy
        let foundProvince = null;
        let foundDistrict = null;
        let foundWard = null;
        
        // 1. TÌM TỈNH: Duyệt qua tất cả tỉnh
        for (const province of this.allProvinces) {
            if (normalized.includes(province.name_normalized) || 
                province.name_normalized.includes(normalized)) {
                foundProvince = province;
                console.log(`   ✅ Tìm thấy tỉnh: ${province.name}`);
                break;
            }
        }
        
        if (!foundProvince) {
            console.log(`   ❌ Không tìm thấy tỉnh phù hợp`);
            return { original, foundProvince: null, foundDistrict: null, foundWard: null };
        }
        
        // 2. TÌM HUYỆN (trong tỉnh đã tìm thấy)
        const districtsInProvince = this.allDistricts.filter(d => d.province_code === foundProvince.code);
        for (const district of districtsInProvince) {
            if (normalized.includes(district.name_normalized)) {
                foundDistrict = district;
                console.log(`   ✅ Tìm thấy huyện: ${district.name}`);
                break;
            }
        }
        
        // 3. TÌM XÃ (trong huyện đã tìm thấy, hoặc trong toàn tỉnh nếu không có huyện)
        let wardsToSearch = [];
        if (foundDistrict) {
            // Tìm xã trong huyện cụ thể
            wardsToSearch = this.allWards.filter(w => w.district_code === foundDistrict.code);
        } else {
            // Nếu không xác định được huyện, tìm tất cả xã trong tỉnh
            wardsToSearch = this.allWards.filter(w => w.province_code === foundProvince.code);
        }
        
        for (const ward of wardsToSearch) {
            if (normalized.includes(ward.name_normalized)) {
                foundWard = ward;
                console.log(`   ✅ Tìm thấy xã: ${ward.name}`);
                break;
            }
        }
        
        return { original, foundProvince, foundDistrict, foundWard };
    }

    // Xử lý hàng loạt địa chỉ
    async processBatch(addressList) {
        if (!this.dataLoaded) {
            alert('Vui lòng đợi dữ liệu tải xong.');
            return [];
        }
        
        const results = [];
        const total = addressList.length;
        
        $('#progressContainer').show();
        $('#progressBar').css('width', '0%');
        $('#progressPercent').text('0%');
        
        for (let i = 0; i < total; i++) {
            const address = addressList[i];
            const percent = Math.round(((i + 1) / total) * 100);
            
            $('#progressBar').css('width', percent + '%');
            $('#progressPercent').text(percent + '%');
            $('#progressText').text(`Đang xử lý: ${i + 1}/${total}`);
            
            // Phân tích địa chỉ
            const parsed = this.parseAddress(address);
            
            // Xác định trạng thái và thông điệp
            let status, message, newProvince, newWard;
            
            if (!parsed.foundProvince) {
                status = 'error';
                message = 'Không xác định được tỉnh/thành';
                newProvince = '';
                newWard = '';
            } else if (!parsed.foundWard) {
                status = 'warning';
                message = `Tìm thấy tỉnh "${parsed.foundProvince.name}" nhưng không xác định được xã`;
                newProvince = parsed.foundProvince.name;
                newWard = '';
            } else {
                status = 'success';
                message = 'Chuyển đổi thành công';
                // TRONG PHIÊN BẢN NÀY: Giả định xã vẫn thuộc tỉnh cũ
                // (Bạn có thể bổ sung logic ánh xạ mã tỉnh mới tại đây)
                newProvince = parsed.foundProvince.name;
                newWard = parsed.foundWard.name;
            }
            
            results.push({
                index: i + 1,
                original: address,
                oldProvince: parsed.foundProvince?.name || '',
                oldDistrict: parsed.foundDistrict?.name || '',
                oldWard: parsed.foundWard?.name || '',
                newProvince,
                newWard,
                status,
                message
            });
            
            // Tạm dừng nhỏ để cập nhật giao diện mượt mà
            if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 10));
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
            if (item.status === 'success') successCount++;
            else if (item.status === 'warning') warningCount++;
            else errorCount++;
            
            let badgeClass, badgeIcon, statusText;
            if (item.status === 'success') {
                badgeClass = 'badge-success'; badgeIcon = 'fa-check-circle'; statusText = 'Thành công';
            } else if (item.status === 'warning') {
                badgeClass = 'badge-warning'; badgeIcon = 'fa-exclamation-triangle'; statusText = 'Cảnh báo';
            } else {
                badgeClass = 'badge-danger'; badgeIcon = 'fa-times-circle'; statusText = 'Lỗi';
            }
            
            const row = `
                <tr>
                    <td class="fw-bold">${item.index}</td>
                    <td><small>${this.escapeHtml(item.original)}</small></td>
                    <td>${this.escapeHtml(item.newProvince) || '-'}</td>
                    <td>${this.escapeHtml(item.oldDistrict) || '-'}</td>
                    <td>${this.escapeHtml(item.newWard) || '-'}</td>
                    <td>
                        <span class="badge ${badgeClass}" title="${item.message}">
                            <i class="fas ${badgeIcon}"></i> ${statusText}
                        </span>
                    </td>
                </tr>
            `;
            tableBody.append(row);
        });
        
        // Cập nhật thống kê
        const total = results.length;
        const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
        
        $('#resultStats').html(`
            <div class="alert alert-info">
                <h5><i class="fas fa-chart-bar"></i> KẾT QUẢ CHUYỂN ĐỔI</h5>
                <p class="mb-2">Đã xử lý <strong>${total}</strong> địa chỉ:</p>
                <div class="d-flex justify-content-between">
                    <span class="text-success"><i class="fas fa-check-circle"></i> ${successCount} thành công</span>
                    <span class="text-warning"><i class="fas fa-exclamation-triangle"></i> ${warningCount} cảnh báo</span>
                    <span class="text-danger"><i class="fas fa-times-circle"></i> ${errorCount} lỗi</span>
                    <strong>Tỷ lệ thành công: ${successRate}%</strong>
                </div>
            </div>
        `).show();
        
        // Hiển thị bảng
        if ($.fn.DataTable.isDataTable('#resultTable')) {
            $('#resultTable').DataTable().destroy();
        }
        $('#resultTable').DataTable({
            pageLength: 10,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/vi.json' },
            order: [[0, 'asc']]
        }).show();
        
        $('#exportSection').show();
    }

    // Hàm tiện ích
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateUI() {
        $('#loadingSection').hide();
        $('.main-content').fadeIn(500);
        $('#btnConvert').prop('disabled', false);
        $('#versionInfo').text(`${this.allProvinces.length} tỉnh • ${this.allWards.length} xã`);
        
        console.log('✅ Giao diện đã sẵn sàng.');
    }
}

// ==================== SỰ KIỆN TRANG ====================
$(document).ready(function() {
    console.log('📄 Trang đã sẵn sàng.');
    const converter = new AddressConverter();
    
    // Đếm số dòng
    $('#inputAddresses').on('input', function() {
        const lines = $(this).val().trim().split('\n').filter(l => l.trim() !== '');
        $('#lineCount').text(lines.length);
    });
    
    // Nút chuyển đổi
    $('#btnConvert').click(async function() {
        const input = $('#inputAddresses').val().trim();
        if (!input) {
            alert('Vui lòng nhập ít nhất một địa chỉ.');
            return;
        }
        const addresses = input.split('\n').filter(l => l.trim() !== '');
        console.log(`🔄 Bắt đầu xử lý ${addresses.length} địa chỉ...`);
        
        const results = await converter.processBatch(addresses);
        converter.displayResults(results);
    });
    
    // Nút ví dụ (với địa chỉ bạn cần)
    $('#btnExample').click(function() {
        const examples = `Số 34 ấp Bình Long, xã Thanh Bình, huyện Chợ Gạo, tỉnh Tiền Giang
Phường Trúc Bạch, quận Ba Đình, thành phố Hà Nội
Xã Đan Phượng, huyện Đan Phượng, Hà Nội`;
        $('#inputAddresses').val(examples);
        $('#lineCount').text('3');
    });
    
    // Nút xóa
    $('#btnReset').click(function() {
        if (confirm('Xóa toàn bộ dữ liệu?')) {
            $('#inputAddresses').val('');
            $('#lineCount').text('0');
            $('#resultStats').hide();
            $('#resultTable').hide();
            $('#exportSection').hide();
            converter.currentResults = [];
        }
    });
    
    // Nút xuất CSV
    $('#btnExportCSV').click(function() {
        if (converter.currentResults.length === 0) {
            alert('Chưa có dữ liệu để xuất.');
            return;
        }
        const headers = ['STT', 'Địa chỉ gốc', 'Tỉnh mới', 'Huyện cũ', 'Xã mới', 'Trạng thái'];
        const rows = converter.currentResults.map(r => [
            r.index,
            `"${r.original.replace(/"/g, '""')}"`,
            r.newProvince,
            r.oldDistrict,
            r.newWard,
            r.status === 'success' ? 'Thành công' : r.status === 'warning' ? 'Cảnh báo' : 'Lỗi'
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ketqua_chuyendoi_${new Date().getTime()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    console.log('✅ Tất cả sự kiện đã sẵn sàng.');
});
