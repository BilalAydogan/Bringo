<?php

namespace App\Repository;

use App\Entity\Event;
use App\Entity\EventReminderLog;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EventReminderLog>
 */
class EventReminderLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EventReminderLog::class);
    }

    public function hasReminder(Event $event, User $user, string $channel, string $stage): bool
    {
        return $this->findOneBy([
            'event' => $event,
            'user' => $user,
            'channel' => $channel,
            'stage' => $stage,
        ]) instanceof EventReminderLog;
    }
}
