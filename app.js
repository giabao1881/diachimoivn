// app.js - Bộ xử lý địa chỉ thông minh - Phiên bản 3.0
class AddressConverter {
    constructor() {
        // Dữ liệu
        this.provinces = [];
        this.districts = [];
        this.wards = [];
        this.dataLoaded = false;
        this.currentResults = [];
        
        // Từ khóa nhận diện
        this.keywords = {
            province: ['tỉnh', 'tp', 'thành phố', 't.', 'thanh pho'],
            district: ['huyện', 'quận', 'tx', 'thị xã', 'q.', 'huyen', 'quan'],
            ward: ['xã', 'phường', 'p.', 'tt', 'thị trấn', 'xa', 'phuong', 'thi tran'],
            hamlet: ['ấp', 'thôn', 'bản', 'làng', 'tổ', 'khóm', 'khu phố', 'ap', 'thon']
        };
        
        // Bản đồ từ viết tắt
        this.abbreviations = {
            'tp': 'thanh pho',
            'tphcm': 'thanh pho ho chi minh',
            'hn': 'ha noi',
            'dn': 'da nang',
            'hcm': 'ho chi minh',
            'q.': 'quan',
            'p.': 'phuong',
            'tx.': 'thi xa',
            'tt.': 'thi tran',
            't.': 'tinh'
        };
        
        // Tên tỉnh thay thế
        this.provinceAliases = {
            'hà nội': 'thành phố hà nội',
            'tp hà nội': 'thành phố hà nội',
            'hà nôi': 'thành phố hà nội',
            'hồ chí minh': 'thành phố hồ chí minh',
            'tp hồ chí minh': 'thành phố hồ chí minh',
            'tphcm': 'thành phố hồ chí minh',
            'hcm': 'thành phố hồ chí minh',
            'đà nẵng': 'thành phố đà nẵng',
            'tp đà nẵng': 'thành phố đà nẵng',
            'cần thơ': 'thành phố cần thơ',
            'tp cần thơ': 'thành phố cần thơ',
            'hải phòng': 'thành phố hải phòng',
            'tp hải phòng': 'thành phố hải phòng'
        };
        
        console.log('🚀 AddressConverter đã khởi tạo');
        this.init();
    }
    
    // ==================== KHỞI TẠO ====================
    async init() {
        try {
            console.log('📥 Đang tải dữ liệu...');
            
            // Hiển thị loading
            this.showLoading(true);
            
            // Tải dữ liệu song song
            const loadPromises = [
                this.loadData('provinces'),
                this.loadData('districts'), 
                this.loadData('wards')
            ];
            
            await Promise.all(loadPromises);
            
            this.dataLoaded = true;
            console.log('✅ Dữ liệu đã tải xong!');
            console.log(`📊 Thống kê: ${this.provinces.length} tỉnh, ${this.districts.length} huyện, ${this.wards.length} xã`);
            
            // Cập nhật UI
            this.updateUI();
            
            // Ẩn loading, hiển thị main content
            setTimeout(() => {
                this.showLoading(false);
                $('.main-content').fadeIn(500);
            }, 1000);
            
        } catch (error) {
            console.error('❌ Lỗi tải dữ liệu:', error);
            this.showError(`Không thể tải dữ liệu: ${error.message}`);
        }
    }
    
    async loadData(type) {
        try {
            console.log(`📁 Đang tải ${type}...`);
            const response = await fetch(`data/${type}.json`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
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
            
            console.log(`✅ Đã tải ${type}: ${data.length} bản ghi`);
            
        } catch (error) {
            console.error(`❌ Lỗi tải ${type}:`, error);
            throw error;
        }
    }
    
    // ==================== CHUẨN HÓA VĂN BẢN ====================
    normalizeText(text) {
        if (!text || typeof text !== 'string') return '';
        
        // Chuyển thành chữ thường
        let normalized = text.toLowerCase();
        
        // Thay thế viết tắt
        Object.keys(this.abbreviations).forEach(abbr => {
            const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
            normalized = normalized.replace(regex, this.abbreviations[abbr]);
        });
        
        // Bỏ dấu tiếng Việt
        normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Thay thế ký tự đặc biệt
        normalized = normalized
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9\s]/g, ' ')  // Giữ chữ, số, khoảng trắng
            .replace(/\s+/g, ' ')          // Chuẩn hóa khoảng trắng
            .trim();
        
        // Thay thế alias tỉnh
        Object.keys(this.provinceAliases).forEach(alias => {
            if (normalized.includes(alias)) {
                normalized = normalized.replace(alias, this.provinceAliases[alias]);
            }
        });
        
        return normalized;
    }
    
    // ==================== PHÂN TÍCH ĐỊA CHỈ THÔNG MINH ====================
    parseAddressSmart(addressText) {
        const original = addressText.trim();
        
        if (!original) {
            return {
                original: '',
                province: '',
                district: '',
                ward: '',
                hamlet: '',
                street: '',
                normalized: '',
                confidence: 0
            };
        }
        
        // Bước 1: Chuẩn hóa
        let normalized = this.normalizeText(original);
        
        // Bước 2: Tách thành phần bằng dấu phẩy
        const commaParts = normalized.split(',').map(p => p.trim()).filter(p => p);
        
        let province = '', district = '', ward = '', hamlet = '', street = '';
        let confidence = 0.5; // Độ tin cậy ban đầu
        
        // Bước 3: Phân tích từng phần
        const analyzedParts = [];
        
        for (let i = 0; i < commaParts.length; i++) {
            const part = commaParts[i];
            let type = 'unknown';
            let value = part;
            
            // Kiểm tra từ khóa
            for (const [keyType, keywords] of Object.entries(this.keywords)) {
                for (const keyword of keywords) {
                    if (part.includes(keyword)) {
                        type = keyType;
                        value = part.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '').trim();
                        confidence += 0.1;
                        break;
                    }
                }
                if (type !== 'unknown') break;
            }
            
            // Nếu không có từ khóa, đoán dựa trên vị trí
            if (type === 'unknown') {
                if (i === commaParts.length - 1) {
                    // Phần cuối cùng thường là tỉnh
                    type = 'province';
                    confidence += 0.05;
                } else if (i === commaParts.length - 2) {
                    // Phần áp cuối thường là huyện
                    type = 'district';
                    confidence += 0.05;
                } else if (i === commaParts.length - 3) {
                    // Phần thứ 3 từ cuối thường là xã
                    type = 'ward';
                    confidence += 0.05;
                } else {
                    // Các phần còn lại là số nhà/đường/ấp
                    if (part.match(/^\d+/)) {
                        type = 'street';
                    } else {
                        type = 'hamlet';
                    }
                }
            }
            
            // Gán giá trị
            switch(type) {
                case 'province':
                    province = value;
                    break;
                case 'district':
                    district = value;
                    break;
                case 'ward':
                    ward = value;
                    break;
                case 'hamlet':
                    hamlet = value;
                    break;
                case 'street':
                    street = value;
                    break;
            }
            
            analyzedParts.push({ part, type, value });
        }
        
        // Bước 4: Nếu không tách được bằng dấu phẩy, thử regex
        if (!province || !district || !ward) {
            const regexPatterns = [
                // Mẫu: "số 34 ấp binh long xa thanh binh huyen cho gao tinh tien giang"
                /(.*?)\s+(ap|thon)\s+(.*?)\s+(xa|phuong)\s+(.*?)\s+(huyen|quan)\s+(.*?)\s+(tinh|thanh pho)\s+(.*)/i,
                
                // Mẫu: "xa thanh binh huyen cho gao tinh tien giang"
                /(xa|phuong)\s+(.*?)\s+(huyen|quan)\s+(.*?)\s+(tinh|thanh pho)\s+(.*)/i,
                
                // Mẫu: "huyen cho gao tinh tien giang"
                /(huyen|quan)\s+(.*?)\s+(tinh|thanh pho)\s+(.*)/i,
                
                // Mẫu: "phuong truc bach quan ba dinh ha noi"
                /(phuong|xa)\s+(.*?)\s+(quan|huyen)\s+(.*?)\s+(.*)/i
            ];
            
            for (const pattern of regexPatterns) {
                const match = normalized.match(pattern);
                if (match) {
                    if (!ward && (match[1] === 'xa' || match[1] === 'phuong')) {
                        ward = match[2];
                        confidence += 0.1;
                    }
                    if (!district && (match[3] === 'huyen' || match[3] === 'quan')) {
                        district = match[4] || match[2];
                        confidence += 0.1;
                    }
                    if (!province) {
                        province = match[5] || match[4] || match[3];
                        confidence += 0.1;
                    }
                    break;
                }
            }
        }
        
        // Bước 5: Làm sạch kết quả
        const clean = (str) => str.replace(/\b(tinh|thanh pho|huyen|quan|xa|phuong|ap|thon)\b/gi, '').trim();
        
        province = clean(province);
        district = clean(district);
        ward = clean(ward);
        hamlet = clean(hamlet);
        street = clean(street);
        
        // Giới hạn độ tin cậy
        confidence = Math.min(Math.max(confidence, 0), 1);
        
        return {
            original,
            province,
            district, 
            ward,
            hamlet,
            street,
            normalized,
            confidence,
            analyzedParts
        };
    }
    
    // ==================== TÌM KIẾM TRONG CƠ SỞ DỮ LIỆU ====================
    findInDatabase(parsedAddress) {
        if (!this.dataLoaded) {
            return {
                status: 'error',
                message: 'Dữ liệu chưa sẵn sàng',
                confidence: 0
            };
        }
        
        // Bước 1: Tìm tỉnh
        let foundProvince = null;
        let provinceScore = 0;
        
        for (const province of this.provinces) {
            const normProvinceName = this.normalizeText(province.name);
            const inputProvince = parsedAddress.province;
            
            // Tính điểm khớp
            let score = 0;
            
            if (normProvinceName === inputProvince) {
                score = 1.0; // Khớp chính xác
            } else if (normProvinceName.includes(inputProvince) || inputProvince.includes(normProvinceName)) {
                score = 0.8; // Khớp một phần
            } else if (parsedAddress.normalized.includes(normProvinceName)) {
                score = 0.6; // Tìm thấy trong toàn bộ địa chỉ
            }
            
            if (score > provinceScore) {
                provinceScore = score;
                foundProvince = province;
            }
        }
        
        if (!foundProvince) {
            return {
                status: 'error',
                message: 'Không tìm thấy tỉnh/thành phố',
                confidence: 0
            };
        }
        
        // Bước 2: Tìm xã trong tỉnh đó
        let foundWard = null;
        let wardScore = 0;
        
        const provinceWards = this.wards.filter(w => w.parent_code === foundProvince.code);
        
        for (const ward of provinceWards) {
            const normWardName = this.normalizeText(ward.name);
            const inputWard = parsedAddress.ward;
            
            let score = 0;
            
            if (inputWard && normWardName === inputWard) {
                score = 1.0;
            } else if (inputWard && (normWardName.includes(inputWard) || inputWard.includes(normWardName))) {
                score = 0.8;
            } else if (parsedAddress.normalized.includes(normWardName)) {
                score = 0.7;
            }
            
            // Thêm điểm nếu khớp cả huyện
            if (parsedAddress.district) {
                const districtForWard = this.districts.find(d => d.code === ward.parent_code);
                if (districtForWard) {
                    const normDistrictName = this.normalizeText(districtForWard.name);
                    if (normDistrictName.includes(parsedAddress.district) || 
                        parsedAddress.district.includes(normDistrictName)) {
                        score += 0.2;
                    }
                }
            }
            
            if (score > wardScore) {
                wardScore = score;
                foundWard = ward;
            }
        }
        
        // Bước 3: Tìm huyện tương ứng (nếu có)
        let foundDistrict = null;
        if (foundWard) {
            foundDistrict = this.districts.find(d => d.code === foundWard.parent_code);
        }
        
        // Bước 4: Xác định trạng thái và độ tin cậy
        let status = 'error';
        let message = '';
        let finalConfidence = (provinceScore * 0.4) + (wardScore * 0.6);
        
        if (foundProvince && foundWard) {
            status = 'success';
            message = 'Chuyển đổi thành công';
            finalConfidence = Math.max(finalConfidence, 0.8);
        } else if (foundProvince && !foundWard) {
            status = 'warning';
            message = 'Tìm thấy tỉnh nhưng không xác định được xã';
            finalConfidence = provinceScore * 0.7;
        } else {
            status = 'error';
            message = 'Không thể xác định địa chỉ';
            finalConfidence = 0;
        }
        
        return {
            status,
            message,
            confidence: finalConfidence,
            province: foundProvince,
            district: foundDistrict,
            ward: foundWard,
            parsed: parsedAddress
        };
    }
    
    // ==================== XỬ LÝ HÀNG LOẠT ====================
    async processBatch(addresses) {
        if (!this.dataLoaded) {
            throw new Error('Dữ liệu chưa sẵn sàng');
        }
        
        const results = [];
        const total = addresses.length;
        
        // Hiển thị progress
        $('#progressContainer').show();
        $('#progressBar').css('width', '0%');
        $('#progressPercent').text('0%');
        $('#progressText').text('Bắt đầu phân tích...');
        
        for (let i = 0; i < total; i++) {
            const address = addresses[i];
            
            // Cập nhật progress
            const percent = Math.round(((i + 1) / total) * 100);
            $('#progressBar').css('width', percent + '%');
            $('#progressPercent').text(percent + '%');
            $('#progressText').text(`Đang xử lý: ${i + 1}/${total} (${percent}%)`);
            
            try {
                // Phân tích địa chỉ
                const parsed = this.parseAddressSmart(address);
                
                // Tìm trong database
                const result = this.findInDatabase(parsed);
                
                // Lưu kết quả
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
                        message: result.message,
                        confidence: result.confidence
                    }
                });
                
            } catch (error) {
                console.error(`Lỗi xử lý địa chỉ ${i + 1}:`, error);
                
                results.push({
                    index: i + 1,
                    original: address,
                    parsed: null,
                    result: null,
                    display: {
                        province: '',
                        district: '',
                        ward: '',
                        status: 'error',
                        message: 'Lỗi xử lý: ' + error.message,
                        confidence: 0
                    }
                });
            }
            
            // Nghỉ một chút để UI cập nhật
            if (i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        // Ẩn progress
        $('#progressContainer').hide();
        
        return results;
    }
    
    // ==================== HIỂN THỊ KẾT QUẢ ====================
    displayResults(results) {
        this.currentResults = results;
        const tableBody = $('#resultBody');
        tableBody.empty();
        
        let successCount = 0, warningCount = 0, errorCount = 0;
        let totalConfidence = 0;
        
        // Thêm dữ liệu vào bảng
        results.forEach(item => {
            // Đếm số lượng
            if (item.display.status === 'success') successCount++;
            else if (item.display.status === 'warning') warningCount++;
            else errorCount++;
            
            if (item.display.confidence) {
                totalConfidence += item.display.confidence;
            }
            
            // Xác định class và icon
            let statusClass, statusIcon, statusText;
            
            switch(item.display.status) {
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
            
            // Định dạng độ tin cậy
            const confidencePercent = item.display.confidence 
                ? Math.round(item.display.confidence * 100) 
                : 0;
            
            const confidenceBadge = item.display.confidence > 0.7 
                ? `<small class="text-success ms-1">(${confidencePercent}%)</small>`
                : item.display.confidence > 0.4 
                ? `<small class="text-warning ms-1">(${confidencePercent}%)</small>`
                : `<small class="text-danger ms-1">(${confidencePercent}%)</small>`;
            
            const row = `
                <tr>
                    <td class="fw-bold">${item.index}</td>
                    <td>
                        <small title="${this.escapeHtml(item.original)}">${this.truncateText(item.original, 50)}</small>
                        ${item.display.message ? `<br><small class="text-muted">${item.display.message}</small>` : ''}
                    </td>
                    <td>${item.display.province || '<span class="text-muted">-</span>'}</td>
                    <td>${item.display.district || '<span class="text-muted">-</span>'}</td>
                    <td>${item.display.ward || '<span class="text-muted">-</span>'}</td>
                    <td>
                        <span class="badge ${statusClass}">
                            ${statusIcon} ${statusText} ${confidenceBadge}
                        </span>
                    </td>
                </tr>
            `;
            
            tableBody.append(row);
        });
        
        // Cập nhật thống kê
        const total = results.length;
        const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
        const avgConfidence = total > 0 ? Math.round((totalConfidence / total) * 100) : 0;
        
        $('#resultTitle').html(`ĐÃ XỬ LÝ ${total} ĐỊA CHỈ`);
        $('#successCount').text(successCount);
        $('#warningCount').text(warningCount);
        $('#errorCount').text(errorCount);
        $('#successRate').text(`${successRate}%`);
        
        $('#resultText').html(`
            <div class="row">
                <div class="col-md-8">
                    Tỷ lệ thành công: <strong>${successRate}%</strong> • 
                    Độ tin cậy trung bình: <strong>${avgConfidence}%</strong>
                </div>
                <div class="col-md-4 text-end">
                    <small class="text-muted">${new Date().toLocaleString('vi-VN')}</small>
                </div>
            </div>
        `);
        
        $('#resultStats').fadeIn(500);
        
        // Khởi tạo DataTable
        this.initDataTable();
        
        // Hiển thị export section
        $('#exportSection').fadeIn(500);
        
        // Cuộn đến kết quả
        $('html, body').animate({
            scrollTop: $('#resultStats').offset().top - 100
        }, 800);
    }
    
    initDataTable() {
        if ($.fn.DataTable.isDataTable('#resultTable')) {
            $('#resultTable').DataTable().destroy();
        }
        
        $('#resultTable').DataTable({
            pageLength: 10,
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Tất cả"]],
            order: [[0, 'asc']],
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/vi.json'
            },
            dom: '<"row"<"col-md-6"l><"col-md-6"f>>rt<"row"<"col-md-6"i><"col-md-6"p>>',
            initComplete: function() {
                $('#resultTable').fadeIn(500);
            }
        });
    }
    
    // ==================== XUẤT DỮ LIỆU ====================
    exportToCSV() {
        if (this.currentResults.length === 0) {
            alert('Không có dữ liệu để xuất!');
            return;
        }
        
        const headers = ['STT', 'Địa chỉ gốc', 'Tỉnh/Thành', 'Quận/Huyện', 'Xã/Phường', 'Trạng thái', 'Độ tin cậy', 'Ghi chú'];
        
        const rows = this.currentResults.map(item => [
            item.index,
            `"${item.original.replace(/"/g, '""')}"`,
            item.display.province || '',
            item.display.district || '',
            item.display.ward || '',
            item.display.status === 'success' ? 'Thành công' : 
            item.display.status === 'warning' ? 'Cảnh báo' : 'Lỗi',
            item.display.confidence ? Math.round(item.display.confidence * 100) + '%' : '0%',
            item.display.message || ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        this.downloadFile(blob, `ketqua_chuyendoi_${this.getTimestamp()}.csv`);
    }
    
    exportToExcel() {
        if (this.currentResults.length === 0) {
            alert('Không có dữ liệu để xuất!');
            return;
        }
        
        // Chuẩn bị dữ liệu
        const wsData = [
            ['KẾT QUẢ CHUYỂN ĐỔI ĐỊA CHỈ'],
            ['Thời gian:', new Date().toLocaleString('vi-VN')],
            ['Tổng số:', this.currentResults.length, 'địa chỉ'],
            ['Tỷ lệ thành công:', Math.round((this.currentResults.filter(r => r.display.status === 'success').length / this.currentResults.length) * 100) + '%'],
            [''],
            ['STT', 'Địa chỉ gốc', 'Tỉnh/Thành', 'Quận/Huyện', 'Xã/Phường', 'Trạng thái', 'Độ tin cậy', 'Ghi chú']
        ];
        
        this.currentResults.forEach(item => {
            wsData.push([
                item.index,
                item.original,
                item.display.province || '',
                item.display.district || '',
                item.display.ward || '',
                item.display.status === 'success' ? 'Thành công' : 
                item.display.status === 'warning' ? 'Cảnh báo' : 'Lỗi',
                item.display.confidence ? Math.round(item.display.confidence * 100) + '%' : '0%',
                item.display.message || ''
            ]);
        });
        
        // Tạo worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Định dạng cột
        const wscols = [
            { wch: 5 },   // STT
            { wch: 40 },  // Địa chỉ gốc
            { wch: 20 },  // Tỉnh/Thành
            { wch: 20 },  // Quận/Huyện
            { wch: 20 },  // Xã/Phường
            { wch: 12 },  // Trạng thái
            { wch: 12 },  // Độ tin cậy
            { wch: 30 }   // Ghi chú
        ];
        ws['!cols'] = wscols;
        
        // Merge các ô tiêu đề
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }
        ];
        
        // Tạo workbook và lưu file
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Kết quả');
        XLSX.writeFile(wb, `ketqua_chuyendoi_${this.getTimestamp()}.xlsx`);
    }
    
    // ==================== TIỆN ÍCH ====================
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return this.escapeHtml(text);
        return this.escapeHtml(text.substring(0, maxLength)) + '...';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getTimestamp() {
        const now = new Date();
        return `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
    }
    
    downloadFile(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }
    
    // ==================== UI HELPERS ====================
    showLoading(show) {
        if (show) {
            $('#loadingSection').show();
            $('.main-content').hide();
        } else {
            $('#loadingSection').fadeOut(300);
        }
    }
    
    showError(message) {
        $('#dataStatus').html(`
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Lỗi:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
        
        $('#btnConvert').prop('disabled', true);
    }
    
    updateUI() {
        $('#dataStatus').html(`
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                <strong>Thành công!</strong> Đã tải ${this.provinces.length} tỉnh, ${this.districts.length} huyện, ${this.wards.length} xã
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
        
        $('#btnConvert').prop('disabled', false);
        $('#versionInfo').text(`v3.0 • ${this.provinces.length} tỉnh • ${this.wards.length} xã`);
        
        console.log('✅ UI đã được cập nhật');
    }
}

// ==================== KHỞI TẠO ỨNG DỤNG ====================
let addressConverter;

$(document).ready(function() {
    console.log('📱 Ứng dụng đang khởi động...');
    
    // Khởi tạo converter
    addressConverter = new AddressConverter();
    
    // ==================== SỰ KIỆN ====================
    
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
        
        if (addresses.length === 0) {
            alert('Không có địa chỉ nào để xử lý!');
            return;
        }
        
        if (addresses.length > 1000) {
            if (!confirm(`Bạn đang chuẩn bị xử lý ${addresses.length} địa chỉ. Quá trình này có thể mất vài phút. Tiếp tục?`)) {
                return;
            }
        }
        
        try {
            console.log(`🔄 Bắt đầu xử lý ${addresses.length} địa chỉ...`);
            $(this).prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i> ĐANG XỬ LÝ...');
            
            const results = await addressConverter.processBatch(addresses);
            addressConverter.displayResults(results);
            
            console.log(`✅ Đã xử lý xong ${addresses.length} địa chỉ`);
            
        } catch (error) {
            console.error('❌ Lỗi xử lý:', error);
            alert('Lỗi xử lý: ' + error.message);
        } finally {
            $(this).prop('disabled', false).html('<i class="fas fa-sync-alt me-2"></i> BẮT ĐẦU CHUYỂN ĐỔI');
        }
    });
    
    // Nút xóa tất cả
    $('#btnReset').click(function() {
        if ($('#inputAddresses').val().trim() || addressConverter.currentResults.length > 0) {
            if (confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu đã nhập và kết quả?')) {
                $('#inputAddresses').val('');
                $('#lineCount').text('0');
                $('#resultStats').fadeOut(300);
                $('#resultTable').fadeOut(300);
                $('#exportSection').fadeOut(300);
                addressConverter.currentResults = [];
                
                // Reset DataTable
                if ($.fn.DataTable.isDataTable('#resultTable')) {
                    $('#resultTable').DataTable().destroy();
                }
                
                // Focus vào ô nhập liệu
                $('#inputAddresses').focus();
            }
        }
    });
    
    // Nút dùng ví dụ
    $('#btnExample').click(function() {
        const examples = [
            "Số 34 ấp Bình Long, xã Thanh Bình, huyện Chợ Gạo, tỉnh Tiền Giang",
            "Thôn 5, xã Ea Khal, huyện Ea H'Leo, tỉnh Đắk Lắk",
            "Phường Trúc Bạch, quận Ba Đình, thành phố Hà Nội",
            "Ấp Mỹ Hòa, xã Mỹ Phước, huyện Tân Phước, tỉnh Tiền Giang",
            "Số 123 đường Lê Lợi, phường Bến Nghé, quận 1, TP. Hồ Chí Minh",
            "Xã Đan Phượng, huyện Đan Phượng, Hà Nội",
            "Phường Hàng Bài, quận Hoàn Kiếm, Hà Nội",
            "Thị trấn Chợ Gạo, huyện Chợ Gạo, Tiền Giang"
        ].join('\n');
        
        $('#inputAddresses').val(examples);
        $('#lineCount').text('8');
        
        // Focus và cuộn đến ô nhập liệu
        $('#inputAddresses').focus();
        $('html, body').animate({
            scrollTop: $('#inputAddresses').offset().top - 100
        }, 500);
    });
    
    // Nút xuất CSV
    $('#btnExportCSV').click(function() {
        addressConverter.exportToCSV();
    });
    
    // Nút xuất Excel
    $('#btnExportExcel').click(function() {
        addressConverter.exportToExcel();
    });
    
    // Nút sao chép bảng
    $('#btnCopyTable').click(function() {
        if (addressConverter.currentResults.length === 0) {
            alert('Không có dữ liệu để sao chép!');
            return;
        }
        
        const table = $('#resultTable').clone();
        table.find('.dataTables_empty').remove();
        
        const tempDiv = $('<div>').append(table);
        const html = tempDiv.html();
        
        navigator.clipboard.writeText(html).then(() => {
            alert('Đã sao chép bảng kết quả vào clipboard!');
        }).catch(err => {
            console.error('Lỗi sao chép:', err);
            
            // Fallback cho trình duyệt cũ
            const textArea = document.createElement('textarea');
            textArea.value = html;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            alert('Đã sao chép bảng kết quả!');
        });
    });
    
    // Nút in ấn
    $('#btnPrint').click(function() {
        window.print();
    });
    
    // Phím tắt
    $(document).keydown(function(e) {
        // Ctrl + Enter: Chuyển đổi
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            $('#btnConvert').click();
        }
        
        // Ctrl + E: Dùng ví dụ
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            $('#btnExample').click();
        }
        
        // Esc: Xóa tất cả
        if (e.key === 'Escape') {
            $('#btnReset').click();
        }
    });
    
    // Tooltip
    $(function () {
        $('[data-bs-toggle="tooltip"]').tooltip();
    });
    
    console.log('✅ Ứng dụng đã sẵn sàng!');
});
