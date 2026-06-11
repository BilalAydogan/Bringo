<?php

namespace App\Repository;

use App\Entity\Contract;
use App\Entity\UserContract;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserContract>
 */
class UserContractRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserContract::class);
    }

    public function countByContract(Contract $contract): int
    {
        return (int) $this->createQueryBuilder('uc')
            ->select('COUNT(uc.id)')
            ->where('uc.contract = :contract')
            ->setParameter('contract', $contract)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
