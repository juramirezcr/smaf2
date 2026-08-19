<?php

namespace App\Services;

use Generator;
use RuntimeException;
use UnexpectedValueException;

class LegacyPrefixSqlReader
{
    /**
     * @var array<string, list<string>>
     */
    private const DEFAULT_COLUMNS = [
        'prefijos' => [
            'id', 'usuario_id', 'prefijo', 'pais', 'descripcion', 'llamadas', 'minutos',
            'llamadas_cuenta', 'minutos_cuenta', 'llamadas_actual', 'minutos_actual',
            't1', 't2', 't3', 't4', 'estado', 'accion',
        ],
        'destinos_conf' => [
            'id', 'usuario_id', 'prefijo', 'pais', 'flag', 'descripcion', 'llamadas',
            'segundos', 'llamadas_cuenta', 'segundos_cuenta', 'llamadas_actual',
            'segundos_actual', 't1', 't2', 't3', 't4', 'estado', 'accion',
        ],
    ];

    /**
     * @return Generator<int, array<string, string|null>>
     */
    public function rows(string $path, string $wantedTable): Generator
    {
        if (! isset(self::DEFAULT_COLUMNS[$wantedTable])) {
            throw new UnexpectedValueException('Unsupported legacy table.');
        }

        $handle = @fopen($path, 'rb');

        if ($handle === false) {
            throw new RuntimeException('Unable to read the dump file.');
        }

        $header = '';
        $skippingStatement = false;
        $targetColumns = null;
        $waitingForRow = false;
        $inString = false;
        $escaping = false;
        $valueWasQuoted = false;
        $value = '';
        $values = [];

        try {
            while (! feof($handle)) {
                $chunk = fread($handle, 8192);

                if ($chunk === false) {
                    throw new RuntimeException('Unable to read the dump file.');
                }

                $length = strlen($chunk);

                for ($index = 0; $index < $length; $index++) {
                    $character = $chunk[$index];

                    if ($targetColumns !== null) {
                        if ($inString) {
                            if ($escaping) {
                                $value .= $this->unescape($character);
                                $escaping = false;
                            } elseif ($character === '\\') {
                                $escaping = true;
                            } elseif ($character === "'") {
                                $inString = false;
                            } else {
                                $value .= $character;
                            }

                            continue;
                        }

                        if ($waitingForRow) {
                            if ($character === '(') {
                                $waitingForRow = false;
                                $value = '';
                                $values = [];
                                $valueWasQuoted = false;
                            } elseif ($character === ';') {
                                $targetColumns = null;
                                $header = '';
                            }

                            continue;
                        }

                        if ($character === "'") {
                            $inString = true;
                            $valueWasQuoted = true;

                            continue;
                        }

                        if ($character === ',') {
                            $values[] = $this->normalizeValue($value, $valueWasQuoted);
                            $value = '';
                            $valueWasQuoted = false;

                            continue;
                        }

                        if ($character === ')') {
                            $values[] = $this->normalizeValue($value, $valueWasQuoted);

                            if (count($values) !== count($targetColumns)) {
                                throw new UnexpectedValueException('A legacy INSERT row does not match its column list.');
                            }

                            /** @var array<string, string|null> $row */
                            $row = array_combine($targetColumns, $values);
                            yield $row;

                            $waitingForRow = true;
                            $value = '';
                            $values = [];
                            $valueWasQuoted = false;

                            continue;
                        }

                        $value .= $character;

                        continue;
                    }

                    if ($skippingStatement) {
                        if ($inString) {
                            if ($escaping) {
                                $escaping = false;
                            } elseif ($character === '\\') {
                                $escaping = true;
                            } elseif ($character === "'") {
                                $inString = false;
                            }
                        } elseif ($character === "'") {
                            $inString = true;
                        } elseif ($character === ';') {
                            $skippingStatement = false;
                            $header = '';
                        }

                        continue;
                    }

                    $header .= $character;

                    if (strlen($header) > 16384) {
                        $header = '';
                        $skippingStatement = true;

                        continue;
                    }

                    if (! preg_match(
                        '/\bINSERT\s+(?:IGNORE\s+)?INTO\s+`?([a-zA-Z0-9_]+)`?\s*(?:\(([^)]*)\))?\s*VALUES\s*$/is',
                        $header,
                        $matches,
                    )) {
                        if ($character === ';') {
                            $header = '';
                        }

                        continue;
                    }

                    $table = strtolower($matches[1]);

                    if (! isset(self::DEFAULT_COLUMNS[$table])) {
                        $header = '';
                        $skippingStatement = true;

                        continue;
                    }

                    $columns = isset($matches[2]) && $matches[2] !== ''
                        ? array_map(
                            static fn (string $column): string => trim($column, " \t\n\r\0\x0B`"),
                            explode(',', $matches[2]),
                        )
                        : self::DEFAULT_COLUMNS[$table];

                    $this->validateColumns($table, $columns);

                    if ($table !== $wantedTable) {
                        $header = '';
                        $skippingStatement = true;

                        continue;
                    }

                    $targetColumns = $columns;
                    $waitingForRow = true;
                    $header = '';
                }
            }
        } finally {
            fclose($handle);
        }

        if ($targetColumns !== null || $inString) {
            throw new UnexpectedValueException('The dump ended inside a target INSERT statement.');
        }
    }

    private function unescape(string $character): string
    {
        return match ($character) {
            '0' => "\0",
            'b' => "\b",
            'n' => "\n",
            'r' => "\r",
            't' => "\t",
            'Z' => "\x1a",
            default => $character,
        };
    }

    private function normalizeValue(string $value, bool $wasQuoted): ?string
    {
        $value = $wasQuoted ? $value : trim($value);

        return ! $wasQuoted && strtoupper($value) === 'NULL' ? null : $value;
    }

    /**
     * @param  list<string>  $columns
     */
    private function validateColumns(string $table, array $columns): void
    {
        $expected = self::DEFAULT_COLUMNS[$table];

        sort($columns);
        $actual = $columns;
        sort($expected);

        if ($actual !== $expected) {
            throw new UnexpectedValueException('The legacy table layout is not the expected prefix configuration layout.');
        }
    }
}
