<?php

namespace App\Controller;

use App\Dto\RequestContractOtpDto;
use App\Dto\VerifyContractOtpDto;
use App\Entity\User;
use App\Exception\ApiException;
use App\Http\ApiResponse;
use App\Service\ContractService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

#[Route('/api')]
class ContractController extends ApiController
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
        TranslatorInterface $translator,
    ): JsonResponse {
        $dto = $this->deserializeJson($request, RequestContractOtpDto::class, $serializer);
        $this->validateDto($dto, $validator);

        /** @var User $user */
        $user = $this->getUser();

        try {
            $contract = $contractService->findActiveContractOrFail($dto->contractId);
            $contractService->requestOtp($user, $contract, $request->getLocale());
        } catch (\RuntimeException $e) {
            throw new ApiException('RESEND_COOLDOWN', $e->getMessage(), Response::HTTP_TOO_MANY_REQUESTS, previous: $e);
        } catch (\InvalidArgumentException $e) {
            throw new ApiException('INVALID_CONTRACT', $e->getMessage(), Response::HTTP_BAD_REQUEST, previous: $e);
        }

        return ApiResponse::success(
            null,
            $translator->trans('contract.request_otp_sent', [], 'messages', $request->getLocale()),
        );
    }

    #[Route('/contracts/verify-otp', name: 'api_contracts_verify_otp', methods: ['POST'])]
    public function verifyOtp(
        Request $request,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        ContractService $contractService,
        TranslatorInterface $translator,
    ): JsonResponse {
        $dto = $this->deserializeJson($request, VerifyContractOtpDto::class, $serializer);
        $this->validateDto($dto, $validator);

        /** @var User $user */
        $user = $this->getUser();

        try {
            $contract = $contractService->findActiveContractOrFail($dto->contractId);
            $contractService->acceptWithOtp($user, $contract, $dto->code, $request->getClientIp());
        } catch (\InvalidArgumentException $e) {
            throw new ApiException('OTP_VERIFICATION_FAILED', $e->getMessage(), Response::HTTP_BAD_REQUEST, previous: $e);
        }

        $pending = $contractService->getPendingContract($user);

        return ApiResponse::success(
            [
                'has_pending' => $pending !== null,
                'approval' => $contractService->buildApprovalPayload($pending, $request->getLocale()),
            ],
            $translator->trans('contract.approved', [], 'messages', $request->getLocale()),
        );
    }
}
