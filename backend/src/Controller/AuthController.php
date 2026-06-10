<?php

namespace App\Controller;

use App\Dto\RegisterDto;
use App\Entity\Contract;
use App\Entity\User;
use App\Entity\UserContract;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/auth')]
class AuthController extends AbstractController
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
        try {
            $dto = $serializer->deserialize($request->getContent(), RegisterDto::class, 'json');
        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_JSON',
                    'message' => 'Invalid JSON payload'
                ]
            ], Response::HTTP_BAD_REQUEST);
        }

        $errors = $validator->validate($dto);
        if (count($errors) > 0) {
            $errorMessages = [];
            foreach ($errors as $error) {
                $errorMessages[] = $error->getMessage();
            }
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_FAILED',
                    'message' => implode(', ', $errorMessages)
                ]
            ], Response::HTTP_BAD_REQUEST);
        }

        $existingUser = $em->getRepository(User::class)->findOneBy(['email' => $dto->email]);
        if ($existingUser) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'USER_EXISTS',
                    'message' => 'Email is already taken'
                ]
            ], Response::HTTP_CONFLICT);
        }

        $activeContract = $em->getRepository(Contract::class)->findOneBy(['isActive' => true]);
        if ($activeContract === null) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'CONTRACT_NOT_FOUND',
                    'message' => 'Kayıt için gerekli kullanıcı sözleşmesi bulunamadı.'
                ]
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
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

        $emailVerifier->sendEmailConfirmation($user);

        return $this->json([
            'success' => true,
            'message' => 'User registered successfully. Please check your email to verify your account.',
            'data' => [
                'id' => $user->getId(),
                'firstName' => $user->getFirstName(),
                'lastName' => $user->getLastName(),
                'email' => $user->getEmail(),
            ]
        ], Response::HTTP_CREATED);
    }

    #[Route('/verify-email', name: 'api_auth_verify_email', methods: ['POST'])]
    public function verifyEmail(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $token = $data['token'] ?? null;

        if (!$token) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'MISSING_TOKEN',
                    'message' => 'Verification token is missing'
                ]
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $em->getRepository(User::class)->findOneBy(['verificationToken' => $token]);

        if (!$user) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_TOKEN',
                    'message' => 'Invalid or expired verification token'
                ]
            ], Response::HTTP_BAD_REQUEST);
        }

        $user->setVerified(true);
        $user->setVerificationToken(null);
        $em->flush();

        return $this->json([
            'success' => true,
            'message' => 'Email verified successfully'
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

        $emailVerifier->send2FaCode($user, $code);

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
}
