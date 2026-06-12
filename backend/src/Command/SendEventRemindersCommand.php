<?php

namespace App\Command;

use App\Entity\Event;
use App\Repository\EventRepository;
use App\Service\EventReminderService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:send-event-reminders',
    description: 'Sends event reminder emails and browser notifications for upcoming events.',
)]
class SendEventRemindersCommand extends Command
{
    public function __construct(
        private readonly EventRepository $eventRepository,
        private readonly EventReminderService $eventReminderService,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $dayWindowEnd = $now->modify('+24 hours');
        $hourWindowEnd = $now->modify('+1 hour');

        $events = $this->eventRepository->createQueryBuilder('e')
            ->where('e.date > :now')
            ->andWhere('e.date <= :dayWindowEnd')
            ->setParameter('now', $now)
            ->setParameter('dayWindowEnd', $dayWindowEnd)
            ->orderBy('e.date', 'ASC')
            ->getQuery()
            ->getResult();

        $emailCount = 0;
        $notificationCount = 0;

        foreach ($events as $event) {
            if (!$event instanceof Event) {
                continue;
            }

            $eventDate = \DateTimeImmutable::createFromInterface($event->getDate())->setTimezone(new \DateTimeZone('UTC'));
            $stage = $eventDate <= $hourWindowEnd ? 'hour_before' : 'day_before';

            $result = $this->eventReminderService->sendRemindersForEvent($event, $stage);
            $emailCount += $result['emails'];
            $notificationCount += $result['notifications'];
        }

        $output->writeln(sprintf(
            'Event reminders sent. Emails: %d, notifications: %d, scanned events: %d',
            $emailCount,
            $notificationCount,
            count($events),
        ));

        return Command::SUCCESS;
    }
}
