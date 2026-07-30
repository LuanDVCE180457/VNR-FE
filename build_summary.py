import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

congress_definitions = [
    {
        'id': 'hnie_1930',
        'title': 'Hội nghị Thành lập Đảng (1/1930 - 2/1930)',
        'location': 'Cửu Long, Hương Cảng, Trung Quốc',
        'badge': '1930',
        'highlights': [
            'Chủ trì: Nguyễn Ái Quốc.',
            'Văn kiện thông qua: Chánh cương vắn tắt, Sách lược vắn tắt, Chương trình vắn tắt, Điều lệ vắn tắt (Cương lĩnh chính trị đầu tiên).',
            'Các tổ chức hợp nhất: Đông Dương Cộng sản Đảng, An Nam Cộng sản Đảng.',
            'Nhiệm vụ hàng đầu: Chống đế quốc, giải phóng dân tộc.'
        ],
        'pattern': r'thành lập Đảng|Chánh cương vắn tắt|Cương lĩnh chính trị đầu tiên|Cương lĩnh đầu tiên'
    },
    {
        'id': 'dh1',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ I (3/1935)',
        'location': 'Ma Cao, Trung Quốc',
        'badge': 'Đại hội I (1935)',
        'highlights': [
            'Tổng Bí thư được bầu: Lê Hồng Phong.',
            'Ý nghĩa: Củng cố hệ thống tổ chức Đảng sau thời kỳ bị địch đàn áp dã man (1931-1935).'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(I\b|1\b)'
    },
    {
        'id': 'dh2',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ II (2/1951)',
        'location': 'Chiêm Hóa, Tuyên Quang',
        'badge': 'Đại hội II (1951)',
        'highlights': [
            'Tên Đảng đổi thành: Đảng Lao động Việt Nam.',
            'Tổng Bí thư được bầu: Trường Chinh (Chủ tịch Đảng: Hồ Chí Minh).',
            'Danh hiệu: "Đại hội kháng chiến thắng lợi".',
            'Chính cương Đảng Lao động Việt Nam nêu rõ 3 nhiệm vụ: Đánh đuổi đế quốc xâm lược, xóa bỏ di tích phong kiến, phát triển dân chủ nhân dân, gây cơ sở cho CNXH.'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(II\b|2\b)'
    },
    {
        'id': 'dh3',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ III (9/1960)',
        'location': 'Hà Nội',
        'badge': 'Đại hội III (1960)',
        'highlights': [
            'Tổng Bí thư được bầu: Lê Duẩn.',
            'Danh hiệu: "Đại hội xây dựng CNXH ở miền Bắc và đấu tranh thực hiện thống nhất nước nhà".',
            'Đề ra 2 nhiệm vụ chiến lược: Cách mạng XHCN ở miền Bắc (quyết định nhất) và Cách mạng Dân tộc Dân chủ Nhân dân ở miền Nam (quyết định trực tiếp).'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(III\b|3\b)'
    },
    {
        'id': 'dh4',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ IV (12/1976)',
        'location': 'Hà Nội',
        'badge': 'Đại hội IV (1976)',
        'highlights': [
            'Tên Đảng đổi lại thành: Đảng Cộng sản Việt Nam (bầu Lê Duẩn làm Tổng Bí thư).',
            'Thông qua: Kế hoạch nhà nước 5 năm (1976 - 1980).',
            'Đánh giá đặc điểm lớn nhất: Nước ta từ một xã hội sản xuất nhỏ tiến thẳng lên CNXH bỏ qua giai đoạn TBCN.'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(IV\b|4\b)'
    },
    {
        'id': 'dh5',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ V (3/1982)',
        'location': 'Hà Nội',
        'badge': 'Đại hội V (1982)',
        'highlights': [
            'Tổng Bí thư: Lê Duẩn.',
            'Coi Nông nghiệp là mặt trận hàng đầu.',
            'Đề ra 2 nhiệm vụ chiến lược: Xây dựng thành công CNXH và Bảo vệ vững chắc Tổ quốc VNXHCN.'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(V\b|5\b)'
    },
    {
        'id': 'dh6',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ VI (12/1986)',
        'location': 'Hà Nội',
        'badge': 'Đại hội VI (1986)',
        'highlights': [
            'Đại hội mở đầu công cuộc ĐỔI MỚI toàn diện đất nước.',
            'Tổng Bí thư được bầu: Nguyễn Văn Linh.',
            'Đổi mới cơ chế quản lý, xóa bỏ cơ chế tập trung quan lưu bao cấp, phát triển kinh tế nhiều thành phần.',
            '3 Chương trình kinh tế lớn: Lương thực - thực phẩm, Hàng tiêu dùng, Hàng xuất khẩu.'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(VI\b|6\b)'
    },
    {
        'id': 'dh7',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ VII (6/1991)',
        'location': 'Hà Nội',
        'badge': 'Đại hội VII (1991)',
        'highlights': [
            'Tổng Bí thư: Đỗ Mười.',
            'Thông qua: Cương lĩnh xây dựng đất nước trong thời kỳ quá độ lên CNXH (năm 1991) nêu 6 đặc trưng cơ bản.',
            'Lần đầu khẳng định: Lấy chủ nghĩa Mác - Lênin và Tư tưởng Hồ Chí Minh làm nền tảng tư tưởng và kim chỉ nam cho hành động.',
            'Đường lối đối ngoại: "Việt Nam muốn là bạn với tất cả các nước trong cộng đồng thế giới".'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(VII\b|7\b)'
    },
    {
        'id': 'dh8',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ VIII (6/1996)',
        'location': 'Hà Nội',
        'badge': 'Đại hội VIII (1996)',
        'highlights': [
            'Tổng Bí thư: Đỗ Mười.',
            'Khẳng định: Nước ta đã thoát khỏi khủng hoảng kinh tế - xã hội, chuyển sang giai đoạn ĐẨY MẠNH CÔNG NGHIỆP HÓA, HIỆN ĐẠI HÓA.',
            'Động lực CNH, HĐH: Khoa học và công nghệ, Giáo dục và đào tạo.'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(VIII\b|8\b)'
    },
    {
        'id': 'dh9',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ IX (4/2001)',
        'location': 'Hà Nội',
        'badge': 'Đại hội IX (2001)',
        'highlights': [
            'Tổng Bí thư: Nông Đức Mạnh.',
            'Xác định mô hình kinh tế tổng quát: Kinh tế thị trường định hướng xã hội chủ nghĩa.',
            'Đường lối đối ngoại: "Việt Nam sẵn sàng là bạn, là đối tác tin cậy của các nước trong cộng đồng quốc tế".'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(IX\b|9\b)'
    },
    {
        'id': 'dh10',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ X (4/2006)',
        'location': 'Hà Nội',
        'badge': 'Đại hội X (2006)',
        'highlights': [
            'Tổng Bí thư: Nông Đức Mạnh.',
            'Điểm mới nổi bật: Cho phép Đảng viên làm kinh tế tư nhân.',
            'Xây dựng, chỉnh đốn Đảng là nhiệm vụ then chốt.'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(X\b|10\b)'
    },
    {
        'id': 'dh11',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ XI (1/2011)',
        'location': 'Hà Nội',
        'badge': 'Đại hội XI (2011)',
        'highlights': [
            'Tổng Bí thư: Nguyễn Phú Trọng.',
            'Thông qua: Cương lĩnh xây dựng đất nước (bổ sung, phát triển năm 2011) xác định 8 đặc trưng cơ bản (bổ sung đặc trưng "Dân giàu, nước mạnh, dân chủ, công bằng, văn minh do nhân dân làm chủ").'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(XI\b|11\b)'
    },
    {
        'id': 'dh12',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ XII (1/2016)',
        'location': 'Hà Nội',
        'badge': 'Đại hội XII (2016)',
        'highlights': [
            'Tổng Bí thư: Nguyễn Phú Trọng.',
            'Khẩu hiệu: "Đoàn kết - Dân chủ - Kỷ cương - Đổi mới".',
            'Lần đầu tiên khẳng định: Lấy lợi ích quốc gia, dân tộc làm mục tiêu cao nhất.'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(XII\b|12\b)'
    },
    {
        'id': 'dh13',
        'title': 'Đại hội Đại biểu Toàn quốc lần thứ XIII (1/2021)',
        'location': 'Hà Nội (25/1 - 1/2/2021)',
        'badge': 'Đại hội XIII (2021)',
        'highlights': [
            'Tổng Bí thư: Nguyễn Phú Trọng.',
            'Đề ra 3 đột phá chiến lược.',
            'Mục tiêu đến năm 2025: Nước đang phát triển, có công nghiệp theo hướng hiện đại, vượt qua mức thu nhập trung bình thấp.',
            'Mục tiêu đến năm 2030: Nước đang phát triển, có công nghiệp hiện đại, thu nhập trung bình cao.',
            'Phương châm: "Dân biết, dân bàn, dân làm, dân kiểm tra, dân giám sát, dân thụ hưởng".'
        ],
        'pattern': r'Đại hội.*(lần thứ )?(XIII\b|13\b)'
    }
]

summary_export = []

for cdef in congress_definitions:
    pat = cdef['pattern']
    matched_q = []
    for q in questions:
        # Check matching question
        if re.search(pat, q['question'], re.I):
            # Exclude overlapping numeral matches
            if 'XIII' in pat and not re.search(r'XIII|13', q['question'], re.I): continue
            if 'XII' in pat and 'XIII' not in pat and re.search(r'XIII|13', q['question'], re.I): continue
            if 'XI' in pat and 'XII' not in pat and 'XIII' not in pat and re.search(r'XII|XIII|12|13', q['question'], re.I): continue
            if 'X' in pat and 'XI' not in pat and 'XII' not in pat and 'XIII' not in pat and re.search(r'XI|XII|XIII|11|12|13', q['question'], re.I): continue
            if 'IX' in pat and re.search(r'X\b|XI|XII|XIII', q['question'], re.I): continue
            if 'VIII' in pat and re.search(r'IX|X\b|XI|XII|XIII', q['question'], re.I): continue
            if 'VII' in pat and 'VIII' not in pat and re.search(r'VIII|IX|X\b', q['question'], re.I): continue
            if 'VI' in pat and 'VII' not in pat and 'VIII' not in pat and re.search(r'VII|VIII|IX|X\b', q['question'], re.I): continue
            if 'V' in pat and 'VI' not in pat and 'VII' not in pat and 'VIII' not in pat and re.search(r'VI|VII|VIII|IX|X\b', q['question'], re.I): continue
            if 'IV' in pat and re.search(r'V\b|VI|VII|VIII|IX|X\b', q['question'], re.I): continue
            if 'III' in pat and re.search(r'IV|V\b|VI|VII|VIII|IX|X\b', q['question'], re.I): continue
            if 'II' in pat and 'III' not in pat and re.search(r'III|IV|V\b|VI|VII|VIII|IX|X\b', q['question'], re.I): continue
            if 'I' in pat and 'II' not in pat and re.search(r'II|III|IV|V\b|VI|VII|VIII|IX|X\b', q['question'], re.I): continue

            correct_opts = [o['text'] for o in q['options'] if o['label'] in q['answer']]
            matched_q.append({
                'id': q['id'],
                'question': q['question'],
                'answer': q['answer'],
                'answer_text': ' | '.join(correct_opts),
                'raw_note': q['answer_raw']
            })

    summary_export.append({
        'id': cdef['id'],
        'title': cdef['title'],
        'location': cdef['location'],
        'badge': cdef['badge'],
        'highlights': cdef['highlights'],
        'questions': matched_q
    })

    print(f"{cdef['title']}: {len(matched_q)} câu hỏi")

js_data = f'window.CONGRESS_SUMMARY = {json.dumps(summary_export, ensure_ascii=False, indent=2)};\n'
with open('congress_data.js', 'w', encoding='utf-8') as f:
    f.write(js_data)

print('congress_data.js generated successfully!')
