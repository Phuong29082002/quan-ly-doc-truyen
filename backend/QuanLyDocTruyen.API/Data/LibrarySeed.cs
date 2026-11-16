using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Data;

/// <summary>
/// Thư viện truyện mẫu có chữ và tranh minh họa, dùng tác phẩm và tranh đã hết bản quyền (phạm vi công cộng):
/// - Truyền thuyết, cổ tích Việt Nam (văn học dân gian) kể lại bằng lời của nhóm, tranh dân gian Đông Hồ
/// - "A Scandal in Bohemia" (Arthur Conan Doyle, 1891) phỏng dịch, tranh Sidney Paget trên tạp chí The Strand
/// - Truyện dân gian Nhật Bản Momotaro, tranh khắc gỗ năm 1885 và tranh Arthur Rackham (1916)
/// Ảnh nằm trong wwwroot/library, nguồn ảnh ghi trong docs/NGUON_ANH.md.
/// </summary>
public static class LibrarySeed
{
    private const string Img = "/library/";

    public static async Task SeedAsync(AppDbContext db)
    {
        var genres = await EnsureGenresAsync(db, "Cổ tích", "Lịch sử", "Phiêu lưu", "Trinh thám");
        var now = DateTime.UtcNow;

        await AddAsync(db, new Story
        {
            Title = "Truyền Thuyết Nước Nam",
            Author = "Dân gian Việt Nam",
            Description = "Năm câu chuyện truyền thuyết và cổ tích quen thuộc của người Việt: Thánh Gióng đánh giặc Ân, Hai Bà Trưng khởi nghĩa, sự tích Táo Quân, cá chép vượt Vũ Môn và cậu bé chăn trâu thành trạng nguyên. Mỗi chương có một bức tranh dân gian Đông Hồ.",
            Status = StoryStatus.Completed,
            AccessType = AccessType.Free,
            CoverUrl = Img + "phu-dong.jpg",
            CreatedAt = now.AddDays(-12),
            UpdatedAt = now.AddHours(-5),
        }, [genres["Cổ tích"], genres["Lịch sử"]],
        ("Thánh Gióng", $"""
            Đời Hùng Vương thứ sáu, ở làng Phù Đổng có hai vợ chồng ông lão nghèo, chăm làm ăn và hay làm việc thiện, nhưng mãi chưa có con.

            Một hôm bà lão ra đồng, thấy một vết chân rất to in trên mặt ruộng. Bà tò mò đặt bàn chân mình vào ướm thử. Về nhà ít lâu thì bà có mang, mười hai tháng sau sinh được một cậu con trai khôi ngô.

            Lạ thay, cậu bé lên ba tuổi mà vẫn không biết nói, không biết cười, đặt đâu nằm đấy. Hai ông bà buồn lắm, chỉ biết thương con mà chăm.

            Bấy giờ giặc Ân kéo đến xâm lược, thế mạnh như chẻ tre. Nhà vua sai sứ giả đi khắp nơi tìm người tài giỏi cứu nước. Nghe tiếng sứ giả rao ngoài ngõ, cậu bé bỗng cất tiếng nói đầu tiên: "Mẹ ra mời sứ giả vào đây cho con."

            Sứ giả vào, cậu bé nói: "Ông về tâu với vua, sắm cho ta một con ngựa sắt, một cái roi sắt và một tấm áo giáp sắt, ta sẽ đánh tan lũ giặc này."

            Từ hôm ấy, cậu lớn nhanh như thổi, cơm ăn mấy cũng không no, áo vừa mặc xong đã chật. Hai ông bà làm không đủ nuôi, bà con trong làng vui lòng góp gạo nuôi cậu, ai cũng mong cậu giết giặc cứu nước.

            ![Tranh Đông Hồ: Phù Đổng Thiên Vương cưỡi ngựa sắt đánh giặc Ân]({Img}phu-dong.jpg)

            Khi sứ giả mang ngựa sắt, roi sắt, giáp sắt đến, cậu vươn vai một cái thành tráng sĩ mình cao hơn trượng. Tráng sĩ mặc giáp, cầm roi, nhảy lên lưng ngựa. Ngựa hí vang, phun lửa, phi thẳng đến nơi có giặc.

            Tráng sĩ đánh giặc chết như rạ. Roi sắt gãy, tráng sĩ nhổ những cụm tre bên đường quật vào giặc. Giặc tan vỡ, giẫm đạp lên nhau mà chạy.

            Đánh giặc xong, tráng sĩ một mình một ngựa lên đỉnh núi Sóc, cởi áo giáp sắt để lại rồi cả người lẫn ngựa từ từ bay lên trời.

            Vua nhớ công ơn, phong là Phù Đổng Thiên Vương và lập đền thờ ngay ở quê nhà. Người ta kể rằng những bụi tre đằng ngà ở làng Gióng ngả màu vàng óng là vì bị ngựa sắt phun lửa vào, còn những ao hồ liên tiếp là dấu chân ngựa để lại.
            """),
        ("Hai Bà Trưng", $"""
            Thời ấy nước ta bị nhà Hán đô hộ. Thái thú Tô Định tham lam tàn bạo, dân chúng khắp nơi lầm than, oán hận.

            Ở huyện Mê Linh có hai chị em Trưng Trắc và Trưng Nhị, con gái của Lạc tướng. Hai bà từ nhỏ đã giỏi võ nghệ, thông binh thư, lại thương dân như ruột thịt.

            Chồng bà Trưng Trắc là Thi Sách, cũng là người có chí lớn, bị Tô Định giết hại để răn đe những ai dám chống đối. Nợ nước thù nhà dồn lại, hai bà quyết dựng cờ khởi nghĩa.

            Mùa xuân năm 40, tại cửa sông Hát, hai bà làm lễ tế cờ và đọc lời thề: một xin rửa sạch nước thù, hai xin đem lại nghiệp xưa họ Hùng, ba kẻo oan ức lòng chồng, bốn xin vẻn vẹn sở công lênh này.

            ![Tranh Đông Hồ: Hai Bà Trưng cưỡi voi ra trận]({Img}hai-ba-trung.jpg)

            Hai bà cưỡi voi ra trận, theo sau là nghĩa quân đông như kiến cỏ. Nhiều nữ tướng tài giỏi như bà Lê Chân, bà Thánh Thiên, bà Phùng Thị Chính cùng kéo quân về hội. Chỉ trong thời gian ngắn, nghĩa quân hạ được sáu mươi lăm thành. Tô Định hoảng sợ, phải cắt tóc cạo râu, bỏ ấn tín trốn về nước.

            Bà Trưng Trắc được tôn lên làm vua, đóng đô ở Mê Linh, miễn thuế hai năm cho dân. Đất nước được hưởng những ngày tự chủ sau bao năm bị đô hộ.

            Ba năm sau, nhà Hán sai Mã Viện đem đại quân sang. Hai bà chỉ huy nghĩa quân chống cự quyết liệt. Thế giặc quá mạnh, hai bà không chịu để rơi vào tay giặc, đã gieo mình xuống dòng sông Hát mà tuẫn tiết.

            Nhớ ơn hai bà, nhân dân lập đền thờ ở nhiều nơi. Đến nay, đền Hai Bà Trưng ở Hà Nội và đền Hát Môn ở quê hương khởi nghĩa vẫn hương khói quanh năm.
            """),
        ("Sự tích Táo Quân", $"""
            Ngày xưa có hai vợ chồng nghèo là Trọng Cao và Thị Nhi. Lấy nhau đã lâu mà không có con, hai người sinh ra buồn chán, hay cãi cọ.

            Một hôm, giận quá, Trọng Cao đánh vợ. Thị Nhi tủi thân bỏ nhà ra đi, lang thang đến một làng xa. Ở đó nàng gặp Phạm Lang, một người hiền lành chất phác, rồi hai người nên vợ nên chồng.

            Còn Trọng Cao, hết giận thì hối hận vô cùng. Anh bỏ nhà đi khắp nơi tìm vợ. Tiền mang theo hết, anh phải đi ăn xin qua ngày.

            Một hôm, anh đến xin ăn đúng nhà Thị Nhi. Nàng nhận ra chồng cũ, động lòng thương, mời vào nhà cho ăn uống tử tế. Đúng lúc ấy Phạm Lang đi làm đồng về. Sợ chồng mới hiểu lầm, Thị Nhi vội bảo Trọng Cao nấp vào đống rơm sau bếp.

            Phạm Lang về nhà, đem đống rơm ra đốt để lấy tro bón ruộng, không biết có người nấp bên trong. Thấy lửa bốc lên, Thị Nhi hốt hoảng lao vào cứu, rồi cũng bị lửa thiêu. Phạm Lang thương vợ, cũng nhảy vào lửa chết theo.

            ![Tranh Đông Hồ: Táo Quân, hai ông một bà ngồi trên bàn thờ]({Img}ong-tao.jpg)

            Ngọc Hoàng thương cảm ba người sống có tình có nghĩa, phong cho họ làm Táo Quân, trông coi việc bếp núc của mỗi nhà: Phạm Lang là Thổ Công trông coi việc bếp, Trọng Cao là Thổ Địa trông coi việc nhà, Thị Nhi là Thổ Kỳ trông coi việc chợ búa.

            Hằng năm, đến ngày hai mươi ba tháng Chạp, Táo Quân cưỡi cá chép bay về trời báo cáo với Ngọc Hoàng mọi chuyện tốt xấu trong nhà. Vì thế người Việt có tục cúng ông Công ông Táo, thả cá chép ra sông hồ để tiễn ông Táo lên trời, cầu mong một năm mới bình an.
            """),
        ("Cá chép vượt Vũ Môn", $"""
            Ngày xưa, dưới đáy biển sâu có vô số loài cá. Ai cũng mong một ngày được hóa rồng, bay lên trời cao.

            Ngọc Hoàng bèn ra lệnh mở một cuộc thi. Ở cửa Vũ Môn có ba tầng thác dựng đứng, nước đổ xuống ầm ầm quanh năm. Loài nào vượt qua được cả ba tầng thác thì sẽ được hóa thành rồng.

            ![Tranh Đông Hồ: Lý ngư vọng nguyệt, cá chép ngắm trăng]({Img}ly-ngu-vong-nguyet.jpg)

            Đến ngày thi, các loài cá kéo đến đông nghịt. Cá rô cố nhảy, mới qua tầng thứ nhất đã bị nước đánh rơi xuống. Cá trắm, cá chuối, cá mè, con nào cũng vẫy vùng một hồi rồi bỏ cuộc. Tôm nhảy giật lùi, càng nhảy càng xa. Cua ngang nhiên bò lên, đến lưng chừng thì bị thác cuốn phăng.

            Chỉ có cá chép là không nản. Lần thứ nhất thất bại, cá chép nghỉ một chút rồi lấy đà nhảy tiếp. Vây rách, vảy tróc, mình đầy thương tích, cá chép vẫn kiên trì nhảy lên từng tầng thác một.

            Cuối cùng, cá chép vượt qua tầng thác thứ ba. Mây kéo đến che phủ, sấm chớp nổi lên, thân cá dài ra, mọc sừng, mọc chân, hóa thành một con rồng uy nghi bay vút lên trời xanh.

            ![Tranh Đông Hồ: cá chép]({Img}ca-chep.jpg)

            Từ đó, người xưa dùng hình ảnh "cá chép hóa rồng" để nói về người học trò chăm chỉ, vượt qua bao khó khăn để thi đỗ, làm nên sự nghiệp. Tranh cá chép cũng trở thành món quà Tết quen thuộc, gửi gắm lời chúc thành công và may mắn.
            """),
        ("Cậu bé chăn trâu đỗ trạng nguyên", $"""
            Ở làng Lũng Động, huyện Chí Linh, có cậu bé tên Mạc Đĩnh Chi. Nhà nghèo, cha mất sớm, cậu phải đi chăn trâu thuê cho nhà giàu trong làng để kiếm sống cùng mẹ.

            Cậu bé người nhỏ thó, mặt mũi xấu xí, nhưng thông minh lạ thường. Mỗi lần dắt trâu qua lớp học của thầy đồ, cậu lại đứng nép ngoài cửa nghe giảng bài, nghe đến đâu thuộc đến đó.

            ![Tranh Đông Hồ: Mục đồng đọc sách, cậu bé ngồi trên lưng trâu đọc sách]({Img}muc-dong-doc-sach.jpg)

            Không có tiền mua giấy bút, cậu lấy que viết chữ xuống đất, lấy lá chuối làm giấy. Ngồi trên lưng trâu, cậu vẫn ôm cuốn sách cũ thầy đồ cho mượn mà đọc. Đêm đến nhà không có dầu thắp đèn, cậu bắt đom đóm bỏ vào vỏ trứng để lấy ánh sáng mà học.

            Thầy đồ thấy cậu ham học thì thương, nhận cho vào lớp không lấy tiền. Chẳng bao lâu, cậu học giỏi nhất lớp, câu đối nào thầy ra cậu cũng đối được ngay.

            Năm hai mươi tuổi, Mạc Đĩnh Chi đi thi và đỗ trạng nguyên. Khi vào triều, vua thấy ông người thấp bé, xấu xí thì có ý không muốn cho đỗ đầu. Ông bèn làm bài phú "Ngọc tỉnh liên", ví mình như bông sen trong giếng ngọc: tuy mọc ở nơi khuất mà hương thơm vẫn tỏa ngát. Vua đọc xong, phục tài, giữ nguyên ngôi trạng nguyên.

            Về sau ông được cử đi sứ phương Bắc, dùng tài ứng đối làm cho vua quan nước người phải kính nể, được phong là "Lưỡng quốc trạng nguyên", trạng nguyên của cả hai nước.

            Câu chuyện cậu bé chăn trâu học bằng ánh đom đóm đến nay vẫn được kể cho trẻ em nghe như một tấm gương về lòng ham học.
            """));

        await AddAsync(db, new Story
        {
            Title = "Sherlock Holmes: Vụ Bê Bối Xứ Bohemia",
            Author = "Arthur Conan Doyle",
            Description = "Một vị khách đeo mặt nạ tìm đến phố Baker với lời nhờ vả kỳ lạ: lấy lại tấm ảnh có thể làm đổ vỡ cả một cuộc hôn nhân hoàng gia. Đối thủ lần này là người phụ nữ duy nhất từng khiến Sherlock Holmes phải nể phục. Bản phỏng dịch tiếng Việt, tranh minh họa gốc của Sidney Paget (1891).",
            Status = StoryStatus.Completed,
            AccessType = AccessType.Mixed,
            FreeChapterCount = 2,
            Price = 15000,
            CoverUrl = Img + "holmes-vi-khach.jpg",
            CreatedAt = now.AddDays(-9),
            UpdatedAt = now.AddHours(-2),
        }, [genres["Trinh thám"]],
        ("Vị khách đeo mặt nạ", $"""
            Với Sherlock Holmes, cô ấy luôn là "người phụ nữ ấy". Tôi hiếm khi nghe anh gọi cô bằng tên nào khác.

            Sau khi lấy vợ, tôi ít khi gặp lại Holmes. Một tối tháng Ba năm 1888, trên đường đi thăm bệnh nhân về, tôi đi ngang phố Baker và không cưỡng được ý muốn ghé lại căn phòng quen thuộc. Cửa sổ sáng đèn, bóng anh đi qua đi lại, đầu cúi, tay chắp sau lưng. Tôi hiểu anh lại đang có việc.

            ![Holmes đứng trước lò sưởi, bác sĩ Watson ngồi trong ghế bành]({Img}holmes-ben-lo-suoi.jpg)

            Holmes không nói nhiều, chỉ đưa tay mời tôi ngồi rồi đứng trước lò sưởi nhìn tôi chăm chú. "Hôn nhân hợp với anh đấy, Watson. Anh tăng bảy pound rưỡi kể từ lần gặp trước. Anh lại hành nghề y. Gần đây anh bị ướt mưa, và cô người làm nhà anh rất vụng về."

            Tôi sững sờ. Holmes cười, chỉ vào chiếc giày trái của tôi: sáu vết xước song song trên da, dấu vết của một người cạo bùn cẩu thả. Còn mùi thuốc sát trùng, vết bạc nitrat trên ngón tay và chỗ phồng trên mũ nơi tôi giấu ống nghe thì đã nói lên nghề nghiệp của tôi.

            "Anh nhìn nhưng không quan sát, Watson. Anh đã bước lên cầu thang dẫn vào phòng này hàng trăm lần. Có bao nhiêu bậc?"

            "Tôi không biết."

            "Mười bảy bậc. Tôi biết, vì tôi vừa nhìn vừa quan sát."

            Anh đưa tôi một lá thư không ký tên, viết trên giấy hồng dày. Lá thư báo rằng tối nay, đúng tám giờ kém mười lăm, sẽ có một vị khách đến hỏi ý kiến anh về một việc hệ trọng, và vị khách có thể sẽ đeo mặt nạ.

            ![Holmes soi kỹ nét chữ và tờ giấy dưới ánh đèn]({Img}holmes-la-thu.jpg)

            Holmes giơ tờ giấy lên ánh đèn. Trong thớ giấy hiện ra hình chữ "Eg", "P" và "Gt". "Giấy sản xuất ở Bohemia," anh nói. "Và người viết là người Đức: không người Pháp hay người Nga nào lại đặt động từ ở cuối câu như vậy."

            Ngoài đường vang lên tiếng vó ngựa và bánh xe nghiến trên lề đá. Một cỗ xe sang trọng dừng trước cửa. Tiếng bước chân nặng nề lên cầu thang, rồi một tiếng gõ cửa dứt khoát.

            ![Vị khách cao lớn đeo mặt nạ đen bước vào phòng]({Img}holmes-vi-khach.jpg)

            Người bước vào cao gần hai mét, vạm vỡ, mặc áo choàng viền lông, đi đôi ủng cao tới bắp chân. Trên mặt ông ta là chiếc mặt nạ đen che từ trán xuống tận gò má. Ông tự giới thiệu là bá tước Von Kramm, đến thay mặt cho một nhân vật có thế lực bậc nhất châu Âu.
            """),
        ("Lời thú nhận của nhà vua", $"""
            Holmes ngả người trong ghế bành, mắt lim dim như sắp ngủ. "Nếu Bệ hạ vui lòng kể đầu đuôi câu chuyện, tôi sẽ dễ giúp hơn."

            Vị khách bật dậy, đi đi lại lại một hồi rồi giật phăng chiếc mặt nạ xuống đất. "Ông nói đúng. Ta là nhà vua. Việc gì phải che giấu nữa?"

            ![Nhà vua giật chiếc mặt nạ khỏi mặt]({Img}holmes-mat-na.jpg)

            "Wilhelm Gottsreich Sigismond von Ormstein, đại công tước Cassel-Felstein, vua kế vị xứ Bohemia," Holmes nói chậm rãi. "Tôi đã đoán ra từ lúc Bệ hạ bước vào."

            Nhà vua kể rằng năm năm trước, khi còn là thái tử, ông quen một ca sĩ opera tên Irene Adler. Nay ông sắp cưới công chúa nước Scandinavia, một gia đình hoàng tộc cực kỳ khắt khe. Chỉ cần một chút nghi ngờ về quá khứ của ông, hôn sự sẽ đổ vỡ.

            "Cô ta giữ một tấm ảnh chụp chung với ta," nhà vua nói. "Cô ta dọa sẽ gửi cho gia đình công chúa vào đúng ngày công bố hôn ước, tức là thứ Hai tới."

            "Bệ hạ đã thử lấy lại chưa?"

            "Năm lần. Hai lần ta thuê người đột nhập nhà cô ta. Một lần chặn hành lý khi cô ta đi đường. Hai lần cho người chặn đường cô ta. Không có kết quả."

            Holmes bật cười. "Một vụ thú vị đấy. Địa chỉ của cô ấy?"

            "Biệt thự Briony, đại lộ Serpentine, khu St. John's Wood."

            Nhà vua để lại một nghìn bảng tiền vàng và giấy bạc để Holmes chi tiêu, rồi ra về. Holmes nhìn theo cỗ xe, xoa tay. "Watson, ba giờ chiều mai anh ghé đây nhé. Tôi muốn bàn với anh chuyện nhỏ này."
            """),
        ("Người giữ ngựa say rượu", $"""
            Ba giờ chiều hôm sau tôi có mặt, nhưng Holmes chưa về. Gần bốn giờ, một gã giữ ngựa say khướt, râu ria xồm xoàm, mặt đỏ gay, quần áo lôi thôi bước vào phòng. Tôi phải nhìn ba lần mới nhận ra đó chính là bạn tôi.

            ![Holmes cải trang thành người giữ ngựa say rượu]({Img}holmes-gia-trang.jpg)

            Holmes vào phòng ngủ, năm phút sau trở ra trong bộ đồ tề chỉnh, rồi cười đến mức phải ngồi phịch xuống ghế.

            "Tôi đã đến chuồng ngựa sau biệt thự Briony, giúp mấy người giữ ngựa chải lông, và đổi lại có mấy ly rượu cùng đủ thứ chuyện về cô Adler. Cô ấy sống lặng lẽ, đi hát ở các buổi hòa nhạc, chiều nào cũng về lúc năm giờ. Chỉ có một người đàn ông hay đến thăm: luật sư Godfrey Norton."

            Đang theo dõi thì Holmes thấy chính Norton hối hả lao ra khỏi nhà, nhảy lên xe ngựa và quát người đánh xe chạy đến nhà thờ Thánh Monica. Ít phút sau, cô Adler cũng vội vã lên xe đi theo. Holmes nhảy lên một chiếc xe khác bám theo.

            "Nhà thờ vắng tanh, chỉ có hai người họ và một linh mục. Tôi vừa bước vào thì Norton chạy tới nắm tay tôi: Ơn trời! Anh đến thật đúng lúc! Lại đây, lại đây!"

            ![Holmes bất đắc dĩ làm người chứng hôn trong nhà thờ]({Img}holmes-dam-cuoi.jpg)

            "Họ cần một người làm chứng để hôn lễ hợp lệ. Thế là tôi, trong bộ dạng gã giữ ngựa, đứng lẩm bẩm những câu đáp lễ mà không hiểu mình đang nói gì, và giúp cô Irene Adler cùng ngài Godfrey Norton thành vợ chồng."

            Holmes nghiêm mặt lại. "Hôn lễ vừa xong, hai người chia tay ở cửa nhà thờ. Tôi nghe cô ấy nói vẫn sẽ ra công viên lúc năm giờ như thường lệ. Họ có thể rời nước Anh ngay. Chúng ta phải hành động tối nay, và tôi cần anh giúp, Watson. Anh có ngại phạm pháp một chút không?"

            "Không hề, nếu vì việc tốt."
            """),
        ("Màn kịch trước biệt thự Briony", $"""
            Kế hoạch của Holmes rất đơn giản. Anh sẽ đóng vai một mục sư hiền lành, tìm cách được đưa vào phòng khách nhà cô Adler. Khi anh giơ tay ra hiệu ở cửa sổ, tôi sẽ ném một ống khói vào nhà và hô to "Cháy!".

            "Khi nghĩ nhà mình bị cháy, người ta sẽ lao ngay đến thứ quý giá nhất," Holmes giải thích. "Người mẹ ôm con, người độc thân lấy hộp nữ trang. Cô Adler chắc chắn sẽ chạy đến chỗ giấu tấm ảnh. Tôi chỉ cần nhìn cho kỹ."

            Bảy giờ tối, chúng tôi có mặt trên đại lộ Serpentine. Con phố nhỏ đông người lạ thường: mấy gã đàn ông ăn mặc tồi tàn hút thuốc ở góc phố, một người mài dao kéo, hai người lính gác trêu chọc cô bảo mẫu.

            Cỗ xe của cô Adler vừa dừng trước cửa, đám người lập tức xô vào tranh nhau mở cửa xe kiếm tiền boa, rồi đánh nhau loạn xạ. Holmes lao vào đám đông để che cho cô Adler, bỗng kêu lên một tiếng rồi ngã gục xuống đất, máu chảy ròng ròng trên mặt.

            ![Đám đông xô xát trước cửa biệt thự Briony, Holmes ngã xuống]({Img}holmes-nga.jpg)

            Thấy vị mục sư bị thương vì bảo vệ mình, cô Adler vội cho người khiêng ông vào phòng khách. Tôi đứng bên ngoài cửa sổ, tay nắm chặt ống khói. Vài phút sau, bàn tay Holmes giơ lên.

            Tôi ném ống khói vào nhà và hét to: "Cháy!". Cả đám đông đồng thanh hô theo. Khói cuồn cuộn tràn ra cửa sổ. Một lát sau, giọng Holmes vang lên trấn an mọi người rằng chỉ là báo động nhầm.

            Mười phút sau, Holmes khoác tay tôi rời khỏi con phố ồn ào. "Anh làm tốt lắm, Watson. Tấm ảnh nằm sau một tấm ván trượt ngay trên chuông gọi người hầu. Cô ấy chạy đến đó, kéo ra được một nửa thì thấy tôi đang nhìn, liền đẩy lại."

            "Đám người đánh nhau ngoài đường thì sao?"

            "Tôi thuê cả đấy. Máu trên mặt tôi là sơn đỏ." Anh mỉm cười. "Sáng mai chúng ta sẽ cùng nhà vua đến lấy tấm ảnh, trước khi cô ấy kịp dậy."

            Về đến phố Baker, Holmes đang lục chìa khóa thì một người trẻ tuổi mặc áo khoác dài đi ngang qua, cất tiếng: "Chúc ngủ ngon, ông Sherlock Holmes."

            Holmes nhìn quanh con phố tối. "Tôi đã nghe giọng nói này ở đâu rồi nhỉ?"
            """),
        ("Người phụ nữ ấy", $"""
            Sáng hôm sau, nhà vua cùng chúng tôi đến biệt thự Briony. Một bà quản gia đứng ở bậc cửa nhìn chúng tôi với vẻ mỉa mai.

            "Ông Sherlock Holmes phải không ạ? Bà chủ dặn ông sẽ đến. Bà ấy đã cùng chồng rời nước Anh bằng chuyến tàu sáng nay."

            Holmes lao vào phòng khách, kéo tấm ván trên chuông gọi người hầu. Bên trong chỉ có một tấm ảnh cô Irene Adler mặc dạ phục và một lá thư gửi "Ông Sherlock Holmes, giữ lại đến khi ông tới".

            Lá thư viết: "Ông Sherlock Holmes thân mến. Ông diễn thật xuất sắc, tôi hoàn toàn bị lừa. Nhưng khi ống khói được ném vào, tôi biết mình vừa để lộ chỗ giấu. Tôi đã được cảnh báo về ông từ nhiều tháng trước. Tôi cũng là diễn viên, quen mặc đồ nam để đi lại cho tự do. Tôi cải trang đi theo ông về tận phố Baker để chắc chắn rằng mình thật sự đang đối mặt với Sherlock Holmes lừng danh, rồi dại dột chúc ông ngủ ngon."

            ![Người thanh niên lạ mặt chúc Holmes ngủ ngon trên phố Baker]({Img}holmes-chuc-ngu-ngon.jpg)

            "Chồng tôi và tôi quyết định rời đi khi bị một đối thủ như ông theo đuổi. Xin nhà vua cứ yên tâm. Tôi đã yêu và được yêu bởi một người tốt hơn ông ấy. Tôi sẽ giữ tấm ảnh chỉ để tự bảo vệ mình. Tôi để lại một tấm ảnh khác mà có lẽ ngài sẽ muốn giữ. Irene Norton, nhũ danh Adler."

            "Thật là một người phụ nữ!" nhà vua thốt lên. "Ta đã nói với các ông cô ấy thông minh và quyết đoán thế nào. Lẽ ra cô ấy đã là một hoàng hậu tuyệt vời. Tiếc là cô ấy không cùng đẳng cấp với ta."

            "Theo những gì tôi thấy, cô ấy quả thật ở một đẳng cấp rất khác với Bệ hạ," Holmes đáp lạnh lùng. "Tôi rất tiếc đã không đem lại kết quả tốt hơn."

            Nhà vua muốn tặng Holmes một chiếc nhẫn ngọc lục bảo. Holmes từ chối, chỉ xin giữ lại tấm ảnh của cô Irene Adler.

            Câu chuyện là như thế. Một vụ bê bối có thể làm rung chuyển cả xứ Bohemia đã được ngăn chặn, và những mưu kế hay nhất của Sherlock Holmes đã bị đánh bại bởi sự thông minh của một người phụ nữ. Anh từng hay chế giễu sự khôn ngoan của phụ nữ, nhưng từ đó tôi không còn nghe anh nói vậy nữa. Mỗi khi nhắc đến Irene Adler, hay tấm ảnh của cô, anh luôn gọi bằng danh xưng trân trọng: người phụ nữ ấy.
            """));

        await AddAsync(db, new Story
        {
            Title = "Momotaro, Cậu Bé Quả Đào",
            Author = "Dân gian Nhật Bản",
            Description = "Truyện cổ tích nổi tiếng nhất nước Nhật: cậu bé sinh ra từ quả đào khổng lồ cùng chú chó, chú khỉ và chú chim trĩ vượt biển lên đảo quỷ. Tranh khắc gỗ Nhật Bản năm 1885 và tranh minh họa của Arthur Rackham.",
            Status = StoryStatus.Completed,
            AccessType = AccessType.Free,
            CoverUrl = Img + "momotaro-1885.jpg",
            CreatedAt = now.AddDays(-6),
            UpdatedAt = now.AddHours(-8),
        }, [genres["Cổ tích"], genres["Phiêu lưu"]],
        ("Quả đào trôi sông", $"""
            Ngày xửa ngày xưa, ở một ngôi làng nhỏ bên chân núi nước Nhật, có hai ông bà lão sống hiền lành. Sáng nào ông lão cũng lên núi đốn củi, còn bà lão ra suối giặt đồ.

            Một buổi sáng, bà lão đang giặt thì thấy một quả đào to chưa từng thấy trôi bồng bềnh theo dòng nước, "đùng đoành, đùng đoành". Bà vớt quả đào lên, ôm về nhà, định chờ ông về cùng ăn.

            Tối đó, ông lão vừa giơ dao định bổ, quả đào bỗng tự tách làm đôi. Từ bên trong, một cậu bé bụ bẫm nhảy ra, khóc oe oe.

            Hai ông bà mừng rỡ vì cả đời mong có con. Họ đặt tên cậu là Momotaro, nghĩa là "cậu bé quả đào". Momotaro ăn một bát cơm lớn một gang, ăn hai bát lớn hai gang, chẳng mấy chốc đã thành một chàng trai khỏe mạnh, tốt bụng và dũng cảm.

            Bấy giờ, ngoài biển xa có hòn đảo Onigashima, nơi lũ quỷ sừng đỏ sừng xanh sinh sống. Chúng hay vượt biển vào cướp bóc lúa gạo, vàng bạc của dân làng, ai cũng sợ hãi.

            Một hôm Momotaro thưa với cha mẹ: "Con sẽ lên đảo quỷ, trừng trị lũ quỷ và lấy lại của cải cho dân làng."

            Hai ông bà thương con nhưng biết không cản được. Bà lão làm cho cậu một túi bánh kibi dango, loại bánh bột kê ngon nhất nước Nhật, buộc vào lưng cậu. Ông lão trao cho cậu thanh kiếm và lá cờ có hàng chữ "Đệ nhất Nhật Bản".
            """),
        ("Ba người bạn đường", $"""
            Momotaro đi được một quãng thì gặp một chú chó trắng.

            "Momotaro, Momotaro, cậu đi đâu đấy?"

            "Tôi lên đảo quỷ trừng trị lũ quỷ."

            "Cậu mang theo gì trong túi vậy?"

            "Bánh kibi dango ngon nhất nước Nhật."

            "Cho tôi một cái, tôi sẽ đi cùng cậu."

            Momotaro chia cho chú chó một chiếc bánh. Chú chó ăn xong, vẫy đuôi đi theo.

            Đi tiếp vào rừng, hai bạn gặp một chú khỉ đang chuyền cành. Chú khỉ cũng hỏi y như vậy, nhận một chiếc bánh và nhập đoàn. Chó và khỉ vốn không ưa nhau, vừa đi vừa gầm gừ, Momotaro phải đi giữa để can.

            Ra đến cánh đồng, một chú chim trĩ sặc sỡ sà xuống. "Momotaro, cho tôi một chiếc bánh, tôi sẽ bay trước dò đường cho cậu." Thế là đoàn có thêm người bạn thứ ba.

            Momotaro dặn: "Chúng ta đi đánh quỷ, phải đồng lòng. Ai cũng có tài riêng: chó có răng sắc, khỉ leo trèo giỏi, chim trĩ bay cao nhìn xa. Đừng cãi nhau nữa nhé."

            Ra tới bờ biển, cả bốn đóng một chiếc thuyền. Chó kéo dây, khỉ chèo thuyền, chim trĩ đứng ở mũi thuyền chỉ hướng. Sóng to gió lớn mấy ngày đêm, cuối cùng trước mặt họ hiện ra hòn đảo đá đen sì, trên đỉnh là tòa thành của lũ quỷ.
            """),
        ("Trận chiến trên đảo quỷ", $"""
            Cổng thành quỷ bằng sắt đen, cao vút, đóng chặt. Chim trĩ bay vút qua tường thành, mổ vào mắt lũ quỷ canh cổng. Khỉ trèo lên tường, nhảy vào bên trong mở then cổng. Momotaro và chú chó xông thẳng vào.

            ![Tranh khắc gỗ Nhật Bản năm 1885: Momotaro cùng chó, khỉ, chim trĩ đánh quỷ]({Img}momotaro-1885.jpg)

            Lũ quỷ đang say sưa tiệc tùng, thấy có người xông vào thì vớ lấy chùy gai lao ra. Chó cắn vào chân, khỉ cào vào mặt, chim trĩ mổ vào đầu, Momotaro vung kiếm. Lũ quỷ to xác nhưng vụng về, bị đánh tới tấp không kịp trở tay.

            ![Tranh của Arthur Rackham: gương mặt quỷ]({Img}peachling-2.jpg)

            Cuối cùng, tên quỷ chúa sừng to nhất quỳ rạp xuống đất, nước mắt ròng ròng: "Xin tha mạng! Chúng tôi xin trả lại hết của cải đã cướp và hứa từ nay không bao giờ làm điều ác nữa."

            Momotaro tha cho lũ quỷ. Cậu cùng các bạn chất đầy thuyền vàng bạc, châu báu, áo lụa và chiếc mũ tàng hình quý giá, rồi giương cờ "Đệ nhất Nhật Bản" quay về.

            Cả làng ra tận bờ biển đón. Momotaro trả lại của cải cho từng nhà, phần còn lại để phụng dưỡng cha mẹ già. Chó, khỉ và chim trĩ ở lại sống cùng cậu, từ đó không bao giờ cãi nhau nữa.

            Ở Nhật Bản ngày nay, câu chuyện Momotaro vẫn được kể cho trẻ em nghe như bài học về lòng dũng cảm, sự hiếu thảo và tình bạn. Ở thành phố Okayama, quê hương của truyện, còn có tượng Momotaro cùng ba người bạn đứng trước nhà ga.
            """));
    }

    private static async Task<Dictionary<string, int>> EnsureGenresAsync(AppDbContext db, params string[] names)
    {
        foreach (var name in names)
            if (!await db.Genres.AnyAsync(g => g.Name == name))
                db.Genres.Add(new Genre { Name = name });
        await db.SaveChangesAsync();
        return await db.Genres.Where(g => names.Contains(g.Name)).ToDictionaryAsync(g => g.Name, g => g.Id);
    }

    private static async Task AddAsync(AppDbContext db, Story story, int[] genreIds, params (string Title, string Content)[] chapters)
    {
        if (await db.Stories.AnyAsync(s => s.Title == story.Title)) return;

        story.SearchText = TextSearch.ForStory(story.Title, story.Author);
        story.StoryGenres = genreIds.Distinct().Select(id => new StoryGenre { GenreId = id }).ToList();
        story.Chapters = chapters.Select((c, i) => new Chapter
        {
            Number = i + 1,
            Title = c.Title,
            Content = c.Content.Replace("\r\n", "\n").Trim(),
            IsFree = story.AccessType == AccessType.Free || i < story.FreeChapterCount,
            PublishAt = story.CreatedAt.AddDays(i)
        }).ToList();
        db.Stories.Add(story);
        await db.SaveChangesAsync();
    }
}
