<?php

namespace App\Service;

use App\Dto\CreateItemDto;
use App\Dto\UpdateItemDto;
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

class ItemService
{
    public function __construct(
        private ItemRepository $itemRepository,
        private EventRepository $eventRepository,
        private EventParticipantRepository $participantRepository,
        private EntityManagerInterface $entityManager,
    ) {
    }

    public function createItem(CreateItemDto $dto, string $eventId): Item
    {
        $event = $this->getEventOrFail($eventId);

        $item = new Item();
        $item->setEvent($event);
        $item->setName($dto->name);
        $item->setTargetQuantity($dto->target_quantity ?? null);
        $item->setStatus(Item::STATUS_PENDING);

        $this->itemRepository->save($item, true);

        return $item;
    }

    public function updateItem(Item $item, UpdateItemDto $dto): Item
    {
        if ($dto->name !== null) {
            $item->setName($dto->name);
        }

        if ($dto->target_quantity !== null) {
            $totalAssigned = $this->getTotalAssigned($item);

            if ($totalAssigned > $dto->target_quantity) {
                throw new \RuntimeException(
                    sprintf('Yeni hedef adet (%d), mevcut atama toplamından (%d) küçük olamaz.', $dto->target_quantity, $totalAssigned)
                );
            }

            $item->setTargetQuantity($dto->target_quantity);
        }

        if ($dto->status !== null) {
            $item->setStatus($dto->status);

            if ($dto->status === Item::STATUS_COMPLETED) {
                foreach ($item->getAssignments() as $assignment) {
                    $assignment->setStatus(ItemAssignment::STATUS_COMPLETED);
                }
            }
        }

        $this->itemRepository->save($item, true);

        return $item;
    }

    public function deleteItem(Item $item): void
    {
        $this->itemRepository->remove($item, true);
    }

    public function assignUserToItem(Item $item, User $user, int $quantity = 1): ItemAssignment
    {
        if ($item->getTargetQuantity() !== null) {
            $currentTotal = array_sum(array_map(
                fn (ItemAssignment $a) => $a->getQuantity(),
                $item->getAssignments()->toArray()
            ));

            if ($currentTotal + $quantity > $item->getTargetQuantity()) {
                throw new \RuntimeException(
                    sprintf('Maksimum adet aşıldı. Hedef: %d, Mevcut: %d', $item->getTargetQuantity(), $currentTotal)
                );
            }
        }

        $assignment = new ItemAssignment();
        $assignment->setItem($item);
        $assignment->setUser($user);
        $assignment->setQuantity($quantity);
        $assignment->setStatus(ItemAssignment::STATUS_ASSIGNED);

        $item->addAssignment($assignment);
        $this->itemRepository->save($item, true);

        return $assignment;
    }

    public function unassignUserFromItem(Item $item, User $user): void
    {
        foreach ($item->getAssignments() as $assignment) {
            if ($assignment->getUser()?->getId()->equals($user->getId())) {
                $item->removeAssignment($assignment);
                $this->entityManager->remove($assignment);
            }
        }
        $this->itemRepository->save($item, true);
    }

    public function updateAssignmentStatus(ItemAssignment $assignment, string $status): ItemAssignment
    {
        $assignment->setStatus($status);
        $this->entityManager->flush();

        return $assignment;
    }

    public function findEventItem(string $eventId, string $itemId): ?Item
    {
        if (!Uuid::isValid($eventId) || !Uuid::isValid($itemId)) {
            return null;
        }

        $item = $this->itemRepository->find($itemId);

        if ($item === null || $item->getEvent()?->getId()->toString() !== $eventId) {
            return null;
        }

        return $item;
    }

    /**
     * @param list<array<string, mixed>> $assignments
     */
    public function reassignItem(Item $item, array $assignments): Item
    {
        $em = $this->entityManager;
        $normalizedAssignments = $this->normalizeAssignments($item, $assignments);
        $total = array_sum(array_map(fn (array $assignment) => $assignment['quantity'], $normalizedAssignments));

        if ($item->getTargetQuantity() !== null && $total > $item->getTargetQuantity()) {
            throw new \RuntimeException(
                sprintf('Atama yapılan toplam adet (%d), hedef adeti (%d) aşıyor.', $total, $item->getTargetQuantity())
            );
        }

        return $em->wrapInTransaction(function () use ($em, $item, $normalizedAssignments, $total): Item {
            $em->lock($item, LockMode::PESSIMISTIC_WRITE);

            if ($item->getTargetQuantity() !== null && $total > $item->getTargetQuantity()) {
                throw new \RuntimeException(
                    sprintf('Atama yapılan toplam adet (%d), hedef adeti (%d) aşıyor.', $total, $item->getTargetQuantity())
                );
            }

            foreach ($item->getAssignments()->toArray() as $existing) {
                if (!$existing instanceof ItemAssignment) {
                    continue;
                }

                $item->removeAssignment($existing);
                $em->remove($existing);
            }

            foreach ($normalizedAssignments as $assignmentData) {
                $assignment = new ItemAssignment();
                $assignment->setItem($item);
                $assignment->setUser($assignmentData['user']);
                $assignment->setQuantity($assignmentData['quantity']);
                $assignment->setStatus(ItemAssignment::STATUS_ASSIGNED);

                $em->persist($assignment);
                $item->addAssignment($assignment);
            }

            $item->setStatus($normalizedAssignments === [] ? Item::STATUS_PENDING : Item::STATUS_ASSIGNED);
            $em->persist($item);

            return $item;
        });
    }

    public function completeItem(Item $item): Item
    {
        $em = $this->entityManager;

        return $em->wrapInTransaction(function () use ($em, $item): Item {
            $em->lock($item, LockMode::PESSIMISTIC_WRITE);

            $item->setStatus(Item::STATUS_COMPLETED);
            foreach ($item->getAssignments() as $assignment) {
                $assignment->setStatus(ItemAssignment::STATUS_COMPLETED);
            }

            $em->persist($item);

            return $item;
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function serialize(Item $item): array
    {
        $assignments = [];
        foreach ($item->getAssignments() as $assignment) {
            $assignments[] = [
                'id' => $assignment->getId()?->toRfc4122(),
                'quantity' => $assignment->getQuantity(),
                'status' => $assignment->getStatus(),
                'user' => [
                    'id' => $assignment->getUser()?->getId()->toRfc4122(),
                    'email' => $assignment->getUser()?->getEmail(),
                    'firstName' => $assignment->getUser()?->getFirstName(),
                    'lastName' => $assignment->getUser()?->getLastName(),
                ],
            ];
        }

        $totalAssigned = array_sum(array_map(fn (array $a) => $a['quantity'], $assignments));

        return [
            'id' => $item->getId()?->toRfc4122(),
            'name' => $item->getName(),
            'status' => $item->getStatus(),
            'target_quantity' => $item->getTargetQuantity(),
            'total_assigned' => $totalAssigned,
            'assignments' => $assignments,
            'created_at' => $item->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function getEventOrFail(string $eventId): Event
    {
        if (!Uuid::isValid($eventId)) {
            throw new \InvalidArgumentException('Geçersiz etkinlik kimliği.');
        }

        $event = $this->eventRepository->find($eventId);

        if ($event === null) {
            throw new \InvalidArgumentException('Etkinlik bulunamadı.');
        }

        return $event;
    }

    /**
     * @param list<array<string, mixed>> $assignments
     * @return list<array{user: User, quantity: int}>
     */
    private function normalizeAssignments(Item $item, array $assignments): array
    {
        $event = $item->getEvent();
        if ($event === null) {
            throw new \RuntimeException('Malzeme bir etkinliğe bağlı değil.');
        }

        $normalized = [];
        $seenUserIds = [];

        foreach ($assignments as $assignmentData) {
            if (!is_array($assignmentData)) {
                throw new \RuntimeException('Atama verisi geçersiz.');
            }

            $userId = $assignmentData['user_id'] ?? null;
            if (!is_string($userId) || !Uuid::isValid($userId)) {
                throw new \RuntimeException('Geçerli bir kullanıcı seçilmelidir.');
            }

            if (isset($seenUserIds[$userId])) {
                throw new \RuntimeException('Aynı kullanıcı bir malzemeye birden fazla kez atanamaz.');
            }
            $seenUserIds[$userId] = true;

            $quantity = filter_var($assignmentData['quantity'] ?? 1, FILTER_VALIDATE_INT);
            if ($quantity === false || $quantity < 1) {
                throw new \RuntimeException('Atama adedi en az 1 olmalıdır.');
            }

            $user = $this->entityManager->getRepository(User::class)->find($userId);
            if (!$user instanceof User) {
                throw new \RuntimeException('Atanacak kullanıcı bulunamadı.');
            }

            if (!$this->canAssignUserToEvent($event, $user)) {
                throw new \RuntimeException('Seçilen kullanıcı bu etkinliğin kabul edilmiş katılımcısı değil.');
            }

            $normalized[] = [
                'user' => $user,
                'quantity' => $quantity,
            ];
        }

        return $normalized;
    }

    private function canAssignUserToEvent(Event $event, User $user): bool
    {
        if ($event->getCreatedBy()?->getId()->equals($user->getId())) {
            return true;
        }

        $participant = $this->participantRepository->findOneByEventAndUser($event, $user);

        return $participant?->getStatus() === EventParticipant::STATUS_ACCEPTED;
    }

    private function getTotalAssigned(Item $item): int
    {
        return array_sum(array_map(
            fn (ItemAssignment $assignment) => $assignment->getQuantity(),
            $item->getAssignments()->toArray(),
        ));
    }
}
