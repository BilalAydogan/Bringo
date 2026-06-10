# Global Event Planner - Development Plan

> **Son güncelleme:** 10 Haziran 2026
>
> **Mevcut aşama:** Sprint 7 Item Management tamamlandı · Sprint 5 ertelendi
>
> **Sıradaki öncelikler:** Admin panel (Sprint 8) → Notifications → Testing

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
* [~] Contract System _(checkpoint + OTP onay var; admin CRUD eksik)_
* [x] Event Management _(CRUD tamam; davet sistemi tamam)_
* [x] Item Management
* [ ] Admin Panel
* [ ] Notifications
* [ ] Testing

## Frontend

* [x] Project Setup
* [x] Authentication Screens
* [x] Contract Screens _(kayıt modal + sözleşme onay lock ekranı)_
* [~] Event Screens _(liste, oluştur, düzenle, detay tamam)_
* [x] Item Screens _(Event detayındaki Malzemeler sekmesi)_
* [ ] Admin Screens
* [ ] PWA Integration
* [ ] i18n Integration
* [ ] Accessibility Improvements

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
* [ ] Redis Storage _(şu an User entity'sinde twoFactorCode alanında tutuluyor)_
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

* [ ] ROLE_ADMIN
* [ ] Admin Authorization
* [ ] Admin Dashboard API

### Frontend

* [ ] Admin Login
* [ ] Dashboard

---

## Contract Administration

* [ ] Create Contract
* [ ] Activate Contract
* [ ] View History

### Definition Of Done

* [ ] Admin panel usable
* [ ] Contract management works

---

# Sprint 9 - Globalization

## Backend

* [ ] Translation Component
* [ ] Locale Detection

## Frontend

* [ ] react-i18next
* [ ] Translation Files
* [ ] Language Switcher

## Timezone

* [ ] UTC Storage
* [ ] Browser Conversion

### Definition Of Done

* [ ] English works
* [ ] Turkish works
* [ ] Timezone conversion verified

---

# Sprint 10 - Testing & Release

## Backend

* [ ] Unit Tests
* [ ] Integration Tests
* [ ] Functional Tests

## Frontend

* [ ] Component Tests
* [ ] Page Tests

## Quality

* [ ] PHPStan
* [ ] ESLint
* [ ] Prettier

## Release

* [ ] Production Docker Build
* [ ] Environment Variables
* [ ] Backup Strategy

### Definition Of Done

* [ ] Tests pass
* [ ] Docker production build passes
* [ ] Application deployable

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
* [ ] 2FA kodlarını Redis'e taşıma (plan ile uyum)

---

# Backlog

## High Priority

* [ ] Google Login
* [ ] Apple Login
* [ ] PWA Support _(manifest, service worker, offline cache, install prompt)_
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

user_2fa:{user_id}

contract_otp:{user_id}

email_verify:{user_id}

> **Not:** Sözleşme OTP kodları Redis'te (`contract_otp:{user_id}:{contract_id}`) tutuluyor. Login 2FA kodları hâlâ veritabanında.

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
