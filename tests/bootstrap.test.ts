import assert from "node:assert/strict";
import { test, describe } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * İlk kurulumun kendi kendine çalıştığını doğrular.
 *
 * Sunucuda komut satırı erişimi olmayabiliyor: yayına alma yalnızca dosya
 * kopyalayıp IIS'te site açmakla yapılıyor. Bu yüzden portalın boş bir
 * klasörde kendini kurabilmesi zorunlu.
 *
 * Veri klasörünü içe aktarmadan ÖNCE ayarlıyoruz: lib/paths.ts DATA_DIR'i
 * modül yüklenirken bir kez hesaplıyor.
 */
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "seck-bootstrap-"));
process.env.SECK_DATA_DIR = dataDir;
delete process.env.SECK_ADMIN_USERNAME;
delete process.env.SECK_ADMIN_PASSWORD;

describe("bootstrap", () => {
  test("boş veritabanında sekmeleri ve yönetici hesabını oluşturur", async () => {
    const { bootstrap } = await import("../lib/bootstrap");
    const { DEFAULT_ADMIN_PASSWORD, verifyPassword } = await import("../lib/password");
    const { getUserByUsername } = await import("../lib/db/queries/users");
    const { listAllCategories } = await import("../lib/db/queries/categories");

    const result = bootstrap();

    assert.equal(result.createdCategories.length, 4, "dört sekme oluşmalı");
    assert.equal(result.createdAdmin, true);
    assert.equal(result.adminUsername, "admin");
    assert.equal(result.adminPassword, DEFAULT_ADMIN_PASSWORD);

    // Kayıtlar gerçekten veritabanında mı?
    const slugs = listAllCategories().map((c) => c.slug).sort();
    assert.deepEqual(slugs, ["iga", "sec-k", "sms", "thy"]);

    // Şifre karması gerçekten varsayılan şifreyle doğrulanıyor mu?
    const user = getUserByUsername("admin");
    assert.ok(user, "admin hesabı bulunmalı");
    assert.equal(verifyPassword(DEFAULT_ADMIN_PASSWORD, user.password_hash), true);
    assert.equal(verifyPassword("yanlis-sifre", user.password_hash), false);
    assert.equal(user.is_active, 1);
  });

  test("ikinci çağrıda hiçbir şeye dokunmaz", async () => {
    // Her açılışta çağrıldığı için fikirsiz olması şart: aksi halde yönetici
    // şifresini değiştirdikten sonra sunucu her yeniden başladığında
    // varsayılana dönerdi.
    const { bootstrap } = await import("../lib/bootstrap");
    const { getUserByUsername } = await import("../lib/db/queries/users");

    const oncekiHash = getUserByUsername("admin")?.password_hash;
    const result = bootstrap();

    assert.deepEqual(result.createdCategories, []);
    assert.equal(result.createdAdmin, false);
    assert.equal(result.adminPassword, null);
    assert.equal(getUserByUsername("admin")?.password_hash, oncekiHash, "şifre değişmemeli");
  });

  test("veritabanı dosyası belirtilen veri klasöründe oluşuyor", async () => {
    assert.ok(fs.existsSync(path.join(dataDir, "portal.db")));
  });
});
