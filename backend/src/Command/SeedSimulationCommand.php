<?php

namespace App\Command;

use App\Entity\Event;
use App\Entity\EventParticipant;
use App\Entity\Item;
use App\Entity\ItemAssignment;
use App\Entity\User;
use App\Entity\UserContract;
use App\Repository\ContractRepository;
use App\Repository\EventParticipantRepository;
use App\Repository\EventRepository;
use App\Repository\ItemRepository;
use App\Repository\UserContractRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Uid\Uuid;

#[AsCommand(
    name: 'app:seed-simulation',
    description: 'Seeds simulation users, events, participants, and items for local testing.',
)]
class SeedSimulationCommand extends Command
{
    private const USER_COUNT = 50;
    private const PAST_EVENT_COUNT = 40;
    private const EMAIL_PREFIX = 'sim.user';
    private const EMAIL_DOMAIN = 'bringo.test';
    private const DEFAULT_PASSWORD = '123456';

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly ContractRepository $contractRepository,
        private readonly EventRepository $eventRepository,
        private readonly EventParticipantRepository $eventParticipantRepository,
        private readonly ItemRepository $itemRepository,
        private readonly UserContractRepository $userContractRepository,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $users = $this->resetSimulationData();
        $users = $this->seedUsers($users);
        $this->seedEvents($users);

        $output->writeln(sprintf(
            'Simulation ready: %d users, %d events (%d past / %d future). Password: %s',
            self::USER_COUNT,
            self::USER_COUNT,
            self::PAST_EVENT_COUNT,
            self::USER_COUNT - self::PAST_EVENT_COUNT,
            self::DEFAULT_PASSWORD,
        ));

        return Command::SUCCESS;
    }

    /**
     * @return list<User>
     */
    private function resetSimulationData(): array
    {
        $simulationUsers = $this->entityManager->createQueryBuilder()
            ->select('u')
            ->from(User::class, 'u')
            ->where('u.email LIKE :prefix')
            ->setParameter('prefix', self::EMAIL_PREFIX . '%@' . self::EMAIL_DOMAIN)
            ->getQuery()
            ->getResult();

        if ($simulationUsers === []) {
            return [];
        }

        $simulationEvents = $this->eventRepository->createQueryBuilder('e')
            ->where('e.createdBy IN (:users)')
            ->setParameter('users', $simulationUsers)
            ->getQuery()
            ->getResult();

        foreach ($simulationEvents as $event) {
            if (!$event instanceof Event) {
                continue;
            }

            foreach ($this->eventParticipantRepository->findBy(['event' => $event]) as $participant) {
                $this->entityManager->remove($participant);
            }

            foreach ($this->itemRepository->findByEvent($event->getId()?->toRfc4122() ?? '') as $item) {
                if ($item instanceof Item) {
                    $this->entityManager->remove($item);
                }
            }

            $this->entityManager->remove($event);
        }

        foreach ($simulationUsers as $user) {
            if (!$user instanceof User) {
                continue;
            }

            foreach ($this->eventParticipantRepository->findBy(['user' => $user]) as $participant) {
                $this->entityManager->remove($participant);
            }

            foreach ($this->userContractRepository->findBy(['user' => $user]) as $userContract) {
                $this->entityManager->remove($userContract);
            }

            $this->entityManager->remove($user);
        }

        $this->entityManager->flush();
        $this->entityManager->clear();

        return [];
    }

    /**
     * @param list<User> $users
     * @return list<User>
     */
    private function seedUsers(array $users): array
    {
        $activeContract = $this->contractRepository->findActiveContract();

        for ($i = 1; $i <= self::USER_COUNT; ++$i) {
            $user = new User();
            $user->setFirstName('Sim');
            $user->setLastName(sprintf('User %02d', $i));
            $user->setEmail(sprintf('%s%02d@%s', self::EMAIL_PREFIX, $i, self::EMAIL_DOMAIN));
            $user->setVerified(true);
            $user->setRoles([]);
            $user->setPassword($this->passwordHasher->hashPassword($user, self::DEFAULT_PASSWORD));

            $this->entityManager->persist($user);
            $users[] = $user;

            if ($activeContract !== null) {
                $userContract = new UserContract();
                $userContract->setUser($user);
                $userContract->setContract($activeContract);
                $userContract->setIpAddress('127.0.0.1');
                $this->entityManager->persist($userContract);
            }
        }

        $this->entityManager->flush();

        return $users;
    }

    /**
     * @param list<User> $users
     */
    private function seedEvents(array $users): void
    {
        $pastCount = self::PAST_EVENT_COUNT;

        foreach ($users as $index => $owner) {
            $eventNumber = $index + 1;
            $isPast = $eventNumber <= $pastCount;
            $eventDate = $isPast
                ? new \DateTimeImmutable(sprintf('-%d days %d hours', random_int(3, 120), random_int(1, 12)))
                : new \DateTimeImmutable(sprintf('+%d days %d hours', random_int(2, 45), random_int(1, 12)));

            $event = new Event();
            $event->setTitle(sprintf('Simulated Event %02d', $eventNumber));
            $event->setDescription($this->buildEventDescription($eventNumber, $isPast));
            $event->setLocation($this->randomLocation($eventNumber));
            $event->setDate($eventDate->setTimezone(new \DateTimeZone('UTC')));
            $event->setCreatedBy($owner);
            $event->setInviteCode(strtoupper(Uuid::v4()->toBase58()));

            $this->entityManager->persist($event);

            $acceptedParticipants = $this->randomParticipants($users, $owner, random_int(2, 4));
            $invitedParticipants = $eventNumber % 2 === 0
                ? $this->randomParticipants($users, $owner, random_int(1, 2), $acceptedParticipants)
                : [];

            foreach ($acceptedParticipants as $participantUser) {
                $this->entityManager->persist($this->buildParticipant($event, $participantUser, EventParticipant::STATUS_ACCEPTED));
            }

            foreach ($invitedParticipants as $participantUser) {
                $this->entityManager->persist($this->buildParticipant($event, $participantUser, EventParticipant::STATUS_INVITED));
            }

            $itemCount = random_int(3, 5);
            for ($itemIndex = 1; $itemIndex <= $itemCount; ++$itemIndex) {
                $targetQuantity = random_int(1, 6);
                $item = new Item();
                $item->setEvent($event);
                $item->setName($this->randomItemName($itemIndex, $eventNumber));
                $item->setTargetQuantity($targetQuantity);
                $item->setStatus(Item::STATUS_PENDING);

                $assignedQuantity = 0;
                $guaranteedInvitedAssignee = null;

                if ($invitedParticipants !== [] && $itemIndex === 1) {
                    $guaranteedInvitedAssignee = $invitedParticipants[array_rand($invitedParticipants)];
                    $assignment = new ItemAssignment();
                    $assignment->setUser($guaranteedInvitedAssignee);
                    $assignment->setQuantity(1);
                    $assignment->setStatus($isPast && random_int(0, 100) < 45 ? ItemAssignment::STATUS_COMPLETED : ItemAssignment::STATUS_ASSIGNED);
                    $item->addAssignment($assignment);
                    $assignedQuantity = 1;
                }

                $assignmentPool = [$owner, ...$acceptedParticipants];
                if ($invitedParticipants !== [] && random_int(0, 100) < 70) {
                    $assignmentPool[] = $invitedParticipants[array_rand($invitedParticipants)];
                }
                if ($guaranteedInvitedAssignee !== null) {
                    $assignmentPool[] = $guaranteedInvitedAssignee;
                }
                $assignmentPool = array_slice($this->uniqueUsers($assignmentPool), 0, random_int(1, min(4, count($assignmentPool))));
                $assignmentUsers = $this->uniqueUsers($assignmentPool);

                foreach ($assignmentUsers as $assignmentUser) {
                    if ($assignedQuantity >= $targetQuantity || random_int(0, 100) < 35) {
                        continue;
                    }

                    $quantity = min(random_int(1, 2), $targetQuantity - $assignedQuantity);
                    $assignment = new ItemAssignment();
                    $assignment->setUser($assignmentUser);
                    $assignment->setQuantity($quantity);
                    $assignment->setStatus($isPast && random_int(0, 100) < 45 ? ItemAssignment::STATUS_COMPLETED : ItemAssignment::STATUS_ASSIGNED);
                    $item->addAssignment($assignment);
                    $assignedQuantity += $quantity;
                }

                if (count($item->getAssignments()) > 0) {
                    $item->setStatus($isPast && random_int(0, 100) < 40 ? Item::STATUS_COMPLETED : Item::STATUS_ASSIGNED);
                }

                $this->entityManager->persist($item);
            }
        }

        $this->entityManager->flush();
    }

    private function buildEventDescription(int $eventNumber, bool $isPast): string
    {
        $timeline = $isPast ? 'This event already happened.' : 'This event is scheduled in the future.';

        return sprintf(
            'Simulation event %02d for dashboard, participants, and item assignment testing. %s',
            $eventNumber,
            $timeline,
        );
    }

    private function randomLocation(int $seed): string
    {
        $locations = ['Park', 'Office', 'Campus', 'Studio', 'Rooftop', 'Garden', 'Lounge', 'Workshop'];

        return $locations[$seed % count($locations)];
    }

    private function randomItemName(int $itemIndex, int $eventNumber): string
    {
        $names = ['Drinks', 'Snacks', 'Chairs', 'Projector', 'Extension Cable', 'Plates', 'Decor', 'Napkins'];

        return sprintf('%s %02d-%d', $names[($eventNumber + $itemIndex) % count($names)], $eventNumber, $itemIndex);
    }

    /**
     * @param list<User> $users
     * @param list<User> $excludedUsers
     * @return list<User>
     */
    private function randomParticipants(array $users, User $owner, int $count, array $excludedUsers = []): array
    {
        $excludedIds = array_map(
            static fn (User $user) => $user->getId()?->toRfc4122(),
            $excludedUsers,
        );

        $candidates = array_values(array_filter(
            $users,
            static function (User $candidate) use ($owner, $excludedIds) {
                $candidateId = $candidate->getId()?->toRfc4122();

                return !$candidate->getId()?->equals($owner->getId()) && !in_array($candidateId, $excludedIds, true);
            },
        ));

        shuffle($candidates);

        return array_slice($candidates, 0, min($count, count($candidates)));
    }

    private function buildParticipant(Event $event, User $user, string $status): EventParticipant
    {
        $participant = new EventParticipant();
        $participant->setEvent($event);
        $participant->setUser($user);
        $participant->setStatus($status);

        return $participant;
    }

    /**
     * @param list<User> $users
     * @return list<User>
     */
    private function uniqueUsers(array $users): array
    {
        $unique = [];

        foreach ($users as $user) {
            $id = $user->getId()?->toRfc4122() ?? spl_object_hash($user);
            $unique[$id] = $user;
        }

        return array_values($unique);
    }
}
