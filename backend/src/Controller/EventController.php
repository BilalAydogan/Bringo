<?php

namespace App\Controller;

use App\Dto\CreateEventDto;
use App\Dto\UpdateEventDto;
use App\Entity\Event;
use App\Entity\EventParticipant;
use App\Entity\User;
use App\Exception\ApiException;
use App\Http\ApiResponse;
use App\Repository\EventParticipantRepository;
use App\Repository\EventRepository;
use App\Service\EventService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/events')]
class EventController extends ApiController
{
    #[Route('', name: 'api_events_list', methods: ['GET'])]
    public function list(Request $request, EventRepository $eventRepository, EventService $eventService): JsonResponse
    {
        $user = $this->requireUser();
        $page = max(1, $request->query->getInt('page', 1));
        $limit = max(1, min(50, $request->query->getInt('limit', 20)));

        $paginator = $eventRepository->paginateByUser($user, $page, $limit);
        $total = count($paginator);

        $data = array_map(
            fn (Event $event) => $eventService->serialize($event, $user),
            iterator_to_array($paginator),
        );

        return ApiResponse::paginated($data, $total, $page, $limit);
    }

    #[Route('', name: 'api_events_create', methods: ['POST'])]
    public function create(
        Request $request,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        EventService $eventService,
    ): JsonResponse {
        $dto = $this->deserializeJson($request, CreateEventDto::class, $serializer);
        $this->validateDto($dto, $validator);

        $user = $this->requireUser();

        try {
            $event = $eventService->create($user, $dto);
        } catch (\InvalidArgumentException $e) {
            throw new ApiException('INVALID_DATE', $e->getMessage(), Response::HTTP_BAD_REQUEST, previous: $e);
        }

        return ApiResponse::success(
            $eventService->serialize($event, $user),
            'Etkinlik oluşturuldu.',
            Response::HTTP_CREATED,
        );
    }

    #[Route('/join/{code}', name: 'api_events_join', methods: ['POST'])]
    public function join(
        string $code,
        EventRepository $eventRepository,
        EventService $eventService,
        EventParticipantRepository $participantRepository,
    ): JsonResponse {
        if (!Uuid::isValid($code) && strlen($code) < 6) {
            return ApiResponse::error('INVALID_CODE', 'Geçersiz davet kodu.', Response::HTTP_BAD_REQUEST);
        }

        $event = $eventRepository->findOneBy(['inviteCode' => $code]);

        if (!$event) {
            return ApiResponse::error('EVENT_NOT_FOUND', 'Davet koduyla eşleşen etkinlik bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        $currentUser = $this->getUser();
        if (!$currentUser instanceof User) {
            return ApiResponse::error('UNAUTHORIZED', 'Oturum bulunamadı.', Response::HTTP_UNAUTHORIZED);
        }
        $owner = $event->getCreatedBy();

        if ($owner && $owner->getId()->equals($currentUser->getId())) {
            return ApiResponse::error('INVALID_REQUEST', 'Kendi etkinliğinize katılamazsınız.', Response::HTTP_BAD_REQUEST);
        }

        $participant = $eventService->joinWithCode($event, $currentUser);

        return ApiResponse::success([
            'event' => $eventService->serialize($event, $currentUser),
            'status' => $participant->getStatus(),
        ], 'Etkinliğe katıldınız.', Response::HTTP_CREATED);
    }

    #[Route('/participants/{id}/accept', name: 'api_events_participant_accept', methods: ['POST'])]
    public function acceptInvitation(
        string $id,
        EventRepository $eventRepository,
        EventParticipantRepository $participantRepository,
        EventService $eventService,
    ): JsonResponse {
        $participant = $participantRepository->find($id);

        if (!$participant) {
            return ApiResponse::error('PARTICIPANT_NOT_FOUND', 'Davet bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        $user = $this->requireUser();

        if (!$participant->getUser()?->getId()->equals($user->getId())) {
            return ApiResponse::error('ACCESS_DENIED', 'Bu davet üzerinde işlem yapma yetkiniz yok.', Response::HTTP_FORBIDDEN);
        }

        $eventService->updateParticipantStatus($participant, EventParticipant::STATUS_ACCEPTED);

        return ApiResponse::success([
            'event' => $eventService->serialize($participant->getEvent(), $user),
            'status' => EventParticipant::STATUS_ACCEPTED,
        ], 'Davet kabul edildi.');
    }

    #[Route('/participants/{id}/reject', name: 'api_events_participant_reject', methods: ['POST'])]
    public function rejectInvitation(
        string $id,
        EventParticipantRepository $participantRepository,
        EventService $eventService,
    ): JsonResponse {
        $participant = $participantRepository->find($id);

        if (!$participant) {
            return ApiResponse::error('PARTICIPANT_NOT_FOUND', 'Davet bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        $user = $this->requireUser();

        if (!$participant->getUser()?->getId()->equals($user->getId())) {
            return ApiResponse::error('ACCESS_DENIED', 'Bu davet üzerinde işlem yapma yetkiniz yok.', Response::HTTP_FORBIDDEN);
        }

        $eventService->updateParticipantStatus($participant, EventParticipant::STATUS_REJECTED);

        return ApiResponse::success([
            'event' => $eventService->serialize($participant->getEvent(), $user),
            'status' => EventParticipant::STATUS_REJECTED,
        ], 'Davet reddedildi.');
    }

    #[Route('/participants/{id}', name: 'api_events_participant_remove', methods: ['DELETE'])]
    public function removeParticipant(
        string $id,
        EventParticipantRepository $participantRepository,
        EventService $eventService,
    ): JsonResponse {
        $participant = $participantRepository->find($id);

        if (!$participant) {
            return ApiResponse::error('PARTICIPANT_NOT_FOUND', 'Katılımcı bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        $event = $participant->getEvent();

        $currentUser = $this->getUser();
        if (!$currentUser instanceof User) {
            return ApiResponse::error('UNAUTHORIZED', 'Oturum bulunamadı.', Response::HTTP_UNAUTHORIZED);
        }

        if (!$event->getCreatedBy()?->getId()->equals($currentUser->getId())) {
            return ApiResponse::error('ACCESS_DENIED', 'Sadece etkinlik sahibi katılımcı çıkarabilir.', Response::HTTP_FORBIDDEN);
        }

        $eventService->removeParticipant($participant);

        return ApiResponse::success(null, 'Katılımcı etkinlikten çıkarıldı.');
    }

    #[Route('/invitations', name: 'api_events_invitations', methods: ['GET'])]
    public function invitations(Request $request, EventParticipantRepository $participantRepository, EventService $eventService): JsonResponse
    {
        $user = $this->requireUser();
        $page = max(1, $request->query->getInt('page', 1));
        $limit = max(1, min(50, $request->query->getInt('limit', 20)));

        $paginator = $participantRepository->paginateInvitedByUser($user, $page, $limit);
        $total = count($paginator);

        $data = array_map(
            fn (EventParticipant $participant) => [
                'id' => $participant->getId()->toRfc4122(),
                'status' => $participant->getStatus(),
                'event' => $eventService->serialize($participant->getEvent(), $user),
            ],
            iterator_to_array($paginator),
        );

        return ApiResponse::paginated($data, $total, $page, $limit);
    }

    #[Route('/joined', name: 'api_events_joined', methods: ['GET'])]
    public function joined(Request $request, EventParticipantRepository $participantRepository, EventService $eventService): JsonResponse
    {
        $user = $this->requireUser();
        $page = max(1, $request->query->getInt('page', 1));
        $limit = max(1, min(50, $request->query->getInt('limit', 20)));

        $paginator = $participantRepository->paginateAcceptedByUser($user, $page, $limit);
        $total = count($paginator);

        $data = array_map(
            fn (EventParticipant $participant) => $eventService->serialize($participant->getEvent(), $user),
            iterator_to_array($paginator),
        );

        return ApiResponse::paginated($data, $total, $page, $limit);
    }

    #[Route('/{id}/leave', name: 'api_events_leave', methods: ['POST'])]
    public function leave(
        string $id,
        EventRepository $eventRepository,
        EventParticipantRepository $participantRepository,
        EventService $eventService,
    ): JsonResponse {
        if (!Uuid::isValid($id)) {
            return ApiResponse::error('INVALID_ID', 'Geçersiz etkinlik kimliği.', Response::HTTP_BAD_REQUEST);
        }

        $event = $eventRepository->find($id);
        if ($event === null) {
            return ApiResponse::error('EVENT_NOT_FOUND', 'Etkinlik bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        $user = $this->requireUser();

        if ($event->getCreatedBy()?->getId()->equals($user->getId())) {
            return ApiResponse::error('INVALID_REQUEST', 'Etkinlik sahibi kendi etkinliğinden ayrılamaz.', Response::HTTP_BAD_REQUEST);
        }

        $participant = $participantRepository->findOneByEventAndUser($event, $user);
        if ($participant === null) {
            return ApiResponse::error('PARTICIPANT_NOT_FOUND', 'Bu etkinlikte katılımcı kaydınız bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        $removedAssignments = $eventService->removeParticipant($participant);

        return ApiResponse::success([
            'removed_assignments' => $removedAssignments,
        ], 'Etkinlikten ayrıldınız.');
    }

    #[Route('/{id}/invite', name: 'api_events_invite', methods: ['GET'])]
    public function invite(string $id, EventRepository $eventRepository, EventService $eventService): JsonResponse
    {
        $event = $this->findOwnedEvent($id, $eventRepository);

        if ($event instanceof JsonResponse) {
            return $event;
        }

        $user = $this->requireUser();

        return ApiResponse::success([
            'code' => $event->getInviteCode(),
            'invite_url' => sprintf('/events/join/%s', $event->getInviteCode()),
        ], 'Davet kodu hazır.');
    }

    #[Route('/{id}', name: 'api_events_show', methods: ['GET'])]
    public function show(string $id, EventRepository $eventRepository, EventService $eventService, EventParticipantRepository $participantRepository): JsonResponse
    {
        $event = $this->findAccessibleEvent($id, $eventRepository, $participantRepository);

        if ($event instanceof JsonResponse) {
            return $event;
        }

        $user = $this->requireUser();

        return ApiResponse::success($eventService->serialize($event, $user));
    }

    #[Route('/{id}', name: 'api_events_update', methods: ['PUT'])]
    public function update(
        string $id,
        Request $request,
        EventRepository $eventRepository,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        EventService $eventService,
    ): JsonResponse {
        $event = $this->findOwnedEvent($id, $eventRepository);

        if ($event instanceof JsonResponse) {
            return $event;
        }

        try {
            $dto = $serializer->deserialize($request->getContent(), UpdateEventDto::class, 'json');
        } catch (\Exception) {
            return ApiResponse::error('INVALID_JSON', 'Geçersiz JSON verisi.', Response::HTTP_BAD_REQUEST);
        }

        $errors = $validator->validate($dto);
        if (count($errors) > 0) {
            $messages = array_map(fn ($e) => $e->getMessage(), iterator_to_array($errors));

            return ApiResponse::error('VALIDATION_FAILED', implode(', ', $messages), Response::HTTP_BAD_REQUEST);
        }

        if ($dto->title === null && $dto->description === null && $dto->date === null && $dto->location === null) {
            return ApiResponse::error('VALIDATION_FAILED', 'Güncellenecek en az bir alan gönderilmelidir.', Response::HTTP_BAD_REQUEST);
        }

        /** @var User $user */
        $user = $this->getUser();

        try {
            $event = $eventService->update($event, $dto);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error('INVALID_DATE', $e->getMessage(), Response::HTTP_BAD_REQUEST);
        }

        return ApiResponse::success($eventService->serialize($event, $user), 'Etkinlik güncellendi.');
    }

    #[Route('/{id}', name: 'api_events_delete', methods: ['DELETE'])]
    public function delete(string $id, EventRepository $eventRepository, EventService $eventService): JsonResponse
    {
        $event = $this->findOwnedEvent($id, $eventRepository);

        if ($event instanceof JsonResponse) {
            return $event;
        }

        $eventService->delete($event);

        return ApiResponse::success(null, 'Etkinlik silindi.');
    }

    private function findOwnedEvent(string $id, EventRepository $eventRepository): Event|JsonResponse
    {
        if (!Uuid::isValid($id)) {
            return ApiResponse::error('INVALID_ID', 'Geçersiz etkinlik kimliği.', Response::HTTP_BAD_REQUEST);
        }

        $event = $eventRepository->find($id);
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

    private function findAccessibleEvent(string $id, EventRepository $eventRepository, EventParticipantRepository $participantRepository): Event|JsonResponse
    {
        if (!Uuid::isValid($id)) {
            return ApiResponse::error('INVALID_ID', 'Geçersiz etkinlik kimliği.', Response::HTTP_BAD_REQUEST);
        }

        $event = $eventRepository->find($id);
        if ($event === null) {
            return ApiResponse::error('EVENT_NOT_FOUND', 'Etkinlik bulunamadı.', Response::HTTP_NOT_FOUND);
        }

        $currentUser = $this->requireUser();
        $isOwner = $event->getCreatedBy()?->getId()->equals($currentUser->getId());
        $isParticipant = $participantRepository->findOneByEventAndUser($event, $currentUser) !== null;

        if (!$isOwner && !$isParticipant) {
            return ApiResponse::error('ACCESS_DENIED', 'Bu etkinliği görme yetkiniz yok.', Response::HTTP_FORBIDDEN);
        }

        return $event;
    }

    private function requireUser(): User
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException('Oturum bulunamadı.');
        }

        return $user;
    }
}
