# Bringo Release Checklist

Bu dosya "deploy nasıl yapılır" notu değil, "yayına çıkmadan önce gerçekten hazır mıyız" kontrol listesidir.

## 0. Go / No-Go Kuralı

Bu maddelerden biri bile kırmızıysa release yapılmaz:

* [x] `frontend` build geçiyor
* [x] `frontend` lint geçiyor
* [x] `backend` testleri geçiyor
* [x] `docker-compose.prod.yml` build geçiyor
* [x] kritik auth akışları çalışıyor _(register, verify-email, login, 2FA, me, logout, forgot-password, reset-password smoke test ile doğrulandı)_
* [ ] production env değerleri tamam ve doğru

---

## 1. Mevcut Blokerlar

Şu an kapatılmadan release yapılmaması gereken açıklar:

* [x] [frontend/src/pages/AdminDashboard.tsx](/home/bilal/Masaüstü/Bringo/frontend/src/pages/AdminDashboard.tsx:2) içindeki kullanılmayan `Link` import'u temizlendi; frontend build tekrar geçiyor.
* [x] [frontend/src/types/api.ts](/home/bilal/Masaüstü/Bringo/frontend/src/types/api.ts:19) içindeki `PaginatedResponse<T>` lint sorunu giderildi.
* [x] Bildirim SSE akışı query-string token yerine `Authorization` header ile çalışacak şekilde sıkılaştırıldı: [frontend/src/components/AppLayout.tsx](/home/bilal/Masaüstü/Bringo/frontend/src/components/AppLayout.tsx:197), [backend/src/Controller/NotificationController.php](/home/bilal/Masaüstü/Bringo/backend/src/Controller/NotificationController.php:69).
* [x] Production mail linkleri için `FRONTEND_URL` zorunlu ve doğru domain olacak şekilde netleştirildi; backend `DEFAULT_URI` fallback'i de var: [.env.prod.example](/home/bilal/Masaüstü/Bringo/.env.prod.example:6), [backend/src/Service/EmailVerifier.php](/home/bilal/Masaüstü/Bringo/backend/src/Service/EmailVerifier.php:33).

---

## 2. Kod Kalitesi Kapısı

### Frontend

* [x] `npm run lint`
* [x] `npm run build`
* [x] `npm run test`

### Backend

* [x] `php bin/phpunit`
* [x] auth transient state Redis'e taşındı _(2FA, password reset, email verification)_
* [ ] varsa static analysis / quality gate komutları temiz

### Beklenen Sonuç

* [~] warning olabilir, error olmayacak _(build geçiyor; `INEFFECTIVE_DYNAMIC_IMPORT` uyarısı kaldı)_
* [x] build çıktısı artifact üretmeli
* [x] testler yeşil olmalı

---

## 3. Production Build Kapısı

* [ ] `.env.prod` hazır
* [ ] JWT key dosyaları production için ayrı üretildi
* [x] `docker compose --env-file .env.prod -f docker-compose.prod.yml build` _(build komutu `.env.prod` olmadan da doğrulandı; gerçek release öncesi gerçek env ile tekrar çalıştırılmalı)_
* [ ] `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d`
* [ ] `docker compose --env-file .env.prod -f docker-compose.prod.yml ps`
* [ ] tüm servisler `healthy` veya beklenen `Up` durumunda

### Kontrol Edilecek Servisler

* [ ] `frontend`
* [ ] `api-nginx`
* [ ] `php-fpm`
* [ ] `postgres`
* [ ] `redis`

---

## 4. Environment Doğrulaması

### Zorunlu Değerler

* [ ] `APP_SECRET`
* [ ] `DEFAULT_URI`
* [ ] `DATABASE_URL`
* [ ] `REDIS_URL`
* [ ] `MAILER_DSN`
* [ ] `JWT_SECRET_KEY`
* [ ] `JWT_PUBLIC_KEY`
* [ ] `JWT_PASSPHRASE`
* [ ] `POSTGRES_USER`
* [ ] `POSTGRES_PASSWORD`
* [ ] `POSTGRES_DB`
* [ ] `VITE_API_URL`
* [ ] `FRONTEND_PORT`
* [ ] `FRONTEND_URL`

### Kalite Kontrolü

* [ ] `FRONTEND_URL` localhost değil
* [ ] `DEFAULT_URI` gerçek production domain
* [ ] mail server production hesabına bakıyor
* [ ] JWT key path'leri container içinde okunabiliyor
* [ ] secrets örnek değerlerle bırakılmadı

---

## 5. Güvenlik Kontrolleri

* [x] register
* [x] login
* [x] verify-2fa
* [x] refresh token
* [x] logout
* [x] admin route'ları user rolüyle kapalı
* [x] admin route'ları admin rolüyle açık
* [x] sözleşme durum endpoint'i doğrulandı
* [ ] sözleşme onayı olmayan kullanıcı lock ekranına düşüyor _(12 Haziran 2026 smoke test: `has_pending=true` dönüyor ama `/api/events` ve `/api/auth/me` hâlâ 200 dönüyor)_
* [ ] notification stream auth modeli production için kabul edilmiş durumda

### Özellikle Gözden Geçir

* [x] query string içinde token taşınmıyor; stream `Authorization` header kullanıyor.
* [x] reverse proxy / access log tarafındaki token sızıntısı riski bu akış için azaltıldı.
* [ ] `PUBLIC_ACCESS` verilen endpoint'ler gerçekten gerekli mi?

---

## 6. Kritik Ürün Akışları

### Kullanıcı

* [x] kayıt ol
* [x] email doğrula
* [x] giriş yap
* [x] 2FA kodu gir
* [x] şifremi unuttum akışı
* [ ] sözleşme onay akışını tamamla
* [ ] profil görüntüle
* [ ] şifre güncelle

### Etkinlik

* [ ] etkinlik oluştur
* [ ] etkinlik düzenle
* [ ] etkinlik detayını aç
* [ ] davet kodu ile katıl
* [ ] katılımcı kabul/reddet
* [ ] etkinlikten ayrıl
* [ ] katılımcı çıkınca item assignment temizleniyor

### Malzeme

* [ ] item ekle
* [ ] item ata
* [ ] kullanıcı kendi assignment'ını ayırt edebiliyor
* [ ] quantity / assignment sayıları tutarlı

### Admin

* [x] admin login
* [ ] overview yükleniyor
* [ ] contracts tab çalışıyor
* [x] yeni sözleşme oluşturuluyor
* [x] TR/EN sözleşme içeriği ayrı kaydoluyor
* [ ] active contract locale ile doğru gösteriliyor
* [ ] yeni admin oluşturuluyor

### Son Smoke Test Notu

* [~] auth smoke: register, verify-email, login, 2FA, me, logout, forgot-password, reset-password, refresh token tamam
* [~] admin auth smoke: user token ile `/api/admin/dashboard` `403`, admin token ile `200`
* [ ] contract lock smoke: fail _(pending contract durumu üretiliyor ama korumalı endpoint lock'u çalışmıyor)_

---

## 7. Bildirim ve Reminder Kontrolleri

* [ ] reminder command çalışıyor
* [x] reminder email gidiyor
* [ ] email dili kullanıcı locale'ine göre doğru
* [ ] notification veritabanına düşüyor
* [ ] uygulama içi notification sayfa yenilemeden geliyor
* [ ] mobil navbar notification paneli kullanılabilir
* [ ] browser notification izni verilince duplicate üretmiyor

---

## 8. Zaman / Locale Kontrolleri

* [ ] TR arayüz temel akışlarda doğru
* [ ] EN arayüz temel akışlarda doğru
* [ ] event detail string'leri çevrilmiş
* [ ] auth / contract mesajları çevrilmiş
* [ ] event timezone seçimleri kaydoluyor
* [ ] dashboard ve admin tarihleri geçerli timezone ile gösteriliyor
* [ ] reminder mail ve in-app notification saatleri kullanıcı beklentisiyle uyumlu

---

## 9. Mobil ve Responsive Kontroller

* [ ] login ekranı mobilde taşmıyor
* [ ] navbar tek satırda düzgün
* [ ] user menu mobilde kullanılabilir
* [ ] notification dropdown mobilde kullanılabilir
* [ ] dashboard tab'leri mobilde bottom menu gibi çalışıyor
* [ ] event list infinite scroll mobilde düzgün
* [ ] event detail action alanları mobilde taşmıyor

---

## 10. Operasyon ve Geri Dönüş

* [ ] deployment öncesi backup alındı
* [ ] restore script'i test edildi
* [ ] migration çalıştırma adımı net
* [ ] cache clear adımı net
* [ ] loglara bakılacak yer belli
* [ ] rollback planı yazılı

### Minimum Rollback Soruları

* [ ] bir önceki image tag'i hazır mı?
* [ ] migration geri alınabilir mi?
* [ ] veritabanı snapshot / dump elde mi?

---

## 11. Final Go-Live Kararı

Release ancak aşağıdaki durumda verilir:

* [ ] blocker kalmadı
* [ ] build yeşil
* [ ] testler yeşil
* [ ] smoke test geçti
* [ ] env doğrulandı
* [ ] rollback planı hazır

Son karar:

* [ ] GO
* [ ] NO-GO
