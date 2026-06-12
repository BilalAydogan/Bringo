<?php

namespace App\Repository;

use App\Entity\Event;
use App\Entity\EventParticipant;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EventParticipant>
 */
class EventParticipantRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EventParticipant::class);
    }

    /**
     * @return list<EventParticipant>
     */
    public function findInvitedByUser(User $user): array
    {
        return $this->createQueryBuilder('ep')
            ->leftJoin('ep.event', 'e')
            ->where('ep.user = :user')
            ->andWhere('ep.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', EventParticipant::STATUS_INVITED)
            ->orderBy('e.date', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return list<EventParticipant>
     */
    public function findAcceptedByUser(User $user): array
    {
        return $this->createQueryBuilder('ep')
            ->leftJoin('ep.event', 'e')
            ->where('ep.user = :user')
            ->andWhere('ep.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', EventParticipant::STATUS_ACCEPTED)
            ->orderBy('e.date', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function paginateInvitedByUser(User $user, int $page = 1, int $limit = 20): Paginator
    {
        $query = $this->createQueryBuilder('ep')
            ->leftJoin('ep.event', 'e')
            ->where('ep.user = :user')
            ->andWhere('ep.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', EventParticipant::STATUS_INVITED)
            ->orderBy('e.date', 'ASC')
            ->getQuery()
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        return new Paginator($query);
    }

    public function paginateAcceptedByUser(User $user, int $page = 1, int $limit = 20): Paginator
    {
        $query = $this->createQueryBuilder('ep')
            ->leftJoin('ep.event', 'e')
            ->where('ep.user = :user')
            ->andWhere('ep.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', EventParticipant::STATUS_ACCEPTED)
            ->orderBy('e.date', 'ASC')
            ->getQuery()
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        return new Paginator($query);
    }

    public function findOneByEventAndUser(Event $event, User $user): ?EventParticipant
    {
        return $this->findOneBy(['event' => $event, 'user' => $user]);
    }
}
