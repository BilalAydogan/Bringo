<?php

namespace App\Controller;

use App\Dto\RequestContractOtpDto;
use App\Dto\VerifyContractOtpDto;
use App\Entity\User;
use App\Http\ApiResponse;
use App\Service\ContractService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api')]
class ContractController extends AbstractController
{
    #[Route('/contracts/active', name: 'api_contracts_active', methods: ['GET'])]
    public function getActiveContract(ContractService $contractService): JsonResponse
    {
        $active = $contractService->getActiveContract();

        if ($active === null) {
            return ApiResponse::error('CONTRACT_NOT_FOUND', 'Aktif sözleşme bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        return ApiResponse::success($contractService->buildApprovalPayload($active));
    }

    #[Route('/contracts/status', name: 'api_contracts_status', methods: ['GET'])]
    public function getContractStatus(ContractService $contractService): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $pending = $contractService->getPendingContract($user);

        return ApiResponse::success([
            'has_pending' => $pending !== null,
            'approval' => $contractService->buildApprovalPayload($pending),
        ]);
    }

    #[Route('/contracts/request-otp', name: 'api_contracts_request_otp', methods: ['POST'])]
    public function requestOtp(
        Request $request,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        ContractService $contractService,
    ): JsonResponse {
        try {
            $dto = $serializer->deserialize($request->getContent(), RequestContractOtpDto::class, 'json');
        } catch (\Exception) {
            return ApiResponse::error('INVALID_JSON', 'Geçersiz JSON verisi.', Response::HTTP_BAD_REQUEST);
        }

        $errors = $validator->validate($dto);
        if (count($errors) > 0) {
            $messages = array_map(fn ($e) => $e->getMessage(), iterator_to_array($errors));

            return ApiResponse::error('VALIDATION_FAILED', implode(', ', $messages), Response::HTTP_BAD_REQUEST);
        }

        /** @var User $user */
        $user = $this->getUser();

        try {
            $contract = $contractService->findActiveContractOrFail($dto->contractId);
            $contractService->requestOtp($user, $contract);
        } catch (\RuntimeException $e) {
            return ApiResponse::error('RESEND_COOLDOWN', $e->getMessage(), Response::HTTP_TOO_MANY_REQUESTS);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error('INVALID_CONTRACT', $e->getMessage(), Response::HTTP_BAD_REQUEST);
        }

        return ApiResponse::success(null, 'Doğrulama kodu e-posta adresinize gönderildi.');
    }

    #[Route('/contracts/verify-otp', name: 'api_contracts_verify_otp', methods: ['POST'])]
    public function verifyOtp(
        Request $request,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        ContractService $contractService,
    ): JsonResponse {
        try {
            $dto = $serializer->deserialize($request->getContent(), VerifyContractOtpDto::class, 'json');
        } catch (\Exception) {
            return ApiResponse::error('INVALID_JSON', 'Geçersiz JSON verisi.', Response::HTTP_BAD_REQUEST);
        }

        $errors = $validator->validate($dto);
        if (count($errors) > 0) {
            $messages = array_map(fn ($e) => $e->getMessage(), iterator_to_array($errors));

            return ApiResponse::error('VALIDATION_FAILED', implode(', ', $messages), Response::HTTP_BAD_REQUEST);
        }

        /** @var User $user */
        $user = $this->getUser();

        try {
            $contract = $contractService->findActiveContractOrFail($dto->contractId);
            $contractService->acceptWithOtp($user, $contract, $dto->code, $request->getClientIp());
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error('OTP_VERIFICATION_FAILED', $e->getMessage(), Response::HTTP_BAD_REQUEST);
        }

        $pending = $contractService->getPendingContract($user);

        return ApiResponse::success([
            'has_pending' => $pending !== null,
            'approval' => $contractService->buildApprovalPayload($pending),
        ], 'Sözleşme başarıyla onaylandı.');
    }
}
