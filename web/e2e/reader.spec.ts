import { expect, test } from "@playwright/test";
import { admin, member, mockApi, signIn } from "./mockApi";

test.describe("Người đọc", () => {
  test("tìm truyện không dấu bằng gợi ý tức thì rồi mở trang truyện @mobile", async ({ page, isMobile }) => {
    await mockApi(page);
    await page.goto("/");
    if (isMobile) await page.getByRole("button", { name: "Mở menu" }).click();
    const search = page.getByRole("combobox").first();
    await search.fill("vu an");
    await page.getByRole("option", { name: /Vụ Án Phòng Số 7/ }).click();
    await expect(page).toHaveURL(/\/truyen\/2$/);
    await expect(page.getByRole("heading", { level: 1, name: "Vụ Án Phòng Số 7" })).toBeVisible();
  });

  test("đăng nhập sai báo lỗi, đúng thì vào trang chủ", async ({ page }) => {
    await mockApi(page, { user: member });
    await page.goto("/login");
    await page.getByLabel("Tên đăng nhập hoặc email").fill("vip");
    await page.getByLabel("Mật khẩu").fill("sai");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByText("Sai tên đăng nhập hoặc mật khẩu")).toBeVisible();

    await page.getByLabel("Mật khẩu").fill("123456");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByRole("button", { name: /Độc giả VIP/ })).toBeVisible();
  });

  test("chương trả phí yêu cầu đăng nhập khi là khách", async ({ page }) => {
    await mockApi(page);
    await page.goto("/truyen/2/chuong/2");
    await expect(page.getByRole("heading", { name: "Chương 2 là nội dung trả phí" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng nhập" }).last()).toBeVisible();
  });

  test("thành viên chưa có quyền thấy nút mua truyện và gói đọc", async ({ page }) => {
    await mockApi(page, { user: member });
    await signIn(page, member);
    await page.goto("/truyen/2/chuong/3");
    await expect(page.getByRole("button", { name: /Mua truyện/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Xem các gói đọc" })).toBeVisible();
  });

  test("đọc chương: đổi nền tối, chuyển chương bằng phím, gửi bình luận", async ({ page }) => {
    await mockApi(page, { user: member });
    await signIn(page, member);
    await page.goto("/truyen/1/chuong/1");
    await expect(page.getByRole("heading", { name: "Chương 1: Chương thứ 1" })).toBeVisible();

    await page.getByRole("button", { name: "Tùy chỉnh" }).click();
    await page.getByRole("button", { name: "Tối" }).click();
    await expect(page.getByRole("button", { name: "Tối" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("textbox", { name: "Bạn nghĩ gì về chương này?" }).fill("Chương hay quá!");
    await page.getByRole("button", { name: "Gửi bình luận" }).click();
    await expect(page.getByText("Chương hay quá!")).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/chuong\/2$/);
  });

  test("chấm sao và theo dõi truyện", async ({ page }) => {
    await mockApi(page, { user: member });
    await signIn(page, member);
    await page.goto("/truyen/1");
    await page.getByRole("button", { name: "5 sao, Tuyệt vời" }).click();
    await expect(page.getByText("Đánh giá của bạn (bấm lại để bỏ)")).toBeVisible();
    await page.getByRole("button", { name: /^Theo dõi/ }).click();
    await expect(page.getByRole("button", { name: /Đang theo dõi/ })).toBeVisible();
  });

  test("bảng xếp hạng đổi được loại và khoảng thời gian", async ({ page }) => {
    await mockApi(page);
    await page.goto("/xep-hang");
    await page.getByRole("tab", { name: "Tháng" }).click();
    await expect(page).toHaveURL(/ky=month/);
    await expect(page.getByText("Kiếm Khách Bên Sông Hồng").first()).toBeVisible();
  });
});

test.describe("Quản trị", () => {
  test("thành viên thường không vào được trang quản trị", async ({ page }) => {
    await mockApi(page, { user: member });
    await signIn(page, member);
    await page.goto("/admin/thong-ke");
    await expect(page.getByText("Bạn không có quyền truy cập trang quản trị")).toBeVisible();
  });

  test("trang thống kê hiển thị số liệu và tải được file Excel", async ({ page }) => {
    await mockApi(page, { user: admin });
    await signIn(page, admin);
    await page.goto("/admin/thong-ke");
    await expect(page.getByText("1.050.000đ").first()).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất Excel" }).click();
    expect((await download).suggestedFilename()).toBe("thong-ke-test.xlsx");
  });
});
