# Global Event Planner - Development Plan

> **Son güncelleme:** 12 Haziran 2026
>
> **Mevcut aşama:** Sprint 10 Testing & Release ilerliyor · Notifications ve reminder akışı tamamlandı · Sprint 9 Globalization tamamlandı · Sprint 8 Admin Panel tamamlandı · Auth transient state tamamen Redis'e taşındı
>
> **Sıradaki öncelikler:** Contract checkpoint lock bugfix → Integration test borcu → Release hardening

## Genel Durum

### Teknolojiler

* Symfony 7.4
* PHP 8.3 / 8.4
* PostgreSQL
* Redis
* Docker
* Lazydocker
* React
* TypeScript
* TailwindCSS

---

# Tamamlanma Durumu

## Backend

* [x] Docker Setup
* [x] Symfony Setup
* [x] Database Setup
* [x] Authentication
* [~] Contract System _(admin CRUD tamam; contract checkpoint smoke test'te lock enforcement açığı var)_
* [x] Event Management _(CRUD tamam; davet sistemi tamam)_
* [x] Item Management
* [x] Admin Panel
* [x] Notifications _(user notification entity/repository/service, reminder log, reminder command, in-app API, SSE stream)_
* [~] Testing _(unit + functional + bazı frontend testleri var; integration coverage eksik)_

## Frontend

* [x] Project Setup
* [x] Authentication Screens
* [x] Contract Screens _(kayıt modal + sözleşme onay lock ekranı)_
* [x] Event Screens _(liste, oluştur, düzenle, detay, davet, leave flow, mobil infinite scroll)_
* [x] Item Screens _(Event detayındaki Malzemeler sekmesi)_
* [x] Admin Screens
* [x] PWA Integration
* [x] i18n Integration
* [~] Accessibility Improvements _(temel responsive/mobil polish yapıldı; tam audit yok)_

---

# Sprint 1 - Infrastructure

## Docker

### Backend Container

* [x] PHP-FPM Container
* [x] Extensions Installation
* [x] Composer Installation

### Nginx

* [x] Reverse Proxy Configuration
* [x] API Routing

### PostgreSQL

* [x] Database Container
* [x] Persistent Volume

### Redis

* [x] Redis Container
* [ ] Healthcheck

### Frontend

* [x] React Container
* [x] Vite Configuration

### Mailpit

* [x] Mailpit Container
* [x] SMTP Configuration

### Validation

* [x] All Containers Running
* [x] Docker Network Verified
* [ ] Lazydocker Monitoring Verified

### Definition Of Done

* [x] Containers start successfully
* [x] Symfony reachable
* [x] React reachable
* [x] PostgreSQL connection works
* [x] Redis connection works _(sözleşme OTP servisi Redis kullanıyor)_

---

# Sprint 2 - Database Layer

## User Module

### Entity

* [x] User Entity _(email, firstName, lastName, roles, 2FA alanları dahil)_
* [x] UUID Configuration

### Migration

* [x] User Migration
* [x] Indexes

### Repository

* [x] User Repository

---

## Contract Module

### Entity

* [x] Contract Entity
* [x] UserContract Entity

### Migration

* [x] Contract Migration
* [x] UserContract Migration

### Repository

* [x] Contract Repository
* [x] UserContract Repository

---

## Event Module

### Entity

* [x] Event Entity
* [x] EventParticipant Entity

### Migration

* [x] Event Migration
* [x] EventParticipant Migration

### Repository

* [x] Event Repository
* [x] EventParticipant Repository

---

## Item Module

### Entity

* [x] Item Entity

### Migration

* [x] Item Migration

### Repository

* [x] Item Repository

### Definition Of Done

* [x] All entities created
* [x] Migrations executed
* [x] Foreign keys validated
* [x] Database schema reviewed

---

# Sprint 3 - Authentication

## Registration

### Backend

* [x] Register DTO _(firstName, lastName, email, password, acceptTerms)_
* [x] Validation Rules
* [ ] Register Service _(mantık doğrudan AuthController içinde)_
* [x] Register Controller
* [x] Password Hashing

### Frontend

* [x] Register Page
* [x] Register Form Validation

---

## Login

### Backend

* [ ] Login DTO
* [ ] Login Service _(mantık doğrudan AuthController içinde)_
* [x] JWT Configuration
* [x] Login Endpoint

### Frontend

* [x] Login Page
* [x] Token Storage

---

## Refresh Token

### Backend

* [x] Refresh Token Entity
* [ ] Refresh Service _(Gesdinet JWT Refresh Token bundle tarafından yönetiliyor)_
* [x] Refresh Endpoint

### Frontend

* [x] Axios Interceptor
* [x] Auto Refresh Logic

---

## Email Verification

### Backend

* [x] Verification Token Generation
* [x] Verification Endpoint
* [x] Mail Template _(ortak markalı HTML + düz metin şablonu)_

### Frontend

* [x] Verification Screen

### Definition Of Done

* [x] Register works
* [x] Login works
* [x] JWT works
* [x] Refresh works
* [x] Email verification works

---

# Sprint 4 - Contract Approval System

## Contract Management

### Backend

* [ ] Create Contract Endpoint
* [ ] Activate Contract Endpoint
* [x] Contract Listing Endpoint _(GET /api/contracts/active)_
* [x] Static Contract Seed _(migration ile varsayılan Kullanıcı Sözleşmesi)_
* [x] Contract Acceptance on Register _(UserContract kaydı + IP adresi)_
* [x] Contract Localization Storage _(TR/EN içerik ayrı alanlarda saklanıyor)_

### Frontend

* [ ] Contract Screen _(ayrı sayfa yok)_
* [x] Contract Viewer _(kayıt sayfasında modal)_

---

## Contract Checkpoint

### Backend

* [x] ContractCheckpointListener
* [x] Error Response Standard _(ApiResponse helper + CONTRACT_APPROVAL_REQUIRED kodu)_

### Frontend

* [x] Contract Lock Screen _(ContractApproval sayfası)_
* [x] Forced Redirect _(ProtectedRoute + axios 403 interceptor)_

---

## OTP Approval

### Backend

* [x] Redis OTP Service _(ContractOtpService)_
* [x] OTP Verification Endpoint _(POST /api/contracts/verify-otp)_
* [x] Messenger Job _(SendContractOtpMessage + Handler)_

### Frontend

* [x] OTP Form _(ContractApproval sayfası)_
* [x] Resend OTP _(60 sn cooldown)_

### Definition Of Done

* [x] User blocked without approval
* [x] OTP approval works
* [x] Contract acceptance stored

---

# Sprint 5 - Two Factor Authentication _(ERTELENDİ — temel e-posta OTP çalışıyor)_

## Email OTP

### Backend

* [x] OTP Generator
* [x] Redis Storage _(2FA code, password reset token ve email verification token Redis'e taşındı)_
* [x] Verification Endpoint _(POST /api/auth/verify-2fa)_

### Frontend

* [x] OTP Screen _(Login sayfası 2. adım)_

---

## Google Authenticator

### Backend

* [ ] scheb/2fa Installation
* [ ] Secret Generation
* [ ] QR Generation

### Frontend

* [ ] QR Screen
* [ ] Recovery Flow

### Definition Of Done

* [x] Email OTP works
* [ ] Google Authenticator works
* [ ] Sprint 5 tamamlanmadı — sonra yapılacak

---

# Sprint 6 - Event Management

## Event CRUD

### Backend

* [x] Create Event
* [x] Update Event
* [x] Delete Event
* [x] List Events
* [x] Event Details

### Frontend

* [x] Event List
* [x] Event Create
* [x] Event Edit
* [x] Event Detail

---

## Invitation System

### Backend

* [x] Invite Code Generator
* [x] Join Endpoint
* [x] Leave Endpoint _(katılımcı ayrılınca item assignment temizliği dahil)_
* [x] Accept Endpoint
* [x] Reject Endpoint

### Frontend

* [x] Join Event Screen
* [x] Leave Event Action
* [x] Invitation Status

### Definition Of Done

* [x] Event CRUD works
* [x] Invitations work

---

# Sprint 7 - Item Management

## Item CRUD

### Backend

* [x] Create Item
* [x] Update Item
* [x] Delete Item
* [x] List Items

### Frontend

* [x] Item List
* [x] Item Form

---

## Assignment System

### Backend

* [x] Assign User
* [x] Concurrency Lock _(assignment update transaction + pessimistic write lock)_
* [x] Status Management

### Frontend

* [x] Assignment Screen
* [x] Item Status Display

### Definition Of Done

* [x] Assignment works
* [x] Concurrency conflicts prevented

---

# Sprint 8 - Admin Panel

## Administration

### Backend

* [x] ROLE_ADMIN
* [x] Admin Authorization
* [x] Admin Dashboard API
* [x] Admin Creation Endpoint/UI Flow

### Frontend

* [x] Admin Login
* [x] Dashboard
* [x] Admin Management Tab

---

## Contract Administration

* [x] Create Contract
* [x] Activate Contract
* [x] View History
* [x] Contract Localization _(TR/EN sözleşme içeriği ve admin panel çevirileri)_

### Definition Of Done

* [x] Admin panel usable
* [x] Contract management works
* [x] Admin panel overview locale-aware

---

# Sprint 9 - Globalization

## Backend

* [x] Translation Component
* [x] Locale Detection

## Frontend

* [x] react-i18next
* [x] Translation Files
* [x] Language Switcher
* [x] Admin dashboard locale refresh
* [x] Contract / auth / event detail string coverage

## Timezone

* [x] UTC Storage
* [x] Browser Conversion
* [x] Event Timezone Selection
* [x] Timezone-aware reminder rendering

### Definition Of Done

* [x] English works
* [x] Turkish works
* [x] Timezone conversion verified

---

# Sprint 10 - Testing & Release

## Notifications

### Backend

* [x] User Notification Entity/Repository
* [x] Notification API _(list, read, read-all)_
* [x] Event Reminder Jobs _(console command + reminder log)_
* [x] Reminder Email Templates _(i18n + branded HTML/text)_
* [x] Real-time Notification Stream _(SSE)_

### Frontend

* [x] Navbar Notification Center
* [x] Browser Notifications _(permission + local dedupe)_
* [x] Real-time Updates _(SSE + polling fallback)_
* [x] Mobile Notification Dropdown Polish

### Definition Of Done

* [x] Reminder emails sent
* [x] In-app notifications stored
* [x] Notifications appear without page refresh
* [x] Mobile dropdown usable

---

## Backend

* [x] Unit Tests _(ContractDiffService + EmailTemplateRenderer kapsandı)_
* [ ] Integration Tests
* [x] Functional Tests _(Auth login basic request path kapsandı)_

## Frontend

* [x] Component Tests _(LanguageSwitcher)_
* [x] Page Tests _(Login + date utils)_

## Quality

* [x] PHPStan
* [x] ESLint
* [x] Prettier

## Release

* [x] Production Docker Build _(frontend nginx + api nginx + php-fpm + postgres + redis için production compose akışı oluşturuldu ve backend image build doğrulandı)_
* [x] Environment Variables _(`.env.prod.example`, README production notları ve compose production runtime env geçişleri eklendi)_
* [x] Backup Strategy _(PostgreSQL backup/restore scriptleri, README operasyon notları ve `backups/` ignore kuralı eklendi)_

### Definition Of Done

* [x] Tests pass
* [x] Docker production build passes
* [x] Application deployable _(production compose stack yerelde ayağa kaldırıldı; healthcheck, migration ve cache clear doğrulandı)_

---

# Technical Debt

* [ ] Global Exception Handler
* [ ] Pagination Standard
* [ ] API Versioning
* [ ] Audit Log System
* [ ] Notification System
* [ ] Monitoring
* [ ] Metrics Dashboard
* [ ] RegisterService / LoginService ayrıştırması
* [ ] Contract checkpoint enforcement bugfix _(pending contract varken bazı korumalı endpoint'ler hâlâ açılıyor)_

---

# Backlog

## High Priority

* [ ] Google Login
* [ ] Apple Login
* [x] PWA Support _(manifest, service worker, offline cache, install prompt)_
* [ ] Push Notifications
* [ ] Event Reminder Jobs

## Medium Priority

* [ ] Calendar Integration
* [ ] User Profile Images
* [ ] Realtime Notifications

## Low Priority

* [ ] Dark Mode
* [ ] Theme Customizer

---

# Development Notes

## Redis Keys

auth:2fa:{user_id}

contract_otp:{user_id}:{contract_id}

auth:password_reset:{token}

auth:password_reset:user:{user_id}

auth:email_verify:{token}

auth:email_verify:user:{user_id}

> **Not:** Login 2FA kodları, password reset token'ları ve email verification token'ları Redis'te tutuluyor. Veritabanında transient auth state bırakılmadı.

## Release Smoke Notes

* [x] Register → verify-email → login → 2FA → me → logout akışı doğrulandı
* [x] Forgot-password → reset-password → tekrar login akışı doğrulandı
* [x] Refresh token akışı smoke test ile doğrulandı
* [x] Admin route'ları user rolüyle `403 ACCESS_DENIED` dönüyor
* [x] Admin route'ları admin rolüyle açılıyor
* [~] Contract status `has_pending=true` dönüyor ancak pending kullanıcı `/api/events` ve `/api/auth/me` endpoint'lerine hâlâ erişebiliyor; lock enforcement düzeltilmeli

---

## JWT

Access Token: 15 Minutes

Refresh Token: 30 Days

---

## Timezone Policy

Database: UTC

Backend: UTC

Frontend: Browser Local Time

---

## API Standard

Success:

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "",
    "message": ""
  }
}
```

---

## Mevcut API Endpoint'leri

| Method | Endpoint | Durum |
|--------|----------|-------|
| POST | `/api/auth/register` | Aktif |
| POST | `/api/auth/login` | Aktif |
| POST | `/api/auth/verify-2fa` | Aktif |
| POST | `/api/auth/verify-email` | Aktif |
| POST | `/api/auth/logout` | Aktif |
| POST | `/api/auth/refresh` | Aktif |
| GET | `/api/contracts/active` | Aktif |
| GET | `/api/contracts/status` | Aktif |
| POST | `/api/contracts/request-otp` | Aktif |
| POST | `/api/contracts/verify-otp` | Aktif |
| GET | `/api/events` | Aktif |
| POST | `/api/events` | Aktif |
| GET | `/api/events/{id}` | Aktif |
| PUT | `/api/events/{id}` | Aktif |
| DELETE | `/api/events/{id}` | Aktif |
| POST | `/api/events/{id}/leave` | Aktif |
| GET | `/api/events/{eventId}/items` | Aktif |
| POST | `/api/events/{eventId}/items` | Aktif |
| GET | `/api/events/{eventId}/items/{id}` | Aktif |
| PUT/PATCH | `/api/events/{eventId}/items/{id}` | Aktif |
| DELETE | `/api/events/{eventId}/items/{id}` | Aktif |
| POST | `/api/events/{eventId}/items/{id}/assign` | Aktif |
| POST | `/api/events/{eventId}/items/{id}/complete` | Aktif |
