<?php

namespace App\Controller;

use App\Dto\RegisterDto;
use App\Entity\Contract;
use App\Entity\User;
use App\Entity\UserContract;
use App\Exception\ApiException;
use App\Http\ApiResponse;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

#[Route('/api/auth')]
class AuthController extends ApiController
{
    #[Route('/register', name: 'api_auth_register', methods: ['POST'])]
    public function register(
        Request $request,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $em,
        \App\Service\EmailVerifier $emailVerifier
    ): JsonResponse {
        $dto = $this->deserializeJson($request, RegisterDto::class, $serializer, 'Invalid JSON payload');
        $this->validateDto($dto, $validator);

        $existingUser = $em->getRepository(User::class)->findOneBy(['email' => $dto->email]);
        if ($existingUser) {
            throw new ApiException('USER_EXISTS', 'Email is already taken', Response::HTTP_CONFLICT);
        }

        $activeContract = $em->getRepository(Contract::class)->findOneBy(['isActive' => true]);
        if ($activeContract === null) {
            throw new ApiException(
                'CONTRACT_NOT_FOUND',
                'Kayıt için gerekli kullanıcı sözleşmesi bulunamadı.',
                Response::HTTP_INTERNAL_SERVER_ERROR,
            );
        }

        $user = new User();
        $user->setFirstName($dto->firstName);
        $user->setLastName($dto->lastName);
        $user->setEmail($dto->email);
        $user->setPassword($passwordHasher->hashPassword($user, $dto->password));

        $em->persist($user);

        $userContract = new UserContract();
        $userContract->setUser($user);
        $userContract->setContract($activeContract);
        $userContract->setIpAddress($request->getClientIp());
        $em->persist($userContract);

        $em->flush();

        $emailVerifier->sendEmailConfirmation($user, $request->getLocale());

        return ApiResponse::success([
            'id' => $user->getId(),
            'firstName' => $user->getFirstName(),
            'lastName' => $user->getLastName(),
            'email' => $user->getEmail(),
        ], 'User registered successfully. Please check your email to verify your account.', Response::HTTP_CREATED);
    }

    #[Route('/verify-email', name: 'api_auth_verify_email', methods: ['POST'])]
    public function verifyEmail(
        Request $request,
        EntityManagerInterface $em,
        TranslatorInterface $translator,
    ): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $token = $data['token'] ?? null;
        $locale = $request->getLocale();

        if (!$token) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'MISSING_TOKEN',
                    'message' => $translator->trans('auth.verify_email.missing_token', [], 'messages', $locale),
                ]
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $em->getRepository(User::class)->findOneBy(['verificationToken' => $token]);

        if (!$user) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_TOKEN',
                    'message' => $translator->trans('auth.verify_email.invalid_token', [], 'messages', $locale),
                ]
            ], Response::HTTP_BAD_REQUEST);
        }

        $user->setVerified(true);
        $user->setVerificationToken(null);
        $em->flush();

        return $this->json([
            'success' => true,
            'message' => $translator->trans('auth.verify_email.success', [], 'messages', $locale),
        ]);
    }

    #[Route('/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
        \App\Service\EmailVerifier $emailVerifier
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = $data['username'] ?? null;
        $password = $data['password'] ?? null;

        if (!$email || !$password) {
            return $this->json(['message' => 'Missing credentials'], Response::HTTP_BAD_REQUEST);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if (!$user || !$passwordHasher->isPasswordValid($user, $password)) {
            return $this->json(['message' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->setTwoFactorCode($code);
        $user->setTwoFactorExpiresAt(new \DateTimeImmutable('+10 minutes'));
        $em->flush();

        $emailVerifier->send2FaCode($user, $code, $request->getLocale());

        return $this->json([
            'requires_2fa' => true,
            'message' => 'Please check your email for the 2FA code.'
        ]);
    }

    #[Route('/verify-2fa', name: 'api_auth_verify_2fa', methods: ['POST'])]
    public function verify2fa(
        Request $request,
        EntityManagerInterface $em,
        \Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface $jwtManager,
        \Gesdinet\JWTRefreshTokenBundle\Generator\RefreshTokenGeneratorInterface $refreshTokenGenerator,
        \Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface $refreshTokenManager
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = $data['username'] ?? null;
        $code = $data['code'] ?? null;

        if (!$email || !$code) {
            return $this->json(['message' => 'Missing data'], Response::HTTP_BAD_REQUEST);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if (!$user) {
            return $this->json(['message' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        if ($user->getTwoFactorCode() !== $code || $user->getTwoFactorExpiresAt() < new \DateTimeImmutable()) {
            return $this->json(['message' => 'Invalid or expired 2FA code'], Response::HTTP_BAD_REQUEST);
        }

        $user->setTwoFactorCode(null);
        $user->setTwoFactorExpiresAt(null);
        $em->flush();

        $token = $jwtManager->create($user);
        
        $refreshToken = $refreshTokenGenerator->createForUserWithTtl($user, 2592000);
        $refreshTokenManager->save($refreshToken);

        return $this->json([
            'token' => $token,
            'refresh_token' => $refreshToken->getRefreshToken(),
        ]);
    }

    #[Route('/logout', name: 'api_auth_logout', methods: ['POST'])]
    public function logout(
        Request $request,
        \Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface $refreshTokenManager
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $refreshTokenString = $data['refresh_token'] ?? null;

        if ($refreshTokenString) {
            $refreshToken = $refreshTokenManager->get($refreshTokenString);
            if ($refreshToken) {
                $refreshTokenManager->delete($refreshToken);
            }
        }

        return $this->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    #[Route('/me', name: 'api_auth_me', methods: ['GET'])]
    public function me(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Unauthorized',
                ],
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'success' => true,
            'data' => [
                'id' => $user->getId()?->toRfc4122(),
                'email' => $user->getEmail(),
                'firstName' => $user->getFirstName(),
                'lastName' => $user->getLastName(),
                'roles' => $user->getRoles(),
                'is_verified' => $user->isVerified(),
                'created_at' => $user->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ],
        ]);
    }

    #[Route('/change-password', name: 'api_auth_change_password', methods: ['POST'])]
    public function changePassword(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $em,
        TranslatorInterface $translator,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Unauthorized',
                ],
            ], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_JSON',
                    'message' => $translator->trans('profile.invalid_json', [], 'messages', $request->getLocale()),
                ],
            ], Response::HTTP_BAD_REQUEST);
        }

        $currentPassword = $data['currentPassword'] ?? null;
        $newPassword = $data['newPassword'] ?? null;

        if (!is_string($currentPassword) || !is_string($newPassword) || trim($currentPassword) === '' || trim($newPassword) === '') {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_FAILED',
                    'message' => $translator->trans('profile.missing_fields', [], 'messages', $request->getLocale()),
                ],
            ], Response::HTTP_BAD_REQUEST);
        }

        if (strlen($newPassword) < 6) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_FAILED',
                    'message' => $translator->trans('profile.password_too_short', [], 'messages', $request->getLocale()),
                ],
            ], Response::HTTP_BAD_REQUEST);
        }

        if (!$passwordHasher->isPasswordValid($user, $currentPassword)) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_CURRENT_PASSWORD',
                    'message' => $translator->trans('profile.invalid_current_password', [], 'messages', $request->getLocale()),
                ],
            ], Response::HTTP_BAD_REQUEST);
        }

        $user->setPassword($passwordHasher->hashPassword($user, $newPassword));
        $em->flush();

        return $this->json([
            'success' => true,
            'message' => $translator->trans('profile.password_updated', [], 'messages', $request->getLocale()),
        ]);
    }
}
