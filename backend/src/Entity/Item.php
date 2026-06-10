<?php

namespace App\Entity;

use App\Repository\ItemRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ItemRepository::class)]
class Item
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?Event $event = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(nullable: true)]
    private ?int $targetQuantity = null;

    #[ORM\Column(length: 50)]
    private ?string $status = self::STATUS_PENDING;

    #[ORM\OneToMany(mappedBy: 'item', targetEntity: ItemAssignment::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private $assignments;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private ?\DateTimeImmutable $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->assignments = new \Doctrine\Common\Collections\ArrayCollection();
    }

    public const STATUS_PENDING = 'pending';
    public const STATUS_ASSIGNED = 'assigned';
    public const STATUS_COMPLETED = 'completed';

    public function getId(): ?Uuid { return $this->id; }
    public function getEvent(): ?Event { return $this->event; }
    public function setEvent(?Event $event): static { $this->event = $event; return $this; }
    public function getName(): ?string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }
    public function getTargetQuantity(): ?int { return $this->targetQuantity; }
    public function setTargetQuantity(?int $targetQuantity): static { $this->targetQuantity = $targetQuantity; return $this; }
    public function getStatus(): ?string { return $this->status; }
    public function setStatus(?string $status): static { $this->status = $status; return $this; }
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getAssignments(): \Doctrine\Common\Collections\Collection { return $this->assignments; }
    public function addAssignment(ItemAssignment $assignment): static
    {
        if (!$this->assignments->contains($assignment)) {
            $this->assignments->add($assignment);
            $assignment->setItem($this);
        }
        return $this;
    }
    public function removeAssignment(ItemAssignment $assignment): static
    {
        if ($this->assignments->contains($assignment)) {
            $this->assignments->removeElement($assignment);
        }
        return $this;
    }
}
