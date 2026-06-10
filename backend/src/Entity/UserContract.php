<?php

namespace App\Entity;

use App\Repository\UserContractRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: UserContractRepository::class)]
class UserContract
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?Contract $contract = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private ?\DateTimeImmutable $acceptedAt = null;

    #[ORM\Column(length: 45, nullable: true)]
    private ?string $ipAddress = null;

    public function __construct()
    {
        $this->acceptedAt = new \DateTimeImmutable();
    }

    public function getId(): ?Uuid { return $this->id; }
    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): static { $this->user = $user; return $this; }
    public function getContract(): ?Contract { return $this->contract; }
    public function setContract(?Contract $contract): static { $this->contract = $contract; return $this; }
    public function getAcceptedAt(): ?\DateTimeImmutable { return $this->acceptedAt; }
    public function setAcceptedAt(\DateTimeImmutable $acceptedAt): static { $this->acceptedAt = $acceptedAt; return $this; }
    public function getIpAddress(): ?string { return $this->ipAddress; }
    public function setIpAddress(?string $ipAddress): static { $this->ipAddress = $ipAddress; return $this; }
}
