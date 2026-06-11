<?php

namespace App\Entity;

use App\Repository\ContractRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ContractRepository::class)]
class Contract
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $content = null;

    #[ORM\Column]
    private ?float $version = null;

    #[ORM\Column]
    private ?bool $isRequired = null;

    #[ORM\Column]
    private bool $isActive = false;

    /**
     * @var Collection<int, ContractTranslation>
     */
    #[ORM\OneToMany(mappedBy: 'contract', targetEntity: ContractTranslation::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $translations;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private ?\DateTimeImmutable $createdAt = null;

    public function __construct()
    {
        $this->translations = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?Uuid { return $this->id; }
    public function getTitle(): ?string { return $this->title; }
    public function setTitle(string $title): static { $this->title = $title; return $this; }
    public function getContent(): ?string { return $this->content; }
    public function setContent(string $content): static { $this->content = $content; return $this; }
    public function getVersion(): ?float { return $this->version; }
    public function setVersion(float $version): static { $this->version = $version; return $this; }
    public function isRequired(): ?bool { return $this->isRequired; }
    public function setIsRequired(bool $isRequired): static { $this->isRequired = $isRequired; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): static { $this->isActive = $isActive; return $this; }
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }

    /**
     * @return Collection<int, ContractTranslation>
     */
    public function getTranslations(): Collection
    {
        return $this->translations;
    }

    public function addTranslation(ContractTranslation $translation): static
    {
        if (!$this->translations->contains($translation)) {
            $this->translations->add($translation);
            $translation->setContract($this);
        }

        return $this;
    }

    public function removeTranslation(ContractTranslation $translation): static
    {
        if ($this->translations->removeElement($translation) && $translation->getContract() === $this) {
            $translation->setContract(null);
        }

        return $this;
    }

    public function getTranslationForLocale(?string $locale): ?ContractTranslation
    {
        $normalized = $this->normalizeLocale($locale);
        if ($normalized === null) {
            return null;
        }

        foreach ($this->translations as $translation) {
            if ($translation->getLocale() === $normalized) {
                return $translation;
            }
        }

        return null;
    }

    public function getLocalizedTitle(?string $locale = null): string
    {
        return $this->getTranslationForLocale($locale)?->getTitle() ?? (string) $this->title;
    }

    public function getLocalizedContent(?string $locale = null): string
    {
        return $this->getTranslationForLocale($locale)?->getContent() ?? (string) $this->content;
    }

    private function normalizeLocale(?string $locale): ?string
    {
        if ($locale === null || $locale === '') {
            return null;
        }

        $value = strtolower(str_replace('_', '-', $locale));

        return match (true) {
            str_starts_with($value, 'tr') => 'tr',
            str_starts_with($value, 'en') => 'en',
            default => null,
        };
    }
}
