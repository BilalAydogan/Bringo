<?php

namespace App\Controller;

use App\Dto\CreateContractDto;
use App\Dto\UpdateContractDto;
use App\Entity\Contract;
use App\Entity\ContractTranslation;
use App\Entity\User;
use App\Exception\ApiException;
use App\Http\ApiResponse;
use App\Repository\ContractRepository;
use App\Repository\EventRepository;
use App\Repository\ItemRepository;
use App\Repository\UserContractRepository;
use App\Repository\UserRepository;
use App\Service\ContractService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\Component\Uid\Uuid;
use Symfony\Contracts\Translation\TranslatorInterface;

#[Route('/api/admin')]
class AdminController extends ApiController
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserRepository $userRepository,
        private EventRepository $eventRepository,
        private ItemRepository $itemRepository,
        private ContractRepository $contractRepository,
        private UserContractRepository $userContractRepository,
        private ContractService $contractService,
        private TranslatorInterface $translator,
    ) {
    }

    #[Route('/dashboard', name: 'api_admin_dashboard', methods: ['GET'])]
    public function dashboard(Request $request): JsonResponse
    {
        $recentContracts = $this->contractRepository->findBy([], ['version' => 'DESC'], 4);
        $activeContract = $this->contractRepository->findActiveContract();
        $locale = $request->getLocale();

        return ApiResponse::success([
            'stats' => [
                'users' => $this->userRepository->count([]),
                'admins' => $this->userRepository->countAdmins(),
                'events' => $this->eventRepository->count([]),
                'items' => $this->itemRepository->count([]),
                'contracts' => $this->contractRepository->count([]),
                'accepted_contracts' => $this->userContractRepository->count([]),
            ],
            'active_contract' => $activeContract ? $this->contractService->serializeContract($activeContract, $locale) : null,
            'recent_users' => array_map(
                fn (User $user) => [
                    'id' => $user->getId()->toRfc4122(),
                    'email' => $user->getEmail(),
                    'firstName' => $user->getFirstName(),
                    'lastName' => $user->getLastName(),
                    'roles' => $user->getRoles(),
                    'created_at' => $user->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                ],
                $this->userRepository->findRecent(6),
            ),
            'recent_contracts' => array_map(
                fn (Contract $contract) => $this->contractService->serializeContract($contract, $locale),
                $recentContracts,
            ),
        ]);
    }

    #[Route('/users/admin', name: 'api_admin_users_create_admin', methods: ['POST'])]
    public function createAdmin(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
    ): JsonResponse {
        $data = $this->decodeJsonObject($request, $this->trans('admin.invalid_json', locale: $request->getLocale()));

        $firstName = trim((string) ($data['firstName'] ?? ''));
        $lastName = trim((string) ($data['lastName'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($firstName === '' || $lastName === '' || $email === '' || $password === '') {
            return ApiResponse::error(
                'VALIDATION_FAILED',
                $this->trans('admin.admin_user_missing_fields', locale: $request->getLocale()),
                Response::HTTP_BAD_REQUEST,
            );
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ApiResponse::error(
                'VALIDATION_FAILED',
                $this->trans('admin.admin_user_invalid_email', locale: $request->getLocale()),
                Response::HTTP_BAD_REQUEST,
            );
        }

        if (mb_strlen($password) < 6) {
            return ApiResponse::error(
                'VALIDATION_FAILED',
                $this->trans('admin.admin_user_password_short', locale: $request->getLocale()),
                Response::HTTP_BAD_REQUEST,
            );
        }

        $existingUser = $this->userRepository->findOneBy(['email' => $email]);
        if ($existingUser instanceof User) {
            return ApiResponse::error(
                'USER_EXISTS',
                $this->trans('admin.admin_user_exists', locale: $request->getLocale()),
                Response::HTTP_CONFLICT,
            );
        }

        $user = new User();
        $user->setFirstName($firstName);
        $user->setLastName($lastName);
        $user->setEmail($email);
        $user->setPreferredLocale((string) $request->getLocale());
        $user->setRoles(['ROLE_ADMIN']);
        $user->setVerified(true);
        $user->setPassword($passwordHasher->hashPassword($user, $password));

        $this->em->persist($user);
        $this->em->flush();

        return ApiResponse::success([
            'id' => $user->getId()?->toRfc4122(),
            'email' => $user->getEmail(),
            'firstName' => $user->getFirstName(),
            'lastName' => $user->getLastName(),
            'roles' => $user->getRoles(),
            'created_at' => $user->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ], $this->trans('admin.admin_user_created', locale: $request->getLocale()), Response::HTTP_CREATED);
    }

    #[Route('/contracts', name: 'api_admin_contracts_list', methods: ['GET'])]
    public function listContracts(Request $request): JsonResponse
    {
        $page = max(1, $request->query->getInt('page', 1));
        $limit = max(1, min(50, $request->query->getInt('limit', 20)));
        $locale = $request->getLocale();

        $paginator = $this->contractRepository->paginateAll($page, $limit);
        $total = count($paginator);

        $data = array_map(
            fn (Contract $contract) => $this->contractService->serializeContract($contract, $locale),
            iterator_to_array($paginator),
        );

        return ApiResponse::paginated($data, $total, $page, $limit);
    }

    #[Route('/contracts', name: 'api_admin_contracts_create', methods: ['POST'])]
    public function createContract(
        Request $request,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
    ): JsonResponse {
        $dto = $this->deserializeJson($request, CreateContractDto::class, $serializer, $this->trans('admin.invalid_json', locale: $request->getLocale()));

        $errors = $validator->validate($dto);
        if (count($errors) > 0) {
            $messages = $this->translateValidationErrors(iterator_to_array($errors), $request->getLocale());

            throw new ApiException('VALIDATION_FAILED', $messages, Response::HTTP_BAD_REQUEST);
        }

        $contract = new Contract();
        $contract->setTitle($dto->title);
        $contract->setContent($dto->content);
        $contract->setVersion($dto->version);
        $contract->setIsRequired((bool) $dto->is_required);
        $contract->setIsActive(false);
        if (is_array($dto->translations)) {
            $this->ensureTranslationStorage();
            $this->syncTranslations($contract, $dto->translations);
        }

        $this->em->persist($contract);
        $this->em->flush();

        return ApiResponse::success(
            $this->contractService->serializeContract($contract, $request->getLocale()),
            $this->trans('admin.contract_created', locale: $request->getLocale()),
            Response::HTTP_CREATED,
        );
    }

    #[Route('/contracts/{id}', name: 'api_admin_contracts_update', methods: ['PUT', 'PATCH'])]
    public function updateContract(
        string $id,
        Request $request,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
    ): JsonResponse {
        $contract = $this->findContract($id, $request->getLocale());
        if ($contract instanceof JsonResponse) {
            return $contract;
        }

        $dto = $this->deserializeJson($request, UpdateContractDto::class, $serializer, $this->trans('admin.invalid_json', locale: $request->getLocale()));

        $errors = $validator->validate($dto);
        if (count($errors) > 0) {
            $messages = $this->translateValidationErrors(iterator_to_array($errors), $request->getLocale());

            throw new ApiException('VALIDATION_FAILED', $messages, Response::HTTP_BAD_REQUEST);
        }

        $hasTranslationUpdate = is_array($dto->translations) && count($dto->translations) > 0;
        if ($dto->title === null && $dto->content === null && $dto->version === null && $dto->is_required === null && !$hasTranslationUpdate) {
            return ApiResponse::error('VALIDATION_FAILED', $this->trans('admin.update_requires_fields', locale: $request->getLocale()), Response::HTTP_BAD_REQUEST);
        }

        if ($dto->title !== null) {
            $contract->setTitle($dto->title);
        }

        if ($dto->content !== null) {
            $contract->setContent($dto->content);
        }

        if ($dto->version !== null) {
            $contract->setVersion($dto->version);
        }

        if ($dto->is_required !== null) {
            $contract->setIsRequired($dto->is_required);
        }

        if (is_array($dto->translations)) {
            $this->ensureTranslationStorage();
            $this->syncTranslations($contract, $dto->translations);
        }
        $this->em->flush();

        return ApiResponse::success(
            $this->contractService->serializeContract($contract, $request->getLocale()),
            $this->trans('admin.contract_updated', locale: $request->getLocale()),
        );
    }

    #[Route('/contracts/{id}/activate', name: 'api_admin_contracts_activate', methods: ['POST'])]
    public function activateContract(string $id, Request $request): JsonResponse
    {
        $contract = $this->findContract($id, $request->getLocale());
        if ($contract instanceof JsonResponse) {
            return $contract;
        }

        foreach ($this->contractRepository->findAll() as $existing) {
            /** @var Contract $existing */
            $isSelected = $existing->getId()?->equals($contract->getId()) ?? false;
            $existing->setIsActive($isSelected);
            $existing->setIsRequired($isSelected);
        }

        $this->em->flush();

        return ApiResponse::success(
            $this->contractService->serializeContract($contract, $request->getLocale()),
            $this->trans('admin.contract_activated', locale: $request->getLocale()),
        );
    }

    private function findContract(string $id, ?string $locale = null): Contract|JsonResponse
    {
        if (!Uuid::isValid($id)) {
            return ApiResponse::error('INVALID_ID', $this->trans('admin.invalid_contract_id', locale: $locale), Response::HTTP_BAD_REQUEST);
        }

        $contract = $this->contractRepository->find($id);
        if ($contract === null) {
            return ApiResponse::error('CONTRACT_NOT_FOUND', $this->trans('admin.contract_not_found', locale: $locale), Response::HTTP_NOT_FOUND);
        }

        return $contract;
    }

    /**
     * @param list<array<string, mixed>>|null $translations
     */
    private function syncTranslations(Contract $contract, ?array $translations): void
    {
        if (!is_array($translations)) {
            return;
        }

        foreach ($translations as $translationData) {
            if (!is_array($translationData)) {
                continue;
            }

            $locale = $translationData['locale'] ?? null;
            $title = $translationData['title'] ?? null;
            $content = $translationData['content'] ?? null;

            if (!is_string($locale) || !is_string($title) || !is_string($content)) {
                continue;
            }

            $normalized = $this->normalizeLocale($locale);
            if ($normalized === null) {
                continue;
            }

            $translation = $contract->getTranslationForLocale($normalized) ?? new ContractTranslation();
            $translation->setLocale($normalized);
            $translation->setTitle($title);
            $translation->setContent($content);
            $contract->addTranslation($translation);
        }
    }

    private function normalizeLocale(string $locale): ?string
    {
        $value = strtolower(str_replace('_', '-', $locale));

        return match (true) {
            str_starts_with($value, 'tr') => 'tr',
            str_starts_with($value, 'en') => 'en',
            default => null,
        };
    }

    private function ensureTranslationStorage(): void
    {
        try {
            $schemaManager = $this->em->getConnection()->createSchemaManager();
            if ($schemaManager->tablesExist(['contract_translation'])) {
                return;
            }

            $this->em->getConnection()->executeStatement(<<<'SQL'
CREATE TABLE contract_translation (
    id UUID NOT NULL,
    contract_id UUID NOT NULL,
    locale VARCHAR(5) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY(id)
)
SQL);
            $this->em->getConnection()->executeStatement('CREATE UNIQUE INDEX uniq_contract_translation_locale ON contract_translation (contract_id, locale)');
            $this->em->getConnection()->executeStatement('CREATE INDEX idx_contract_translation_contract ON contract_translation (contract_id)');
            $this->em->getConnection()->executeStatement('ALTER TABLE contract_translation ADD CONSTRAINT fk_contract_translation_contract FOREIGN KEY (contract_id) REFERENCES contract (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        } catch (\Throwable) {
            // Ignore here; the following flush will fail if the storage is truly unavailable.
        }
    }

    /**
     * @param array<int, mixed> $errors
     */
    private function translateValidationErrors(array $errors, ?string $locale = null): string
    {
        $messages = array_map(function ($error) use ($locale) {
            if (!method_exists($error, 'getMessage')) {
                return (string) $error;
            }

            $message = $error->getMessage();
            $parameters = method_exists($error, 'getParameters') ? $error->getParameters() : [];

            return $this->translateValidationMessage($message, $parameters, $locale);
        }, $errors);

        return implode(', ', $messages);
    }

    /**
     * @param array<string, string> $parameters
     */
    private function translateValidationMessage(string $message, array $parameters = [], ?string $locale = null): string
    {
        $key = match ($message) {
            'Sözleşme başlığı boş olamaz.' => 'admin.validation.title_required',
            'Başlık en fazla {{ limit }} karakter olabilir.' => 'admin.validation.title_too_long',
            'Sözleşme içeriği boş olamaz.' => 'admin.validation.content_required',
            'Sürüm boş olamaz.' => 'admin.validation.version_required',
            'Sürüm pozitif bir sayı olmalıdır.' => 'admin.validation.version_positive',
            'Zorunluluk durumu belirtilmelidir.' => 'admin.validation.required_required',
            default => null,
        };

        if ($key === null) {
            return $message;
        }

        return $this->trans($key, $parameters, $locale);
    }

    /**
     * @param array<string, mixed> $parameters
     */
    private function trans(string $key, array $parameters = [], ?string $locale = null): string
    {
        return $this->translator->trans($key, $parameters, 'messages', $locale);
    }
}
