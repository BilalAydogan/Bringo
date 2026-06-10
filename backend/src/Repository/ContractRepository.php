<?php

namespace App\Repository;

use App\Entity\Contract;
use App\Entity\User;
use App\Entity\UserContract;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Contract>
 */
class ContractRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Contract::class);
    }

    public function findActiveContract(): ?Contract
    {
        return $this->findOneBy(['isActive' => true], ['version' => 'DESC']);
    }

    public function findPreviousContract(Contract $activeContract): ?Contract
    {
        return $this->createQueryBuilder('c')
            ->where('c.version < :version')
            ->setParameter('version', $activeContract->getVersion())
            ->orderBy('c.version', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function hasUserAcceptedContract(User $user, Contract $contract): bool
    {
        $count = (int) $this->getEntityManager()->createQueryBuilder()
            ->select('COUNT(uc.id)')
            ->from(UserContract::class, 'uc')
            ->where('uc.user = :user')
            ->andWhere('uc.contract = :contract')
            ->setParameter('user', $user)
            ->setParameter('contract', $contract)
            ->getQuery()
            ->getSingleScalarResult();

        return $count > 0;
    }

    public function findPendingForUser(User $user): ?Contract
    {
        $activeContract = $this->findActiveContract();
        if ($activeContract === null) {
            return null;
        }

        if ($this->hasUserAcceptedContract($user, $activeContract)) {
            return null;
        }

        return $activeContract;
    }
}
