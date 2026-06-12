<?php

namespace App\Tests;

use App\Entity\Event;
use App\Entity\EventParticipant;
use App\Entity\Item;
use App\Entity\ItemAssignment;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class EventSimulationIntegrationTest extends KernelTestCase
{
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get('doctrine')->getManager();
    }

    public function testSimulationCreatesExactly50Users(): void
    {
        $simUsers = $this->em->createQueryBuilder()
            ->select('u')
            ->from(User::class, 'u')
            ->where('u.email LIKE :prefix')
            ->setParameter('prefix', 'sim.user%@bringo.test')
            ->getQuery()
            ->getResult();

        self::assertCount(50, $simUsers, 'Simülasyon 50 kullanıcı oluşturmalı');
    }

    public function testEachUserHasExactlyOneEvent(): void
    {
        $simUsers = $this->em->createQueryBuilder()
            ->select('u')
            ->from(User::class, 'u')
            ->where('u.email LIKE :prefix')
            ->setParameter('prefix', 'sim.user%@bringo.test')
            ->getQuery()
            ->getResult();

        $totalEvents = 0;
        foreach ($simUsers as $user) {
            $events = $this->em->getRepository(Event::class)->findBy(['createdBy' => $user]);
            $totalEvents += count($events);
        }

        self::assertSame(50, $totalEvents, 'Her kullanıcının 1 etkinlik olmalı');
    }

    public function testItemAssignmentConsistency(): void
    {
        $items = $this->em->getRepository(Item::class)->findAll();

        foreach ($items as $item) {
            $targetQuantity = $item->getTargetQuantity();
            $assignedQuantity = 0;

            foreach ($item->getAssignments() as $assignment) {
                $assignedQuantity += $assignment->getQuantity();
            }

            self::assertLessThanOrEqual(
                $targetQuantity,
                $assignedQuantity,
                sprintf('%s toplam quantity target\'ı aşıyor', $item->getName())
            );
        }
    }

    public function testParticipantStatusesAreValid(): void
    {
        $participants = $this->em->getRepository(EventParticipant::class)->findAll();

        foreach ($participants as $p) {
            $status = $p->getStatus();
            self::assertContains($status, [
                EventParticipant::STATUS_ACCEPTED,
                EventParticipant::STATUS_INVITED,
                EventParticipant::STATUS_REJECTED,
            ], 'Geçersiz participant statusu');
        }
    }
}