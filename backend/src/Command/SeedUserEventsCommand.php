<?php

namespace App\Command;

use App\Entity\Event;
use App\Entity\User;
use App\Repository\EventRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Uid\Uuid;

#[AsCommand(
    name: 'app:seed-user-events',
    description: 'Seeds test events for a specific user account.',
)]
class SeedUserEventsCommand extends Command
{
    private const DEFAULT_PASSWORD = '123456';
    private const TITLE_PREFIX = '[Seed]';

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserRepository $userRepository,
        private readonly EventRepository $eventRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Target user email')
            ->addOption('count', null, InputOption::VALUE_REQUIRED, 'How many events to create', '50')
            ->addOption('reset', null, InputOption::VALUE_NONE, 'Remove previously seeded events for this user before inserting new ones')
            ->addOption('create-user', null, InputOption::VALUE_NONE, 'Create the user if it does not exist');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $email = mb_strtolower(trim((string) $input->getArgument('email')));
        $count = max(1, min(100, (int) $input->getOption('count')));
        $reset = (bool) $input->getOption('reset');
        $createUser = (bool) $input->getOption('create-user');

        $user = $this->userRepository->findOneBy(['email' => $email]);

        if (!$user instanceof User) {
            if (!$createUser) {
                $output->writeln(sprintf('User not found: %s', $email));

                return Command::FAILURE;
            }

            $user = $this->createUser($email);
            $output->writeln(sprintf('Created user: %s (password: %s)', $email, self::DEFAULT_PASSWORD));
        }

        if ($reset) {
            $removed = $this->removeSeededEvents($user);
            $output->writeln(sprintf('Removed %d existing seeded events for %s.', $removed, $email));
        }

        $created = $this->seedEvents($user, $count);

        $output->writeln(sprintf('Created %d test events for %s.', $created, $email));

        return Command::SUCCESS;
    }

    private function createUser(string $email): User
    {
        $localPart = explode('@', $email)[0] ?? 'user';
        $sanitized = preg_replace('/[^a-z0-9]+/i', ' ', $localPart) ?? 'User';
        $parts = array_values(array_filter(explode(' ', trim($sanitized))));

        $firstName = $parts !== [] ? ucfirst(mb_strtolower($parts[0])) : 'Test';
        $lastName = count($parts) > 1 ? ucfirst(mb_strtolower((string) $parts[1])) : 'User';

        $user = new User();
        $user->setEmail($email);
        $user->setFirstName($firstName);
        $user->setLastName($lastName);
        $user->setVerified(true);
        $user->setPreferredLocale('tr');
        $user->setRoles([]);
        $user->setPassword($this->passwordHasher->hashPassword($user, self::DEFAULT_PASSWORD));

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    private function removeSeededEvents(User $user): int
    {
        $events = $this->eventRepository->createQueryBuilder('e')
            ->where('e.createdBy = :user')
            ->andWhere('e.title LIKE :prefix')
            ->setParameter('user', $user)
            ->setParameter('prefix', self::TITLE_PREFIX . '%')
            ->getQuery()
            ->getResult();

        $removed = 0;

        foreach ($events as $event) {
            if (!$event instanceof Event) {
                continue;
            }

            $this->entityManager->remove($event);
            ++$removed;
        }

        $this->entityManager->flush();

        return $removed;
    }

    private function seedEvents(User $user, int $count): int
    {
        $pastCount = (int) floor($count * 0.7);
        $locations = ['Park', 'Office', 'Campus', 'Studio', 'Rooftop', 'Garden', 'Cafe', 'Workshop'];

        for ($index = 1; $index <= $count; ++$index) {
            $isPast = $index <= $pastCount;
            $dayOffset = $isPast ? -($pastCount - $index + 2) : ($index - $pastCount + 1);
            $hour = 10 + ($index % 8);

            $eventDate = (new \DateTimeImmutable(sprintf('%+d days', $dayOffset)))
                ->setTime($hour, 0)
                ->setTimezone(new \DateTimeZone('UTC'));

            $event = new Event();
            $event->setTitle(sprintf('%s Dashboard Test Event %02d', self::TITLE_PREFIX, $index));
            $event->setDescription(sprintf('Pagination test event %02d for %s.', $index, $user->getEmail()));
            $event->setLocation($locations[$index % count($locations)]);
            $event->setTimezone('Europe/Istanbul');
            $event->setDate($eventDate->setTimezone(new \DateTimeZone('UTC')));
            $event->setCreatedBy($user);
            $event->setInviteCode(strtoupper(Uuid::v4()->toBase58()));

            $this->entityManager->persist($event);
        }

        $this->entityManager->flush();

        return $count;
    }
}
