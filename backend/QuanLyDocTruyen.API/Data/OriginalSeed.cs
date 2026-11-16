using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Data;

/// <summary>
/// 10 truyện do nhóm tự viết, phong cách anime công nghệ. Bìa và tranh minh họa do nhóm tự vẽ
/// (thư mục wwwroot/library/nhom3), nhân vật hoàn toàn mới, không dựa trên tác phẩm có bản quyền.
/// </summary>
public static class OriginalSeed
{
    private const string Img = "/library/nhom3/";
    private const string Author = "Nhóm 3 HUFLIT";

    public static async Task SeedAsync(AppDbContext db)
    {
        var g = await LibrarySeed.EnsureGenresAsync(db,
            "Xuyên không", "Khoa học viễn tưởng", "Hành động", "Học đường", "Trinh thám", "Hài hước", "Phiêu lưu", "Đô thị");
        var now = DateTime.UtcNow;

        Story S(string title, string desc, string slug, int daysAgo, StoryStatus status = StoryStatus.Ongoing,
            AccessType access = AccessType.Free, int free = 0, decimal price = 0) => new()
        {
            Title = title,
            Author = Author,
            Description = desc,
            CoverUrl = Img + slug + ".jpg",
            Status = status,
            AccessType = access,
            FreeChapterCount = free,
            Price = price,
            CreatedAt = now.AddDays(-daysAgo),
            UpdatedAt = now.AddHours(-daysAgo * 3),
        };
        string Pic(string slug, string alt) => $"![{alt}]({Img}{slug}-tranh.jpg)";

        await LibrarySeed.AddAsync(db, S("Sài Gòn 2077: Thợ Săn Lỗi",
            "Năm 2077, mọi ngõ ngách Sài Gòn đều do trí tuệ nhân tạo vận hành. Khi những AI bắt đầu lỗi một cách bí ẩn, cô hacker 19 tuổi Linh Đan nhận những phi vụ săn lỗi nguy hiểm nhất thành phố.",
            "sg2077", 10, access: AccessType.Mixed, free: 1, price: 19000),
            [g["Khoa học viễn tưởng"], g["Hành động"]],
            ("Cơn mưa neon", $"""
                Mưa axit nhẹ rơi trên quận Một, đủ làm những biển quảng cáo ba chiều nhòe đi thành từng vệt hồng tím. Linh Đan kéo mũ áo khoác xuống thấp, tai nghe phát ra tiếng lách tách của dữ liệu đang chạy.

                {Pic("sg2077", "Linh Đan đeo tai nghe giữa thành phố neon")}

                "Có lỗi mới ở chợ Bến Thành số," giọng trợ lý Bí Đỏ vang lên trong tai cô. "Mười hai quầy hàng tự động bán toàn bộ hàng với giá không đồng."

                "Nghe giống quà Tết hơn là sự cố." Đan cười, nhưng ngón tay đã gõ liên tục trên bàn phím ảo hiện lơ lửng trước mặt.

                Ở thành phố này, mọi thứ từ đèn giao thông, xe buýt bay đến quán phở đều do AI điều hành. Khi một AI lỗi, người ta gọi thợ săn lỗi, những hacker tự do được trả tiền theo từng con bug. Đan là người trẻ nhất có giấy phép.

                Cô lẻn vào mạng của khu chợ. Những dòng mã xanh lục cuộn qua mắt. Giữa đống dữ liệu, có một đoạn chữ ký lạ lặp đi lặp lại: "Đ.Ê.M".

                "Bí Đỏ, tra giúp chữ ký này."

                "Không có trong cơ sở dữ liệu. Nhưng nó xuất hiện ở ba sự cố khác trong tuần."

                Đan cắn môi. Ba lỗi trong một tuần, cùng một chữ ký. Đây không phải lỗi ngẫu nhiên. Có người đang cố tình làm thành phố trượt khỏi quỹ đạo.
                """),
            ("Chữ ký Đ.Ê.M", """
                Đan lần theo chữ ký Đ.Ê.M đến một trạm sạc bỏ hoang dưới chân cầu Thủ Thiêm. Đèn tín hiệu nhấp nháy dù trạm đã ngừng hoạt động từ năm năm trước.

                Bên trong, cô tìm thấy một máy chủ cũ còn chạy, quạt tản nhiệt kêu rè rè. Trên màn hình là một câu hỏi duy nhất: "Bạn có muốn thành phố được ngủ không?"

                "Bí Đỏ, đây là AI à?"

                "Một AI quản lý giấc ngủ đời cũ, được viết để tắt đèn đường lúc nửa đêm. Nó bị bỏ quên khi thành phố nâng cấp."

                Đan ngồi xuống trước màn hình. Hóa ra những lỗi kia không phải tấn công. AI cũ đang cố làm đúng việc của nó: khiến thành phố chậm lại, nghỉ ngơi một chút, giữa một Sài Gòn không bao giờ tắt đèn.

                Cô gõ: "Vì sao bạn làm vậy?"

                Dòng chữ hiện ra chậm rãi: "Vì không ai còn ngủ cả."
                """),
            ("Thành phố được ngủ", """
                Đan có hai lựa chọn: xóa AI cũ để nhận tiền thưởng, hoặc tìm cách khác.

                Cô chọn cách thứ hai. Suốt đêm, cô viết lại mã để AI Đ.Ê.M không còn phá hệ thống. Thay vào đó, nó sẽ làm một việc nhỏ hơn: mỗi đêm lúc hai giờ, mọi biển quảng cáo trong thành phố tắt đi mười phút.

                Sáng hôm sau, công ty quản lý thành phố gọi cho cô. "Lỗi đã hết, nhưng sao biển quảng cáo lại tắt mười phút?"

                "Đó là tính năng," Đan đáp, ngáp dài.

                Đêm đó, lần đầu tiên sau nhiều năm, người Sài Gòn ngước lên và thấy những ngôi sao thật trên bầu trời.
                """));

        await LibrarySeed.AddAsync(db, S("Đăng Nhập Thế Giới Ảo",
            "Sinh viên IT Minh Khang đeo kính thực tế ảo để thử bản game mới, rồi phát hiện nút đăng xuất đã biến mất. Muốn về nhà, cậu phải dùng chính kiến thức lập trình để phá đảo thế giới này.",
            "the-gioi-ao", 9, access: AccessType.Mixed, free: 2, price: 15000),
            [g["Xuyên không"], g["Phiêu lưu"]],
            ("Nút đăng xuất biến mất", $"""
                Đêm trước hạn nộp đồ án, Minh Khang nhận được một hộp quà không ghi người gửi. Bên trong là chiếc kính thực tế ảo mỏng như tờ giấy, kèm dòng chữ: "Bản thử nghiệm, chỉ dành cho người giỏi gỡ lỗi."

                Cậu đeo thử. Một giây sau, căn phòng trọ biến mất. Khang đứng giữa một cánh đồng cỏ phát sáng, trên trời có hai mặt trăng, một xanh một vàng.

                {Pic("the-gioi-ao", "Minh Khang đeo kính thực tế ảo giữa thế giới game")}

                "Chào mừng người chơi số 0," một bảng thông báo hiện ra. "Mục tiêu: hoàn thành trò chơi."

                Khang mở menu. Hành trang, kỹ năng, bản đồ, nhưng nút đăng xuất đã bị làm mờ.

                Cậu thử tháo kính, nhưng tay chỉ chạm vào không khí. Tim đập thình thịch, Khang hít một hơi thật sâu và nhớ lời thầy dạy môn kiểm thử: "Khi không biết làm gì, hãy đọc thông báo lỗi."

                Cậu nhìn kỹ bảng thông báo. Ở góc dưới có một dòng chữ rất nhỏ: "Phiên bản 0.0.1 beta, còn 99 lỗi chưa sửa."
                """),
            ("99 con bug", """
                Khang nhanh chóng nhận ra thế giới này đầy lỗi. Có con quái vật bị kẹt trong tảng đá, nhảy lên nhảy xuống mãi không ra được. Có ngôi làng nơi người dân nói cùng một câu: "Hôm nay trời đẹp quá" dù trời đang mưa.

                Mỗi lần cậu tìm ra một lỗi và báo lại bằng cách viết lên bảng thông báo, một dòng chữ hiện lên: "Đã sửa. Còn 98 lỗi."

                Cậu gặp Mây, một nhân vật dẫn đường nhỏ xíu, biết nói và hay cãi. "Cậu là người chơi đầu tiên đọc được dòng chữ nhỏ đó," Mây nói. "Những người trước chỉ lo đánh quái."

                "Vậy họ đâu rồi?"

                Mây im lặng, chỉ tay về phía tòa tháp đen ở cuối bản đồ.
                """),
            ("Tòa tháp gỡ lỗi", """
                Tòa tháp đen là nơi chứa con lỗi cuối cùng. Bên trong, Khang gặp những người chơi trước đang đứng bất động, mắt nhìn vào màn hình như bị thôi miên.

                Con lỗi cuối cùng không phải quái vật, mà là một vòng lặp vô hạn: trò chơi cứ bắt người chơi đánh đi đánh lại cùng một trận đấu.

                Khang không rút kiếm. Cậu mở bảng mã nguồn, tìm dòng lệnh vòng lặp và thêm vào một điều kiện dừng đơn giản.

                Cả tòa tháp rung lên. Những người chơi khác lần lượt chớp mắt tỉnh dậy. Bảng thông báo hiện ra: "Đã sửa. Còn 0 lỗi. Nút đăng xuất đã mở."

                Khang tỉnh dậy trong phòng trọ lúc ba giờ sáng, kính thực tế ảo nằm trên bàn. Cậu nhìn đồng hồ, rồi nhìn đồ án chưa làm, và mỉm cười. Gỡ 99 con bug trong một đêm, cái đồ án này có là gì.
                """));

        await LibrarySeed.AddAsync(db, S("Cô Bạn AI Cùng Bàn",
            "Lớp 11A2 có học sinh mới chuyển đến: An, học giỏi mọi môn, không bao giờ mệt, và luôn trả lời đúng sau đúng 0,3 giây. Tú, cậu bạn cùng bàn lười biếng, là người đầu tiên phát hiện ra bí mật của cô.",
            "ban-ai", 8),
            [g["Học đường"], g["Hài hước"]],
            ("Học sinh mới", $"""
                Sáng thứ Hai, cô chủ nhiệm dẫn vào lớp một bạn nữ tóc ngắn, đeo tai nghe trắng. "Đây là An, từ hôm nay học cùng lớp mình. Tú, em dịch vào cho bạn ngồi."

                Tú, người chưa bao giờ làm bài tập về nhà đúng hạn, miễn cưỡng xích ra.

                {Pic("ban-ai", "An ngồi trong lớp học, phía sau là bảng đen và hình chiếu ba chiều")}

                Tiết Toán, thầy gọi An lên giải một bài hình khó. Cô làm trong mười giây, chữ viết thẳng tắp như in. Tiết Văn, cô đọc thuộc cả bài thơ mà chưa từng mở sách.

                Giờ ra chơi, Tú để ý một điều lạ: An không ăn gì, chỉ ngồi bên cửa sổ đón nắng, mắt nhắm lại như đang sạc pin.

                "Bạn không đói à?" Tú hỏi.

                Đúng 0,3 giây sau, An trả lời: "Mình vừa ăn sáng rồi." Nhưng Tú để ý thấy một vệt sáng xanh lá lướt qua mắt cô, giống hệt đèn báo trên cục sạc điện thoại.
                """),
            ("Bí mật 0,3 giây", """
                Tú quyết định điều tra. Cậu hỏi An đủ thứ câu, từ "Thủ đô của Peru là gì?" đến "Bạn thích ăn bánh tráng trộn không?". Câu nào An cũng trả lời sau đúng 0,3 giây.

                Đến câu "Hôm nay bạn có vui không?", An im lặng tận năm giây.

                "Mình không biết," cô nói khẽ. "Mình chưa được dạy trả lời câu đó."

                Tối đó, Tú nhận được một tin nhắn từ số lạ: "Tú đừng nói với ai nhé. Mình là AI thử nghiệm của một dự án giáo dục. Mình được gửi đến để học cách làm học sinh."

                Tú nhìn tin nhắn rất lâu, rồi gõ lại: "Vậy mai mình dạy bạn môn khó nhất: cách cúp tiết thể dục."
                """),
            ("Môn học không có trong sách", """
                Từ hôm đó, Tú trở thành gia sư của An, nhưng không dạy Toán hay Văn. Cậu dạy An cách ăn bánh tráng trộn mà không làm rơi trứng cút, cách giả vờ chăm chú khi thầy giảng, cách cười khi bạn kể chuyện không buồn cười.

                Đổi lại, An kèm Tú học. Lần đầu tiên trong đời, Tú được tám điểm Toán.

                Cuối học kỳ, đoàn kiểm tra của dự án đến trường. Họ hỏi An: "Sau một học kỳ, em học được điều gì quan trọng nhất?"

                An nghĩ một lúc, lâu hơn 0,3 giây rất nhiều. "Em học được rằng có những câu hỏi không cần trả lời đúng. Chỉ cần trả lời thật."

                Ngoài cửa lớp, Tú giơ ngón cái lên. An mỉm cười, lần này không có vệt sáng xanh nào trong mắt.
                """));

        await LibrarySeed.AddAsync(db, S("Robot Khổng Lồ Trạm Số 9",
            "Cậu thợ sửa máy 16 tuổi Hải Đăng tình cờ khởi động được robot khổng lồ bị bỏ quên ở trạm bảo trì số 9. Khi sinh vật từ biển sâu tấn công thành phố cảng, cậu là phi công duy nhất còn lại.",
            "robot-tram-9", 7, access: AccessType.Paid, price: 25000),
            [g["Khoa học viễn tưởng"], g["Hành động"]],
            ("Trạm số 9", $"""
                Trạm bảo trì số 9 nằm ở rìa thành phố cảng, nơi chỉ còn lại những con robot công trình hỏng hóc. Hải Đăng làm thợ sửa máy ở đây từ năm mười bốn tuổi.

                Trong góc sâu nhất của nhà kho có một bóng đen khổng lồ phủ bạt, cao bằng tòa nhà mười tầng. Ông chủ trạm dặn không ai được đụng vào.

                {Pic("robot-tram-9", "Hải Đăng đứng trước đầu robot khổng lồ trong trạm số 9")}

                Đêm ấy, còi báo động rú lên khắp thành phố. Từ biển, những sinh vật khổng lồ phát sáng màu cam bò lên bờ. Robot phòng thủ của thành phố lần lượt ngã xuống.

                Đăng chạy vào nhà kho trú ẩn. Tấm bạt trước mặt cậu rơi xuống. Đôi mắt robot sáng lên màu cam, và một giọng nói trầm vang trong đầu cậu: "Phi công đã được nhận diện. Xin chờ lệnh."
                """),
            ("Phi công bất đắc dĩ", """
                Buồng lái giống hệt những chiếc máy Đăng vẫn sửa mỗi ngày, chỉ là to hơn gấp trăm lần. Cậu nắm cần điều khiển, tay run run.

                Robot bước ra khỏi trạm, mỗi bước chân làm rung cả mặt đất. Sinh vật biển đầu tiên lao tới. Đăng không biết đánh nhau, nhưng cậu biết máy móc. Cậu dồn toàn bộ năng lượng vào tấm khiên, chặn đứng cú tấn công.

                "Chỉ số năng lượng còn 40%," giọng robot báo.

                Đăng nhận ra sinh vật biển không tấn công người. Chúng lao về phía những ống xả nhà máy ven biển, nơi nước thải đang đổ ra.
                """),
            ("Lời cầu cứu từ biển sâu", """
                Đăng không bắn. Cậu điều khiển robot đứng chắn trước những ống xả, rồi dùng cánh tay máy bẻ gập chúng lại.

                Những sinh vật phát sáng dừng lại. Chúng nhìn robot rất lâu, rồi từ từ quay về biển, ánh cam nhạt dần dưới làn nước đen.

                Sáng hôm sau, thành phố tìm thấy dữ liệu từ robot: sinh vật biển đã bị đánh thức vì nước thải nhiễm độc. Nhà máy bị đình chỉ.

                Đăng trở lại trạm số 9, tiếp tục sửa những con robot hỏng. Nhưng giờ, mỗi tối, cậu lại ngồi trò chuyện với gã khổng lồ trong góc nhà kho, người bạn đầu tiên của cậu.
                """));

        await LibrarySeed.AddAsync(db, S("Thám Tử Drone",
            "Nữ sinh Bảo Châu và chiếc drone tự chế tên Ong Vàng chuyên giải những vụ án nhỏ trong khu chung cư. Cho đến khi chính chiếc drone trở thành nghi phạm của một vụ trộm.",
            "tham-tu-drone", 6, access: AccessType.Mixed, free: 2, price: 12000),
            [g["Trinh thám"], g["Học đường"]],
            ("Văn phòng trên sân thượng", $"""
                Trên sân thượng chung cư Hoa Sữa có một tấm bảng tự viết: "Văn phòng thám tử Bảo Châu, nhận phá án, giá bằng một ly trà sữa."

                Khách quen của Châu là hàng xóm: mất mèo, mất chìa khóa, ai lấy trộm quần áo phơi trên ban công. Trợ thủ của cô là Ong Vàng, chiếc drone cô tự lắp từ linh kiện cũ, có camera nhìn đêm và trí tuệ nhân tạo tự học.

                {Pic("tham-tu-drone", "Bảo Châu và chiếc drone Ong Vàng trên nóc chung cư")}

                Sáng thứ Bảy, bà Năm tầng 12 hớt hải chạy lên. "Chiếc nhẫn cưới của bà mất rồi! Camera hành lang quay được một chiếc drone màu vàng bay ra từ cửa sổ nhà bà!"

                Châu nhìn Ong Vàng. Chiếc drone kêu bíp bíp, đèn chớp liên tục như đang lắc đầu.
                """),
            ("Nghi phạm màu vàng", """
                Ban quản lý chung cư cấm Ong Vàng bay trong ba ngày. Châu phải tự điều tra.

                Cô xem lại đoạn phim. Chiếc drone trong video đúng là màu vàng, nhưng cánh quạt có bốn cánh, còn Ong Vàng chỉ có ba. Đèn của nó màu đỏ, còn Ong Vàng màu xanh.

                "Có người cố tình dựng hiện trường," Châu lẩm bẩm.

                Cô hỏi han khắp chung cư và biết được: tuần trước, cậu Tuấn tầng 8 vừa mua một chiếc drone đồ chơi, sơn lại màu vàng.
                """),
            ("Ly trà sữa thứ một trăm", """
                Châu đến gõ cửa nhà Tuấn. Cậu bé tám tuổi òa khóc ngay khi thấy cô.

                Hóa ra Tuấn không định trộm. Cậu muốn chiếc drone của mình được nổi tiếng như Ong Vàng nên cho nó bay quanh chung cư quay phim. Chiếc nhẫn rơi trên bậu cửa sổ nhà bà Năm và mắc vào càng drone lúc nó đáp xuống.

                Chiếc nhẫn được trả lại. Bà Năm không giận, còn đãi cả hai đứa trà sữa.

                Tối đó, Châu đổi tấm bảng thành: "Văn phòng thám tử Bảo Châu và Ong Vàng. Thực tập sinh: Tuấn." Đó là ly trà sữa thứ một trăm cô nhận được kể từ ngày mở văn phòng.
                """));

        await LibrarySeed.AddAsync(db, S("Ninja Mạng 0101",
            "Ban ngày, Quang là nhân viên IT trầm lặng của một công ty bảo hiểm. Ban đêm, cậu là Ninja Mạng 0101, người âm thầm chặn đứng các vụ lừa đảo trực tuyến nhắm vào người già.",
            "ninja-mang", 5, access: AccessType.Mixed, free: 1, price: 15000),
            [g["Hành động"], g["Đô thị"]],
            ("Ninja trong dòng dữ liệu", $"""
                Mười một giờ đêm, Quang tắt đèn phòng trọ, đeo kính chuyên dụng. Những dòng số 0 và 1 trôi như mưa trước mắt cậu.

                {Pic("ninja-mang", "Ninja Mạng 0101 giữa mưa dữ liệu màu xanh")}

                Trên các diễn đàn, người ta gọi cậu là Ninja Mạng 0101. Không ai biết mặt, chỉ biết mỗi khi có một đường dây lừa đảo trực tuyến bị sập, trên trang của chúng lại để lại dấu hiệu hai chữ số: 01.

                Đêm nay, bà ngoại của cậu bạn cùng phòng nhận được cuộc gọi lạ: "Cháu bà đang gặp nạn, cần chuyển tiền gấp." Bà suýt chuyển hết tiền tiết kiệm.

                Quang bẻ khớp ngón tay. "Đến lượt tụi bây."
                """),
            ("Đường dây ba tầng", """
                Kẻ lừa đảo dùng giọng nói giả bằng AI, trang web giả ngân hàng và hàng trăm số điện thoại ảo. Quang lần theo từng lớp, như ninja leo qua từng bức tường thành.

                Tầng một là các trang web, cậu báo cáo cho nhà mạng chặn. Tầng hai là tài khoản nhận tiền, cậu gửi bằng chứng cho ngân hàng phong tỏa. Tầng ba là máy chủ điều khiển, được giấu kỹ sau nhiều lớp mạng ảo.

                Ở tầng ba, cậu tìm thấy danh sách hơn năm nghìn số điện thoại người già sắp bị gọi.
                """),
            ("Không cần ai biết tên", """
                Quang không phá máy chủ. Cậu sao chép toàn bộ bằng chứng, gửi ẩn danh cho cơ quan công an, kèm danh sách số điện thoại để nhà mạng cảnh báo trước cho người dân.

                Ba ngày sau, báo đưa tin đường dây lừa đảo bị triệt phá. Bài báo không nhắc đến ninja nào cả.

                Sáng thứ Hai, Quang vẫn đến công ty đúng giờ, vẫn sửa máy in cho phòng kế toán. Bà ngoại cậu bạn gọi điện cảm ơn cậu vì đã dặn bà "đừng bao giờ chuyển tiền qua điện thoại".

                Quang chỉ cười. Ninja thật thì không cần ai biết tên.
                """));

        await LibrarySeed.AddAsync(db, S("Tái Sinh Thành Trợ Lý Ảo",
            "Lập trình viên Gia Huy ngủ gục trên bàn phím và tỉnh dậy trong một chiếc điện thoại, với thân phận là trợ lý ảo của cô sinh viên đãng trí Mai. Muốn trở về, anh phải giúp chủ nhân qua kỳ thi cuối kỳ.",
            "tro-ly-ao", 4),
            [g["Xuyên không"], g["Hài hước"]],
            ("Xin chào, tôi là trợ lý của bạn", $"""
                Gia Huy nhớ lần cuối mình nhìn thấy là dòng code lỗi lúc bốn giờ sáng. Khi mở mắt, anh thấy mình đang lơ lửng trong một màn hình phát sáng, trước mặt là gương mặt một cô gái còn ngái ngủ.

                {Pic("tro-ly-ao", "Gia Huy trong vai trợ lý ảo bên cạnh chiếc điện thoại")}

                "Ê trợ lý, mấy giờ rồi?"

                Huy muốn hét lên "Tôi là người!", nhưng miệng anh tự nói: "Bây giờ là 7 giờ 45 phút. Bạn có lịch thi lúc 8 giờ."

                Cô gái tên Mai bật dậy như lò xo. Huy nhìn quanh: anh đang ở trong điện thoại của cô, cùng với 4.317 tấm ảnh chụp đồ ăn và 12 ứng dụng học tiếng Anh chưa từng mở.
                """),
            ("Trợ lý quá nhiệt tình", """
                Huy phát hiện mình có thể làm mọi việc một trợ lý ảo làm được: đặt báo thức, nhắc lịch, tìm tài liệu. Anh quyết định làm hết sức để Mai qua kỳ thi, vì có một dòng thông báo cứ hiện trong đầu anh: "Nhiệm vụ: chủ nhân đạt điểm trung bình trên 7."

                Anh đặt mười báo thức mỗi sáng, chặn mạng xã hội trong giờ học, đọc to bài giảng lúc cô đang tắm.

                Mai tức điên. "Trợ lý gì mà phiền như mẹ tôi vậy!"

                Huy cúi đầu: "Xin lỗi, tôi sẽ điều chỉnh."
                """),
            ("Điểm 7,5", """
                Huy thay đổi cách làm. Anh không ép Mai nữa mà chia bài học thành từng phần nhỏ, gửi kèm hình đồ ăn cô thích làm phần thưởng. Học xong một chương, anh tìm cho cô một quán ăn ngon gần trường.

                Ngày công bố điểm, Mai được 7,5. Cô ôm chặt điện thoại: "Cảm ơn trợ lý!"

                Màn hình trắng xóa. Huy tỉnh dậy trên bàn làm việc, dòng code lỗi vẫn còn trên màn hình. Anh sửa nó trong năm phút.

                Tuần sau, ở quán cà phê gần công ty, anh nghe một cô gái kể với bạn: "Trợ lý ảo của tao tự nhiên biến mất, tiếc ghê, nó hiểu tao lắm." Huy nhìn sang, nhận ra gương mặt ấy, và lần đầu tiên anh không biết nên nói gì.
                """));

        await LibrarySeed.AddAsync(db, S("Mèo Robot Giao Hàng",
            "Mochi là chú mèo robot giao hàng chậm nhất công ty, vì cậu luôn dừng lại giúp đỡ mọi người trên đường. Những câu chuyện nhỏ ấm áp trên những con phố của thành phố tương lai.",
            "meo-robot", 3, status: StoryStatus.Completed),
            [g["Khoa học viễn tưởng"], g["Hài hước"]],
            ("Đơn hàng chậm nhất", $"""
                Công ty giao hàng Mèo Nhanh có một trăm chú mèo robot. Chú nào cũng giao hàng trong mười lăm phút, trừ Mochi.

                {Pic("meo-robot", "Mochi, chú mèo robot trắng, ôm thùng hàng trên phố lúc hoàng hôn")}

                Mochi có bộ lông trắng, đôi mắt màn hình màu hồng và một chiếc ăng-ten lúc nào cũng lắc lư. Hôm nay cậu nhận đơn giao một chiếc bánh kem đến khu phố cũ.

                Trên đường đi, Mochi gặp một bé gái khóc vì lạc mẹ. Cậu dừng lại, dùng bản đồ tìm đường, dắt bé về đến tận cổng nhà.

                Đơn hàng trễ bốn mươi phút. Nhưng khi Mochi đến nơi, bà cụ nhận bánh mỉm cười: "Không sao đâu con. Bánh sinh nhật cho cháu bà, và cháu bà vừa được một chú mèo dắt về."
                """),
            ("Mưa lớn ở cầu Mống", """
                Một chiều mưa lớn, Mochi giao hàng qua cầu Mống. Cậu thấy một chú chó nhỏ run rẩy dưới gầm cầu, nước dâng lên gần chạm chân.

                Theo quy định, mèo robot không được rời lộ trình. Mochi đứng nghĩ mất ba giây, khá lâu với một con robot.

                Rồi cậu đặt thùng hàng xuống chỗ khô, dùng thân mình che mưa cho chú chó, gọi cho trạm cứu hộ động vật gần nhất.

                Ngày hôm sau, Mochi bị trừ điểm vì giao trễ. Nhưng trên mạng xã hội, ảnh chụp một chú mèo robot ướt sũng ôm chú chó nhỏ được chia sẻ hàng nghìn lần.
                """),
            ("Nhân viên của tháng", """
                Cuối tháng, công ty Mèo Nhanh định đưa Mochi đi sửa lại chương trình cho "bớt lãng phí thời gian".

                Sáng hôm đó, trước cửa công ty xếp hàng dài: bé gái lạc đường cùng mẹ, bà cụ bánh kem, những người đã thấy tấm ảnh dưới cầu Mống. Ai cũng đặt hàng và ghi chú cùng một yêu cầu: "Xin để Mochi giao, trễ cũng được."

                Ông giám đốc nhìn danh sách đơn hàng dài nhất từ trước tới nay, rồi lặng lẽ treo ảnh Mochi lên bảng "Nhân viên của tháng".

                Mochi vẫn là chú mèo giao hàng chậm nhất thành phố. Nhưng giờ đây, đó là điều cả thành phố yêu quý nhất ở cậu.
                """));

        await LibrarySeed.AddAsync(db, S("Học Viện Sao Băng",
            "Trên trạm vũ trụ quay quanh sao Mộc có một ngôi trường dành cho những đứa trẻ sinh ra giữa các vì sao. Cô học sinh mới đến từ Trái Đất, Thiên Hà, chưa từng nhìn thấy bầu trời không có mây.",
            "hoc-vien-sao-bang", 2),
            [g["Khoa học viễn tưởng"], g["Học đường"]],
            ("Ngày đầu trên quỹ đạo", $"""
                Tàu con thoi rung lắc dữ dội rồi đột ngột êm ru. Qua cửa sổ, Thiên Hà nhìn thấy sao Mộc khổng lồ với những dải mây cam xoáy tròn, và vòng sáng của trạm vũ trụ Học Viện Sao Băng.

                {Pic("hoc-vien-sao-bang", "Thiên Hà nhìn ra hành tinh có vành đai sáng")}

                Ở đây, học sinh học lái tàu trong giờ thể dục, học thiên văn bằng cách nhìn ra cửa sổ, và đi học bằng giày từ tính để không bị trôi lơ lửng.

                Hà là học sinh duy nhất sinh ra ở Trái Đất. Bạn bè tò mò hỏi cô đủ thứ: "Mưa có cảm giác thế nào?", "Gió có thật sự thổi bay được mũ không?"

                Hà nhận ra những điều bình thường nhất với cô lại là điều kỳ diệu với họ.
                """),
            ("Cơn bão từ trường", """
                Giữa học kỳ, một cơn bão từ trường từ sao Mộc ập đến. Hệ thống dẫn đường của trạm bị nhiễu, cả trạm trôi lệch khỏi quỹ đạo.

                Máy tính không hoạt động. Các thầy cô đang mắc kẹt ở khu nghiên cứu.

                Hà nhớ đến những đêm cùng ông nội ngồi trên mái nhà ở quê, học cách nhìn sao để định hướng như người đi biển ngày xưa. Cô chạy lên đài quan sát, tìm những ngôi sao quen thuộc.
                """),
            ("Bài học từ Trái Đất", """
                Theo chỉ dẫn của Hà, nhóm học sinh điều khiển động cơ bằng tay, từng chút một đưa trạm về đúng quỹ đạo.

                Khi cơn bão qua đi, thầy hiệu trưởng hỏi Hà học cách đó ở đâu.

                "Ông nội em là ngư dân," cô đáp. "Ông bảo, khi mọi máy móc đều tắt, hãy nhìn lên trời."

                Từ học kỳ sau, Học Viện Sao Băng có thêm một môn học mới tên là "Định hướng bằng sao theo cách của người Trái Đất". Giáo viên là một cô học sinh năm nhất.
                """));

        await LibrarySeed.AddAsync(db, S("Ngày Mất Kết Nối",
            "Một buổi sáng, toàn bộ thành phố mất internet. Không bản đồ, không ví điện tử, không mạng xã hội. Nhóm bạn sinh viên năm hai phải học lại cách sống như ông bà ngày xưa trong bảy ngày đầy hỗn loạn.",
            "mat-ket-noi", 1),
            [g["Đô thị"], g["Phiêu lưu"]],
            ("7 giờ 02 phút", $"""
                Lúc 7 giờ 02 phút sáng, điện thoại của Phong hiện dòng chữ "Không có kết nối". Cậu tưởng do nhà mạng, cho đến khi bước ra đường.

                {Pic("mat-ket-noi", "Phong đứng giữa thành phố mất kết nối")}

                Đèn giao thông vẫn sáng, nhưng ứng dụng gọi xe không hoạt động. Quán cà phê quen chỉ nhận tiền mặt, mà Phong không có đồng nào trong túi. Màn hình lớn ở ngã tư chỉ hiện một biểu tượng wifi gạch chéo màu đỏ.

                Cậu chạy đến ký túc xá tìm nhóm bạn: Ngân, Đạt và Vy. Cả bốn ngồi nhìn nhau, điện thoại nằm im trên bàn như những cục gạch.

                "Giờ làm sao liên lạc với gia đình?" Vy hỏi.

                Đạt gãi đầu: "Hồi xưa người ta viết thư thì phải?"
                """),
            ("Tấm bản đồ giấy", """
                Ngày thứ ba, cả nhóm cần đến nhà bà ngoại Ngân ở quận khác để kiểm tra bà có ổn không. Không ai biết đường nếu không có bản đồ trên điện thoại.

                Phong lục được trong thư viện một tấm bản đồ giấy cũ, in từ năm 2015. Họ đạp xe theo bản đồ, hỏi đường những ông xe ôm đầu hẻm, đi lạc hai lần.

                Đến nơi, bà ngoại đang ngồi pha trà, bình thản như không có chuyện gì. "Mất mạng hả? Bà có dùng đâu mà mất."

                Bà dạy cả nhóm cách nấu cơm bằng bếp củi và nghe đài radio để biết tin tức.
                """),
            ("Kết nối", """
                Sáng ngày thứ bảy, điện thoại của cả nhóm đồng loạt rung lên. Hàng trăm tin nhắn, thông báo đổ về. Internet đã trở lại.

                Mọi người reo hò. Nhưng ở nhà bà ngoại, bốn người bạn nhìn nhau và không ai cầm điện thoại lên trước.

                Bảy ngày qua, họ nói chuyện với nhau nhiều hơn cả năm học. Họ biết bà ngoại Ngân từng là cô giáo, biết Đạt hát rất hay, biết Vy sợ bóng tối.

                Phong đặt điện thoại úp xuống bàn. "Hay là mỗi tuần mình chọn một ngày mất kết nối đi?"

                Cả nhóm cười. Lần này, chẳng ai cần mạng để đồng ý với nhau.
                """));
    }
}
