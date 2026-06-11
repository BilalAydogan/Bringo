<?php

namespace App\Tests;

use App\Service\ContractDiffService;
use PHPUnit\Framework\TestCase;

final class ContractDiffServiceTest extends TestCase
{
    public function testDiffLinesMarksAddedRemovedAndUnchangedLines(): void
    {
        $service = new ContractDiffService();

        $diff = $service->diffLines(
            "Line one\nLine two\nLine three",
            "Line one\nLine three\nLine four",
        );

        self::assertSame([
            ['type' => 'unchanged', 'line' => 'Line one'],
            ['type' => 'removed', 'line' => 'Line two'],
            ['type' => 'unchanged', 'line' => 'Line three'],
            ['type' => 'added', 'line' => 'Line four'],
        ], $diff);
    }

    public function testDiffLinesIgnoresBlankLines(): void
    {
        $service = new ContractDiffService();

        $diff = $service->diffLines("Alpha\n\nBeta", "Alpha\nBeta");

        self::assertSame([
            ['type' => 'unchanged', 'line' => 'Alpha'],
            ['type' => 'unchanged', 'line' => 'Beta'],
        ], $diff);
    }
}
