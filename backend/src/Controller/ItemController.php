<?php

namespace App\Controller;

use App\Dto\CreateItemDto;
use App\Dto\UpdateItemDto;
use App\Entity\Event;
use App\Entity\Item;
use App\Entity\User;
use App\Exception\ApiException;
use App\Http\ApiResponse;
use App\Repository\EventParticipantRepository;
use App\Repository\EventRepository;
use App\Repository\ItemRepository;
use App\Service\ItemService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/events/{eventId}/items')]
class ItemController extends ApiController
{
    public function __construct(
        private ItemRepository $itemRepository,
        private ItemService $itemService,
        private EventRepository $eventRepository,
        private EventParticipantRepository $participantRepository,
    ) {
    }

    #[Route('', name: 'api_items_list', methods: ['GET'])]
    public function list(string $eventId): JsonResponse
    {
        $event = $this->findAccessibleEvent($eventId);
        if ($event instanceof JsonResponse) {
            return $event;
        }

        $items = $this->itemRepository->findByEvent($eventId);

        $data = array_map(
            fn (Item $item) => $this->itemService->serialize($item),
            $items,
        );

        return ApiResponse::success($data);
    }

    #[Route('', name: 'api_items_create', methods: ['POST'])]
    public function create(
        string $eventId,
        Request $request,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
    ): JsonResponse {
        $event = $this->findOwnedEvent($eventId);
        if ($event instanceof JsonResponse) {
            return $event;
        }

        $dto = $this->deserializeJson($request, CreateItemDto::class, $serializer);
        $this->validateDto($dto, $validator);

        $item = $this->itemService->createItem($dto, $eventId);

        return ApiResponse::success(
            $this->itemService->serialize($item),
            'Malzeme eklendi.',
            Response::HTTP_CREATED,
        );
    }

    #[Route('/{id}', name: 'api_items_show', methods: ['GET'])]
    public function show(string $eventId, string $id): JsonResponse
    {
        $event = $this->findAccessibleEvent($eventId);
        if ($event instanceof JsonResponse) {
            return $event;
        }

        $item = $this->itemService->findEventItem($eventId, $id);

        if ($item === null) {
            return ApiResponse::error('ITEM_NOT_FOUND', 'Malzeme bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        return ApiResponse::success($this->itemService->serialize($item));
    }

    #[Route('/{id}', name: 'api_items_update', methods: ['PUT', 'PATCH'])]
    public function update(
        string $eventId,
        string $id,
        Request $request,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
    ): JsonResponse {
        $event = $this->findOwnedEvent($eventId);
        if ($event instanceof JsonResponse) {
            return $event;
        }

        $item = $this->itemService->findEventItem($eventId, $id);

        if ($item === null) {
            return ApiResponse::error('ITEM_NOT_FOUND', 'Malzeme bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        $dto = $this->deserializeJson($request, UpdateItemDto::class, $serializer);
        $this->validateDto($dto, $validator);

        if ($dto->name === null && $dto->target_quantity === null && $dto->status === null) {
            return ApiResponse::error('VALIDATION_FAILED', 'Güncellenecek en az bir alan gönderilmelidir.', Response::HTTP_BAD_REQUEST);
        }

        $item = $this->itemService->updateItem($item, $dto);

        return ApiResponse::success($this->itemService->serialize($item), 'Malzeme güncellendi.');
    }

    #[Route('/{id}', name: 'api_items_delete', methods: ['DELETE'])]
    public function delete(string $eventId, string $id): JsonResponse
    {
        $event = $this->findOwnedEvent($eventId);
        if ($event instanceof JsonResponse) {
            return $event;
        }

        $item = $this->itemService->findEventItem($eventId, $id);

        if ($item === null) {
            return ApiResponse::error('ITEM_NOT_FOUND', 'Malzeme bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        $this->itemService->deleteItem($item);

        return ApiResponse::success(null, 'Malzeme silindi.');
    }

    #[Route('/{id}/assign', name: 'api_items_assign', methods: ['POST'])]
    public function assign(string $eventId, string $id, Request $request): JsonResponse
    {
        $event = $this->findOwnedEvent($eventId);
        if ($event instanceof JsonResponse) {
            return $event;
        }

        $item = $this->itemService->findEventItem($eventId, $id);

        if ($item === null) {
            return ApiResponse::error('ITEM_NOT_FOUND', 'Malzeme bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        $data = $this->decodeJsonObject($request);

        $assignments = $data['assignments'] ?? [];

        if (!is_array($assignments)) {
            return ApiResponse::error('VALIDATION_FAILED', 'assignments dizisi gerekli.', Response::HTTP_BAD_REQUEST);
        }

        $item = $this->itemService->reassignItem($item, $assignments);

        return ApiResponse::success($this->itemService->serialize($item), 'Atamalar güncellendi.');
    }

    #[Route('/{id}/complete', name: 'api_items_complete', methods: ['POST'])]
    public function complete(string $eventId, string $id): JsonResponse
    {
        $event = $this->findOwnedEvent($eventId);
        if ($event instanceof JsonResponse) {
            return $event;
        }

        $item = $this->itemService->findEventItem($eventId, $id);

        if ($item === null) {
            return ApiResponse::error('ITEM_NOT_FOUND', 'Malzeme bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        $item = $this->itemService->completeItem($item);

        return ApiResponse::success($this->itemService->serialize($item), 'Malzeme tamamlandı.');
    }

    private function findOwnedEvent(string $eventId): Event|JsonResponse
    {
        if (!Uuid::isValid($eventId)) {
            return ApiResponse::error('INVALID_ID', 'Geçersiz etkinlik kimliği.', Response::HTTP_BAD_REQUEST);
        }

        $event = $this->eventRepository->find($eventId);
        if ($event === null) {
            return ApiResponse::error('EVENT_NOT_FOUND', 'Etkinlik bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        /** @var User $user */
        $user = $this->getUser();
        if (!$event->getCreatedBy()?->getId()->equals($user->getId())) {
            return ApiResponse::error('ACCESS_DENIED', 'Bu etkinlik üzerinde işlem yapma yetkiniz yok.', Response::HTTP_FORBIDDEN);
        }

        return $event;
    }

    private function findAccessibleEvent(string $eventId): Event|JsonResponse
    {
        if (!Uuid::isValid($eventId)) {
            return ApiResponse::error('INVALID_ID', 'Geçersiz etkinlik kimliği.', Response::HTTP_BAD_REQUEST);
        }

        $event = $this->eventRepository->find($eventId);
        if ($event === null) {
            return ApiResponse::error('EVENT_NOT_FOUND', 'Etkinlik bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        /** @var User $user */
        $user = $this->getUser();
        $isOwner = $event->getCreatedBy()?->getId()->equals($user->getId()) ?? false;
        $isParticipant = $this->participantRepository->findOneByEventAndUser($event, $user) !== null;

        if (!$isOwner && !$isParticipant) {
            return ApiResponse::error('ACCESS_DENIED', 'Bu etkinliği görme yetkiniz yok.', Response::HTTP_FORBIDDEN);
        }

        return $event;
    }
}
