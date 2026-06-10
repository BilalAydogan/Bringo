<?php

namespace App\Service;

class ContractDiffService
{
    /**
     * @return array<int, array{type: string, line: string}>
     */
    public function diffLines(string $oldContent, string $newContent): array
    {
        $oldLines = $this->splitLines($oldContent);
        $newLines = $this->splitLines($newContent);

        if ($oldLines === $newLines) {
            return array_map(
                fn (string $line) => ['type' => 'unchanged', 'line' => $line],
                $newLines,
            );
        }

        $matrix = $this->buildLcsMatrix($oldLines, $newLines);
        $result = [];
        $i = count($oldLines);
        $j = count($newLines);

        while ($i > 0 || $j > 0) {
            if ($i > 0 && $j > 0 && $oldLines[$i - 1] === $newLines[$j - 1]) {
                array_unshift($result, ['type' => 'unchanged', 'line' => $oldLines[$i - 1]]);
                --$i;
                --$j;
                continue;
            }

            if ($j > 0 && ($i === 0 || $matrix[$i][$j - 1] >= $matrix[$i - 1][$j])) {
                array_unshift($result, ['type' => 'added', 'line' => $newLines[$j - 1]]);
                --$j;
                continue;
            }

            array_unshift($result, ['type' => 'removed', 'line' => $oldLines[$i - 1]]);
            --$i;
        }

        return $result;
    }

    /** @return string[] */
    private function splitLines(string $content): array
    {
        $lines = preg_split('/\R/', trim($content)) ?: [];

        return array_values(array_filter($lines, fn (string $line) => trim($line) !== ''));
    }

    /**
     * @param string[] $oldLines
     * @param string[] $newLines
     * @return array<int, array<int, int>>
     */
    private function buildLcsMatrix(array $oldLines, array $newLines): array
    {
        $rows = count($oldLines) + 1;
        $cols = count($newLines) + 1;
        $matrix = array_fill(0, $rows, array_fill(0, $cols, 0));

        for ($i = 1; $i < $rows; ++$i) {
            for ($j = 1; $j < $cols; ++$j) {
                if ($oldLines[$i - 1] === $newLines[$j - 1]) {
                    $matrix[$i][$j] = $matrix[$i - 1][$j - 1] + 1;
                } else {
                    $matrix[$i][$j] = max($matrix[$i - 1][$j], $matrix[$i][$j - 1]);
                }
            }
        }

        return $matrix;
    }
}
