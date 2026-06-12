<?php

namespace App\Service;

use App\Dto\CreateEventDto;
use App\Dto\UpdateEventDto;
use App\Entity\Event;
use App\Entity\EventParticipant;
use App\Entity\Item;
use App\Entity\ItemAssignment;
use App\Entity\User;
use App\Repository\EventParticipantRepository;
use App\Repository\EventRepository;
use App\Repository\ItemRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Uid\Uuid;

class EventService
{
    public function __construct(
        private EventRepository $eventRepository,
        private EventParticipantRepository $participantRepository,
        private ItemRepository $itemRepository,
        private EntityManagerInterface $entityManager,
    ) {
    }

    public function create(User $user, CreateEventDto $dto): Event
    {
        $event = new Event();
        $timezone = $this->parseTimezone($dto->timezone);
        $event->setTitle($dto->title);
        $event->setDescription($dto->description);
        $event->setTimezone($timezone->getName());
        $event->setDate($this->parseDate($dto->date, $timezone));
        $event->setLocation($dto->location);
        $event->setCreatedBy($user);
        $event->setInviteCode($this->generateInviteCode($event));

        $this->eventRepository->save($event, true);

        return $event;
    }

    public function update(Event $event, UpdateEventDto $dto): Event
    {
        $timezone = $dto->timezone !== null
            ? $this->parseTimezone($dto->timezone)
            : new \DateTimeZone($event->getTimezone());

        if ($dto->title !== null) {
            $event->setTitle($dto->title);
        }

        if ($dto->description !== null) {
            $event->setDescription($dto->description);
        }

        if ($dto->date !== null) {
            $event->setDate($this->parseDate($dto->date, $timezone));
        }

        if ($dto->location !== null) {
            $event->setLocation($dto->location);
        }

        if ($dto->timezone !== null) {
            $event->setTimezone($timezone->getName());
        }

        $this->eventRepository->save($event, true);

        return $event;
    }

    public function delete(Event $event): void
    {
        $this->eventRepository->remove($event, true);
    }

    public function joinWithCode(Event $event, User $user, ?string $status = null): EventParticipant
    {
        $existing = $this->participantRepository->findOneBy(['event' => $event, 'user' => $user]);

        if ($existing) {
            if ($status) {
                $existing->setStatus($status);
                $this->entityManager->flush();
            }

            return $existing;
        }

        $participant = new EventParticipant();
        $participant->setEvent($event);
        $participant->setUser($user);
        $participant->setStatus($status ?? EventParticipant::STATUS_ACCEPTED);

        $this->entityManager->persist($participant);
        $this->entityManager->flush();

        return $participant;
    }

    public function updateParticipantStatus(EventParticipant $participant, string $status): void
    {
        $participant->setStatus($status);
        $this->entityManager->flush();
    }

    public function removeParticipant(EventParticipant $participant): int
    {
        $em = $this->entityManager;
        $event = $participant->getEvent();
        $user = $participant->getUser();

        return $em->wrapInTransaction(function () use ($em, $participant, $event, $user): int {
            $removedAssignments = 0;

            if ($event instanceof Event && $user instanceof User) {
                $removedAssignments = $this->removeUserAssignmentsFromEvent($event, $user);
            }

            $em->remove($participant);

            return $removedAssignments;
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function serialize(Event $event, User $currentUser): array
    {
        $createdBy = $event->getCreatedBy();
        $currentUserIsParticipant = $this->participantRepository->findOneByEventAndUser($event, $currentUser) !== null;

        return [
            'id' => $event->getId()->toRfc4122(),
            'title' => $event->getTitle(),
            'description' => $event->getDescription(),
            'date' => $this->formatUtc($event->getDate()),
            'timezone' => $event->getTimezone(),
            'location' => $event->getLocation(),
            'invite_code' => $event->getInviteCode(),
            'created_by' => [
                'id' => $createdBy?->getId()->toRfc4122(),
                'email' => $createdBy?->getEmail(),
            ],
            'created_at' => $this->formatUtc($event->getCreatedAt()),
            'is_owner' => $createdBy?->getId()->equals($currentUser->getId()) ?? false,
            'is_participant' => $currentUserIsParticipant,
            'participants' => $this->getParticipants($event),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function getParticipants(Event $event): array
    {
        $qb = $this->participantRepository->createQueryBuilder('ep')
            ->where('ep.event = :event')
            ->setParameter('event', $event)
            ->orderBy('ep.createdAt', 'DESC');

        $participants = $qb->getQuery()->getResult();

        return array_map(
            fn (EventParticipant $participant) => [
                'id' => $participant->getId()->toRfc4122(),
                'status' => $participant->getStatus(),
                'user' => [
                    'id' => $participant->getUser()?->getId()->toRfc4122(),
                    'email' => $participant->getUser()?->getEmail(),
                    'firstName' => $participant->getUser()?->getFirstName(),
                    'lastName' => $participant->getUser()?->getLastName(),
                ],
            ],
            $participants,
        );
    }

    private function removeUserAssignmentsFromEvent(Event $event, User $user): int
    {
        $em = $this->entityManager;
        $removedAssignments = 0;

        foreach ($this->itemRepository->findByEvent($event->getId()->toRfc4122()) as $item) {
            if (!$item instanceof Item) {
                continue;
            }

            $em->lock($item, LockMode::PESSIMISTIC_WRITE);

            foreach ($item->getAssignments()->toArray() as $assignment) {
                if (!$assignment instanceof ItemAssignment) {
                    continue;
                }

                if ($assignment->getUser()?->getId()->equals($user->getId())) {
                    $item->removeAssignment($assignment);
                    $em->remove($assignment);
                    ++$removedAssignments;
                }
            }

            if ($item->getAssignments()->isEmpty()) {
                $item->setStatus(Item::STATUS_PENDING);
            } elseif ($item->getStatus() === Item::STATUS_PENDING) {
                $item->setStatus(Item::STATUS_ASSIGNED);
            }

            $em->persist($item);
        }

        return $removedAssignments;
    }

    private function generateInviteCode(Event $event): string
    {
        $code = strtoupper(Uuid::v4()->toBase58());

        while ($this->eventRepository->findOneBy(['inviteCode' => $code])) {
            $code = strtoupper(Uuid::v4()->toBase58());
        }

        return $code;
    }

    private function parseDate(string $value, \DateTimeZone $timezone): \DateTimeImmutable
    {
        try {
            return (new \DateTimeImmutable($value, $timezone))->setTimezone(new \DateTimeZone('UTC'));
        } catch (\Exception) {
            throw new \InvalidArgumentException('Geçersiz tarih formatı.');
        }
    }

    private function parseTimezone(string $value): \DateTimeZone
    {
        try {
            return new \DateTimeZone(trim($value));
        } catch (\Exception) {
            throw new \InvalidArgumentException('Geçersiz zaman dilimi.');
        }
    }

    private function formatUtc(?\DateTimeInterface $date): ?string
    {
        if ($date === null) {
            return null;
        }

        return \DateTimeImmutable::createFromInterface($date)
            ->setTimezone(new \DateTimeZone('UTC'))
            ->format(\DateTimeInterface::ATOM);
    }
}
